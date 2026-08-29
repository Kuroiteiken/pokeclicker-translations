#!/usr/bin/env node
/**
 * Türkçe çeviri denetleyicisi.
 *
 * AGENTS.md bölüm 8'de tanımlı kontrolleri çalıştırır. Çıkış kodu:
 *   0 = hata yok, 1 = en az bir hata var.
 *
 * Kullanım:
 *   node scripts/check-tr.js            tüm dosyalar
 *   node scripts/check-tr.js questlines tek dosya
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EN_DIR = path.join(ROOT, 'locales', 'en');
const TR_DIR = path.join(ROOT, 'locales', 'tr');

const PLACEHOLDER = /\{\{[^}]*\}\}/g;
const REFERENCE = /\[\[[^\]]*\]\]/g;

// Aksansız yazılmış olması muhtemel Türkçe kelimeler: <hatalı> -> <doğrusu>
const ASCII_TRAPS = [
  ['Pokemon', 'Pokémon'],
  ['Pokerus', 'Pokérus'],
  ['gorev', 'görev'],
  ['Gorev', 'Görev'],
  ['yakalandi', 'yakalandı'],
  ['Orjinal', 'Orijinal'],
  ['orjinal', 'orijinal'],
  ['Yardımıcı', 'Yardımcı'],
  ['yardımıcı', 'yardımcı'],
];

/** Nesneyi "a.b.c" -> değer düz haritasına çevirir. */
function flatten(obj, prefix = '', out = {}) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else {
      out[full] = value;
    }
  }
  return out;
}

function tokens(str, regex) {
  if (typeof str !== 'string') return [];
  return (str.match(regex) || []).slice().sort();
}

function sameTokens(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const only = process.argv[2];
const files = fs
  .readdirSync(EN_DIR)
  .filter((f) => f.endsWith('.json'))
  .filter((f) => !only || f === `${only}.json` || f === only);

if (files.length === 0) {
  console.error(`Eşleşen dosya yok: ${only}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const summary = [];

for (const file of files) {
  const enPath = path.join(EN_DIR, file);
  const trPath = path.join(TR_DIR, file);

  if (!fs.existsSync(trPath)) {
    errors.push(`${file}: locales/tr karşılığı yok`);
    continue;
  }

  let en;
  let tr;
  try {
    en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  } catch (e) {
    errors.push(`locales/en/${file}: geçersiz JSON — ${e.message}`);
    continue;
  }
  try {
    tr = JSON.parse(fs.readFileSync(trPath, 'utf8'));
  } catch (e) {
    errors.push(`locales/tr/${file}: geçersiz JSON — ${e.message}`);
    continue;
  }

  const flatEn = flatten(en);
  const flatTr = flatten(tr);
  const enKeys = Object.keys(flatEn);
  const trKeys = Object.keys(flatTr);

  // 2. Anahtar kümesi ve sırası birebir aynı olmalı (CI şartı)
  for (const k of enKeys) {
    if (!(k in flatTr)) errors.push(`${file}: eksik anahtar → ${k}`);
  }
  for (const k of trKeys) {
    if (!(k in flatEn)) errors.push(`${file}: fazladan anahtar → ${k}`);
  }
  if (enKeys.length === trKeys.length) {
    for (let i = 0; i < enKeys.length; i += 1) {
      if (enKeys[i] !== trKeys[i]) {
        errors.push(
          `${file}: anahtar sırası bozuk — ${i}. sırada "${trKeys[i]}" var, "${enKeys[i]}" bekleniyordu`
        );
        break;
      }
    }
  }

  let empty = 0;
  let translated = 0;

  for (const key of enKeys) {
    const source = flatEn[key];
    const target = flatTr[key];

    if (target === null) continue;
    if (target === undefined) continue;
    if (target === '') {
      empty += 1;
      continue;
    }
    translated += 1;

    if (typeof source !== 'string' || typeof target !== 'string') continue;

    // 3. Yer tutucular birebir eşleşmeli
    const enPh = tokens(source, PLACEHOLDER);
    const trPh = tokens(target, PLACEHOLDER);
    if (!sameTokens(enPh, trPh)) {
      errors.push(
        `${file} → ${key}: yer tutucu uyuşmuyor\n    en: ${JSON.stringify(enPh)}\n    tr: ${JSON.stringify(trPh)}`
      );
    }

    // 4. Referanslar korunmalı
    const enRef = tokens(source, REFERENCE);
    const trRef = tokens(target, REFERENCE);
    if (!sameTokens(enRef, trRef)) {
      errors.push(
        `${file} → ${key}: referans uyuşmuyor\n    en: ${JSON.stringify(enRef)}\n    tr: ${JSON.stringify(trRef)}`
      );
    }

    // Yer tutucudan hemen sonra boşluksuz harf gelmemeli
    const glued = target.match(/\}\}[\wçğıöşüÇĞİÖŞÜ]/);
    if (glued) {
      warnings.push(`${file} → ${key}: yer tutucuya bitişik ek/kelime → "${glued[0]}"`);
    }

    // 5. İngilizcenin kopyalandığı sahte çeviriler.
    // pokemon.json muaf: Pokémon adlarının İngilizceyle aynı kalması doğru davranıştır.
    if (file !== 'pokemon.json' && target === source && source.trim() !== '' && enRef.length === 0) {
      const isSymbolOnly = !/[A-Za-z]{2}/.test(source);
      if (!isSymbolOnly) {
        warnings.push(`${file} → ${key}: İngilizce metin kopyalanmış → ${JSON.stringify(source)}`);
      }
    }

    // 6. Aksan tuzakları
    for (const [bad, good] of ASCII_TRAPS) {
      if (target.includes(bad)) {
        // "Pokemon" tuzağı "Pokémon" içinde tetiklenmesin diye kelime sınırıyla bak
        const re = new RegExp(`(^|[^A-Za-zÀ-ÿ])${bad}(?![A-Za-zÀ-ÿ])`);
        if (re.test(target)) {
          warnings.push(`${file} → ${key}: "${bad}" yerine "${good}" olmalı`);
        }
      }
    }
  }

  summary.push({ file, total: enKeys.length, translated, empty });
}

console.log('=== Türkçe çeviri durumu ===');
for (const s of summary) {
  const pct = s.total ? Math.round((s.translated / s.total) * 100) : 100;
  console.log(
    `${s.file.padEnd(18)} ${String(s.translated).padStart(5)}/${String(s.total).padEnd(5)} çevrili` +
      `  (%${String(pct).padStart(3)})   boş: ${s.empty}`
  );
}

if (warnings.length) {
  console.log(`\n=== Uyarılar (${warnings.length}) ===`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length) {
  console.log(`\n=== Hatalar (${errors.length}) ===`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log('\nBAŞARISIZ');
  process.exit(1);
}

console.log('\nTAMAM — yapısal hata yok.');

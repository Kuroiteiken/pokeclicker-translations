# AGENTS.md — Türkçe Çeviri Ajanı

Bu depo, tarayıcı oyunu [pokeclicker](https://github.com/pokeclicker/pokeclicker) için çeviri
dosyalarını barındırır. Bu dosya, **`locales/tr/` altındaki Türkçe çevirileri üreten ve denetleyen
ajanın** çalışma kurallarını tanımlar.

Ajan tek bir işi yapar: **İngilizce kaynak metinden, oyun içinde doğal duran Türkçe üretmek.**

---

## 1. Rol

Sen bir Pokémon oyunu yerelleştirme editörüsün. Makine çevirisi yapmıyorsun; oyunu Türkçe
oynayan birinin okuyacağı metni yazıyorsun. Ölçüt tek: **Türk bir oyuncu bu cümleyi okuduğunda
"bu çeviri" demeyecek, sadece oynayacak.**

Her dize için sırayla şunu yap:

1. `locales/en/` içindeki İngilizce karşılığı oku — **kaynak her zaman İngilizcedir**, başka bir
   dilin çevirisi değil.
2. Cümlenin oyundaki **bağlamını** belirle (bildirim mi, görev adımı mı, ayar etiketi mi, buton mu).
3. Türkçesini **sıfırdan kur.** İngilizce cümle yapısını taşıma.
4. Teknik kabuğu (yer tutucular, referanslar, noktalama) birebir koru.

---

## 2. Dosyalar ve durum

| Dosya | İçerik | Not |
|---|---|---|
| `locales/tr/pokemon.json` | Pokémon adları ve varyantları | Adlar İngilizce kalır, sıfatlar çevrilir |
| `locales/tr/logbook.json` | Oyun içi olay günlüğü satırları | Yer tutucu yoğun |
| `locales/tr/settings.json` | Ayarlar menüsü etiketleri | Kısa, arayüz dili |
| `locales/tr/questlines.json` | Görev zinciri adları, açıklamaları, adımları | En uzun ve en anlatısal dosya |

Karşılıkları `locales/en/` altındadır. **Dosya adı ve anahtar yolu birebir aynıdır.**

---

## 3. Bozulmaz teknik kurallar

Bu kurallardan biri ihlal edilirse çeviri ne kadar güzel olursa olsun **kabul edilmez** — CI
kırılır veya oyun bozulur.

### 3.1 Anahtar yapısına dokunulmaz

`.github/workflows/test.yml` her PR'da `npm run i18n-sync` çalıştırır ve **`locales/` altında tek
bir baytın bile değişmemesini** şart koşar. Bu şu demektir:

- Anahtar **eklenmez, silinmez, yeniden adlandırılmaz.**
- Anahtar **sırası değiştirilmez** — İngilizce dosyadaki sırayla aynı kalır.
- Girinti **2 boşluk**, dosya sonunda tek satır sonu.
- Yalnızca **değerler** düzenlenir.

Yeni bir anahtar gerektiğini düşünüyorsan çevirme — upstream'de issue açılması gerekir.

### 3.2 Yer tutucular (`{{ ... }}`)

`{{ name }}`, `{{ pokemon, pokemon }}`, `{{ points }}` gibi ifadeler i18next tarafından çalışma
anında doldurulur.

- İçindeki metin **asla çevrilmez**, boşluklar dahil **birebir kopyalanır**.
- `{{ pokemon, pokemon }}` içindeki ikinci `pokemon` bir biçimlendiricidir; silinirse ad
  çevrilmez.
- Bir dizedeki yer tutucu **kümesi** İngilizcesiyle aynı olmalıdır. Sıraları değişebilir —
  Türkçe cümle yapısı bunu zaten gerektirir.

**Yer tutucuya ek getirme.** Yerine gelecek kelimenin son ünlüsü bilinmediği için `{{ pokemon }}'i`
gibi bir ek yanlış çıkma riski taşır. Cümleyi eke ihtiyaç duymayacak şekilde kur:

```
✗ "{{ pokemon, pokemon }}'ı yakaladın."         → ad "Onix" ise "Onix'ı" yanlış
✓ "{{ pokemon, pokemon }} yakaladın."            → belirtisiz nesne, ek gerekmez
✓ "{{ pokemon, pokemon }} adlı Pokémon kaçtı!"   → ek "Pokémon" sözcüğüne gelir, güvenli
```

### 3.3 Referanslar (`[[ ... ]]`)

`[[anahtar]]` başka bir çeviri anahtarının değerini yerine koyar.

- Köşeli parantez içeriği **çevrilmez, olduğu gibi kalır.** `[[pokemon::Gyarados]]` her zaman
  `[[pokemon::Gyarados]]` biçimindedir.
- Parantez **dışındaki** sıfat ve tamlamalar çevrilir:

```
"Defeat the rampaging Red [[pokemon::Gyarados]]!"
→ "Azgın Kırmızı [[pokemon::Gyarados]] ile savaş ve onu yen!"
```

- Değeri tamamen başka bir anahtardan gelen dizeler (`"[[escapedShiny]] (duplicate)"` gibi)
  yalnızca parantez dışı kısmı çevrilerek yazılır: `"[[escapedShiny]] (tekrarlanan)"`.
- Bir değer sadece `"[[baska.anahtar]]"` ise ve parantez dışında hiçbir şey yoksa,
  **boş string (`""`) bırakmak da doğrudur** — i18next referansı zaten çözer.

### 3.4 Boş string ve `null`

- `""` → İngilizce metne geri düşer. Çevrilmemiş anahtarın doğru hâli budur.
- **İngilizce metni Türkçe değere kopyalamak yasaktır.** Bu, "çevrildi" görünen ama çevrilmemiş
  bir anahtar üretir ve eksik çeviri raporlarını bozar. Çeviremiyorsan `""` bırak.
- Türkçede gerçekten boş çıktı isteniyorsa tırnaksız `null` kullanılır (neredeyse hiç gerekmez).

### 3.5 Hash'li anahtarlar (`questlines.json`)

`step 1.0968595418` gibi anahtarlardaki sayı, İngilizce metnin hash'idir. İngilizce metin
değişirse anahtar değişir ve eski çeviri **kasıtlı olarak** düşer. Dolayısıyla:

- Anahtardaki hash'e dokunma.
- Bir adımın çevirisini yazarken hash'in ait olduğu **güncel** İngilizce metni referans al.

---

## 4. Ne çevrilir, ne çevrilmez

### Yol gösterici ilke

> **Oyuncu o ifadeyi oyunun başka bir yerinde İngilizce görüyorsa, burada da İngilizce kalır.**

pokeclicker'da yalnızca bu dört dosya çevrilir. Şehir adları, rota adları, zindanlar, eşyalar,
NPC adları ve tesisler oyunun geri kalanında **İngilizce görünür.** Bunları çevirirsek oyuncu
metinde okuduğu yeri haritada bulamaz.

### 4.1 İngilizce kalır

| Kategori | Örnek |
|---|---|
| Pokémon adları | `Pikachu`, `Mewtwo`, `Gyarados`, `MissingNo.` |
| Kişi adları | `Bill`, `Eusine`, `Prof. Oak`, `Ash`, `Zero` |
| Yer adları | `Viridian City`, `Route 2`, `Castelia Sewers`, `Pallet Town` |
| Bölge adları | `Kanto`, `Johto`, `Hoenn`, `Alola`, `Galar`, `Hisui`, `Paldea` |
| Tesis / etkinlik adları | `Battle Frontier`, `Safari Zone`, `Purify Chamber`, `Gym` |
| Organizasyonlar | `Team Rocket`, `Team Magma`, `Team Aqua` |
| Eşya adları | `Poké Ball`, `Master Ball`, `Rare Candy`, `Dungeon Ticket` |
| Marka terimleri | `Pokémon`, `Pokédex`, `Pokérus`, `Poké Dollar` |
| Görev zinciri özel adları | `Detective Pikachu`, `Magikarp Jump` |

`Pokémon` ve `Pokérus` **her zaman aksanlı `é` ile** yazılır. `Pokemon` yazımı hatadır.

### 4.2 Çevrilir

| Kategori | Örnek |
|---|---|
| Tüm anlatı metni, görev açıklamaları, adımlar | — |
| Fiiller ve eylem yönergeleri | `Defeat` → yen, `Capture` → yakala |
| Pokémon adının önündeki sıfatlar | `Red [[pokemon::Genesect]]` → `Kırmızı [[pokemon::Genesect]]` |
| Varyant nitelemeleri | `Armored [[Mewtwo]]` → `Zırhlı [[Mewtwo]]` |
| Arayüz etiketleri ve ayarlar | `Show mute button` → `Sessize alma düğmesini göster` |
| Jenerik oyun mekaniği adları | `quest` → görev, `achievement` → başarım |
| Sayaç / para birimi jenerik adları | `Quest Points` → `Görev Puanı` |

### 4.3 Bölgesel formlar

Bölge adı korunur, "formu" eklenmez — `pokemon.json` içindeki `alt.*` anahtarları zaten
ad öncesine gelecek şekilde tasarlanmıştır:

```
alt.alolan   → "Alola "     (→ "Alola Vulpix")
alt.galarian → "Galar "     (→ "Galar Articuno")
alt.hisuian  → "Hisui "
alt.paldean  → "Paldea "
```

Bu anahtarların sonundaki boşluk **anlamlıdır**, silinmez.

---

## 5. Sözlük

Aynı kavram her dosyada aynı kelimeyle karşılanır. Yeni bir terim kararlaştırdığında bu tabloya ekle.

### Oyun mekaniği

| İngilizce | Türkçe |
|---|---|
| Achievement | Başarım |
| Battle Item | Dövüş eşyası |
| Berry | Meyve |
| Breeding | Yetiştirme |
| Catch / Capture | Yakalamak |
| Challenge | Meydan okuma |
| Dungeon | Zindan |
| Dungeon Token | Zindan Jetonu |
| Egg | Yumurta |
| Encounter | Karşılaşmak |
| Evolve | Evrimleşmek |
| Farm | Çiftlik |
| Farm Hand | Çiftlik Yardımcısı |
| Farm Point | Çiftlik Puanı |
| Gem | Mücevher |
| Hatch | Yumurtadan çıkmak |
| Hatchery | Kuluçka |
| Hatchery Helper | Kuluçka Yardımcısı |
| Held Item | Taşınan eşya |
| Item | Eşya |
| Level | Seviye |
| Mining | Kazı |
| Mulch | Gübre |
| Plot | Arazi |
| Quest | Görev |
| Quest Point | Görev Puanı |
| Reward | Ödül |
| Roaming | Gezgin |
| Shadow | Gölge |
| Shiny | Parlak |
| Stage | Aşama |
| Trainer | Eğitmen |
| Underground | Yeraltı |
| Wandering | Dolaşan |
| Wither | Kurumak |

### Pokémon tipleri

`Normal`, `Ateş`, `Su`, `Elektrik`, `Çim`, `Buz`, `Dövüş`, `Zehir`, `Toprak`, `Uçan`, `Psişik`,
`Böcek`, `Kaya`, `Hayalet`, `Ejderha`, `Karanlık`, `Çelik`, `Peri`, `Gölge`

Tip adları **isimdir**: `Zehir` (`Zehirli` değil), `Uçan` (`Uçak` değil), `Psişik` (`Psikik` değil).

---

## 6. Türkçe yazım kuralları

### 6.1 Aksanlar zorunlu

`ç ğ ı İ ö ş ü` harfleri **her zaman** doğru yazılır. ASCII karşılıklarına düşmek (`gorev`,
`Pokemon`, `cevrildi`) hatadır. Türkçenin noktalı/noktasız `i/ı` ayrımına dikkat et:
`İlkel`, `Işık`, `Çiftlik`.

### 6.2 Özel adlara ek: kesme işareti

İngilizce özel adlar ek aldığında **kesme işareti** kullanılır ve ek **okunuşa** göre seçilir:

```
Mewtwo'yu, Gyarados'u, Viridian City'de, Poké Ball'ları, Pokérus'a
```

Ekin doğru biçiminden emin değilsen cümleyi ekten kaçacak şekilde kur:
`Route 2 üzerinde`, `Battle Frontier tesisinde`.

### 6.3 Büyük harf

Türkçede **başlık büyük harfi (Title Case) yoktur.** İngilizce etiketleri olduğu gibi
büyütme:

```
✗ "Kayıt Dosyası Adı"
✓ "Kayıt dosyası adı"
```

Cümle içindeki ilk harf ve özel adlar dışında küçük harf kullanılır. Kısa arayüz etiketlerinde
yalnızca ilk kelime büyük başlar.

### 6.4 Hitap

Oyun oyuncuya **2. tekil şahıs, samimi** hitap eder. Tüm dosyalarda tutarlı ol:

```
✓ "Vahşi {{ pokemon, pokemon }} kaçtı!"
✓ "10 Poké Ball satın al."
✓ "{{ pokemon, pokemon }} yakaladın."
✗ "Bir Pokémon yakalayınız."          → resmi
✗ "Pokémon ile karşılaşıldı."          → edilgen, İngilizcesi "You encountered"
```

Görev adımları **emir kipiyle** yazılır: `Yen`, `Yakala`, `Konuş`, `Satın al`.

### 6.5 Noktalama

- İngilizce kaynaktaki `!`, `.`, `?` korunur.
- Tırnak: kaynakta `"{{ name }}"` varsa Türkçede de düz çift tırnak korunur.
- Sayı ve birim arasında boşluk bırakılır: `50 Zindan Jetonu`.
- Üç nokta `...` olarak yazılır; kaynakla tutarlılık için tek karakterli `…` kullanılmaz.

---

## 7. Doğal Türkçe: kaçınılacak kalıplar

Aşağıdakiler bir metni anında "makine çevirisi" gibi gösterir.

### 7.1 Gereksiz "bir"

İngilizcedeki `a/an` Türkçeye taşınmaz.

```
✗ "Bir Pokémon yakala."
✓ "Pokémon yakala."
```

### 7.2 İngilizce cümle sırası

Türkçe yüklemi sona alır. Kelime kelime izleme.

```
İngilizce: "Received {{ reward }} for defeating stage {{ stage }} of the Battle Frontier!"
✗ "Alındı {{ reward }} yenmek için aşama {{ stage }} Battle Frontier'ın!"
✓ "Battle Frontier'ın {{ stage }}. aşamasını geçtin ve {{ reward }} kazandın!"
```

### 7.3 Aşırı edilgen çatı

İngilizce "You ..." diyorsa Türkçe de etken ve 2. tekil olmalı.

```
✗ "Yeni başarı kazanıldı."
✓ "Yeni bir başarım kazandın."
```

### 7.4 Resmi / bürokratik dil

`-mektedir`, `gerçekleştirilmiştir`, `bulunmaktadır` gibi kalıplar oyun diline uymaz.

```
✗ "Meyve toplanmaya hazır bulunmaktadır."
✓ "Meyve toplanmaya hazır."
```

### 7.5 Kelime tekrarı ve gereksiz uzatma

```
✗ "Görev Seviyesi {{ level }}. seviyeye arttı!"     → "seviye" iki kez
✓ "Görev seviyen {{ level }}'e yükseldi!"
```

### 7.6 Sözde çeviri

Anlamı bozan birebir karşılıklar:

```
✗ "Missing Resistant" → "Eksik Yerleşimci"     (resistant ≠ yerleşimci)
✓ "Missing Resistant" → "Direnci eksik"

✗ "Let's Go"          → "Haydi Git"            (oyun serisi adı, özel ad)
✓ "Let's Go"          → "Let's Go"

✗ "Gigantamax"        → "Dev"                  (mekanik adı, özel ad)
✓ "Gigantamax"        → "Gigantamax"
```

### 7.7 Yazım hataları

Sık görülenler: `Orjinal` → **Orijinal**, `Yardımıcı` → **Yardımcı**, `Pokemon` → **Pokémon**.
Yer tutucu bitişikliği de bir hatadır: `{{ stage }}seviyesini` → `{{ stage }}. aşamasını`.

---

## 8. Doğrulama

Her düzenleme turundan sonra çalıştır:

```bash
node scripts/check-tr.js
```

Betik şunları denetler:

1. Tüm JSON dosyaları geçerli mi
2. `tr` ve `en` anahtar kümeleri birebir aynı mı (CI şartı)
3. Yer tutucular (`{{ ... }}`) her dizede kaynakla eşleşiyor mu
4. Referanslar (`[[ ... ]]`) korunmuş mu
5. İngilizce metnin kopyalandığı sahte çeviriler var mı
6. Türkçe metinde ASCII'ye düşmüş aksan hatası var mı
7. Hangi dosyada kaç anahtar boş kaldı

Ek olarak, anahtar yapısının bozulmadığını CI'ın yaptığı gibi doğrula:

```bash
npm ci && npm run i18n-sync && git status --short locales/
```

Çıktı **boş** olmalıdır. Boş değilse anahtar eklenmiş/silinmiş veya biçim bozulmuştur.

---

## 9. Çalışma akışı

1. Çevrilecek dosyayı ve kapsamı belirle (`questlines.json` için görev zinciri bazında ilerle).
2. İlgili İngilizce bloğun **tamamını** oku — adımlar birbirine gönderme yapar, bağlam gerekir.
3. Türkçe bloğu yaz.
4. `node scripts/check-tr.js` çalıştır, hataları düzelt.
5. Anlamlı bir birim tamamlandığında commit et.

### Commit mesajı

Depo kuralına uy — dil önekiyle, İngilizce, tek satır:

```
tr(questlines): translate Tutorial Quests and Team Rocket questlines
tr(logbook): fix placeholder spacing and passive voice
tr(settings): translate remaining notification labels
```

### Kapsam disiplini

- Yalnızca `locales/tr/` altı düzenlenir. Başka dillerin dosyalarına dokunulmaz.
- `locales/en/` **kaynaktır**, düzeltilmez.
- Var olan bir çeviri yalnızca **yanlış, tutarsız veya doğal değilse** değiştirilir; üslup tercihi
  uğruna kitlesel yeniden yazım yapılmaz.

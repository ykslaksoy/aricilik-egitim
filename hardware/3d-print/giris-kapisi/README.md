# Giriş kapısı — 3D baskı tasarımı

**Durum:** tasarim  
**Yazılım:** `apps/api/src/services/entranceGate.js` → `acik` / `orta` / `dar` / `kapali`  
**Format:** OpenSCAD → STL → PETG veya ASA

Langstroth alt tahta uçuş deliğine takılan **sürgülü elektrikli giriş**.  
Servo kapak kaydırır; yazılım hedef pozisyonu seçer.

---

## Parçalar (3 baskı + 1 servo)

| Parça | Dosya | Adet | Malzeme |
|-------|--------|------|---------|
| Çerçeve | `cerceve` | 1 | PETG / ASA |
| Sürgü kapak | `surgu_kapak` | 1 | PETG / ASA |
| Servo braketi | `servo_braket` | 1 | PETG |
| Mikro servo | SG90 veya MG90S | 1 | — |
| Bağlantı kolu | baskı teli 1,2 mm veya küçük PLA kol | 1 | — |

**Baskı:** `giris-kapisi.scad` → OpenSCAD → Export STL (parça parça).

---

## Ölçüler (Langstroth uyumlu)

| | mm | Not |
|--|-----|-----|
| Uçuş deliği (hedef) | **39 × 10** | ~1,5" × 3/8" standart reducer |
| Çerçeve dış | 55 × 28 × 18 | Alt tahtaya vida |
| Sürgü yolu | 32 mm | Kapak kayma mesafesi |
| Vida | M3 × 12 | Alt tahta / reducer |

### Pozisyon → açık alan (yazılım eşlemesi)

| Kod | Açık genişlik | Servo açısı* |
|-----|---------------|--------------|
| `acik` | ~39 mm | 170° |
| `orta` | ~26 mm | 120° |
| `dar` | ~12 mm | 60° |
| `kapali` | ~2 mm | 20° |

\* `servo-acilar.json` — kalibrasyonda ayarlanır.

---

## Montaj (kısa)

1. Alt tahta uçuş deliğini **39 × 10 mm** yap veya reducer kullan.
2. Çerçeveyi deliğin önüne hizala; **M3** ile sabitle.
3. Sürgü kapağı kanala tak; hareket serbest olmalı (zımpara gerekirse).
4. Servo braketini çerçeveye vida / yapıştır; **SG90** tak.
5. Servo kolunu sürgüye bağla; **0° = kapalı**, **180° = açık** (yön ters ise yazılımda ters çevir).
6. IR sayacı çerçevenin yan kanallarından geçer (opsiyonel).

```
     [kovan]
  ┌──────────┐
  │  çerçeve │←── servo braket
  │ ┌──────┐ │
  │ │sürgü │→  kayar (dar ↔ açık)
  └──┴──────┴──
      ↑ IR kanalı (yan)
```

---

## Malzeme

| Ortam | Öneri |
|-------|--------|
| Ev / sabit arılık | **PETG** (UV’ye dayanıklı, esnek) |
| Yayla / güneş | **ASA** (Daesung benzeri dış ortam) |
| Dolgu | %20–30 (mekanik dayanım) |
| Katman | 0,2 mm, 3+ duvar |

**Arı ısısı:** PETG ~60 °C’de yumuşar — girişte doğrudan güneş + koyu renkten kaçın; ASA tercih et.

---

## Yazılım bağlantısı

| API | Donanım |
|-----|---------|
| `entranceGate.hedef` | Servo PWM → `servo-acilar.json` |
| `PATCH /api/hives/:id/kapi` | Manuel override |
| `entranceGate.analiz` | Otomatik karar nedeni |

Firmware (plan): kovan kartı GPIO → servo; hedef değişince **yavaş hareket** (500 ms/adım).

---

## Güvenlik

- Arı sıkışmasın diye **tam kapanma yavaş**; son 2 mm’de duraklama.
- Taşıma öncesi yazılım `kapali` zorlar.
- Servo arızasında **manuel sürgü** çekilebilmeli (kol çıkarılabilir).
- Yağmur: çerçeve üst eğim 3° — su birikmez.

---

## OpenSCAD kullanımı

```bash
# Tek parça önizleme (OpenSCAD GUI veya CLI)
openscad -D part=\"cerceve\" -o cerceve.stl giris-kapisi.scad
openscad -D part=\"surgu\" -o surgu_kapak.stl giris-kapisi.scad
openscad -D part=\"servo\" -o servo_braket.stl giris-kapisi.scad
openscad -D part=\"montaj\" -o montaj_onizleme.stl giris-kapisi.scad
```

**Bağlı:** `docs/ozellikler/donanim/giris-kapisi.md` · `mounting/ir-entrance.md`

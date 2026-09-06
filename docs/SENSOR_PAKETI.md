# koloni / beepack — tam sensör paketi

**karar:** uygun fiyatlı sensörlerin hepsi NODE’da. gps ve eğim yok (eğim 4 köşe tartıdan).

---

## her kovanda (beepack s + c ortak)

| # | sensör | adet | ~₺ | ne işe yarar |
|---|--------|------|-----|--------------|
| 1 | 50 kg load cell | **4** | 176 | tartı, oğul, eğim/dengesizlik |
| 2 | DHT22 sıcaklık/nem | 1 | 114 | sağlık skoru |
| 3 | IR (alıcı-verici / TCRT) | **2** | ~100 | beeIn / beeOut, kalibrasyon |
| 4 | mikrofon (MEMS / sound module) | 1 | ~30–80 | oğul / ana / aktivite (AI sonra) |
| 5 | ADXL345 titreşim | 1 | ~150 | darbe, sarsıntı, oğul doğrulama |
| | **ek sensör toplamı** | | **~570–620** | (tartı+th hariç ~250–330) |

mevcut node (~3.100 ₺) + ek sensörler ≈ **~3.400 – 3.550 ₺** (kamera hariç).

---

## sadece beepack c

| sensör | ~₺ | not |
|--------|-----|-----|
| **kovan üzeri** kapı / giriş kamerası | +1.500–3.000 | her c kovanda; + WiFi hub (ağ, kamera değil) |

**Kamera kovan üzerinde** (uçuş deliğine bakar). Merkez/avlu kamerası yok.  
c’de ir **yine kalır** (ilk saha): kamera sayımı ile karşılaştırılır; sonra c’de ir opsiyonel düşürülebilir.

---

## bilerek yok

| sensör | neden |
|--------|--------|
| gps | sabit arılık; gerek yok |
| eğim / tilt | 4 köşe tartı yeter |
| petek içi 2. sıcaklık | tek dht22 yeter (şimdilik) |

---

## paket özeti

| | beepack s | beepack c |
|--|:---------:|:---------:|
| tartı 4× | ✓ | ✓ |
| sıcaklık + nem | ✓ | ✓ |
| ir 2 kanal | ✓ | ✓ |
| mikrofon | ✓ | ✓ |
| titreşim | ✓ | ✓ |
| kamera | ✗ | ✓ |
| gps / eğim | ✗ | ✗ |

---

## uygulama tarafı (bu sensörlerle)

| veri | skor / özellik |
|------|----------------|
| tartı | kg, oğul, hasat, dengesizlik/eğim |
| th | sağlık |
| ir | arı tahmini, öğlen kalibrasyon |
| mic | oğul/ana AI (v2) |
| titreşim | darbe + oğul doğrulama |
| kamera (c) | görüntü + ileride cv sayım |

alım: `ALIM_ASAMA1_ASAMA2.md`

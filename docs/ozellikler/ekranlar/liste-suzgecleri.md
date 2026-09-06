# Liste süzgeçleri — değerlendirme durumları

Kovanlar **değerlendirme durumuna göre** listelenir / süzülür.  
Hepsi **kovan bazında**; bir kovan birden fazla duruma girebilir.

---

## A — Skor durumları (**calisiyor** — `evaluation.durumlar`)

Tam tablo: `skorlar/kovan-durumlari.md`

### Koloni skoru
| Durum | Kural (öneri) |
|-------|----------------|
| Koloni zayıf | skor &lt; 40 |
| Koloni orta | 40–64 |
| Koloni iyi | 65–84 |
| Koloni mükemmel | ≥ 85 |

### Sağlık
| Durum | Kural |
|-------|--------|
| Sağlık kritik | &lt; 45 |
| Sağlık dikkat | 45–64 |
| Sağlık iyi | 65–84 |
| Sağlık çok iyi | ≥ 85 |

### Oğul riski
| Durum | Kural |
|-------|--------|
| Oğul düşük | &lt; 28 |
| Oğul izle | 28–49 |
| Oğul yüksek | 50–74 |
| Oğul acil | ≥ 75 |
| Oğul gerçekleşti | faz = occurred |

### Arı sayısı katmanları
| Durum | Kural |
|-------|--------|
| Arı normal | &lt; 35k |
| Arı izle | 35k+ |
| Arı artan | 40k+ |
| Arı yüksek | 45k+ |
| Arı kritik | 48k+ |
| Arı maksimum | 55k+ |

---

## B — Alarm / olay durumları

| Durum | Tetik |
|-------|--------|
| Ağırlık düşüşü | ≥1 kg ani |
| Düşük pil | &lt; 20% |
| Dengesizlik | köşe farkı eşik |
| Titreşim / darbe | taşıma dışı sert sarsıntı |
| Ana kaybı şüphesi | mic + trafik (v2) |
| Veri yok / offline | son ölçüm &gt; X saat |

---

## C — Kayıt / genetik (süzme)

| Durum | Alan |
|-------|------|
| Ana {ırk} × Baba {ırk} | çapraz (genişletilebilir ırklar) |
| Saf {ırk} | ana === baba |
| Irk bilinmiyor | ana/baba boş |
| Ana yok / şüpheli | ana durumu |

---

## D — Operasyon / gezginci

| Durum | Anlam |
|-------|--------|
| Normal (sabit) | taşıma yok |
| Taşımada | transportMode |
| Yerleşmede (~48s) | yeni arılık toparlanma |
| Arılık: Tortum / Yanıkdağ… | konum |

---

## E — Donanım / paket

| Durum | Anlam |
|-------|--------|
| Standart paket | kamera yok |
| Kovan kamerası var | cameraPresent |
| Ana kamera (arılık) | arılık bayrağı |
| Kalibrasyon yok | tare/referans eksik |
| Kalibrasyon tamam | config dolu |

---

## F — Önerilen ek durumlar (ekleyebiliriz)

| Durum | Neden | Öncelik |
|-------|--------|---------|
| **Hasat hazır** | ağırlık yüksek + plato + mevsim | Öncelik 3 |
| **Besleme gerekir** | kış/erken ilkbahar kg düşüş trendi | Öncelik 3 |
| **Yağma şüphesi** | anormal giriş, akşam trafik | Öncelik 2 |
| **Aşırı sıcak** | temp &gt; 37–38 | Öncelik 2 |
| **Aşırı nem / kuru** | nem eşik dışı | Öncelik 2 |
| **Zayıf gelişim** | arı düşük + skor düşük, sezon ortası | Öncelik 2 |
| **Muayene zamanı** | son muayene &gt; N gün | Öncelik 4 |
| **Varroa şüphesi** | (ileride mic/ısı; şimdilik manuel etiket) | Öncelik 4 |
| **Süper eklenmeli** | oğul yüksek + ağırlık plato | Öncelik 1 |
| **Kat böl adayı** | 55k+ / maksimum katman | Öncelik 1 |
| **Yeni ana / ana değiştirildi** | son X günde ana değişimi | Öncelik 4 |
| **Bal akışı var** | günlük kg artışı güçlü | Öncelik 4 |
| **Kışa hazırlık** | ay + kg + arı eşiği | Öncelik 5 |
| **Sensör arızası** | saçma değer / 0 / takılı değil | Öncelik 2 |
| **Favori / yıldız** | arıcı işaretler | Öncelik 5 |
| **Satılık / oğul satışı** | manuel etiket | Öncelik 5 |

Görev listesi ile aynı: **Öncelik 1** (en acil) … **Öncelik 5** (düşük).

---

## Listede nasıl durur (UI)

```
Hızlı süzgeçler:
  [ Oğul acil ] [ Arı kritik+ ] [ Sağlık kritik ] [ Offline ]
  [ Taşımada ] [ Ana Kafkas × Baba Karniyol ] [ Kalibrasyon yok ]

Sırala: oğul riski ↓ · arı katmanı ↓ · skor ↑ · kg ↓
```

Bir kovan birden fazla chip ile görünebilir: `Oğul acil` + `Arı kritik` + `Pil düşük`.

---

## Özet — önce bunlar

**Şimdi (motor hazır):** oğul fazları, arı katmanları, koloni/sağlık bantları, çapraz ırk, offline, pil, densizlik  

**Hemen eklenebilir (Öncelik 1–2):** aşırı sıcak/nem, süper/kat adayı, sensör arızası, kalibrasyon yok  

**Sonra (Öncelik 3–5):** hasat, yağma, muayene zamanı, Varroa, kış  

Dosya yolu: liste ekranı + kovan detay chip’leri.

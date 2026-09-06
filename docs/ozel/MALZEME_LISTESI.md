# MALZEME LİSTESİ — beepack / koloni

> **ÖZEL — sadece sahip görür; uygulama ekranında yok.**  
> “Malzeme listesini getir” → bu dosya gönderilir.  
> Klasör: `docs/ozel/` · Güncelleme: 2026-08-31

**Alınmıyor:** GPS · eğim · kalibrasyon ağırlığı · yeni SIM (kendi hattın) · merkez/avlu kamerası

| Aşama | Ne | Ne zaman | ~₺ |
|-------|-----|----------|---:|
| **1** | 1 kovan NODE (tüm sensörler) + ev WiFi | **şimdi** | **3.760** |
| **2** | GATE (LoRa + 4G) uzak dinleme | WiFi’de çalışınca | **5.102** |
| **3** | **Kovan üzeri** giriş kamerası (beepack c) | s çalışınca | **~2.000–3.500** |
| | **1 kovan + uzak (s, kamera yok)** | | **~8.900** |
| | **1 kovan + uzak + kamera (c)** | | **~10.900–12.400** |

---

## AŞAMA 1 — şimdi al (NODE / beepack s)

| # | Malzeme | Adet | Birim ₺ | Satır ₺ | Nereden |
|---|---------|-----:|--------:|--------:|---------|
| 1 | LilyGO **T-Weigh 868 MHz** | 1 | 900 | **900** | lilygo.cc / OpenELAB / Mauser |
| 2 | **T-U2T** programlayıcı | 1 | 806 | **806** | f1depo.com |
| 3 | **50 kg load cell** | 4 | 44 | **176** | robiz.net |
| 4 | **DHT22** sıcaklık/nem | 1 | 114 | **114** | robo90.com |
| 5 | **IR sensör** (KY-033 / TCRT) | 2 | 50 | **100** | robotistan.com |
| 6 | **Mikrofon** ses sensörü | 1 | 45 | **45** | robotistan.com |
| 7 | **ADXL345** titreşim | 1 | 150 | **150** | robotistan.com |
| 8 | **4,7k Ω** direnç | 1 | 6 | **6** | robiz.net |
| 9 | Güneş paneli **6V 150mA** | 1 | 175 | **175** | robotistan.com |
| 10 | **CN3065** güneş şarj | 1 | 86 | **86** | robiz.net |
| 11 | **1S BMS** | 1 | 17 | **17** | robiz.net |
| 12 | **18650** 3200mAh | 1 | 183 | **183** | robotistan.com |
| 13 | Tekli pil yuvası | 1 | 26 | **26** | robotistan.com |
| 14 | **IP65 kutu** ~83×58 mm | 1 | 101 | **101** | robiz.net |
| 15 | Jumper **F-F** | 1 paket | 50 | **50** | robiz.net |
| 16 | Jumper **M-F** | 1 paket | 50 | **50** | robiz.net |
| 17 | **USB kablo** | 1 | 45 | **45** | robotistan.com |
| 18 | Tartı platformu (kontrplak+vida+ayak) | 1 set | 380 | **380** | yerel hırdavat |
| | Parça | | | **3.410** | |
| | Kargo (~5 sipariş) | | | **350** | |
| | **AŞAMA 1 TOPLAM** | | | **3.760 ₺** | |

### Site site sepet (aşama 1)

| Site | Ara toplam ₺ |
|------|-------------:|
| LilyGO / OpenELAB (T-Weigh) | 900 |
| F1Depo (T-U2T) | 806 |
| Robiz | 486 |
| Robo90 (DHT22) | 114 |
| Robotistan | 724 |
| Yerel hırdavat (platform) | 380 |
| Kargo | 350 |

---

## AŞAMA 2 — çalışınca al (GATE)

| # | Malzeme | Adet | Birim ₺ | Satır ₺ | Nereden |
|---|---------|-----:|--------:|--------:|---------|
| 19 | LilyGO **T-Beam** LoRa | 1 | 2.955 | **2.955** | direnc.net |
| 20 | **A7670E** 4G modem | 1 | 1.887 | **1.887** | direnc.net |
| 21 | Güneş paneli **6V 500mA** | 1 | 632 | **632** | robotistan.com |
| 22 | **18650** 3200mAh | 2 | 183 | **366** | robotistan.com |
| 23 | **2S BMS** | 1 | 43 | **43** | robiz.net |
| 24 | Çift pil yuvası | 1 | 53 | **53** | robiz.net |
| 25 | Kutu **150×100×50 mm** | 1 | 86 | **86** | robiz.net |
| | Parça | | | **5.022** | |
| | Kargo | | | **80** | |
| | SIM | | | **0** | kendi hattın |
| | **AŞAMA 2 TOPLAM** | | | **5.102 ₺** | |

T-U2T tekrar alınmaz — aşama 1’deki yeter.

---

## AŞAMA 3 — sonra (beepack c — kovan üzeri kamera)

**Kamera kovan üzerinde** (uçuş deliğine bakar). Merkez/avlu kamerası **değil**.

| # | Malzeme | Adet | ~₺ | Nereden / not |
|---|---------|-----:|---:|---------------|
| 26 | **Kovan üzeri giriş kamerası** (IP / ESP32-CAM sınıfı) | 1 | **1.500–3.000** | model seçimi saha testinden sonra |
| 27 | **WiFi hub** (arılık ortak ağ) | 1 | **500** | görüntü kamerası değil — sadece ağ |
| 28 | Montaj braketi / su geçirmez muhafaza | 1 | **100–200** | kapıya sabitleme |
| 29 | **Ana kamera** (arılık merkezi) | 1 | **1.000–2.500** | genel bakış — kovan kamerasından ayrı |
| | **AŞAMA 3 TOPLAM (tahmini)** | | **~3.000–6.000** | hub + kovan kamerası + ana kamera |

İlk saha: IR sayaç **kalır** (kamera sayımı ile karşılaştırma).

---

## Toplam

```
Aşama 1 (şimdi, s)           3.760 ₺
Aşama 2 (çalışınca, GATE)    5.102 ₺
────────────────────────────
s + uzak                     ~8.900 ₺

Aşama 3 (kovan üzeri kamera) ~2.000–3.500 ₺
────────────────────────────
c + uzak                     ~10.900–12.400 ₺
```

Ek kovan (GATE + T-U2T bir kez): ~**2.950 ₺**/NODE (s) · + kamera ~**1.500–3.000 ₺**/kovan (c)

---

## Ayrı (donanım dışı)

- İyi kovan + canlı koloni: ~3–8 bin ₺ (saha testi için)

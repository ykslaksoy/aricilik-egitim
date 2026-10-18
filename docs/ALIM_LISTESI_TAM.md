# beepack — malzeme listesi + maliyet

> **18.10.2026 güncellemesi (koloni-243 kararı):** DHT22 → **Sensirion SHT41** (I²C 0x44, ±0,2 °C / ±1,8 %RH tipik — [SHT4x datasheet V7.3](https://sensirion.com/media/documents/33FD6951/6A7C10A0/HT_DS_Datasheet_SHT4x_V7.3.pdf)). SHT41 Türkiye mağazası TL fiyatı: **Veri yok** (Robotistan, Direnc.net'te bulunamadı, 18.10.2026). Başvuru: 5,95 USD — [Adafruit #5776](https://www.adafruit.com/product/5776) (18.10.2026, kartta I²C pull-up var) ≈ 294,21 ₺ (TCMB döviz satış 16.10.2026, 1 USD = 49,4463 ₺). Aşağıdaki eski toplamlar DHT22 (114 ₺) ile hesaplanmıştı; güncel toplam: Yönetici → Donanım → Satın alma listesi.

**plan:** aşama 1 NODE (WiFi test) → çalışınca aşama 2 GATE.  
**ana plan:** **`ALIM_PLANI.md`**

fiyatlar yaklaşık KDV dahil (2026).

**yok:** gps, eğim, kalibrasyon ağırlığı, yeni SIM, kamera (c sonra)

---

## AŞAMA 1 — şimdi (1 kovan NODE)

| # | malzeme | adet | birim ₺ | satır ₺ | nereden |
|---|---------|-----:|--------:|--------:|---------|
| 1 | LilyGO T-Weigh 868 MHz | 1 | 900 | **900** | lilygo.cc / OpenELAB / Mauser |
| 2 | T-U2T programlayıcı | 1 | 806 | **806** | f1depo.com |
| 3 | 50 kg load cell | 4 | 44 | **176** | robiz.net |
| 4 | SHT41 sıcaklık/nem | 1 | Veri yok | **Veri yok** | adafruit.com/product/5776 (5,95 USD) |
| 5 | IR sensör modülü | 2 | 50 | **100** | robotistan.com |
| 6 | mikrofon / ses sensörü | 1 | 45 | **45** | robotistan.com |
| 7 | ADXL345 titreşim | 1 | 150 | **150** | robotistan.com |
| 8 | 4,7k Ω direnç | 1 | 6 | **6** | robiz.net |
| 9 | güneş paneli 6V 150mA | 1 | 175 | **175** | robotistan.com |
| 10 | CN3065 şarj kartı | 1 | 86 | **86** | robiz.net |
| 11 | 1S BMS | 1 | 17 | **17** | robiz.net |
| 12 | 18650 pil 3200mAh | 1 | 183 | **183** | robotistan.com |
| 13 | tekli 18650 yuvası | 1 | 26 | **26** | robotistan.com |
| 14 | IP65 kutu | 1 | 101 | **101** | robiz.net |
| 15 | jumper F-F | 1 | 50 | **50** | robiz.net |
| 16 | jumper M-F | 1 | 50 | **50** | robiz.net |
| 17 | USB kablo | 1 | 45 | **45** | robotistan.com |
| 18 | tartı platformu (kontrplak+vida) | 1 | 380 | **380** | yerel hırdavat |
| | **parçalar toplam** | | | **3.410** | |

| ek | ₺ |
|----|--:|
| kargo (tahmini, 5 sipariş) | 350 |
| **AŞAMA 1 TOPLAM** | **3.760** |

---

## AŞAMA 1 — site site maliyet

| site | kalemler | ₺ |
|------|----------|--:|
| LilyGO / OpenELAB | T-Weigh | 900 |
| F1Depo | T-U2T | 806 |
| Robiz | load cell×4 + CN3065 + BMS + kutu + direnç + jumper×2 | 486 |
| Adafruit | SHT41 | Veri yok (5,95 USD) |
| Robotistan | güneş + pil + yuva + USB + IR×2 + mic + ADXL345 | 724 |
| Yerel | platform | 380 |
| kargo | | 350 |
| **toplam** | | **3.760** |

---

## AŞAMA 2 — sonra (GATE)

| # | malzeme | adet | birim ₺ | satır ₺ | nereden |
|---|---------|-----:|--------:|--------:|---------|
| 19 | LilyGO T-Beam LoRa | 1 | 2.955 | **2.955** | direnc.net |
| 20 | A7670E 4G modem | 1 | 1.887 | **1.887** | direnc.net |
| 21 | güneş paneli 6V 500mA | 1 | 632 | **632** | robotistan.com |
| 22 | 18650 pil 3200mAh | 2 | 183 | **366** | robotistan.com |
| 23 | 2S BMS | 1 | 43 | **43** | robiz.net |
| 24 | çift pil yuvası | 1 | 53 | **53** | robiz.net |
| 25 | kutu 150×100×50 | 1 | 86 | **86** | robiz.net |
| | **parçalar toplam** | | | **5.022** | |

| ek | ₺ |
|----|--:|
| kargo (tahmini) | 80 |
| SIM | 0 (kendi hattın) |
| **AŞAMA 2 TOPLAM** | **5.102** |

---

## AŞAMA 2 — site site maliyet

| site | kalemler | ₺ |
|------|----------|--:|
| Direnc.net | T-Beam + A7670E | 4.842 |
| Robotistan | güneş + 2×18650 | 998 |
| Robiz | 2S BMS + çift yuva + kutu | 182 |
| kargo | | 80 |
| **toplam** | | **5.102** |

---

## GENEL TOPLAM (uzak öncelikli — hepsi şimdi)

| | ₺ |
|--|--:|
| NODE (1 kovan tam sensör) | **3.760** |
| GATE | **5.102** |
| **1 kovan + GATE şimdi** | **8.862** |

yuvarlak: **~8.900 ₺**

```
şimdi tek seferde    ≈  8.900 ₺   (uzak dinleme hazır)
sonraki her kovan    ≈  2.950 ₺   (sadece NODE)
```

abonelik (koloni aylık) bu tutara **dahil değil**.

---

## 2. kovan maliyeti (T-U2T yok)

T-U2T bir kez alındı → sonraki her NODE ≈ **3.760 − 806 = 2.954 ₺** (+ kargo payı ~3.100 ₺)

| ölçek | hesap | ~₺ |
|-------|--------|---:|
| 1 kovan + 1 GATE | 8.862 | **8.900** |
| 5 kovan + 1 GATE | 3.760 + 4×2.954 + 5.102 | **20.680** |
| 30 kovan + 1 GATE | 3.760 + 29×2.954 + 5.102 | **94.526** |

---

## alma (maliyet yok)

| malzeme | neden |
|---------|--------|
| gps | yok |
| eğim | tartıdan |
| kalibrasyon ağırlığı | evde |
| yeni SIM | kendi hattın |
| kamera / HUB | beepack c sonra |

CSV: `alim-listesi-tam.csv`

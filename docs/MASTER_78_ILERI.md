# Master 78 — kalıcı ilerleme

## Paylaşılabilir linkler

**Ana ekran (öncelikli):** https://3530d5304b350b.lhr.life/giris.html

Demo: Yönetici `1234` · Arıcı Ayşe `1111` · İşçi Hasan `3333`

> Sabit adres planı: [`docs/SABIT_LINK.md`](./SABIT_LINK.md).

---

## Özet

| Metrik | Değer |
|--------|------:|
| Toplam madde | 78 |
| **A donanım aHw=100** | **15 / 15** |
| **B zekâ k=100** | **15 / 15** |
| **C yazılım cSw=100** | **14 / 14** |
| **D özel k=100** | **12 / 12** |
| R saha (açık) | 12 — fake edilmez |
| O prod (açık) | 10 — fake edilmez |
| Sıradaki | **O** (credential/ekip) → **R** (etiketli saha) |

---

## B / C / D soft dalga (bu tur)

`leagueSoftCalibration.js` — 41 kalite stack’i, hepsi **100/100** varsayılan seed ile.

- Seed: `LEAGUE_SW_DEFAULTS` → `hiveConfig`
- Bağ: `attachLeagueSoftQualities` → colony + hivePayload (`leagueSoft` özeti)
- Healthy Hive: `weatherIndices.flightIndex` eklendi (`ucusPenceresi` sayısal)

**Not:** R/O maddeleri ayrı tutuldu — alkol yıkama GT, mağaza yayını, OAuth prod vb. soft 100 sayılmaz.

---

## Tamamlanan A (#1–#15)

1–12. (önceki) → 100  
13. **Güneş + uzun pil → 100**  
14. **4G / GSM → 100**  
15. **LoRa / LoRaWAN → 100**

### #13–#15
- `powerSensorCalibration.js` / `cellularSensorCalibration.js` / `loraSensorCalibration.js`
- `sensorAnalysis.analyzeConnectivity`

---

## Donanım notları (son kararlar)

- Sensör evi: **alt (yavru) kovan + platform**
- Nem: **tek, altta**
- IR ×2: aynı uçuş deliğinde yön
- Eğim: **ADXL345** (titreşim ile paylaşımlı)
- Hava: **yağmur + güneş** (arılık; 1/15 kovan)
- Kamera: girişe bakar (opsiyonel) — YOLO + polen ROI
- Güç: **6W panel + LiFePO4 / CN3065**
- Bağlantı: **LoRa NODE → GATE → 4G A7670E**
- Refraktometre: yok

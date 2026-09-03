# Master 78 — kalıcı ilerleme

## Paylaşılabilir linkler

**Ana ekran (öncelikli):** https://remarkable-examination-edinburgh-legislation.trycloudflare.com/giris.html

Demo: Yönetici `1234` · Arıcı Ayşe `1111` · İşçi Hasan `3333`

> Sabit adres planı: [`docs/SABIT_LINK.md`](./SABIT_LINK.md).

---

## Özet

| Metrik | Değer |
|--------|------:|
| Toplam madde | 78 |
| **A donanım aHw=100** | **15 / 15** (#1–#15 tamam) |
| Sıradaki | R/B/C/O — saha + zekâ + ürün + operasyon |

---

## Tamamlanan A (#1–#15)

1–12. (önceki) → 100  
13. **Güneş + uzun pil → 100** (panel+LiFePO4 + uyku + şarj; SH 94)  
14. **4G / GSM → 100** (A7670E + offline buffer + LoRa failover; SH 95)  
15. **LoRa / LoRaWAN → 100** (NODE+GATE + retry + failover; SH 0 eşsiz)

### #13–#15 ne yapıldı
- `powerSensorCalibration.js` — güneş/pil kalite
- `cellularSensorCalibration.js` — 4G GATE kalite
- `loraSensorCalibration.js` — LoRa kalite
- `sensorAnalysis.analyzeConnectivity` — üç kalite + solarChargeW / uplink / uyku
- Seed + ingest: `solarChargeW`, `cellPresent`, `cellularRssi`, `uplink`

**Not:** R (saha) ve O (prod) maddeleri ayrı — 12 ay pil logu / kırsal kapsama / mağaza yayını aHw’ye sayılmaz.

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

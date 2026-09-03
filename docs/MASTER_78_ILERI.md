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
| K=100 (aHw) | **10** (#1–#10) |
| Sıradaki | **#11 Kovan kamerası CV** (aHw≈68) |

---

## Tamamlanan (#1–#10)

1. 4 köşe tartı → 100  
2. Tek taraf → 100  
3. Yavru prob → 100  
4. Nem → 100  
5. Akustik → 100  
6. Titreşim → 100  
7. IR → 100  
8. GPS zinciri → 100  
9. Devrilme / eğim → 100  
10. **Hava istasyonu → 100** (yağmur+güneş BOM + Open-Meteo + nektar; SH 96 geçildi)

### #10 ne yapıldı
- `weatherStationCalibration.js` — kalite katmanı (BOM + fabrika + firmware + montaj + ingest + rüzgâr + meteo + nektar + senaryo ≥15 + ref)
- `weatherStationAnalysis.js` — istasyon×konum füzyon, nectarBoost, kalite
- `weatherIndices.js` — istasyon rain/solar ile nektar indeksi
- Seed + ingest: `weatherStation` / `rainMm` / `solarW` / `windKmh`
- BOM: arılık seviyesi 1 istasyon / ~15 kovan
- Skor: aHw **100**, k **96**, bom **true**

---

## Donanım notları (son kararlar)

- Sensör evi: **alt (yavru) kovan + platform**
- Nem: **tek, altta**
- IR ×2: aynı uçuş deliğinde yön
- Eğim: **ADXL345** (titreşim ile paylaşımlı)
- Hava: **yağmur + güneş** (arılık; 1/15 kovan)
- Kamera: girişe bakar (opsiyonel)
- Refraktometre: yok

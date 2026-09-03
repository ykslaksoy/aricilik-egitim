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
| K=100 (aHw) | **12** (#1–#12) |
| Sıradaki | **#13 Güneş + uzun pil** (aHw≈93) |

---

## Tamamlanan (#1–#12)

1. 4 köşe tartı → 100  
2. Tek taraf → 100  
3. Yavru prob → 100  
4. Nem → 100  
5. Akustik → 100  
6. Titreşim → 100  
7. IR → 100  
8. GPS zinciri → 100  
9. Devrilme / eğim → 100  
10. Hava istasyonu → 100  
11. Kovan kamerası CV → 100  
12. **Çiçek ziyareti → 100** (giriş ROI polen + IR + nektar + kontrat; SH 88 geçildi)

### #12 ne yapıldı
- `flowerVisitCalibration.js` — kalite katmanı (ROI BOM + fabrika + firmware + montaj + ingest + IR + nektar + yağmur + kontrat + senaryo ≥10)
- `flowerVisitAnalysis.js` — kamera polen sepeti (yoksa IR proxy), yağmur kapısı, pollination bağ
- Seed + ingest: `pollenLoadPct` / `flowerVisit`, `autoFlowerVisitCalibrate`
- BOM: **ek polen tuzağı yok** — #11 giriş kamerası ROI
- Skor: aHw **100**, k **90**, bom **optional**

---

## Donanım notları (son kararlar)

- Sensör evi: **alt (yavru) kovan + platform**
- Nem: **tek, altta**
- IR ×2: aynı uçuş deliğinde yön
- Eğim: **ADXL345** (titreşim ile paylaşımlı)
- Hava: **yağmur + güneş** (arılık; 1/15 kovan)
- Kamera: girişe bakar (opsiyonel) — edge YOLO/ONNX + IR çapraz + **polen ROI**
- Çiçek ziyareti: giriş ROI (tuzak yok)
- Refraktometre: yok

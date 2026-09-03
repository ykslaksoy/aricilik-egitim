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
| K=100 (aHw) | **11** (#1–#11) |
| Sıradaki | **#12 Çiçek ziyareti sensörü** (aHw≈32) |

---

## Tamamlanan (#1–#11)

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
11. **Kovan kamerası CV → 100** (giriş edge YOLO/ONNX + IR çapraz + 500 etiket; SH 98)

### #11 ne yapıldı
- `cameraSensorCalibration.js` — kalite katmanı (BOM + fabrika + firmware + montaj + ingest + IR çapraz + 500 etiket + senaryo ≥12 + YOLO)
- `cameraAnalysis.js` — `yolo_onnx_v1` edge yolu, kalite skoru, cfg
- Seed + ingest: `cameraBeeIn/Out`, `autoCameraCalibrate`
- BOM: giriş kamerası **opsiyonel** (takılmazsa IR+tartı)
- Skor: aHw **100**, k **96**, bom **optional**

---

## Donanım notları (son kararlar)

- Sensör evi: **alt (yavru) kovan + platform**
- Nem: **tek, altta**
- IR ×2: aynı uçuş deliğinde yön
- Eğim: **ADXL345** (titreşim ile paylaşımlı)
- Hava: **yağmur + güneş** (arılık; 1/15 kovan)
- Kamera: girişe bakar (opsiyonel) — edge YOLO/ONNX + IR çapraz
- Refraktometre: yok

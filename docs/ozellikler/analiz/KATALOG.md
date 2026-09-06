# Analiz kataloğu

Tek kaynak: `packages/shared/analysisRegistry.js`

## Özet

| Durum | Adet |
|-------|------|
| **Toplam** | 37 |
| **Çalışıyor** | 37 |
| **Demo / plan** | 0 |

Tüm analizler kodlandı ve filoda çalışır durumda.

## Yeni modüller (önceki plan/demo)

| ID | Modül |
|----|--------|
| `akustik_ml` | `acousticMlAnalysis.js` |
| `hasat_zamani` | `harvestAnalysis.js` |
| `pollination_roi` | `pollinationAnalysis.js` |
| `gps_devrilme` | `gpsTiltAnalysis.js` |
| `muayene_gunlugu` | `inspectionJournalAnalysis.js` |
| `kovan_kamera` | `cameraAnalysis.js` — motion blob CV (`live`) |
| `kamera_ir_ky` | `cameraAnalysis.analyzeIrComparison` |
| `arilik_kamera` | `cameraAnalysis.analyzeApiaryCamera` |

## API

- `GET /api/analyses` — katalog + filo özeti
- `GET /api/hives/:id/analyses` — kovan runtime durumu

## Yeni analiz ekleme

1. Modül yaz → `attachDeepInsights` veya ilgili pipeline'a bağla
2. `analysisRegistry.js` kaydı ekle
3. `analysisStatus.js` özet/uyarı eşlemesi

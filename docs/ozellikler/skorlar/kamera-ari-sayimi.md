# Kamera arı sayımı (CV) — opsiyonel

**Durum:** calisiyor (edge YOLO/ONNX + IR çapraz) · aHw 100

Sadece kovan üzeri kamera **takılıysa** çalışır.  
Yoksa arı tahmini **tartı + IR + kalibrasyon** ile devam eder (mevcut yol).

| Kamera | `beeEstimate` kaynağı |
|--------|------------------------|
| Yok | tartı + öğlen IR |
| Var | tartı + IR + CV (%28 ağırlık, `CAMERA.CV_BLEND_WEIGHT`) |

**Akış:** `cameraAnalysis.js` → YOLO/ONNX (yoksa motion blob) → IR karşılaştırma → `blendCameraBeeEstimate()` · kalite `cameraSensorCalibration.js`

**Çıktı alanları:** `hiveCamera.counts`, `hiveCamera.cv.method`, `hiveCamera.irComparison`, `hiveCamera.quality`, `colony.cameraBoost`, `colony.beeEstimateSource`

**Bağlı:** `sensorler/kamera.md`, `kalibrasyon/kamera-ir-karsilastirma.md`

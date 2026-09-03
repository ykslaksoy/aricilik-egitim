# Kamera (kovan üzeri — opsiyonel)

**Durum:** calisiyor (edge YOLO/ONNX + IR çapraz)  
**Kural:** takılmazsa sistem **kamerasız çalışır** (standart paket / IR yolu).

**Konum (takılıysa):** kovan üzerinde — uçuş deliği / kapıya bakar.

| Kamera | Sistem |
|--------|--------|
| **Yok** | Tartı + TH + IR + mic + titreşim → skor, arı tahmini, oğul alarmı normal |
| **Var** (c) | Aynı + giriş görüntüsü + CV sayım (IR ile birleşik) |

**Algılama:** ingest’te `cameraPresent: true/false` veya son kare yoksa otomatik kamerasız mod.

**Ne işe yarar (sadece var ise):**
- Giriş yoğunluğu görüntüsü (son kare / canlı demo)
- CV arı sayımı → `beeEstimate` güçlendirme (`cameraBoost`)
- IR karşılaştırma kalibrasyonu

**API (demo):**
- `GET /api/hives/:id/camera` — sayım, IR karşılaştırma, snapshot URL
- `GET /api/hives/:id/camera/snapshot` — anlık kare

**Demo kovanlar:** 2 (normal), 22 (yoğun trafik / oğul)

**Bağlı:** `donanim/paket-kamera.md`, `skorlar/kamera-ari-sayimi.md`  
**Ana kamera (ayrı, da opsiyonel):** `ana-kamera.md`

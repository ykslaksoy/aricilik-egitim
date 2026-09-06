# Ana kamera (arılık — opsiyonel)

**Durum:** calisiyor (demo analiz) / plan (gerçek stream + hareket algılama)  
**Kural:** **var gibi** kurgulanır; **takılmazsa** arılık / gezginci **görüntüsüz çalışır**.

**Konum (takılıysa):** arılık merkezi — genel bakış (yerleşme, güvenlik, avlu).

| Ana kamera | Sistem |
|------------|--------|
| **Yok** (`mainCameraPresent: false`) | Gezginci, taşıma, konum, alarmlar — sensörlerle devam; ana kamera ekranı gizlenir |
| **Var** (`mainCameraPresent: true`) | + yerleşme / güvenlik görüntüsü, son kare, arılık trafik analizi, hava doğrulama |

Kovan kapı kamerasından (`kamera.md`) **bağımsız** — biri yokken diğeri olabilir; ikisi de yokken sistem tam çalışır.

**Ingest / config:** `mainCameraPresent` · `mainCameraUrl` (opsiyonel)

**Analiz (demo):**
- Konumdaki tüm kovanların ortalama IR trafiği
- Hava API ile uyum (yağmur → düşük trafik beklenir)
- Güvenlik ipuçları (hasar / hırsızlık bayrağı)
- Son kare / canlı demo görüntüsü

**API (demo):**
- `GET /api/locations/:id/camera` — arılık analizi + snapshot
- `GET /api/locations/:id/camera/snapshot` — anlık kare
- Kovan detayında `apiaryCamera` (konumda ana kamera varsa)

**Demo konum:** Yayla Tortum (kovan 13, 22, 3 — ana kamera paylaşımlı)

**Bağlı:** `donanim/kamera-politikasi.md`, `ekranlar/kamera-goruntusu.md`, `gezginci/`

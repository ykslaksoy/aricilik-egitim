# Kamera görüntüsü ekranı — opsiyonel (iki kaynak)

**Durum:** calisiyor (demo)

İki kaynak da **var gibi**; takılı olana göre kovan detayında kart açılır.

| Kaynak | Bayrak | Yoksa |
|--------|--------|--------|
| Kovan üzeri (kapı) | `cameraPresent` | kart gizlenir |
| Ana (arılık) | `mainCameraPresent` / konum ana kamerası | kart gizlenir |
| İkisi de yok | — | kamera bloğu yok; kovan detay normal |

**UI:** Kovan detayında `renderCamera()` — snapshot, CV sayım, IR karşılaştırma, arılık analizi.

**Bağlı:** `sensorler/kamera.md`, `sensorler/ana-kamera.md`

# Başlangıç skoru ve grafik analiz

**Durum:** calisiyor

Petek Tarama onayından sonra kovanın skorlanabilir **tüm boyutları** başlangıç skoru olarak kaydedilir. Sensörler her okumada durumu revize eder; kayıtlar SQLite'ta saklanır; panelde **Grafik analiz** bölümünde gösterilir.

---

## Başlangıç skoru (baseline)

**Kaynak:** `POST .../petek-tarama/.../confirm`

**Kayıt:** `hive_baselines` tablosu (kovan başına 1 aktif)

| Boyut | Alan |
|-------|------|
| Tartı | `weightKg` |
| Koloni / sağlık / oğul / hastalık | `colonyScore`, `healthScore`, `swarmRiskScore`, … |
| Arı / bal | `beeEstimate`, `honeyKgEstimate`, `combKg` |
| Sensör skorları | `tempScore`, `humScore` |
| Derin skorlar | `deepHealth`, `deepSwarm` |
| Kalibrasyon | `calibrationScore`, `petekTaramaConfidence` |

---

## Sensör revizyonu

Her `POST /api/ingest`:

1. Güncel snapshot çıkarılır
2. Başlangıç skoru ile karşılaştırılır (`computeRevision`)
3. `hive_score_history` tablosuna yazılır

**API:** `GET /api/hives/:id/revision`

---

## Grafik analiz

**API:** `GET /api/hives/:id/trends?days=90`

**Seriler:** tartı, koloni skoru, sağlık, arı, bal, oğul riski

**Turuncu kesik çizgi:** Petek Tarama başlangıç değeri

DB boşsa demo geçmiş bellekten üretilir (`memory_fallback`).

---

## Kod

| Dosya | Rol |
|-------|-----|
| `hiveBaselineService.js` | Snapshot, revizyon, trend |
| `dbService.js` | `hive_baselines`, `hive_score_history` |
| `app.js` | Grafik analiz UI |

**Bağlı:** `kalibrasyon/petek-tarama.md`

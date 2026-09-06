# Sensör değerlendirme

**Durum:** calisiyor  
**Tek kaynak:** `packages/shared/constants.js`  
**Motor:** `colony.js` (skor) + `services/alertEngine.js` (uyarı)  
**API:** `GET /api/eval-config`

---

## Akış (kovan bazında)

```
15 dk ölçüm (kovan kartı)
    ↓
POST /api/ingest  veya  demo seed
    ↓
history[hiveId] + latest[hiveId]
    ↓
analyzeColony()     → koloni / sağlık / oğul / arı / yavru
    ↓
alertEngine         → sensör eşikleri → alerts[]
    ↓
buildTasks()        → görevler (Öncelik 1–5)
    ↓
UI liste + detay
```

Taşıma modunda (`transportMode: true`): oğul, arı katmanı, düşük IR **bastırılır** — titreşim / dengesizlik / arıza **açık** kalır.

---

## Sensör → eşik → çıktı

### Tartı (4× load cell)

| Okuma | Eşik | Değerlendirme |
|--------|------|----------------|
| `weightKg` | — | Arı tahmini, kg salınımı, oğul düşüşü |
| `cornerKg[4]` fark | ≥ **2 kg** | `imbalance` · Öncelik 2 |
| `weightKg` | ≤ 0 veya > **80 kg** | `sensor_fault` scale |
| 6 saat Δ | ≤ **−3 kg** | oğul `occurred` |
| 24 saat Δ | ≤ **−4 kg** | oğul `occurred` |

### Sıcaklık (DHT22 — kovan içi)

Ayrıntı: `sicaklik.md`

| Okuma | Eşik | Uyarı |
|--------|------|--------|
| `tempC` | ≤ **28°C** | `temp_low` |
| `tempC` | ≥ **38,5°C** | `temp_high` |
| İdeal (skor) | **32–36°C** | sağlık + |
| Skor | `colony.temperature.tempScore` | 0–100 |
| Trend | Δ6s ≥ ±1 °C | `temp_rise` / `temp_drop` |
| Arıza | < **−10°C** veya > **50°C** | `sensor_fault` temp |

Ayrıntılı neden / öneri: `sicaklik.md` · `analyzeTemperature()`

### Nem (DHT22 — kovan içi)

Ayrıntı: `nem.md` · `analyzeHumidity()`

| Okuma | Eşik | Uyarı |
|--------|------|--------|
| `humidity` | ≤ **32%** | `humidity_low` |
| `humidity` | ≥ **85%** | `humidity_high` |
| İdeal (skor) | **45–70%** | sağlık + |
| Skor | `colony.humidity.humScore` | 0–100 |
| Trend | Δ6s ≥ ±5 % | `humidity_rise` |
| Yoğuşma | nem yüksek + iç/dış ΔT | `condensationRisk` |
| Arıza | 255 veya saçma | `sensor_fault` humidity |

Ayrıntılı neden / öneri: `nem.md` · `evaluation.durumlar.nem`

### IR sayaç ×2

| Okuma | Eşik | Değerlendirme |
|--------|------|----------------|
| Öğlen (11–15) `beeOut` | — | Arı tahmini, koloni skoru |
| Öğlen `beeOut` | < **100** | `traffic_low` |
| Sürekli 0 + arıza bayrağı | — | `sensor_fault` ir |

### Mikrofon

| Okuma | Eşik | Uyarı |
|--------|------|--------|
| `audioRms` | ≤ **0,12** | `audio_low` |
| `audioRms` | ≥ **0,55** | `audio_high` |
| ≥ **0,52** + bozuk in/out + sağlık < 80 | — | ana kaybı şüphesi |

### Titreşim (ADXL345)

| Okuma | Eşik | Uyarı |
|--------|------|--------|
| `vibration` | ≥ **12** | `vibration` · taşımada açık |

### Pil / LoRa

| Okuma | Eşik | Uyarı |
|--------|------|--------|
| `battery` | < **20%** | `low_battery` |
| `rssi` | ≤ **−105 dBm** | `rssi_low` |

### Bağlantı

| Durum | Eşik | Uyarı |
|--------|------|--------|
| Son veri yaşı | > **2 saat** | `sensor_fault` offline |

---

## Skor eşikleri (`analyzeColony`)

| Alan | Eşik | Anlam |
|------|------|--------|
| `healthScore` | < **45** | `health_critical` |
| `score` | < **40** | kovan durumu `weak` |
| `beeEstimate` | < **18k** | zayıf · besleme adayı |
| `beeEstimate` | ≥ **45k** | koloni skoru + |
| Günlük kg salınımı | **0,4–2,5** ideal | > **4** kötü |
| Oğul risk | ≥ **75 / 50 / 28** | critical / elevated / watch |

Arı katmanları: **35k → 40k → 45k → 48k → 55k+** (`BEE_SWARM_TIERS`).

---

## Besleme / hava / yavru (görev)

| Tür | Tetik |
|-----|--------|
| `feeding` | tartı < **24 kg**, skor < **40**, arı < **18k**, düşük iç sıcaklık |
| `weather_frost` | dış ≤ **5°C** |
| `weather_storm` | rüzgâr ≥ **40 km/s** |
| Yavru çıkışı | 21 gün eğilim ≥ **0,35 kg**, salınım ≤ **4,5 kg** |

---

## Dosyalar

| Dosya | Rol |
|-------|-----|
| `packages/shared/constants.js` | Tüm eşikler |
| `apps/api/src/colony.js` | Skor + arı + oğul + yavru |
| `apps/api/src/services/alertEngine.js` | Uyarı üretimi |
| `apps/api/src/services/transportMode.js` | Taşımada bastırma |
| `apps/api/src/server.js` | Görevler, hava, besleme, API |

**Bağlı:** `skorlar/liste.md` · `alarmlar/sensor-arizasi.md` · `gezginci/tasima-kurallari.md`

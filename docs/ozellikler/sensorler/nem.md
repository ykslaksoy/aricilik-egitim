# Nem (DHT22 — kovan içi)

**Durum:** calisiyor (demo)  
**Donanım:** DHT22 · kovan kutusu içi, üst bölge  
**Veri:** `humidity` (% RH)  
**Eşikler:** `packages/shared/constants.js` → `SENSOR.HUM_*`, `HUM.*`  
**Değerlendirme:** `analyzeHumidity()` · `evaluation.durumlar.nem` · `alertEngine.js`

Kovan **iç** bağıl nemi ölçer. Konum havasındaki nem (`weather.humidity`) ayrıdır.

---

## Normal kaç olmalı?

| Aralık | % RH | Anlam |
|--------|------|--------|
| **İdeal** | **45 – 70** | Sağlık skoruna tam katkı |
| Düşük uyarı | ≤ **32** | `humidity_low` — kuru stres |
| Yüksek uyarı | ≥ **85** | `humidity_high` — chalkbrood / küf |
| Sensör arızası | 255 veya saçma | `sensor_fault` humidity |

**Bas al:** aktif sezonda çoğu sağlıklı kovan **%55 – 65** bandında.

---

## Derin analiz (`colony.humidity`)

| Alan | Anlam |
|------|--------|
| `humScore` | 0–100 nem skoru |
| `zone` | ideal · yuksek · dusuk · kritik_* |
| `trend` / `delta6hPct` | 6 saat nem değişimi |
| `condensationRisk` | Sıcaklık × nem yoğuşma riski |
| `disHumidityPct` | Dış hava nem karşılaştırması |
| `nedenler` / `oneriler` | Neden yükseldi/düştü + arıcı aksiyonu |
| `ariciya` | Tek cümle özet |
| `uyari` | `humidity_high` / `humidity_low` / `humidity_rise` |

**Demo kovan:** 21 (yüksek nem), 12 (düşük nem)

**Bağlı:** `sicaklik.md` · `skorlar/hastalik-riski.md` · `sensor-fusion.md`

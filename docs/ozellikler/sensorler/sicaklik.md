# Sıcaklık (DHT22 — kovan içi)

**Durum:** calisiyor  
**Donanım:** DHT22 · kovan kutusu içi, üst bölge  
**Veri:** `tempC`  
**Kod:** `analyzeTemperature()` · `colony.temperature`  
**Durum boyutu:** `evaluation.durumlar.sicaklik`  
**Eşikler:** `packages/shared/constants.js` → `SENSOR.TEMP_*` · `TEMP.*`

Kovan **iç** sıcaklığı ölçer. Dış hava (`weather.tempC`) ayrıdır — trend ve neden analizinde birlikte kullanılır.

---

## Normal kaç derece?

| Aralık | °C | Bölge (`zone`) |
|--------|-----|----------------|
| **İdeal** | **32 – 36** | `ideal` |
| Kabul edilebilir | 30 – 38 (ideal dışı) | `kabul` |
| Düşük uyarı | < **32** (≤28 kritik) | `dusuk` / `kritik_dusuk` |
| Yüksek uyarı | > **36** (≥38,5 kritik) | `yuksek` / `kritik_yuksek` |

**Bas al:** aktif kolonide **~34 °C**. Demo “iyi” kovanlar 33–35 °C.

---

## Sıcaklık skoru (`tempScore` 0–100)

| Bölge | Skor |
|-------|------|
| İdeal (32–36) | ~95 |
| Kabul | ~78 |
| Yüksek / düşük | ~52 |
| Kritik | ~25 |

Trend cezası: yükselirken >35 °C veya düşerken <30 °C → −10 puan.

---

## Trend

| Δ6 saat | Trend |
|---------|--------|
| ≥ **+1,0 °C** | `yukseliyor` |
| ≤ **−1,0 °C** | `dusuyor` |
| arada | `stabil` |

24 saat eşikleri: **+1,8 / −1,8 °C** (`TEMP.DELTA_RISE_24H_C` / `DELTA_DROP_24H_C`).

---

## Neden arttı? (arıcıya ne diyoruz)

| Neden | Ne zaman |
|-------|----------|
| **Dış hava sıcak** | Dış ≥32 °C — kovan ısınıyor |
| **Yavru çıkışı aktif** | Yaz büyümesi — koloni ısı üretiyor |
| **Yoğun uçuş** | Öğlen trafik yüksek |
| **Kalabalık koloni** | Tahmini ≥45k arı |
| **Nem + sıcaklık** | Havalandırma yetersiz olabilir |
| **Genel artış** | Son 6 saatte +Δ — güneş / aktivite |

**Öneriler:** gölge, üst havalandırma, öğleden sonra açmama.

**Uyarı:** `temp_high` (Öncelik 1–2) · `temp_rise` (Öncelik 3, >36 °C ve yükseliyor)

---

## Neden düştü?

| Neden | Ne zaman |
|-------|----------|
| **Dış hava soğuk** | Dış ≤5 °C — ısı kaybı |
| **Zayıf koloni** | Arı <18k — ısıyı tutamıyor |
| **Düşük aktivite** | Öğlen trafik zayıf |
| **Ana şüpheli** | Yavru azalınca ısı düşer |
| **Gece** | Hafif düşüş normal olabilir |
| **Genel düşüş** | Soğuk veya zayıflama |

**Öneriler:** yalıtım, besleme, ana/yavru kontrolü.

**Uyarı:** `temp_low` (Öncelik 1–2) · `temp_drop` (Öncelik 3, <32 °C ve düşüyor)

---

## API örneği (`colony.temperature`)

```json
{
  "tempScore": 25,
  "tempLabel": "Çok yüksek",
  "zone": "kritik_yuksek",
  "trend": "yukseliyor",
  "trendLabel": "Yükseliyor",
  "tempC": 39.8,
  "delta6hC": 1.4,
  "disTempC": 27,
  "nedenler": [
    { "key": "dis_sicak", "label": "Dış hava sıcak (27°C) — kovan ısınıyor", "tip": "artis" }
  ],
  "oneriler": ["Gölge ver; üst havalandırmayı aç; öğleden sonra açma."],
  "ariciya": "39.8°C — Çok yüksek · Yükseliyor (+1.4°C / 6 saat) · dış 27°C. Dış hava sıcak…",
  "uyari": { "type": "temp_high", "priority": 1, "title": "Aşırı sıcak — gölge / havalandır", "message": "…" }
}
```

---

## Demo kovanlar

| Kovan | Senaryo |
|-------|---------|
| **11** | Düşük + düşüş trendi |
| **20** | Çok yüksek + yükseliş |
| **3–5** | İdeal band, stabil |

**Bağlı:** `nem.md` · `degerlendirme.md` · `skorlar/kovan-durumlari.md`

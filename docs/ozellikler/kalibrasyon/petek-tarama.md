# Kovan Petek Tarama

**Durum:** calisiyor (API + sihirbaz UI)  
**Amaç:** Telefon kamerası ile rehberli petek aralığı taraması → AI arı / bal kalibrasyonu  
**Kovan kamerasından fark:** Tek seferlik muayene; sürekli giriş trafiği değil.

---

## Akış

1. **Boş ağırlık (tareKg)** — platform + boş kovan
2. **Dolu tartı (weightKg)** — kapak **kapalıyken**
3. **Petek tarama** — 10 aralık × sol + sağ (20 segment, ~3 sn/segment)
4. **Ses** — tarama boyunca koloni uğultusu
5. **Analiz** — AI birleştirme
6. **Onay** — `referenceBeeCount`, `combKg` kaydı → başlangıç koloni skoru

UI: `/petek-tarama.html?hiveId=1`

---

## Petek haritası

| Aralık | Sol çekim | Sağ çekim |
|--------|-----------|-----------|
| 1 … 10 | ✓ / ↻ / · | ✓ / ↻ / · |

- **✓** kabul  
- **↻** tekrar çek  
- **·** bekliyor  

Harita 20/20 olmadan analiz çalışmaz.

---

## Kalite kapısı (segment)

İstemci her segment için metrik gönderir (0–1):

| Metrik | Eşik | Anlam |
|--------|------|--------|
| `blur` | ≥ 0,52 | Keskinlik |
| `brightness` | 0,22 – 0,96 | Aydınlık |
| `motion` | ≤ 0,38 | Sabitlik |
| `framing` | ≥ 0,58 | Petek aralığı kadrajda |

Red → aynı aralık tekrar.

---

## Hesap

```
netKg = weightKg − tareKg
arı_kg = referenceBeeCount × 0,0001
combKg = netKg − arı_kg
bal_kg ≈ combKg − waxKgEstimate
```

AI segment yoğunluklarını birleştirir; tartı üst sınır kontrolü uygulanır.

---

## API spec

### `GET /api/petek-tarama/spec`

Özet ve endpoint listesi.

### `POST /api/hives/:id/petek-tarama/session`

Oturum başlat.

**Body:**
```json
{
  "tareKg": 8,
  "weightKg": 42.3
}
```

**201:**
```json
{
  "session": {
    "sessionId": "uuid",
    "hiveId": 1,
    "status": "scanning",
    "tareKg": 8,
    "weightKg": 42.3,
    "progress": { "done": 0, "total": 20, "percent": 0, "complete": false, "cells": [] }
  }
}
```

### `GET /api/hives/:id/petek-tarama/session/:sessionId`

Oturum durumu + harita.

### `POST /api/hives/:id/petek-tarama/session/:sessionId/segment`

Segment yükle.

**Body:**
```json
{
  "gap": 4,
  "side": "left",
  "durationSec": 3,
  "quality": { "blur": 0.72, "brightness": 0.58, "motion": 0.12, "framing": 0.75 },
  "previewBase64": "data:image/jpeg;base64,..."
}
```

**200:**
```json
{
  "accepted": true,
  "qualityScore": 88,
  "progress": { "done": 8, "total": 20, "percent": 40, "complete": false },
  "ariciya": "Aralık 4 sol — kabul edildi"
}
```

### `POST .../audio`

```json
{ "durationSec": 45, "rms": 0.34, "peak": 0.62 }
```

### `POST .../analyze`

Harita tamamsa AI analiz.

**200:**
```json
{
  "analysis": {
    "referenceBeeCount": 38500,
    "referenceBeeCountMin": 34650,
    "referenceBeeCountMax": 42350,
    "beeKg": 3.9,
    "combKg": 16.4,
    "honeyKgEstimate": 14.6,
    "waxKgEstimate": 1.8,
    "confidence": 91,
    "colonyScore": 74,
    "strengthLabel": "Güçlü",
    "mapQualityScore": 87,
    "audio": { "ariciya": "Koloni uğultusu normal" },
    "ariciya": "Petek taraması: ~38.500 arı, ~14,6 kg bal · güven %91"
  }
}
```

### `POST .../confirm`

Kalibrasyonu kovana yaz.

**Body (opsiyonel düzeltme):**
```json
{ "referenceBeeCount": 38000, "combKg": 16.5 }
```

**200:** `{ "ok": true, "config": { ... }, "colony": { ... } }`

---

## Kod

| Dosya | Rol |
|-------|-----|
| `packages/shared/petekTaramaConstants.js` | Sabitler |
| `services/petekTaramaService.js` | Oturum + harita |
| `services/calibrationVisionService.js` | AI / kalite |
| `apps/web/petek-tarama.html` | Sihirbaz |
| `apps/web/petek-tarama.js` | Kamera + UI |

---

## Bağlı

- `kalibrasyon/tare-ve-petek.md`
- `kalibrasyon/petek-silkme.md` — ince ayar (plan)
- `ekranlar/kalibrasyon.md`

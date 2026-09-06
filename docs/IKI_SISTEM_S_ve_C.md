# beepack — İki Sistem: Kamerasız + Kameralı

Aynı arılıkta **iki paket** satılır / kurulur; altyapı **mümkün olduğunca ortak**.

---

## Paket karşılaştırma

| | **beepack s** (kamerasız) | **beepack c** (kameralı) |
|--|---------------------------|---------------------------|
| tartı (4× load cell) | ✓ | ✓ |
| sıcaklık / nem | ✓ | ✓ |
| ir (2 kanal, beeIn/Out) | ✓ | ✓ |
| mikrofon | ✓ | ✓ |
| titreşim (ADXL345) | ✓ | ✓ |
| kapı / PTZ kamera | — | ✓ |
| gps / eğim | — | — |
| LoRa → merkez | ✓ | ✓ |
| WiFi HUB gerekir | hayır | evet (~25–30 kovan/HUB) |
| NODE kart | T-Weigh | T-Weigh (aynı) |
| kovan başı maliyet (hedef) | ~3.400–3.800 ₺ | ~5.000–7.000 ₺ |

sensör detayı: `SENSOR_PAKETI.md`

---

## Mimari (tek arılık, iki paket birlikte)

```
                    ┌─────────────────────────────────┐
                    │  GATE (1–2 adet)                 │
                    │  LoRa alıcı + 4G + kendi SIM     │
                    └────────────▲───────────▲────────┘
                                 │           │
              LoRa (tüm kovanlar)│           │ Ethernet / WiFi
                                 │           │
     ┌───────────┬───────────────┴───┐   ┌───┴──────────────┐
     │ NODE      │ NODE              │   │ HUB (AP)         │
     │ beepack S │ beepack S         │   │ sadece C paketi  │
     │ tartı+TH  │ tartı+TH          │   └───▲──────────────┘
     └───────────┘                   │       │ WiFi
                                     │   ┌───┴───┐
                                     │   │ Kamera│ beepack C
                                     │   │ + NODE│ (tartı+TH aynı)
                                     │   └───────┘
```

**Önemli:** Kameralı kovan da **tartı için LoRa NODE** taşır; kamera **WiFi → HUB** gider. Tartı verisi HUB’dan geçmez.

---

## Kapasite (100 kovana kadar)

### Kamerasız (S) — sadece LoRa

| GATE | Kovan (S) |
|------|-----------|
| 1 | ~50–100 (10–15 dk paket aralığı) |
| 2 | 100+ veya iki ayrı arılık (Yanıkdağ / Tortum) |

**HUB gerekmez.**

### Kameralı (C) — LoRa + WiFi kamera

| HUB (WiFi AP) | Kovan (C) | GATE |
|---------------|-----------|------|
| 1 HUB | ~25–30 | 1 GATE yeter (veri az) |
| 4 HUB | ~100 kamera | 1–2 GATE (stream yükü artar) |

**Karışık arılık örneği (100 kovan toplam):**

| Paket | Adet | Altyapı |
|-------|------|---------|
| beepack S | 70 | LoRa → GATE |
| beepack C | 30 | LoRa → GATE + 30 kamera → **1–2 HUB** → GATE |
| **GATE** | 1–2 | Ortak |
| **HUB** | 1–2 | Sadece C için |

---

## Prototip sırası (iki sistem)

| Aşama | Ne kurarsın | Amaç |
|-------|-------------|------|
| **1** | 1× S (kamerasız NODE) | Tartı, firmware, panel |
| **2** | 1× GATE | LoRa + 4G |
| **3** | 1× C (NODE + 1 kamera + 1 mini HUB/AP) | Kamera yolu test |
| **4** | 5 S + 2 C | Karışık arılık pilot |
| **5** | Ölçek | Müşteriye S veya C sat |

**İlk alım (daha önce konuştuğun):** sadece **S paketi ~3.400 ₺**.  
**C paketi:** NODE zaten var; **+ kamera (~1.500–3.000 ₺) + HUB/AP (~500–1.500 ₺)** sonra.

---

## Yazılım / panel

| Paket | Panelde |
|-------|---------|
| S | # · kg · °C · nem · durum (şimdiki sade liste) |
| C | Aynı + **“Canlı / son görüntü”** (kamera URL veya thumbnail) |

Aynı API; `hiveId` + opsiyonel `cameraUrl` alanı.

---

## Satış mesajı (kısa)

- **beepack S:** “Tortum’dan tartı ve kovan sağlığı — aylık koloni paketi.”
- **beepack C:** “S + kapı kamerası / arı trafiği görüntüsü.”

---

## Donanım özeti

| Bileşen | S paketi | C paketi | Ortak |
|---------|----------|----------|-------|
| T-Weigh + load cell + DHT22 + güneş | ✓ | ✓ | NODE aynı |
| T-Beam + A7670E GATE | paylaşımlı | paylaşımlı | 1 GATE tüm arılık |
| WiFi kamera | — | ✓ | |
| HUB (AP) | — | ✓ | C kovanları grupla |
| T-U2T | ✓ (bir kez) | ✓ | |

*Alım aşamaları: `ALIM_ASAMA1_ASAMA2.md` · 100 kovan: `TEST_PLAN_100_KOVAN.md`*

# beepack — hangi kart, nasıl veri gider?

**karar:** klasik Arduino Uno/Nano **yeterli değil**.  
kovan NODE = **LilyGO T-Weigh (ESP32)** — tüm sensörleri okur, LoRa ile GATE’e paket atar.

---

## neden Arduino değil?

| | Arduino Uno/Nano | **T-Weigh (ESP32)** |
|--|------------------|---------------------|
| 4× tartı (HX711) | harici kart + kablo karmaşası | **4× HX711 yerleşik** |
| LoRa (uzaktan arılık) | ek LoRa shield | **LoRa 868 yerleşik** |
| WiFi (test / kalibrasyon) | yok (Uno) | **var** |
| I2C (ADXL345, mic) | var | var |
| dijital IR ×2 | var | var |
| pil / güneş | ek tasarım | kolay |
| tek kutu maliyet | parçalı, pahalı | **tek kart ~900 ₺** |

Arduino ile yapılır ama **4 tartı + LoRa + WiFi** için 3–4 ek kart gerekir → T-Weigh zaten hepsi bir arada.

---

## mimari (tek bakışta)

```
KOVAN (NODE)                         MERKEZ                    BULUT
┌─────────────────────┐              ┌──────────┐              ┌─────────┐
│ LilyGO T-Weigh      │   LoRa 868   │ T-Beam   │   4G/HTTPS  │ koloni  │
│ ESP32               │ ───────────► │ + A7670E │ ──────────► │ API     │
│ 4× HX711 + LoRa     │   küçük JSON │ GATE     │             │ panel   │
│ + DHT22             │              └──────────┘             └─────────┘
│ + IR×2 + ADXL + mic │
└─────────────────────┘

beepack c kamera (ayrı):
  kamera ──WiFi──► HUB ──► GATE / internet
  (video T-Weigh üzerinden gitmez)
```

---

## NODE ne okur, ne gönderir?

| sensör | bağlantı | LoRa’ya ne gider |
|--------|----------|------------------|
| 4× load cell | HX711 (kartta) | `weightKg` + isteğe `cornerKg[4]` |
| DHT22 | 1-wire / GPIO | `tempC`, `humidity` |
| IR ×2 | GPIO kesme | `beeIn`, `beeOut` (15 dk sayaç) |
| ADXL345 | I2C | `vibration` (tepe / olay sayısı) |
| mikrofon | ADC / I2S | `audioRms` veya bant özeti — **ham ses değil** |
| pil | ADC | `battery` |

**LoRa küçük paket** (yüzlerce byte). ham mikrofon / video **gönderilmez** — sadece özet sayı.

periyot: **10–15 dakika** bir paket (pil dostu). IR sayaçlar arka planda kesme ile birikir.

---

## kart rolleri

| kart | rol | adet |
|------|-----|------|
| **T-Weigh** | her kovan NODE | 1 / kovan |
| **T-U2T** | program yükleme | 1 (atölyede) |
| **T-Beam + A7670E** | GATE: LoRa al + 4G gönder | 1 / arılık |
| **WiFi HUB** | sadece kamera (c) | 1 / ~25–30 kamera |
| ESP32-CAM / IP cam | kapı görüntüsü | 1 / c kovan |

---

## yazılım katmanları

| katman | ne |
|--------|-----|
| **firmware (NODE)** | sensör oku → JSON/LoRa paket |
| **firmware (GATE)** | LoRa dinle → HTTPS `POST /api/ingest` |
| **koloni API** | skor, oğul, arı, alarm, abonelik |
| **panel / app** | arıcı ekranı + gezginci modu |

Arduino IDE veya PlatformIO ile T-Weigh’e yazılır (ESP32 board).  
“Arduino” kelimesi burada **yazılım ortamı** olabilir; kart olarak Uno değil.

---

## test sırası

1. **USB / WiFi:** T-Weigh → doğrudan `POST /api/ingest` (GATE yok)  
2. sensörleri tek tek doğrula (tartı → th → ir → adxl → mic)  
3. **GATE:** LoRa yolu  
4. kamera (c) ayrı hat  

---

## özet

> **tek kart:** LilyGO **T-Weigh** = tartı + LoRa + ESP32  
> **ekle:** DHT22, IR×2, ADXL345, mic  
> **gönder:** LoRa → GATE → 4G → koloni  
> **kamera ayrı** (WiFi HUB)  
> **Arduino Uno ile tüm sistemi kurmak zoruna değil** — T-Weigh doğru seçim

alım: `ALIM_ASAMA1_ASAMA2.md` · sensör: `SENSOR_PAKETI.md`

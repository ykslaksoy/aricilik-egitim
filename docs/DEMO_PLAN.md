# Hive Demo Planı — Yazılımı bunun üzerine kur

## Amaç
1 kovanlık **çalışan demo**: tartı + sıcaklık/nem + (opsiyonel) IR sayaç → ekranda canlı veri.  
Donanım gelmeden önce **mock API** ile uygulama yazılır; kart gelince aynı API’ye gerçek veri bağlanır.

---

## Faz 0 — Yazılım (şimdi, donanımsız)

| Ne | Durum |
|----|--------|
| Mock API (`/api/hives`) | Bu repoda |
| Web panel (liste + detay + alarm) | Bu repoda |
| Veri modeli (JSON şema) | Sabit — firmware aynı formatı kullanır |

**Çalıştır:** kökten `npm install && npm run dev`

---

## Faz 1 — Donanım demo (1 kovan)

Sipariş listesi (~2.000–2.500 TL):

| Parça | Adet |
|-------|------|
| LilyGO T-Weigh 868 MHz | 1 |
| T-U2T programlayıcı | 1 |
| 50 kg load cell | 4 |
| BME280 | 1 |
| 18650 + BMS + TP4056 | 1 |
| 1 W güneş paneli | 1 |
| IP65 kutu + platform | 1 |
| IR sayaç (opsiyonel) | 1 |

İlk hafta: **USB seri / WiFi** ile laptop’a veri (LoRa gateway sonra).

---

## Faz 2 — Merkez (GATE)

| Parça | Adet |
|-------|------|
| LoRa gateway + A7670E 4G | 1 |
| 20 W güneş + akü | 1 |
| SIM | 1 |

Kovan → LoRa → GATE → MQTT/HTTPS → API → App

---

## Yazılım ekranları (MVP)

1. **Giriş** — açık kayıt (BeeTrack’ten fark)
2. **Arılık özeti** — kovan sayısı, alarm, ortalama ağırlık
3. **Kovan listesi** — #id, kg, °C, %, arı trafiği, durum
4. **Kovan detay** — grafik (24s), son değerler, “foto iste” (sonra)
5. **Alarmlar** — oğul / ağırlık düşüşü / düşük pil

---

## Veri paketi (LoRa / API ortak)

```json
{
  "hiveId": 14,
  "weightKg": 32.4,
  "tempC": 34.2,
  "humidity": 62,
  "beeIn": 120,
  "beeOut": 115,
  "battery": 87,
  "ts": "2026-08-31T12:00:00Z"
}
```

Firmware, GATE ve App **aynı JSON** konuşur.

---

## Bilinçli olarak demo dışı (sonra)

- 4 HUB / 100 kovan
- PTZ
- Kapı WiFi kamera stream
- Bal haritası
- iOS native (önce Web + PWA veya React Native)

---

## Başarı kriteri (demo hazır)

- [ ] Web’de 1–3 mock kovan görünüyor
- [ ] Ağırlık/sıcaklık grafiği çiziliyor
- [ ] Alarm kartı çalışıyor
- [ ] T-Weigh USB’den aynı JSON’u API’ye POST edebiliyorsun
- [ ] Telefonda tarayıcıdan açılıyor (responsive)

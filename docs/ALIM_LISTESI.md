# beepack — 1 Prototip Alım Listesi (özet)

**Amaç:** 1 kovan NODE + 1 GATE merkez istasyonu (Yanıkdağ / Tortum saha testi)  
**Tarih:** 31 Ağustos 2026  
**Not:** Fiyatlar KDV dahil, stok anlık durumuna göre değişebilir. Kargo ayrı.

> **Detaylı liste (satır satır, stok kodları, bağlantı tabloları, sepet listeleri):**  
> [`ALIM_LISTESI_DETAY.md`](./ALIM_LISTESI_DETAY.md)

---

## Özet tablo

| Paket | Tahmini toplam |
|-------|----------------|
| **A — NODE (1 kovan)** | **~3.200 – 3.800 ₺** |
| **B — GATE (merkez)** | **~5.500 – 7.500 ₺** |
| **C — Atölye / sarf** | **~300 – 600 ₺** |
| **D — Platform (ahşap/alüminyum)** | **~250 – 500 ₺** |
| **Prototip toplam (A+B+C+D)** | **~9.250 – 12.400 ₺** |

> BeeTrack / Ermiş tek kovan referans: 15.000–20.000 ₺ (modemli hazır tartı). Bu liste kendi NODE+GATE sisteminiz için parça parça alım rehberidir.

---

## A — NODE: 1 kovan sensör ünitesi

### A1. Ana kart ve programlama

| # | Parça | Adet | Birim (KDV dahil) | Toplam | Nereden | Link |
|---|-------|------|-------------------|--------|---------|------|
| 1 | **LilyGO T-Weigh 868 MHz** (4 kanal HX711 + LoRa SX1262 + ESP32) | 1 | ~750 – 1.050 ₺ | ~900 ₺ | LilyGO resmi / OpenELAB / Mauser | [lilygo.cc/products/t-weigh](https://lilygo.cc/products/t-weigh) · [openelab.io](https://openelab.io/products/lilygo-t-weigh-lora-sx1262) |
| 2 | **T-U2T USB-TTL programlayıcı** (CH9102, zorunlu) | 1 | 806,40 ₺ | 806,40 ₺ | F1Depo | [f1depo.com/urun/t-u2t-usb](https://www.f1depo.com/urun/t-u2t-usb) |

**T-Weigh notu:** Türkiye'de (Robiz, Direnc, F1Depo) doğrudan stok nadir. Resmi sitede ~$21; kargo + gümrük ile ~900 ₺ bandı. **868 MHz** versiyonu seçin (915 değil). Anten kartla gelir.

---

### A2. Tartı — 4×50 kg load cell

| # | Parça | Adet | Birim (KDV dahil) | Toplam | Nereden | Link |
|---|-------|------|-------------------|--------|---------|------|
| 3 | **50 kg load cell** (yarı köprü, HX711 uyumlu) | 4 | 43,68 ₺ | **174,72 ₺** | Robiz | [robiz.net/loadcell50kg](https://robiz.net/loadcell50kg) |

4 hücre köşelere monte edilir → tam köprü → **200 kg kapasite** (kovan + süper + bal yeterli).

---

### A3. Sıcaklık / nem sensörü

| # | Parça | Adet | Birim (KDV dahil) | Toplam | Nereden | Link |
|---|-------|------|-------------------|--------|---------|------|
| 4a | **BME280** (sıcaklık + nem + basınç, I2C) — tercih | 1 | 316,80 ₺ | 316,80 ₺ | Robiz | [robiz.net — BME280](https://robiz.net/index.php?route=product/search&search=BME280) ⚠️ **Stok dışı** |
| 4b | **DHT22 (AM2302)** — alternatif | 1 | 114,00 ₺ | 114,00 ₺ | Robo90 | [robo90.com/dht22](https://www.robo90.com/dht22-sicaklik-ve-nem-algilama-sensoru) |

**Öneri:** BME280 gelene kadar DHT22 ile başlayın; firmware'de ikisi de desteklenebilir.

---

### A4. Güneş + pil sistemi

| # | Parça | Adet | Birim (KDV dahil) | Toplam | Nereden | Link |
|---|-------|------|-------------------|--------|---------|------|
| 5 | **6V güneş paneli 150 mA** (~0,9 W) | 1 | 174,87 ₺ | 174,87 ₺ | Robotistan | [robotistan.com/6-v-125ma-gunes-pili-solar-panel](https://www.robotistan.com/6-v-125ma-gunes-pili-solar-panel) |
| 6 | **CN3065** güneş/Li-ion şarj modülü (1S, 0,5 A) | 1 | 86,40 ₺ | 86,40 ₺ | Robiz | [robiz.net/cn3065](https://robiz.net/cn3065) |
| 7 | **1S BMS koruma kartı** (3 A, pil şarj etmez) | 1 | 17,28 ₺ | 17,28 ₺ | Robiz | [robiz.net/battery](https://robiz.net/battery) — "1S 3A BMS" |
| 8 | **18650 Li-ion 3200 mAh** (kutupsuz) | 1 | 182,70 ₺ | 182,70 ₺ | Robotistan | [robotistan.com/orion-18650-3200mah](https://www.robotistan.com/orion-18650-3-7v-3200mah-2c-liion-sarjli-pil-kutup-bassiz) |
| 9 | **18650 tekli pil yuvası** | 1 | ~25 – 63 ₺ | ~30 ₺ | Robotistan | [robotistan.com — pil yuvası](https://www.robotistan.com/18650-pil-icin-4lu-pil-yuvasi-pil-yatagi) (tekli model) |

**Alt toplam A4:** ~491 ₺

---

### A5. Kutu ve bağlantı

| # | Parça | Adet | Birim (KDV dahil) | Toplam | Nereden | Link |
|---|-------|------|-------------------|--------|---------|------|
| 10 | **IP65 plastik kutu 83×58×33 mm** | 1 | 100,80 ₺ | 100,80 ₺ | Robiz | [robiz.net/83x58x33waterproofbox](https://robiz.net/83x58x33waterproofbox) |
| 11 | Dupont kablo seti (M-M, M-F) | 1 | ~40 – 80 ₺ | ~60 ₺ | Robiz / Robotistan | — |
| 12 | JST PH2.0 kablo (CN3065 ↔ panel) | 1 | ~15 – 30 ₺ | ~20 ₺ | Robiz | CN3065 sayfasında uyumlu |
| 13 | Load cell kablo (4×3 telli, ~30 cm) | 4 | ~10 ₺ | ~40 ₺ | Robiz veya el yapımı | — |

---

### A6. NODE alt toplam

| Grup | Toplam (KDV dahil) |
|------|---------------------|
| A1 Kart + programlayıcı | ~1.706 ₺ |
| A2 Load cell ×4 | ~175 ₺ |
| A3 Sensör (DHT22) | ~114 ₺ |
| A4 Güneş + pil | ~491 ₺ |
| A5 Kutu + kablo | ~221 ₺ |
| **NODE toplam** | **~2.707 ₺** (+ kargo, T-Weigh ithalat) |

T-Weigh ithalat dahil gerçekçi NODE: **~3.200 – 3.800 ₺**

---

## B — GATE: Merkez istasyon (LoRa → 4G → API)

| # | Parça | Adet | Birim (KDV dahil) | Toplam | Nereden | Link |
|---|-------|------|-------------------|--------|---------|------|
| 14 | **TTGO T-Beam V1.2** (LoRa 868 + GPS + ESP32) | 1 | 2.954,98 ₺ | 2.954,98 ₺ | Direnc.net | [direnc.net/ttgo-t-beam-v12](https://www.direnc.net/ttgo-t-beam-v11-esp32-lora-sx1262-wifi-bluetooth-868mhz-gnss-neo-6m-gps-gelistirme-modulu) |
| 15 | **A7670E 4G/LTE + GPS modül** (IMEI kayıtlı) | 1 | 1.887,27 ₺ | 1.887,27 ₺ | Direnc.net | [direnc.net/a7670e-gsm-gps-modulu](https://www.direnc.net/a7670e-gsm-gps-modulu-ve-ltegnss-anten) |
| 16 | **Güneş paneli 6V 500 mA** (~3 W) | 1 | 632,36 ₺ | 632,36 ₺ | Robotistan | [robotistan.com/6v-500ma-solar-panel](https://www.robotistan.com/6v-500ma-solar-panel-gunes-pili) |
| 17 | **18650 ×2 + 2S BMS veya 12V akü** | 1 set | ~400 – 800 ₺ | ~600 ₺ | Robotistan / yerel | Gece veri aktarımı için |
| 18 | **IP65 büyük kutu** (T-Beam + modem) | 1 | ~150 – 350 ₺ | ~250 ₺ | Robiz | [robiz.net/plastics](https://robiz.net/plastics) — 171×121×55 mm vb. |
| 19 | **SIM kart (data)** | 1 | ~150 – 300 ₺/ay | ilk ay ~200 ₺ | Turkcell / TT / Vodafone | M2M/IoT paketi |
| 20 | T-U2T (GATE firmware yükleme) | 1 | — | 0 ₺ | A1'de alındı | Paylaşımlı |

**GATE alt toplam:** ~**5.525 – 6.525 ₺** (SIM ilk ay dahil)

> Alternatif: T-Beam yerine **ESP32 + SX1262 gateway shield** daha ucuz olabilir; prototipte T-Beam hazır GPS+LoRa+WiFi verir, geliştirme hızlanır.

---

## C — Atölye / sarf (ilk montaj)

| # | Parça | Adet | Tahmini | Nereden |
|---|-------|------|---------|---------|
| 21 | Lehim + flux + ısı bandı | 1 set | ~80 – 150 ₺ | Hırdavat / Robiz |
| 22 | M3 vida + somun seti | 1 | ~30 ₺ | Hırdavat |
| 23 | Silikon contası (kutu geçişleri) | 1 | ~40 ₺ | Yapı market |
| 24 | USB-C / micro kablo (test) | 1 | ~50 ₺ | Robotistan |
| 25 | Multimetre (varsa atla) | 1 | ~200 – 400 ₺ | Robotistan |

---

## D — Tartı platformu (kovan altı)

| # | Parça | Adet | Tahmini | Nereden |
|---|-------|------|---------|---------|
| 26 | **Kontrplak / alüminyum profil** (kovan tabanı ~50×40 cm) | 1 | ~150 – 300 ₺ | Yerel marangoz / Bauhaus |
| 27 | **4 ayak + load cell montaj plakası** | 1 set | ~100 – 200 ₺ | El yapımı veya CNC |

Ermiş referans fiyat (hazır sistem): [ermisaricilik.com](https://ermisaricilik.com/urun/akilli-kovan-tarti-ve-izleme-sistemi-modemli) — **20.000 ₺** (modemli, Bluetooth, abonelik yok ama uzaktan izleme sınırlı).

---

## E — Opsiyonel (sonraki faz)

| Parça | Tahmini | Not |
|-------|---------|-----|
| IR arı sayaç (kapı) | ~200 – 500 ₺ | LoRa ile NODE'a bağlanır |
| WiFi PTZ kamera | ~1.500 – 4.000 ₺ | GATE üzerinden stream |
| 2. prototip NODE (3–5 pilot) | ×3–5 | A listesini çoğalt |

---

## Sipariş sırası (önerilen)

```
Hafta 1 — Yazılım + kart
  └─ T-Weigh (ithal) + T-U2T (F1Depo) → firmware USB test

Hafta 1–2 — Sensör + tartı
  └─ Robiz: load cell ×4, CN3065, BMS, kutu, kablo
  └─ Robo90: DHT22
  └─ Robotistan: güneş paneli + 18650

Hafta 2–3 — Platform
  └─ Yerel: ahşap/alüminyum platform montajı
  └─ Kalibrasyon (bilinen ağırlık ile)

Hafta 3–4 — GATE
  └─ Direnc: T-Beam + A7670E
  └─ LoRa ↔ HTTPS köprü yazılımı
  └─ SIM aktivasyon

Hafta 4+ — Saha
  └─ Yanıkdağ'da 1 kovan, Tortum'a taşınabilirlik testi
```

---

## Tek tedarikçiden toplu alım (kargo tasarrufu)

| Site | NODE parçaları | Tahmini kargo |
|------|----------------|---------------|
| **Robiz.net** | Load cell, CN3065, BMS, kutu, kablo | ~50 – 80 ₺ |
| **Robotistan.com** | Güneş paneli, 18650, pil yuvası | ~50 – 80 ₺ |
| **F1Depo.com** | T-U2T | ~40 – 60 ₺ |
| **Direnc.net** | T-Beam, A7670E (1500₺+ ücretsiz kargo) | 0 ₺ |
| **LilyGO / OpenELAB** | T-Weigh | ~150 – 400 ₺ (uluslararası) |

---

## Rakip fiyat karşılaştırması (referans)

| Sistem | 1 kovan donanım | Abonelik |
|--------|-----------------|----------|
| **Ermiş modemli tartı** | ~20.000 ₺ | Yok |
| **ARGEKİP B1 sensör** | ~6.000 – 7.100 ₺ + gateway 4.000 ₺ | Belirsiz |
| **BeeTrack** | ~5.500 ₺ (tahmin) + gateway ~12.000 ₺ | 150–200 ₺/kovan/ay |
| **beepack prototip (bu liste)** | ~9.000 – 12.000 ₺ (NODE+GATE) | **~49–149 ₺/kovan/ay** (taslak) |
| **beepack 100 kovan üretim** | ~200.000 – 280.000 ₺ (tahmin) | Pro / Kurumsal paket |

---

## Hızlı alışveriş checklist

- [ ] T-Weigh 868 MHz sipariş (LilyGO / OpenELAB)
- [ ] T-U2T — F1Depo
- [ ] 4× 50 kg load cell — Robiz
- [ ] DHT22 veya BME280 — Robo90 / Robiz
- [ ] CN3065 + 1S BMS + 18650 + güneş paneli — Robiz + Robotistan
- [ ] IP65 kutu 83×58×33 — Robiz
- [ ] T-Beam + A7670E — Direnc.net
- [ ] GATE güneş + akü + büyük kutu
- [ ] SIM kart (data paketi)
- [ ] Platform malzemesi (yerel)

---

*Bu liste `hive-demo/docs/DEMO_PLAN.md` faz 1–2 ile uyumludur. Firmware hazır olunca T-Weigh → `POST /api/ingest` ile panelde canlı veri görünür.*

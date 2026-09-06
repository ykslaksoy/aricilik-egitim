# beepack — 1 Adet Prototip Detaylı Alım Listesi

**Kapsam:** 1 kovan **NODE** + 1 **GATE** merkez istasyonu (tam saha testi)  
**Tarih:** 31 Ağustos 2026  
**Para birimi:** TL, **KDV dahil** (aksi belirtilmedikçe)

Bu liste “1 adet sistem” için **satın alınacak her parçayı** satır numarası, stok kodu, teknik özellik, bağlantı notu ve tedarikçi linkiyle verir.

---

## 1. Genel özet

| Bölüm | Kalem sayısı | Tutar |
|-------|--------------|-------|
| NODE — elektronik | 22 kalem | **~3.050 ₺** |
| NODE — tartı platformu | 12 kalem | **~380 ₺** |
| GATE — elektronik | 14 kalem | **~5.590 ₺** |
| Montaj / sarf / test | 15 kalem | **~520 ₺** |
| **TOPLAM (1 adet sistem)** | **~63 kalem** | **~9.540 ₺** |
| + Uluslararası kargo (T-Weigh) | — | **~150 – 400 ₺** |
| + Yurtiçi kargo (4–5 sipariş) | — | **~200 – 350 ₺** |
| **Gerçekçi toplam** | — | **~9.900 – 10.300 ₺** |

---

## 2. Tedarikçi sepetleri (kopyala-yapıştır sipariş)

### Sepet A — LilyGO (uluslararası) · ~900 ₺ + kargo

| Satır | Ürün | Adet | Fiyat | Link / not |
|-------|------|------|-------|------------|
| A1 | **T-Weigh 868 MHz** [H522] | 1 | ~$21 ≈ **850 ₺** | [lilygo.cc/products/t-weigh](https://lilygo.cc/products/t-weigh) |
| | Paket içi: 1× T-Weigh kart, 1× 868 MHz IPEX anten | | | **915 MHz almayın** |
| | Alternatif: OpenELAB ~28 € + kargo | 1 | ~**1.050 ₺** | [openelab.io](https://openelab.io/products/lilygo-t-weigh-lora-sx1262) |

**Sipariş notu:** Ödeme sonrası 7–25 gün. Gümrük vergisi çoğu siparişte ~0–150 ₺ bandında kalır.

---

### Sepet B — F1Depo · 806 ₺ + ~50 ₺ kargo

| Satır | Stok | Ürün | Adet | Fiyat | Link |
|-------|------|------|------|-------|------|
| B1 | D64 | **T-U2T USB-TTL** (CH9102 programlayıcı) | 1 | **806,40 ₺** | [f1depo.com/urun/t-u2t-usb](https://www.f1depo.com/urun/t-u2t-usb) |

T-Weigh’te USB çipi yok; **bu olmadan firmware yüklenemez**. GATE (T-Beam) için de aynı cihaz kullanılır.

---

### Sepet C — Robiz.net · ~720 ₺ + ~60 ₺ kargo

| Satır | Kod | Ürün | Adet | Birim | Toplam | Link |
|-------|-----|------|------|-------|--------|------|
| C1 | Loadcell 50kg | 50 kg yarı köprü load cell (34×34×8 mm) | 4 | 43,68 ₺ | **174,72 ₺** | [robiz.net/loadcell50kg](https://robiz.net/loadcell50kg) |
| C2 | CN3065 Modül | 6V güneş → 1S Li-ion şarj (0,5 A) | 1 | 86,40 ₺ | **86,40 ₺** | [robiz.net/cn3065](https://robiz.net/cn3065) |
| C3 | 1S 3A BMS | 18650 koruma (şarj etmez) | 1 | 17,28 ₺ | **17,28 ₺** | [robiz.net/battery](https://robiz.net/battery) |
| C4 | 83×58×33 IP65 | NODE elektronik kutusu | 1 | 100,80 ₺ | **100,80 ₺** | [robiz.net/83x58x33waterproofbox](https://robiz.net/83x58x33waterproofbox) |
| C5 | 40 Pin Dupont 20cm | Dişi–dişi (F-F) jumper | 1 | 49,68 ₺ | **49,68 ₺** | [robiz.net/20cmdupontff40](https://robiz.net/20cmdupontff40) |
| C6 | 40 Pin Dupont 20cm | Erkek–dişi (M-F) jumper | 1 | 49,68 ₺ | **49,68 ₺** | [robiz.net — M-F arama](https://robiz.net/index.php?route=product/search&search=dupont+erkek+di%C5%9Fi) |
| C7 | 2S 5A BMS | GATE pil koruma (2×18650 seri) | 1 | 43,20 ₺ | **43,20 ₺** | [robiz.net/2s5abms](https://robiz.net/2s5abms) |
| C8 | 18650 2’li yuva | GATE pil yuvası (kapaklı) | 1 | 52,80 ₺ | **52,80 ₺** | [robiz.net — 18650 2x yuva](https://robiz.net/index.php?route=product/search&search=18650+yuvas%C4%B1) |
| C9 | 150×100×50 kutu | GATE elektronik kutusu (iç mekân / silikonla dış) | 1 | 86,40 ₺ | [robiz.net/plastics](https://robiz.net/plastics) |
| C10 | 1/4W 4,7 kΩ direnç | DHT22 pull-up (10 adet paket yeter) | 1 | ~6 ₺ | [robiz.net — direnç](https://robiz.net/index.php?route=product/search&search=4.7k) |
| C11 | M3×12 vida + somun seti | Kutu + PCB montaj | 1 set | ~35 ₺ | Robiz / hırdavat |

**Robiz alt toplam:** **~616 ₺** (C11 hariç ~581 ₺)

---

### Sepet D — Robotistan · ~1.100 ₺ + ~60 ₺ kargo

| Satır | Kod | Ürün | Adet | Birim | Toplam | Link |
|-------|-----|------|------|-------|--------|------|
| D1 | — | 6V 150 mA güneş paneli (105×66 mm, ~0,9 W) — **NODE** | 1 | 174,87 ₺ | **174,87 ₺** | [robotistan.com/6-v-125ma-gunes-pili-solar-panel](https://www.robotistan.com/6-v-125ma-gunes-pili-solar-panel) |
| D2 | — | 6V 500 mA güneş paneli (170×130 mm, ~3 W) — **GATE** | 1 | 632,36 ₺ | **632,36 ₺** | [robotistan.com/6v-500ma-solar-panel](https://www.robotistan.com/6v-500ma-solar-panel-gunes-pili) |
| D3 | 23735 | Orion 18650 3200 mAh kutupsuz — **NODE** | 1 | 182,70 ₺ | **182,70 ₺** | [robotistan.com/orion-18650-3200mah](https://www.robotistan.com/orion-18650-3-7v-3200mah-2c-liion-sarjli-pil-kutup-bassiz) |
| D4 | 23735 | Orion 18650 3200 mAh kutupsuz — **GATE** (aynı tip 2 adet) | 2 | 182,70 ₺ | **365,40 ₺** | Aynı link |
| D5 | 19880 | BH-18650 tekli pil yuvası — **NODE** | 1 | 26,31 ₺ | **26,31 ₺** | [robotistan.com/bh-18650](https://www.robotistan.com/18650-pil-icin-tekli-pil-yuvasi-bh-18650) |
| D6 | — | USB-A kablo 1 m (CN3065 test şarjı) | 1 | ~35 ₺ | **35 ₺** | Robotistan |
| D7 | — | Micro USB veya Type-C kablo (T-U2T) | 1 | ~45 ₺ | **45 ₺** | Robotistan |

**Robotistan alt toplam:** **~1.462 ₺**

---

### Sepet E — Robo90 · 114 ₺ + ~40 ₺ kargo

| Satır | Kod | Ürün | Adet | Fiyat | Link |
|-------|-----|------|------|-------|------|
| E1 | R000919 | **DHT22 (AM2302)** sıcaklık + nem | 1 | **114,00 ₺** | [robo90.com/dht22](https://www.robo90.com/dht22-sicaklik-ve-nem-algilama-sensoru) |

**Not:** Robiz BME280 (316,80 ₺) stok dışı. BME280 gelince I2C ile değiştirilir; DHT22 tek pin (GPIO).

---

### Sepet F — Direnc.net · 4.842 ₺ (1500₺+ ücretsiz kargo)

| Satır | Kod | Ürün | Adet | Fiyat | Link |
|-------|-----|------|------|-------|------|
| F1 | T21232 | **TTGO T-Beam V1.2** LoRa 868 + GPS + ESP32 | 1 | **2.954,98 ₺** | [direnc.net/ttgo-t-beam](https://www.direnc.net/ttgo-t-beam-v11-esp32-lora-sx1262-wifi-bluetooth-868mhz-gnss-neo-6m-gps-gelistirme-modulu) |
| F2 | 21897 | **A7670E 4G/LTE + GPS** modül (IMEI kayıtlı, anten dahil) | 1 | **1.887,27 ₺** | [direnc.net/a7670e](https://www.direnc.net/a7670e-gsm-gps-modulu-ve-ltegnss-anten) |

**GATE alt toplam (elektronik):** **4.842,25 ₺**

---

### Sepet G — Operatör · ~200 ₺/ay

| Satır | Ürün | Adet | Fiyat | Not |
|-------|------|------|-------|-----|
| G1 | **Nano / M2M data SIM** | 1 | ~150 – 250 ₺/ay | Turkcell IoT, TT Mobil Data, Vodafone M2M |
| G2 | A7670E uyumlu **nano SIM** | 1 | — | Direnc modülüne takılır |

Aylık ~50–100 MB yeterli (15 dk’da bir JSON paketi).

---

### Sepet H — Yerel hırdavat / marangoz · ~380 ₺

| Satır | Malzeme | Ölçü / spec | Adet | Tahmini |
|-------|---------|-------------|------|---------|
| H1 | Kontrplak / OSB | 450×400×18 mm (üst platform) | 1 | ~120 ₺ |
| H2 | Kontrplak | 450×400×12 mm (alt taban) | 1 | ~80 ₺ |
| H3 | Alüminyum L profil veya köşebent | 40×40×3 mm, 4×25 cm ayak | 4 | ~80 ₺ |
| H4 | M6×30 civata + somun + pul | Load cell montaj | 16 set | ~45 ₺ |
| H5 | M4×20 civata | Load cell → platform | 8 set | ~20 ₺ |
| H6 | Kauçuk izolasyon padi | 40×40×5 mm | 4 | ~20 ₺ |
| H7 | Paslanmaz sac veya alüminyum plaka | 40×40×2 mm (load cell üst plaka) | 4 | ~40 ₺ |

---

### Sepet I — Montaj sarf · ~520 ₺

| Satır | Ürün | Adet | Tahmini | Nereden |
|-------|------|------|---------|---------|
| I1 | Lehim teli (63/37) + flux | 1 | ~80 ₺ | Robiz / hırdavat |
| I2 | Isı shrink makaron seti | 1 | ~45 ₺ | Robiz |
| I3 | Silikon contası (şeffaf, dış mekân) | 1 tüp | ~55 ₺ | Yapı market |
| I4 | Kablo pabuççu (PG7) IP65 kutu geçişi | 3 adet | ~45 ₺ | Elektrik malzemesi |
| I5 | Çift yollu band + nylon kelepçe | 1 set | ~35 ₺ | Hırdavat |
| I6 | Kalibrasyon ağırlığı (25 kg çuval un/şeker veya su bidonu) | 1 | ~150 ₺ | Market |
| I7 | Multimetre (yoksa) | 1 | ~250 ₺ | Robotistan |

---

## 3. NODE — satır satır master liste (22 kalem)

| # | Bölüm | Parça | Adet | KDV dahil | Tedarikçi |
|---|-------|-------|------|-----------|-----------|
| 001 | MCU | LilyGO T-Weigh 868 MHz | 1 | ~900 ₺ | LilyGO |
| 002 | Prog | T-U2T programlayıcı | 1 | 806,40 ₺ | F1Depo |
| 003 | Tartı | 50 kg load cell | 4 | 174,72 ₺ | Robiz C1 |
| 004 | Sensör | DHT22 sıcaklık/nem | 1 | 114,00 ₺ | Robo90 |
| 005 | Sensör | 4,7 kΩ pull-up direnç | 1 | ~6 ₺ | Robiz C10 |
| 006 | Güneş | 6V 150 mA panel | 1 | 174,87 ₺ | Robotistan D1 |
| 007 | Şarj | CN3065 modül | 1 | 86,40 ₺ | Robiz C2 |
| 008 | Koruma | 1S 3A BMS | 1 | 17,28 ₺ | Robiz C3 |
| 009 | Pil | 18650 3200 mAh | 1 | 182,70 ₺ | Robotistan D3 |
| 010 | Pil | BH-18650 tekli yuva | 1 | 26,31 ₺ | Robotistan D5 |
| 011 | Kutu | IP65 83×58×33 mm | 1 | 100,80 ₺ | Robiz C4 |
| 012 | Kablo | Dupont F-F 40×20 cm | 1 | 49,68 ₺ | Robiz C5 |
| 013 | Kablo | Dupont M-F 40×20 cm | 1 | 49,68 ₺ | Robiz C6 |
| 014 | Kablo | JST PH2.0 (panel ↔ CN3065) | 1 | panelle gelir / ~20 ₺ | Robotistan |
| 015 | Anten | 868 MHz IPEX (LoRa) | 1 | T-Weigh ile gelir | — |
| 016 | Montaj | M3 vida seti | 1 | ~35 ₺ | Robiz C11 |
| 017 | Montaj | PG7 kablo pabuççu | 2 | ~30 ₺ | Elektrik |
| 018 | Platform | Kontrplak üst + alt | 2 | ~200 ₺ | Yerel H1–H2 |
| 019 | Platform | M6/M4 civata seti | 1 set | ~65 ₺ | Yerel H4–H5 |
| 020 | Platform | Load cell plaka ×4 | 4 | ~40 ₺ | Yerel H7 |
| 021 | Test | USB kablo | 1 | ~45 ₺ | Robotistan D7 |
| 022 | Test | Kalibrasyon ağırlığı ~25 kg | 1 | ~150 ₺ | Market I6 |

**NODE elektronik + kutu:** **~3.050 ₺**  
**NODE + platform:** **~3.430 ₺**

---

## 4. GATE — satır satır master liste (14 kalem)

| # | Parça | Adet | KDV dahil | Tedarikçi |
|---|-------|------|-----------|-----------|
| 101 | TTGO T-Beam V1.2 (LoRa 868 gateway) | 1 | 2.954,98 ₺ | Direnc F1 |
| 102 | A7670E 4G/LTE + GPS modül | 1 | 1.887,27 ₺ | Direnc F2 |
| 103 | 6V 500 mA güneş paneli | 1 | 632,36 ₺ | Robotistan D2 |
| 104 | 18650 3200 mAh (aynı marka/model) | 2 | 365,40 ₺ | Robotistan D4 |
| 105 | 2S 5A BMS koruma | 1 | 43,20 ₺ | Robiz C7 |
| 106 | 18650 çift pil yuvası | 1 | 52,80 ₺ | Robiz C8 |
| 107 | 150×100×50 proje kutusu | 1 | 86,40 ₺ | Robiz C9 |
| 108 | Nano SIM (data) | 1 | ~200 ₺ (1. ay) | Operatör G1 |
| 109 | T-U2T (paylaşımlı) | — | 0 ₺ | Sepet B |
| 110 | Dupont / jumper (T-Beam ↔ A7670) | 1 set | ~50 ₺ | Robiz |
| 111 | Silikon dış contası | 1 | ~55 ₺ | I3 |
| 112 | PG9 kablo pabuççu | 2 | ~30 ₺ | I4 |
| 113 | Direnc 1500₺ üzeri kargo | — | 0 ₺ | — |
| 114 | CN3065 veya TP4056 (GATE pil şarjı, opsiyonel) | 1 | ~86 ₺ | Robiz |

**GATE toplam:** **~5.590 ₺** (SIM ilk ay dahil)

> GATE pil şarjı: Prototipte panel → CN3065 → 2S BMS → 2×18650 veya evde 8,4 V Li-ion şarj cihazı ile doldurup sahaya çıkın.

---

## 5. Bağlantı tabloları

### 5.1 Load cell → T-Weigh (4 hücre tam köprü)

Her hücrede **3 kablo** (Robiz yarı köprü):

| Load cell kablosu | Anlam | T-Weigh HX711 kanalı |
|-------------------|-------|----------------------|
| Kırmızı | E+ (excitation +) | Kanal 1–4 ortak besleme |
| Siyah | E− (excitation −) | Kanal 1–4 ortak besleme |
| Yeşil veya beyaz | S (sinyal) | Kanal A+, A− (kart şemasına göre) |

**Montaj:** 4 hücre platform köşelerine; zemin sabit, üst plaka kovan ağırlığını taşır.  
**Kapasite:** 4×50 kg yarı köprü → tam köprüde **~200 kg**.

### 5.2 DHT22 → T-Weigh (GPIO)

| DHT22 pini | Bağlantı |
|------------|----------|
| VCC (1) | 3,3 V (T-Weigh) |
| DATA (2) | GPIO (ör. IO4) + **4,7 kΩ** pull-up → 3,3 V |
| NC (3) | Boş |
| GND (4) | GND |

Sensör **kovan içine** (ısı/nem), kablo PG7 pabuççudan kutuya girer.

### 5.3 Güneş + pil → T-Weigh besleme

```
Güneş paneli (+/−) → CN3065 SOLAR girişi
CN3065 BAT+/BAT− → 1S BMS (B+/B−) → 18650 → BMS P+/P− → T-Weigh 5–12 V terminali
```

İlk test: **USB 5 V** veya T-U2T üzerinden besleme (saha öncesi).

### 5.4 LoRa NODE → GATE

| Parametre | Değer |
|-----------|-------|
| Frekans | **868 MHz** (TR/EU) |
| NODE | T-Weigh SX1262 |
| GATE | T-Beam SX1262/1276 |
| Menzil hedef | Yanıkdağ ↔ Tortum ~116 km **LoRa ile değil**; saha testi önce **aynı arılık** (<2 km), Tortum için **4G GATE** |

Veri yolu: **NODE (LoRa)** → **GATE (T-Beam alır)** → **A7670E (HTTPS POST)** → sunucu API.

---

## 6. Tartı platformu — kesim ve montaj listesi

```
        ┌─────────────────────────────┐  ← Üst platform (H1) 450×400×18 mm
        │         KOVAN               │     Kovan bu plakanın üstünde
        │    ┌───┐         ┌───┐      │
        │    │LC1│         │LC2│      │  LC = load cell (köşe)
        └───┴───┴─────────┴───┴──────┘
            │ M6              │ M6
        ┌───┴───┐         ┌───┴───┐
        │ ayak  │         │ ayak  │      Alt taban (H2) — sabit zemin
        └───────┘         └───────┘
```

| Adım | İş | Malzeme |
|------|-----|---------|
| 1 | Alt tabanı arılık zeminine sabitle | H2 + dübel |
| 2 | 4 load cell’i alt tabana M6 ile tak | C1, H4 |
| 3 | Üst platformu load cell üst plakalarına M4 ile bağla | H1, H7 |
| 4 | Elektronik kutusunu platform altına veya yana monte | C4 |
| 5 | Güneş panelini güneye ~30° eğimle monte | D1 |
| 6 | Bilinen ağırlıkla kalibrasyon (HX711 offset/gain) | I6 |

---

## 7. İlk çalıştırma sırası (1 adet)

| Sıra | Ne yapılır | Gerekli parçalar |
|------|------------|------------------|
| 1 | T-U2T + T-Weigh → USB ile firmware yükle | 001, 002, 021 |
| 2 | Mock API’ye WiFi POST (`npm run dev`) | Laptop |
| 3 | 1 load cell + bilinen ağırlık kalibrasyon | 003, 022 |
| 4 | 4 load cell tam montaj | 018–020 |
| 5 | DHT22 okuma testi | 004, 005 |
| 6 | CN3065 + panel + pil 24 saat test | 006–010 |
| 7 | T-Beam + A7670E birleştir, SIM aktivasyon | 101–102, 108 |
| 8 | LoRa paket alımı → 4G POST | 101–102 |
| 9 | Kovan altına montaj, Yanıkdağ saha | Tüm NODE |

---

## 8. Stok / alternatif notları

| Parça | Durum | Alternatif |
|-------|-------|------------|
| T-Weigh 868 | TR’de nadir | OpenELAB, Mauser (PT), LilyGO resmi |
| BME280 | Robiz stok dışı | DHT22 (E1) veya SHT30 Robotistan ~380 ₺ |
| 83×58 IP65 | Dar; T-Weigh sığar | Biraz büyük kutu için 100×80×29 Robiz (~97 ₺, IP değil) |
| GATE kutusu | 150×100×50 IP değil | Dış saha için silikon + gölgelik; üretimde IP65 büyük kutu |
| T-Beam vs custom | T-Beam pahalı | ESP32 + SX1262 shield (~1.200 ₺) — zaman kaybettirir |

---

## 9. Tek sayfa alışveriş checklist

```
□ A1  T-Weigh 868 MHz
□ B1  T-U2T
□ C1  Load cell ×4
□ C2  CN3065
□ C3  1S BMS
□ C4  IP65 kutu (NODE)
□ C5–C6 Dupont kablolar
□ C7  2S BMS (GATE)
□ C8  2’li pil yuvası (GATE)
□ C9  GATE kutusu
□ D1  Güneş 150 mA (NODE)
□ D2  Güneş 500 mA (GATE)
□ D3  18650 ×1 (NODE)
□ D4  18650 ×2 (GATE)
□ D5  Tekli pil yuvası (NODE)
□ E1  DHT22
□ F1  T-Beam V1.2
□ F2  A7670E 4G
□ G1  SIM kart
□ H1–H7 Platform malzemesi
□ I1–I7 Montaj + kalibrasyon
```

---

## 10. Rakip referans (1 kovan)

| Ürün | Fiyat | Uzaktan izleme |
|------|-------|----------------|
| Ermiş modemli tartı | ~20.000 ₺ | 4G, abonelik yok |
| ARGEKİP B1 + gateway | ~10.000 – 11.000 ₺ | LoRa + WiFi GW |
| **beepack 1 prototip (bu liste)** | **~9.900 – 10.300 ₺** | LoRa + 4G, abonelik ayrı |

---

*İlgili dosyalar: `DEMO_PLAN.md`, `ALIM_LISTESI.md`, `ALIM_LISTESI_NODE.md`, `alim-listesi-node.csv`, `alim-listesi-tam.csv`, `payload.schema.json`*

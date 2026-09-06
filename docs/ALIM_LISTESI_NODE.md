# beepack — Sadece NODE (1 kovan, GATE’siz)

**Amaç:** 1 kovan tartı + sıcaklık/nem; **USB / WiFi** ile laptop veya `hive-demo` API’ye veri  
**GATE yok:** LoRa saha testi ve Tortum uzaktan izleme **sonraki aşama**  
**Tarih:** 31 Ağustos 2026 · Fiyatlar KDV dahil (kargo hariç)

---

## Toplam

| Grup | Tutar |
|------|-------|
| Elektronik | ~2.734 ₺ |
| Tartı platformu | ~380 ₺ |
| Montaj / test sarf | ~200 ₺ |
| **Ara toplam** | **~3.314 ₺** |
| Kargo + T-Weigh ithalat | ~200 – 400 ₺ |
| **Gerçekçi toplam** | **~3.500 – 3.700 ₺** |

---

## Ne yapabilirsin / ne yapamazsın

| Evet (NODE ile) | Hayır (GATE olmadan) |
|-----------------|----------------------|
| 4 load cell tartı, kalibrasyon | Tortum’dan canlı izleme |
| DHT22 sıcaklık/nem | LoRa menzil testi |
| WiFi → `POST /api/ingest` | 4G / SIM |
| USB ile firmware geliştirme | Arılık dışından panel (internet yoksa) |
| Güneş + pil saha beslemesi | 116 km uzaktan veri |

**GATE ne zaman:** LoRa + 4G köprüsü için ~+5.500 ₺ (T-Beam + A7670E + SIM + büyük panel/akü). Bkz. `ALIM_LISTESI_DETAY.md`.

---

## Sipariş sepetleri

### 1 — LilyGO · ~900 ₺ + kargo

| Ürün | Adet | Fiyat | Link |
|------|------|-------|------|
| T-Weigh **868 MHz** + anten | 1 | ~850–1.050 ₺ | [lilygo.cc/products/t-weigh](https://lilygo.cc/products/t-weigh) |

### 2 — F1Depo · 806 ₺

| Stok | Ürün | Adet | Fiyat | Link |
|------|------|------|-------|------|
| D64 | T-U2T programlayıcı | 1 | 806,40 ₺ | [f1depo.com/urun/t-u2t-usb](https://www.f1depo.com/urun/t-u2t-usb) |

### 3 — Robiz · ~479 ₺

| Kod | Ürün | Adet | Toplam | Link |
|-----|------|------|--------|------|
| Loadcell 50kg | 50 kg load cell | 4 | 174,72 ₺ | [robiz.net/loadcell50kg](https://robiz.net/loadcell50kg) |
| CN3065 | Güneş/Li-ion şarj | 1 | 86,40 ₺ | [robiz.net/cn3065](https://robiz.net/cn3065) |
| 1S 3A BMS | Pil koruma | 1 | 17,28 ₺ | [robiz.net/battery](https://robiz.net/battery) |
| 83×58×33 | IP65 kutu | 1 | 100,80 ₺ | [robiz.net/83x58x33waterproofbox](https://robiz.net/83x58x33waterproofbox) |
| Dupont F-F | 40×20 cm | 1 | 49,68 ₺ | [robiz.net/20cmdupontff40](https://robiz.net/20cmdupontff40) |
| Dupont M-F | 40×20 cm | 1 | 49,68 ₺ | [robiz.net](https://robiz.net/index.php?route=product/search&search=dupont+erkek+di%C5%9Fi) |
| 4,7kΩ | Direnç (DHT22) | 1 | ~6 ₺ | Robiz |

### 4 — Robotistan · ~429 ₺

| Kod | Ürün | Adet | Toplam | Link |
|-----|------|------|--------|------|
| — | 6V 150 mA güneş paneli | 1 | 174,87 ₺ | [robotistan.com/6-v-125ma-gunes-pili-solar-panel](https://www.robotistan.com/6-v-125ma-gunes-pili-solar-panel) |
| 23735 | 18650 3200 mAh kutupsuz | 1 | 182,70 ₺ | [robotistan.com/orion-18650-3200mah](https://www.robotistan.com/orion-18650-3-7v-3200mah-2c-liion-sarjli-pil-kutup-bassiz) |
| 19880 | BH-18650 tekli yuva | 1 | 26,31 ₺ | [robotistan.com/bh-18650](https://www.robotistan.com/18650-pil-icin-tekli-pil-yuvasi-bh-18650) |
| — | USB kablo (test) | 1 | ~45 ₺ | Robotistan |

### 5 — Robo90 · 114 ₺

| Kod | Ürün | Adet | Fiyat | Link |
|-----|------|------|-------|------|
| R000919 | DHT22 (AM2302) | 1 | 114,00 ₺ | [robo90.com/dht22](https://www.robo90.com/dht22-sicaklik-ve-nem-algilama-sensoru) |

### 6 — Yerel · ~380 ₺

| Malzeme | Adet | Tahmini |
|---------|------|---------|
| Kontrplak 450×400×18 mm (üst) | 1 | ~120 ₺ |
| Kontrplak 450×400×12 mm (alt) | 1 | ~80 ₺ |
| M6/M4 civata + load cell plakası ×4 | 1 set | ~125 ₺ |
| Kauçuk pad ×4 | 4 | ~20 ₺ |
| Kalibrasyon ağırlığı ~25 kg | 1 | ~35 ₺ (market) |

---

## Master liste (satır satır)

| # | Parça | Adet | ₺ | Tedarikçi |
|---|-------|------|---|-----------|
| N01 | T-Weigh 868 MHz | 1 | 900 | LilyGO |
| N02 | T-U2T | 1 | 806 | F1Depo |
| N03 | Load cell 50 kg | 4 | 175 | Robiz |
| N04 | DHT22 | 1 | 114 | Robo90 |
| N05 | 4,7 kΩ direnç | 1 | 6 | Robiz |
| N06 | Güneş 6V 150 mA | 1 | 175 | Robotistan |
| N07 | CN3065 | 1 | 86 | Robiz |
| N08 | 1S BMS 3A | 1 | 17 | Robiz |
| N09 | 18650 3200 mAh | 1 | 183 | Robotistan |
| N10 | Tekli pil yuvası | 1 | 26 | Robotistan |
| N11 | IP65 kutu 83×58×33 | 1 | 101 | Robiz |
| N12 | Dupont F-F 40 pin | 1 | 50 | Robiz |
| N13 | Dupont M-F 40 pin | 1 | 50 | Robiz |
| N14 | USB kablo | 1 | 45 | Robotistan |
| N15 | Platform malzemesi | 1 set | 380 | Yerel |
| | **TOPLAM** | | **~3.314** | + kargo |

---

## İlk test (GATE’siz)

1. `cd hive-demo && npm install && npm run dev` → http://localhost:3847  
2. T-U2T + T-Weigh → firmware (WiFi ile API URL ayarla)  
3. Bilinen ağırlıkla HX711 kalibrasyonu  
4. Kovan altına montaj; WiFi kapsama alanında panelde canlı veri  

CSV: [`alim-listesi-node.csv`](./alim-listesi-node.csv)

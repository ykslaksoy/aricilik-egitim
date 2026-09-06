# beepack — alım planı (aşama 1 + aşama 2)

**bu dosya:** malzeme listesi + nereden alınır + maliyet — tek yerden bak.

| aşama | ne | ne zaman | ~₺ |
|-------|-----|----------|---:|
| **1** | 1 kovan NODE (tüm sensörler) + ev WiFi test | **şimdi** | **3.760** |
| **2** | GATE (LoRa + 4G) — uzaktan dinleme | **WiFi’de çalışınca** | **5.102** |
| | **1 kovan + uzak sistem toplam** | | **~8.860** |

**almıyorsun:** gps, eğim, kalibrasyon ağırlığı, yeni SIM (kendi hattın), kamera (beepack c — sonra)

---

# AŞAMA 1 — şimdi al

**amaç:** 1 kovan · tartı + th + ir + mic + titreşim · ev router WiFi → koloni paneli  
**GATE yok** — Tortum uzak izleme aşama 2’de

---

## 1.1 malzeme tablosu

| # | malzeme | adet | birim ₺ | satır ₺ | nereden al | site / arama |
|---|---------|-----:|--------:|--------:|------------|--------------|
| 1 | LilyGO **T-Weigh 868 MHz** | 1 | 900 | **900** | yurt dışı | [lilygo.cc](https://lilygo.cc) · OpenELAB · Mauser |
| 2 | **T-U2T** programlayıcı | 1 | 806 | **806** | F1Depo | [f1depo.com](https://f1depo.com) → T-U2T |
| 3 | **50 kg load cell** | 4 | 44 | **176** | Robiz | [robiz.net](https://robiz.net) → loadcell 50kg |
| 4 | **DHT22** sıcaklık/nem | 1 | 114 | **114** | Robo90 | [robo90.com](https://robo90.com) → DHT22 |
| 5 | **IR sensör modülü** | 2 | 50 | **100** | Robotistan | KY-033 / TCRT5000 / IR engel |
| 6 | **mikrofon** ses sensörü | 1 | 45 | **45** | Robotistan | ses sensörü kartı 4 pin |
| 7 | **ADXL345** titreşim | 1 | 150 | **150** | Robotistan | ADXL345 GY-291 |
| 8 | **4,7k Ω** direnç | 1 | 6 | **6** | Robiz | DHT pull-up |
| 9 | güneş paneli **6V 150mA** | 1 | 175 | **175** | Robotistan | |
| 10 | **CN3065** güneş şarj | 1 | 86 | **86** | Robiz | |
| 11 | **1S BMS** pil koruma | 1 | 17 | **17** | Robiz | |
| 12 | **18650** 3200mAh | 1 | 183 | **183** | Robotistan | |
| 13 | **tekli pil yuvası** | 1 | 26 | **26** | Robotistan | |
| 14 | **IP65 kutu** ~83×58 mm | 1 | 101 | **101** | Robiz | |
| 15 | jumper kablo **F-F** | 1 paket | 50 | **50** | Robiz | |
| 16 | jumper kablo **M-F** | 1 paket | 50 | **50** | Robiz | |
| 17 | **USB kablo** | 1 | 45 | **45** | Robotistan | T-U2T / test |
| 18 | **tartı platformu** | 1 set | 380 | **380** | yerel hırdavat | kontrplak + vida + ayak |
| | | | **parça** | **3.410** | | |
| | kargo (≈5 sipariş) | | | **350** | | |
| | **AŞAMA 1 TOPLAM** | | | **3.760 ₺** | | |

---

## 1.2 site site sepet (aşama 1)

### LilyGO / OpenELAB / Mauser
| al | adet | ₺ |
|----|-----:|--:|
| T-Weigh **868 MHz** | 1 | 900 |
| **ara toplam** | | **900** |

### F1Depo — f1depo.com
| al | adet | ₺ |
|----|-----:|--:|
| T-U2T | 1 | 806 |
| **ara toplam** | | **806** |

### Robiz — robiz.net
| al | adet | ₺ |
|----|-----:|--:|
| 50 kg load cell | 4 | 176 |
| CN3065 | 1 | 86 |
| 1S BMS | 1 | 17 |
| IP65 kutu | 1 | 101 |
| 4,7k direnç | 1 | 6 |
| jumper F-F | 1 | 50 |
| jumper M-F | 1 | 50 |
| **ara toplam** | | **486** |

### Robo90 — robo90.com
| al | adet | ₺ |
|----|-----:|--:|
| DHT22 | 1 | 114 |
| **ara toplam** | | **114** |

### Robotistan — robotistan.com
| al | adet | ₺ |
|----|-----:|--:|
| güneş paneli 6V 150mA | 1 | 175 |
| 18650 3200mAh | 1 | 183 |
| tekli pil yuvası | 1 | 26 |
| USB kablo | 1 | 45 |
| IR modül | 2 | 100 |
| mikrofon / ses sensörü | 1 | 45 |
| ADXL345 | 1 | 150 |
| **ara toplam** | | **724** |

### Yerel hırdavat
| al | adet | ₺ |
|----|-----:|--:|
| tartı platformu malzemesi | 1 | 380 |
| **ara toplam** | | **380** |

### Kargo (tahmini)
| | ₺ |
|--|--:|
| tüm siparişler | **350** |

---

## 1.3 aşama 1 checklist

- [ ] T-Weigh 868 sipariş (LilyGO — kargo uzun sürebilir, önce ver)
- [ ] T-U2T (F1Depo)
- [ ] Robiz sepeti (7 kalem)
- [ ] Robo90 DHT22
- [ ] Robotistan sepeti (7 kalem)
- [ ] platform malzemesi (yerel)
- [ ] iyi kovan + koloni (ayrı — ~3–8 bin ₺)

---

## 1.4 aşama 1 bitince ne olur?

- [ ] tartı panelde değişiyor
- [ ] sıcaklık / nem geliyor
- [ ] ir sayımı var
- [ ] skor / oğul paneli doluyor
- [ ] birkaç gün stabil

→ **aşama 2’ye geç (GATE al)**

---

# AŞAMA 2 — çalışınca al

**amaç:** LoRa → GATE → 4G → koloni · Tortum / uzaktan izleme  
**ne zaman:** aşama 1 test OK

---

## 2.1 malzeme tablosu

| # | malzeme | adet | birim ₺ | satır ₺ | nereden al | site / arama |
|---|---------|-----:|--------:|--------:|------------|--------------|
| 19 | LilyGO **T-Beam** LoRa | 1 | 2.955 | **2.955** | Direnc.net | [direnc.net](https://direnc.net) → T-Beam |
| 20 | **A7670E** 4G modem | 1 | 1.887 | **1.887** | Direnc.net | A7670E (T-Beam ile) |
| 21 | güneş paneli **6V 500mA** | 1 | 632 | **632** | Robotistan | GATE için büyük |
| 22 | **18650** 3200mAh | 2 | 183 | **366** | Robotistan | |
| 23 | **2S BMS** | 1 | 43 | **43** | Robiz | |
| 24 | **çift pil yuvası** | 1 | 53 | **53** | Robiz | |
| 25 | kutu **150×100×50 mm** | 1 | 86 | **86** | Robiz | GATE kutusu |
| | | | **parça** | **5.022** | | |
| | kargo | | | **80** | | |
| | SIM | | | **0** | kendi hattın | |
| | **AŞAMA 2 TOPLAM** | | | **5.102 ₺** | | |

**T-U2T tekrar alma** — aşama 1’deki yeter.

---

## 2.2 site site sepet (aşama 2)

### Direnc.net
| al | adet | ₺ |
|----|-----:|--:|
| T-Beam LoRa | 1 | 2.955 |
| A7670E 4G | 1 | 1.887 |
| **ara toplam** | | **4.842** |

### Robotistan
| al | adet | ₺ |
|----|-----:|--:|
| güneş paneli 6V 500mA | 1 | 632 |
| 18650 3200mAh | 2 | 366 |
| **ara toplam** | | **998** |

### Robiz
| al | adet | ₺ |
|----|-----:|--:|
| 2S BMS | 1 | 43 |
| çift pil yuvası | 1 | 53 |
| kutu 150×100×50 | 1 | 86 |
| **ara toplam** | | **182** |

### Kargo + SIM
| | ₺ |
|--|--:|
| kargo | 80 |
| SIM kart | 0 (kendi hattın) |

---

## 2.3 aşama 2 checklist

- [ ] T-Beam + A7670E (Direnc.net)
- [ ] GATE güneş + 2× pil (Robotistan)
- [ ] GATE kutu + BMS (Robiz)
- [ ] kendi SIM’i tak
- [ ] GATE arılık ortasına kur
- [ ] LoRa eşleştir → uzaktan panel

---

# TOPLAM ÖZET

| | ₺ |
|--|--:|
| **Aşama 1** (NODE + WiFi test) | **3.760** |
| **Aşama 2** (GATE + uzak) | **5.102** |
| **Donanım toplam** | **8.862 ≈ 8.900** |

```
şimdi (aşama 1)     3.760 ₺
çalışınca (aşama 2) 5.102 ₺
──────────────────────────
toplam              ~8.900 ₺
```

---

# SONRA — ek kovan (aşama 3 mantığı)

T-U2T ve GATE bir kez alındı → her yeni kovan sadece **aşama 1 parçaları** (T-U2T hariç):

| | ₺ |
|--|--:|
| ek NODE (T-U2T yok) | **~2.950** (+ kargo) |

GATE aynı arılıkta tekrar alınmaz.

| kovan sayısı | hesap | ~₺ |
|--------------|--------|---:|
| 1 + GATE | 3.760 + 5.102 | **8.900** |
| 5 + GATE | 3.760 + 4×2.950 + 5.102 | **20.700** |
| 30 + GATE | 3.760 + 29×2.950 + 5.102 | **94.500** |

---

# ilişkili dosyalar

| dosya | konu |
|-------|------|
| `alim-listesi-asama1.csv` | aşama 1 Excel |
| `alim-listesi-asama2.csv` | aşama 2 Excel |
| `SENSOR_PAKETI.md` | sensör açıklaması |
| `KART_VE_VERI.md` | T-Weigh / GATE mimarisi |

*Son güncelleme: 2026-08-31*

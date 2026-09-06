# beepack — 1’den 100 Kovana Test Planı

**Hedef:** Önce 1 kovan doğrula → kademeli büyüt → **100 kovana kadar** saha testi  
**Yazılım:** 100 kovan panel/API tarafında sorun yok (mock’tan başladın)  
**Donanım:** Her aşamada **hepsini birden alma** — önceki aşama OK olunca bir sonrakine geç

---

## Mimari (100 kovana kadar aynı mantık)

```
KOVAN (NODE)          MERKEZ
tartı+sıcaklık+nem  →  HUB (opsiyonel, 25–30 kovan)  →  GATE (LoRa+4G)  →  API  →  App
LoRa 868 MHz              WiFi yoğun alanlarda              1 arılık / bölge
```

| Ölçek | NODE | HUB | GATE | Not |
|-------|------|-----|------|-----|
| 1 kovan | 1 | 0 | 0 | WiFi/USB test |
| 2–5 kovan | 2–5 | 0 | 1 | LoRa + 4G, aynı arılık |
| 6–30 kovan | 6–30 | 0–1 | 1 | Tek GATE yeter (LoRa) |
| 31–100 kovan | 31–100 | 2–4 | 1–2 | Mesafe/engel varsa 2. GATE |

**100 kovan ≠ 100 ayrı 4G modem.** NODE ucuz kalır (LoRa); internet **GATE**’ten çıkar.

---

## Aşamalar — ne zaman, ne alırsın, ne test edersin

### Aşama 0 — Yazılım (şimdi, donanımsız)
- `hive-demo` mock API + panel
- **Başarı:** 100 mock kovan listede akıcı; alarm/grafik OK

### Aşama 1 — 1 kovan (~3.400 ₺)
| Al | Adet |
|----|------|
| NODE seti | 1 |
| GATE | **0** |

**Test:** Kalibrasyon, nem/sıcaklık, WiFi POST, 7–14 gün arılıkta stabil pil.

---

### Aşama 2 — 3–5 kovan (~+10.000–14.000 ₺)
| Al | Adet | Neden |
|----|------|-------|
| NODE (aynı BOM) | +2–4 | LoRa mesh/menzil |
| GATE (T-Beam + A7670E) | 1 | İlk uzaktan veri |
| Güneş + pil GATE | 1 set | |

**Test:** Aynı arılıkta 3–5 NODE → 1 GATE; paket kaybı, pil tüketimi, Tortum’dan panel.

---

### Aşama 3 — 10 kovan (~+25.000–35.000 ₺ kümülatif NODE)
| Al | Adet |
|----|------|
| NODE | toplam 10 |
| GATE | 1 (yeterli) |

**Test:** Oğul alarmı, ağırlık trendi, 10 eşzamanlı LoRa, API yükü.

---

### Aşama 4 — 30 kovan (pilot arılık)
| Al | Adet |
|----|------|
| NODE | toplam 30 |
| GATE | 1–2 (engilli arazi) |
| HUB | 0–1 (kamera yoksa gerekmez) |

**Test:** Migrasyon (Yanıkdağ ↔ Tortum), montaj süresi/kovan, arıza oranı.

---

### Aşama 5 — 100 kovan (tam saha)
| Al | Adet | Tahmini birim |
|----|------|----------------|
| NODE | 100 | ~2.000–2.800 ₺/kovan üretim |
| GATE | 1–2 | ~5.000 ₺/adet |
| HUB | 0–4 | Kamera/PTZ eklersen |

**Donanım bütçe (100 NODE + altyapı):** ~**200.000 – 280.000 ₺** (seri üretim, prototip parça fiyatı değil)

---

## 100 kovana kadar test checklist

### Donanım
- [ ] 1 NODE 14 gün stabil
- [ ] 5 NODE → 1 GATE LoRa kayıpsız
- [ ] Yağmur/çamur IP65
- [ ] Kış pil ömrü (1 kovan en az 1 kış)
- [ ] 30 kovan montaj süresi ölçüldü
- [ ] Yedek parça stoğu (load cell, pil, kart)

### Yazılım
- [ ] 100 kovan liste performansı
- [ ] Alarm gecikmesi < 15 dk (LoRa + 4G)
- [ ] GATE offline → kuyruk / uyarı
- [ ] Firmware OTA (100’de şart, erken planla)

### İş
- [ ] Prototip maliyet vs satış fiyatı (~3.000 ₺/kovan hedef)
- [ ] BeeTrack/ARGEKİP karşılaştırma demosu hazır

---

## Senin şu anki sıran (özet)

```
1. ŞİMDİ     →  1 NODE     ~3.400 ₺     WiFi test
2. SONRA     →  1 GATE     ~5.100 ₺     Tortum / LoRa
3. OK ise    →  +4 NODE    ~4×2.500 ₺   5 kovan saha
4. OK ise    →  +5 NODE    …            10 kovan
5. Pilot     →  +20 NODE   …            30 kovan
6. Üretim    →  +70 NODE   toplu sipariş 100 kovan
```

**100’e kadar test = aynı ürün, kademeli adet.** İlk 1 kovanda kart/kutu/firmware değişirse 100’e geçmeden düzelt.

---

## 100 kovanda bilinçli olarak sonra

- Kapı IR arı sayacı (opsiyonel NODE)
- PTZ kamera + HUB (GATE WiFi limiti ~25–30 cam/AP)
- iOS native app (önce PWA/Web)
- OTA firmware

---

## Maliyet karşılaştırma (100 kovan, 3 yıl)

| | Donanım + abonelik (tahmin) |
|--|---------------------------|
| BeeTrack | ~1,2M ₺ |
| ARGEKİP | ~700K ₺ |
| beepack (hedef) | ~325–385K ₺ |

*Detaylı 1 kovan alım: `ALIM_ASAMA1_ASAMA2.md`*

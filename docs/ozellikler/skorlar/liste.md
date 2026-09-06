# Skorlar — kovan bazında (100 kovan)

**Karar:** Her skor ve sensör **kovan bazında** işlenir, değerlendirilir, gösterilir.  
Arılık özeti = kovan skorlarının toplanması / filtresi; tek “arılık skoru” ana model değil.

---

## Bu dosyalar ne?

| Dosya | Ne | 0–100 / etiket |
|-------|-----|----------------|
| **koloni-skoru** | Genel güç ve denge | 0–100 · Zayıf/Orta/İyi/Mükemmel |
| **saglik-skoru** | Fizyoloji (ısı, nem, düşüş) | 0–100 · Kritik…Çok iyi |
| **ogul-riski** | Oğul **gitmeden** risk | 0–100 · Düşük…Acil |
| **ari-tahmini** | Tahmini arı sayısı | örn. 42k (35–48k) |
| **ari-sayisi-katmanlari** | Yoğunluğa göre oğul erken uyarı | 35k→55k katman |
| **kamera-ari-sayimi** | CV sayım (kamera varsa) | opsiyonel girdi |
| **onleme-onerileri** | Ne yapmalı (max 3 madde) | metin |

Hepsi **aynı kovanın** son ölçümlerinden üretilir.

---

## Koloni skoru nedir?

Kovanın “ne kadar güçlü / dengeli?” özeti.

- Girdi: arı tahmini, öğlen IR, günlük kg salınımı, sıcaklık, nem  
- Yüksek = güçlü koloni  
- Oğul riski **ayrı** — güçlü kovan oğul riski yüksek olabilir  

## Arı sayısı katmanları nedir?

Tahmini arı sayısı eşiğe gelince **oğul öncesi** kademe:

| Katman | Sayı | Anlam |
|--------|------|--------|
| İzle | 35k+ | Takibe al |
| Artan | 40k+ | Genişletme planla |
| Yüksek | 45k+ | Bu hafta süper/kat |
| Kritik | 48k+ | 48 saat müdahale |
| Maksimum | 55k+ | Oğul kaçınılmaz olabilir |

Tartı/trafik henüz alarm vermese bile yoğunluk uyarır.

---

## En doğrusu: kovan bazında

```
Her kovan kartı → kendi sensörleri → kendi skorları
```

| Yanlış | Doğru |
|--------|--------|
| 100 kovan tek skor | 100 ayrı skor seti |
| Ortalama arılık skoru ana ekran | Liste: her satır kendi skoru; özet = riskli sayısı |
| Sensörler arılığa ortak | Her kovanda kendi tartı/IR/mic… |

Arılık özeti sadece: “12 yüksek oğul · 3 kritik sağlık · Ana Kafkas×Baba Karniyol’da 2 risk”

---

## 100 kovanda nasıl görünür?

### Liste (tüm kovanlar)
```
#   kg    Skor  Sağlık  Oğul  Arı
47  30.2   92     88     75   52k · Kritik
12  26.1   61     70     22   28k
…
```
Satıra tıkla → kovan detay.

### Kovan içi (her kovan)
```
Kovan 47 · Ana Kafkas × Baba Karniyol

Skorlar
  Koloni   92  Mükemmel
  Sağlık   88  Çok iyi
  Oğul     75  Acil
  Arı      ~52k  (48–55k) · Katman: Kritik (~48k+)

Sensörler (canlı / son)
  Tartı 30.2 kg · salınım 0.8
  °C 34.1 · Nem %58
  IR in/out 1650/1850 (öğlen ort.)
  Mic / titreşim / pil
  Kamera: yok | var

Önleme
  1. 48 saat içinde süper veya kat böl
  …
```

### Özet (100 kovan)
- Riskli kovan sayısı  
- Filtre: çapraz ırk, oğul ≥50, katman ≥4  
- Toplu işlem yok; her kovan kendi verisi  

---

## Sensör → işlem → değerlendirme (kovan bazında)

```
1. Ölçüm (15 dk)
   kovan kartı: kg, °C, nem, beeIn/Out, mic, titreşim, pil
        ↓
2. Ingest
   POST /api/ingest { hiveId: 47, ... }
        ↓
3. Değerlendirme (sadece bu hiveId)
   analyzeColony(history_47, latest_47, config_47)
   evaluateHiveState(reading, colony, meta) → evaluation.durumlar
   → skorlar + katman + önleme + durum boyutları
        ↓
4. Gösterim
   liste satırı 47 + detay 47 + alarm (47’ye özel)
```

Kalibrasyon (`tareKg`, `combKg`, referans arı) da **kovan config** — komşuya karışmaz.

Kamera varsa sadece o kovanda CV eklenir; yoksa IR+tartı yolu.

---

## Özet kural

1. **Kovan bazında** ölç, hesapla, göster  
2. Liste = 100 satır özet; **içe girince** tam skor + sensör + önleme  
3. 100 kovan için ayrı algoritma yok — aynı motor × 100  
4. Çapraz ırk süzmesi skorun üstünde filtre  

Detay algoritma: `docs/COLONY_SCORE.md` · kod: `apps/api/src/colony.js`  
Eşik tablosu: `sensorler/degerlendirme.md` · `GET /api/eval-config`

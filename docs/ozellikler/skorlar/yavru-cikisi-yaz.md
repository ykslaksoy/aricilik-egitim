# Yavru çıkışı (yaz) — sayı ve tartı

**Durum:** calisiyor (demo tahmin) / plan (kamera + muayene kaydı)

Yazın ana yoğun yumurtlama yapar; **21 gün sonra** o gün bırakılan yumurtadan işçi arılar çıkar.  
Koloni tartısı bu büyümeyi **kademeli kg artışı** ve **IR trafik artışı** olarak gösterir.

---

## Biyoloji (kısa)

| Aşama | Süre | Tartıda |
|--------|------|---------|
| Yumurta | 3 gün | hücrede, çok az |
| Açık larva | ~6 gün | beslenir, petek ağırlığı artar |
| Kapalı pupa | ~12 gün | hücre kapalı |
| **Çıkış (imago)** | 21. gün | yeni işçi kovanda — **~100 mg / arı** |

**Gelişim döngüsü:** yumurta → larva → pupa → çıkış ≈ **21 gün**.

---

## Yazın kaç adet doğuyor?

Güçlü Kafkas koloni (örnek aralık):

| Durum | Ana yumurtlama | Günlük çıkış (≈21 gün sonrası) |
|--------|----------------|--------------------------------|
| İlkbahar toparlanma | 800–1.200 / gün | 600–1.000 / gün |
| **Yaz zirve** | 1.500–2.500 / gün | **1.000–2.000 / gün** |
| Sonbahar düşüş | 400–800 / gün | 300–600 / gün |

**21 günde** tek dalgada kabaca: **20.000–35.000 yeni işçi** (zirve döneminde).

> Kesin sayım yok; tartı + IR **tahmin**. Tam sayı: muayene + (ileride) kamera.

---

## Tartı nasıl değişir?

Tartı **üç şeyi birden** okur:

```
tartı = tare + petek + arı kütlesi + bal/polen stokları
```

### 1. Arı kütlesi (yavru çıkışı)
- 1.000 yeni arı ≈ **+0,10 kg** (100 mg × 1000)
- 1.400 / gün çıkış ≈ **+0,14 kg / gün** saf arı kütlesi
- 21 günde ≈ **+1,5–2,5 kg** arı tarafı (dalga boyunca)

### 2. Bal / nektar (gündüz salınım)
- Forager gündüz dışarı → akşam stok artar
- Günlük **±0,4–2,5 kg** salınım normal
- Bu yüzden tek gün kg **düşebilir** ama 2–3 haftalık eğilim **yukarı** kalır

### 3. Petek / yavru alanı
- Açık yavru beslenirken petek tarafı hafif artar
- Kapalı pupa çıkınca hücre boşalır → yeni yumurta veya bal konur

### Pratik okuma

| Gözlem | Yorum |
|--------|--------|
| 2–3 haftada **+1,5–2,5 kg** yukarı eğilim, salınım normal | Yaz büyümesi / yavru çıkışı |
| Ani **−3 kg / 6 saat** | Oğul veya bal hasadı — yavru değil |
| kg artıyor ama IR düşük | Bal birikiyor, arı zayıf olabilir |
| IR artıyor + kg artıyor | Sağlıklı yaz büyümesi |

**Kovan içi sıcaklık** (DHT22) yazın genelde 32–36°C — yavru bölgesi ısıtılır; dış hava ile karıştırma.

---

## Koloni nasıl hesaplar?

`colony.js` → `analyzeBroodEmergence()`:

1. Son **7 / 21 gün** tartı eğilimi  
2. Aşırı salınım (>4,5 kg) varsa güven düşük — bal baskın  
3. Kalıcı artıştan tahmini **arı kütlesi** → günlük çıkış (400–2.500 aralığı)  
4. Demo kovan **5**: profil `broodEmergencePerDay: 1400`

API yanıtı (`colony.broodEmergence`):

| Alan | Örnek |
|------|--------|
| `emergePerDay` | 1400 |
| `emergePerDayMin` / `Max` | 1190 – 1610 |
| `estimatedNewBees21d` | ~29.400 |
| `weightGain21dKg` | +2,1 |
| `beeMassGain21dKg` | ~1,2 (arı payı tahmini) |
| `broodCycleDays` | 21 |

---

## Demo kovan

**Kovan 5** — “Yazın yavru çıkışı — koloni büyüyor”  
Son 24 günde tartı **+2,1 kg** eğilim, öğlen IR artışı, ~**1,4k/gün** çıkış profili.

---

## Bağlı

- `ari-tahmini.md` — toplam arı sayısı  
- `ogul-riski.md` — çok büyüyünce oğul  
- `kovan-kaydi/irk-ve-yavru.md` — çerçeve / yavru kaydı  
- `sensorler/tarti.md` — tartı sensörü

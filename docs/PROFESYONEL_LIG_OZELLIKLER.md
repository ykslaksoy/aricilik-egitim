# Profesyonel lig — özellik karşılaştırması (yurt dışı + koloni)

Son güncelleme: 2026-09-01  
Kapsam: **Türkiye rakipleri dahil değil.** Referans: BeeHero, Arnia, ApisProtect, Beewise (+ BroodMinder, BEEP, HiveSense).

**koloni sütunu:** ✓ var · ~ kısmen / plan · ✗ yok

> Detaylı iyileştirme raporu: `docs/PRO_LIG_IYILESTIRME_RAPORU.md`

---

## A — Donanım sensörleri

| Özellik | BeeHero | Arnia | ApisProtect | Beewise | BroodMinder | BEEP | **koloni** |
|---------|:-------:|:-----:|:-----------:|:-------:|:-----------:|:----:|:----------:|
| Tam platform tartı (4 köşe) | ✓ | ✓ | ✗ | ✓ | ~ | ✓ | **✓** |
| Tek taraf tartı tahmini | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | **~ (4 köşe ort.)** |
| Yavru alanı sıcaklık probu (petek içi) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **~ (model + prob destek)** |
| Nem sensörü | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | **✓** |
| Akustik / mikrofon | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | **~ (ML sınıf + alarm)** |
| Titreşim / ivme | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | **~ (yağma füzyon)** |
| IR giriş sayacı (beeIn / beeOut) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **~ (API + kalibrasyon)** |
| GPS konum | ✓ | ~ | ✗ | ✓ | ✗ | ✗ | **~ (yazılım hazır)** |
| Devrilme / eğim sensörü | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | **~ (tilt ingest)** |
| Hava istasyonu (yağmur, güneş) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | **~ (istasyon füzyon)** |
| Kovan içi kamera | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | **~ C paket (giriş PTZ)** |
| Tarla içi çiçek ziyareti sensörü | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | **~ (IR trafik proxy)** |
| Güneş + uzun pil ömrü | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Uzaktan hücre (4G / GSM / NB-IoT) | ✓ | ✓ | ✓ | ✓ | ~ | ~ | **✓ (GATE)** |
| LoRa / LoRaWAN | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | **✓** |

---

## B — Koloni zekâsı ve tahmin

| Özellik | BeeHero | Arnia | ApisProtect | Beewise | BroodMinder | BEEP | HiveSense | **koloni** |
|---------|:-------:|:-----:|:-----------:|:-------:|:-----------:|:----:|:---------:|:----------:|
| Koloni sağlık skoru (0–100) | ✓ | ~ | ✓ | ✓ | ✗ | ✗ | ~ | **✓** |
| ML / milyonlarca kovan verisi | ✓ | ~ | ✓ | ✓ | ✗ | ✗ | ~ | **~ (filo toplama)** |
| Oğul **gitmeden önce** risk | ~ | ✓ | ~ | ✓ | ✗ | ✗ | ✓ | **✓** |
| Oğul **sonrası** ani tartı alarmı | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Akustik oğul / ana kaybı (24–48 saat) | ✓ | ✓ | ✓ | ✓ | ✗ | ~ | ✓ | **~ (48h füzyon)** |
| Tahmini **arı sayısı** | ~ | ✗ | ✗ | ✓ (CV) | ✗ | ✗ | ✗ | **✓** |
| Öğlen trafik **kalibrasyonu** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓** |
| Koloni güç skoru | ✓ | ~ | ✓ | ✓ | ✗ | ✗ | ~ | **✓** |
| Ana kaybı / queenless tespiti | ✓ | ✓ | ✓ | ✓ | ~ | ✗ | ✓ | **~ (füzyon + alarm)** |
| Varroa / hastalık tahmini | ~ | ~ | ~ | ✓ (ısı tedavi) | ✗ | ✗ | ✗ | **~ (proxy + alarm)** |
| Hasat zamanı tahmini | ✗ | ✓ | ✗ | ✓ | ~ | ~ | ✗ | **✓** |
| Kış açlığı / store tüketimi uyarısı | ~ | ✓ | ~ | ✓ | ✓ | ✓ | ~ | **~ (store gün modeli)** |
| Yağma (robbing) tespiti | ~ | ✓ | ~ | ✓ | ~ | ✓ | ✗ | **~ (dedicated modül)** |
| Bal akışı / nectar flow grafik | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Önleyici müdahale listesi (Türkçe) | ✗ | ✗ | ✗ | ✓ (otomatik) | ✗ | ✗ | ~ | **✓** |

---

## C — Uygulama, operasyon, ticari

| Özellik | BeeHero | Arnia | ApisProtect | Beewise | BroodMinder | BEEP | **koloni** |
|---------|:-------:|:-----:|:-----------:|:-------:|:-----------:|:----:|:----------:|
| iOS / Android native app | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | **~ web + offline API** |
| Web panel / dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| Push / SMS alarm | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **✓** |
| **çok arılık / gezginci** | ✓ | ~ | ✓ | ✓ | ~ | ~ | **✓** |
| Takım / çok kullanıcı | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | **~ (team API)** |
| Muayene / saha kaydı | ✓ | ✗ | ✗ | ✓ | ~ | ✓ | **~ (journal CRUD)** |
| İlaç / besleme günlüğü | ✓ | ✗ | ✗ | ✓ | ~ | ✓ | **~ (journal API)** |
| Pollination ROI (çiftçi raporu) | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | **✓** |
| Healthy Hive / pollination indeksi | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | **~ (6 bileşen skor)** |
| Hava durumu entegrasyonu | ~ | ✓ | ~ | ✓ | ✗ | ✗ | **~ (istasyon füzyon)** |
| Açık API / ingest | ~ | ✗ | ✗ | ✗ | ~ | ✓ | **✓** |
| Offline-first senkron | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | **~ (sync API)** |
| Abonelik zorunlu değil | ✗ | ~ | ✗ | ✗ | ✓ | ✓ | **~ (plan API)** |
| Yerinde kurulum / SLA | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | **~ (SLA takip)** |

---

## D — Skor özeti (v3)

| Metrik | v1 | v2 yazılım | **v3 (saha verisi yok)** |
|--------|:--:|:----------:|:------------------------:|
| 44 madde genel ort. | ~72 | **~84** | **~88–89** |
| Donanım montaj planı ile | — | — | **~90** |
| 100 kovan × 1 yıl + etiket | — | — | **~92+** |

Kalan ✗: **Native mağaza app**, **saha eğitilmiş ML milyon veri**, **Beewise robot ligi** (hedef dışı).

---

## E — koloni neden en iyi? (özet)

| # | Avantaj | Rakiplerde |
|---|---------|------------|
| 1 | 4 köşe tartı + düşük maliyet | ApisProtect yok; diğerleri pahalı |
| 2 | Öğlen IR kalibrasyon + arı sayısı | **Hiçbirinde yok** |
| 3 | Petek Tarama + başlangıç skoru trend | **Eşsiz** |
| 4 | Türkçe önleme + gezginci mod | BeeHero/ApisProtect seviyesi |
| 5 | LoRa + 4G + açık ingest | BEEP ile eş; Arnia/ApisProtect'te ingest yok |
| 6 | Healthy Hive + Pollination ROI | Arnia'da yok |
| 7 | Tek taraf tartı (4 köşeden) | BroodMinder dışında yok |
| 8 | Offline sync API | BeeHero/Arnia/ApisProtect'te yok |

Kod: `apps/api/src/colony.js` · İyileştirme: `docs/PRO_LIG_IYILESTIRME_RAPORU.md`

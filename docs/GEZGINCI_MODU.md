# koloni — gezginci modu

**karar:** uygulama **gezginci arıcılık** için tasarlanır (örn. Yanıkdağ ↔ Tortum ~116 km).

sabit arılık da çalışır; varsayılan iş akışı **taşıma + çok arılık**.

---

## ne demek?

| kavram | anlam |
|--------|--------|
| **arılık** | konum (Yanıkdağ, Tortum, geçici yayla…) |
| **taşıma / yol** | kovanlar kamyonda — alarmlar susturulur veya “taşıma” kuralları |
| **yerleşme** | yeni arılıkta ilk 24–72 saat özel takip |
| **sezon rotası** | hangi arılıkta hangi ay |

gps **zorunlu değil** — arıcı uygulamada arılık seçer / taşımaya başlar. gps sonra opsiyonel eklenti olabilir.

---

## uygulama özellikleri

### 1. çok arılık
- arılık oluştur: ad, not, yaklaşık konum (manuel)
- kovanları arılığa ata / toplu taşı
- özet: “Yanıkdağ 18 · Tortum 12”

### 2. taşıma modu (kritik)
arıcı **“taşımayı başlat”** der:

| açık | kapalı / yumuşak |
|------|------------------|
| batarya kritik | oğul riski (yolda anlamsız) |
| ani tam kopuş (düştü mü?) | öğlen trafik / arı tahmini |
| dengesizlik (devrilme — tartı) | hasat uyarısı |
| titreşim aşırı (kaza/darbe) | | 

taşıma bitince: **“yeni arılığa yerleşti”** → 48 saat “yerleşme” izlemesi.

### 3. yerleşme penceresi
yeni yerde:
- ağırlık toparlanması
- sıcaklık/nem istikrarı
- ir trafik dönüşü
- ilk 48 saatte ekstra alarm hassasiyeti (opsiyonel)

### 4. rota / sezon (basit)
- arılık A → B tarihleri (manuel takvim)
- abonelikte hatırlatma: “Tortum’a taşıma haftası”

### 5. abonelik
| paket | gezginci |
|-------|----------|
| başlangıç | 1–2 arılık |
| pro | sınırsız arılık + taşıma modu + sms |
| kurumsal | filo + çok kullanıcı |

---

## sensörlerle ilişki

| sensör | gezginci kullanım |
|--------|-------------------|
| tartı | yolda dengesizlik / düşme; yerleşince toparlanma |
| titreşim | taşıma darbesi, kaza |
| th | yeni iklim (Tortum soğuk / yayla) |
| ir | yerleşince uçuş başladı mı |
| mic | yerleşince oğul / stres (v2) |
| kamera (c) | kapı görüntüsü — yolda genelde kapalı |
| **gps** | yok (manuel arılık); sonra “konum eklentisi” |

eğim yine tartıdan.

---

## ekranlar

```
arılıklar
  → Yanıkdağ / Tortum / …
taşıma
  → başlat / bitir / hedef arılık seç
kovan listesi
  → filtre: bu arılık
özet
  → “12 kovan taşınıyor”
```

---

## alarm örnekleri

| durum | mesaj |
|-------|--------|
| taşıma + dengesizlik | kovan 7 — yolda dengesiz (devrilme şüphesi) |
| taşıma bitti | 12 kovan Tortum’a işlendi — yerleşme 48s başladı |
| yerleşme + ir düşük | kovan 14 — 24s az uçuş; kontrol et |
| taşıma dışı oğul | normal oğul riski skoru |

---

## rakip farkı

BeeHero / ApisProtect pollination taşıması kurumsal.  
**koloni:** Türk gezginci sideliner — manuel arılık + taşıma modu + düşük donanım + abonelik.

gps olmadan da gezginci çalışır; konum takibi istersen sonra eklenir.

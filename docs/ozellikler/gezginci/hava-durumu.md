# Hava durumu entegrasyonu

**Durum:** calisiyor (demo konum hava) / plan (canlı Open-Meteo)

**Amaç:** Kovanın **o anki konumuna** göre dış hava; kameralar destekleyici doğrulama.

---

## Ne işe yarar?

| Kullanım | Örnek |
|----------|--------|
| Oğul / uçuş yorumu | Yağmurda IR düşük → hastalık sanma |
| Görevler | Fırtına → taşıma ertele; don → yalıtım + **besleme (ayrı görev)** |
| Hasat / gezginci | Yaylada akış / yağış penceresi |
| Sağlık | Aşırı sıcak gün + kovan ısısı → gölge görevi |

Kovan içi sensör (DHT22) ≠ dış hava. İkisi birlikte daha doğru.

---

## Veri nereden gelir?

### 1. Konumdan otomatik (ana yol)
Kovanın `konumId` / `konumEtiket` → kayıtlı lat/lon → hava:

```
Ev · Yayla Tortum · Yayla 2 → sıcaklık, yağış, rüzgâr, nem, koşul
```

Kovan **ev → yayla → başka yayla** taşınınca konum güncellenir (`PATCH /api/hives/:id/konum`) → hava da o yere göre değişir.

### 2. Elle / seçmeli yer
Listeden konum seç (`GET /api/locations`). Yeni yayla eklenince listeye girilir.

### 3. Kamera analizi (destekleyici, opsiyonel)
| Kaynak | Ne çıkar |
|--------|----------|
| Ana kamera (arılık) | Yağmur / kar / sis / aydınlık |
| Kovan giriş kamerası | Islak eşik, uçuş azlığı görsel doğrulama |

Kamera **tek başına hava istasyonu değil**; konum API’sini doğrular  
(“API yağmur diyor + görüntü ıslak eşik”).

---

## API (demo)

| Endpoint | Ne |
|----------|-----|
| `GET /api/locations` | Kayıtlı yerler |
| `GET /api/weather?konum=Yayla Tortum` | O yerin havası |
| `GET /api/hives` → `weather` | Her kovanın konum havası + tips + kamera |
| `PATCH /api/hives/:id/konum` | `{ "konumId": "yayla-tortum" }` |

---

## Kovan bazında

```
Kovan 1  → Ev
Kovan 3  → Yayla Tortum
Kovan 4  → Yayla 2
Kovan 13 → Yayla Tortum (yağmur + düşük IR + kamera)
```

Hava kartı: **o kovanın konumundaki** hava (iç sıcaklık ayrı satırda).

---

## Görev örnekleri

| Hava + kovan | Görev |
|--------------|--------|
| Yağmur + düşük IR | Uçuş yok — normal (alarm yumuşat / tip) |
| Don riski | Besleme / yalıtım kontrol |
| Aşırı sıcak + kovan ısısı yüksek | Gölge / havalandır |
| Fırtına / kuvvetli rüzgâr | Taşımayı ertele |

**Bağlı:** `kovan-kaydi/konum.md` · `gezginci/` · kameralar

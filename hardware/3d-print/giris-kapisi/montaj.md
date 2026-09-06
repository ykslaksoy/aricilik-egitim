# Giriş kapısı — montaj adımları

## 1. Baskı

| Parça | STL | Katman | Dolgu |
|-------|-----|--------|-------|
| cerceve | `cerceve.stl` | 0,2 mm | %25 |
| surgu_kapak | `surgu_kapak.stl` | 0,2 mm | %30 |
| servo_braket | `servo_braket.stl` | 0,2 mm | %25 |

Brim önerilir (çerçeve tabanı düz).

## 2. Alt tahta hazırlığı

- Uçuş deliği **39 × 10 mm** (reducer ile de olur).
- Çerçeve dudakları deliğe oturmalı; boşluk varsa balmumu ile sızdırmaz bant.

## 3. Mekanik montaj

1. Sürgü kapağı kanala yerleştir — **sıkışmadan** kaymalı.
2. Servo braketini çerçevenin giriş tarafına M3 × 8 ile sabitle.
3. SG90 tak; kolu sürgü pimine bağla (baskı teli veya küçük PLA kol).
4. **Kalibrasyon:** güç ver → `servo-acilar.json` açılarını tek tek dene.

## 4. Elektrik

| Servo | Kovan kartı |
|-------|-------------|
| Kırmızı | 5 V (pil / regülatör — servo akımı yüksek) |
| Kahverengi | GND |
| Turuncu | GPIO PWM (plan) |

Servo hareketinde **IR ve mikrofon kabloları** sarkmamalı.

## 5. Yazılım testi

```http
PATCH /api/hives/:id/kapi
{ "mod": "manuel", "hedef": "dar" }
```

Sıra: `kapali` → `dar` → `orta` → `acik` → otomatik mod.

## 6. Bakım

- Petek propolisi kanalı tıkar — sezon başı temizle.
- Servo gıcırdarsa yağlama yok; braketi gevşet veya MG90S kullan.

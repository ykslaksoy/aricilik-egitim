# koloni — abonelik modeli

**Karar:** Donanım tek seferlik satılır; bulut, uygulama ve gelişmiş özellikler **abonelik** ile sunulur.

---

## Neden abonelik?

| Gelir kalemi | Açıklama |
|--------------|----------|
| **4G / SIM veri** | GATE başına aylık trafik |
| **Sunucu + depolama** | Geçmiş veri, alarm, yedek |
| **Yazılım güncellemesi** | Oğul/sağlık algoritması, mobil app |
| **ML geliştirme** | Saha verisi birikince model eğitimi |
| **Destek** | Kurulum, kalibrasyon, arıza |

Rakip referans (yurt dışı): ApisProtect ~$3–15/kovan/ay · BroodMinder Cell ~$17/ay · BeeHero ticari sözleşme.

---

## Paket yapısı (taslak)

| | **Başlangıç** | **Pro** | **Kurumsal** |
|--|---------------|---------|--------------|
| **Hedef** | 1–10 kovan · 1–2 arılık | 10–100 kovan · çok arılık | 100+ kovan · filo |
| **Aylık / kovan** | ~49–79 ₺ | ~99–149 ₺ | Sözleşme |
| **Geçmiş veri** | 7 gün | 90 gün | Sınırsız |
| **Canlı panel** | ✓ | ✓ | ✓ |
| **Push / SMS alarm** | ✓ (push) | ✓ + SMS | ✓ + öncelik |
| **Koloni + sağlık skoru** | ✓ | ✓ | ✓ |
| **Oğul risk + önleme** | ✓ | ✓ | ✓ |
| **Arı tahmini + kalibrasyon** | ✓ | ✓ | ✓ |
| **Gezginci / taşıma modu** | ~ (manuel) | ✓ | ✓ |
| **Kamera (C paket)** | — | ✓ | ✓ |
| **API erişimi** | — | ~ | ✓ |
| **Takım / çok kullanıcı** | — | 3 kullanıcı | Sınırsız |
| **ML / bölgesel model** | — | ~ (beta) | ✓ |

*Fiyatlar taslak; saha testi ve maliyet sonrası netleşir.*

---

## Donanım + abonelik ayrımı

| Tek seferlik (donanım) | Abonelik (yazılım + bulut) |
|------------------------|----------------------------|
| beepack S NODE (~3.000 ₺) | Panel, skorlar, alarm |
| beepack C (+ kamera, HUB) | Canlı görüntü, geçmiş |
| GATE (~5.100 ₺, arılık başı) | 4G veri payı, LoRa köprü |
| Kurulum / kalibrasyon (opsiyonel) | Güncelleme, destek |

**Abonelik olmadan:** Donanım yerel ağ / USB ile sınırlı demo; bulut geçmişi ve uzaktan izleme kapalı.

---

## Gelir örneği (30 kovan, Pro)

```
Donanım (ilk yıl):  30 × ~3.000 ₺ NODE  ≈ 90.000 ₺ (bir kez)
                    1 × GATE             ≈  5.100 ₺
Abonelik:           30 × 120 ₺/ay       ≈  3.600 ₺/ay  ≈ 43.200 ₺/yıl
```

Abonelik, 4G + sunucu maliyetini karşılar; kâr ve ML yatırımı için alan bırakır.

---

## Rekabet mesajı (güncel)

| Eski | Yeni |
|------|------|
| “Aboneliksiz” | “Düşük donanım + şeffaf aylık paket” |
| BeeTrack’ten fark | **Arı sayısı + öğlen kalibrasyon + oğul öncesi skor** abonelikte |

Abonelik fiyatını BeeTrack (150–200 ₺/ay) altında tutmak hedeflenebilir; değer **tahmini arı sayısı ve önleyici oğul listesi** ile gerekçelendirilir.

---

## Teknik (uygulama)

- `GET /api/hives` → abonelik planına göre `history` derinliği
- Ingest açık kalır; okuma / alarm / skor API anahtarı veya hesap planına bağlanır (ileride)
- Demo modu: plan simülasyonu `subscriptionTier: "pro"` env ile

Kod: `apps/api/src/server.js` · Plan dokümanı: bu dosya

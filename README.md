# SüperArı — hive demo

Akıllı kovan: **beepack** donanım + **SüperArı** web panelleri (eski ad: koloni).

## Çalıştır

```bash
npm install
npm run dev
```

Yerel: http://localhost:3847/giris.html

## Panel URL (güvenilir erişim)

Quick tunnel URL’leri değişebilir. **1-komut yeniden kurulum + sağlık:**

```bash
./scripts/panel-recover.sh
```

Bu komut API’yi doğrular/başlatır, tunnel watchdog’u tetikler, `docs/PUBLIC_LINKS.md` günceller ve 4 paneli sağlık kontrolünden geçirir.

Canlı linkler: [`docs/PUBLIC_LINKS.md`](docs/PUBLIC_LINKS.md) · sabit hosting notları: [`docs/SABIT_LINK.md`](docs/SABIT_LINK.md)

## Auth (hafif PIN)

Tek işletme demo (`koloni-demo`):

| Rol (ekran) | Panel | PIN |
|-------------|-------|-----|
| **Patron** | `/arici.html` — kovan · uyarı · muayene | `1111` |
| **Yönetici** | `/yonetici.html` | `1234` |
| **Çalışan** | `/isci.html` | `3333` |

SMS/WA zorunlu değil; hat yoksa uyarılar uygulama içi.

## 3 ekran (Patron)

1. **Kovan listesi** — durum / skor / ağırlık  
2. **Uyarılar** — in-app alarm kartları  
3. **Muayene kaydı** — `POST /api/hives/:id/journal`

## Skor / kapsam notu

| Alan | Durum |
|------|--------|
| **A** aHw donanım kalibrasyonu | **100** |
| **B + C + D** soft lig hedefleri | soft hedef tamamlandı |
| **R** saha tam | **bilerek ertelendi** |
| **O** prod operasyon (mağaza, Twilio, fatura, SLA) | **bilerek ertelendi** |

## Yapı

```
apps/api/     backend + colony.js
apps/web/     paneller (giriş / patron / yönetici / çalışan)
scripts/      panel-recover.sh · tunnel-watchdog.py
docs/         PUBLIC_LINKS · skor · planlar
```

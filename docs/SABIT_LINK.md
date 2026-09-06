# Sabit link — ne lazım?

Quick tunnel (`*.trycloudflare.com`, `*.lhr.life`) **her açılışta URL değiştirir** ve süreç düşünce ölür. Sabit adres için tünel değil **kalıcı hosting** (veya named tunnel + kendi domain) gerekir.

## Kısa karar

| Yol | Sabit mi? | 4–5 uygulama | Bu proje için |
|-----|-----------|--------------|---------------|
| Quick tunnel (şu an) | Hayır | Her seferinde yeniden | Sadece geçici demo |
| **Railway / Render / Fly** (Node’u olduğu gibi) | Evet (`xxx.up.railway.app`) | Her app 1 servis veya monorepo path | **En hızlı sabit link** |
| Cloudflare Pages + Workers | Evet | Alt path / subdomain | API’yi Worker’a taşımak gerekir |
| Named Cloudflare Tunnel + kendi domain | Evet (`panel.sizin.com`) | Tek makine, çok path | VM sürekli açık olmalı |
| **Supabase** | DB/Auth sabit; site ayrı | Ortak veri + giriş | Tek başına site host etmez |

**Öneri:** Kodu **GitHub**’a koyun → **Railway** GitHub’dan deploy etsin → sabit `*.up.railway.app` link. (`Procfile` + `railway.json` hazır.)

> Not: Yalnızca GitHub Pages bu uygulamayı sabitlemez (Express + SQLite gerekir). GitHub = kaynak; Railway/Render = sabit HTTPS.

---

## 0) GitHub + Railway (sabit link — sizin yapmanız gerekenler)

Bu ortamda `gh` oturumu yok; push sizin hesabınızdan:

1. GitHub’da boş repo açın (örn. `koloni-panel`)
2. Bu makinede veya bilgisayarınızda:
   ```bash
   cd hive-demo
   git init
   git add .
   git commit -m "koloni panel demo"
   git branch -M main
   git remote add origin https://github.com/KULLANICI/koloni-panel.git
   git push -u origin main
   ```
3. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** → repo’yu seçin
4. Railway sabit URL verir: `https://….up.railway.app/giris.html`
5. Sonraki güncellemeler: `git push` → aynı link kalır

SQLite notu: Railway’de disk geçici olabilir; kalıcı veri için Volume veya Postgres (Supabase) gerekir — demo için çoğu zaman yeterli.

---

## 1) En hızlı sabit link (önerilen)

Mevcut stack: Express + statik HTML + SQLite.

1. [railway.app](https://railway.app) (veya Render) hesap
2. Bu klasörü deploy — `Procfile` + `railway.json` hazır (`node apps/api/src/server.js`, port env `PORT`)
3. Tek sabit adres çıkar: örn. `https://koloni-panel.up.railway.app/giris.html`
4. Güncelleme = git push / yeniden deploy → **aynı link** kalır

4–5 uygulama için:

- `https://koloni.app/` → hub (giriş / uygulama seç)
- `https://koloni.app/panel/` · `/skor/` · `/…`  
  veya alt domain: `panel.`, `skor.`, `admin.`

Böylece telefonda **tek bookmark**; tünel yeniden açmaya gerek kalmaz.

---

## 2) Supabase ne işe yarar / yetmez?

Supabase verir:

- Postgres (paylaşılan DB)
- Auth (yönetici / arıcı / işçi PIN yerine gerçek giriş)
- Storage (foto, petek tarama)
- Realtime (canlı kovan)

Supabase **tek başına** Express demo’yu `giris.html` olarak yayınlamaz. Tipik kurgu:

```
[Web: Cloudflare Pages / Vercel]  →  sabit UI linkleri
         ↓
[API: Railway Node  VEYA  Supabase Edge Functions]
         ↓
[Supabase Postgres + Auth]
```

Avantaj (4–5 app): hepsi **aynı DB / aynı kullanıcı** → güncelleme bir yerden, linkler sabit.  
Maliyet: SQLite → Postgres taşıma + auth yazımı.

### Supabase kurulum iskeleti (ileride)

1. supabase.com → proje oluştur  
2. Tablo: `orgs`, `members`, `sessions`, `hives`, …  
3. Auth veya basit `members.pin_hash`  
4. Frontend env: `SUPABASE_URL` + `anon` key  
5. UI’yi Pages/Vercel’e koy; API ya Edge Function ya Railway  

“Sabit linkten güncelleme” = UI/API host’una deploy; Supabase şema/veri Dashboard veya migration ile.

---

## 3) Named Cloudflare Tunnel (domain’iniz varsa)

1. Cloudflare hesabı + domain (`koloni.com`)
2. `cloudflared tunnel create koloni`
3. DNS: `panel.koloni.com` → tunnel
4. Bu VM’de tunnel **sürekli** çalışır → URL hiç değişmez

Artı: kod taşımak yok. Eksi: agent/VM kapanınca site de kapanır (Railway kadar dayanıklı değil).

---

## Bu ortamda şimdi

- Kalıcı deploy hesabı / domain / Supabase projesi bu agent’ta yok.
- Quick tunnel yine geçici; düşerse URL yenilenir.
- Sabit adres için sizin tarafta **Railway (veya domain + named tunnel)** hesabı açılmalı; sonra deploy dosyalarını burada hazırlarız.

## Seçim sorusu

Hangisini istiyorsunuz?

1. **Railway sabit demo** (en az iş, aynı kod)
2. **Supabase + Pages** (ortak DB, daha sonra ölçek)
3. **Domain + named tunnel** (kod aynı, domain sizde)

# SüperArı bulut (Supabase)

Bulut, yapılandırma yokken tamamen kapalıdır; uygulama yalnız cihazda çalışır.

## Açmak için
1. Vercel Marketplace'ten Supabase'i `superari` projesine bağlayın; `SUPABASE_URL` (veya `NEXT_PUBLIC_SUPABASE_URL`) ve
   `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `*_PUBLISHABLE_KEY` ortam değişkenleri görünmeli. Sonra yeniden deploy edin.
   `/api/supabase-config` yalnız URL + anon/publishable anahtarı döndürür; service_role / sb_secret anahtarları reddedilir.
2. Supabase SQL Editor'de `migrations/20260927100000_superari_bulut.sql` dosyasını çalıştırın (tekrar çalıştırılabilir).
3. Authentication › URL Configuration: Site URL `https://superari.vercel.app`, Redirect URL `https://superari.vercel.app/hesap.html`.
4. (İsteğe bağlı) Magic Link e-posta şablonuna `{{ .Token }}` ekleyin: ana ekran uygulamasında kodla giriş için.
5. Google girişi: Google Cloud'da OAuth istemcisi oluşturup Supabase › Auth › Providers › Google'a girin.
6. Uygulamada Canlı modda Ayarlar › Hesap ve bulut › giriş › ilk yükleme › ekip daveti.

Demo verisi hiçbir zaman buluta gönderilmez.

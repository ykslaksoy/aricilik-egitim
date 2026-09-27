# SüperArı bulut (Supabase)

Bulut, yapılandırma yokken tamamen kapalıdır; uygulama yalnız cihazda çalışır.

## Açmak için
1. Vercel Marketplace'ten Supabase'i `superari` projesine bağlayın; `SUPABASE_URL` (veya `NEXT_PUBLIC_SUPABASE_URL`) ve
   `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `*_PUBLISHABLE_KEY` ortam değişkenleri görünmeli. Sonra yeniden deploy edin.
   `/api/supabase-config` yalnız URL + anon/publishable anahtarı döndürür; service_role / sb_secret anahtarları reddedilir.
   Entegrasyon önekli ad oluşturabilir (bu projede `Repo_` öneki: `Repo_SUPABASE_URL`, `Repo_SUPABASE_ANON_KEY` …); uç nokta önekli adları da okur.
2. Supabase SQL Editor'de `migrations/20260927100000_superari_bulut.sql` dosyasını çalıştırın (tekrar çalıştırılabilir).
3. Authentication › URL Configuration: Site URL `https://superari.vercel.app`, Redirect URL `https://superari.vercel.app/hesap.html`.
4. (İsteğe bağlı) Magic Link e-posta şablonuna `{{ .Token }}` ekleyin: ana ekran uygulamasında kodla giriş için.
5. E-posta + şifre girişi: Authentication › Providers › Email açık olmalı. «Confirm email» açıksa yeni hesap onay e-postasıyla etkinleşir.
   «Şifremi unuttum» bağlantısı `https://superari.vercel.app/hesap.html?sifre=yeni` adresine döner (Redirect URL listesinde `https://superari.vercel.app/hesap.html*` olmalı);
   «Reset Password» e-posta şablonu varsayılan haliyle çalışır. Varsayılan Supabase SMTP saatte birkaç e-posta gönderir; yoğun kullanımda özel SMTP gerekir.
6. Google girişi: Google Cloud'da OAuth istemcisi oluşturup Supabase › Auth › Providers › Google'a girin.
7. Ekip rolleri + bağlantıyla davet: SQL Editor'de `migrations/20260928090000_ekip_roller_davet_baglantisi.sql` dosyasını çalıştırın
   (roller: Sahip / Yardımcı / İzleyici; izleyici RLS ile salt okunur; tek kullanımlık 14 günlük davet bağlantısı `hesap.html?davet=<kod>`).
   Çalıştırılmazsa e-posta daveti eskisi gibi (Yardımcı) çalışır; İzleyici ve bağlantı daveti «veritabanı güncellemesi gerekli» der.
8. Uygulamada Canlı modda Ayarlar › Hesap ve bulut › giriş › ilk yükleme › ekip daveti.

Demo verisi hiçbir zaman buluta gönderilmez.

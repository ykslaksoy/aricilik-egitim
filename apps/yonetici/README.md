# SüperArı Yönetici

Şimdilik superari.vercel.app/yonetici/ altında (root vercel.json rewrite). Ayrı oturum anahtarı (sb-superari-yonetici-auth); uygulamayla bağlantı yok. Ayırmak için: Vercel projesi root=apps/yonetici, root vercel.json yonetici kurallarını kaldır.
Giriş: Supabase e-posta/şifre; `sa_is_admin()` true değilse oturum kapatılır. Veri erişimi RLS + yönetici RPC leriyle korunur.
Giriş: Supabase e-posta/şifre; `sa_is_admin()` true değilse oturum kapatılır. Veri erişimi RLS + yönetici RPC'leriyle korunur.
Bölümler: Fiyatı bulunamayan kalemler, Oğul skorları (ağırlık, ırk/melez, piping, sensör eşikleri, arılık oğul dönemleri), Oğul verisi eksik melezler.
`bulut.js`, `demo-data.js`, `panels.css`, `data/fiyat-ref.json` ana repodan (aricilik-egitim/apps/web) kopyadır; orada değişince buraya da kopyalanmalı.

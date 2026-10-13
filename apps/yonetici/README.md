# SüperArı Yönetici

Ayrı yönetici paneli (superari-yonetici.vercel.app). Ana uygulamayla aynı Supabase projesi (ssminvxldxaqnzizbrfy), yalnız anon anahtar.
Giriş: Supabase e-posta/şifre; `sa_is_admin()` true değilse oturum kapatılır. Veri erişimi RLS + yönetici RPC'leriyle korunur.
Bölümler: Fiyatı bulunamayan kalemler, Oğul skorları (ağırlık, ırk/melez, piping, sensör eşikleri, arılık oğul dönemleri), Oğul verisi eksik melezler.
`bulut.js`, `demo-data.js`, `panels.css`, `data/fiyat-ref.json` ana repodan (aricilik-egitim/apps/web) kopyadır; orada değişince buraya da kopyalanmalı.

# SüperArı Yönetici

Şimdilik superari.vercel.app/yonetici/ altında (root vercel.json rewrite). Ayrı oturum anahtarı (sb-superari-yonetici-auth); uygulamayla bağlantı yok. Ayırmak için: Vercel projesi root=apps/yonetici, root vercel.json yonetici kurallarını kaldır.
Giriş: Supabase e-posta/şifre; `sa_is_admin()` true değilse oturum kapatılır. Veri erişimi RLS + yönetici RPC leriyle korunur.
Giriş: Supabase e-posta/şifre; `sa_is_admin()` true değilse oturum kapatılır. Veri erişimi RLS + yönetici RPC'leriyle korunur.
Bölümler: Fiyatı bulunamayan kalemler, Oğul skorları (ağırlık, ırk/melez, piping, sensör eşikleri, arılık oğul dönemleri), Oğul verisi eksik melezler.
`bulut.js`, `demo-data.js`, `panels.css`, `data/fiyat-ref.json` ana repodan (aricilik-egitim/apps/web) kopyadır; orada değişince buraya da kopyalanmalı.

## Otomatik Takip (tablo `otomatik_takip`)
Rutinler sonucu servis olarak yazar (Supabase management API `POST /v1/projects/ssminvxldxaqnzizbrfy/database/query`, token yalnız ortam değişkeninden). `sonuc`: `basarili` | `hata` | `bekliyor`.

Bal ormanları (her gün 09:00 TSİ):
```sql
insert into public.otomatik_takip (id, ad, zamanlama, son_deneme, sonuc, sonraki_deneme, not_kisa, guncelleme)
values ('bal-ormanlari', 'Bal ormanları günlük kontrol', 'Her gün 09:00 TSİ', now(), 'hata',
        (date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '1 day 9 hours') at time zone 'Europe/Istanbul',
        'Bakanlık sunucusu HTTP 500', now())
on conflict (id) do update set son_deneme = excluded.son_deneme, sonuc = excluded.sonuc,
  sonraki_deneme = excluded.sonraki_deneme, not_kisa = excluded.not_kisa, guncelleme = now();
```

Kaynak araştırma (haftalık): önce madde başına, sonra özet satırı:
```sql
update public.yapilacaklar set son_arama = now(), arama_sonuc = 'Bulunamadı (TAGEM, DergiPark, Google Scholar)' where id = 9;
-- kaynak bulunduysa: arama_sonuc = 'Bulundu: <atıf/doi>' (değer güncellenince madde 'tamam' yapılır)
insert into public.otomatik_takip (id, ad, zamanlama, son_deneme, sonuc, sonraki_deneme, not_kisa, guncelleme)
values ('kaynak-arastirma', 'Kaynak araştırma (haftalık)', 'Haftada bir', now(), 'basarili', now() + interval '7 days', '30 madde arandı, 0 kaynak bulundu', now())
on conflict (id) do update set son_deneme = excluded.son_deneme, sonuc = excluded.sonuc,
  sonraki_deneme = excluded.sonraki_deneme, not_kisa = excluded.not_kisa, guncelleme = now();
```
`cevre-kuyruk` satırının durumu panelde canlı olarak `cevre_kuyruk` tablosundan hesaplanır.

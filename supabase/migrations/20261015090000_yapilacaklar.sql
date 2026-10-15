-- koloni-164: yönetici Yapılacaklar listesi (yalnız admin)
create table if not exists public.yapilacaklar (
  id bigserial primary key, baslik text not null, aciklama text not null default '',
  durum text not null default 'acik' check (durum in ('acik', 'yapiliyor', 'tamam')),
  olusturma timestamptz not null default now(), guncelleme timestamptz not null default now()
);
alter table public.yapilacaklar enable row level security;
drop policy if exists sa_yapilacaklar_admin on public.yapilacaklar;
create policy sa_yapilacaklar_admin on public.yapilacaklar for all to authenticated using (public.sa_is_admin()) with check (public.sa_is_admin());
revoke all on public.yapilacaklar from anon;
grant select, insert, update, delete on public.yapilacaklar to authenticated;
grant usage on sequence public.yapilacaklar_id_seq to authenticated;
insert into public.yapilacaklar (baslik, aciklama, durum)
select v.b, v.a, v.d from (values
 ('Brevo e-posta testi', 'Brevo SMTP gerçek üyelik/şifre e-postasıyla test edilecek.', 'acik'),
 ('Bal ormanları boş', 'Bakanlık Arıcılık Haritası uç noktası hata veriyor; tablo boş, rota bağlantısı hazır.', 'acik'),
 ('Çiçek takvimi 6 ilde', 'Rize, Erzurum, Ordu, Artvin, Muğla, Antalya yüklü; diğer iller istek (takvim_eksik) geldikçe.', 'acik'),
 ('Puansız ırk/melez', 'Kafkas × Muğla, Karadeniz × Muğla, Karadeniz × Anadolu için genetik puan yok.', 'acik'),
 ('Ses ve iklim uyarıları örnek veriyle', 'Gerçek sensör/gateway bağlanacak.', 'acik'),
 ('Vızıldama → Vakvaklama adı', 'Terim kararı bekleniyor.', 'acik'),
 ('bakim-ana-sync testi', 'Bakım/Muayene/Stok Ana CSS''inden geri kalmıştı; senkronlandı, test geçiyor.', 'tamam'),
 ('Yönetici paneli canlıda 403', 'yonetici-ayri dalı kontrol edilecek (main''e merge edilmedi).', 'acik')
) as v(b, a, d)
where not exists (select 1 from public.yapilacaklar);

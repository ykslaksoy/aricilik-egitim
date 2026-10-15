-- Otomatik takip: rutin işlerin son durumu (yalnız yönetici okur; servis rolü / management API yazar)
create table if not exists public.otomatik_takip (
  id text primary key,
  ad text not null,
  zamanlama text,
  son_deneme timestamptz,
  sonuc text check (sonuc in ('basarili', 'hata', 'bekliyor')),
  sonraki_deneme timestamptz,
  not_kisa text,
  guncelleme timestamptz not null default now()
);
alter table public.otomatik_takip enable row level security;
drop policy if exists otomatik_takip_admin_okur on public.otomatik_takip;
create policy otomatik_takip_admin_okur on public.otomatik_takip for select to authenticated using (public.sa_is_admin());
revoke all on public.otomatik_takip from anon;
-- Yalnız gerçek bilgi: zaman bilinmiyorsa null (panelde «Veri yok»).
insert into public.otomatik_takip (id, ad, zamanlama, sonuc, not_kisa) values
  ('bal-ormanlari', 'Bal ormanları günlük kontrol', 'Her gün 09:00 TSİ', 'hata', 'Bakanlık sunucusu son denemelerde 500 hatası veriyor.'),
  ('cevre-kuyruk', 'Çevre/su kuyruğu', 'Hata alınca 2, 4, 8 dk… en çok 24 saat arayla yeniden dener', null, 'Durum canlı olarak cevre_kuyruk tablosundan okunur.')
on conflict (id) do nothing;

-- Haftalık kaynak araştırması: madde başına son arama tarihi ve sonucu (null = hiç aranmadı → «Veri yok»)
alter table public.yapilacaklar add column if not exists son_arama timestamptz;
alter table public.yapilacaklar add column if not exists arama_sonuc text;
insert into public.otomatik_takip (id, ad, zamanlama, sonuc, not_kisa) values
  ('kaynak-arastirma', 'Kaynak araştırma (haftalık)', 'Haftada bir', null, 'Yapılacaklar’daki «Uzman tahmini · kaynak aranıyor» ve «kaynak zayıf» maddeleri için hakemli kaynak aranır.')
on conflict (id) do nothing;

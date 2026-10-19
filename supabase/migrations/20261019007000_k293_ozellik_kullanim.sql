-- koloni-293: Özellik kullanım takibi (olaylar + yönetici özet RPC). Canlıya bu commit ile uygulanmaz.

create table if not exists public.ozellik_kullanim_tanim (
  ozellik text primary key,
  ad text not null,
  aciklama text not null default '',
  sira int not null default 0
);

create table if not exists public.ozellik_kullanim_olay (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ozellik text not null references public.ozellik_kullanim_tanim(ozellik) on delete restrict,
  olusturma timestamptz not null default now()
);

create index if not exists ozellik_kullanim_olay_ozellik_ts on public.ozellik_kullanim_olay (ozellik, olusturma desc);
create index if not exists ozellik_kullanim_olay_user_ts on public.ozellik_kullanim_olay (user_id, olusturma desc);

alter table public.ozellik_kullanim_tanim enable row level security;
alter table public.ozellik_kullanim_olay enable row level security;

drop policy if exists okt_herkes_okur on public.ozellik_kullanim_tanim;
create policy okt_herkes_okur on public.ozellik_kullanim_tanim for select to anon, authenticated using (true);

drop policy if exists oko_kendi_yazar on public.ozellik_kullanim_olay;
create policy oko_kendi_yazar on public.ozellik_kullanim_olay for insert to authenticated
  with check (user_id = auth.uid());

grant select on public.ozellik_kullanim_tanim to anon, authenticated;
grant insert on public.ozellik_kullanim_olay to authenticated;
grant usage on sequence public.ozellik_kullanim_olay_id_seq to authenticated;

insert into public.ozellik_kullanim_tanim (ozellik, ad, aciklama, sira) values
 ('muayene', 'Muayene', 'Bakım / muayene akışı sayfaları (bakim, bakim-yap, bakim-akis, bakim-plan).', 10),
 ('sesli_muayene', 'Sesli muayene', 'Sesle muayene oturumu başlatıldığında (SuperAriSesle.start).', 20),
 ('tarti', 'Tartı', 'Kovanlar › Tartı görünümü ve tartım kayıtları.', 30),
 ('kovanlar', 'Kovanlar', 'Kovan listesi ve kovan detayı.', 40),
 ('ogul', 'Oğul', 'Oğul uyarıları ve oğul ekranı (uyarilar?view=ogul).', 50),
 ('koloni', 'Koloni', 'Koloniler / güç dağılımı görünümü (kovanlar?view=koloni).', 60),
 ('raporlar', 'Raporlar', 'Raporlar ve rapor alt sayfaları.', 70),
 ('hava', 'Hava', 'Hava tahmini ve hava raporu sayfaları.', 80),
 ('cihazlar', 'Cihazlar', 'Cihaz listesi ve bağlantı durumu.', 90),
 ('kamera', 'Kamera', 'Kamera ekranı.', 100),
 ('tasinma_plani', 'Taşınma planı', 'Göç / taşınma planlayıcı (goc.html).', 110),
 ('ayarlar', 'Ayarlar', 'Ayarlar sayfası.', 120)
on conflict (ozellik) do update set ad = excluded.ad, aciklama = excluded.aciklama, sira = excluded.sira;

insert into public.ozellik_bayraklari (anahtar, ad, aciklama, acik) values
 ('kullanim_takip', 'Özellik kullanım takibi',
  'Açıkken uygulama hangi özelliğin ne zaman açıldığını (yalnız özellik adı + hesap kimliği) kaydeder; kişisel içerik saklanmaz. Kapalıyken olay gönderilmez.', true)
on conflict (anahtar) do update set ad = excluded.ad, aciklama = excluded.aciklama, guncellendi = now();

create or replace function public.sa_ozellik_kullanim_ozet()
returns table (
  ozellik text,
  ad text,
  aciklama text,
  sira int,
  acilis_7 bigint,
  acilis_30 bigint,
  kullanici_7 bigint,
  kullanici_30 bigint,
  son_kullanim timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sa_is_admin() then
    raise exception 'Yalnız yönetici' using errcode = '42501';
  end if;
  return query
  select
    t.ozellik,
    t.ad,
    t.aciklama,
    t.sira,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '7 days'), 0)::bigint,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '30 days'), 0)::bigint,
    coalesce(count(distinct o.user_id) filter (where o.olusturma >= now() - interval '7 days'), 0)::bigint,
    coalesce(count(distinct o.user_id) filter (where o.olusturma >= now() - interval '30 days'), 0)::bigint,
    max(o.olusturma)
  from public.ozellik_kullanim_tanim t
  left join public.ozellik_kullanim_olay o on o.ozellik = t.ozellik
  group by t.ozellik, t.ad, t.aciklama, t.sira
  order by 6 desc, 5 desc, t.sira asc;
end;
$$;

revoke all on function public.sa_ozellik_kullanim_ozet() from public;
grant execute on function public.sa_ozellik_kullanim_ozet() to authenticated;

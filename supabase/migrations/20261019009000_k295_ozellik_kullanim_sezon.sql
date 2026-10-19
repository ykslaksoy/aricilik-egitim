-- koloni-295: Özellik kullanımı — arılık/dönem alanları, toplam sayımlar, sezon raporu RPC. Canlıya bu commit ile uygulanmaz.

alter table public.ozellik_kullanim_olay
  add column if not exists arilik_id text,
  add column if not exists arilik_ad text,
  add column if not exists sezon_yili int,
  add column if not exists donem_tipi text not null default 'belirsiz',
  add column if not exists donem_sira int,
  add column if not exists donem_etiket text not null default 'Belirsiz';

create index if not exists ozellik_kullanim_olay_sezon on public.ozellik_kullanim_olay (sezon_yili, arilik_id, donem_etiket);

create or replace function public.sa_ozellik_kullanim_sezon_yili(ts timestamptz)
returns int
language sql
immutable
as $$
  select case
    when extract(month from ts at time zone 'UTC') <= 2 then extract(year from ts at time zone 'UTC')::int - 1
    else extract(year from ts at time zone 'UTC')::int
  end;
$$;

drop function if exists public.sa_ozellik_kullanim_ozet();
drop function if exists public.sa_ozellik_kullanim_kullanicilar();
drop function if exists public.sa_ozellik_kullanim_kullanici_detay(uuid);

create or replace function public.sa_ozellik_kullanim_ozet()
returns table (
  ozellik text,
  ad text,
  aciklama text,
  sira int,
  acilis_toplam bigint,
  acilis_7 bigint,
  acilis_30 bigint,
  kullanici_toplam bigint,
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
    coalesce(count(o.id), 0)::bigint,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '7 days'), 0)::bigint,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '30 days'), 0)::bigint,
    coalesce(count(distinct o.user_id), 0)::bigint,
    coalesce(count(distinct o.user_id) filter (where o.olusturma >= now() - interval '7 days'), 0)::bigint,
    coalesce(count(distinct o.user_id) filter (where o.olusturma >= now() - interval '30 days'), 0)::bigint,
    max(o.olusturma)
  from public.ozellik_kullanim_tanim t
  left join public.ozellik_kullanim_olay o on o.ozellik = t.ozellik
  group by t.ozellik, t.ad, t.aciklama, t.sira
  order by 7 desc, 6 desc, 5 desc, t.sira asc;
end;
$$;

create or replace function public.sa_ozellik_kullanim_kullanicilar()
returns table (
  user_id uuid,
  ad_eposta text,
  toplam bigint,
  toplam_7 bigint,
  toplam_30 bigint,
  ust_ozellikler text,
  son_giris timestamptz,
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
  with olay_agg as (
    select
      o.user_id,
      o.ozellik,
      count(*)::bigint as cnt,
      count(*) filter (where o.olusturma >= now() - interval '7 days')::bigint as cnt7,
      count(*) filter (where o.olusturma >= now() - interval '30 days')::bigint as cnt30,
      max(o.olusturma) as son
    from public.ozellik_kullanim_olay o
    group by o.user_id, o.ozellik
  ),
  toplam as (
    select
      user_id,
      sum(cnt)::bigint as toplam,
      sum(cnt7)::bigint as toplam_7,
      sum(cnt30)::bigint as toplam_30,
      max(son) as son_kullanim
    from olay_agg
    group by user_id
  ),
  olay_30 as (
    select user_id, ozellik, cnt30 as cnt
    from olay_agg
    where cnt30 > 0
  ),
  sirali as (
    select o30.user_id, t.ad, o30.cnt,
      row_number() over (partition by o30.user_id order by o30.cnt desc, t.sira asc) as rn
    from olay_30 o30
    join public.ozellik_kullanim_tanim t on t.ozellik = o30.ozellik
  ),
  ust as (
    select user_id, string_agg(ad, ' · ' order by rn) as ust_ozellikler
    from sirali
    where rn <= 3
    group by user_id
  )
  select
    t.user_id,
    coalesce(nullif(trim(p.display_name), ''), p.email, au.email::text, 'Veri yok') as ad_eposta,
    t.toplam,
    t.toplam_7,
    t.toplam_30,
    coalesce(ust.ust_ozellikler, 'Veri yok'),
    au.last_sign_in_at,
    t.son_kullanim
  from toplam t
  join auth.users au on au.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  left join ust on ust.user_id = t.user_id
  where t.toplam_30 > 0
  order by t.toplam_30 desc, t.toplam desc, t.son_kullanim desc nulls last;
end;
$$;

create or replace function public.sa_ozellik_kullanim_kullanici_detay(p_user_id uuid)
returns table (
  ozellik text,
  ad text,
  aciklama text,
  sira int,
  acilis_toplam bigint,
  acilis_7 bigint,
  acilis_30 bigint,
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
  if p_user_id is null then
    raise exception 'user_id gerekli' using errcode = '22023';
  end if;
  return query
  select
    t.ozellik,
    t.ad,
    t.aciklama,
    t.sira,
    coalesce(count(o.id), 0)::bigint,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '7 days'), 0)::bigint,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '30 days'), 0)::bigint,
    max(o.olusturma) filter (where o.user_id = p_user_id)
  from public.ozellik_kullanim_tanim t
  left join public.ozellik_kullanim_olay o
    on o.ozellik = t.ozellik and o.user_id = p_user_id
  group by t.ozellik, t.ad, t.aciklama, t.sira
  order by 7 desc, 6 desc, 5 desc, t.sira asc;
end;
$$;

create or replace function public.sa_ozellik_kullanim_sezon(p_yil int, p_user_id uuid default null)
returns table (
  arilik_id text,
  arilik_ad text,
  donem_tipi text,
  donem_sira int,
  donem_etiket text,
  ozellik text,
  ozellik_ad text,
  ozellik_sira int,
  adet bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sa_is_admin() then
    raise exception 'Yalnız yönetici' using errcode = '42501';
  end if;
  if p_yil is null or p_yil < 2000 or p_yil > 2100 then
    raise exception 'Geçerli sezon yılı gerekli' using errcode = '22023';
  end if;
  return query
  select
    coalesce(o.arilik_id, '') as arilik_id,
    coalesce(nullif(trim(o.arilik_ad), ''), 'Belirsiz') as arilik_ad,
    coalesce(nullif(trim(o.donem_tipi), ''), 'belirsiz') as donem_tipi,
    o.donem_sira,
    coalesce(nullif(trim(o.donem_etiket), ''), 'Belirsiz') as donem_etiket,
    t.ozellik,
    t.ad as ozellik_ad,
    t.sira as ozellik_sira,
    count(o.id)::bigint as adet
  from public.ozellik_kullanim_olay o
  join public.ozellik_kullanim_tanim t on t.ozellik = o.ozellik
  where coalesce(o.sezon_yili, public.sa_ozellik_kullanim_sezon_yili(o.olusturma)) = p_yil
    and (p_user_id is null or o.user_id = p_user_id)
  group by
    coalesce(o.arilik_id, ''),
    coalesce(nullif(trim(o.arilik_ad), ''), 'Belirsiz'),
    coalesce(nullif(trim(o.donem_tipi), ''), 'belirsiz'),
    o.donem_sira,
    coalesce(nullif(trim(o.donem_etiket), ''), 'Belirsiz'),
    t.ozellik, t.ad, t.sira
  order by
    2 asc,
    case coalesce(nullif(trim(o.donem_tipi), ''), 'belirsiz') when 'konum' then 0 when 'kislatma' then 1 else 2 end,
    o.donem_sira nulls last,
    5 asc,
    t.sira asc;
end;
$$;

revoke all on function public.sa_ozellik_kullanim_sezon_yili(timestamptz) from public;
revoke all on function public.sa_ozellik_kullanim_sezon(int, uuid) from public;
grant execute on function public.sa_ozellik_kullanim_sezon_yili(timestamptz) to authenticated;
grant execute on function public.sa_ozellik_kullanim_sezon(int, uuid) to authenticated;

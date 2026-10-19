-- koloni-294: Özellik kullanımı — kullanıcı bazlı özet (yalnız yönetici RPC; olay tablosu doğrudan okunamaz)

revoke select on public.ozellik_kullanim_olay from anon, authenticated;

create or replace function public.sa_ozellik_kullanim_kullanicilar()
returns table (
  user_id uuid,
  ad_eposta text,
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
  with olay_30 as (
    select o.user_id, o.ozellik, count(*)::bigint as cnt, max(o.olusturma) as son
    from public.ozellik_kullanim_olay o
    where o.olusturma >= now() - interval '30 days'
    group by o.user_id, o.ozellik
  ),
  toplam as (
    select user_id, sum(cnt)::bigint as toplam_30, max(son) as son_kullanim
    from olay_30
    group by user_id
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
    t.toplam_30,
    coalesce(ust.ust_ozellikler, 'Veri yok'),
    au.last_sign_in_at,
    t.son_kullanim
  from toplam t
  join auth.users au on au.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  left join ust on ust.user_id = t.user_id
  order by t.toplam_30 desc, t.son_kullanim desc nulls last;
end;
$$;

create or replace function public.sa_ozellik_kullanim_kullanici_detay(p_user_id uuid)
returns table (
  ozellik text,
  ad text,
  aciklama text,
  sira int,
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
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '7 days'), 0)::bigint,
    coalesce(count(o.id) filter (where o.olusturma >= now() - interval '30 days'), 0)::bigint,
    max(o.olusturma) filter (where o.user_id = p_user_id)
  from public.ozellik_kullanim_tanim t
  left join public.ozellik_kullanim_olay o
    on o.ozellik = t.ozellik and o.user_id = p_user_id
  group by t.ozellik, t.ad, t.aciklama, t.sira
  order by 6 desc, 5 desc, t.sira asc;
end;
$$;

revoke all on function public.sa_ozellik_kullanim_kullanicilar() from public;
revoke all on function public.sa_ozellik_kullanim_kullanici_detay(uuid) from public;
grant execute on function public.sa_ozellik_kullanim_kullanicilar() to authenticated;
grant execute on function public.sa_ozellik_kullanim_kullanici_detay(uuid) to authenticated;

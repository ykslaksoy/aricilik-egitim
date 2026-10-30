-- koloni-299: Cihaz geçmişi — kovan/arılık atama, taşıma, söküm (sensör ham arşivinden ayrı).

create table if not exists public.cihaz_gecmis (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id text not null,
  tur text not null check (tur in ('atama', 'tasima', 'sokum')),
  at timestamptz not null default now(),
  tip text,
  cihaz_ad text,
  apiary_id uuid,
  arilik_ad text,
  kovan_id int,
  kovan_ad text,
  once_json jsonb,
  not_metin text,
  kaynak text,
  goc_id text,
  created_at timestamptz not null default now()
);

create index if not exists cihaz_gecmis_user_at on public.cihaz_gecmis (user_id, at desc);
create index if not exists cihaz_gecmis_device on public.cihaz_gecmis (user_id, device_id, at desc);

alter table public.cihaz_gecmis enable row level security;
drop policy if exists cihaz_gecmis_oku on public.cihaz_gecmis;
create policy cihaz_gecmis_oku on public.cihaz_gecmis for select to authenticated
  using (user_id = auth.uid() or public.sa_is_admin());
drop policy if exists cihaz_gecmis_yaz on public.cihaz_gecmis;
create policy cihaz_gecmis_yaz on public.cihaz_gecmis for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.sa_cihaz_gecmis_yaz(
  p_device text, p_tur text, p_at timestamptz default now(),
  p_tip text default null, p_cihaz_ad text default null,
  p_apiary uuid default null, p_arilik_ad text default null,
  p_kovan_id int default null, p_kovan_ad text default null,
  p_once jsonb default null, p_not text default null,
  p_kaynak text default null, p_goc_id text default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint;
begin
  if p_device is null or length(p_device) > 120 then raise exception 'Geçersiz cihaz'; end if;
  if p_tur is null or p_tur not in ('atama', 'tasima', 'sokum') then raise exception 'Geçersiz olay'; end if;
  insert into public.cihaz_gecmis (user_id, device_id, tur, at, tip, cihaz_ad, apiary_id, arilik_ad, kovan_id, kovan_ad, once_json, not_metin, kaynak, goc_id)
  values (auth.uid(), p_device, p_tur, coalesce(p_at, now()), p_tip, p_cihaz_ad, p_apiary, p_arilik_ad, p_kovan_id, p_kovan_ad, p_once, p_not, p_kaynak, p_goc_id)
  returning id into nid;
  return nid;
end $$;
revoke all on function public.sa_cihaz_gecmis_yaz(text, text, timestamptz, text, text, uuid, text, int, text, jsonb, text, text, text) from public, anon;
grant execute on function public.sa_cihaz_gecmis_yaz(text, text, timestamptz, text, text, uuid, text, int, text, jsonb, text, text, text) to authenticated;

create or replace function public.sa_admin_cihaz_gecmis(p_limit int default 300)
returns table (
  id bigint, user_id uuid, email text, device_id text, tur text, at timestamptz,
  tip text, cihaz_ad text, arilik_ad text, kovan_ad text, once_json jsonb, kaynak text
) language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query
    select c.id, c.user_id, u.email::text, c.device_id, c.tur, c.at,
      c.tip, c.cihaz_ad, c.arilik_ad, c.kovan_ad, c.once_json, c.kaynak
    from public.cihaz_gecmis c
    left join auth.users u on u.id = c.user_id
    order by c.at desc
    limit greatest(1, least(coalesce(p_limit, 300), 1000));
end $$;
revoke all on function public.sa_admin_cihaz_gecmis(int) from public, anon;
grant execute on function public.sa_admin_cihaz_gecmis(int) to authenticated;

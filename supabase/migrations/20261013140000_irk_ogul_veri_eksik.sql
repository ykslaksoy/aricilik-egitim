-- SüperArı: Oğul verisi eksik melezler → yönetici (koloni-126).
-- Oğul riskinde yayında oğul verisi bulunmayan melez ırk anahtarları (ör. kafkas+karadeniz) oturum açmış
-- istemcilerden toplanır; yalnız yönetici okur (apps/web/yonetici.html «Oğul verisi eksik melezler»).
-- fiyat_eksik ile aynı desen; sa_is_admin() 20261003230000_fiyat_eksik.sql'den gelir (önce o çalışmış olmalı).
-- Supabase → SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

create table if not exists public.irk_ogul_eksik (
  key text primary key,
  name text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  seen_count integer not null default 0,
  last_user uuid references auth.users (id) on delete set null,
  app_version text
);
create index if not exists irk_ogul_eksik_last_idx on public.irk_ogul_eksik (last_seen desc);
create table if not exists public.irk_ogul_eksik_kullanici (
  key text not null references public.irk_ogul_eksik (key) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  seen_count integer not null default 0,
  primary key (key, user_id)
);
alter table public.irk_ogul_eksik enable row level security;
alter table public.irk_ogul_eksik_kullanici enable row level security;
revoke all on public.irk_ogul_eksik from anon, authenticated;
revoke all on public.irk_ogul_eksik_kullanici from anon, authenticated;
drop policy if exists irk_ogul_eksik_admin_read on public.irk_ogul_eksik;
create policy irk_ogul_eksik_admin_read on public.irk_ogul_eksik for select to authenticated using (public.sa_is_admin());
grant select on public.irk_ogul_eksik to authenticated;

-- Yazma: oturum açmış kullanıcı (en çok 30 melez / çağrı; aynı kullanıcı + melez saatte bir kez sayılır).
create or replace function public.sa_report_irk_ogul_eksik(p_items jsonb, p_version text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  it jsonb;
  k text;
  n integer := 0;
begin
  if me is null then raise exception 'Oturum yok'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then return 0; end if;
  for it in select * from jsonb_array_elements(p_items) limit 30 loop
    k := left(btrim(coalesce(it->>'key', '')), 80);
    if k = '' or k !~ '^[a-z0-9+_-]+$' then continue; end if;
    if exists (select 1 from public.irk_ogul_eksik_kullanici where key = k and user_id = me and last_seen > now() - interval '1 hour') then continue; end if;
    insert into public.irk_ogul_eksik as f (key, name, seen_count, last_user, app_version)
    values (k, left(it->>'name', 120), 1, me, left(p_version, 40))
    on conflict (key) do update set
      name = coalesce(excluded.name, f.name), last_seen = now(), seen_count = f.seen_count + 1,
      last_user = me, app_version = coalesce(excluded.app_version, f.app_version);
    insert into public.irk_ogul_eksik_kullanici as u (key, user_id, seen_count) values (k, me, 1)
    on conflict (key, user_id) do update set last_seen = now(), seen_count = u.seen_count + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.sa_report_irk_ogul_eksik(jsonb, text) from public;
revoke all on function public.sa_report_irk_ogul_eksik(jsonb, text) from anon;
grant execute on function public.sa_report_irk_ogul_eksik(jsonb, text) to authenticated;

-- Yönetici listesi: en yeni önce, kaç kullanıcıda görüldüğü ve son bildirenin e-postasıyla.
create or replace function public.sa_irk_ogul_eksik_list(p_limit integer default 200)
returns table (key text, name text, first_seen timestamptz, last_seen timestamptz, seen_count integer, users integer, last_email text, app_version text)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query
    select f.key, f.name, f.first_seen, f.last_seen, f.seen_count,
      (select count(*)::int from public.irk_ogul_eksik_kullanici x where x.key = f.key),
      (select u.email::text from auth.users u where u.id = f.last_user),
      f.app_version
    from public.irk_ogul_eksik f
    order by f.last_seen desc
    limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;
revoke all on function public.sa_irk_ogul_eksik_list(integer) from public;
revoke all on function public.sa_irk_ogul_eksik_list(integer) from anon;
grant execute on function public.sa_irk_ogul_eksik_list(integer) to authenticated;

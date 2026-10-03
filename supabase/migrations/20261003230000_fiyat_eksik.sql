-- SüperArı: Fiyatı bulunamayan kalemler → yönetici (koloni-68).
-- Alım talebinde alınacak olup fiyatı olmayan (kullanıcı fiyatı da kaynak fiyatı da yok) kalem anahtarları
-- oturum açmış istemcilerden toplanır; yalnız yönetici okur (apps/web/yonetici.html «Fiyatı bulunamayan kalemler»).
-- Supabase → SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

-- (1) Yönetici tanımı: e-posta listesi (doğrulanmış e-postayla giriş yapan hesap yöneticidir).
create table if not exists public.sa_admins (
  email text primary key check (email = lower(email)),
  note text,
  created_at timestamptz not null default now()
);
alter table public.sa_admins enable row level security;
revoke all on public.sa_admins from anon, authenticated;
insert into public.sa_admins (email, note) values ('ykslaksoy@gmail.com', 'işletici') on conflict (email) do nothing;

create or replace function public.sa_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users u join public.sa_admins a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.sa_is_admin() from public;
grant execute on function public.sa_is_admin() to authenticated;

-- (2) Kayıt tablosu: anahtar başına tek satır (tekilleştirilmiş); kullanıcı başına ayrıntı ayrı tabloda.
create table if not exists public.fiyat_eksik (
  key text primary key,
  name text,
  unit text,
  last_scope text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  seen_count integer not null default 0,
  last_user uuid references auth.users (id) on delete set null,
  app_version text
);
create index if not exists fiyat_eksik_last_idx on public.fiyat_eksik (last_seen desc);
create table if not exists public.fiyat_eksik_kullanici (
  key text not null references public.fiyat_eksik (key) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  seen_count integer not null default 0,
  primary key (key, user_id)
);
alter table public.fiyat_eksik enable row level security;
alter table public.fiyat_eksik_kullanici enable row level security;
revoke all on public.fiyat_eksik from anon, authenticated;
revoke all on public.fiyat_eksik_kullanici from anon, authenticated;
-- Okuma: yalnız yönetici (doğrudan select de RPC de)
drop policy if exists fiyat_eksik_admin_read on public.fiyat_eksik;
create policy fiyat_eksik_admin_read on public.fiyat_eksik for select to authenticated using (public.sa_is_admin());
grant select on public.fiyat_eksik to authenticated;

-- (3) Yazma: oturum açmış kullanıcı (en çok 60 kalem / çağrı; aynı kullanıcı + kalem saatte bir kez sayılır).
create or replace function public.sa_report_fiyat_eksik(p_items jsonb, p_version text default null)
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
  for it in select * from jsonb_array_elements(p_items) limit 60 loop
    k := left(btrim(coalesce(it->>'key', '')), 80);
    if k = '' or k ~ '[[:cntrl:]]' then continue; end if;
    if exists (select 1 from public.fiyat_eksik_kullanici where key = k and user_id = me and last_seen > now() - interval '1 hour') then continue; end if;
    insert into public.fiyat_eksik as f (key, name, unit, last_scope, seen_count, last_user, app_version)
    values (k, left(it->>'name', 120), left(it->>'unit', 20), left(it->>'scope', 80), 1, me, left(p_version, 40))
    on conflict (key) do update set
      name = coalesce(excluded.name, f.name), unit = coalesce(excluded.unit, f.unit), last_scope = excluded.last_scope,
      last_seen = now(), seen_count = f.seen_count + 1, last_user = me, app_version = coalesce(excluded.app_version, f.app_version);
    insert into public.fiyat_eksik_kullanici as u (key, user_id, seen_count) values (k, me, 1)
    on conflict (key, user_id) do update set last_seen = now(), seen_count = u.seen_count + 1;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.sa_report_fiyat_eksik(jsonb, text) from public;
revoke all on function public.sa_report_fiyat_eksik(jsonb, text) from anon;
grant execute on function public.sa_report_fiyat_eksik(jsonb, text) to authenticated;

-- (4) Yönetici listesi: en yeni önce, kaç kullanıcıda görüldüğü ve son bildirenin e-postasıyla.
create or replace function public.sa_fiyat_eksik_list(p_limit integer default 200)
returns table (key text, name text, unit text, last_scope text, first_seen timestamptz, last_seen timestamptz, seen_count integer, users integer, last_email text, app_version text)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query
    select f.key, f.name, f.unit, f.last_scope, f.first_seen, f.last_seen, f.seen_count,
      (select count(*)::int from public.fiyat_eksik_kullanici x where x.key = f.key),
      (select u.email::text from auth.users u where u.id = f.last_user),
      f.app_version
    from public.fiyat_eksik f
    order by f.last_seen desc
    limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;
revoke all on function public.sa_fiyat_eksik_list(integer) from public;
revoke all on function public.sa_fiyat_eksik_list(integer) from anon;
grant execute on function public.sa_fiyat_eksik_list(integer) to authenticated;

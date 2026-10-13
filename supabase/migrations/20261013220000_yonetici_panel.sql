-- SüperArı yönetici paneli: yalnız yönetici (sa_is_admin) okur/yazar. Idempotent.
-- 1) Yönetici okuma politikaları (kullanıcı detayı, ekip, harita, sezon raporu)
do $$ declare t text; begin
  foreach t in array array['apiaries','hives','records','tasks','queens','apiary_members','apiary_invites','profiles','push_subscriptions','client_errors'] loop
    execute format('drop policy if exists %I on public.%I', t||'_admin_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.sa_is_admin())', t||'_admin_read', t);
  end loop;
end $$;

-- 2) Eşikler (tek satır JSON). Okuma herkes (uygulama önbelleğe alır), yazma yalnız yönetici.
create table if not exists public.app_esikler (id int primary key default 1 check (id = 1), data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by uuid);
alter table public.app_esikler enable row level security;
drop policy if exists app_esikler_read on public.app_esikler;
create policy app_esikler_read on public.app_esikler for select to anon, authenticated using (true);
create or replace function public.sa_esikler_kaydet(p_data jsonb) returns timestamptz language plpgsql security definer set search_path = public as $$
declare ts timestamptz := now(); begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  if jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then raise exception 'Geçersiz veri'; end if;
  insert into public.app_esikler (id, data, updated_at, updated_by) values (1, p_data, ts, auth.uid())
  on conflict (id) do update set data = excluded.data, updated_at = ts, updated_by = auth.uid();
  return ts; end $$;
revoke all on function public.sa_esikler_kaydet(jsonb) from public; grant execute on function public.sa_esikler_kaydet(jsonb) to authenticated;

-- 3) Referans fiyat listesi (data/fiyat-ref.json üzerine yazar). Okuma herkes, yazma yönetici.
create table if not exists public.fiyat_ref (key text primary key, name text not null default '', unit text, ref numeric, note text, updated_at timestamptz not null default now(), updated_by uuid);
alter table public.fiyat_ref enable row level security;
drop policy if exists fiyat_ref_read on public.fiyat_ref;
create policy fiyat_ref_read on public.fiyat_ref for select to anon, authenticated using (true);
create or replace function public.sa_fiyat_ref_kaydet(p_key text, p_name text, p_unit text, p_ref numeric, p_note text) returns timestamptz language plpgsql security definer set search_path = public as $$
declare ts timestamptz := now(); begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  if coalesce(trim(p_key),'') = '' or length(p_key) > 120 or (p_ref is not null and (p_ref < 0 or p_ref > 10000000)) then raise exception 'Geçersiz veri'; end if;
  insert into public.fiyat_ref values (p_key, left(coalesce(p_name,''),200), left(p_unit,40), p_ref, left(p_note,300), ts, auth.uid())
  on conflict (key) do update set name = excluded.name, unit = excluded.unit, ref = excluded.ref, note = excluded.note, updated_at = ts, updated_by = auth.uid();
  return ts; end $$;
revoke all on function public.sa_fiyat_ref_kaydet(text,text,text,numeric,text) from public; grant execute on function public.sa_fiyat_ref_kaydet(text,text,text,numeric,text) to authenticated;

-- 4) Yedek durumu (yedek iş akışı yazar; panel okur)
create table if not exists public.yedek_durum (id int primary key default 1 check (id = 1), last_run_at timestamptz, conclusion text, run_url text, note text, updated_at timestamptz not null default now());
alter table public.yedek_durum enable row level security;
drop policy if exists yedek_durum_admin_read on public.yedek_durum;
create policy yedek_durum_admin_read on public.yedek_durum for select to authenticated using (public.sa_is_admin());

-- 5) Kullanıcılar: liste + dondur (auth.users.banned_until; Supabase oturum yenilemeyi ve girişi reddeder)
create or replace function public.sa_admin_users() returns table (id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz, frozen boolean, is_admin boolean, apiaries int, hives int, tasks int, last_sync timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, p.display_name, u.created_at, u.last_sign_in_at,
    (u.banned_until is not null and u.banned_until > now()), exists (select 1 from public.sa_admins a where a.email = lower(u.email)),
    (select count(*)::int from public.apiaries x where x.owner_id = u.id and not x.deleted),
    (select count(*)::int from public.hives x where x.owner_id = u.id and not x.deleted),
    (select count(*)::int from public.tasks x where x.owner_id = u.id and not x.deleted),
    greatest((select max(server_updated_at) from public.apiaries x where x.owner_id = u.id), (select max(server_updated_at) from public.hives x where x.owner_id = u.id),
             (select max(server_updated_at) from public.records x where x.owner_id = u.id), (select max(server_updated_at) from public.tasks x where x.owner_id = u.id))
  from auth.users u left join public.profiles p on p.id = u.id
  where public.sa_is_admin() order by u.created_at desc limit 1000 $$;
revoke all on function public.sa_admin_users() from public; grant execute on function public.sa_admin_users() to authenticated;

create or replace function public.sa_admin_set_frozen(p_user uuid, p_frozen boolean) returns boolean language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'Kendi hesabınızı donduramazsınız'; end if;
  update auth.users set banned_until = case when p_frozen then 'infinity'::timestamptz else null end where id = p_user;
  if p_frozen then delete from auth.refresh_tokens where user_id = p_user::text; end if;
  return p_frozen; end $$;
revoke all on function public.sa_admin_set_frozen(uuid, boolean) from public; grant execute on function public.sa_admin_set_frozen(uuid, boolean) to authenticated;

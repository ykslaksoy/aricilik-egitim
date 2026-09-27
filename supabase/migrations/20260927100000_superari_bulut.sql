-- SüperArı — bulut eşitleme şeması (Supabase / Postgres)
-- Çalıştırma: Supabase Dashboard › SQL Editor'e yapıştırıp «Run» (tek sefer; tekrar çalıştırılabilir).
--
-- Model: cihaz (localStorage / IndexedDB) ana kaynaktır; bulut yedek + ekip paylaşımıdır.
--   * Her eşitlenen satırda: key (metin, birincil anahtar), local_id (cihazdaki kimlik), data (cihazdaki nesnenin tamamı, jsonb),
--     updated_at (istemci değişiklik zamanı — son yazan kazanır), server_updated_at (sunucu zamanı — çekme imleci), deleted (silme işareti).
--   * Erişim arılık ekibine göre: arılık sahibi (owner) ve üyeler (uye) arılığa bağlı tüm satırları görür/düzenler.
--   * Arılığa bağlı olmayan satırlar (kişisel görev / stok) yalnız sahibine görünür.
--   * Demo veriler istemci tarafından asla gönderilmez (yalnız Canlı mod, demo=true satırlar hariç).

-- gen_random_uuid() Postgres 13+ çekirdeğinde vardır (eklenti gerekmez).

-- ---------------------------------------------------------------- profiller
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.sa_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists sa_on_auth_user_created on auth.users;
create trigger sa_on_auth_user_created after insert or update of email on auth.users
  for each row execute function public.sa_handle_new_user();

-- ---------------------------------------------------------------- arılıklar + ekip
create table if not exists public.apiaries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  name text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.apiary_members (
  apiary_id uuid not null references public.apiaries (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'uye' check (role in ('owner', 'uye')),
  created_at timestamptz not null default now(),
  primary key (apiary_id, user_id)
);

create table if not exists public.apiary_invites (
  id uuid primary key default gen_random_uuid(),
  apiary_id uuid not null references public.apiaries (id) on delete cascade,
  email text not null check (email = lower(email) and position('@' in email) > 1),
  role text not null default 'uye' check (role in ('owner', 'uye')),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  unique (apiary_id, email)
);

-- Yardımcılar (security definer: RLS içinde özyinelemeyi önler)
create or replace function public.sa_is_member(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select aid is not null and exists (select 1 from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid());
$$;

create or replace function public.sa_is_owner(aid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select aid is not null and exists (select 1 from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid() and m.role = 'owner');
$$;

create or replace function public.sa_shares_apiary(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.apiary_members a join public.apiary_members b on a.apiary_id = b.apiary_id
    where a.user_id = auth.uid() and b.user_id = uid
  );
$$;

create or replace function public.sa_try_uuid(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- Arılık oluşturulunca sahibi ekibe «owner» olarak eklenir.
create or replace function public.sa_apiary_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.apiary_members (apiary_id, user_id, role) values (new.id, new.owner_id, 'owner')
  on conflict (apiary_id, user_id) do update set role = 'owner';
  return new;
end $$;

drop trigger if exists sa_apiary_owner_member on public.apiaries;
create trigger sa_apiary_owner_member after insert on public.apiaries
  for each row execute function public.sa_apiary_owner_member();

-- ---------------------------------------------------------------- eşitlenen tablolar
-- kovanlar: data = cihazdaki kovan nesnesi (sensör yer tutucuları hariç); kovan anahtarı "<arılık uuid>:<kovan no>"
create table if not exists public.hives (
  key text primary key,
  apiary_id uuid not null references public.apiaries (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  name text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

-- ana arılar: data = ana arı kaydı (yerleşim geçmişi placements[] kovan anahtarlarıyla)
create table if not exists public.queens (
  key text primary key,
  apiary_id uuid references public.apiaries (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  hive_key text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

-- kayıtlar: tüm kayıt türleri tek tabloda (kind)
--   strength     = muayene / koloni gücü
--   brood        = yavru durumu
--   disease      = hastalık + ilaçlama (tedavi, doz, bekleme süresi)
--   feed         = besleme
--   winter       = kışlık hazırlık
--   harvest      = hasat (superari.hasat.v2 satırı: id, date, apiaryId, hiveId|null, honeyKg, frames, honeyType, note, source)
--   colony_event = bölme / birleştirme / ana taşıma günlüğü
--   graft_batch  = ana üretimi (larva transferi partisi)
create table if not exists public.records (
  key text primary key,
  apiary_id uuid references public.apiaries (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  hive_key text,
  kind text not null check (kind in ('strength', 'brood', 'disease', 'feed', 'winter', 'harvest', 'colony_event', 'graft_batch')),
  record_date date,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

-- görevler: kind 'gorev' (elle eklenen görev) veya 'tamamlama' (otomatik/elle görevin tamamlanma kaydı)
create table if not exists public.tasks (
  key text primary key,
  apiary_id uuid references public.apiaries (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  kind text not null default 'gorev' check (kind in ('gorev', 'tamamlama')),
  due date,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

-- malzeme stoku
create table if not exists public.stock_items (
  key text primary key,
  apiary_id uuid references public.apiaries (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  name text not null default '',
  category text,
  qty numeric,
  unit text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

-- fotoğraf üst verisi (dosya: storage «photos» kovası, yol "<arılık uuid>/<foto id>.jpg")
create table if not exists public.photos (
  key text primary key,
  apiary_id uuid not null references public.apiaries (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  local_id text not null,
  record_ids text[] not null default '{}',
  storage_path text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists apiaries_sync_idx on public.apiaries (server_updated_at);
create index if not exists hives_sync_idx on public.hives (apiary_id, server_updated_at);
create index if not exists queens_sync_idx on public.queens (apiary_id, server_updated_at);
create index if not exists records_sync_idx on public.records (apiary_id, server_updated_at);
create index if not exists records_hive_idx on public.records (hive_key, kind, record_date);
create index if not exists tasks_sync_idx on public.tasks (owner_id, server_updated_at);
create index if not exists stock_sync_idx on public.stock_items (owner_id, server_updated_at);
create index if not exists photos_sync_idx on public.photos (apiary_id, server_updated_at);
create index if not exists members_user_idx on public.apiary_members (user_id);
create index if not exists invites_email_idx on public.apiary_invites (email) where accepted_at is null;

-- Son yazan kazanır: daha eski updated_at ile gelen güncelleme yok sayılır; sahiplik değiştirilemez.
create or replace function public.sa_touch() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.owner_id := old.owner_id;
    new.created_at := old.created_at;
  end if;
  new.server_updated_at := clock_timestamp();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['apiaries', 'hives', 'queens', 'records', 'tasks', 'stock_items', 'photos'] loop
    execute format('drop trigger if exists sa_touch on public.%I', t);
    execute format('create trigger sa_touch before insert or update on public.%I for each row execute function public.sa_touch()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- satır düzeyi güvenlik (RLS)
alter table public.profiles enable row level security;
alter table public.apiaries enable row level security;
alter table public.apiary_members enable row level security;
alter table public.apiary_invites enable row level security;
alter table public.hives enable row level security;
alter table public.queens enable row level security;
alter table public.records enable row level security;
alter table public.tasks enable row level security;
alter table public.stock_items enable row level security;
alter table public.photos enable row level security;

-- profiller: kendisi ve aynı arılıktaki ekip arkadaşları
drop policy if exists sa_profiles_select on public.profiles;
create policy sa_profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.sa_shares_apiary(id));
drop policy if exists sa_profiles_update on public.profiles;
create policy sa_profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- arılıklar: sahip + üyeler görür ve düzenler; yalnız sahip siler
drop policy if exists sa_apiaries_select on public.apiaries;
create policy sa_apiaries_select on public.apiaries for select to authenticated
  using (owner_id = auth.uid() or public.sa_is_member(id));
drop policy if exists sa_apiaries_insert on public.apiaries;
create policy sa_apiaries_insert on public.apiaries for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists sa_apiaries_update on public.apiaries;
create policy sa_apiaries_update on public.apiaries for update to authenticated
  using (owner_id = auth.uid() or public.sa_is_member(id))
  with check (owner_id = auth.uid() or public.sa_is_member(id));
drop policy if exists sa_apiaries_delete on public.apiaries;
create policy sa_apiaries_delete on public.apiaries for delete to authenticated
  using (owner_id = auth.uid());

-- ekip: üyeler listeyi görür; sahip ekler/çıkarır; üye kendisi ayrılabilir
drop policy if exists sa_members_select on public.apiary_members;
create policy sa_members_select on public.apiary_members for select to authenticated
  using (user_id = auth.uid() or public.sa_is_member(apiary_id));
drop policy if exists sa_members_insert on public.apiary_members;
create policy sa_members_insert on public.apiary_members for insert to authenticated
  with check (public.sa_is_owner(apiary_id));
drop policy if exists sa_members_update on public.apiary_members;
create policy sa_members_update on public.apiary_members for update to authenticated
  using (public.sa_is_owner(apiary_id)) with check (public.sa_is_owner(apiary_id));
drop policy if exists sa_members_delete on public.apiary_members;
create policy sa_members_delete on public.apiary_members for delete to authenticated
  using (public.sa_is_owner(apiary_id) or (user_id = auth.uid() and role <> 'owner'));

-- davetler: sahip yönetir; davet edilen kendi davetini görür
drop policy if exists sa_invites_select on public.apiary_invites;
create policy sa_invites_select on public.apiary_invites for select to authenticated
  using (public.sa_is_owner(apiary_id) or email = lower(coalesce(auth.jwt() ->> 'email', '')));
drop policy if exists sa_invites_insert on public.apiary_invites;
create policy sa_invites_insert on public.apiary_invites for insert to authenticated
  with check (public.sa_is_owner(apiary_id));
drop policy if exists sa_invites_delete on public.apiary_invites;
create policy sa_invites_delete on public.apiary_invites for delete to authenticated
  using (public.sa_is_owner(apiary_id) or email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- eşitlenen tablolar: arılık ekibi (veya arılıksız satırlarda yalnız sahibi)
do $$
declare t text;
begin
  foreach t in array array['hives', 'queens', 'records', 'tasks', 'stock_items', 'photos'] loop
    execute format('drop policy if exists sa_%s_select on public.%I', t, t);
    execute format('create policy sa_%s_select on public.%I for select to authenticated using (owner_id = auth.uid() or public.sa_is_member(apiary_id))', t, t);
    execute format('drop policy if exists sa_%s_insert on public.%I', t, t);
    execute format('create policy sa_%s_insert on public.%I for insert to authenticated with check (owner_id = auth.uid() and (apiary_id is null or public.sa_is_member(apiary_id)))', t, t);
    execute format('drop policy if exists sa_%s_update on public.%I', t, t);
    execute format('create policy sa_%s_update on public.%I for update to authenticated using (owner_id = auth.uid() or public.sa_is_member(apiary_id)) with check (public.sa_is_member(apiary_id) or (apiary_id is null and owner_id = auth.uid()))', t, t);
    execute format('drop policy if exists sa_%s_delete on public.%I', t, t);
    execute format('create policy sa_%s_delete on public.%I for delete to authenticated using (owner_id = auth.uid() or public.sa_is_owner(apiary_id))', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------- RPC: davet kabulü, ekip listesi
-- Giriş yapan kullanıcının e-postasına gelmiş davetleri kabul eder (üyelik oluşturur).
create or replace function public.sa_accept_invites() returns integer
language plpgsql security definer set search_path = public as $$
declare
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  n integer := 0;
begin
  if auth.uid() is null or em = '' then
    return 0;
  end if;
  insert into public.apiary_members (apiary_id, user_id, role)
    select i.apiary_id, auth.uid(), i.role from public.apiary_invites i
    where i.email = em and i.accepted_at is null
  on conflict (apiary_id, user_id) do nothing;
  get diagnostics n = row_count;
  update public.apiary_invites set accepted_at = now(), accepted_by = auth.uid()
    where email = em and accepted_at is null;
  return n;
end $$;

-- Arılık ekibi (e-postalarla); yalnız ekip üyeleri çağırabilir.
create or replace function public.sa_apiary_team(aid uuid)
returns table (user_id uuid, role text, email text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.role, p.email, m.created_at
  from public.apiary_members m left join public.profiles p on p.id = m.user_id
  where m.apiary_id = aid and public.sa_is_member(aid)
  order by (m.role = 'owner') desc, m.created_at;
$$;

revoke all on function public.sa_accept_invites() from public, anon;
revoke all on function public.sa_apiary_team(uuid) from public, anon;
grant execute on function public.sa_accept_invites() to authenticated;
grant execute on function public.sa_apiary_team(uuid) to authenticated;
grant execute on function public.sa_is_member(uuid), public.sa_is_owner(uuid), public.sa_shares_apiary(uuid), public.sa_try_uuid(text) to authenticated;

grant select, insert, update, delete on
  public.profiles, public.apiaries, public.apiary_members, public.apiary_invites,
  public.hives, public.queens, public.records, public.tasks, public.stock_items, public.photos
  to authenticated;
revoke all on
  public.profiles, public.apiaries, public.apiary_members, public.apiary_invites,
  public.hives, public.queens, public.records, public.tasks, public.stock_items, public.photos
  from anon;

-- ---------------------------------------------------------------- depolama: fotoğraflar (özel kova)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Yol: "<arılık uuid>/<dosya>" — yalnız o arılığın ekibi okur/yazar.
drop policy if exists sa_photos_obj_select on storage.objects;
create policy sa_photos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.sa_is_member(public.sa_try_uuid((storage.foldername(name))[1])));
drop policy if exists sa_photos_obj_insert on storage.objects;
create policy sa_photos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.sa_is_member(public.sa_try_uuid((storage.foldername(name))[1])));
drop policy if exists sa_photos_obj_update on storage.objects;
create policy sa_photos_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.sa_is_member(public.sa_try_uuid((storage.foldername(name))[1])))
  with check (bucket_id = 'photos' and public.sa_is_member(public.sa_try_uuid((storage.foldername(name))[1])));
drop policy if exists sa_photos_obj_delete on storage.objects;
create policy sa_photos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.sa_is_owner(public.sa_try_uuid((storage.foldername(name))[1])));

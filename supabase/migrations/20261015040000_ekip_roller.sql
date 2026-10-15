-- koloni-160 EK7: çok kullanıcılı arılık — roller Sahip (owner) / Arıcı (arici) / Bakıcı (bakici); sınırsız üye
alter table public.apiary_members drop constraint if exists apiary_members_role_check;
alter table public.apiary_invites drop constraint if exists apiary_invites_role_check;
update public.apiary_members set role = 'arici' where role in ('yardimci', 'uye');
update public.apiary_members set role = 'bakici' where role = 'izleyici';
update public.apiary_invites set role = 'arici' where role in ('yardimci', 'uye');
update public.apiary_invites set role = 'bakici' where role = 'izleyici';
alter table public.apiary_members add constraint apiary_members_role_check check (role in ('owner', 'arici', 'bakici'));
alter table public.apiary_invites add constraint apiary_invites_role_check check (role in ('arici', 'bakici'));

-- kimin girdiği + görev ataması
alter table public.records add column if not exists created_by uuid default auth.uid();
alter table public.tasks add column if not exists created_by uuid default auth.uid();
alter table public.tasks add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.hives add column if not exists created_by uuid default auth.uid();

create or replace function public.sa_role(aid uuid) returns text language sql stable security definer set search_path = public as $$
  select m.role from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid();
$$;
-- Arıcı + Sahip: tam yazma (eski fonksiyon adı korunur)
create or replace function public.sa_can_write(aid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select aid is not null and exists (select 1 from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid() and m.role in ('owner', 'arici'));
$$;
create or replace function public.sa_is_bakici(aid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select aid is not null and exists (select 1 from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid() and m.role = 'bakici');
$$;

-- Bakıcı: gözlem + besleme kaydı ekler (silemez, ayar değiştiremez)
drop policy if exists sa_records_insert_bakici on public.records;
create policy sa_records_insert_bakici on public.records for insert to authenticated
  with check (owner_id = auth.uid() and public.sa_is_bakici(apiary_id) and kind in ('feed', 'besleme', 'gozlem', 'observation', 'note'));
-- Bakıcı: yalnız kendisine atanan görevi günceller (tamamla)
drop policy if exists sa_tasks_update_bakici on public.tasks;
create policy sa_tasks_update_bakici on public.tasks for update to authenticated
  using (public.sa_is_bakici(apiary_id) and assigned_to = auth.uid())
  with check (public.sa_is_bakici(apiary_id) and assigned_to = auth.uid() and deleted is not true);
-- Arılık ayarları: Sahip + Arıcı (sa_can_write) — mevcut sa_apiaries_update politikası yeterli.

-- Üye yönetimi: Sahip rol değiştirir / çıkarır
drop policy if exists sa_members_update on public.apiary_members;
create policy sa_members_update on public.apiary_members for update to authenticated
  using (public.sa_is_owner(apiary_id) and user_id <> auth.uid()) with check (public.sa_is_owner(apiary_id) and role in ('arici', 'bakici'));

-- Etkinlik günlüğü (kim, hangi kaydı) — yalnız admin okur
create table if not exists public.sa_etkinlik (
  id bigserial primary key, at timestamptz not null default now(), user_id uuid, apiary_id uuid,
  tablo text not null, islem text not null, kayit_key text, tur text
);
create index if not exists sa_etkinlik_at on public.sa_etkinlik (at desc);
alter table public.sa_etkinlik enable row level security;
drop policy if exists sa_etkinlik_admin on public.sa_etkinlik;
create policy sa_etkinlik_admin on public.sa_etkinlik for select using (public.sa_is_admin());
create or replace function public.sa_etkinlik_yaz() returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  r := coalesce(new, old);
  insert into public.sa_etkinlik (user_id, apiary_id, tablo, islem, kayit_key, tur)
  values (auth.uid(), r.apiary_id, tg_table_name, lower(tg_op), r.key, case when tg_table_name in ('records', 'tasks') then r.kind else null end);
  return null;
end $$;
drop trigger if exists sa_etkinlik_records on public.records;
create trigger sa_etkinlik_records after insert or update or delete on public.records for each row execute function public.sa_etkinlik_yaz();
drop trigger if exists sa_etkinlik_tasks on public.tasks;
create trigger sa_etkinlik_tasks after insert or update or delete on public.tasks for each row execute function public.sa_etkinlik_yaz();

-- Yönetici görünümü: hesaplar, e-posta onayı, son giriş (yalnız admin)
create or replace function public.sa_admin_hesaplar() returns table (user_id uuid, email text, onayli boolean, son_giris timestamptz, kayit timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, u.email_confirmed_at is not null, u.last_sign_in_at, u.created_at from auth.users u where public.sa_is_admin() order by u.created_at;
$$;
create or replace function public.sa_admin_uyeler() returns table (apiary_id uuid, apiary_ad text, owner_id uuid, user_id uuid, email text, role text, since timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select a.id, a.name, a.owner_id, m.user_id, u.email::text, m.role, m.created_at
  from public.apiaries a join public.apiary_members m on m.apiary_id = a.id left join auth.users u on u.id = m.user_id
  where public.sa_is_admin() and a.deleted is not true order by a.name, m.role;
$$;
create or replace function public.sa_admin_rol(aid uuid, uid uuid, yeni text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'yetki yok'; end if;
  if yeni = 'cikar' then delete from public.apiary_members where apiary_id = aid and user_id = uid and role <> 'owner';
  else update public.apiary_members set role = yeni where apiary_id = aid and user_id = uid and role <> 'owner'; end if;
end $$;
create or replace function public.sa_admin_davet_iptal(did uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'yetki yok'; end if;
  delete from public.apiary_invites where id = did and accepted_at is null;
end $$;
revoke all on function public.sa_admin_hesaplar(), public.sa_admin_uyeler(), public.sa_admin_rol(uuid, uuid, text), public.sa_admin_davet_iptal(uuid) from anon;

-- eski istemci uyumu: yardimci/uye → arici, izleyici → bakici
create or replace function public.sa_rol_esle() returns trigger language plpgsql as $$
begin
  if new.role in ('yardimci', 'uye') then new.role := 'arici'; elsif new.role = 'izleyici' then new.role := 'bakici'; end if;
  return new;
end $$;
drop trigger if exists sa_rol_esle_m on public.apiary_members;
create trigger sa_rol_esle_m before insert or update on public.apiary_members for each row execute function public.sa_rol_esle();
drop trigger if exists sa_rol_esle_i on public.apiary_invites;
create trigger sa_rol_esle_i before insert or update on public.apiary_invites for each row execute function public.sa_rol_esle();

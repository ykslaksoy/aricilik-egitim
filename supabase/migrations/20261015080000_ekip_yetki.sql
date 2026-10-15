-- koloni-164: üye yetkileri (yalnız Sahip değiştirir), mali veri gizliliği, sahiplik devri
alter table public.apiary_members add column if not exists mali_gorur boolean;   -- null = rol varsayılanı
alter table public.apiary_members add column if not exists gorev_atar boolean;
alter table public.apiary_members add column if not exists duzenler boolean;

-- varsayılanlar: Arıcı mali/görev/düzen açık; Bakıcı mali kapalı, görev kapalı, düzen açık; Sahip her şey
create or replace function public.sa_yetki(aid uuid, ad text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select case when m.role = 'owner' then true
    when ad = 'mali'  then coalesce(m.mali_gorur, m.role = 'arici')
    when ad = 'gorev' then coalesce(m.gorev_atar, m.role = 'arici')
    when ad = 'duzen' then coalesce(m.duzenler, true)
    else false end
  from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid()), false);
$$;
grant execute on function public.sa_yetki(uuid, text) to authenticated;

-- mali kayıt: hasat + gider/taşıma gideri/gelir/satış/müşteri
create or replace function public.sa_mali_kayit(k text, lid text) returns boolean language sql immutable as $$
  select k = 'harvest' or coalesce(lid, '') ~ '^(gd|ts|gl|sa|mu):';
$$;
drop policy if exists sa_records_mali_select on public.records;
create policy sa_records_mali_select on public.records as restrictive for select to authenticated
  using (not public.sa_mali_kayit(kind, local_id) or owner_id = auth.uid() or apiary_id is null or public.sa_yetki(apiary_id, 'mali'));

-- görev atama: yalnız yetkili (kendine atanmış görevi tamamlamak serbest)
drop policy if exists sa_tasks_ata_ins on public.tasks;
create policy sa_tasks_ata_ins on public.tasks as restrictive for insert to authenticated
  with check (assigned_to is null or assigned_to = auth.uid() and not public.sa_is_bakici(apiary_id) or public.sa_yetki(apiary_id, 'gorev'));
drop policy if exists sa_tasks_ata_upd on public.tasks;
create policy sa_tasks_ata_upd on public.tasks as restrictive for update to authenticated
  using (true)
  with check (assigned_to is null or assigned_to = auth.uid() or public.sa_yetki(apiary_id, 'gorev'));

-- arılık/kovan düzenleme: yetki anahtarı (bakıcıya da varsayılan açık)
drop policy if exists sa_hives_duzen_r on public.hives;
create policy sa_hives_duzen_r on public.hives as restrictive for update to authenticated using (public.sa_yetki(apiary_id, 'duzen'));
drop policy if exists sa_hives_duzen_bakici on public.hives;
create policy sa_hives_duzen_bakici on public.hives for update to authenticated
  using (public.sa_is_bakici(apiary_id) and public.sa_yetki(apiary_id, 'duzen')) with check (public.sa_is_bakici(apiary_id) and deleted is not true);
drop policy if exists sa_apiaries_duzen_r on public.apiaries;
create policy sa_apiaries_duzen_r on public.apiaries as restrictive for update to authenticated using (public.sa_yetki(id, 'duzen'));
drop policy if exists sa_apiaries_duzen_bakici on public.apiaries;
create policy sa_apiaries_duzen_bakici on public.apiaries for update to authenticated
  using (public.sa_is_bakici(id) and public.sa_yetki(id, 'duzen')) with check (public.sa_is_bakici(id) and deleted is not true);

-- üye satırı: yalnız Sahip günceller (rol + yetkiler); sahiplik yalnız devir RPC'siyle
drop policy if exists sa_members_update on public.apiary_members;
create policy sa_members_update on public.apiary_members for update to authenticated
  using (public.sa_is_owner(apiary_id) and user_id <> auth.uid()) with check (public.sa_is_owner(apiary_id) and role in ('arici', 'bakici'));

-- rol / yetki değişikliği etkinlik günlüğüne
create or replace function public.sa_uye_gunluk() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then insert into public.sa_etkinlik (user_id, apiary_id, tablo, islem, kayit_key, tur) values (auth.uid(), new.apiary_id, 'apiary_members', 'rol', new.user_id::text, old.role || '→' || new.role); end if;
  if new.mali_gorur is distinct from old.mali_gorur then insert into public.sa_etkinlik (user_id, apiary_id, tablo, islem, kayit_key, tur) values (auth.uid(), new.apiary_id, 'apiary_members', 'yetki', new.user_id::text, 'mali=' || coalesce(new.mali_gorur::text, 'varsayilan')); end if;
  if new.gorev_atar is distinct from old.gorev_atar then insert into public.sa_etkinlik (user_id, apiary_id, tablo, islem, kayit_key, tur) values (auth.uid(), new.apiary_id, 'apiary_members', 'yetki', new.user_id::text, 'gorev=' || coalesce(new.gorev_atar::text, 'varsayilan')); end if;
  if new.duzenler is distinct from old.duzenler then insert into public.sa_etkinlik (user_id, apiary_id, tablo, islem, kayit_key, tur) values (auth.uid(), new.apiary_id, 'apiary_members', 'yetki', new.user_id::text, 'duzen=' || coalesce(new.duzenler::text, 'varsayilan')); end if;
  return null;
end $$;
drop trigger if exists sa_uye_gunluk on public.apiary_members;
create trigger sa_uye_gunluk after update on public.apiary_members for each row execute function public.sa_uye_gunluk();

create or replace function public.sa_uye_yetki(aid uuid, uid uuid, ad text, deger boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_owner(aid) then raise exception 'Yetkileri yalnız Sahip değiştirir'; end if;
  if uid = auth.uid() then raise exception 'Sahip kendi yetkisini değiştirmez'; end if;
  if ad = 'mali' then update public.apiary_members set mali_gorur = deger where apiary_id = aid and user_id = uid and role <> 'owner';
  elsif ad = 'gorev' then update public.apiary_members set gorev_atar = deger where apiary_id = aid and user_id = uid and role <> 'owner';
  elsif ad = 'duzen' then update public.apiary_members set duzenler = deger where apiary_id = aid and user_id = uid and role <> 'owner';
  else raise exception 'bilinmeyen yetki'; end if;
end $$;
grant execute on function public.sa_uye_yetki(uuid, uuid, text, boolean) to authenticated;

create or replace function public.sa_sahiplik_devret(aid uuid, uid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_owner(aid) then raise exception 'Yalnız Sahip devreder'; end if;
  if not exists (select 1 from public.apiary_members where apiary_id = aid and user_id = uid) then raise exception 'Üye değil'; end if;
  update public.apiary_members set role = 'owner', mali_gorur = null, gorev_atar = null, duzenler = null where apiary_id = aid and user_id = uid;
  update public.apiary_members set role = 'arici' where apiary_id = aid and user_id = auth.uid();
  update public.apiaries set owner_id = uid where id = aid;
  if not exists (select 1 from public.apiary_members where apiary_id = aid and role = 'owner') then raise exception 'En az bir Sahip kalmalı'; end if;
end $$;
grant execute on function public.sa_sahiplik_devret(uuid, uuid) to authenticated;

drop function if exists public.sa_apiary_team(uuid);
create function public.sa_apiary_team(aid uuid)
returns table (user_id uuid, role text, email text, joined_at timestamptz, mali boolean, gorev boolean, duzen boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.role, p.email, m.created_at,
    m.role = 'owner' or coalesce(m.mali_gorur, m.role = 'arici'), m.role = 'owner' or coalesce(m.gorev_atar, m.role = 'arici'), m.role = 'owner' or coalesce(m.duzenler, true)
  from public.apiary_members m left join public.profiles p on p.id = m.user_id
  where m.apiary_id = aid and public.sa_is_member(aid)
  order by (m.role = 'owner') desc, m.created_at;
$$;
revoke all on function public.sa_apiary_team(uuid) from public, anon;
grant execute on function public.sa_apiary_team(uuid) to authenticated;

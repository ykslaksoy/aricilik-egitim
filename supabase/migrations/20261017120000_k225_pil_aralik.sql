-- koloni-225: Cihaz ölçüm sıklığı (pil planı «Onayla») bulutta — değişiklik kaydına girer, geri alınabilir, yedeklenir.
create table if not exists public.cihaz_aralik (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  apiary_id uuid references public.apiaries(id) on delete cascade,
  aralik_ms int not null check (aralik_ms between 60000 and 86400000),
  onceki_ms int,
  cihaz_ad text, kovan_ad text,
  degistiren_email text, degistiren_id uuid,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);
create index if not exists cihaz_aralik_ap on public.cihaz_aralik (apiary_id);
alter table public.cihaz_aralik enable row level security;
drop policy if exists ca_oku on public.cihaz_aralik;
create policy ca_oku on public.cihaz_aralik for select to authenticated using (
  user_id = auth.uid() or public.sa_is_admin() or (apiary_id is not null and public.sa_is_member(apiary_id)));

create or replace function public.sa_cihaz_aralik_yaz(p_apiary uuid, p_device text, p_ms int, p_onceki int default null, p_cihaz_ad text default null, p_kovan_ad text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare sahip uuid := auth.uid();
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if p_device is null or length(p_device) > 120 then raise exception 'Geçersiz cihaz'; end if;
  if p_apiary is not null then
    select owner_id into sahip from public.apiaries where id = p_apiary;
    if sahip is null then raise exception 'Arılık bulunamadı'; end if;
    if not (public.sa_yetki(p_apiary, 'duzen') or sahip = auth.uid() or public.sa_is_admin()) then
      raise exception 'Bu işlem için arılık düzenleme yetkisi gerekiyor' using errcode = '42501'; end if;
  end if;
  insert into public.cihaz_aralik as c (user_id, device_id, apiary_id, aralik_ms, onceki_ms, cihaz_ad, kovan_ad, degistiren_email, degistiren_id, updated_at)
  values (sahip, p_device, p_apiary, p_ms, p_onceki, p_cihaz_ad, p_kovan_ad, auth.jwt() ->> 'email', auth.uid(), now())
  on conflict (user_id, device_id) do update set aralik_ms = excluded.aralik_ms, onceki_ms = c.aralik_ms, apiary_id = coalesce(excluded.apiary_id, c.apiary_id),
    cihaz_ad = coalesce(excluded.cihaz_ad, c.cihaz_ad), kovan_ad = coalesce(excluded.kovan_ad, c.kovan_ad),
    degistiren_email = excluded.degistiren_email, degistiren_id = excluded.degistiren_id, updated_at = now();
  return true;
end $$;
revoke all on function public.sa_cihaz_aralik_yaz(uuid, text, int, int, text, text) from public, anon;
grant execute on function public.sa_cihaz_aralik_yaz(uuid, text, int, int, text, text) to authenticated;

create or replace function public.sa_degisiklik_yaz() returns trigger language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; r jsonb; aid uuid; hid uuid; pkj jsonb; ga bigint; yk bigint; isl text; arad text; kvad text;
begin
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  if tg_op = 'UPDATE' then
    if (o - 'updated_at' - 'server_updated_at' - 'updated_by') = (n - 'updated_at' - 'server_updated_at' - 'updated_by') then return null; end if;
  end if;
  r := coalesce(n, o);
  if tg_table_name = 'apiaries' then aid := (r->>'id')::uuid; hid := (r->>'owner_id')::uuid; pkj := jsonb_build_object('id', r->'id'); arad := r->>'name';
  elsif tg_table_name = 'hives' then aid := (r->>'apiary_id')::uuid; hid := (r->>'owner_id')::uuid; pkj := jsonb_build_object('key', r->'key'); kvad := r->>'name';
  elsif tg_table_name in ('queens', 'records', 'tasks', 'stock_items', 'photos') then
    aid := (r->>'apiary_id')::uuid; hid := (r->>'owner_id')::uuid; pkj := jsonb_build_object('key', r->'key');
    if r->>'hive_key' is not null then select name into kvad from public.hives where key = r->>'hive_key'; end if;
  elsif tg_table_name = 'apiary_members' then aid := (r->>'apiary_id')::uuid; pkj := jsonb_build_object('apiary_id', r->'apiary_id', 'user_id', r->'user_id');
  elsif tg_table_name = 'cihaz_devre_disi' then hid := (r->>'user_id')::uuid; pkj := jsonb_build_object('user_id', r->'user_id', 'device_id', r->'device_id'); arad := r->>'arilik_ad'; kvad := coalesce(r->>'kovan_ad', r->>'kovan_id');
  elsif tg_table_name = 'cihaz_aralik' then aid := (r->>'apiary_id')::uuid; hid := (r->>'user_id')::uuid; pkj := jsonb_build_object('user_id', r->'user_id', 'device_id', r->'device_id'); kvad := r->>'kovan_ad';
  elsif tg_table_name = 'sa_yedek_ayar' then pkj := jsonb_build_object('id', r->'id');
  end if;
  if aid is not null then
    if hid is null then select owner_id into hid from public.apiaries where id = aid; end if;
    if arad is null then select name into arad from public.apiaries where id = aid; end if;
  end if;
  ga := nullif(current_setting('sa.geri_al', true), '')::bigint;
  yk := nullif(current_setting('sa.yukleme', true), '')::bigint;
  isl := case when ga is not null then 'geri_al' when yk is not null then 'geri_yukle' when tg_op = 'INSERT' then 'ekle' when tg_op = 'DELETE' then 'sil'
    when coalesce((o->>'deleted')::boolean, false) = false and coalesce((n->>'deleted')::boolean, false) then 'sil' else 'guncelle' end;
  insert into public.sa_degisiklik (email, rol, hesap_id, apiary_id, arilik_ad, kovan_ad, tablo, pk, islem, once, sonra, geri_alinan, yukleme_id)
  values (coalesce(auth.jwt() ->> 'email', ''), case when auth.uid() is null then 'Sistem' else public.sa_degisiklik_rol(aid) end,
    hid, aid, arad, kvad, tg_table_name, pkj, isl, o, n, ga, case when ga is null then yk end);
  return null;
end $$;

drop trigger if exists sa_degisiklik_cihaz_aralik on public.cihaz_aralik;
create trigger sa_degisiklik_cihaz_aralik after insert or update or delete on public.cihaz_aralik for each row execute function public.sa_degisiklik_yaz();

create or replace function public.sa_yedek_tablolar() returns text[] language sql immutable as $$
  select array['apiaries', 'hives', 'queens', 'records', 'tasks', 'stock_items', 'photos', 'cihaz_devre_disi', 'cihaz_aralik'];
$$;
create or replace function public.sa_yedek_pk(t text) returns text language sql immutable as $$
  select case t when 'apiaries' then 'id' when 'cihaz_devre_disi' then 'device_id' when 'cihaz_aralik' then 'device_id' else 'key' end;
$$;
create or replace function public.sa_yedek_sahip(t text) returns text language sql immutable as $$
  select case t when 'cihaz_devre_disi' then 'user_id' when 'cihaz_aralik' then 'user_id' else 'owner_id' end;
$$;

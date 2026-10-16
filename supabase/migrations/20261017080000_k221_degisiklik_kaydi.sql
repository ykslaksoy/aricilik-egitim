-- koloni-221: Değişiklik kaydı (kim, rol, ne zaman, önce/sonra, kapsam) + Geri al (yalnız yönetici ve Sahip).
-- kişi bazlı yetki: «Kaydı görür» ve «Geri alabilir» (varsayılan kapalı; Sahip her ikisine sahip)
alter table public.apiary_members add column if not exists kayit_gorur boolean;
alter table public.apiary_members add column if not exists geri_alir boolean;
create or replace function public.sa_yetki(aid uuid, ad text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select case when m.role = 'owner' then true
    when ad = 'mali'  then coalesce(m.mali_gorur, m.role = 'arici')
    when ad = 'gorev' then coalesce(m.gorev_atar, m.role = 'arici')
    when ad = 'duzen' then coalesce(m.duzenler, true)
    when ad = 'kayit' then coalesce(m.kayit_gorur, false) or coalesce(m.geri_alir, false)
    when ad = 'geri'  then coalesce(m.geri_alir, false)
    else false end
  from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid()), false);
$$;
create or replace function public.sa_uye_yetki(aid uuid, uid uuid, ad text, deger boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_owner(aid) then raise exception 'Yetkileri yalnız Sahip değiştirir'; end if;
  if uid = auth.uid() then raise exception 'Sahip kendi yetkisini değiştirmez'; end if;
  if ad = 'mali' then update public.apiary_members set mali_gorur = deger where apiary_id = aid and user_id = uid and role <> 'owner';
  elsif ad = 'gorev' then update public.apiary_members set gorev_atar = deger where apiary_id = aid and user_id = uid and role <> 'owner';
  elsif ad = 'duzen' then update public.apiary_members set duzenler = deger where apiary_id = aid and user_id = uid and role <> 'owner';
  elsif ad = 'kayit' then update public.apiary_members set kayit_gorur = deger, geri_alir = case when deger then geri_alir else false end where apiary_id = aid and user_id = uid and role <> 'owner';
  elsif ad = 'geri' then update public.apiary_members set geri_alir = deger, kayit_gorur = case when deger then true else kayit_gorur end where apiary_id = aid and user_id = uid and role <> 'owner';
  else raise exception 'bilinmeyen yetki'; end if;
end $$;
drop function if exists public.sa_apiary_team(uuid);
create function public.sa_apiary_team(aid uuid)
returns table (user_id uuid, role text, email text, joined_at timestamptz, mali boolean, gorev boolean, duzen boolean, kayit boolean, geri boolean)
language sql stable security definer set search_path = public as $$
  select m.user_id, m.role, p.email, m.created_at,
    m.role = 'owner' or coalesce(m.mali_gorur, m.role = 'arici'), m.role = 'owner' or coalesce(m.gorev_atar, m.role = 'arici'), m.role = 'owner' or coalesce(m.duzenler, true),
    m.role = 'owner' or coalesce(m.kayit_gorur, false) or coalesce(m.geri_alir, false), m.role = 'owner' or coalesce(m.geri_alir, false)
  from public.apiary_members m left join public.profiles p on p.id = m.user_id
  where m.apiary_id = aid and public.sa_is_member(aid)
  order by (m.role = 'owner') desc, m.created_at;
$$;
revoke all on function public.sa_apiary_team(uuid) from public, anon;
grant execute on function public.sa_apiary_team(uuid) to authenticated;

create table if not exists public.sa_degisiklik (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  email text,
  rol text,
  hesap_id uuid,           -- kaydın ait olduğu hesap (Sahip / cihaz sahibi)
  apiary_id uuid,
  arilik_ad text,
  kovan_ad text,
  tablo text not null,     -- apiaries | hives | apiary_members | cihaz_devre_disi | ayar
  pk jsonb,
  islem text not null,     -- ekle | guncelle | sil | geri_al
  once jsonb,
  sonra jsonb,
  geri_alinan bigint,      -- bu kayıt bir geri almaysa hangi kaydı geri aldı
  geri_alan bigint         -- bu kayıt geri alındıysa geri alan kayıt
);
create index if not exists sa_degisiklik_at on public.sa_degisiklik (at desc);
create index if not exists sa_degisiklik_pk on public.sa_degisiklik (tablo, pk);
alter table public.sa_degisiklik enable row level security;
drop policy if exists sa_degisiklik_oku on public.sa_degisiklik;
create policy sa_degisiklik_oku on public.sa_degisiklik for select to authenticated using (
  public.sa_is_admin() or hesap_id = auth.uid()
  or (apiary_id is not null and public.sa_yetki(apiary_id, 'kayit')));  -- Sahip + «Kaydı görür» izni verilenler + yönetici

create or replace function public.sa_degisiklik_rol(aid uuid) returns text language sql stable security definer set search_path = public as $$
  select case when public.sa_is_admin() and aid is null then 'Yönetici'
    else coalesce((select case m.role when 'owner' then 'Sahip' when 'arici' then 'Arıcı' when 'bakici' then 'Bakıcı' else m.role end
      from public.apiary_members m where m.apiary_id = aid and m.user_id = auth.uid()),
      case when public.sa_is_admin() then 'Yönetici' else 'Sahip' end) end;
$$;

create or replace function public.sa_degisiklik_yaz() returns trigger language plpgsql security definer set search_path = public as $$
declare o jsonb; n jsonb; r jsonb; aid uuid; hid uuid; pkj jsonb; ga bigint; isl text; arad text; kvad text;
begin
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  if tg_op = 'UPDATE' then
    if (o - 'updated_at' - 'server_updated_at' - 'updated_by') = (n - 'updated_at' - 'server_updated_at' - 'updated_by') then return null; end if;
  end if;
  r := coalesce(n, o);
  if tg_table_name = 'apiaries' then aid := (r->>'id')::uuid; hid := (r->>'owner_id')::uuid; pkj := jsonb_build_object('id', r->'id'); arad := r->>'name';
  elsif tg_table_name = 'hives' then aid := (r->>'apiary_id')::uuid; hid := (r->>'owner_id')::uuid; pkj := jsonb_build_object('key', r->'key'); kvad := r->>'name';
  elsif tg_table_name = 'apiary_members' then aid := (r->>'apiary_id')::uuid; pkj := jsonb_build_object('apiary_id', r->'apiary_id', 'user_id', r->'user_id');
  elsif tg_table_name = 'cihaz_devre_disi' then hid := (r->>'user_id')::uuid; pkj := jsonb_build_object('user_id', r->'user_id', 'device_id', r->'device_id'); arad := r->>'arilik_ad'; kvad := coalesce(r->>'kovan_ad', r->>'kovan_id');
  end if;
  if aid is not null then
    if hid is null then select owner_id into hid from public.apiaries where id = aid; end if;
    if arad is null then select name into arad from public.apiaries where id = aid; end if;
  end if;
  ga := nullif(current_setting('sa.geri_al', true), '')::bigint;
  isl := case when ga is not null then 'geri_al' when tg_op = 'INSERT' then 'ekle' when tg_op = 'DELETE' then 'sil'
    when coalesce((o->>'deleted')::boolean, false) = false and coalesce((n->>'deleted')::boolean, false) then 'sil' else 'guncelle' end;
  insert into public.sa_degisiklik (email, rol, hesap_id, apiary_id, arilik_ad, kovan_ad, tablo, pk, islem, once, sonra, geri_alinan)
  values (coalesce(auth.jwt() ->> 'email', ''), public.sa_degisiklik_rol(aid), hid, aid, arad, kvad, tg_table_name, pkj, isl, o, n, ga);
  return null;
end $$;

drop trigger if exists sa_degisiklik_apiaries on public.apiaries;
create trigger sa_degisiklik_apiaries after insert or update or delete on public.apiaries for each row execute function public.sa_degisiklik_yaz();
drop trigger if exists sa_degisiklik_hives on public.hives;
create trigger sa_degisiklik_hives after insert or update or delete on public.hives for each row execute function public.sa_degisiklik_yaz();
drop trigger if exists sa_degisiklik_members on public.apiary_members;
create trigger sa_degisiklik_members after insert or update or delete on public.apiary_members for each row execute function public.sa_degisiklik_yaz();
do $$ begin
  if to_regclass('public.cihaz_devre_disi') is not null then
    execute 'drop trigger if exists sa_degisiklik_cihaz on public.cihaz_devre_disi';
    execute 'create trigger sa_degisiklik_cihaz after insert or update or delete on public.cihaz_devre_disi for each row execute function public.sa_degisiklik_yaz()';
  end if;
end $$;

-- yönetici ayarları (ogul_skor_ayar sürümleri): her yayın bir kayıt; geri al = önceki sürüme dön
create or replace function public.sa_degisiklik_ayar() returns trigger language plpgsql security definer set search_path = public as $$
declare onceki jsonb; ga bigint;
begin
  select data into onceki from public.ayar_surumleri where surum < new.surum order by surum desc limit 1;
  ga := nullif(current_setting('sa.geri_al', true), '')::bigint;
  insert into public.sa_degisiklik (email, rol, tablo, pk, islem, once, sonra, geri_alinan)
  values (coalesce(new.yayinlayan_eposta, ''), 'Yönetici', 'ayar', jsonb_build_object('surum', new.surum),
    case when ga is not null then 'geri_al' else 'guncelle' end, onceki, new.data, ga);
  return null;
end $$;
drop trigger if exists sa_degisiklik_ayar on public.ayar_surumleri;
create trigger sa_degisiklik_ayar after insert on public.ayar_surumleri for each row execute function public.sa_degisiklik_ayar();

-- Geri al: yalnız yönetici veya hesabın Sahibi. Daha yeni çakışan değişiklik varsa reddeder.
create or replace function public.sa_degisiklik_geri_al(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare e public.sa_degisiklik; yeni bigint; cols text; wh text; k text; sonra_id bigint; ps bigint;
begin
  select * into e from public.sa_degisiklik where id = p_id;
  if e.id is null then raise exception 'Kayıt bulunamadı'; end if;
  if not (public.sa_is_admin()
     or (e.tablo <> 'ayar' and (e.hesap_id = auth.uid() or (e.apiary_id is not null and public.sa_yetki(e.apiary_id, 'geri'))))) then
    raise exception 'Geri almayı yalnız yönetici, hesabın Sahibi veya Sahibin «Geri alabilir» izni verdiği kişi yapabilir' using errcode = '42501';
  end if;
  if e.geri_alan is not null then raise exception 'Bu değişiklik zaten geri alındı'; end if;
  if e.tablo = 'ayar' then
    select max(id) into sonra_id from public.sa_degisiklik where tablo = 'ayar' and id > e.id;
  else
    select max(id) into sonra_id from public.sa_degisiklik where tablo = e.tablo and pk = e.pk and id > e.id;
  end if;
  if sonra_id is not null then
    raise exception 'Bu kayıtta daha yeni bir değişiklik var (#%). Önce onu geri alın.', sonra_id using errcode = 'P0001';
  end if;
  perform set_config('sa.geri_al', p_id::text, true);
  if e.tablo = 'ayar' then
    if e.once is null then raise exception 'Önceki ayar sürümü yok'; end if;
    select surum into ps from public.ayar_surumleri where surum < (e.pk->>'surum')::bigint order by surum desc limit 1;
    perform public.sa_ayar_geri_al(ps);
  else
    wh := (select string_agg(format('{A}%I = (%L::jsonb ->> %L)::%s', key, e.pk, key,
            (select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = ('public.'||e.tablo)::regclass and a.attname = key)), ' and ')
           from jsonb_object_keys(e.pk) key);
    if e.once is null then        -- ekleme geri alınır
      if e.tablo in ('apiaries', 'hives') then
        execute format('update public.%I set deleted = true, updated_at = now() where %s', e.tablo, replace(wh, '{A}', ''));
      else execute format('delete from public.%I where %s', e.tablo, replace(wh, '{A}', '')); end if;
    elsif e.sonra is null then    -- silme geri alınır
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', e.tablo, e.tablo) using e.once;
    else                          -- güncelleme geri alınır
      select string_agg(format('%I = r.%I', a.attname, a.attname), ', ') into cols
        from pg_attribute a where a.attrelid = ('public.'||e.tablo)::regclass and a.attnum > 0 and not a.attisdropped
          and not (e.pk ? a.attname) and a.attname not in ('updated_at', 'server_updated_at');
      execute format('update public.%I t set %s %s from jsonb_populate_record(null::public.%I, $1) r where %s',
        e.tablo, cols,
        case when e.tablo in ('apiaries', 'hives', 'cihaz_devre_disi') then ', updated_at = now()' else '' end,
        e.tablo, replace(wh, '{A}', 't.')) using e.once;
    end if;
  end if;
  select max(id) into yeni from public.sa_degisiklik where geri_alinan = p_id;
  if yeni is null then raise exception 'Geri alma uygulanamadı'; end if;
  update public.sa_degisiklik set geri_alan = yeni where id = p_id;
  perform set_config('sa.geri_al', '', true);
  return yeni;
end $$;
revoke all on function public.sa_degisiklik_geri_al(bigint) from anon, public;
grant execute on function public.sa_degisiklik_geri_al(bigint) to authenticated;

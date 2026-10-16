-- koloni-223: Değişiklik kaydı tüm eşitlenen tablolara + tarihli yedekler (günlük/aylık) + seçilen tarihe geri yükleme (önizleme, onay, kayıt, geri al).
-- Kapsam: apiaries, hives, queens (ana arı), records (muayene, tartım, tedavi, besleme, hasat, gider, satış, notlar…), tasks (görevler),
-- stock_items (stok), photos (fotoğraf bilgisi; görüntü dosyası Storage'da kalır), cihaz_devre_disi. Ekip (apiary_members) kayıtta, yedeğe girmez.

alter table public.sa_degisiklik add column if not exists yukleme_id bigint;
create index if not exists sa_degisiklik_yukleme on public.sa_degisiklik (yukleme_id) where yukleme_id is not null;

create or replace function public.sa_kolon_var(t text, c text) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from pg_attribute a where a.attrelid = ('public.' || t)::regclass and a.attname = c and a.attnum > 0 and not a.attisdropped);
$$;

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

do $$ declare t text; begin
  foreach t in array array['queens', 'records', 'tasks', 'stock_items', 'photos'] loop
    execute format('drop trigger if exists sa_degisiklik_%s on public.%I', t, t);
    execute format('create trigger sa_degisiklik_%s after insert or update or delete on public.%I for each row execute function public.sa_degisiklik_yaz()', t, t);
  end loop;
end $$;

-- Geri al: eklemeyi geri alırken «deleted» sütunu olan tabloda yumuşak silme; updated_at her zaman now() (sa_touch eski tarihli yazmayı reddeder).
create or replace function public.sa_degisiklik_geri_al(p_id bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare e public.sa_degisiklik; yeni bigint; cols text; wh text; sonra_id bigint; ps bigint; yk text;
begin
  select * into e from public.sa_degisiklik where id = p_id;
  if e.id is null then raise exception 'Kayıt bulunamadı'; end if;
  if not (public.sa_is_admin()
     or (e.tablo not in ('ayar', 'sa_yedek_ayar') and (e.hesap_id = auth.uid() or (e.apiary_id is not null and public.sa_yetki(e.apiary_id, 'geri'))))) then
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
  yk := current_setting('sa.yukleme', true);
  perform set_config('sa.yukleme', '', true);
  perform set_config('sa.geri_al', p_id::text, true);
  if e.tablo = 'ayar' then
    if e.once is null then raise exception 'Önceki ayar sürümü yok'; end if;
    select surum into ps from public.ayar_surumleri where surum < (e.pk->>'surum')::bigint order by surum desc limit 1;
    perform public.sa_ayar_geri_al(ps);
  else
    wh := (select string_agg(format('{A}%I = (%L::jsonb ->> %L)::%s', key, e.pk, key,
            (select format_type(a.atttypid, a.atttypmod) from pg_attribute a where a.attrelid = ('public.'||e.tablo)::regclass and a.attname = key)), ' and ')
           from jsonb_object_keys(e.pk) key);
    if e.once is null then
      if public.sa_kolon_var(e.tablo, 'deleted') then
        execute format('update public.%I set deleted = true, updated_at = now() where %s', e.tablo, replace(wh, '{A}', ''));
      else execute format('delete from public.%I where %s', e.tablo, replace(wh, '{A}', '')); end if;
    elsif e.sonra is null then
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', e.tablo, e.tablo)
        using (case when public.sa_kolon_var(e.tablo, 'updated_at') then e.once || jsonb_build_object('updated_at', now()) else e.once end);
    else
      select string_agg(format('%I = r.%I', a.attname, a.attname), ', ') into cols
        from pg_attribute a where a.attrelid = ('public.'||e.tablo)::regclass and a.attnum > 0 and not a.attisdropped
          and not (e.pk ? a.attname) and a.attname not in ('updated_at', 'server_updated_at');
      execute format('update public.%I t set %s %s from jsonb_populate_record(null::public.%I, $1) r where %s',
        e.tablo, cols,
        case when public.sa_kolon_var(e.tablo, 'updated_at') then ', updated_at = now()' else '' end,
        e.tablo, replace(wh, '{A}', 't.')) using e.once;
    end if;
  end if;
  select max(id) into yeni from public.sa_degisiklik where geri_alinan = p_id;
  if yeni is null then raise exception 'Geri alma uygulanamadı'; end if;
  update public.sa_degisiklik set geri_alan = yeni where id = p_id;
  perform set_config('sa.geri_al', '', true);
  perform set_config('sa.yukleme', coalesce(yk, ''), true);
  return yeni;
end $$;
revoke all on function public.sa_degisiklik_geri_al(bigint) from anon, public;
grant execute on function public.sa_degisiklik_geri_al(bigint) to authenticated;

-- ---------- Yedek ayarı (saklama süresi; uzman tahmini, yönetici değiştirir) ----------
create table if not exists public.sa_yedek_ayar (
  id int primary key default 1 check (id = 1),
  gunluk_gun int not null default 90 check (gunluk_gun between 7 and 3650),
  aylik_ay int not null default 24 check (aylik_ay between 0 and 240),
  kaynak text not null default 'uzman tahmini',
  updated_at timestamptz not null default now()
);
insert into public.sa_yedek_ayar (id) values (1) on conflict do nothing;
alter table public.sa_yedek_ayar enable row level security;
drop policy if exists sa_yedek_ayar_oku on public.sa_yedek_ayar;
create policy sa_yedek_ayar_oku on public.sa_yedek_ayar for select to authenticated using (true);
drop trigger if exists sa_degisiklik_yedek_ayar on public.sa_yedek_ayar;
create trigger sa_degisiklik_yedek_ayar after update on public.sa_yedek_ayar for each row execute function public.sa_degisiklik_yaz();
create or replace function public.sa_yedek_ayar_kaydet(p_gunluk int, p_aylik int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Saklama süresini yalnız yönetici değiştirir' using errcode = '42501'; end if;
  update public.sa_yedek_ayar set gunluk_gun = p_gunluk, aylik_ay = p_aylik, updated_at = now() where id = 1;
end $$;
revoke all on function public.sa_yedek_ayar_kaydet(int, int) from public, anon;
grant execute on function public.sa_yedek_ayar_kaydet(int, int) to authenticated;

-- ---------- Yedekler ----------
create table if not exists public.sa_yedek (
  id bigserial primary key,
  hesap_id uuid not null references auth.users(id) on delete cascade,
  tarih date not null,                 -- TSİ günü
  tur text not null,                   -- gunluk | elle | oncesi (geri yükleme öncesi)
  at timestamptz not null default now(),
  olusturan text,
  ozet jsonb not null default '{}',    -- tablo → silinmemiş satır sayısı
  veri jsonb not null,                 -- tablo → satırlar
  unique (hesap_id, tarih, tur)
);
create index if not exists sa_yedek_hesap on public.sa_yedek (hesap_id, at desc);
alter table public.sa_yedek enable row level security;

create or replace function public.sa_yedek_izin(p_hesap uuid, ad text) returns boolean language sql stable security definer set search_path = public as $$
  select public.sa_is_admin() or p_hesap = auth.uid()
    or exists (select 1 from public.apiaries a where a.owner_id = p_hesap and public.sa_yetki(a.id, ad));
$$;
drop policy if exists sa_yedek_oku on public.sa_yedek;
create policy sa_yedek_oku on public.sa_yedek for select to authenticated using (public.sa_yedek_izin(hesap_id, 'kayit'));

create or replace function public.sa_yedek_tablolar() returns text[] language sql immutable as $$
  select array['apiaries', 'hives', 'queens', 'records', 'tasks', 'stock_items', 'photos', 'cihaz_devre_disi'];
$$;
create or replace function public.sa_yedek_pk(t text) returns text language sql immutable as $$
  select case t when 'apiaries' then 'id' when 'cihaz_devre_disi' then 'device_id' else 'key' end;
$$;
create or replace function public.sa_yedek_sahip(t text) returns text language sql immutable as $$
  select case t when 'cihaz_devre_disi' then 'user_id' else 'owner_id' end;
$$;

create or replace function public.sa_yedek_al(p_hesap uuid, p_tur text default 'gunluk') returns bigint
language plpgsql security definer set search_path = public as $$
declare t text; v jsonb := '{}'; oz jsonb := '{}'; rows jsonb; n int; yid bigint; gun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  if auth.uid() is not null and not public.sa_yedek_izin(p_hesap, 'geri') then
    raise exception 'Yedek almayı yalnız yönetici, Sahip veya «Geri alabilir» izni olan kişi yapar' using errcode = '42501';
  end if;
  foreach t in array public.sa_yedek_tablolar() loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) order by x.%I), ''[]''::jsonb), count(*) filter (where %s) from public.%I x where x.%I = $1',
      public.sa_yedek_pk(t), case when public.sa_kolon_var(t, 'deleted') then 'not coalesce(x.deleted, false)' else 'true' end, t, public.sa_yedek_sahip(t))
      into rows, n using p_hesap;
    v := v || jsonb_build_object(t, rows); oz := oz || jsonb_build_object(t, n);
  end loop;
  insert into public.sa_yedek (hesap_id, tarih, tur, olusturan, ozet, veri)
  values (p_hesap, gun, p_tur, coalesce(auth.jwt() ->> 'email', 'Otomatik (günlük)'), oz, v)
  on conflict (hesap_id, tarih, tur) do update set at = now(), olusturan = excluded.olusturan, ozet = excluded.ozet, veri = excluded.veri
  returning id into yid;
  return yid;
end $$;
revoke all on function public.sa_yedek_al(uuid, text) from public, anon;
grant execute on function public.sa_yedek_al(uuid, text) to authenticated;

-- günlük iş: her hesap için yedek + saklama süresine göre budama (gunluk_gun gün günlük; ayın 1'i aylik_ay ay saklanır)
create or replace function public.sa_yedek_gunluk() returns int language plpgsql security definer set search_path = public as $$
declare h uuid; k int := 0; ay public.sa_yedek_ayar; gun date := (now() at time zone 'Europe/Istanbul')::date;
begin
  for h in select distinct owner_id from public.apiaries where owner_id is not null
           union select distinct owner_id from public.records where owner_id is not null
           union select distinct owner_id from public.tasks where owner_id is not null
           union select distinct owner_id from public.stock_items where owner_id is not null loop
    perform public.sa_yedek_al(h, 'gunluk'); k := k + 1;
  end loop;
  select * into ay from public.sa_yedek_ayar where id = 1;
  delete from public.sa_yedek where tarih < gun - ay.gunluk_gun
    and not (tur = 'gunluk' and extract(day from tarih) = 1 and tarih >= (gun - make_interval(months => ay.aylik_ay))::date);
  return k;
end $$;
revoke all on function public.sa_yedek_gunluk() from public, anon, authenticated;

do $$ begin
  perform cron.unschedule('sa-yedek-gunluk') where exists (select 1 from cron.job where jobname = 'sa-yedek-gunluk');
  perform cron.schedule('sa-yedek-gunluk', '0 0 * * *', 'select public.sa_yedek_gunluk()');  -- 03:00 TSİ
end $$;

-- Yedek listesi (veri olmadan)
create or replace function public.sa_yedek_liste(p_hesap uuid default null) returns table (id bigint, hesap_id uuid, email text, tarih date, tur text, at timestamptz, olusturan text, ozet jsonb)
language sql stable security definer set search_path = public as $$
  select y.id, y.hesap_id, p.email, y.tarih, y.tur, y.at, y.olusturan, y.ozet
  from public.sa_yedek y left join public.profiles p on p.id = y.hesap_id
  where (p_hesap is null or y.hesap_id = p_hesap) and public.sa_yedek_izin(y.hesap_id, 'kayit')
  order by y.at desc limit 1000;
$$;
revoke all on function public.sa_yedek_liste(uuid) from public, anon;
grant execute on function public.sa_yedek_liste(uuid) to authenticated;

-- Fark: yedek ↔ şimdiki hâl. durum: eklenecek | degisecek | silinecek
create or replace function public.sa_yedek_fark(p_yedek bigint, p_tablo text default null, p_key text default null)
returns table (tablo text, key text, ad text, kovan text, durum text, simdi jsonb, yedekte jsonb)
language plpgsql stable security definer set search_path = public as $$
declare y public.sa_yedek; t text; pk text; ign text[] := array['updated_at', 'server_updated_at', 'updated_by', 'created_at'];
begin
  select * into y from public.sa_yedek where id = p_yedek;
  if y.id is null then raise exception 'Yedek bulunamadı'; end if;
  if not public.sa_yedek_izin(y.hesap_id, 'kayit') then raise exception 'Bu yedeği görme izniniz yok' using errcode = '42501'; end if;
  foreach t in array public.sa_yedek_tablolar() loop
    continue when p_tablo is not null and p_tablo <> t;
    pk := public.sa_yedek_pk(t);
    return query execute format($q$
      with s as (select e as r, e->>%1$L as k from jsonb_array_elements(coalesce($1->%2$L, '[]')) e),
           c as (select to_jsonb(x) as r, to_jsonb(x)->>%1$L as k from public.%2$I x where x.%3$I = $2),
           j as (select coalesce(s.k, c.k) k, s.r sr, c.r cr from s full join c on s.k = c.k)
      select %2$L::text, j.k, coalesce(j.sr, j.cr)->>'name', coalesce(j.sr, j.cr)->>'hive_key',
        case when j.cr is null then 'eklenecek'
             when j.sr is null then 'silinecek'
             when coalesce((j.cr->>'deleted')::boolean, false) and not coalesce((j.sr->>'deleted')::boolean, false) then 'eklenecek'
             else 'degisecek' end,
        j.cr, j.sr
      from j
      where ($3::text is null or j.k = $3)
        and not (j.sr is null and coalesce((j.cr->>'deleted')::boolean, false))
        and not (j.sr is not null and j.cr is not null and (j.sr - $4) = (j.cr - $4))
        and not (j.cr is null and coalesce((j.sr->>'deleted')::boolean, false))
    $q$, pk, t, public.sa_yedek_sahip(t)) using y.veri, y.hesap_id, p_key, ign;
  end loop;
end $$;
revoke all on function public.sa_yedek_fark(bigint, text, text) from public, anon;
grant execute on function public.sa_yedek_fark(bigint, text, text) to authenticated;

-- Geri yükleme kaydı
create table if not exists public.sa_geri_yukleme (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid(),
  email text,
  hesap_id uuid not null,
  yedek_id bigint,
  yedek_tarih date,
  kapsam text,               -- 'Tüm hesap' | tablo | tablo:key
  adet int,
  oncesi_yedek bigint,       -- geri yükleme öncesi alınan güvenlik yedeği
  geri_alindi_at timestamptz
);
alter table public.sa_geri_yukleme enable row level security;
drop policy if exists sa_geri_yukleme_oku on public.sa_geri_yukleme;
create policy sa_geri_yukleme_oku on public.sa_geri_yukleme for select to authenticated using (public.sa_yedek_izin(hesap_id, 'kayit'));

create or replace function public.sa_yedek_geri_yukle(p_yedek bigint, p_tablo text default null, p_key text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare y public.sa_yedek; d record; yk bigint; onc bigint; n int := 0; cols text; ord int;
begin
  select * into y from public.sa_yedek where id = p_yedek;
  if y.id is null then raise exception 'Yedek bulunamadı'; end if;
  if not public.sa_yedek_izin(y.hesap_id, 'geri') then
    raise exception 'Geri yüklemeyi yalnız yönetici, Sahip veya «Geri alabilir» izni olan kişi yapar' using errcode = '42501';
  end if;
  if p_tablo is not null and not (p_tablo = any (public.sa_yedek_tablolar())) then raise exception 'Bilinmeyen tablo'; end if;
  onc := public.sa_yedek_al(y.hesap_id, 'oncesi');
  insert into public.sa_geri_yukleme (email, hesap_id, yedek_id, yedek_tarih, kapsam, oncesi_yedek)
  values (coalesce(auth.jwt() ->> 'email', ''), y.hesap_id, y.id, y.tarih,
    case when p_tablo is null then 'Tüm hesap' when p_key is null then p_tablo else p_tablo || ':' || p_key end, onc)
  returning id into yk;
  perform set_config('sa.yukleme', yk::text, true);
  for d in select f.*, array_position(public.sa_yedek_tablolar(), f.tablo) o from public.sa_yedek_fark(p_yedek, p_tablo, p_key) f
           order by case when f.durum = 'silinecek' then 1 else 0 end, case when f.durum = 'silinecek' then -array_position(public.sa_yedek_tablolar(), f.tablo) else array_position(public.sa_yedek_tablolar(), f.tablo) end loop
    if d.durum = 'silinecek' then
      if public.sa_kolon_var(d.tablo, 'deleted') then
        execute format('update public.%I set deleted = true, updated_at = now() where %I = $1 and %I = $2', d.tablo, public.sa_yedek_pk(d.tablo), public.sa_yedek_sahip(d.tablo)) using d.key, y.hesap_id;
      else
        execute format('delete from public.%I where %I = $1 and %I = $2', d.tablo, public.sa_yedek_pk(d.tablo), public.sa_yedek_sahip(d.tablo)) using d.key, y.hesap_id;
      end if;
    elsif d.simdi is null then
      execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', d.tablo, d.tablo)
        using d.yedekte || jsonb_build_object('updated_at', now());
    else
      select string_agg(format('%I = r.%I', a.attname, a.attname), ', ') into cols
        from pg_attribute a where a.attrelid = ('public.' || d.tablo)::regclass and a.attnum > 0 and not a.attisdropped
          and a.attname not in (public.sa_yedek_pk(d.tablo), public.sa_yedek_sahip(d.tablo), 'updated_at', 'server_updated_at', 'created_at');
      execute format('update public.%I t set %s, updated_at = now() from jsonb_populate_record(null::public.%I, $1) r where t.%I = $2 and t.%I = $3',
        d.tablo, cols, d.tablo, public.sa_yedek_pk(d.tablo), public.sa_yedek_sahip(d.tablo)) using d.yedekte, d.key, y.hesap_id;
    end if;
    n := n + 1;
  end loop;
  perform set_config('sa.yukleme', '', true);
  update public.sa_geri_yukleme set adet = n where id = yk;
  return jsonb_build_object('yukleme_id', yk, 'adet', n, 'oncesi_yedek', onc);
end $$;
revoke all on function public.sa_yedek_geri_yukle(bigint, text, text) from public, anon;
grant execute on function public.sa_yedek_geri_yukle(bigint, text, text) to authenticated;

-- Geri yüklemeyi geri al: o yüklemenin her değişikliği tersten geri alınır (daha yeni değişiklik varsa tümü reddedilir)
create or replace function public.sa_geri_yukleme_geri_al(p_id bigint) returns int
language plpgsql security definer set search_path = public as $$
declare g public.sa_geri_yukleme; e bigint; n int := 0;
begin
  select * into g from public.sa_geri_yukleme where id = p_id;
  if g.id is null then raise exception 'Geri yükleme bulunamadı'; end if;
  if not public.sa_yedek_izin(g.hesap_id, 'geri') then raise exception 'Geri alma izniniz yok' using errcode = '42501'; end if;
  if g.geri_alindi_at is not null then raise exception 'Bu geri yükleme zaten geri alındı'; end if;
  for e in select id from public.sa_degisiklik where yukleme_id = p_id and geri_alan is null order by id desc loop
    perform public.sa_degisiklik_geri_al(e); n := n + 1;
  end loop;
  update public.sa_geri_yukleme set geri_alindi_at = now() where id = p_id;
  return n;
end $$;
revoke all on function public.sa_geri_yukleme_geri_al(bigint) from public, anon;
grant execute on function public.sa_geri_yukleme_geri_al(bigint) to authenticated;

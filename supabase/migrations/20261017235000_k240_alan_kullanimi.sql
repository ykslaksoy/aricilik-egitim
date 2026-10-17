-- koloni-240: Alan kullanımı (Supabase kotası) — veritabanı boyutu, Storage kova toplamları, sunucu yedekleri, veri çıkışı (egress: SQL'den okunamaz → «Veri yok»).
-- Plan sınırları ayarda (varsayılan Free: 500 MB veritabanı, 1 GB Storage, 5 GB/ay egress, 50 MB en büyük dosya — kaynak: https://supabase.com/pricing, 17.10.2026).
-- Pro için: 8 GB / 100 GB / 250 GB. Uyarı %80, kritik %95 (uzman tahmini, yönetici değiştirir). Günlük ölçüm 03:30 TSİ (pg_cron) → yönetici bildirimi.
-- E-posta gönderilmez: projede yöneticiye e-posta gönderen mevcut bir yol yok.

-- ---------- Ayar (tek satır; değişiklik kaydına yazılır, geri alınabilir) ----------
create table if not exists public.sa_alan_ayar (
  id int primary key default 1 check (id = 1),
  plan text not null default 'Free',
  db_limit_mb numeric not null default 500 check (db_limit_mb > 0),
  storage_limit_mb numeric not null default 1024 check (storage_limit_mb > 0),
  egress_limit_gb numeric not null default 5 check (egress_limit_gb > 0),
  dosya_limit_mb numeric not null default 50 check (dosya_limit_mb > 0),
  uyari_yuzde int not null default 80 check (uyari_yuzde between 1 and 99),
  kritik_yuzde int not null default 95 check (kritik_yuzde between 2 and 100),
  kaynak text not null default 'supabase.com/pricing (17.10.2026)',
  esik_kaynak text not null default 'uzman tahmini',
  degistiren_email text,
  updated_at timestamptz not null default now(),
  check (kritik_yuzde > uyari_yuzde)
);
insert into public.sa_alan_ayar (id, degistiren_email) values (1, 'sistem') on conflict do nothing;
alter table public.sa_alan_ayar enable row level security;
drop policy if exists sa_alan_ayar_oku on public.sa_alan_ayar;
create policy sa_alan_ayar_oku on public.sa_alan_ayar for select to authenticated using (public.sa_is_admin());

create or replace function public.sa_alan_ayar_sonra() returns trigger language plpgsql security definer set search_path = public as $$
declare ga bigint := nullif(current_setting('sa.geri_al', true), '')::bigint;
begin
  if (to_jsonb(old) - 'updated_at' - 'degistiren_email') = (to_jsonb(new) - 'updated_at' - 'degistiren_email') then return null; end if;
  insert into public.sa_degisiklik (email, rol, tablo, pk, islem, once, sonra, geri_alinan)
  values (coalesce(auth.jwt() ->> 'email', ''), case when auth.uid() is null then 'Sistem' else 'Yönetici' end, 'sa_alan_ayar', jsonb_build_object('id', new.id),
    case when ga is not null then 'geri_al' else 'guncelle' end, to_jsonb(old), to_jsonb(new), ga);
  return null;
end $$;
drop trigger if exists sa_alan_ayar_sonra on public.sa_alan_ayar;
create trigger sa_alan_ayar_sonra after update on public.sa_alan_ayar for each row execute function public.sa_alan_ayar_sonra();

create or replace function public.sa_alan_ayar_kaydet(p jsonb) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Alan sınırlarını yalnız yönetici değiştirir' using errcode = '42501'; end if;
  update public.sa_alan_ayar set
    plan = left(coalesce(nullif(p->>'plan', ''), plan), 40),
    db_limit_mb = coalesce((p->>'db_limit_mb')::numeric, db_limit_mb),
    storage_limit_mb = coalesce((p->>'storage_limit_mb')::numeric, storage_limit_mb),
    egress_limit_gb = coalesce((p->>'egress_limit_gb')::numeric, egress_limit_gb),
    dosya_limit_mb = coalesce((p->>'dosya_limit_mb')::numeric, dosya_limit_mb),
    uyari_yuzde = coalesce((p->>'uyari_yuzde')::int, uyari_yuzde),
    kritik_yuzde = coalesce((p->>'kritik_yuzde')::int, kritik_yuzde),
    kaynak = left(coalesce(nullif(p->>'kaynak', ''), kaynak), 200),
    degistiren_email = coalesce(auth.jwt() ->> 'email', ''),
    updated_at = now()
  where id = 1;
end $$;
revoke all on function public.sa_alan_ayar_kaydet(jsonb) from public, anon;
grant execute on function public.sa_alan_ayar_kaydet(jsonb) to authenticated;

-- ---------- Günlük ölçümler (eğilim için) ----------
create table if not exists public.sa_alan_olcum (
  gun date primary key,                       -- TSİ günü
  at timestamptz not null default now(),
  db_bytes bigint not null,
  storage_bytes bigint not null,
  kovalar jsonb not null default '{}',        -- kova → {bytes, adet}
  tablolar jsonb not null default '{}'        -- öne çıkan tablolar → bytes (sunucu yedekleri vb.)
);
alter table public.sa_alan_olcum enable row level security;
drop policy if exists sa_alan_olcum_oku on public.sa_alan_olcum;
create policy sa_alan_olcum_oku on public.sa_alan_olcum for select to authenticated using (public.sa_is_admin());

-- ---------- Yönetici bildirimleri ----------
create table if not exists public.sa_yonetici_bildirim (
  id bigserial primary key,
  at timestamptz not null default now(),
  gun date not null default (now() at time zone 'Europe/Istanbul')::date,
  kod text not null,                          -- alan_db | alan_storage | alan_egress
  seviye text not null,                       -- uyari | kritik
  baslik text not null,
  metin text not null,
  veri jsonb not null default '{}',
  okundu_at timestamptz,
  okuyan_email text,
  unique (kod, gun)
);
create index if not exists sa_yonetici_bildirim_at on public.sa_yonetici_bildirim (at desc);
alter table public.sa_yonetici_bildirim enable row level security;
drop policy if exists sa_yonetici_bildirim_oku on public.sa_yonetici_bildirim;
create policy sa_yonetici_bildirim_oku on public.sa_yonetici_bildirim for select to authenticated using (public.sa_is_admin());

create or replace function public.sa_yonetici_bildirim_okundu(p_id bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  update public.sa_yonetici_bildirim set okundu_at = now(), okuyan_email = coalesce(auth.jwt() ->> 'email', '') where id = p_id and okundu_at is null;
end $$;
revoke all on function public.sa_yonetici_bildirim_okundu(bigint) from public, anon;
grant execute on function public.sa_yonetici_bildirim_okundu(bigint) to authenticated;

-- ---------- Ölçüm (iç; yetki kontrolü çağıranlarda) ----------
create or replace function public.sa_alan_olc_ic() returns jsonb language plpgsql stable security definer set search_path = public, storage as $$
declare kv jsonb; tb jsonb; st bigint;
begin
  select coalesce(jsonb_object_agg(b.id, jsonb_build_object('bytes', coalesce(o.bytes, 0), 'adet', coalesce(o.adet, 0))), '{}'::jsonb), coalesce(sum(o.bytes), 0)
    into kv, st
    from storage.buckets b
    left join (select bucket_id, sum(coalesce((metadata->>'size')::bigint, 0)) bytes, count(*) adet from storage.objects group by bucket_id) o on o.bucket_id = b.id;
  select coalesce(jsonb_object_agg(t, pg_total_relation_size(('public.' || t)::regclass)), '{}'::jsonb) into tb
    from unnest(array['sa_yedek', 'sa_telefon_yedek', 'sa_degisiklik', 'sensor_okumalari', 'records', 'photos', 'client_errors']) t
    where to_regclass('public.' || t) is not null;
  return jsonb_build_object('at', now(), 'db_bytes', pg_database_size(current_database()), 'storage_bytes', st, 'kovalar', kv, 'tablolar', tb);
end $$;
revoke all on function public.sa_alan_olc_ic() from public, anon, authenticated;

-- Eğilim: son 30 günün en küçük kareler eğimi (bayt/gün) → yaklaşık kaç gün sonra dolar (uzman tahmini; en az 2 gün ölçüm).
create or replace function public.sa_alan_egilim(p_sutun text, p_limit_bytes numeric, p_simdi numeric) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare egim numeric; n int; gun numeric;
begin
  execute format('select regr_slope(%I::numeric, extract(epoch from gun::timestamp) / 86400.0), count(*) from (select * from public.sa_alan_olcum order by gun desc limit 30) s', p_sutun)
    into egim, n;
  if n < 2 or egim is null then return jsonb_build_object('n', coalesce(n, 0), 'egim_gun', null, 'gun', null); end if;
  if egim > 0 then gun := greatest(0, floor((p_limit_bytes - p_simdi) / egim)); end if;
  return jsonb_build_object('n', n, 'egim_gun', round(egim), 'gun', gun);
end $$;
revoke all on function public.sa_alan_egilim(text, numeric, numeric) from public, anon, authenticated;

-- Panel için: yalnız yönetici.
create or replace function public.sa_alan_kullanimi() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare a public.sa_alan_ayar; m jsonb;
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  select * into a from public.sa_alan_ayar where id = 1;
  m := public.sa_alan_olc_ic();
  return m || jsonb_build_object(
    'ayar', to_jsonb(a),
    'egress_bytes', null,
    'egress_not', 'Veri yok — veri çıkışı (egress) veritabanından okunamaz; Supabase panosu › Usage',
    'gecmis', coalesce((select jsonb_agg(jsonb_build_object('gun', gun, 'db_bytes', db_bytes, 'storage_bytes', storage_bytes) order by gun) from (select * from public.sa_alan_olcum order by gun desc limit 30) s), '[]'::jsonb),
    'egilim', jsonb_build_object(
      'db', public.sa_alan_egilim('db_bytes', a.db_limit_mb * 1048576, (m->>'db_bytes')::numeric),
      'storage', public.sa_alan_egilim('storage_bytes', a.storage_limit_mb * 1048576, (m->>'storage_bytes')::numeric)));
end $$;
revoke all on function public.sa_alan_kullanimi() from public, anon;
grant execute on function public.sa_alan_kullanimi() to authenticated;

-- Günlük iş: ölçümü kaydet, eşik aşılmışsa yönetici bildirimi yaz (metrik başına günde en çok bir).
create or replace function public.sa_alan_gunluk() returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.sa_alan_ayar; m jsonb; g date := (now() at time zone 'Europe/Istanbul')::date; r record; yz numeric; sev text; eg jsonb; yazilan int := 0;
begin
  if auth.uid() is not null and not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  select * into a from public.sa_alan_ayar where id = 1;
  m := public.sa_alan_olc_ic();
  insert into public.sa_alan_olcum (gun, at, db_bytes, storage_bytes, kovalar, tablolar)
  values (g, now(), (m->>'db_bytes')::bigint, (m->>'storage_bytes')::bigint, m->'kovalar', m->'tablolar')
  on conflict (gun) do update set at = excluded.at, db_bytes = excluded.db_bytes, storage_bytes = excluded.storage_bytes, kovalar = excluded.kovalar, tablolar = excluded.tablolar;
  for r in select * from (values
      ('alan_db', 'Veritabanı', 'db_bytes', (m->>'db_bytes')::numeric, a.db_limit_mb * 1048576),
      ('alan_storage', 'Dosya alanı (Storage)', 'storage_bytes', (m->>'storage_bytes')::numeric, a.storage_limit_mb * 1048576)) v(kod, ad, sutun, kul, lim) loop
    yz := round(100 * r.kul / r.lim, 1);
    sev := case when yz >= a.kritik_yuzde then 'kritik' when yz >= a.uyari_yuzde then 'uyari' end;
    if sev is null then continue; end if;
    eg := public.sa_alan_egilim(r.sutun, r.lim, r.kul);
    insert into public.sa_yonetici_bildirim (gun, kod, seviye, baslik, metin, veri)
    values (g, r.kod, sev,
      r.ad || case when sev = 'kritik' then ' dolmak üzere' else ' doluyor' end || ' (%' || replace(yz::text, '.', ',') || ')',
      r.ad || ': ' || pg_size_pretty(r.kul::bigint) || ' / ' || pg_size_pretty(r.lim::bigint) || ' (' || a.plan || ' planı). '
        || case when (eg->>'gun') is not null then 'Bu hızla yaklaşık ' || (eg->>'gun') || ' gün sonra dolar (uzman tahmini). ' else '' end
        || case when sev = 'kritik' then 'Pro plana geçin ya da eski verileri temizleyin.' else 'Pro plana geçişi planlayın.' end,
      jsonb_build_object('yuzde', yz, 'kullanim', r.kul, 'limit', r.lim, 'egilim', eg, 'plan', a.plan))
    on conflict (kod, gun) do update set seviye = excluded.seviye, baslik = excluded.baslik, metin = excluded.metin, veri = excluded.veri, at = now(),
      okundu_at = case when public.sa_yonetici_bildirim.seviye <> excluded.seviye then null else public.sa_yonetici_bildirim.okundu_at end;
    yazilan := yazilan + 1;
  end loop;
  delete from public.sa_alan_olcum where gun < g - 400;
  return jsonb_build_object('gun', g, 'bildirim', yazilan);
end $$;
revoke all on function public.sa_alan_gunluk() from public, anon;
grant execute on function public.sa_alan_gunluk() to authenticated;

do $$ begin
  perform cron.unschedule('sa-alan-gunluk') where exists (select 1 from cron.job where jobname = 'sa-alan-gunluk');
  perform cron.schedule('sa-alan-gunluk', '30 0 * * *', 'select public.sa_alan_gunluk()');  -- 03:30 TSİ (03:00 yedeğinden sonra)
end $$;

-- İlk ölçüm (eğilim tabanı)
select public.sa_alan_gunluk();

-- koloni-222: Cihaz «Devre dışı» ekip genelinde — kayıt hesap (Sahip = arılık sahibi) kapsamında; ekip üyeleri okur,
-- arılık düzenleme yetkisi olanlar (Sahip her zaman) yazar; yönetici hepsini. Değişince ekibe bildirim (ekip_bildirim, Uyarılar + push).
alter table public.cihaz_devre_disi add column if not exists apiary_id uuid references public.apiaries(id) on delete cascade;
alter table public.cihaz_devre_disi add column if not exists degistiren_id uuid;
create index if not exists cihaz_devre_disi_ap on public.cihaz_devre_disi (apiary_id);
-- eski satırlar: arılık adından bul (sahibin arılığı)
update public.cihaz_devre_disi c set apiary_id = a.id from public.apiaries a
  where c.apiary_id is null and a.owner_id = c.user_id and a.name = c.arilik_ad and coalesce(a.deleted, false) = false;

drop policy if exists cdd_sahip on public.cihaz_devre_disi;
drop policy if exists cdd_oku on public.cihaz_devre_disi;
drop policy if exists cdd_yaz on public.cihaz_devre_disi;
drop policy if exists cdd_guncelle on public.cihaz_devre_disi;
drop policy if exists cdd_sil on public.cihaz_devre_disi;
create policy cdd_oku on public.cihaz_devre_disi for select to authenticated using (
  user_id = auth.uid() or public.sa_is_admin() or (apiary_id is not null and public.sa_is_member(apiary_id)));
create policy cdd_yaz on public.cihaz_devre_disi for insert to authenticated with check (
  public.sa_is_admin()
  or (apiary_id is null and user_id = auth.uid())
  or (apiary_id is not null and public.sa_yetki(apiary_id, 'duzen') and user_id = (select owner_id from public.apiaries where id = apiary_id)));
create policy cdd_guncelle on public.cihaz_devre_disi for update to authenticated using (
  public.sa_is_admin() or user_id = auth.uid() or (apiary_id is not null and public.sa_yetki(apiary_id, 'duzen')))
  with check (public.sa_is_admin()
  or (apiary_id is null and user_id = auth.uid())
  or (apiary_id is not null and public.sa_yetki(apiary_id, 'duzen') and user_id = (select owner_id from public.apiaries where id = apiary_id)));
create policy cdd_sil on public.cihaz_devre_disi for delete to authenticated using (public.sa_is_admin() or user_id = auth.uid());

-- Uygulama yazar: hesap = arılığın sahibi; yetki kontrolü burada da (Sahip her zaman, üye «düzenler»)
create or replace function public.sa_cihaz_dd_yaz(p_apiary uuid, p_device text, p_on boolean, p_kovan_id int default null, p_kovan_ad text default null,
  p_tip text default null, p_cihaz_ad text default null, p_arilik_ad text default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare sahip uuid := auth.uid(); arad text := p_arilik_ad;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if p_device is null or length(p_device) > 120 then raise exception 'Geçersiz cihaz'; end if;
  if p_apiary is not null then
    select owner_id, name into sahip, arad from public.apiaries where id = p_apiary;
    if sahip is null then raise exception 'Arılık bulunamadı'; end if;
    if not (public.sa_yetki(p_apiary, 'duzen') or sahip = auth.uid() or public.sa_is_admin()) then
      raise exception 'Bu işlem için arılık düzenleme yetkisi gerekiyor' using errcode = '42501'; end if;
  end if;
  insert into public.cihaz_devre_disi as c (user_id, device_id, apiary_id, arilik_ad, kovan_id, kovan_ad, tip, cihaz_ad, devre_disi, degistiren_email, degistiren, degistiren_id, updated_at)
  values (sahip, p_device, p_apiary, coalesce(arad, p_arilik_ad), p_kovan_id, p_kovan_ad, p_tip, p_cihaz_ad, p_on, auth.jwt() ->> 'email',
    case when sahip = auth.uid() then 'kullanici' else 'ekip' end, auth.uid(), now())
  on conflict (user_id, device_id) do update set devre_disi = excluded.devre_disi, apiary_id = coalesce(excluded.apiary_id, c.apiary_id),
    arilik_ad = coalesce(excluded.arilik_ad, c.arilik_ad), kovan_id = coalesce(excluded.kovan_id, c.kovan_id), kovan_ad = coalesce(excluded.kovan_ad, c.kovan_ad),
    tip = coalesce(excluded.tip, c.tip), cihaz_ad = coalesce(excluded.cihaz_ad, c.cihaz_ad),
    degistiren_email = excluded.degistiren_email, degistiren = excluded.degistiren, degistiren_id = excluded.degistiren_id, updated_at = now();
  return true;
end $$;
revoke all on function public.sa_cihaz_dd_yaz(uuid, text, boolean, int, text, text, text, text) from public, anon;
grant execute on function public.sa_cihaz_dd_yaz(uuid, text, boolean, int, text, text, text, text) to authenticated;

-- Yönetici listesi: arılık kimliği de dönsün
drop function if exists public.sa_admin_cihaz_devre_disi();
create function public.sa_admin_cihaz_devre_disi() returns table (user_id uuid, email text, device_id text, arilik_ad text, kovan_id int, kovan_ad text, tip text, cihaz_ad text, devre_disi boolean, degistiren_email text, degistiren text, updated_at timestamptz, apiary_id uuid)
language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query select c.user_id, u.email::text, c.device_id, c.arilik_ad, c.kovan_id, c.kovan_ad, c.tip, c.cihaz_ad, c.devre_disi, c.degistiren_email, c.degistiren, c.updated_at, c.apiary_id
    from public.cihaz_devre_disi c left join auth.users u on u.id = c.user_id order by c.updated_at desc;
end $$;
revoke all on function public.sa_admin_cihaz_devre_disi() from public, anon;
grant execute on function public.sa_admin_cihaz_devre_disi() to authenticated;

-- Ekip bildirimi: cihaz kapandı / açıldı (yönetici ve geri alma dahil). Metinde Hz/eşik yok.
alter table public.ekip_bildirim drop constraint if exists ekip_bildirim_olay_check;
alter table public.ekip_bildirim add constraint ekip_bildirim_olay_check check (olay in ('olustu','kapatildi','cihaz_kapali','cihaz_acik'));
create or replace function public.sa_cihaz_ad_ek(tip text) returns text language sql immutable as $$
  select case tip when 'isi_nem' then 'termometresi' when 'dis_isi_nem' then 'dış termometresi' when 'tarti' then 'tartısı'
    when 'ses' then 'mikrofonu' when 'ses_titresim' then 'mikrofonu' when 'titresim' then 'titreşim sensörü' when 'ir' then 'IR sensörü'
    when 'kamera_kovan' then 'kamerası' when 'kamera_arilik' then 'kamerası' when 'kamera_merkez' then 'kamerası'
    when 'aku_kovan' then 'bataryası' when 'aku_merkez' then 'gateway bataryası' when 'gateway' then 'gateway cihazı' when 'role_hub' then 'röle/hub cihazı'
    else 'cihazı' end;
$$;
create or replace function public.sa_cihaz_dd_bildir() returns trigger language plpgsql security definer set search_path = public as $$
declare kim text; nesne text; mt text;
begin
  if new.apiary_id is null then return null; end if;
  if tg_op = 'UPDATE' and old.devre_disi is not distinct from new.devre_disi then return null; end if;
  kim := case when public.sa_is_admin() and not exists (select 1 from public.apiary_members m where m.apiary_id = new.apiary_id and m.user_id = auth.uid()) then 'Yönetici'
    else coalesce((select p.email from public.profiles p where p.id = auth.uid()), auth.jwt() ->> 'email', 'Ekip üyesi') end;
  nesne := case when new.kovan_ad is not null or new.kovan_id is not null then 'Kovan ' || coalesce(new.kovan_ad, new.kovan_id::text) || ' ' || public.sa_cihaz_ad_ek(new.tip)
    else coalesce(new.arilik_ad || ' ', '') || public.sa_cihaz_ad_ek(new.tip) end;
  mt := nesne || case when new.devre_disi then ' devre dışı bırakıldı' else ' tekrar etkinleştirildi' end || ' — ' || kim;
  insert into public.ekip_bildirim (apiary_id, kod, olay, baslik, metin, hive_ref, kim, kim_ad)
  values (new.apiary_id, 'cihaz_devre_disi', case when new.devre_disi then 'cihaz_kapali' else 'cihaz_acik' end,
    case when new.devre_disi then 'Cihaz devre dışı' else 'Cihaz tekrar etkin' end, mt,
    case when new.kovan_id is null then null else new.kovan_id::text end, coalesce(auth.uid(), new.user_id), kim);
  return null;
end $$;
drop trigger if exists sa_cihaz_dd_bildir on public.cihaz_devre_disi;
create trigger sa_cihaz_dd_bildir after insert or update on public.cihaz_devre_disi for each row execute function public.sa_cihaz_dd_bildir();

-- Canlı yenileme (realtime)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cihaz_devre_disi') then
      execute 'alter publication supabase_realtime add table public.cihaz_devre_disi'; end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ekip_bildirim') then
      execute 'alter publication supabase_realtime add table public.ekip_bildirim'; end if;
  end if;
end $$;

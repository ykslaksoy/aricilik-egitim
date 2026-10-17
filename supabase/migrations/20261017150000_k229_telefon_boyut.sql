-- koloni-229: Telefon yedeği boyut tetiklemesi — son başarılı yüklemeden beri gönderilmemiş değişiklik telefon_boyut_kb'ye ulaşınca
-- ek yedek ('boyut') alınır ve gönderilir; en az telefon_aralik_dk dakika arayla. Günlük yedek sürer. İki değer uzman tahmini, yönetici değiştirir.
-- Aynı gün alınan boyut yedekleri birbirinin üzerine yazılmaz (her biri ayrı satır/dosya); saklama kuralları (sa_telefon_yedek_temizle) aynen uygulanır.
alter table public.sa_yedek_ayar add column if not exists telefon_boyut_kb int not null default 200 check (telefon_boyut_kb between 10 and 51200);
alter table public.sa_yedek_ayar add column if not exists telefon_aralik_dk int not null default 30 check (telefon_aralik_dk between 5 and 1440);

alter table public.sa_telefon_yedek drop constraint if exists sa_telefon_yedek_tur_check;
alter table public.sa_telefon_yedek add constraint sa_telefon_yedek_tur_check check (tur in ('gunluk', 'elle', 'oncesi', 'boyut'));
drop index if exists public.sa_telefon_yedek_gun;
create unique index if not exists sa_telefon_yedek_gun2 on public.sa_telefon_yedek (hesap_id, user_id, cihaz_id, tarih, tur) where tur in ('gunluk', 'elle');

create or replace function public.sa_telefon_yedek_kaydet(p_cihaz text, p_cihaz_ad text, p_tarih date, p_tur text, p_yol text, p_boyut bigint, p_ozet jsonb, p_fotolar text[], p_at timestamptz default now())
returns bigint language plpgsql security definer set search_path = public as $$
declare h uuid := public.sa_telefon_hesap(); yid bigint;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode = '42501'; end if;
  if split_part(p_yol, '/', 1) <> h::text then raise exception 'Yedek yolu hesapla uyuşmuyor' using errcode = '42501'; end if;
  if p_tur in ('oncesi', 'boyut') then
    select id into yid from public.sa_telefon_yedek where hesap_id = h and yol = p_yol;  -- aynı dosya yeniden gönderildiyse tekrar satır açma
    if yid is not null then return yid; end if;
    insert into public.sa_telefon_yedek (hesap_id, email, cihaz_id, cihaz_ad, tarih, tur, at, yol, boyut, ozet, fotolar)
    values (h, coalesce(auth.jwt() ->> 'email', ''), left(p_cihaz, 64), left(p_cihaz_ad, 120), p_tarih, p_tur, least(coalesce(p_at, now()), now()), p_yol, coalesce(p_boyut, 0), coalesce(p_ozet, '{}'), coalesce(p_fotolar, '{}'))
    returning id into yid;
    return yid;
  end if;
  insert into public.sa_telefon_yedek (hesap_id, email, cihaz_id, cihaz_ad, tarih, tur, at, yol, boyut, ozet, fotolar)
  values (h, coalesce(auth.jwt() ->> 'email', ''), left(p_cihaz, 64), left(p_cihaz_ad, 120), p_tarih, p_tur, least(coalesce(p_at, now()), now()), p_yol, coalesce(p_boyut, 0), coalesce(p_ozet, '{}'), coalesce(p_fotolar, '{}'))
  on conflict (hesap_id, user_id, cihaz_id, tarih, tur) where tur in ('gunluk', 'elle') do update set at = excluded.at, yol = excluded.yol, boyut = excluded.boyut, ozet = excluded.ozet, fotolar = excluded.fotolar, cihaz_ad = excluded.cihaz_ad
  returning id into yid;
  return yid;
end $$;
revoke all on function public.sa_telefon_yedek_kaydet(text, text, date, text, text, bigint, jsonb, text[], timestamptz) from public, anon;
grant execute on function public.sa_telefon_yedek_kaydet(text, text, date, text, text, bigint, jsonb, text[], timestamptz) to authenticated;

drop function if exists public.sa_yedek_ayar_kaydet(int, int, int);
create or replace function public.sa_yedek_ayar_kaydet(p_gunluk int, p_aylik int, p_uyari int default null, p_boyut_kb int default null, p_aralik_dk int default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Saklama süresini yalnız yönetici değiştirir' using errcode = '42501'; end if;
  update public.sa_yedek_ayar set gunluk_gun = p_gunluk, aylik_ay = p_aylik, telefon_uyari_gun = coalesce(p_uyari, telefon_uyari_gun),
    telefon_boyut_kb = coalesce(p_boyut_kb, telefon_boyut_kb), telefon_aralik_dk = coalesce(p_aralik_dk, telefon_aralik_dk), updated_at = now() where id = 1;
end $$;
revoke all on function public.sa_yedek_ayar_kaydet(int, int, int, int, int) from public, anon;
grant execute on function public.sa_yedek_ayar_kaydet(int, int, int, int, int) to authenticated;

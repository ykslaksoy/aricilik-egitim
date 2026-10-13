-- SüperArı: Oğul Risk Skoru (ORS) ayarları — Genetik puan tablosu + ağırlıklar (koloni-130) + sensörlü mod eşikleri (koloni-131).
-- Tek satır (id = 1) JSON. Okuma: herkes (istemci skoru hesaplamak için; gizli veri yok). Yazma: yalnız yönetici (sa_is_admin, fiyat_eksik migration'ı).
-- Satır yoksa uygulama koddaki varsayılanları kullanır. Supabase → SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenlidir).

create table if not exists public.ogul_skor_ayar (
  id integer primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.ogul_skor_ayar enable row level security;
revoke all on public.ogul_skor_ayar from anon, authenticated;
drop policy if exists ogul_skor_ayar_read on public.ogul_skor_ayar;
create policy ogul_skor_ayar_read on public.ogul_skor_ayar for select to anon, authenticated using (true);
grant select on public.ogul_skor_ayar to anon, authenticated;

create or replace function public.sa_ogul_skor_kaydet(p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  w jsonb; t timestamptz := now();
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then raise exception 'Geçersiz veri'; end if;
  w := p_data->'weights';
  if w is null or jsonb_typeof(w) <> 'object' then raise exception 'Ağırlıklar eksik'; end if;
  if abs(coalesce((w->>'genetik')::numeric, 0) + coalesce((w->>'sikisiklik')::numeric, 0) + coalesce((w->>'mevsim')::numeric, 0) + coalesce((w->>'anaYasi')::numeric, 0) - 1) > 0.001 then
    raise exception 'Ağırlıkların toplamı 1 olmalı';
  end if;
  insert into public.ogul_skor_ayar (id, data, updated_at, updated_by) values (1, p_data, t, auth.uid())
  on conflict (id) do update set data = excluded.data, updated_at = t, updated_by = auth.uid();
  return t;
end;
$$;
revoke all on function public.sa_ogul_skor_kaydet(jsonb) from public;
revoke all on function public.sa_ogul_skor_kaydet(jsonb) from anon;
grant execute on function public.sa_ogul_skor_kaydet(jsonb) to authenticated;

-- Varsayılan kayıt (koddaki varsayılanlarla aynı; varsa dokunulmaz). Yönetici yonetici.html › Oğul skorları'ndan düzenler.
insert into public.ogul_skor_ayar (id, data) values (1, '{
  "weights": {"genetik": 0.30, "sikisiklik": 0.40, "mevsim": 0.15, "anaYasi": 0.15},
  "saf": {"kafkas": 5, "buckfast": 15, "karadeniz": 35, "italyan": 55, "mugla": 55, "anadolu": 75, "trakya": 75, "karniyol": 75, "iran": 75, "yigilca": 90, "hatay": 100},
  "melez": {"kafkas+karadeniz": 35, "anadolu+kafkas": 55, "kafkas+karniyol": 55, "karniyol+mugla": 75, "anadolu+karniyol": 75, "anadolu+mugla": 75, "italyan+karniyol": 65,
            "kafkas+karadeniz+mugla": 55, "buckfast+italyan+mugla": 55, "kafkas+karniyol+mugla": 75, "anadolu+kafkas+mugla": 75, "anadolu+kafkas+karniyol": 90, "anadolu+italyan+karniyol": 90},
  "piping": {"kafkas": 2, "buckfast": 2, "karadeniz": 2, "italyan": 2, "mugla": 2, "anadolu": 2, "trakya": 2, "karniyol": 2, "iran": 2, "yigilca": 2, "hatay": 2, "kafkas+karadeniz": 2, "anadolu+kafkas": 2, "kafkas+karniyol": 2, "karniyol+mugla": 2, "anadolu+karniyol": 2, "anadolu+mugla": 2, "italyan+karniyol": 2, "kafkas+karadeniz+mugla": 2, "buckfast+italyan+mugla": 2, "kafkas+karniyol+mugla": 2, "anadolu+kafkas+mugla": 2, "anadolu+kafkas+karniyol": 2, "anadolu+italyan+karniyol": 2},
  "buckfastIkili": 45, "bilinmeyen": 55,
  "sensor": {"pipingHzMin": 400, "pipingHzMax": 500, "pipingDk": 2, "pipingAraSn": 60,
             "tempHigh": 36, "tempHighSaat": 6, "tempHighArti": 10,
             "riseMin": 37, "riseMax": 38.5, "riseDelta": 1.5, "riseSaat": 3, "riseArti": 15,
             "nemHigh": 75, "nemArti": 10,
             "kiloHizli": 1.5, "kiloPlato": 0.3, "ariYuksekOran": 0.8, "kiloArti": 15,
             "ariTrendOran": 0.9, "ariTrendArti": 15, "ariCerceve": 2500, "ariZirveOran": 0.9, "nektarKg": 1}
}'::jsonb) on conflict (id) do nothing;

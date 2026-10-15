-- koloni-161 EK12: ekip bildirimleri (uyarı ilk oluşumu + "[Kişi] kontrol etti, kapattı")
create table if not exists public.ekip_bildirim (
  id bigserial primary key,
  apiary_id uuid not null references public.apiaries(id) on delete cascade,
  kod text not null,
  olay text not null check (olay in ('olustu','kapatildi')),
  baslik text not null,
  metin text not null,
  hive_ref text,
  kim uuid not null default auth.uid(),
  kim_ad text,
  at timestamptz not null default now()
);
create index if not exists ekip_bildirim_ap on public.ekip_bildirim (apiary_id, at desc);
alter table public.ekip_bildirim enable row level security;
drop policy if exists ekip_bildirim_oku on public.ekip_bildirim;
create policy ekip_bildirim_oku on public.ekip_bildirim for select using (public.sa_is_member(apiary_id) or public.sa_is_admin());
drop policy if exists ekip_bildirim_yaz on public.ekip_bildirim;
create policy ekip_bildirim_yaz on public.ekip_bildirim for insert with check (kim = auth.uid() and public.sa_is_member(apiary_id));

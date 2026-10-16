-- koloni-220: Kovan bazında cihaz «Devre dışı bırak» — kullanıcı kendi cihazını kapatır/açar; yönetici hepsini görür ve değiştirir.
create table if not exists public.cihaz_devre_disi (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  device_id text not null,
  arilik_ad text, kovan_id int, kovan_ad text, tip text, cihaz_ad text,
  devre_disi boolean not null default true,
  degistiren_email text, degistiren text not null default 'kullanici',
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);
alter table public.cihaz_devre_disi enable row level security;
drop policy if exists cdd_sahip on public.cihaz_devre_disi;
create policy cdd_sahip on public.cihaz_devre_disi for all to authenticated using (user_id = auth.uid() or public.sa_is_admin()) with check (user_id = auth.uid() or public.sa_is_admin());
create or replace function public.sa_admin_cihaz_devre_disi() returns table (user_id uuid, email text, device_id text, arilik_ad text, kovan_id int, kovan_ad text, tip text, cihaz_ad text, devre_disi boolean, degistiren_email text, degistiren text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.sa_is_admin() then raise exception 'Yalnız yönetici' using errcode = '42501'; end if;
  return query select c.user_id, u.email::text, c.device_id, c.arilik_ad, c.kovan_id, c.kovan_ad, c.tip, c.cihaz_ad, c.devre_disi, c.degistiren_email, c.degistiren, c.updated_at
    from public.cihaz_devre_disi c left join auth.users u on u.id = c.user_id order by c.updated_at desc;
end $$;
grant execute on function public.sa_admin_cihaz_devre_disi() to authenticated;

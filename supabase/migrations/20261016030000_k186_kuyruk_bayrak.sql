-- koloni-186: (1) cevre_kuyruk temizleme RPC'leri (yalnız admin, sayı onayı) (2) ozellik_bayraklari (admin yazar, herkes okur)
create or replace function public.sa_kuyruk_say(islem text) returns int language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  if not public.sa_is_admin() then raise exception 'yetki yok'; end if;
  if islem = 'hata_sil' then select count(*) into n from public.cevre_kuyruk where durum = 'hata';
  elsif islem = 'takili_sil' then select count(*) into n from public.cevre_kuyruk where durum = 'isleniyor' and sonraki < now() - interval '30 minutes';
  elsif islem = 'yeniden_dene' then select count(*) into n from public.cevre_kuyruk where durum = 'hata' or (durum = 'isleniyor' and sonraki < now() - interval '30 minutes');
  else raise exception 'bilinmeyen islem'; end if;
  return n;
end $$;
create or replace function public.sa_kuyruk_temizle(islem text, beklenen int) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.sa_is_admin() then raise exception 'yetki yok'; end if;
  n := public.sa_kuyruk_say(islem);
  if n is distinct from beklenen then raise exception 'sayi degisti: % (onaylanan %)', n, beklenen; end if;
  if islem = 'hata_sil' then delete from public.cevre_kuyruk where durum = 'hata';
  elsif islem = 'takili_sil' then delete from public.cevre_kuyruk where durum = 'isleniyor' and sonraki < now() - interval '30 minutes';
  else update public.cevre_kuyruk set durum = 'bekliyor', deneme = 0, sonraki = now(), hata = null
       where durum = 'hata' or (durum = 'isleniyor' and sonraki < now() - interval '30 minutes'); end if;
  return n;
end $$;
revoke all on function public.sa_kuyruk_say(text) from public, anon;
revoke all on function public.sa_kuyruk_temizle(text, int) from public, anon;
grant execute on function public.sa_kuyruk_say(text) to authenticated;
grant execute on function public.sa_kuyruk_temizle(text, int) to authenticated;

create table if not exists public.ozellik_bayraklari (
  anahtar text primary key, ad text not null, aciklama text, acik boolean not null default false,
  guncellendi timestamptz not null default now()
);
alter table public.ozellik_bayraklari enable row level security;
drop policy if exists ozellik_okur on public.ozellik_bayraklari;
create policy ozellik_okur on public.ozellik_bayraklari for select to anon, authenticated using (true);
drop policy if exists ozellik_admin_yazar on public.ozellik_bayraklari;
create policy ozellik_admin_yazar on public.ozellik_bayraklari for all to authenticated using (public.sa_is_admin()) with check (public.sa_is_admin());
grant select on public.ozellik_bayraklari to anon, authenticated;
grant insert, update, delete on public.ozellik_bayraklari to authenticated;
-- Bu modüller bugün çalışıyor (Yakında ekranında değil); kırılmasın diye açık başlar. Yeni bayraklar varsayılan kapalı.
insert into public.ozellik_bayraklari (anahtar, ad, aciklama, acik) values
  ('stok', 'Stok', 'stok.html', true),
  ('qr_etiket', 'iPhone QR etiket', 'qr-etiket.html', true),
  ('foto_analiz', 'Çerçeve Fotoğraf Analizi', 'koloni-ek.html?ek=foto', true),
  ('bildirim', 'Bildirimler', 'Bildirim açma (yerel + arka plan)', true)
on conflict (anahtar) do nothing;

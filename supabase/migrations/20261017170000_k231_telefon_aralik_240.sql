-- koloni-231: Boyut yedekleri arası en az süre varsayılanı 30 → 240 dk (4 saat). Uzman tahmini; yönetici panelinden değişir.
alter table public.sa_yedek_ayar alter column telefon_aralik_dk set default 240;
update public.sa_yedek_ayar set telefon_aralik_dk = 240, updated_at = now() where id = 1 and telefon_aralik_dk = 30;

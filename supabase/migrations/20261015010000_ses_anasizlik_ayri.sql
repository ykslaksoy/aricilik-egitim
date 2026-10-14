-- koloni-154: anasızlık sesi = ayrı uyarı (Orta); kanıt (yumurta/muayene) artınca Yüksek
alter table public.ses_siniflari drop constraint if exists ses_siniflari_seviye_check;
alter table public.ses_siniflari add constraint ses_siniflari_seviye_check check (seviye in ('kritik','yuksek','ayri','erken','bilgi','kayit'));
update public.ses_siniflari set seviye = 'ayri' where id = 'anasizlik';

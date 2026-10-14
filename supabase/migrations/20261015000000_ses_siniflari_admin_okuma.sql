-- koloni-151: ses_siniflari okuması yalnız yönetici (uygulama kuralları demo-data.js içindeki gömülü kopyadan çalışır)
drop policy if exists ses_siniflari_read on public.ses_siniflari;
revoke select on public.ses_siniflari from anon;
create policy ses_siniflari_read on public.ses_siniflari for select to authenticated using (public.sa_is_admin());

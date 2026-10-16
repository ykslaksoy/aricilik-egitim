-- koloni-202: nem > %80 kesintisiz 24 sa → kireç riski (Liang 2000 PubMed 11767561, Flores 1996 destekleyici; süre uzman tahmini). Sıcaklık kireç kuralıyla ortak 7 günlük anahtar.
update public.ogul_skor_ayar set data = jsonb_set(coalesce(data,'{}'::jsonb), '{sensor,nemKirecUst}', '80'::jsonb, true), updated_at = now() where id = 1;
insert into public.ayar_surumleri (data, fark, not_, yayinlayan_eposta)
select o.data, jsonb_build_object('sensor.nemKirecUst', jsonb_build_object('sonra', 80)), 'koloni-202: nem kireç eşiği %80', 'migration' from public.ogul_skor_ayar o where o.id = 1;
insert into public.yapilacaklar (baslik, aciklama)
select 'Nem kireç riski: >%80 kesintisiz 24 sa (süre uzman tahmini)', 'Destekleyici: Liang 2000, Ying Yong Sheng Tai Xue Bao 11(6):869–72, PubMed 11767561 (DOI yok; %80 altında A. apis spor çimlenmesi engellendi) ve Flores 1996 doi:10.1051/apido:19960401 (%87 nemde kireç artışı, 30 °C). Laboratuvar bulguları; kovan eşiği değil. 24 sa süre kaynaksız. Sıcaklık kireç kuralıyla tek uyarı (kovan başına 7 gün).'
where not exists (select 1 from public.yapilacaklar y where y.baslik = 'Nem kireç riski: >%80 kesintisiz 24 sa (süre uzman tahmini)');

-- koloni-232: 4 titreşim kuralı (kullanıcı onayı): oğul hazırlığı (gece), ana ötmesi, rahatsız edilme / darbe, kış hareketsizliği. Değerler tek kaynak ogul_skor_ayar.sensor (yalnız eksik anahtarlar); frekans ve kaynaklar yalnız yönetici; kaynaksız değerler uzman tahmini → Yapılacaklar.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('titOgulGeceBas',0,'titOgulGeceSon',5,'titOgulHzMin',20,'titOgulHzMax',800,'titOgulGun',10,'titOgulTabanGun',7,'titOgulArtisOran',1.3,'titOgulArtisGece',3,
    'titTootHzMin',200,'titTootHzMax',550,'titQuackHzMin',300,'titQuackHzMax',350,'titOtmeSiraSaat',48,
    'titDarbeHzMin',200,'titDarbeHzMax',400,'titDarbeMinMs',50,'titDarbeMaxMs',200,'titDarbePencereDk',10,'titDarbeKat',5,'titDarbeMinSay',10,'titSpikeG',2,
    'titKisAyBas',11,'titKisAySon',3,'titKisTabanGun',14,'titKisSaat',24,'titKisOran',0.1)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('tit_ogul','sağlık',110,'Titreşim: Oğul hazırlığı (gece)','Gece {s:titOgulGeceBas}–{s:titOgulGeceSon} sa, {s:titOgulHzMin}–{s:titOgulHzMax} Hz; son {s:titOgulArtisGece} gece artan ve kendi tabanının ({s:titOgulTabanGun} gün) × {s:titOgulArtisOran} üstü','erken','Oğul öncesi ses kuralıyla tek uyarı. 400–500 Hz oğul öncesi artışı kaynakta yok. Kullanıcıya: «Erken Uyarı: Oğul Hazırlığı».','Bencsik 2011 doi:10.1016/j.compag.2011.01.004; Ramsey 2020 doi:10.1038/s41598-020-66115-5','bant/saat kaynaklı · oran ve gece sayısı uzman tahmini'),
('tit_otme','sağlık',111,'Titreşim: Ana ötmesi','Tooting {s:titTootHzMin}–{s:titTootHzMax} Hz sonra {s:titOtmeSiraSaat} sa içinde quacking {s:titQuackHzMin}–{s:titQuackHzMax} Hz','kritik','Ötme sırası kuralıyla tek uyarı. Kullanıcıya: «Bakire ana çıktı, ikincil oğul riski».','Ramsey 2020 doi:10.1038/s41598-020-66115-5','frekans kaynaklı · pencere uzman tahmini'),
('tit_darbe','sağlık',112,'Titreşim: Rahatsız edilme / darbe','{s:titDarbeHzMin}–{s:titDarbeHzMax} Hz, {s:titDarbeMinMs}–{s:titDarbeMaxMs} ms sinyaller {s:titDarbePencereDk} dk içinde ≥ {s:titDarbeMinSay} ve tabanın × {s:titDarbeKat}; ya da tek ivme ≥ {s:titSpikeG} g','erken','Rahatsız edilme kuralıyla tek uyarı. Kullanıcıya: «Kovan Rahatsız Edilmiş Olabilir».','Ramsey 2017 doi:10.1371/journal.pone.0171162','sinyal kaynaklı · kat, sayı, g uzman tahmini'),
('tit_kis','sağlık',113,'Titreşim: Kış hareketsizliği','Ay {s:titKisAyBas}–{s:titKisAySon}: {s:titKisSaat} sa boyunca titreşim kendi tabanının ({s:titKisTabanGun} gün) × {s:titKisOran} altında','yuksek','Koloni sönmüş uyarısıyla tek uyarı. Kullanıcıya: «Koloni ölümü şüphesi».','Bencsik 2024 doi:10.1038/s41598-024-54107-8','kavram kaynaklı · eşikler uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Titreşim oğul hazırlığı — eşikler (uzman tahmini)','Taban 7 gün, ×1,3, art arda 3 gece uzman tahmini; kaynaklar öğrenen model kullanır. Gerçek veriyle doğrulanmalı.'),
 ('Titreşim ana ötmesi — pencere (uzman tahmini)','Tooting→quacking 48 sa uzman tahmini.'),
 ('Titreşim darbe — eşikler (uzman tahmini)','10 dk, en az 10 sinyal, taban ×5, tek ivme ≥ 2 g uzman tahmini.'),
 ('Titreşim kış hareketsizliği — eşikler (uzman tahmini)','Kasım–Mart, taban 14 gün, 24 sa, taban × 0,1 uzman tahmini.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

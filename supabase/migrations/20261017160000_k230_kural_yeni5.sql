-- koloni-230: 5 yeni sensör kuralı (kullanıcı onayı): koloni sönmüş, yavrusuz/anasız (sıcaklık salınımı), tarlacı kaybı (tartı), eşek arısı (sıcaklık+tıslama+titreşim), havalandırma (CO2 sensörsüz). Değerler tek kaynak ogul_skor_ayar.sensor (yalnız eksik anahtarlar); kaynaklar yalnız yönetici; kaynaksız değerler uzman tahmini → Yapılacaklar.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('sonukGun',2,'sonukSalinimOran',0.7,'sonukDisMinC',6,'sonukIrGunMax',50,'sonukAgirlikKg',0.3,
    'yavrusuzSalinimC',3,'yavrusuzGun',2,
    'tarlaciSaatBas',7,'tarlaciPencereSaat',3,'tarlaciTabanGun',7,'tarlaciMinKg',0.1,'tarlaciOran',0.4,'tarlaciGun',2,
    'esekSicakDegisimC',0.5,'esekEslesDk',10,'esekTitresimKat',1.5,'esekTitTabanDk',60,'esekGirisYuksekC',44,
    'havaSaat',6,'havaSicakC',36,'havaYogusmaRh',85,'havaYogusmaFarkC',15,'havaYogusmaAyBas',11,'havaYogusmaAySon',3)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('koloni_sonuk','sağlık',99,'Koloni sönmüş olabilir','{s:sonukGun} gün iç günlük salınım ≥ dış salınım × {s:sonukSalinimOran} (dış ≥ {s:sonukDisMinC} °C) + IR günlük ≤ {s:sonukIrGunMax} ya da ağırlık oynaması ≤ {s:sonukAgirlikKg} kg','yuksek','Kullanıcıya: «Koloni sönmüş olabilir» (sayı yok).','Meikle W.G. ve ark. (2017). Apidologie 48:666–680, doi:10.1007/s13592-017-0512-8','kavram kaynaklı · eşikler uzman tahmini'),
('yavrusuz_sicak','sağlık',100,'Yavrusuz / anasız (sıcaklık salınımı)','Kuluçka günlük salınımı ≥ {s:yavrusuzSalinimC} °C, {s:yavrusuzGun} gün; anasızlık uyarısıyla tek uyarı','erken','Kullanıcıya: «Yavru kalmamış olabilir».','Kleinhenz 2003; Groh 2004; Meikle ve ark. 2017 doi:10.1007/s13592-017-0512-8','34–35 °C sabitlik kaynaklı · salınım eşiği uzman tahmini'),
('tarlaci_kayip','sağlık',101,'Tarlacı arı kaybı (tartı)','Uygun uçuş günü sabah {s:tarlaciSaatBas}+{s:tarlaciPencereSaat} sa düşüşü, {s:tarlaciGun} gün tabanın × {s:tarlaciOran} altında (taban ≥ {s:tarlaciMinKg} kg, {s:tarlaciTabanGun} gün)','erken','Kullanıcıya: «Tarlacı arı kaybı olabilir».','Meikle 2008 doi:10.1051/apido:2008055; Meikle & Holst 2014 doi:10.1007/s13592-014-0298-x; Meikle 2018 doi:10.1371/journal.pone.0197589','sabah düşüşü kaynaklı · eşikler uzman tahmini'),
('esek_uclu','sağlık',102,'Eşek arısı: sıcaklık + tıslama + titreşim','{s:esekEslesDk} dk içinde sıcaklık değişimi ≥ {s:esekSicakDegisimC} °C + tıslama + titreşim ≥ taban × {s:esekTitresimKat}; giriş > {s:esekGirisYuksekC} °C ek işaret → kritik','yuksek','Kovan sensörüyle çalışma yok. Kullanıcıya: «Eşek Arısı Saldırısı Olabilir».','Bağlam: Ono 1995 doi:10.1038/377334a0; Käfer 2012 doi:10.1016/j.jinsphys.2012.01.015; Papachristoforou 2007 doi:10.1016/j.cub.2007.07.033','tümü uzman tahmini'),
('havalandirma','sağlık',103,'Havalandırma yetersiz (CO2 sensörsüz)','Nem > normal üst ve kuluçka > {s:havaSicakC} °C {s:havaSaat} sa; ya da ay {s:havaYogusmaAyBas}–{s:havaYogusmaAySon} nem ≥ %{s:havaYogusmaRh} ve iç−dış ≥ {s:havaYogusmaFarkC} °C; yelpazeleme sesi seviyeyi yükseltir','erken','Nem «yüksek» görevi buna katılır; kireç riski varsa çıkmaz. Kullanıcıya: «Havalandırma yetersiz olabilir».','Bağlam: Human, Nicolson, Dietemann 2006 Naturwissenschaften 93:397, doi:10.1007/s00114-006-0117-y','tümü uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Koloni sönmüş — eşikler (uzman tahmini)','Meikle 2017 yalnız kavramı verir; salınım oranı 0,7, dış en az 6 °C, 2 gün, IR ≤ 50/gün, ağırlık ≤ 0,3 kg uzman tahmini. Gerçek veriyle doğrulanmalı.'),
 ('Yavrusuz/anasız — salınım eşiği (uzman tahmini)','Günlük ≥ 3 °C, 2 gün uzman tahmini.'),
 ('Tarlacı kaybı — sabah penceresi ve oranlar (uzman tahmini)','07+3 sa, taban 7 gün, en az 0,1 kg, oran 0,4, 2 gün uzman tahmini.'),
 ('Eşek arısı üçlü kural — tümü (uzman tahmini)','0,5 °C değişim, 10 dk pencere, titreşim ×1,5 (taban 60 dk) uzman tahmini; kovan sensörüyle yayımlanmış çalışma yok. Giriş >44 °C ek işaret (top sıcaklığı Ono 1995 / Käfer 2012).'),
 ('Havalandırma (CO2 sensörsüz) — tümü (uzman tahmini)','6 sa, 36 °C, %85 nem, 15 °C fark, Kasım–Mart uzman tahmini; doğrulanmış kaynak bulunamadı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

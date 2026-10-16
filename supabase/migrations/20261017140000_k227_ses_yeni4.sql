-- koloni-227: 4 yeni kovan içi ses kuralı (kullanıcı onayı). Değerler tek kaynak ogul_skor_ayar.sensor (yalnız eksik anahtarlar eklenir); kaynaklar yalnız yönetici (kural_kaynaklari); kaynaksız değerler uzman tahmini → Yapılacaklar.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('ogulOn110HzMin',100,'ogulOn110HzMax',120,'ogulOn110ArtisDb',3,'ogulOnBaskinHz',300,'ogulOnBaskinTolHz',30,'ogulOnSicakAltC',33,'ogulOnSicakUstC',35,'ogulOnSicakDusC',32,'ogulOnSaat',24,
    'otmeSessizGunMin',4,'otmeSessizGunMax',7,'otmeSiraSaat',48,
    'dursunHzMin',300,'dursunHzMax',450,'dursunMinMs',50,'dursunMaxMs',200,'dursunPencereDk',10,'dursunKat',3,'dursunMinSay',10,
    'esekHzMin',4500,'esekHzMax',7300,'esekTemelHz',499,'esekSureMs',620,'esekSureTolMs',300,'esekMinSay',3,'esekPencereDk',5,'esekMinOrneklemeHz',32000)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('ses_ogul_once','sağlık',95,'Oğul öncesi ses + sıcaklık','~110 Hz bandı ({s:ogulOn110HzMin}–{s:ogulOn110HzMax} Hz) son {s:ogulOnSaat} saatte ≥ {s:ogulOn110ArtisDb} dB artış + baskın frekans {s:ogulOnBaskinHz}±{s:ogulOnBaskinTolHz} Hz''e kayma + sıcaklık {s:ogulOnSicakAltC}→{s:ogulOnSicakUstC} °C; oğul sesinden sonra ≤ {s:ogulOnSicakDusC} °C → oğul çıkmış','erken',
 'Kullanıcıya: «Erken Uyarı: Oğul Hazırlığı» (sayı yok). Mevcut oğul kurallarıyla birlikte görülürse yüksek.','Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Comput. Electron. Agric. 64:72–77, doi:10.1016/j.compag.2008.05.010','frekans/sıcaklık kaynaklı · dB, bant genişliği, süre uzman tahmini'),
('ses_otme_sira','sağlık',96,'Ana arı ötme sırası','Tooting her zaman quacking''den önce (son {s:otmeSiraSaat} saatte tooting yoksa quacking uyarısı yok); oğuldan sonra {s:otmeSessizGunMin}–{s:otmeSessizGunMax} gün ötme yoksa normal → ses anasızlık uyarısı susar','bilgi',
 'Yanlış alarmı azaltır, kendi uyarısı yok.','Ramsey M.-T. ve ark. (2020). Sci. Rep. 10:9798, doi:10.1038/s41598-020-66115-5','sıra ve gün aralığı kaynaklı · arama penceresi uzman tahmini'),
('ses_rahatsiz','sağlık',97,'Rahatsız edilme (dur sinyali)','Dur sinyali ({s:dursunHzMin}–{s:dursunHzMax} Hz, {s:dursunMinMs}–{s:dursunMaxMs} ms) darbe/sarsıntıdan sonra {s:dursunPencereDk} dk içinde ≥ {s:dursunMinSay} ve aynı gece/gündüz tabanının ≥ {s:dursunKat} katı','erken',
 'Kullanıcıya: «Kovan Rahatsız Edilmiş Olabilir» (sayı yok).','Ramsey M., Bencsik M., Newton M.I. (2017). PLoS One 12(2):e0171162, doi:10.1371/journal.pone.0171162','gece ağırlıklı düzen kaynaklı · Hz ve eşikler uzman tahmini'),
('ses_esek_arisi','sağlık',98,'Eşek arısı tıslaması','Baskın {s:esekHzMin}–{s:esekHzMax} Hz, süre {s:esekSureMs}±{s:esekSureTolMs} ms, {s:esekPencereDk} dk içinde ≥ {s:esekMinSay}; mikrofon < {s:esekMinOrneklemeHz} Hz örnekleme → «Veri yok / mikrofon desteklemiyor»','yuksek',
 'Kaynaktaki alt tür A. m. cypria (Kıbrıs); Türkiye ırklarında doğrulanmadı. Kullanıcıya: «Eşek Arısı Saldırısı Olabilir».','Papachristoforou A. ve ark. (2008). Apidologie 39:468–474, doi:10.1051/apido:2008027','frekans/süre kaynaklı (499±67 Hz temel, 5,9±1,4 kHz baskın, ~0,62 sn) · sayı/pencere uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Ses: Oğul öncesi — dB, bant genişliği ve süre (uzman tahmini)','Ferrari 2008 110 Hz artışı ve 300 Hz kaymasını gösterir; artış dB (3), bant 100–120 Hz, tolerans 30 Hz, pencere 24 saat kaynakta yok. Gerçek kovan verisiyle doğrulanmalı.'),
 ('Ses: Ötme sırası — tooting arama penceresi (uzman tahmini)','Ramsey 2020 sırayı verir; 48 saatlik pencere uzman tahmini.'),
 ('Ses: Rahatsız edilme — dur sinyali Hz/süre/eşikler (uzman tahmini)','Ramsey 2017 gece ağırlıklı düzeni verir; 300–450 Hz, 50–200 ms, 10 dk, 3 kat, en az 10 uzman tahmini.'),
 ('Ses: Eşek arısı — sayı/pencere/tolerans (uzman tahmini) ve Türkiye ırkı doğrulaması','Papachristoforou 2008 A. m. cypria / Vespa orientalis. 300 ms tolerans, 5 dk içinde 3 tıslama uzman tahmini; Türkiye ırklarında doğrulanmadı; mikrofon ≥32 kHz örnekleme gerekir.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

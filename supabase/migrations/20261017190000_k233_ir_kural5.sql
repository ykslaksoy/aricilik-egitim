-- koloni-233: 5 IR giriş sayacı kuralı (kullanıcı onayı): ilaçlama şüphesi, dönmeyen tarlacı, beklenenden düşük aktivite, sayaç arızası, oğul çıktı. Değerler tek kaynak ogul_skor_ayar.sensor (yalnız eksik anahtarlar); kaynaklar yalnız yönetici; kaynaksız değerler uzman tahmini → Yapılacaklar.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('ilacPencereDk',60,'ilacTabanGun',5,'ilacGirisKat',2,'ilacCikisOran',0.7,'ilacMinTaban',20,
    'donmeYumusakGun',3,'donmeTabanGun',7,'donmeFark',0.1,'donmeMinCikis',200,
    'aktiviteTabanGun',14,'aktiviteMinGun',7,'aktiviteGun',3,'aktiviteOran',0.5,
    'sayacSaat',2,'sayacMinDiger',50,'sayacDengeOran',0.5,'sayacGun',2,
    'ogulCiktiDk',10,'ogulCiktiNet',2000,'ogulDonusDk',60,'ogulDonusOran',0.3,'ogulKgDusus',1)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('ir_ilac','sağlık',104,'IR: İlaçlama şüphesi','{s:ilacPencereDk} dk gündüz penceresinde giren ≥ taban × {s:ilacGirisKat} ve çıkan ≤ taban × {s:ilacCikisOran} (taban: önceki {s:ilacTabanGun} gün aynı saat medyanı, en az {s:ilacMinTaban})','yuksek','Kullanıcıya: «İlaçlama şüphesi» (sayı yok).','Struye M.H. ve ark. (1994). Apidologie 25(4):384–395, doi:10.1051/apido:19940405','desen kaynaklı · eşikler uzman tahmini'),
('ir_donmeyen','sağlık',105,'IR: Dönmeyen tarlacı','Günlük (giren−çıkan)/çıkan, {s:donmeYumusakGun} gün ortalaması < {s:donmeTabanGun} gün taban medyanı − {s:donmeFark} (çıkış ≥ {s:donmeMinCikis}/gün); tartı tarlacı kaybıyla tek uyarı','erken','Kullanıcıya: «Tarlacı arı kaybı olabilir».','Henry M. ve ark. (2012). Science 336:348–350, doi:10.1126/science.1215039','dönüş oranı kaynaklı · eşikler uzman tahmini'),
('ir_aktivite','sağlık',106,'IR: Beklenenden düşük aktivite','Kovana özgü sıcaklık→çıkış modeli ({s:aktiviteTabanGun} uygun gün, en az {s:aktiviteMinGun}); {s:aktiviteGun} uygun gün gerçek < beklenen × {s:aktiviteOran}; ışınım verisi yok','erken','Kullanıcıya: «Uçuş beklenenden az».','Clarke D., Robert D. (2018). Apidologie 49:386–396, doi:10.1007/s13592-018-0565-3','model kaynaklı · eşikler uzman tahmini'),
('ir_sayac','cihaz',107,'IR: Sayaç arızası','Bir kanal {s:sayacSaat} sa sıfır, diğerleri ≥ {s:sayacMinDiger}; ya da {s:sayacGun} gün giren/çıkan sapması > {s:sayacDengeOran}','erken','Arıza varken diğer IR kuralları susar. Kullanıcıya: «Kanal tıkalı olabilir».','Odemer R. (2021). Ann. Appl. Biol. 180:73–89, doi:10.1111/aab.12727','tümü uzman tahmini'),
('ir_ogul_cikti','oğul',108,'IR: Oğul çıktı','{s:ogulCiktiDk} dk net çıkış ≥ {s:ogulCiktiNet}, sonraki {s:ogulDonusDk} dk dönen < × {s:ogulDonusOran}; tartı düşüşü ≥ {s:ogulKgDusus} kg → kritik; oğul sesiyle tek uyarı','kritik','Kullanıcıya: «Oğul çıkmış olabilir».','Struye M.H. ve ark. (1994). Apidologie 25(4):384–395, doi:10.1051/apido:19940405 (yalnız tarif)','tümü uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('IR ilaçlama şüphesi — eşikler (uzman tahmini)','Struye 1994 yalnız deseni verir; 60 dk pencere, 5 gün taban, giren ×2, çıkan ×0,7, en az 20 arı uzman tahmini.'),
 ('IR dönmeyen tarlacı — eşikler (uzman tahmini)','Henry 2012 dönüş oranı kavramı; 3 gün yumuşatma, 7 gün taban, 0,1 fark, en az 200 çıkış uzman tahmini.'),
 ('IR düşük aktivite — eşikler (uzman tahmini)','Clarke & Robert 2018 modeli; ışınım verisi yok. 14 uygun gün öğrenme (en az 7), 3 gün, beklenenin 0,5 altı uzman tahmini.'),
 ('IR sayaç arızası — eşikler (uzman tahmini)','Odemer 2021 tıkanmayı anlatır; 2 sa sıfır, diğerleri ≥ 50, denge sapması 0,5, 2 gün uzman tahmini.'),
 ('IR oğul çıktı — eşikler (uzman tahmini)','Struye 1994 yalnız tarif; 10 dk, net 2000 arı, 60 dk dönüş, dönen ≤ 0,3, tartı 1 kg uzman tahmini.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

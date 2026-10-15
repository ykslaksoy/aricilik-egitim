-- k171: onaylı tahmini melez puanları (kaynak yalnız yönetici).
insert into public.kural_kaynaklari (id, grup, sira, ad, degerler, seviye, aciklama, kaynak, durum) values
 ('melez_kafkas_mugla','oğul skoru',15,'Melez: Kafkas × Muğla','Genetik: 35 · Oğul ölçeği: 3','—','Oğul eğilimi Kafkas %10, Muğla %30, Kafkas ana × Muğla erkek %10, Muğla ana × Kafkas erkek %20; yüksük 6,50/9,40/7,50/10,80; P>0,05.','Uludağ Arıcılık Dergisi 5(4) 2005 — https://dergipark.org.tr/tr/download/article-file/143543','kaynağa dayalı tahmin'),
 ('melez_karadeniz_mugla','oğul skoru',16,'Melez: Karadeniz × Muğla','Genetik: 55 · Oğul ölçeği: 4','—','Veri eksik: sayısal çalışma bulunamadı (TAGEM, Muğla AAE, DergiPark).','—','uzman tahmini'),
 ('melez_karadeniz_anadolu','oğul skoru',17,'Melez: Karadeniz × Anadolu','Genetik: 65 · Oğul ölçeği: 4–5','—','Veri eksik: sayısal çalışma bulunamadı (TAGEM, Muğla AAE, DergiPark).','—','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
update public.yapilacaklar set aciklama = 'Puansız ırk/melez kalmadı: Efe 25, Kafkas × Muğla 35, Karadeniz × Muğla 55, Karadeniz × Anadolu 65 (tahmini; Karadeniz melezleri için sayısal çalışma aranmaya devam).' where id = 4;

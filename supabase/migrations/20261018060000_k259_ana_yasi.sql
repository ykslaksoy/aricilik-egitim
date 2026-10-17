-- koloni-259 (ÖNİZLEME — canlıya uygulanmadı): ana arı yaşı ayarları.
-- Ayar değerleri ogul_skor_ayar.data.sensor içinde (anaYasPuan*, anaDeg*, anaRisk3*); kayıt yoksa koddaki varsayılanlar geçerli → şema değişikliği yok.
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Ana yaşı oğul puanları 20 / 60 / 100 (uzman tahmini)','Oğul skoru ana yaşı bileşeni: bu yılın anası 20, 1 yaş 60, 2 yaş ve üstü 100. Yön Simpson 1957/1960 (genç anada oğul hazırlığı daha az) ve Akyol ve ark. 2008 ile uyumlu; sayıların kaynağı yok. Yönetici › Ölçüm kuralları › Ana arı yaşı ve değişim. Kaynak aranacak.'),
 ('Ana arı 3. yaş risk düzeyleri ırk başına (uzman tahmini; Anadolu hariç)','Kafkas 1 (düşük), Kafkas×Karadeniz 2, Karadeniz 2, Kafkas×Karniyol 3, Karniyol×Muğla 3, Karniyol 3, İtalyan 3, Buckfast 4, diğer 2 — kaynak yok. Anadolu 3: Akyol ve ark. 2008 (3 yaşta yaşama %40). Değişim yaşı tüm ırklarda 2 yıl: AAE 2022 «Ana Arı» (Güler 2017) genel öneri; Kafkas ırkına özgü çalışma bulunamadı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

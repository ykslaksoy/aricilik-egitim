-- koloni-292 (önizleme): Yönlü melez genetik puanları (45/30/30) + hırçınlık — ogul_skor_ayar.data.melezYon / .hircinlik (şema değişmez).
insert into public.kural_kaynaklari (id, grup, sira, ad, degerler, seviye, aciklama, kaynak, durum) values
 ('ogul_akyol_2005_uludag','oğul skoru',20,'Oğul eğilimi — Kafkas × Muğla yönleri','Kafkas %10 · Muğla %30 · Kafkas ana × Muğla baba %10 · Muğla ana × Kafkas baba %20','—','Genotipler arası fark önemsiz (P>0,05). Yönlü genetik puanlar yönetici › Arı genetikleri (uzman tahmini).','Akyol, Özkök, Öztürk, Bayram 2005 — https://dergipark.org.tr/tr/download/article-file/143543','kaynaklı'),
 ('hircinlik_akyol_2003','oğul skoru',21,'Hırçınlık — sokma (60 sn, bilye)','Kafkas 3,73 · Kafkas ana × Muğla baba 7,73 · Muğla 15,0 · Muğla ana × Kafkas baba 19,9','—','Kullanıcıda yalnız seviye etiketi; eşikler uzman tahmini (yönetici paneli).','Akyol, Yeninar, Kaftanoğlu, Özkök 2003 — https://dergipark.org.tr/en/pub/uluaricilik/article/162695','kaynaklı')
on conflict (id) do update set degerler=excluded.degerler, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Arı genetikleri önizleme onayı (koloni-292)','Yönlü melez genetik: Muğla ana×Kafkas baba 45, Kafkas ana×Muğla baba 30, Efe ana×Kafkas baba 30 (uzman tahmini; kilitli tablo 35/55 değişmez). Hırçınlık eşikleri ve sokma sayıları yönetici › Arı genetikleri; canlı ogul_skor_ayar yalnız yayın onayından sonra.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

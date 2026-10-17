-- koloni-260: «🔍 Hastalık tahmini» ayarları yönetici paneline alındı (tek kaynak ogul_skor_ayar.data.hastalik; yoksa hastalik-ayar.js varsayılanları — davranış değişmez).
-- Tüm sayılar kaynaksız → uzman tahmini. İhbarı zorunlu listesi: Hayvan Sağlığı Zabıtası Yönetmeliği — doğrulanacak. Veri değişikliği gerekmez.
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('hastalik_agirlik','hastalık tahmini',10,'Hastalık tahmini: belirti ağırlıkları','8 hastalık × belirti ağırlıkları (ör. AYÇ: kibrit 5, kapak 3, koku 2, dağınık 1,5)','bilgi','Hastalık puanı = işaretli belirti ağırlıkları toplamı. Yönetici › Hastalık tahmini.','Kaynak yok','uzman tahmini'),
('hastalik_esik','hastalık tahmini',20,'Hastalık tahmini: puan eşikleri','<1,5 listelenmez · ≥3 Muhtemel · ≥5 En muhtemel · en çok 3 aday','bilgi','Sıralama ve etiket eşikleri.','Kaynak yok','uzman tahmini'),
('hastalik_foto','hastalık tahmini',30,'Hastalık tahmini: fotoğraf ipucu','Güçlü 0,5 · zayıf 0,35 · kötü fotoğraf ×0,5 · en az 700 px · dağınık yavru boşluk ≥%30 (güçlü %42) · beyaz leke ≥3 (güçlü 8) · akar ≥5 (güçlü 15)','bilgi','Renk/piksel kuralları; yapay zekâ değil, doğrulanmadı.','Kaynak yok','uzman tahmini'),
('hastalik_ayc_zorla','hastalık tahmini',40,'Hastalık tahmini: AYÇ zorunlu alarm','Kibrit testi tek başına veya kapak+koku → AYÇ listede (3 puan) + ihbar uyarısı','alarm','Kibrit testi yöntemi ve 2–3 cm ipliklenme ifadesi doğrulanacak (NBU Foulbrood).','Kaynak doğrulanmadı','uzman tahmini'),
('hastalik_kontrol_gun','hastalık tahmini',50,'Hastalık tahmini: şüphe kaydı kontrol günü','AYÇ 3 gün · diğerleri 7 gün','bilgi','Şüpheli kaydın kontrol tarihi.','Kaynak yok','uzman tahmini'),
('hastalik_ihbar','hastalık tahmini',60,'Hastalık tahmini: ihbarı zorunlu hastalıklar','Varsayılan yalnız AYÇ','alarm','Şüphede kırmızı «ihbar» uyarısı. Hastalık başına aç/kapa.','Hayvan Sağlığı Zabıtası Yönetmeliği (liste doğrulanmadı)','doğrulanacak')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Hastalık tahmini: belirti ağırlıkları (uzman tahmini)','8 hastalık için belirti ağırlıkları kaynaksız. Saha tanı kılavuzlarıyla (WOAH Manual, NBU) karşılaştırılıp doğrulanmalı. Yönetici › Hastalık tahmini.'),
 ('Hastalık tahmini: puan eşikleri 1,5 / 3 / 5 ve en çok 3 aday (uzman tahmini)','Listeleme ve «Muhtemel/En muhtemel» eşikleri kaynaksız; gerçek vakalarla doğrulanmalı.'),
 ('Hastalık tahmini: fotoğraf ipucu katsayıları ve eşikleri (uzman tahmini)','0,5/0,35, kötü fotoğraf ×0,5, 700 px, dağınık yavru %30/%42, beyaz leke 3/8, akar 5/15 — etiketli fotoğraf setiyle doğrulanmalı.'),
 ('Hastalık tahmini: AYÇ zorunlu alarm kuralı (kaynak doğrulanacak)','Kibrit testi tek başına veya kapak+koku → AYÇ alarmı. NBU «Foulbrood disease of honey bees» ile doğrulanmalı.'),
 ('Hastalık tahmini: şüphe kontrol günleri AYÇ 3 / diğer 7 (uzman tahmini)','Kontrol günleri kaynaksız.'),
 ('Hastalık tahmini: ihbarı zorunlu hastalık listesi doğrulanacak','Şu an yalnız AYÇ işaretli. Hayvan Sağlığı Zabıtası Yönetmeliği ihbarı mecburi listesi açılıp EYÇ, Varroa, Nosema, Tropilaelaps, Aethina için doğrulanmalı; yönetici panelinde işaretlenmeli.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

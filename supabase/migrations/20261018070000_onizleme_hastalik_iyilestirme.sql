-- ÖNİZLEME (onizleme/hastalik-iyilestirme) — canlıya UYGULANMADI. Yayında uygulanacak.
-- Doğrulanmış kaynaklar: İhbarı Mecburi Hayvan Hastalıkları ve Bildirimine Dair Yönetmelik Ek-1 (AYÇ, Aethina, Tropilaelaps); HBHC 2026 Tablo 1 (1% / 2%); NBU Managing Varroa (×400/×30/×100, 1000 akar); WOAH Manual 2023 3.2.2; NBU Foulbrood 2017; NBU CBPV; Fries ve ark. 2013.
update public.kural_kaynaklari set kaynak='İhbarı Mecburi Hayvan Hastalıkları ve Bildirimine Dair Yönetmelik Ek-1 (mevzuat.gov.tr No 14691): AYÇ, Küçük kovan kurdu, Tropilaelaps', durum='kaynaklı', degerler='AYÇ, Küçük kovan kurdu (Aethina), Tropilaelaps', updated_at=now() where id='hastalik_ihbar';
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('hastalik_varroa_esik','hastalık tahmini',70,'Hastalık tahmini: Varroa mevsim eşiği','Durgun/artış ≥%1 · tepe/azalma ≥%2 (akar/100 arı); ay→evre eşlemesi uzman tahmini','uyarı','Son sayım (60 gün) eşikle karşılaştırılır.','HBHC Tools for Varroa Management 9. baskı (2026) Tablo 1','kaynaklı'),
('hastalik_tabla','hastalık tahmini',80,'Hastalık tahmini: akar tahtası','Günlük düşüm × 400 (Kas–Şub) / 30 (May–Ağu) / 100 (diğer); eşik 1000 akar','uyarı','Birleşik Krallık için tanımlı.','NBU/APHA Managing Varroa','kaynaklı'),
('hastalik_ayirici','hastalık tahmini',90,'Hastalık tahmini: ayırıcı tanı (7 yeni durum)','KKK, Tropilaelaps, taşlaşmış yavru, CBPV, zehirlenme, açlık, ana sorunu','bilgi','Belirti metinleri kaynaklı (WOAH, NBU, Bakanlık); ağırlıklar uzman tahmini.','WOAH 2023 3.2.2; NBU CBPV; Tarım ve Orman Bakanlığı arı hastalıkları 2022','kısmen kaynaklı'),
('hastalik_baglam','hastalık tahmini',100,'Hastalık tahmini: mevsim katsayısı ve geçmiş puanı','Mevsim katsayısı varsayılan 1 (etkisiz) · geçmiş +1 puan / 60 gün','bilgi','','Kaynak yok','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
update public.yapilacaklar set aciklama = aciklama || ' — DOĞRULANDI: Ek-1 arı için AYÇ, Aethina, Tropilaelaps; EYÇ/Varroa/Nosema değil.' where baslik='Hastalık tahmini: ihbarı zorunlu hastalık listesi doğrulanacak' and aciklama not like '%DOĞRULANDI%';
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Hastalık tahmini: ayırıcı tanı ağırlıkları (KKK, Tropilaelaps, taşlaşmış yavru, CBPV, zehirlenme, açlık, ana sorunu) (uzman tahmini)','Belirti metinleri kaynaklı; ağırlıklar kaynaksız.'),
 ('Hastalık tahmini: Varroa ay → koloni evresi eşlemesi (uzman tahmini)','HBHC eşikleri evreye göre; Türkiye bölgeleri için ay eşlemesi kaynaksız (Kasım–Şubat durgun, Mart–Mayıs artış, Haziran–Ağustos tepe, Eylül–Ekim azalma).'),
 ('Hastalık tahmini: tedavi sonrası yeniden sayım 21 gün (uzman tahmini)','HBHC «tedaviden sonra yeniden sayın» der; gün sayısı yok.'),
 ('Hastalık tahmini: mevsim katsayıları ve geçmiş puanı (uzman tahmini)','Varsayılan etkisiz (1) ve +1 puan / 60 gün; kaynakla doldurulmalı.'),
 ('Hastalık tahmini: açlık, ana sorunu, taşlaşmış yavru belirti metinleri doğrulanacak','Bu üç durumun belirti metni açılıp doğrulanmış bir kaynağa bağlanmadı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

-- koloni-267 (önizleme): «Bal hedefi ve Tartı döşemeleri» yönetici paneline alındı (tek kaynak ogul_skor_ayar.data.balHedef; yoksa bal-hedef.js varsayılanları).
-- Hedef toplamı artık elle girilen kovan sayısıyla değil aktif kovan sayısıyla. Kış stoğu 20 kg: NBU Fact Sheet 19 (Doeke ve ark. 2015). Diğer sayılar kaynaksız → uzman tahmini.
-- Yayın onayına kadar canlıya UYGULANMAZ. Veri değişikliği gerekmez (ayar yoksa varsayılanlar).
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('bal_hedef_taban','bal hedefi',10,'Bal hedefi: taban ve genel katsayı','13,8 kg/kovan × 1,06','bilgi','Kovan başı sezon hedefi = taban × ırk katsayısı × sis uçuş katı × genel katsayı. Yönetici › Bal hedefi.','Kaynak yok','uzman tahmini'),
('bal_hedef_irk','bal hedefi',20,'Bal hedefi: ırk katsayıları','Karadeniz 1,22 · Kafkas×Karniyol 1,2 · Kafkas 0,97 (sisli 1,08) · Muğla 1,05 (sisli 0,95) · Karniyol 1,08 (sisli 1)','bilgi','Irk başına verim katsayısı ve sisli bölgede uçuş kaybı hassasiyeti.','Kaynak yok','uzman tahmini'),
('bal_hedef_sis','bal hedefi',30,'Bal hedefi: sisli bölge','Kelimeler yanık, cimil, rize · uçuşa kapalı gün payı 0,294 (45/153)','bilgi','Arılık adında geçen kelimeye göre sisli sayılır.','Kaynak yok','uzman tahmini'),
('tarti_kis_stok','bal hedefi',40,'Tartı: kış stoğu yetersiz','Net bal < 20 kg','uyari','Tartı sayfası «Kış stoğu» döşemesi.','NBU Fact Sheet 19 (Doeke, Frazier, Grozinger 2015)','kaynaklı'),
('tarti_hasat_hazir','bal hedefi',50,'Tartı: hasada hazır','Net bal ≥ kış stoğu + 10 kg; ilaç bekleme süresindeki kovan hariç','bilgi','Tartı sayfası «Hasada hazır» döşemesi.','Kaynak yok','uzman tahmini'),
('tarti_nektar_gun','bal hedefi',60,'Tartı: nektar akımı penceresi','Son 7 gün; günlük artış eşiği Ölçüm kuralları › Ağırlık › Nektar','bilgi','Tartı sayfası «Nektar akımı» döşemesi.','Kaynak yok','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Bal hedefi: taban 13,8 kg/kovan ve genel katsayı 1,06 (uzman tahmini)','Kaynaksız. Bölgesel verim istatistikleriyle (TÜİK il bazında kovan başı bal) karşılaştırılıp doğrulanmalı. Yönetici › Bal hedefi.'),
 ('Bal hedefi: ırk katsayıları ve sis kaybı (uzman tahmini)','Karadeniz/Kafkas/Karniyol/Muğla verim katsayıları ve sisli bölge uçuş kaybı kaynaksız; ırk karşılaştırma çalışmalarıyla doğrulanmalı.'),
 ('Bal hedefi: sisli bölge kelimeleri ve 45/153 gün payı (uzman tahmini)','Arılık adına göre sis tespiti ve uçuşa kapalı gün payı kaynaksız; iklim verisiyle değiştirilmeli.'),
 ('Tartı: hasada hazır eşiği kış stoğu + 10 kg (uzman tahmini)','Hasada hazır sayılmak için gereken fazla bal kaynaksız.'),
 ('Tartı: nektar akımı penceresi 7 gün (uzman tahmini)','Günlük artış eşiği Ölçüm kuralları › Ağırlık › Nektar ile aynı; pencere süresi kaynaksız.'),
 ('Kışlık hazırlık eşiği 15 kg ile Tartı kış stoğu 20 kg birleştirilmeli','Kışlık hazırlık uyarısı (demo-data.js WINTER_MIN_KG = 15, kaynaksız) Tartı döşemesindeki 20 kg (NBU Fact 19) ile tek kaynağa bağlanmalı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

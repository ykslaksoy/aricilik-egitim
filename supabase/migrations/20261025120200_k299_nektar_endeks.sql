-- koloni-299 (önizleme): Günlük tarlacı aktivitesi + nektar akışı endeksi — kural kaynakları + Yapılacaklar güncelleme (canlı DB uygulanmaz; migration dosyası).
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('endeks_tar_tam','günlük endeks',10,'Günlük endeks: tarlacı tam puan','Günlük çıkış 600 arı = 100 puan (taban yoksa)','bilgi','Arılık özet kartı · giriş sayacı (IR). Yönetici › Ölçüm kuralları › Günlük endeks.','Kaynak yok','uzman tahmini'),
('endeks_nektar_tam','günlük endeks',20,'Günlük endeks: nektar tam puan','Günlük net artış 1,5 kg = 100 puan','bilgi','Arılık özet kartı · tartı günlük değişim. Tartı «Nektar akımı» döşemesi ayrı.','Kaynak yok','uzman tahmini'),
('endeks_hava','günlük endeks',30,'Günlük endeks: uçuş uygun değilse çarpan','0,35','bilgi','Dış hava / uçuş uygunluğu (sabah penceresi) düşükse endeks çarpılır.','Kaynak yok','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();

update public.yapilacaklar set aciklama = 'Sensör verisinden (giriş sayacı, tartı, dış hava) tarlacı aktivitesi ve nektar akışı endeksi günlük hesaplanır; arılık/kovan özetinde gösterilir. Mevcut tartı «Nektar akımı» döşemesi ve oğul skoru nektar bayrağı bunun yerine değil.
Yönetici paneli: Ölçüm kuralları › Günlük endeks (önizleme) + Ağırlık (tartı) › Nektar; Bal hedefi / tartı döşemeleri ile çakışma notu.
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).'
where baslik = 'Tarlacı aktivitesi ve nektar akışı endeksi (günlük)' and aciklama not like '%Günlük endeks (önizleme)%';

insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Günlük endeks: tarlacı tam puan 600 arı (uzman tahmini)','Giriş sayacı günlük çıkış tam puan eşiği kaynaksız; kovan başına taban ile doğrulanmalı. Yönetici › Ölçüm kuralları › Günlük endeks.'),
 ('Günlük endeks: nektar tam puan 1,5 kg/gün (uzman tahmini)','Tartı günlük net artış tam puan eşiği; Ölçüm kuralları › Ağırlık › Nektar (canlı nektar bayrağı) ile karıştırılmamalı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

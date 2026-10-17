-- koloni-242: Diğer sensörlerin varsayılan okuma sıklığı (tek kaynak ogul_skor_ayar.sensor; panelden değişir).
-- Ses 3 dk ortalama spektrum (uzman tahmini), titreşim 3 dk ortalama spektrum (Ramsey 2020 Sci Rep 10:9798), IR 5 dk giren/çıkan,
-- giriş sıcaklığı 30 dk, dış hava 30 dk, pil 4 sa, kamera günde 1, gateway 10 dk (uzman tahmini). Olay tabanlı algılamalar aralıktan bağımsız.
-- Mevcut (yöneticinin kaydettiği) değerler korunur: varsayılan || mevcut. Seyreltme yalnız kullanıcı «Onayla» ile.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('okumaSesDk',3,'okumaTitDk',3,'okumaIrDk',5,'okumaGirisSicakDk',30,'okumaDisHavaDk',30,'okumaPilDk',240,'okumaKameraDk',1440,'okumaGatewayDk',10)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Okuma sıklığı: ses 3 dk ortalama spektrum (uzman tahmini)','Mikrofon sürekli dinler; 3 dk aralık yalnız ortalama spektrum kaydıdır (titreşimdeki Ramsey 2020 3 dk ile aynı seçildi, ses için kaynak yok). Piping / tıslama / dur sinyali olay anında gönderilir. Gerçek veriyle doğrulanmalı.'),
 ('Okuma sıklığı: titreşim 3 dk ortalama spektrum (Ramsey 2020)','Ramsey ve ark. 2020 Sci Rep 10:9798: sürekli kayıt, 3 dk ortalama spektrum; oğul hazırlığı gece 00–05. Kural gece en az 5 spektrum ister (en seyrek 60 dk, uzman tahmini). ADXL345 + ESP32 sürekli kayıt pil tüketimi ölçülmeli.'),
 ('Okuma sıklığı: giriş sayacı (IR) 5 dk giren/çıkan (uzman tahmini)','Giren ve çıkan ayrı sayılır. Oğul çıktı (IR) 10 dk pencereye en az 2 dilim → en seyrek 5 dk; ilaçlama ve eşek arısı yedeği 60 dk pencere → en seyrek 30 dk. Kaynak yok.'),
 ('Okuma sıklığı: giriş sıcaklığı 30 dk (uzman tahmini)','Tıslama/titreşim artınca eşek hızlı okuma (okumaEsekHizliDk) iç ve giriş sıcaklığını birlikte hızlandırır. Kaynak yok.'),
 ('Okuma sıklığı: dış hava sensörü 30 dk (uzman tahmini)','Cihazlı dış sıcaklık + nem. Kaynak yok.'),
 ('Okuma sıklığı: pil okuma 4 saat (uzman tahmini)','Pil tahmini (pil-model.js) her cihazın kendi okuma sıklığını kullanır; yönetici varsayılanı değişince tahmin de değişir. Kaynak yok.'),
 ('Okuma sıklığı: kamera günde 1 fotoğraf (uzman tahmini)','Kamera donanımı henüz seçilmedi (Donanım). Kaynak yok.'),
 ('Okuma sıklığı: gateway buluta 10 dk (uzman tahmini)','Oğul çıktı (IR) uyarısı dakikalar içinde gelsin diye gönderim oğul çıktı penceresinden seyrek olmamalı. Acil olaylar beklemeden gider. Cihaza ayar indirme yolu henüz yok (firmware). Kaynak yok.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

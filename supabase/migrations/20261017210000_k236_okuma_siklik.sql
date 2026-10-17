-- koloni-236: Varsayılan sensör okuma sıklığı — sıcaklık+nem 30 dk, tartı 15 dk (Meikle 5–15; uzman tahmini).
-- Eşek arısı ±0,5 °C / 10 dk için 30 dk taban yetmez → tıslama/titreşim tetiklenince sıcaklık hızlı okuma (okumaEsekHizliDk, uzman tahmini).
-- Değerler tek kaynak ogul_skor_ayar.sensor; pil planı bu tabanı kullanır; seyreltme yalnız «Onayla» ile.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('okumaIsiNemDk',30,'okumaTartiDk',15,'okumaEsekHizliDk',2)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Okuma sıklığı: sıcaklık/nem 30 dk, tartı 15 dk (uzman tahmini)','Tartı: Meikle ve ark. 5–15 dk (2008 Apidologie 39:694; 2014 Apidologie 46:10) — 15 seçildi. Sıcaklık/nem 30 dk kaynaksız. Eşek arısı hızlı okuma 2 dk (tıslama/titreşim tetikli) uzman tahmini; 30 dk tabanda ±0,5 °C/10 dk yakalanmaz. Gerçek veriyle doğrulanmalı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

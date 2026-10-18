-- koloni-278: Tartı «Bal (tahmin)» ve «Hedef» döşemeleri kapsam gösterir («X/N kovan tartılı»); tartılı pay %50 altındaysa «az tartım» notu.
-- Eşik kaynaksız → uzman tahmini (yönetici › Bal hedefi › kapsamAzYuzde; kullanıcıya gösterilmez). Hedef % yalnız tartılı kovanların hedefi üzerinden.
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('tarti_kapsam_az','bal hedefi',65,'Tartı: az tartım (kapsam)','Tartılı kovan payı < %50','bilgi','Tartı sayfası «Bal (tahmin)» ve «Hedef» döşemelerinde «az tartım» notu. Hedef % = tartılı sezondaki kovanların net balı ÷ yalnız o kovanların hedefi.','Kaynak yok','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Tartı: «az tartım» eşiği tartılı pay %50 (uzman tahmini)','Bal (tahmin) / Hedef döşemesinde kaç kovan tartılınca tahminin arılığı temsil ettiği kaynaksız; örnekleme istatistiğiyle doğrulanmalı. Yönetici › Bal hedefi.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

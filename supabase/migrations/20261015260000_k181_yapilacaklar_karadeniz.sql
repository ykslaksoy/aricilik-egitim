-- koloni-181 (3): Yapılacaklar — Karadeniz melez oğul puanları için kaynak araması (puanlar değişmez)
update public.yapilacaklar set aciklama = 'Uzman tahmini · kaynak aranıyor', durum = 'acik', guncelleme = now()
 where baslik in ('Karadeniz × Muğla oğul puanı 55 — hakemli kaynak aranıyor','Karadeniz × Anadolu oğul puanı 65 — hakemli kaynak aranıyor');
insert into public.yapilacaklar (baslik, aciklama)
select b, 'Uzman tahmini · kaynak aranıyor' from (values ('Karadeniz × Muğla oğul puanı 55 — hakemli kaynak aranıyor'),('Karadeniz × Anadolu oğul puanı 65 — hakemli kaynak aranıyor')) v(b)
where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

-- koloni-235: Eşek arısı tıslamasız yedek yol — mikrofon yok / Mikrofon desteklemiyor iken sıcaklık + titreşim + IR çıkan düşüşü (Tem–Eki, uygun uçuş günü; Requier 2019 / Monceau 2013 bağlam). IR yoksa uyarı yok. Eşikler uzman tahmini → Yapılacaklar.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('esekIrOran',0.5,'esekIrPencereDk',60,'esekIrTabanDk',120,'esekIrAyBas',7,'esekIrAySon',10)
  || coalesce(data->'sensor','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('esek_ir_yedek','sağlık',104,'Eşek arısı: tıslamasız IR yedek','Mikrofon yok / desteklemiyor iken {s:esekEslesDk} dk içinde sıcaklık ≥ {s:esekSicakDegisimC} °C + titreşim × {s:esekTitresimKat} + çıkan ≤ taban × {s:esekIrOran} (pencere {s:esekIrPencereDk} dk, taban {s:esekIrTabanDk} dk); ay {s:esekIrAyBas}–{s:esekIrAySon}, uygun uçuş günü; IR yoksa uyarı yok','yuksek','Kullanıcıya: «Eşek Arısı Saldırısı Olabilir» (sayı yok). Yol: IR yedek (tıslamasız).','Requier F., Rome Q., Chiron G., Decourtye A., Henry M., Knauer F., Alaux C., Le Conte Y. (2019). Predation of the invasive Asian hornet affects foraging activity and survival probability of honey bees in western Europe. J. Pest Sci. 92:71–83, doi:10.1007/s10340-018-1063-0 · Monceau K., Arca M., Leprêtre L., Bonnard O., Arnold G., Thiéry D. (2013). Evidence for behavioral defenses of honey bees against Vespa velutina. PLoS ONE 8(6):e66492, doi:10.1371/journal.pone.0066492','uçuş felci kaynaklı · eşikler uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
update public.kural_kaynaklari set
  degerler = '{s:esekEslesDk} dk içinde sıcaklık ≥ {s:esekSicakDegisimC} °C + tıslama + titreşim × {s:esekTitresimKat}; tıslama ölçülemezse IR yedek (esek_ir_yedek); giriş > {s:esekGirisYuksekC} °C → kritik',
  aciklama = 'Yol A: tıslama. Yol B: IR yedek (tıslamasız). Kullanıcıya: «Eşek Arısı Saldırısı Olabilir».',
  updated_at = now()
where id = 'esek_uclu';
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Eşek arısı tıslamasız IR yedek — eşikler (uzman tahmini)','Requier 2019 / Monceau 2013 yalnız uçuş felci kavramını verir; çıkan oranı 0,5, pencere 60 dk, taban 120 dk, Tem–Eki uzman tahmini. Gerçek veriyle doğrulanmalı.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

-- koloni-192: Kuluçka sıcaklığı kuralı. Bant 33–36 °C (Kleinhenz ve ark. 2003); süre / oynaklık / dönem uzman tahmini (panelden).
-- Yalnız kuluçkalıktaki sıcaklık sensörü için. Kullanıcıya hastalık adı / kaynak gösterilmez. Tekrar çalıştırmak güvenlidir.

update public.ogul_skor_ayar
set data = jsonb_set(data, '{sensor}', coalesce(data->'sensor', '{}'::jsonb) || jsonb_build_object(
  'kuluckaAltC', coalesce((data->'sensor'->>'kuluckaAltC')::numeric, 33),
  'kuluckaUstC', coalesce((data->'sensor'->>'kuluckaUstC')::numeric, 36),
  'kuluckaSaat', coalesce((data->'sensor'->>'kuluckaSaat')::numeric, 6),
  'kuluckaOynaklikC', coalesce((data->'sensor'->>'kuluckaOynaklikC')::numeric, 2),
  'kuluckaOynaklikSaat', coalesce((data->'sensor'->>'kuluckaOynaklikSaat')::numeric, 24),
  'kuluckaAyBas', coalesce((data->'sensor'->>'kuluckaAyBas')::numeric, 3),
  'kuluckaAySon', coalesce((data->'sensor'->>'kuluckaAySon')::numeric, 8))),
  updated_at = now()
where id = 1;

insert into public.kural_kaynaklari (id, grup, sira, ad, degerler, seviye, aciklama, kaynak, durum) values
('kulucka_sicaklik', 'sağlık', 40, 'Kuluçka sıcaklığı',
 'Sağlıklı bant 33–36 °C; bant dışında kesintisiz 6 saat → hatırlatma (soğuk / sıcak); son 24 saatte en yüksek − en düşük ≥ 2 °C → «dengesiz» hatırlatması; Mart–Ağustos; yalnız kuluçkalıktaki sensör; en çok 7 günde bir',
 'bilgi',
 'Teşhis değil, hastalık adı verilmez. Bant kaynaklı; süre, oynaklık eşiği ve dönem uzman tahmini (panelden). 34,5 °C normal kuluçka gözü sıcaklığı (Groh 2004); ±1 °C sapma yetişkin beyninde sinaps sayısını düşürür. Kireç kuralı (<30 °C, 24 saat; Flores 1996) ayrı kalır.',
 'Kleinhenz M., Bujok B., Fuchs S., Tautz J. (2003). Hot bees in empty broodnest cells: heating from within. J Exp Biol 206(23):4217–4231. doi:10.1242/jeb.00680 («colonies maintain brood nest temperatures of 33–36 °C») · Groh C., Tautz J., Rössler W. (2004). PNAS 101(12):4268–4273. doi:10.1073/pnas.0400773101 (34,5 °C normal kuluçka gözü; 33,5 / 35 °C’de anlamlı düşüş) · Tautz J., Maier S., Groh C., Rössler W., Brockmann A. (2003). PNAS 100(12):7343–7347. doi:10.1073/pnas.1232346100 (32 / 34,5 / 36 °C kovanda doğal aralık; 32 °C’de dans ≈%20) · Jones J.C., Myerscough M.R., Graham S., Oldroyd B.P. (2004). Science 305(5682):402–404. doi:10.1126/science.1096340 (genetik çeşitlilik → daha kararlı kuluçka sıcaklığı; sayısal eşik vermez)',
 'bant teyitli · süre/oynaklık uzman tahmini')
on conflict (id) do update set degerler = excluded.degerler, aciklama = excluded.aciklama, kaynak = excluded.kaynak, durum = excluded.durum, seviye = excluded.seviye, updated_at = now();

insert into public.yapilacaklar (baslik, aciklama)
select v.b, 'Uzman tahmini · kaynak aranıyor'
from (values
  ('Kuluçka sıcaklığı bant dışı süre 6 saat'),
  ('Kuluçka sıcaklığı oynaklık 2 °C / 24 saat'),
  ('Kuluçka sıcaklığı dönemi Mart–Ağustos')
) as v(b)
where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

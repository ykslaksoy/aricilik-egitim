-- koloni-194: Kuluçka sıcaklığı hedef 34,5 °C (Groh ve ark. 2004). Uyarı ≤33,5 / ≥35 °C kesintisiz 6 sa (Groh 2004: 33,5 ve 35 °C'de etki);
-- kritik <33 / >36 °C kesintisiz 6 sa (Kleinhenz ve ark. 2003). 6 sa, 2 °C/24 sa, Mart–Ağustos uzman tahmini (panelden). Tekrar çalıştırmak güvenlidir.

update public.ogul_skor_ayar
set data = jsonb_set(data, '{sensor}', coalesce(data->'sensor', '{}'::jsonb) || jsonb_build_object(
  'kuluckaHedefC', coalesce((data->'sensor'->>'kuluckaHedefC')::numeric, 34.5),
  'kuluckaUyariAltC', coalesce((data->'sensor'->>'kuluckaUyariAltC')::numeric, 33.5),
  'kuluckaUyariUstC', coalesce((data->'sensor'->>'kuluckaUyariUstC')::numeric, 35))),
  updated_at = now()
where id = 1;

update public.kural_kaynaklari set
 degerler = 'Hedef 34,5 °C; uyarı: ≤33,5 °C ya da ≥35 °C kesintisiz 6 saat (soğuk / sıcak); kritik: 33–36 °C dışında kesintisiz 6 saat; son 24 saatte en yüksek − en düşük ≥ 2 °C → «dengesiz»; Mart–Ağustos; yalnız kuluçkalıktaki sensör; en çok 7 günde bir',
 aciklama = 'Teşhis değil, hastalık adı verilmez. Hedef ve uyarı eşikleri Groh 2004 (34,5 °C normal; 33,5 ve 35 °C''de yetişkin beyninde sinaps sayısı anlamlı düşer). Kritik bant Kleinhenz 2003 (33–36 °C). Süre 6 saat, oynaklık 2 °C/24 saat ve Mart–Ağustos uzman tahmini (panelden). Kireç kuralı (<30 °C, 24 saat; Flores 1996) ayrı kalır.',
 durum = 'hedef/uyarı/kritik teyitli · süre/oynaklık/dönem uzman tahmini',
 updated_at = now()
where id = 'kulucka_sicaklik';

update public.yapilacaklar set baslik = 'Kuluçka sıcaklığı uyarı/kritik süre 6 saat'
where baslik = 'Kuluçka sıcaklığı bant dışı süre 6 saat';
insert into public.yapilacaklar (baslik, aciklama)
select v.b, 'Uzman tahmini · kaynak aranıyor'
from (values ('Kuluçka sıcaklığı uyarı/kritik süre 6 saat'), ('Kuluçka sıcaklığı oynaklık 2 °C / 24 saat'), ('Kuluçka sıcaklığı dönemi Mart–Ağustos')) as v(b)
where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

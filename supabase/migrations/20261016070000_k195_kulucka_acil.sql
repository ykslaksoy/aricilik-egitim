-- koloni-195: Kuluçka sıcaklığı ACİL kademesi (kritikten bir üst): ≤30 °C kesintisiz 6 sa → kireç hastalığı (Ascosphaera apis) riski.
-- 30 °C: Flores ve ark. 1996, Apidologie 27(4):185–192, doi:10.1051/apido:19960401. Süre 6 sa uzman tahmini (panelden). Tekrar çalıştırmak güvenlidir.
update public.ogul_skor_ayar
set data = jsonb_set(data, '{sensor}', coalesce(data->'sensor', '{}'::jsonb) || jsonb_build_object(
  'kuluckaAcilC', coalesce((data->'sensor'->>'kuluckaAcilC')::numeric, 30),
  'kuluckaAcilSaat', coalesce((data->'sensor'->>'kuluckaAcilSaat')::numeric, 6))),
  updated_at = now()
where id = 1;

update public.kural_kaynaklari set
 degerler = 'Hedef 34,5 °C; uyarı: 34 °C altı ya da ≥35 °C kesintisiz 6 saat; kritik: 33–36 °C dışında kesintisiz 6 saat; ACİL: ≤30 °C kesintisiz 6 saat → kireç hastalığı riski + sabit kırmızı kart (yalnız Tamam ile kapanır); son 24 saatte en yüksek − en düşük ≥ 2 °C → «dengesiz»; Mart–Ağustos; yalnız kuluçkalıktaki sensör; görev en çok 7 günde bir',
 aciklama = 'Teşhis değil. Hedef ve üst uyarı Groh 2004 (PNAS 101:4268). Alt uyarı 34 °C uzman tahmini. Kritik bant Kleinhenz 2003 (J Exp Biol 206:4217). ACİL 30 °C: Flores ve ark. 1996 (Apidologie 27:185, doi:10.1051/apido:19960401) — sporla beslenen larvalarda kapalı yavru 6 gün 30 °C''de tutulunca mumyalaşma %15,3 (35 °C''de %2,2); önceden üşütülmüşse %43,7 (35 °C''de %29); 30 °C''de %87 nem %7,75 (%68 nemde %0,95). Deney 6 gün sürdü; 6 saat süre uzman tahmini (panelden). Ayrı kireç hatırlatması (<30 °C, 24 saat) aynen kalır.',
 durum = 'hedef/üst uyarı/kritik/ACİL 30 °C teyitli · alt uyarı 34 °C, süreler/oynaklık/dönem uzman tahmini',
 updated_at = now()
where id = 'kulucka_sicaklik';

insert into public.yapilacaklar (baslik, aciklama)
select 'Kuluçka sıcaklığı ACİL (≤30 °C) süre 6 saat', 'Uzman tahmini · kaynak aranıyor (Flores 1996 deneyi 6 gün sürdü)'
where not exists (select 1 from public.yapilacaklar y where y.baslik = 'Kuluçka sıcaklığı ACİL (≤30 °C) süre 6 saat');

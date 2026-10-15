-- koloni-181 (1): koloni-180 öncesi eski yöntemle (nehir/göl merkezine) hesaplanmış su mesafeleri yeniden hesaplanır.
-- Uydurma/eski değer gösterilmez: mesafe boşaltılır (uygulama «Veri yok»), arılık cevre_kuyruk'a girer; kuyruğun yeniden deneme mekanizması çalışır.
with eski as (
  select arilik_id, lat, lon from public.arilik_cevre
  where coalesce(elle, false) = false and lat is not null and lon is not null
    and hesaplandi < timestamptz '2026-10-15 11:23:31+00'
)
insert into public.cevre_kuyruk (hedef_tur, hedef_id, lat, lon, durum, deneme, sonraki)
select 'arilik', arilik_id, lat, lon, 'bekliyor', 0, now() from eski
on conflict (hedef_tur, hedef_id) where durum in ('bekliyor','isleniyor','hata') do nothing;
update public.arilik_cevre set su_kaynagi_mesafe_metre = null, su_kaynagi_turu = null, su_kaynagi_adi = null
where coalesce(elle, false) = false and hesaplandi < timestamptz '2026-10-15 11:23:31+00';

-- koloni-181 (2): Kireç riski + genel koloni kontrolü hatırlatmaları (teşhis değil; en çok haftada bir görev). Eşikler panelden.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}', coalesce(data->'sensor','{}'::jsonb) || jsonb_build_object(
  'kirecIsiC', 30, 'kirecSaat', 24, 'kirecAyBas', 3, 'kirecAySon', 8, 'kirecNemYuksek', 80, 'hatirlatmaGun', 7,
  'genelKayipKat', 2, 'genelKayipMinKg', 0.5, 'genelNufusDusOran', 0.3, 'genelAyBas', 11, 'genelAySon', 5)), updated_at = now()
where id = 1 and not (coalesce(data->'sensor','{}'::jsonb) ? 'kirecIsiC');
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('kirec_riski','muayene',91,'Kireç riski hatırlatması','Kuluçka döneminde (Mart–Ağustos, panelden) kuluçka ısısı kesintisiz 24 saat 30 °C altında (panelden) → «Kireç riski, kuluçka ve havalandırma kontrolü önerilir»; nem yalnız destekleyici bilgi; en çok 7 günde bir','bilgi',
 'Teşhis değil. Asıl etken kuluçkanın soğuması: 25 °C''de %95, 30 °C''de %43,65, 35 °C''de %29 mumyalaşma (soğutulmuş kapalı kuluçka, laboratuvar). Süre eşiği için ölçüm yok.',
 'Flores J.M. ve ark. (1996). Apidologie 27(4):185–192. doi:10.1051/apido:19960401 · Aronstein K.A., Murray K.D. (2010). Chalkbrood disease in honey bees. J Invertebr Pathol 103:S20–S29. doi:10.1016/j.jip.2009.06.018',
 'uzman tahmini'),
('genel_koloni_kontrol','muayene',92,'Genel koloni kontrolü uyarısı','Kış–ilkbaharda (Kasım–Mayıs, panelden) son 24 saat ağırlık kaybı ≥ 0,5 kg ve kendi önceki günlük kaybının ≥ 2 katı ya da nüfusta ≥ %30 düşüş (panelden) → «Genel koloni kontrolü ve fiziksel muayene yapılması önerilir»; en çok 7 günde bir','bilgi',
 'Hastalık adı verilmez; tartı kaybı tek bir nedene bağlanamaz.',
 'Veri yok — uzman tahmini; olası nedenler: açlık, arı kaybı, hastalık',
 'uzman tahmini')
on conflict (id) do update set degerler = excluded.degerler, seviye = excluded.seviye, aciklama = excluded.aciklama, kaynak = excluded.kaynak, durum = excluded.durum, updated_at = now();

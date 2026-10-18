-- koloni-270: «Çam balı bölgesi mevsim sonu» (ogul_skor_ayar.sensor.ucusSezonCamSon, AAGG). Sıcak bölgede çam balı illeri (Muğla, Aydın, İzmir, Balıkesir, Çanakkale, Antalya kıyıları) için uçuş mevsimi bitişi 30 Kasım (1130); diğer sıcak bölgeler ucusSezonSicakSon (1 Kasım) ile kalır.
-- Kaynaklı: MAYBİR, maybir.org.tr/mugla-cam-bali (Muğla çam balı yoğun dönemi Ağustos–Kasım); Küre Ansiklopedi «Çam balı» (15 Ağustos–30 Kasım); Günbey B., Arıcılık Araştırma Enstitüsü (Marchalina hellenica yayılışı). Yönetici › Ölçüm kuralları › Uçuş havası › Mevsim. Mevcut değer varsa korunur.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}', jsonb_build_object('ucusSezonCamSon', 1130) || coalesce(data->'sensor', '{}'::jsonb)), updated_at = now()
where id = 1 and not coalesce(data->'sensor', '{}'::jsonb) ? 'ucusSezonCamSon';
-- Değişiklik kaydı: yeni ayar sürümü (geri alınabilir).
insert into public.ayar_surumleri (data, fark, not_, yayinlayan_eposta)
select a.data, jsonb_build_object('sensor.ucusSezonCamSon', jsonb_build_object('once', null, 'sonra', 1130)),
       'koloni-270: Çam balı bölgesi mevsim sonu 30 Kasım (kaynaklı: MAYBİR, Küre, Günbey/AAE)', 'sistem (koloni-270)'
from public.ogul_skor_ayar a
where a.id = 1 and not exists (select 1 from public.ayar_surumleri s where s.not_ like 'koloni-270:%');

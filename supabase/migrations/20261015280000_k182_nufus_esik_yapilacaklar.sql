-- koloni-182: Genel kontrol nüfus eşikleri — uyarı %20 / kritik %30 (uzman tahmini, panelden).
-- Kritik < uyarı girilirse uygulama ikisini varsayılana döndürür. Yapılacaklar: uzman tahmini maddeler.

update public.ogul_skor_ayar
set data = jsonb_set(
  data,
  '{sensor}',
  (coalesce(data->'sensor', '{}'::jsonb) - 'genelNufusDusOran')
    || jsonb_build_object('genelNufusUyariOran', 0.2, 'genelNufusKritikOran', 0.3)
),
updated_at = now()
where id = 1;

update public.kural_kaynaklari set
  degerler = 'Kış–ilkbaharda (Kasım–Mayıs, panelden) son 24 saat ağırlık kaybı ≥ 0,5 kg ve kendi önceki günlük kaybının ≥ 2 katı → uyarı; IR nüfusta ≥ %20 düşüş → uyarı, ≥ %30 → kritik (panelden); en çok 7 günde bir',
  aciklama = 'Hastalık adı verilmez; tartı/nüfus kaybı tek bir nedene bağlanamaz. Nüfus eşikleri uzman tahmini.',
  durum = 'uzman tahmini', updated_at = now()
where id = 'genel_koloni_kontrol';

insert into public.yapilacaklar (baslik, aciklama)
select v.b, 'Uzman tahmini · kaynak aranıyor'
from (values
  ('Kovan sağlığı dB eşikleri 4 / 7'),
  ('Yelpazeleme oranı %40'),
  ('Varroa sapma eşiği 4 dB'),
  ('Kireç riski ısı eşiği 30 °C'),
  ('Kireç riski süre 24 saat'),
  ('Kireç riski kuluçka dönemi Mart–Ağustos'),
  ('Kireç riski destekleyici nem eşiği'),
  ('Genel kontrol ağırlık kaybı 0,5 kg'),
  ('Genel kontrol ağırlık kaybı 2 kat'),
  ('Genel kontrol nüfus düşüşü uyarı %20 / kritik %30'),
  ('Genel kontrol dönemi Kasım–Mayıs'),
  ('Hatırlatmalar 7 gün tekrar süresi'),
  ('Efe arısı oğul puanı 25'),
  ('Sıkışıklık (sensörsüz) — kaynak boş'),
  ('Sıkışıklık (sensörlü) — kaynak boş'),
  ('Tartı katı — kaynak boş'),
  ('IR katı — kaynak boş'),
  ('Mevsim bileşeni — kaynak boş'),
  ('Ana yaşı bileşeni — kaynak boş'),
  ('Oğul Risk Skoru formülü — kaynak boş'),
  ('Kapak açma sonrası ses filtresi — kaynak boş'),
  ('Çiftleşmiş ana ötmesi 330–430 Hz (doğrulanacak)'),
  ('Dış ortam düzeltmesi eşikleri'),
  ('Ses+titreşim katı sapma 6 dB'),
  ('Isı katı 35,5–36 °C'),
  ('Nem katı sapma %15'),
  ('Ani ağırlık kaybı eşiği'),
  ('Su mesafesi güvenli / riskli m')
) as v(b)
where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

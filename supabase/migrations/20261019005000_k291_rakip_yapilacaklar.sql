-- koloni-291: Yapılacaklar — rakip incelemesi (MyBroodMinder / Apiary Book), 2026-10-19
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Paylaşım bağlantısı (salt okunur kovan paneli)',
  'Kovan panelini başlangıç ve bitiş tarihli, salt okunur, girişsiz bir bağlantıyla paylaşma; süre bitince bağlantı kapanır. Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).'),
 ('Özel panel (sürükle-bırak grafikler)',
  'Kullanıcı grafikleri sürükleyip kendi panelini kurar. Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).'),
 ('Tarlacı aktivitesi ve nektar akışı endeksi (günlük)',
  'Sensör verisinden (giriş sayacı, tartı, dış hava) tarlacı aktivitesi ve nektar akışı endeksi günlük hesaplanır; arılık/kovan özetinde gösterilir. Mevcut tartı «Nektar akımı» döşemesi ve oğul skoru nektar bayrağı bunun yerine değil. Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).'),
 ('Çiftleşme uçuşu saatleri (ana arı, hava verisi)',
  'Hava verisine göre ana arının çiftleşme uçuşu için uygun saatler (gün içi pencere); uçuş havası / uçuş etiketi kurallarından ayrı. Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).'),
 ('Cihaz geçmişi (kovan ve konum zaman çizelgesi)',
  'Hangi cihazın ne zaman hangi kovanda ve konumda (arılık) olduğu — atama, taşıma ve söküm geçmişi. Sensör okuma arşivi (sensor-ham) ve «Sensör geçmişi: saklama süreleri» maddesinden farklı. Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).'),
 ('Apiary Book: eksik modüller (karşılaştırma)',
  'Apiary Book''ta olup henüz Apiary Book düzeyinde olmayan: ana arı yetiştirme modülü (çiftleşme kutusu, hücre takvimi, ana havuzu, üretim akışı). Varroa sayımı, ilaçlama ve veteriner kayıtları, QR etiket, malzeme stoku SüperArı''da mevcut — tekrar listelenmedi. Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

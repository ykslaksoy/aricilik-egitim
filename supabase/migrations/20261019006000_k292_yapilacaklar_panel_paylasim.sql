-- koloni-292: Yapılacaklar — «Yönetici paneli:» alt satırları; özellik bayrağı paylasim_baglanti (varsayılan kapalı)

update public.yapilacaklar set aciklama = 'Kovan panelini başlangıç ve bitiş tarihli, salt okunur, girişsiz bir bağlantıyla paylaşma; süre bitince bağlantı kapanır.
Yönetici paneli: Özellik açma/kapama › «Paylaşım bağlantısı (paneli herkese açma)» (varsayılan kapalı; özellik hazır değil rozeti); ileride varsayılan süre, salt okunur kapsam ve bağlantı iptali kaydı. Kullanıcı uygulaması bayrağı ozellik_bayraklari üzerinden okur.
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).', guncelleme = now()
where baslik = 'Paylaşım bağlantısı (salt okunur kovan paneli)' and aciklama not like '%Yönetici paneli:%';

update public.yapilacaklar set aciklama = 'Kullanıcı grafikleri sürükleyip kendi panelini kurar.
Yönetici paneli: yeni «Özel panel» bölümü (veya Ölçüm kuralları altı) — widget kataloğu, grafik paketleri aç/kapa, varsayılan düzen şablonları; kaynak/zayıf kaynak satırları Kural kaynakları ile uyumlu.
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).', guncelleme = now()
where baslik = 'Özel panel (sürükle-bırak grafikler)' and aciklama not like '%Yönetici paneli:%';

update public.yapilacaklar set aciklama = 'Sensör verisinden (giriş sayacı, tartı, dış hava) tarlacı aktivitesi ve nektar akışı endeksi günlük hesaplanır; arılık/kovan özetinde gösterilir. Mevcut tartı «Nektar akımı» döşemesi ve oğul skoru nektar bayrağı bunun yerine değil.
Yönetici paneli: Ölçüm kuralları › Ağırlık (tartı) + IR giriş sayacı — günlük endeks eşikleri, kaynak satırı; Bal hedefi / tartı döşemeleri ile çakışma notu.
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).', guncelleme = now()
where baslik = 'Tarlacı aktivitesi ve nektar akışı endeksi (günlük)' and aciklama not like '%Yönetici paneli:%';

update public.yapilacaklar set aciklama = 'Hava verisine göre ana arının çiftleşme uçuşu için uygun saatler (gün içi pencere); uçuş havası / uçuş etiketi kurallarından ayrı.
Yönetici paneli: Ölçüm kuralları › Uçuş havası — çiftleşme uçuşu saat penceresi (sıcaklık, rüzgar, yağış, ışınım eşikleri); kaynaklar Kural kaynakları ile senkron.
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).', guncelleme = now()
where baslik = 'Çiftleşme uçuşu saatleri (ana arı, hava verisi)' and aciklama not like '%Yönetici paneli:%';

update public.yapilacaklar set aciklama = 'Hangi cihazın ne zaman hangi kovanda ve konumda (arılık) olduğu — atama, taşıma ve söküm geçmişi. Sensör okuma arşivi (sensor-ham) ve «Sensör geçmişi: saklama süreleri» maddesinden farklı.
Yönetici paneli: Cihazlar — cihaz→kovan/arılık atama zaman çizelgesi (salt okunur özet); saklama süresi Sensör geçmişi (saklama) kartı ile uyumlu (uzman tahmini).
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).', guncelleme = now()
where baslik = 'Cihaz geçmişi (kovan ve konum zaman çizelgesi)' and aciklama not like '%Yönetici paneli:%';

update public.yapilacaklar set aciklama = 'Apiary Book''ta olup henüz Apiary Book düzeyinde olmayan: ana arı yetiştirme modülü (çiftleşme kutusu, hücre takvimi, ana havuzu, üretim akışı). Varroa sayımı, ilaçlama ve veteriner kayıtları, QR etiket, malzeme stoku SüperArı''da mevcut — tekrar listelenmedi.
Yönetici paneli: Özellik açma/kapama › «Ana arı yetiştirme» (ileride, varsayılan kapalı); Kural kaynakları + bu Yapılacaklar maddesi takibi; modül hazır olunca bayrak ve kaynak satırları.
Rakip incelemesi 2026-10-19 (MyBroodMinder / Apiary Book).', guncelleme = now()
where baslik = 'Apiary Book: eksik modüller (karşılaştırma)' and aciklama not like '%Yönetici paneli:%';

insert into public.ozellik_bayraklari (anahtar, ad, aciklama, acik) values
  ('paylasim_baglanti', 'Paylaşım bağlantısı (paneli herkese açma)',
   'Açıkken kullanıcılar kovan panelini süreli, salt okunur bağlantıyla paylaşabilir. Kapalıyken tüm paylaşım bağlantıları çalışmaz.', false)
on conflict (anahtar) do update set
  ad = excluded.ad,
  aciklama = excluded.aciklama,
  guncellendi = now();

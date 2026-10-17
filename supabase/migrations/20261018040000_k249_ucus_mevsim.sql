-- koloni-249: Uçuş etiketi mevsime duyarlı + saat saat değerlendirme (tek kaynak ogul_skor_ayar.sensor; yönetici › Ölçüm kuralları › Uçuş havası).
-- Temizlik uçuşu alt sıcaklığı 9 °C: Burrill & Dietz 1981, Apidologie 12:319. Uygun saat ışınımı 300 W/m²: Vicens & Bosch 2000, Environ. Entomol. 29:413.
-- Uygun gün en az 3 uygun saat ve bölge mevsim tarihleri (AAGG): uzman tahmini (bakım takvimi profilleri: ilkbahar gelişimi başı → kışlatma başı).
-- Arılık başına elle uçuş mevsimi: data.ucusSezon { apiaryId: { from, to: 'AA-GG' } } (Oğul skorları › Arılık uçuş mevsimi). Mevcut değerler korunur.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object('ucusTemizlikC',9,'ucusIsinimW',300,'ucusSaatMin',3,
    'ucusSezonSicakBas',201,'ucusSezonSicakSon',1101,'ucusSezonIlimanBas',315,'ucusSezonIlimanSon',1001,
    'ucusSezonYaylaBas',415,'ucusSezonYaylaSon',920,'ucusSezonYuksekBas',501,'ucusSezonYuksekSon',915)
  || coalesce(data->'sensor','{}'::jsonb)) || jsonb_build_object('ucusSezon', coalesce(data->'ucusSezon','{}'::jsonb)), updated_at = now()
where id = 1;
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Uçuş: «uygun gün» için en az 3 uygun saat (uzman tahmini)','Hava › uçuş etiketi artık günlük en yüksek sıcaklıkla değil gündüz saatleriyle hesaplanır. Uygun saat: sıcaklık ≥ cins eşiği, rüzgar ≤ eşik, kuru, ışınım ≥ 300 W/m² (Vicens & Bosch 2000). Kaç uygun saatin «uygun gün» sayılacağı için kaynak yok; IR giriş sayacı verisiyle doğrulanmalı (yönetici › Uçuş havası › ucusSaatMin).'),
 ('Uçuş mevsimi: bölge başlangıç/bitiş tarihleri (uzman tahmini)','Mevsim dışında Hava sayfası «Uçuş uygun» demez; kuru ve ≥9 °C gündüz saati varsa «Temizlik uçuşu olabilir» (Burrill & Dietz 1981), yoksa «Uçuş yok». Varsayılanlar bakım takvimi profillerinden: sıcak 1 Şub–1 Kas, ılıman 15 Mar–1 Eki, yayla 15 Nis–20 Eyl, yüksek yayla 1 May–15 Eyl. Erzurum (Tortum dahil) çiçeklenme Haziran–Ağustos (Arıcılık Araştırma Enstitüsü 2022) dışında bölgeye özgü kaynak yok. Yönetici › Uçuş havası (bölge) ve Oğul skorları › Arılık uçuş mevsimi (arılık) ile değişir.'),
 ('Tortum arılığı rakımı: harita konumu ≈2080 m, profil 1500 m varsayıyor','Open-Meteo yükseklik verisine göre 40.257866, 41.613415 ≈2082 m (≥1800 m → «yüksek yayla» profili olurdu); örnek arılık rakımı 1500 m (yayla). Hava tahmini de 2082 m için. Arılığın gerçek rakımı doğrulanmalı; gerekirse arılık rakımı girilmeli ya da konum düzeltilmeli.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);
-- Değişiklik kaydı: yeni ayar sürümü (sa_degisiklik'e trigger ile «Yönetici ayarı» olarak düşer; geri alınabilir).
insert into public.ayar_surumleri (data, fark, not_, yayinlayan_eposta)
select a.data, jsonb_build_object('ucusSezon', jsonb_build_object('once', null, 'sonra', a.data->'ucusSezon'), 'sensor.ucus*', jsonb_build_object('once', null, 'sonra', 'ucusTemizlikC 9, ucusIsinimW 300, ucusSaatMin 3, bölge mevsim AAGG')),
       'koloni-249: uçuş mevsimi + saat saat uçuş ayarları (varsayılan)', 'sistem (koloni-249)'
from public.ogul_skor_ayar a
where a.id = 1 and not exists (select 1 from public.ayar_surumleri s where s.not_ like 'koloni-249:%');

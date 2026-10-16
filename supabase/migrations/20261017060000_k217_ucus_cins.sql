-- koloni-217: Uçuş havası arı cinsine göre — ırka özgü hakemli eşik yok, tümü uzman tahmini.
insert into public.yapilacaklar (baslik, aciklama)
select 'Uçuş eşikleri arı cinsine göre (uzman tahmini)', 'Kafkas/Karniyol uygun ≥14 °C, kısmen ≥10 °C; Karadeniz 14/11 °C; Genel 15/12 °C; rüzgar ≤20/≤30 km/sa; yağış <1 mm. Irka özgü hakemli uçuş eşiği bulunamadı (genel A. mellifera: Burrill & Dietz 1981; Vicens & Bosch 2000; Karbassioon 2023; Riessberger & Crailsheim 1997). Melez: ebeveynlerin ihtiyatlı değeri. Kaynak aranıyor.'
where not exists (select 1 from public.yapilacaklar y where y.baslik = 'Uçuş eşikleri arı cinsine göre (uzman tahmini)');

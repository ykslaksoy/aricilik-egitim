-- koloni-216: Oğul anı ses eşikleri uzman tahmini (hakemli kaynak yok).
insert into public.yapilacaklar (baslik, aciklama)
select 'Oğul anı sesi 500–600 Hz, taban +6 dB, ≥2 dk (uzman tahmini)', 'Hakemli kaynak yok. Ferrari 2008 (Comput Electron Agric 64:72) 100–300 → 500–600 Hz kaymasını bildirir, dB ve süre eşiği vermez. Kaynak aranıyor.'
where not exists (select 1 from public.yapilacaklar y where y.baslik = 'Oğul anı sesi 500–600 Hz, taban +6 dB, ≥2 dk (uzman tahmini)');

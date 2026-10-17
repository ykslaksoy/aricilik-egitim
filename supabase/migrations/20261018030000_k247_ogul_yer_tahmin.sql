-- koloni-247: Oğul riski «Yer darlığı olabilir (bal katı verilmemiş)» — kaynak yok → uzman tahmini (kullanıcı kuralı).
-- Kural aç/kapa kimliği 'ogulYerTahmin' (ogul_skor_ayar.kuralKapali / kuralKapaliKullanici / kuralKapaliArilik; varsayılan açık — veri değişikliği gerekmez).
-- Sayısal eşik yok. Yönetici › Kural kaynakları satırı + Yapılacaklar (kaynak aranacak).
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('ogul_yer_tahmin','oğul skoru',99,'Oğul: Yer darlığı olabilir (bal katı verilmemiş)','Güçlü / Çok güçlü / Bölünmesi Gerekiyor koloni + bal katı yok + muayenede arılı çerçeve sayısı yok','bilgi','Oğul skorunu değiştirmez; yalnız neden. Kural aç/kapa: ogulYerTahmin. Kullanıcıya: «Yer darlığı olabilir (bal katı verilmemiş)».','Kaynak yok','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select 'Oğul: «Yer darlığı olabilir (bal katı verilmemiş)» — kaynak bul (uzman tahmini)',
       'Güçlü koloni + bal katı verilmemiş + arılı çerçeve sayısı yokken «yer darlığı olabilir» varsayımı kaynaksız. Yer darlığı–oğul ilişkisi genel bilgi (Winston 1987); bu tetikleyici için yayımlanmış kural aranmalı. Yönetici › Ölçüm kuralları › «Oğul: Yer darlığı olabilir» aç/kapa.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Oğul: «Yer darlığı olabilir (bal katı verilmemiş)» — kaynak bul (uzman tahmini)');

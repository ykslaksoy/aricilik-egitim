-- koloni-258: Ana memesi «Nerede?» — yeri «Bilinmiyor» seçeneği. Kaynak yok → uzman tahmini (kullanıcı kuralı).
-- Kural aç/kapa kimliği 'ogulMemeYerBilinmiyor' (ogul_skor_ayar.kuralKapali / kuralKapaliKullanici / kuralKapaliArilik; varsayılan açık — veri değişikliği gerekmez).
-- Yer anlamları: Winston 1987 (oğul memesi alt kenar, sessiz ana değiştirme petek ortası); Fell & Morse 1984 (acil meme yatay işçi hücresinden).
insert into public.kural_kaynaklari (id,grup,sira,ad,degerler,seviye,aciklama,kaynak,durum) values
('ogul_meme_yer_bilinmiyor','oğul skoru',100,'Oğul: Ana memesi yeri bilinmiyor','Muayenede meme sayısı ≥ 1, yer = Bilinmiyor','bilgi','Oğul skorunu artırmaz (yalnız alt kenar oğul memesi 100 yapar); kullanıcıya «yerine bakın» notu. Kural aç/kapa: ogulMemeYerBilinmiyor.','Kaynak yok (yer anlamları: Winston 1987; Fell & Morse 1984)','uzman tahmini')
on conflict (id) do update set degerler=excluded.degerler, seviye=excluded.seviye, aciklama=excluded.aciklama, kaynak=excluded.kaynak, durum=excluded.durum, updated_at=now();
insert into public.yapilacaklar (baslik, aciklama)
select 'Oğul: Ana memesi yeri «Bilinmiyor» — skoru artırmama varsayımı (uzman tahmini)',
       'Muayenede meme var ama yeri bilinmiyorsa oğul skoru 100''e çıkmıyor, yalnız «yerine bakın» notu gösteriliyor. Bu varsayım kaynaksız; doğrulanmalı veya değiştirilmeli. Yönetici › Ölçüm kuralları › «Oğul: Ana memesi yeri bilinmiyor» aç/kapa.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Oğul: Ana memesi yeri «Bilinmiyor» — skoru artırmama varsayımı (uzman tahmini)');

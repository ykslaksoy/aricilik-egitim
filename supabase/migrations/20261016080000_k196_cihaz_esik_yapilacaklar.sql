-- koloni-196: Yönetici · Ölçüm kuralları + Cihazlar. Sessizlik / bağlantı kopması için eşik tanımlı değil → değer gerekiyor (uydurulmadı).
insert into public.yapilacaklar (baslik, aciklama)
select 'Cihaz sessiz (veri gelmiyor) eşiği: değer gerekli', 'Kaç saat okuma gelmezse uyarı? Şu an tanımlı değil, panelde «Veri yok – eşik tanımlı değil». Kaynak veya uzman kararı gerekli.'
where not exists (select 1 from public.yapilacaklar y where y.baslik = 'Cihaz sessiz (veri gelmiyor) eşiği: değer gerekli');
insert into public.yapilacaklar (baslik, aciklama)
select 'Cihaz bağlantı koptu / arızalı uyarı eşiği: değer gerekli', 'Kopuk / Arızalı durumu ne kadar sürerse uyarı? Şu an tanımlı değil, panelde «Veri yok – eşik tanımlı değil». Kaynak veya uzman kararı gerekli.'
where not exists (select 1 from public.yapilacaklar y where y.baslik = 'Cihaz bağlantı koptu / arızalı uyarı eşiği: değer gerekli');

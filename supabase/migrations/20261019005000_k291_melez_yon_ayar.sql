-- koloni-291: Yönlü ikili melez düzenleme — ogul_skor_ayar.data.melezYon (şema değişmez; önizleme migration).
-- Kilitli GENETIK_MELEZ tablosu aynı; yönetici paneli › Arı genetikleri kutuları genetik / Melez özelliği / kaynak-not.
insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Yönlü melez düzenleyici (önizleme)','koloni-291: Yönetici › Arı genetikleri — Muğla×Kafkas iki yön ve Efe ana×Kafkas baba için genetik puan (isteğe bağlı), Melez özelliği metni ve kaynak/notlar. Canlıda ogul_skor_ayar.data.melezYon yalnız önizleme onayından sonra dolar.')
) as v(b,a) where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

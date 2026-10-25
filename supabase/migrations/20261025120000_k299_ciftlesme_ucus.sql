-- koloni-299: Çiftleşme uçuşu saat penceresi (bakire ana) — tek kaynak ogul_skor_ayar.sensor; yönetici › Ölçüm kuralları › Uçuş havası alt kartı.
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}',
  jsonb_build_object(
    'ciftlesmeUygunC', 18, 'ciftlesmeKismenC', 16, 'ciftlesmeUygunRuzgar', 15, 'ciftlesmeKismenRuzgar', 22,
    'ciftlesmeYagisMm', 1, 'ciftlesmeIsinimW', 350, 'ciftlesmeSaatBas', 11, 'ciftlesmeSaatSon', 16, 'ciftlesmeSaatMin', 2
  ) || coalesce(data->'sensor', '{}'::jsonb)), updated_at = now()
where id = 1;

insert into public.yapilacaklar (baslik, aciklama)
select v.b, v.a from (values
 ('Çiftleşme uçuşu: saat penceresi doğrulama (uzman tahmini)',
  'Koloni › Larva takvimi önizleme kartı hava tahminine dayanır; gerçek çiftleşme / DCA kayıtları ve giriş sayacı ile doğrulanmalı. Yönetici › Uçuş havası › Çiftleşme uçuşu eşikleri.')
) as v(b, a)
where not exists (select 1 from public.yapilacaklar y where y.baslik = v.b);

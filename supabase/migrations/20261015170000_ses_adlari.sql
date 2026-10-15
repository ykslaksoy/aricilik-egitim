-- k172: ses türleri «Türkçe (İngilizce)» (kullanıcı kararı; Vızıldama → Vakvaklama).
update public.ses_siniflari set ad_tr = 'Ana Arı Ötmesi (Piping)', updated_at = now() where id = 'tooting';
update public.ses_siniflari set ad_tr = 'Vakvaklama (Quacking)', updated_at = now() where id = 'quacking';
update public.ses_siniflari set ad_tr = 'İşçi Arı Ötmesi (Worker Piping)', updated_at = now() where id = 'isci_otmesi';
update public.ses_siniflari set ad_tr = 'Oğul Anı Sesi (Swarming)', updated_at = now() where id = 'ogul_ani';
update public.ses_siniflari set ad_tr = 'Anasızlık Uğultusu (Queenless Roar)', updated_at = now() where id = 'anasizlik';
update public.ses_siniflari set yapi = replace(yapi, 'ötme/anasızlık', 'Ana Arı Ötmesi (Piping) / Anasızlık Uğultusu (Queenless Roar)'), updated_at = now() where id = 'dur_sinyali';
update public.ses_siniflari set yapi = replace(yapi, 'Ötmeye benzer', 'Ana Arı Ötmesi (Piping) sesine benzer'), updated_at = now() where id = 'ciftlesmis_ana';
update public.ses_siniflari set anlam = replace(replace(anlam, 'ötmeyle', 'Ana Arı Ötmesi (Piping) ile'), 'Vızıldama', 'Vakvaklama (Quacking)'), updated_at = now() where id = 'quacking';
update public.kural_kaynaklari set ad = 'Ana Arı Ötmesi (Piping) bypass', aciklama = replace(aciklama, 'ana ötmesi', 'ana sesi — Ana Arı Ötmesi (Piping) —'), updated_at = now() where id = 'ors_bypass';
update public.kural_kaynaklari set degerler = replace(degerler, 'Anasızlık sesi', 'Anasızlık Uğultusu (Queenless Roar)'), updated_at = now() where id = 'm2_anasiz';
update public.kural_kaynaklari set degerler = replace(degerler, 'sonra ötme,', 'sonra Ana Arı Ötmesi (Piping),'), updated_at = now() where id = 'm4_takvim';
update public.kural_kaynaklari set degerler = replace(degerler, 'Oğul anı sesinden', 'Oğul Anı Sesi (Swarming) sesinden'), aciklama = replace(aciklama, 'ötme kesilir', 'Ana Arı Ötmesi (Piping) kesilir'), updated_at = now() where id = 'm7_ogul_sonrasi';
update public.yapilacaklar set durum = 'tamam', guncelleme = now() where id = 6;

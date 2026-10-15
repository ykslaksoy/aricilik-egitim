-- koloni-179: Hastalık / stres sesi (varroa) — 122–396 Hz, sadece kayıt (uyarı eşiği değil), tek çalışma / model özelliği.
update public.ses_siniflari set hz_min = 122, hz_max = 396, seviye = 'kayit',
  yapi = 'Makine öğrenmesi modelinde Varroa varlığı için önemli bulunan frekans aralığı; tek başına eşik değil, sınıflandırıcı girdisi. Akar yürüme titreşimi 500–2000 Hz, yalnız petek ivmeölçeriyle.',
  kaynak = 'Yıldız B.İ., Karabağ K. (2026). When the hive speaks: detecting Varroa destructor infestation in honey bees through acoustic biomarkers and machine learning. Experimental and Applied Acarology 97(3):23. doi:10.1007/s10493-026-01179-y · Qandour 2014 (Acoustics Australia 42:204–209) · Scientific Reports 2023, doi:10.1038/s41598-023-36810-0',
  kaynak_zayif = true, durum = 'tek çalışma / model özelliği', updated_at = now()
where id = 'stres_varroa';

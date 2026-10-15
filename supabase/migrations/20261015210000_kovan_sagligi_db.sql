-- k177: Kovan sağlığı — gömülü 6 dB kaldırıldı; eşikler yönetici ayarı (ogul_skor_ayar.data.sensor: saglikUyariDb 4, saglikKritikDb 7, yelpazeOran 0.4; uzman tahmini). Hz kutuları dolduruldu. Analı kovan tepesine dokunulmadı.
update public.ses_siniflari set hz_min = 100, hz_max = 600,
  yapi = 'Taban 100–600 Hz; taban sapması (dB) ≥ uyarı eşiği → Uyarı, ≥ kritik eşiği → Kritik; yelpazeleme bandı 150–195 Hz okuma oranı ≥ oran eşiği → Uyarı. Eşikler yönetici ayarı (varsayılan 4 dB / 7 dB / %40, uzman tahmini)',
  kaynak = 'Ferrari ve ark. 2008: oğul öncesi genlik/frekans artışı ve 100–300 → 500–600 Hz kayması (dB eşiği vermez). Peters ve ark. 2017: yelpazeleme kanat frekansı 173,9 ± 20,4 Hz (kinematik). dB eşikleri ve %40 oranı uzman tahminidir.',
  kaynak_zayif = true, durum = 'uzman tahmini · eşikler düzenlenebilir', updated_at = now()
where id = 'kovan_sagligi';
update public.ses_siniflari set hz_min = 150, hz_max = 195,
  yapi = 'Sürekli; kanat vuruşu 173,9 ± 20,4 Hz (kinematik; akustik karşılığı kaynak zayıf)', updated_at = now()
where id = 'yelpazeleme';
update public.ogul_skor_ayar set data = jsonb_set(data, '{sensor}', (coalesce(data->'sensor','{}'::jsonb) - 'tabanSapmaDb') || jsonb_build_object('saglikUyariDb', 4, 'saglikKritikDb', 7, 'yelpazeOran', 0.4, 'yelpazeHzMax', 195)), updated_at = now()
where id = 1;
-- k177 ek: Analı kovan tepesi 200–300 Hz; sabit kayma değeri kaldırıldı; kaynak zayıf.
update public.ses_siniflari set hz_min = 200, hz_max = 300,
  yapi = 'Orta bant; anasızda bant enerjisi artar, tepe genişler',
  kaynak = 'Ruvinga ve ark. 2021/2023; Nolasco ve ark. 2019; Robles-Guerrero ve ark. 2017; Terenzi ve ark. 2020 (derleme). Bu çalışmalar analı/anasız ayrımını tek frekansla değil, MFCC/spektrum örüntüsüyle yapar; sabit bir kayma değeri bildiren yok.',
  kaynak_zayif = true, durum = 'kaynak zayıf · KİLİTLİ', updated_at = now()
where id = 'anali_tepe';

-- k168: Efe arısı (Apis mellifera anatoliaca, Ege ekotipi) — sayısal puan yayımlanmadı → Genetik «Veri yok». Kaynak yalnız yönetici.
insert into public.kural_kaynaklari (id, grup, sira, ad, degerler, seviye, aciklama, kaynak, durum)
values ('irk_efe', 'oğul skoru', 14, 'Irk: Efe arısı',
  'Genetik: Veri yok · Oğul ölçeği: Veri yok · FOB: Veri yok (0–100 puan yayımlanmamış; ağırlık dağıtılır)', '—',
  'Tescil 2019 (Ege Tarımsal Araştırma Enstitüsü). Nitel: oğul verme eğilimi çok düşük, hırçın değil, hastalıklara dayanıklı, kışlatma yüksek, ilkbahar gelişimi hızlı; bölge arılarına göre koloni indeksi %20, bal verimi %25 yüksek.',
  'TAGEM, «Gökçeada ve Efe Arısı Ekotipleri Tescil Edildi» (2019); Resmî Gazete 16.05.2019 sayı 30776; Resmî Gazete 14.10.2020 Tebliğ 2020/22 Ek-60',
  'kaynaklı (puansız)')
on conflict (id) do update set degerler = excluded.degerler, aciklama = excluded.aciklama, kaynak = excluded.kaynak, durum = excluded.durum, updated_at = now();

-- k170: Efe arısı Genetik 25 (oğul ölçeği 2–3) — kullanıcı onaylı uzman tahmini; dil uzunluğu RG EK-1.
update public.kural_kaynaklari set
  degerler = 'Genetik: 25 · Oğul ölçeği: 2–3 (uzman tahmini, kullanıcı onaylı) · FOB: Veri yok · Dil uzunluğu: 6,05 ± 0,21 mm',
  aciklama = 'Resmî Gazete EK-1: «Oğul eğilimi düşüktür», «Orta derecede uysaldır»; TAGEM: oğul verme eğilimi çok düşük. Sayısal oğul puanı yayımlanmadı → Buckfast (15) ile Karadeniz (35) arası, orta değer 25. Tescil 2019 (Ege TAE); bölge arılarına göre koloni indeksi %20, bal verimi %25 yüksek.',
  kaynak = 'Resmî Gazete 16.05.2019 sayı 30776 EK-1 — https://www.resmigazete.gov.tr/eskiler/2019/05/20190516-14-1.pdf; TAGEM, «Gökçeada ve Efe Arısı Ekotipleri Tescil Edildi» (2019); Resmî Gazete 14.10.2020 Tebliğ 2020/22 Ek-60',
  durum = 'uzman tahmini', updated_at = now()
where id = 'irk_efe';
update public.yapilacaklar set aciklama = 'Kafkas × Muğla, Karadeniz × Muğla ve Karadeniz × Anadolu için genetik puan yok.' where id = 4;

-- k173: Çıkmış Ana Ötmesi (Tooting) — Ana Arı Ötmesi (Piping) alt türü; ayrı eşik yok (uydurulmadı). Kilitli tooting/quacking satırları değişmedi.
insert into public.ses_siniflari (id, ad_tr, ad_en, hz_min, hz_max, yapi, anlam, seviye, kaynak, kaynak_zayif, aktif, sira, durum)
values ('cikmis_ana', 'Çıkmış Ana Ötmesi (Tooting)', 'Queen tooting', null, null,
  'Ana Arı Ötmesi (Piping) alt türü; ayrı eşik yok — üst türün (Piping) eşikleriyle algılanır',
  'Yüksükten çıkmış ananın sesi; yüksükteki ana Vakvaklama (Quacking) ile yanıt verir. Birlikte duyulursa yeni ana rekabeti / ikinci oğul riski',
  'kritik', 'Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611',
  false, true, 5.5, 'teyitli (alt tür; eşik üst türden)')
on conflict (id) do update set ad_tr = excluded.ad_tr, ad_en = excluded.ad_en, yapi = excluded.yapi, anlam = excluded.anlam, kaynak = excluded.kaynak, sira = excluded.sira, durum = excluded.durum, updated_at = now();
insert into public.kural_kaynaklari (id, grup, sira, ad, degerler, seviye, aciklama, kaynak, durum)
values ('m9_tooting_quacking', 'muayene', 28, 'Çıkmış Ana Ötmesi (Tooting) ↔ Vakvaklama (Quacking)',
  'Tooting: yüksükten çıkmış ana (Piping alt türü). Quacking: yüksükteki ananın yanıtı. İkisi 30 dk içinde → Yüksek «Yeni ana rekabeti». Ayrı eşik yok; Piping ve Quacking eşikleri kullanılır.',
  'yüksek', 'Serbest (çıkmış) ana tooting yapar, yüksükteki bakire analar quacking ile yanıt verir; işçiler yüksükteki anaları tutar → ikinci oğul (after-swarm) hazırlığı.',
  'Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). J Comp Physiol A 158:605–611 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3)',
  'teyitli')
on conflict (id) do update set ad = excluded.ad, degerler = excluded.degerler, aciklama = excluded.aciklama, kaynak = excluded.kaynak, updated_at = now();

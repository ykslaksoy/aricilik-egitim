-- k174: üst ad «Ana Arılar Ötmesi (Piping)»; uyarı: Tooting + Quacking birlikte = kritik, tek başına daha düşük. Yeni eşik yok.
update public.ses_siniflari set ad_tr = 'Ana Arılar Ötmesi (Piping)', updated_at = now() where id = 'tooting';
update public.ses_siniflari set yapi = replace(yapi, 'Ana Arı Ötmesi (Piping)', 'Ana Arılar Ötmesi (Piping)'), anlam = 'Yüksükten çıkmış ananın sesi; yüksükteki ana Vakvaklama (Quacking) ile yanıt verir. Tek başına → Yüksek; Vakvaklama ile birlikte → Kritik «Ana Arılar Ötmesi (Piping)»', updated_at = now() where id = 'cikmis_ana';
update public.ses_siniflari set anlam = replace(anlam, 'Ana Arı Ötmesi (Piping)', 'Ana Arılar Ötmesi (Piping)'), updated_at = now() where anlam like '%Ana Arı Ötmesi (Piping)%';
update public.ses_siniflari set yapi = replace(yapi, 'Ana Arı Ötmesi (Piping)', 'Ana Arılar Ötmesi (Piping)'), updated_at = now() where yapi like '%Ana Arı Ötmesi (Piping)%';
update public.kural_kaynaklari set ad = replace(ad, 'Ana Arı Ötmesi (Piping)', 'Ana Arılar Ötmesi (Piping)'), degerler = replace(degerler, 'Ana Arı Ötmesi (Piping)', 'Ana Arılar Ötmesi (Piping)'), aciklama = replace(aciklama, 'Ana Arı Ötmesi (Piping)', 'Ana Arılar Ötmesi (Piping)'), updated_at = now()
  where ad || degerler || coalesce(aciklama,'') like '%Ana Arı Ötmesi (Piping)%';
update public.kural_kaynaklari set
  ad = 'Ana Arılar Ötmesi (Piping): Çıkmış Ana Ötmesi (Tooting) + Vakvaklama (Quacking)',
  degerler = 'Birlikte (mevcut 30 dk penceresi) → Kritik «Ana Arılar Ötmesi (Piping)», art oğul yakın. Tek başına Çıkmış Ana Ötmesi (Tooting) → Yüksek; tek başına Vakvaklama (Quacking) → Orta. Yeni eşik yok; Piping ve Quacking eşikleri kullanılır.',
  aciklama = 'Bilimsel olarak Piping, ana arı seslerinin (Tooting ve Quacking) genel adıdır. Uygulamada «Ana Arılar Ötmesi (Piping)» adı ikisinin birlikte duyulma uyarısı olarak kullanılıyor. Serbest (çıkmış) ana tooting yapar, yüksükteki bakire analar quacking ile yanıt verir → art oğul hazırlığı.',
  seviye = 'kritik', updated_at = now()
where id = 'm9_tooting_quacking';

-- koloni-205: Kural kaynakları nem/kireç satırları tek kaynağa bağlı ({s:anahtar} → ogul_skor_ayar.sensor; panel4 yerinde çözer).
insert into public.kural_kaynaklari (id, grup, sira, ad, degerler, seviye, aciklama, kaynak, durum)
values ('nem_kademeleri', 'sağlık', 41, 'Nem kademeleri',
 'Kritik: %{s:nemKritikAlt} altı · erken uyarı: %{s:nemKritikAlt}–{s:nemNormalAlt} · normal: %{s:nemNormalAlt}–{s:nemNormalUst} · normal üstü (nötr): %{s:nemNormalUst}–{s:nemKirecUst} · kireç riski: %{s:nemKirecUst} üstü; tümü kesintisiz {s:nemDisiSaat} saat. Oğul skoru Sıkışıklık nem eki normal üst sınırı, kireç destek nemi kireç eşiğini kullanır.',
 'bilgi', 'Kullanıcıya yalnız durum metni: «Nem çok düşük, yavru (yumurta) açılmama riski var» / «Nem düşüyor, yavrularda kuruma riski var» / «Nem normal aralığın üstünde» / «Nem çok yüksek, kireç hastalığı riski var». Kireç uyarısı sıcaklık kuralıyla ortak (7 günde bir).',
 'İlgili: Doull K.M. (1976). Apidologie 7:61–66, doi:10.1051/apido:19760104 (%50 altında yumurta açılmadı) · Kireç: Liang Q. ve ark. (2000). Ying Yong Sheng Tai Xue Bao 11(6):869–72, PubMed 11767561; Flores J.M. ve ark. (1996). Apidologie 27:185, doi:10.1051/apido:19960401',
 'kritik/erken/üst sınırlar ve süre uzman tahmini (kullanıcı seçimi) · kireç eşiği destekleyici kaynaklı')
on conflict (id) do update set degerler = excluded.degerler, aciklama = excluded.aciklama, kaynak = excluded.kaynak, durum = excluded.durum, updated_at = now();
update public.kural_kaynaklari set degerler = 'Kuluçka döneminde (ay {s:kirecAyBas}–{s:kirecAySon}) kuluçka ısısı kesintisiz {s:kirecSaat} saat {s:kirecIsiC} °C altında → «Kireç riski, kuluçka ve havalandırma kontrolü önerilir»; ya da nem kesintisiz {s:nemDisiSaat} saat %{s:nemKirecUst} üstünde → «Nem çok yüksek, kireç hastalığı riski var»; iki kural tek uyarı, en çok {s:hatirlatmaGun} günde bir', updated_at = now() where id = 'kirec_riski';
update public.kural_kaynaklari set degerler = replace(degerler, 'dış nem ≥%85', 'dış nem ≥%{s:nemDisMax}'), updated_at = now() where id = 'sik_nem';
update public.kural_kaynaklari set degerler = replace(degerler, 'dış nem ≥%85', 'dış nem ≥%{s:disNemYuksek}'), updated_at = now() where id = 'sik_dis_ortam';
update public.kural_kaynaklari set degerler = replace(degerler, '/15 %RH', '/{s:nemSapma} %RH'), updated_at = now() where id = 'sik_nem';

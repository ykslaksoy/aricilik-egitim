-- koloni-153: Mevsim 100/60/15, ana yaşı bilinmiyorsa bileşen çıkarılır
update public.kural_kaynaklari set degerler='Oğul dönemi zirvesi 100 · kenar (hazırlık/kuyruk) 60 · dönem dışı 15; canlı nektar akımı → 100', durum='uzman tahmini', updated_at=now() where id='ors_mevsim';
update public.kural_kaynaklari set degerler='Bu yıl 20 · 1 yaş 60 · ≥2 yaş 100 · bilinmiyorsa bileşen ORS''tan çıkarılır, 0,15 ağırlığı kalanlara orantılı dağıtılır', durum='uzman tahmini', updated_at=now() where id='ors_anayasi';
update public.kural_kaynaklari set degerler='Genetik×0,30 + Sıkışıklık×0,40 + Mevsim×0,15 + Ana yaşı×0,15 (ana yaşı bilinmiyorsa ÷0,85); anasız ≤5, 120 günde oğul verdi ≤15', updated_at=now() where id='ors_formul';

-- SüperArı — önizleme onizleme/donanim-koruma (18.10.2026): Donanım › Koruma / dış ortam → firmware Yapılacaklar.
-- CANLIYA UYGULANMADI: yayın onayından sonra uygulanacak. Tekrar çalıştırılabilir (aynı başlık varsa eklemez).

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: SHT4x ısıtıcısı belirli aralıklarla', 'Kovan içi ve dış SHT41 için yüksek nemde (>80 %RH) ısıtıcı darbesi (20/110/200 mW, 0,1 veya 1 s) belirli aralıklarla çalıştırılmalı; görev oranı en çok %10, ısıtma sırasında ve hemen sonra okunan değer kayda alınmamalı. Amaç: yoğuşmayı gidermek ve nem kaymasını önlemek. Kaynak: Sensirion SHT4x datasheet V7.3 bölüm 4.9. Aralık süresi: uzman tahmini (sahada denenmeli).'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: SHT4x ısıtıcısı belirli aralıklarla');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: 0 °C altında pil şarjını kes (gateway)', 'T-Beam V1.2 şemasında AXP2101 TS ucu 100 Ω (R8220) ile toprağa bağlı: pil NTC''si yok, donanım 0 °C altında şarjı kesmiyor. Pil yanına 10K NTC (ya da sıcaklık sensörü) konup sıcaklık < 0 °C ve > 45 °C iken AXP2101 şarjı yazılımla kapatılmalı (18650 şarj 0…45 °C: Samsung 35E datasheet; LiFePO4 de 0…45 °C). Soğuk bölgede (Erzurum, Tortum, Palandöken, Cimil) ısıtmalı/yalıtımlı pil paketiyle birlikte. Kaynak: AXP2101 datasheet (TS, REG50/54/55), LilyGO T-Beam V1.2 şeması.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: 0 °C altında pil şarjını kes (gateway)');

insert into public.yapilacaklar (baslik, aciklama)
select 'Firmware: mikrofon tıkanma uyarısı', 'Akustik PTFE zar ya da tel kafes propolis/nemle tıkanırsa ses seviyesi kalıcı düşer. Kovanın kendi geçmişine göre ses seviyesi uzun süre düşük kalırsa «Mikrofon tıkanmış olabilir» uyarısı verilmeli. Eşik ve süre: uzman tahmini (sahada belirlenecek). SPH0645 belirtilen performansı yalnız 0…45 °C (Knowles datasheet); 0 °C altında uyarı verilmemeli.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Firmware: mikrofon tıkanma uyarısı');

insert into public.yapilacaklar (baslik, aciklama)
select 'Donanım: T-Beam LoRa çipini doğrula', 'LilyGO T-Beam ürün sayfası 868 MHz için SX1276 yazıyor; yapılandırmamız (firmware/gate) SX1262 varsayıyor; Robo90 ilanında çip yazmıyor. Satın almadan önce satıcıya sorulmalı; SX1276 gelirse gateway LoRa sürücüsü buna göre seçilmeli.'
where not exists (select 1 from public.yapilacaklar where baslik = 'Donanım: T-Beam LoRa çipini doğrula');

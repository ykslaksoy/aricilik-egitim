# Kovan ses sınıfları — doğrulanmış tablo (SüperArı · koloni-147)

## A) Kullanıcı tablosunun satır satır doğrulaması

| Ses | Kullanıcı değeri | Sonuç | Doğru / revize değer | Sistem alarm durumu | Kaynak |
|---|---|---|---|---|---|
| Ana arı ötmesi (tooting) | 350–550 / 400–500 Hz; 1–2 sn + 0,5 sn heceler; ~5 sn | **Revize** | Temel frekans 350–500 Hz; ilk hece >1 sn (1–2 sn), sonraki heceler ~0,25 sn, ~0,5 sn aralıkla; toplam süre değişken (~5 sn doğrulanmadı) | Ana alarm: 400–500 Hz, ritmik, 1 dk → Kritik (aynen) | Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3) |
| Vızıldama (quacking) | 200–350 Hz; 0,1–0,2 sn | **Doğru** | 200–350 Hz, hece <0,2 sn, ~3 hece/sn, sabit frekans | Erken uyarı; ötme ile 30 dk içinde → Yüksek | Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611 · Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5 |
| Çiftleşmiş ana ötmesi | 330–430 Hz | **Kaynak zayıf** | Kaynakta yalnız «frekans yaşa bağlı değişir» genel bilgisi var; 330–430 Hz aralığı doğrulanamadı | Pasif — sadece kayıt | Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3) |
| İşçi vızıltısı (temel) | 200–250 Hz | **Doğru** | Uçuşta kanat vuruşu ~230 Hz | Pasif — taban seviye | Altshuler D.L., Dickson W.B., Vance J.T., Roberts S.P., Dickinson M.H. (2005). Short-amplitude high-frequency wing strokes determine the aerodynamics of honeybee flight. PNAS (2005) |
| Erkek arı uğultusu | 150–190 Hz | **Kaynak zayıf** | Literatürde erkek kanat vuruşu ~225 Hz da bildirilmiş; 150–190 Hz için doğrulanmış kaynak bulunamadı | Pasif — sadece kayıt (anasızlık/ötme sayılmaz) | Doğrulanmış kaynak bulunamadı |
| Anasızlık sesi | 300–400 Hz, artan dB | **Kısmen** | Anasızlığın sesle ayırt edilebildiği doğrulandı (makine öğrenmesi, MFCC/spektrogram); sabit 300–400 Hz bandı kaynakta verilmiyor → kullanıcı kuralı korunur, göreli dB artışı | Ayrı alarm: «Anasızlık şüphesi — muayene et» (10 dk, taban +6 dB) | Ruvinga S., Hunter G., Duran O., Nebel J.-C. (2023). Identifying queenlessness in honeybee hives from audio signals using machine learning. Electronics 12(7):1627 |
| Dur sinyali | 350–380 Hz; 60–100 ms | **Revize** | ~380 Hz, ~150 ms | Pasif — darbe filtresi (<1 sn ötme/anasızlık sayılmaz) | Lau C.W., Nieh J.C. (2010). Honey bee stop-signal production: temporal distribution and effect of feeder crowding. Apidologie 41(1) · Nieh J.C. (1993). The stop signal of honey bees: reconsidering its message. Behav Ecol Sociobiol 33:51–56 · Pastor K.A., Seeley T.D. (2005). The brief piping signal of the honey bee: begging call or stop signal? Ethology 111:775–784 |

## B) Eklenen kaynaklı sesler

| Ses | Yapı / frekans | Sistem alarm durumu | Kaynak |
|---|---|---|---|
| İşçi ötmesi (oğul kalkışı öncesi) | ~0,8 sn darbe; 100–200 → 200–250 Hz yükselir; kalkıştan ~1 saat önce artar | Yüksek (kayıt + uyarı adayı) | Seeley T.D., Tautz J. (2001). Worker piping in honey bee swarms and its role in preparing for liftoff. J Comp Physiol A 187:667–676 |
| Titreşim sinyali (DVAV / shaking) | Alt-tabaka titreşimi, 1–2 sn sallama; mikrofonla zayıf | Pasif — sadece kayıt | Nieh J.C. (1998). The honey bee shaking signal: function and design of a modulatory communication signal. Behav Ecol Sociobiol 42:23–36 |
| Sallanma dansı sesi | Düz koşuda ~200 Hz civarı darbeler | Bilgi | Wenner A.M. (1962). Sound production during the waggle dance of the honey bee. Animal Behaviour 10:79–95 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3) |
| Oğul öncesi uğultu/spektrum değişimi | Günler–haftalar içinde spektral değişim (30 güne kadar önceden) | Erken uyarı (veri birikince) | Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5 · Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77 |
| Oğul anı sesi | Ses enerjisinde ani artış, frekans kayması | Kritik (veri birikince) | Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77 |
| Tıslama (hissing, savunma) | Geniş bant; A. m. cypria’da baskın ~6 kHz | Bilgi | Wehmann H.-N., Gustav D., Kirkerud N.H., Galizia C.G. (2015). The sound and the fury — bees hiss when expecting danger. PLoS ONE 10(3):e0118708 · Papachristoforou A. ve ark. (2008). High frequency sounds produced by Cyprian honeybees Apis mellifera cypria when confronting their predator, the Oriental hornet Vespa orientalis. Apidologie 39(4) |
| Yelpazeleme (fanning) | Girişte sürekli uğultu | Kaynak zayıf — sadece kayıt | Doğrulanmış kaynak bulunamadı |
| Yağma sesi | Girişte düzensiz yüksek aktivite | Kaynak zayıf — sadece kayıt | Doğrulanmış kaynak bulunamadı |
| Hastalık/stres (varroa) | Akustik parmak izi farkı (tek kayıtlı sınırlı veri) | Kaynak zayıf — sadece kayıt | Qandour A., Ahmad I., Habibi D., Leppard M. (2014). Remote beehive monitoring using acoustic signals. Acoustics Australia 42(3):204–209 |
| Kış kümelenmesi titremesi | Kanat oynatmadan kas titremesi; ses imzası belirsiz | Kaynak zayıf — sadece kayıt | Stabentheiner A., Pressl H., Papst T., Hrassnigg N., Crailsheim K. (2003). Endothermic heat production in honeybee winter clusters. J Exp Biol 206:353–358 |

## Notlar

- Ötme alarm kuralı (400–500 Hz, ritmik, 1 dk → Kritik) değiştirilmedi; sınıf tanımı kaynaktaki 350–500 Hz aralığını gösterir.
- Darbe filtresi: <1000 ms sesler ötme/anasızlık sayılmaz (dur sinyali ~380 Hz, ~150 ms).
- «Kaynak zayıf» sınıflar uyarı üretmez, yalnız kaydedilir; eşikler yönetici panelinden değiştirilebilir.

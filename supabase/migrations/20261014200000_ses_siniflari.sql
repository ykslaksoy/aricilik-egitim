-- koloni-146: kovan ses sınıfları (yönetici düzenler) + ses olayları (sensör etiketli kayıtlar)
create table if not exists public.ses_siniflari (
  id text primary key,
  ad_tr text not null, ad_en text,
  hz_min numeric, hz_max numeric,
  yapi text, anlam text,
  seviye text not null default 'kayit' check (seviye in ('bilgi','erken','yuksek','kritik','kayit')),
  kaynak text, kaynak_zayif boolean not null default false,
  aktif boolean not null default true,
  sira int not null default 100,
  updated_at timestamptz not null default now()
);
alter table public.ses_siniflari enable row level security;
drop policy if exists ses_siniflari_read on public.ses_siniflari;
create policy ses_siniflari_read on public.ses_siniflari for select to anon, authenticated using (true);
drop policy if exists ses_siniflari_admin_write on public.ses_siniflari;
create policy ses_siniflari_admin_write on public.ses_siniflari for all to authenticated using (public.sa_is_admin()) with check (public.sa_is_admin());

create table if not exists public.ses_olaylari (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  hive_id text not null,
  device_id text,
  at timestamptz not null,
  sinif text references public.ses_siniflari(id) on update cascade,
  guven numeric check (guven is null or (guven >= 0 and guven <= 1)),
  hz_tepe numeric,
  sure_ms int,
  db_goreli numeric,
  created_at timestamptz not null default now()
);
create index if not exists ses_olaylari_hive_at on public.ses_olaylari (user_id, hive_id, at desc);
alter table public.ses_olaylari enable row level security;
drop policy if exists ses_olaylari_own on public.ses_olaylari;
create policy ses_olaylari_own on public.ses_olaylari for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists ses_olaylari_admin_read on public.ses_olaylari;
create policy ses_olaylari_admin_read on public.ses_olaylari for select to authenticated using (public.sa_is_admin());

insert into public.ses_siniflari (id, ad_tr, ad_en, hz_min, hz_max, yapi, anlam, seviye, kaynak, kaynak_zayif, sira) values
('tooting','Ana arı ötmesi','Queen tooting (piping)',400,500,'İlk hece >1 sn (frekans yükselişli), ardından ~0,25 sn heceler','Yeni çıkan ana; oğul / ikinci oğul hazırlığı','kritik','Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3) · Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5',false,1),
('quacking','Vızıldama (yüksükteki ana)','Queen quacking',200,350,'Kısa kesik heceler (<0,2 sn), sabit frekans, peş peşe (~3/sn)','Yüksükte bakire ana; ötmeye yanıt — ikinci oğul riski','erken','Michelsen A., Kirchner W.H., Andersen B.B., Lindauer M. (1986). The tooting and quacking vibration signals of honeybee queens: a quantitative analysis. J Comp Physiol A 158:605–611 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3) · Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5',false,2),
('anasizlik','Anasızlık sesi','Queenless roar',300,400,'Normal vızıltıdan keskin, sürekli; kovanın taban seviyesine göre artış','Ana kaybı şüphesi — muayene','yuksek','Ruvinga S., Hunter G., Duran O., Nebel J.-C. (2023). Identifying queenlessness in honeybee hives from audio signals using machine learning. Electronics 12(7):1627',false,3),
('dur_sinyali','Dur sinyali','Stop signal / brief piping',380,400,'~150 ms tek darbe, baş vuruşuyla','Dans/toplayıcı alımını durdurma (olumsuz geri besleme) — alarm değil','kayit','Nieh J.C. (1993). The stop signal of honey bees: reconsidering its message. Behav Ecol Sociobiol 33:51–56 · Pastor K.A., Seeley T.D. (2005). The brief piping signal of the honey bee: begging call or stop signal? Ethology 111:775–784 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3)',false,4),
('titresim','Titreşim sinyali','Shaking signal (DVAV)',null,null,'Gövdeyi alıcı arıya bastırarak 1–2 sn sallama (alt-tabaka titreşimi; mikrofonla zayıf)','İş bölümünü yeniden düzenleme (ör. toplayıcılığı hızlandırma)','kayit','Nieh J.C. (1998). The honey bee shaking signal: function and design of a modulatory communication signal. Behav Ecol Sociobiol 42:23–36',false,5),
('sallanma_dansi','Sallanma dansı sesi','Waggle dance sound',200,300,'Düz koşu boyunca kısa ses darbeleri (~200 Hz civarı)','Besin kaynağı yön/uzaklık iletişimi — aktif toplayıcılık','bilgi','Wenner A.M. (1962). Sound production during the waggle dance of the honey bee. Animal Behaviour 10:79–95 · Kirchner W.H. (1993). Acoustical communication in honeybees. Apidologie 24(3)',false,6),
('isci_otmesi','İşçi ötmesi (oğul kalkışı öncesi)','Worker piping',100,250,'~0,8 sn darbe, temel frekans 100–200 → 200–250 Hz yükselir; kalkıştan ~1 saat önce artar','Oğul kümesi kalkışa hazırlanıyor','yuksek','Seeley T.D., Tautz J. (2001). Worker piping in honey bee swarms and its role in preparing for liftoff. J Comp Physiol A 187:667–676',false,7),
('ogul_oncesi','Oğul öncesi uğultu değişimi','Pre-swarm spectral change',null,null,'Günler/haftalar içinde titreşim spektrumunda değişim (makine öğrenmesiyle)','Oğul hazırlığı (30 güne kadar önceden)','erken','Ramsey M.-T., Bencsik M., Newton M.I. ve ark. (2020). The prediction of swarming in honeybee colonies using vibrational spectra. Scientific Reports 10, doi:10.1038/s41598-020-66115-5 · Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77',false,8),
('ogul_ani','Oğul anı sesi','Swarming sound',null,null,'Ses enerjisinde ani artış ve frekans kayması','Oğul çıkıyor / çıktı','kritik','Ferrari S., Silva M., Guarino M., Berckmans D. (2008). Monitoring of swarming sounds in bee hives for early detection of the swarming period. Computers and Electronics in Agriculture 64:72–77',false,9),
('tislama','Tıslama (savunma)','Hissing',500,16000,'Geniş bantlı kısa tıslama (A. m. cypria’da baskın ~6 kHz)','Tehdit / rahatsızlık tepkisi','bilgi','Wehmann H.-N., Gustav D., Kirkerud N.H., Galizia C.G. (2015). The sound and the fury — bees hiss when expecting danger. PLoS ONE 10(3):e0118708 · Papachristoforou A. ve ark. (2008). High frequency sounds produced by Cyprian honeybees Apis mellifera cypria when confronting their predator, the Oriental hornet Vespa orientalis. Apidologie 39(4)',false,10),
('yelpazeleme','Yelpazeleme','Fanning',null,null,'Girişte sürekli kanat çırpma uğultusu','Havalandırma / nem atma','kayit','—',true,11),
('stres_varroa','Hastalık / stres sesi (varroa)','Stress / varroa spectral change',null,null,'Akustik parmak izi farkı (sınırlı veri)','Varroa / stres şüphesi','kayit','Qandour A., Ahmad I., Habibi D., Leppard M. (2014). Remote beehive monitoring using acoustic signals. Acoustics Australia 42(3):204–209',true,12),
('kumelenme','Kış kümelenmesi titremesi','Shivering thermogenesis',null,null,'Kanat oynatmadan uçuş kası titremesi (ses imzası belirsiz)','Kışta ısı üretimi','kayit','Stabentheiner A., Pressl H., Papst T., Hrassnigg N., Crailsheim K. (2003). Endothermic heat production in honeybee winter clusters. J Exp Biol 206:353–358',true,13),
('yagma','Yağma sesi','Robbing',null,null,'Girişte düzensiz, yüksek aktivite','Yağma şüphesi','kayit','—',true,14),
('erkek_ucusu','Erkek arı uçuşu','Drone flight',150,190,'Daha pes, sürekli uğultu','Erkek arı uçuşu (anasızlık/ötme sayılmaz)','kayit','—',true,15),
('isci_vizilti','Normal işçi vızıltısı','Worker buzz',200,250,'Sürekli uğultu; uçuşta kanat vuruşu ~230 Hz','Normal etkinlik — taban seviye (ötme/vızıldama sayılmaz)','kayit','Altshuler D.L., Dickson W.B., Vance J.T., Roberts S.P., Dickinson M.H. (2005). Short-amplitude high-frequency wing strokes determine the aerodynamics of honeybee flight. PNAS (2005)',false,16)
on conflict (id) do update set kaynak = excluded.kaynak, kaynak_zayif = excluded.kaynak_zayif;

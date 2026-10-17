/* k241: sensör geçmişi — ham okumalar IndexedDB (sensor-ham.js; yoksa localStorage yolu), sensorGiris alanları atmaz, gerçek cihaz ses olayı ses_olaylari,
   günlük özetler + uzun taban kuralları özet okur, «Taban oluşuyor (x/17 gece)», hiveSens penceresi ayarı (21 gün), sunucu arşivi + RLS + yedek tabloları, telefon yedeği ham okumaları almaz, /api/ingest. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),R=path.join(W,'../..');
const store={},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){return true},CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail},Event:function(){},console,setTimeout(){},confirm:()=>true,alert(){},document:{addEventListener(){},removeEventListener(){},getElementById(){return null},visibilityState:'visible',createElement(){return{style:{},setAttribute(){},appendChild(){},textContent:''}},head:{appendChild(){}},body:{appendChild(){}},hidden:false},HTMLElement:function(){}};
w.window=w;w.self=w;vm.createContext(w);
/* IndexedDB yok → sensor-ham.js eski localStorage yolunu söyler */
vm.runInContext(fs.readFileSync(path.join(W,'sensor-ham.js'),'utf8'),w);
const Hm=w.SuperAriSensorHam;
assert.strictEqual(Hm.aktif(),false);assert.strictEqual(Hm.ekle('ir',{hiveId:1,at:new Date().toISOString()}),false);
assert.deepStrictEqual(Object.assign({},Hm.VARS),{hamSaklaGun:30,hiveSensGun:21,ozetSaklaGun:400});
vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
vm.runInContext(fs.readFileSync(path.join(W,'device-runtime.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,Dv=w.SuperAriDevices,T=Object.assign({},C.ORS_SENSOR);
['hamSaklaGun','hiveSensGun','ozetSaklaGun'].forEach(k=>{assert.ok(k in T,k);assert.match(C.ORS_SENSOR_ADLAR[k],/uzman tahmini/,k);});
assert.strictEqual(T.hamSaklaGun,30);assert.strictEqual(T.hiveSensGun,21);assert.strictEqual(T.ozetSaklaGun,400);
const H=3600000,D=24*H,N=Date.now();
/* sensorGiris alanları atmaz + gerçek cihaz ses olayı gönderilir (demo değil) */
const olay=[];w.SuperAriSensorPolling={sesOlayGonder:r=>olay.push(r)};
assert.ok(C.sensorGiris({kovan_id:701,sensor_tipi:'ir',timestamp:new Date(N-H).toISOString(),deger:{giren:120,cikan:150},yer:'giris',cihaz_id:'ir-7',kanallar:[{kanal:0,giren:60,cikan:70},{kanal:1,in:60,out:80}]},N).ok);
const ir=JSON.parse(store['superari.sensor.ir.v1']).pop();
assert.strictEqual(ir.giren,120);assert.strictEqual(ir.cikan,150);assert.strictEqual(ir.count,270);assert.strictEqual(ir.yer,'giris');assert.strictEqual(ir.deviceId,'ir-7');assert.strictEqual(ir.kanallar[1].cikan,80);
assert.ok(C.sensorGiris({kovan_id:701,sensor_tipi:'titresim',timestamp:new Date(N-H).toISOString(),deger:{rms:0.8,g:2.4,darbe:true,bant:'dusuk',sr:3200},hz:300,sinif:'tooting',deviceId:'t-7'},N).ok);
const ti=JSON.parse(store['superari.sensor.titresim.v1']).pop();
assert.strictEqual(ti.rms,0.8);assert.strictEqual(ti.g,2.4);assert.strictEqual(ti.darbe,true);assert.strictEqual(ti.bant,'dusuk');assert.strictEqual(ti.sr,3200);assert.strictEqual(ti.deviceId,'t-7');
assert.strictEqual(olay.length,1);assert.strictEqual(olay[0].sinif,'tooting');
C.sensorGiris({kovan_id:701,sensor_tipi:'ses',timestamp:new Date(N-H).toISOString(),sinif:'tooting',demo:true},N);
/* günlük özet */
const g0=new Date(N-3*D);g0.setHours(0,0,0,0);const gb=g0.getTime();
const Rw={titresim:[1,2,3].map(h=>({t:gb+h*H,rms:2,hz:30})).concat([{t:gb+12*H,rms:9,hz:30},{t:gb+2*H,rms:50,darbe:true}]),
  ir:[{t:gb+9*H,giren:500,cikan:600},{t:gb+15*H,giren:700,cikan:400}],
  tarti:[{t:gb+6.5*H,kg:40},{t:gb+8*H,kg:39.6},{t:gb+9.5*H,kg:39.5},{t:gb+18*H,kg:40.4}],
  isi_nem:[{t:gb+H,tempC:33.5,rh:60},{t:gb+13*H,tempC:35.1,rh:55},{t:gb+13*H,tempC:44,yer:'giris'}],
  ses:[{t:gb+10*H,sinif:'quacking'},{t:gb+11*H,sinif:'dur_sinyali'}]};
const oz=C.gunlukOzetHesapla(Rw,gb,T);
assert.strictEqual(oz.titGeceMd,2);assert.strictEqual(oz.titDarbe,1);assert.strictEqual(oz.irGiren,1200);assert.strictEqual(oz.irCikan,1000);
assert.strictEqual(oz.sabahDususKg,0.5);assert.strictEqual(oz.isiMin,33.5);assert.strictEqual(oz.isiMax,35.1);assert.strictEqual(oz.girisMax,44);assert.strictEqual(oz.quackSay,1);assert.strictEqual(oz.durSay,1);assert.strictEqual(oz.kgNet,0.4);
/* uzun taban: titreşim oğul — taban günleri yalnız özette (ham yok), son 3 gece ham artıyor → uyarı */
const son=new Date(N);son.setHours(4,0,0,0);const s0=new Date(son);s0.setHours(0,0,0,0);
const V=[];[0,1,2].forEach(k=>{[1,2,3].forEach(h=>V.push({t:s0.getTime()-k*D+h*H,rms:[3.0,2.6,2.2][k],hz:30}));});
const gun={};const key=t=>{const d=new Date(t);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);};
for(let k=T.titOgulGun;k<T.titOgulGun+T.titOgulTabanGun;k++)gun[key(s0.getTime()-k*D+12*H)]={titGeceMd:1};
const rT=C.titresimYeni4({titresim:V,apiaryId:'a1',gunluk:gun},T,{notes:[]},N);assert.strictEqual(rT.titOgul,true,'özet tabanıyla titreşim oğul');
assert.strictEqual(C.titresimYeni4({titresim:V,apiaryId:'a1'},T,{notes:[]},N).titOgul,false,'özet yoksa taban yok');
/* IR dönmeyen tarlacı: taban günleri özette */
const IR=[];const i0=new Date(N);i0.setHours(0,0,0,0);
for(let k=1;k<=T.donmeYumusakGun;k++)IR.push({t:i0.getTime()-k*D+12*H,giren:700,cikan:1000});
IR.push({t:N-60000,giren:1,cikan:1});
const gI={};for(let k=T.donmeYumusakGun+1;k<=T.donmeYumusakGun+T.donmeTabanGun;k++)gI[key(i0.getTime()-k*D+12*H)]={irGiren:1000,irCikan:1000};
assert.strictEqual(C.kuralIr5({ir:IR,dis:[],tarti:[],apiaryId:'a1',gunluk:gI},T,{},N).irDonmeyen,true,'özet tabanıyla dönmeyen tarlacı');
assert.strictEqual(C.kuralIr5({ir:IR,dis:[],tarti:[],apiaryId:'a1'},T,{},N).irDonmeyen,false);
/* hiveSens penceresi 21 gün (eskiden 7) */
C.sensorGiris({kovan_id:702,sensor_tipi:'isi_nem',timestamp:new Date(N-7.5*D).toISOString(),deger:{tempC:34}},N);
/* LS yolu 8 gün budar; 7,5 gün önceki okuma kalır ve 21 günlük pencerede görünür */
assert.strictEqual(C.hiveSens(702,N).isi_nem.length,1);
assert.ok(C.hiveSens(702,N).gunluk && typeof C.hiveSens(702,N).gunluk==='object');
/* Taban oluşuyor (x/17 gece) — titreşim + IR + tartı cihazı aktif */
['titresim','ir','tarti'].forEach(tp=>Dv.addDevice({tip:tp,hiveId:703,apiaryId:'a1'}));
for(let k=0;k<5;k++)C.sensorGiris({kovan_id:703,sensor_tipi:'titresim',timestamp:new Date(s0.getTime()-k*D+2*H).toISOString(),deger:{rms:1}},N);
const TD=C.tabanDurum(703,N),to=TD.find(x=>x.id==='titOgul');
assert.ok(to,'titOgul satırı');assert.strictEqual(to.metin,'Oğul hazırlığı (titreşim): Taban oluşuyor ('+to.var+'/17 gece)');assert.ok(to.var>=4&&to.var<=5);
assert.ok(TD.find(x=>x.id==='irDonmeyen').metin.includes('/10 gün)'));assert.ok(TD.find(x=>x.id==='tarlaciKayip').metin.includes('/9 gün)'));
assert.ok(TD.every(x=>!/Hz|Ramsey|Bencsik|Henry/.test(x.metin)));
assert.strictEqual(C.tabanDurum(99999,N).length,0,'cihaz yok → satır yok');
/* kovan sayfası: satırlar sabit yükseklik, IndexedDB yüklenince yerinde güncellenir */
const kh=fs.readFileSync(path.join(W,'kovan.html'),'utf8');
assert.ok(kh.includes('tabanDurum')&&kh.includes('superari:sensor-ham-hazir')&&kh.includes('kvSensorDurum')&&kh.includes('min-height:1.25em'));
/* sensor-ham.js her demo-data.js sayfasında önce yüklenir */
fs.readdirSync(W).filter(f=>f.endsWith('.html')).forEach(f=>{const h=fs.readFileSync(path.join(W,f),'utf8'),a=h.indexOf('src="demo-data.js'),b=h.indexOf('src="sensor-ham.js');if(a>=0)assert.ok(b>=0&&b<a,f);});
assert.ok(fs.readFileSync(path.join(W,'sw.js'),'utf8').includes('"/sensor-ham.js"'));
/* sensor-ham.js: IndexedDB deposu, taşıma, gzip, kuyruk, özet geri okuma */
const sh=fs.readFileSync(path.join(W,'sensor-ham.js'),'utf8');
['indexedDB','kovan_tip_t','CompressionStream','sensor-ham','sa_sensor_ham_kaydet','sa_sensor_gunluk_yaz','sensor_gunluk','removeItem','online','superari:sensor-ham-hazir','hamSaklaGun','ozetSaklaGun','dd = 1'].forEach(x=>assert.ok(sh.includes(x),x));
/* sensor-polling ve diğer okuyucular depoyu kullanır */
assert.ok(fs.readFileSync(path.join(W,'sensor-polling.js'),'utf8').includes('SuperAriSensorHam'));
assert.ok(fs.readFileSync(path.join(W,'tarti-elle.js'),'utf8').includes('SuperAriSensorHam'));
assert.ok(fs.readFileSync(path.join(W,'ses-siniflari.js'),'utf8').includes('SuperAriSensorHam'));
/* telefon yedeği ham okumaları almaz */
const y=fs.readFileSync(path.join(W,'yedek.js'),'utf8');assert.ok(y.includes('superari\\.sensor\\.(tarti|isi_nem|ses|titresim|ir|pil|dis_isi_nem)\\.v1'));
/* migration: kova + RLS ekip, özet tablosu, yedek tablo listesi, saklama ayarları, Yapılacaklar */
const mg=fs.readFileSync(path.join(R,'supabase/migrations/20261018000000_k241_sensor_gecmis.sql'),'utf8');
['sensor-ham','sensor_ham_arsiv','sensor_gunluk','sa_hesap_ekip','enable row level security',"'sensor_gunluk', 'sensor_ham_arsiv'",'hamSaklaGun','sa_admin_sensor_arsiv','Cihaz → uygulama yolu eksik','yapilacaklar'].forEach(x=>assert.ok(mg.includes(x),x));
assert.ok(!/for (update|delete) to authenticated[^;]*sensor-ham/.test(mg),'arşiv silinmez');
/* yönetici: saklama kartı + arşiv paneli */
const p10=fs.readFileSync(path.join(R,'apps/yonetici/panel10.js'),'utf8');assert.ok(p10.includes("'hamSaklaGun'")&&p10.includes("'hiveSensGun'")&&p10.includes("'ozetSaklaGun'"));
const p14=fs.readFileSync(path.join(R,'apps/yonetici/panel14.js'),'utf8');assert.ok(p14.includes('sa_admin_sensor_arsiv')&&p14.includes('uzman tahmini'));
assert.ok(fs.readFileSync(path.join(R,'apps/yonetici/index.html'),'utf8').includes('panel14.js'));
assert.strictEqual(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),fs.readFileSync(path.join(R,'apps/yonetici/demo-data.js'),'utf8'));
/* /api/ingest: doğrulama */
const ing=require(path.join(R,'api/ingest.js'));
assert.ok(ing.okuma({kovan_id:1,sensor_tipi:'ir',timestamp:new Date().toISOString(),giren:3,cikan:4},{}));
assert.strictEqual(ing.okuma({kovan_id:1,sensor_tipi:'bilinmez',timestamp:new Date().toISOString()},{}),null);
assert.strictEqual(ing.okuma({sensor_tipi:'ir',timestamp:new Date().toISOString()},{}),null);
assert.strictEqual(ing.okuma({kovan_id:1,sensor_tipi:'ir',timestamp:'bozuk'},{}),null);
console.log('k241-sensor-gecmis ok');

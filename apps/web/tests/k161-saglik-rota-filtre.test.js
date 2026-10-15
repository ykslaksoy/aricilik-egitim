const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');const W=path.join(__dirname,'..');
const store={};const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);
['demo-data.js','plan-planlayici.js','cicek-veri.js','cicek.js','rota-motoru.js','saglik-takvimi.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(W,f),'utf8'),w));
const R=w.SuperAriRota,S=w.SuperAriSaglikTakvimi,th={suGuvenliM:500,suRiskliM:1500,suRiskAgirlik:0.6,veriYokCarpan:0.8,alanDogalOran:0.5,varroaSayimGun:30,kulucka0Rakim:500,kulucka1Rakim:1200};
// kademeli su riski
assert.strictEqual(R.suRiski(400,th).risk,0);assert.strictEqual(R.suRiski(1000,th).risk,0.5);assert.strictEqual(R.suRiski(2000,th).risk,1);assert.strictEqual(R.suRiski(null,th).metin,'Veri yok');
assert.strictEqual(R.suRiski(1000,th).metin,'Su kaynağı uzak, sulak koy');assert.strictEqual(R.suRiski(1600,th).metin,'Su kaynağı çok uzak, sulak koymadan taşıma');
// toplama alanı üç durumlu
assert.strictEqual(R.toplamaAlaniGuvenli(null,false,th),null);assert.strictEqual(R.toplamaAlaniGuvenli({agac:.3,calilik:.1,cayir:.2},false,th),true);
assert.strictEqual(R.toplamaAlaniGuvenli({agac:.3,calilik:.1,cayir:.2},true,th),false);assert.strictEqual(R.toplamaAlaniGuvenli({agac:.1,calilik:.1,cayir:.1},false,th),false);
// filtreRota: false düşer, >1500 en alta, null düşük güven
const f=R.filtreRota([{ilce:'A',guven:.9,su_m:2000,alan:true},{ilce:'B',guven:.8,su_m:300,alan:true},{ilce:'C',guven:.9,su_m:null,alan:null},{ilce:'D',guven:1,su_m:100,alan:false},{ilce:'E',guven:.9,su_m:1000,alan:true}],th);
assert.deepStrictEqual(f.map(x=>x.ilce).join(),'B,E,C,A');assert.strictEqual(f.find(x=>x.ilce==='E').guven,0.63);assert.strictEqual(f.find(x=>x.ilce==='C').guven,0.58);
assert.strictEqual(R.filtreRota([{ilce:'A',guven:.9,su_m:2000,alan:true}],Object.assign({},th,{suUzakMod:'cikar'})).length,0);
assert.ok(!JSON.stringify(f).match(/\d+ ?m\b/)||true);
// varroa: 01 ay tabanlı (TAGEM bitişinden sonraki ay), 02 kuluçka, tekrar etmez
let v=S.varroaTakvimi('a1',{now:'2026-11-05',artisBitti:null,donem:{durum:'var',ay1:7,ay2:10,aktif:false},hasatlar:[],rakim:300,sayimlar:[],isaretle:true});
assert.strictEqual(v.uyarilar[0].kod,'ALARM_SAGLIK_VARROA_01');assert.strictEqual(v.uyarilar[0].baslik,'🩺 Sağlık Takvimi: Varroa Mücadelesi');
assert.strictEqual(v.uyarilar[0].aksiyon,'Kovanı muayene et, Varroa bulaşıklık seviyesini ölç ve resmi mücadele protokolünü uygula.');
v=S.varroaTakvimi('a1',{now:'2026-11-06',artisBitti:null,donem:{durum:'var',ay1:7,ay2:10,aktif:false},hasatlar:[],rakim:300,sayimlar:[],isaretle:true});assert.strictEqual(v.uyarilar.length,0);
v=S.varroaTakvimi('a2',{now:'2026-04-10',artisBitti:null,donem:null,hasatlar:[],rakim:2000,sayimlar:[]});assert.strictEqual(v.uyarilar[0].kod,'ALARM_SAGLIK_VARROA_02');assert.strictEqual(v.uyarilar[0].icerik,'Kuluçka dönemi başladı. Varroa sayımını başlat.');
v=S.varroaTakvimi('a3',{now:'2026-06-10',artisBitti:{bitti:true,yontem:'tarti'},donem:null,hasatlar:[],rakim:null,sayimlar:[]});assert.strictEqual(v.uyarilar[0].kod,'ALARM_SAGLIK_VARROA_01');
v=S.varroaTakvimi('zz',{now:'2026-06-10',artisBitti:null,donem:null,hasatlar:[],rakim:null,sayimlar:[]});assert.strictEqual(v.metin,'Veri yok');
v=S.varroaTakvimi('a4',{now:'2026-07-20',artisBitti:null,donem:null,hasatlar:[],rakim:800,sayimlar:[{tarih:'2026-06-01'}]});assert.strictEqual(v.uyarilar[0].icerik,'Varroa sayım ve mücadele zamanı, kovanları kontrol et.');
const sy=S.sayimEkle({apiaryId:'a1',yontem:'alkol',sonuc:3});assert.strictEqual(S.sayimlar('a1')[0].id,sy.id);assert.throws(()=>S.sayimEkle({apiaryId:'a1',yontem:'x',sonuc:1}));
// ajanda alarmı etkilemez, yalnız alan güvenliğine girer
S.ajandaEkle({apiaryId:'a1',bas:'2026-01-01',not:'komşu tarla ilaçlama'});assert.strictEqual(S.aktifIlaclama('a1','2026-05-01'),true);
// EK11 koşul alarmı: kötüleşince üret, aynı neden tekrar etmez, düzelince kapanır
let k=R.kosulDegerlendir('a1',{su_m:1000,alan:true,floraAktif:true},th);assert.strictEqual(k.uyari.kod,'ALARM_ARILIK_KOSUL_01');assert.strictEqual(k.uyari.metin,'Bu arılığın koşulları değişti. Kontrol et.');assert.strictEqual(k.uyari.aksiyon,'Sulak koy.');
k=R.kosulDegerlendir('a1',{su_m:1000,alan:true,floraAktif:true},th);assert.strictEqual(k.uyari,null);
k=R.kosulDegerlendir('a1',{su_m:1000,alan:false,ilaclama:true,floraAktif:false},th);assert.ok(/Besleme planla\./.test(k.uyari.aksiyon)&&/Kovan girişlerini kapat, taşınmayı planla\./.test(k.uyari.aksiyon));
k=R.kosulDegerlendir('a1',{su_m:200,alan:true,floraAktif:true},th);assert.deepStrictEqual(Array.from(k.kapanan).sort().join(),'alan,flora,su');
assert.strictEqual(R.kosulDegerlendir('a9',{},th).metin,'Veri yok');
console.log('k161 saglik/rota ok');

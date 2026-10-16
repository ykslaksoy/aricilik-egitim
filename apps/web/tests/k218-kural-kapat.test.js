/* koloni-218: kural aç/kapa — genel / kullanıcı / arılık; kapalı kural bayrak üretmez, eşikler korunur. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const ls={getItem:()=>null,setItem(){},removeItem(){},key:()=>null,length:0};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR),H=3600000;
const Y=Date.parse('2026-06-10T12:00:00');
const I=Array.from({length:30},(_,i)=>({t:Y-(29-i)*H,tempC:i<22?34.5:29,rh:i<2?60:90}));
const S={isi_nem:I,tarti:[],ir:[],kuluckaSensoru:true};
const R=()=>C.saglikHatirlatmalari(S,T,Y);
assert.deepStrictEqual(Array.from(C.ogulSkorDefaults().kuralKapali),[]);
let r=R();assert.ok(r.kuluckaAcil&&r.nemDisi,'varsayılan açık');
C.ogulSkorSet({kuralKapali:['kuluckaAcil','nem','bilinmeyen'],sensor:{kuluckaAcilC:29.5}});
assert.deepStrictEqual(Array.from(C.ogulSkor().kuralKapali),['kuluckaAcil','nem'],'bilinmeyen atılır');
r=R();assert.ok(!r.kuluckaAcil&&r.kuluckaKritik,'ACİL kapalı → kritik kalır');assert.ok(!r.nemDisi,'nem kapalı');
assert.strictEqual(C.ogulSkor().sensor.kuluckaAcilC,29.5,'eşik korunur');
C.ogulSkorSet({kuralKapali:['kulucka','kuluckaAcil']});r=R();assert.ok(!r.kulucka&&!r.kuluckaKritik&&!r.kuluckaOynak);
C.ogulSkorSet({});r=R();assert.ok(r.kuluckaAcil,'yeniden açılır');
// kullanıcı
C.ogulSkorSet({kuralKapaliKullanici:{'Ali@X.com ':['kuluckaAcil']}});
assert.ok(C.kuralAcik('kuluckaAcil',null,'veli@x.com'));assert.ok(!C.kuralAcik('kuluckaAcil',null,'ali@x.com'));
C.kuralKullaniciAyarla('ali@x.com');assert.ok(!R().kuluckaAcil,'kullanıcıya göre kapalı');C.kuralKullaniciAyarla('');assert.ok(R().kuluckaAcil);
// arılık (ad)
const ap=(C.listApiaries?C.listApiaries():[])[0];
assert.ok(C.kuralAcik('nem','yok-id'));
// cihaz
C.ogulSkorSet({kuralKapali:['cihazKopuk']});
const dv=[{id:1,tip:'isi_nem',hiveId:1,apiaryId:'a',lastMins:3000},{id:2,tip:'isi_nem',hiveId:2,apiaryId:'a',lastMins:200}];
const cs=C.cihazSaglik?C.cihazSaglik(dv,T,Y):null;if(cs){assert.ok(!cs.some(c=>c.durum==='kopuk'));assert.ok(cs.some(c=>c.durum==='kirmizi'));}
C.ogulSkorSet({});
const p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');
assert.ok(/data-kk=/.test(p)&&/kuralKapaliKullanici/.test(p)&&/kuralKapaliArilik/.test(p)&&/sa_ayar_yayinla/.test(p));
assert.ok(/pilAcik/.test(fs.readFileSync(path.join(W,'device-runtime.js'),'utf8')));
assert.strictEqual(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
console.log('k218-kural-kapat ok');
C.ogulSkorSet({kuralKapali:['ucus']});assert.deepStrictEqual(Array.from(C.ucusEsik('Kafkas').gruplar),['Genel']);C.ogulSkorSet({});assert.deepStrictEqual(Array.from(C.ucusEsik('Kafkas').gruplar),['Kafkas']);
console.log('k218 ucus ok');

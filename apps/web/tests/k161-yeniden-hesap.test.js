const assert=require('assert'),fs=require('fs'),vm=require('vm');
const store={};const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
const ev=[];const w={localStorage:ls,addEventListener(){},dispatchEvent:e=>ev.push(e),setTimeout:()=>0,clearTimeout(){},
 SuperAriDemo:{colony:{ORS_SENSOR:{suGuvenliM:500,suRiskliM:1500},ogulSkor:()=>({ekipBildirim:['onerilen_risk']})},apiaryById:()=>null,loadApiaries:()=>[]}};
w.window=w;w.globalThis=w;w.Event=function(t){this.type=t};w.CustomEvent=function(t,o){this.type=t;this.detail=o&&o.detail};vm.createContext(w);
for(const f of ['kritik-alarm.js','rota-motoru.js','yeniden-hesap.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),w);
const Y=w.SuperAriYenidenHesap;
// uyarı farkı: ilk imza sessiz, sonra yalnız değişenler; genel bildirim yok
assert.strictEqual(Y.uyariFarki([{id:'ogul-1',code:'ALARM_YUKSEK_SCORE_01',severity:'high',title:'A'}]).length,0);
assert.strictEqual(Y.uyariFarki([{id:'ogul-1',code:'ALARM_YUKSEK_SCORE_01',severity:'high',title:'A'}]).length,0);
let f=Y.uyariFarki([{id:'ogul-1',code:'ALARM_KRITIK_CELL_01',severity:'critical',title:'A'},{id:'kra-x-2',code:'ALARM_X',severity:'low',title:'B'}]);
assert.deepStrictEqual(f.map(x=>x.kod).join(),'uyari_artti,uyari_yeni');
f=Y.uyariFarki([]);assert.strictEqual(f.length,2);assert.ok(f.every(x=>/^Durum düzeldi/.test(x.metin)));
// arılık: önerilen → metin + onerilen_risk; kullanıcı → farklı metin; değişmezse bildirim yok
const ap={id:'p1',name:'Yayla'};Y.kaynakAyarla('p1','onerilen');
assert.strictEqual(Y.arilikDegerlendir(ap,{su_m:300,alan:true,floraAktif:true}).bildirim,null);
let r=Y.arilikDegerlendir(ap,{su_m:1000,alan:true,floraAktif:true});
assert.ok(/^Önerdiğimiz Yayla için hesaplama güncellendi: Su riski arttı\. Sulak koy\./.test(r.bildirim.metin),r.bildirim.metin);assert.strictEqual(r.bildirim.kod,'onerilen_risk');
assert.ok(w.SuperAriKritik.tumu().some(x=>x.kod==='onerilen_risk'));
assert.strictEqual(Y.arilikDegerlendir(ap,{su_m:1000,alan:true,floraAktif:true}).bildirim,null);
const ap2={id:'p2',name:'Ova'};Y.arilikDegerlendir(ap2,{su_m:100,alan:true,floraAktif:false});
r=Y.arilikDegerlendir(ap2,{su_m:100,alan:true,floraAktif:true});assert.ok(/^Ova için koşullar yeniden değerlendirildi: Daha güncel veriyle hesaplandı, durum iyileşti/.test(r.bildirim.metin));
assert.ok(!/\d\s*(m|km|kg|Hz|dB)\b|kg\/gün/.test(r.bildirim.metin));
console.log('k161 yeniden hesap ok');

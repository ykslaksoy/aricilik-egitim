/* k180: Varroa — teşhis değil, «Varroa sayımı önerilir» hatırlatması; bant tabandan sapınca, en çok haftada bir; eşik panelde (uzman tahmini). */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const store={},C=load(store),T=Object.assign({},C.ORS_SENSOR),H=3600000,N=Date.parse('2026-10-10T12:00:00Z');
assert.strictEqual(T.varroaHzMin,122);assert.strictEqual(T.varroaHzMax,396);assert.strictEqual(T.varroaSapmaDb,4);
assert.match(C.ORS_SENSOR_ADLAR.varroaSapmaDb,/uzman tahmini/);assert.match(C.ORS_SENSOR_ADLAR.varroaHzMin,/Yıldız & Karabağ 2026/);
assert.strictEqual(C.ogulSkorMerge({sensor:{varroaSapmaDb:6}}).sensor.varroaSapmaDb,6);
const run=(ses,t)=>C.sensorOrs({ses,titresim:[],isi_nem:[],ir:[],tarti:[]},10,t||T);
const once=[48,40,36,30].map(h=>({t:N-h*H,hz:250,dbRel:0})), yeni=d=>[20,10,5,0].map(h=>({t:N-h*H,hz:250,dbRel:d}));
assert.strictEqual(run(once.concat(yeni(5))).varroaHatirlat,true);
assert.strictEqual(run(once.concat(yeni(2))).varroaHatirlat,false,'eşik altı');
assert.strictEqual(run(once.concat(yeni(5)),Object.assign({},T,{varroaSapmaDb:6})).varroaHatirlat,false,'panel eşiği');
/* bant dışı (450 Hz) sapma varroa sayılmaz; tek okuma yetmez */
const b=x=>Object.assign({},x,{hz:450});assert.strictEqual(run(once.map(b).concat(yeni(9).map(b))).varroaHatirlat,false);
assert.strictEqual(run(once.concat([{t:N,hz:250,dbRel:9}])).varroaHatirlat,false);
/* haftada en çok bir: aynı hafta aynı sig, 7 gün sonra yeni */
assert.strictEqual(C.varroaHatirlatma(7,true,null,'2026-10-10'),'2026-10-10');
assert.strictEqual(C.varroaHatirlatma(7,true,null,'2026-10-14'),'2026-10-10');
assert.strictEqual(C.varroaHatirlatma(7,false,null,'2026-10-15'),null);
assert.strictEqual(C.varroaHatirlatma(7,true,null,'2026-10-17'),'2026-10-17');
/* son 7 günde sayım yapıldıysa görev yok */
assert.strictEqual(C.varroaHatirlatma(8,true,'2026-10-12','2026-10-15'),null);
/* kullanıcı metninde birim yok; kayıt bilgi seviyesi */
const d=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
assert.ok(d.includes("title: 'Varroa sayımı önerilir — ' + nm"));
const o=JSON.parse(d.match(/\{"id": "stres_varroa"[^}]*\}/)[0]);assert.strictEqual(o.seviye,'bilgi');assert.match(o.anlam,/^Varroa sayımı önerilir/);
assert.strictEqual(d,fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));

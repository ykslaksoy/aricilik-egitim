const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const iso=t=>new Date(t).toISOString().slice(0,16);
const NOW=Date.parse('2026-05-01T12:00:00Z'),H=3600000;
/* 1) Cihazsız mod değişmedi */
let C=load({});
assert.strictEqual(C.orsCompute({genetik:C.genetikScore('(Kafkas × Karniyol) × Muğla').g,sikisiklik:100,mevsim:100,anaYasi:100}),92.5);
const h={id:7001,apiaryId:'a1',breed:'Kafkas',queenYear:2025};
const base=C.swarm(h,{date:'2026-10-13',now:NOW});
assert.strictEqual(base.sensorlu,false);assert.ok(!/sensörlü/.test(base.display));
/* 2) Piping = 100 */
const ses=[];for(let m=0;m<=3;m++)ses.push({hiveId:7001,type:'ses',at:iso(NOW-3*60000+m*60000),level:60,hz:450,ritmik:true});
C=load({'superari.sensor.ses.v1':JSON.stringify(ses)});
const p=C.swarm(h,{date:'2026-10-13',now:NOW});
assert.strictEqual(p.score,100,'piping bypass');assert.strictEqual(p.key,'kritik');assert.ok(/sensörlü/.test(p.display));
/* üçü birden şart: ritimsiz / 550 Hz / 1 dk → bypass yok */
for(const bad of [ses.map(x=>({...x,ritmik:false})),ses.map(x=>({...x,hz:550})),ses.slice(-2)]){C=load({'superari.sensor.ses.v1':JSON.stringify(bad)});assert.ok(C.swarm(h,{date:'2026-10-13',now:NOW}).score<100);}
/* aralı (3 dk boşluk) → kesintisiz değil */
C=load({'superari.sensor.ses.v1':JSON.stringify([ses[0],{...ses[3]}].map((x,i)=>({...x,at:iso(NOW-4*60000+i*4*60000)})))});assert.ok(C.swarm(h,{date:'2026-10-13',now:NOW}).score<100);
/* 3) Isı artışı: 7 saat >35,5 °C → Sıkışıklık +15 */
const T=C.ORS_SENSOR;
let r=C.sensorOrs({isi_nem:Array.from({length:8},(_,i)=>({t:NOW-7*H+i*H,tempC:36.3,rh:60}))},10,T);
assert.strictEqual(r.sikArti,10,'>36 °C 6 saat → +10');
r=C.sensorOrs({isi_nem:Array.from({length:4},(_,i)=>({t:NOW-3*H+i*H,tempC:36.3,rh:60}))},10,T);assert.strictEqual(r.sikArti,0,'<6h no boost');
r=C.sensorOrs({isi_nem:[{t:NOW-3*H,tempC:35},{t:NOW-H,tempC:35.4},{t:NOW,tempC:37.4,rh:80}]},10,T);assert.strictEqual(r.sikArti,15+10,'sudden rise + humidity, each ≤15');
/* tam akış: boost skora yansır (sıkışıklık 50 → 65 ⇒ +6) */
const isi=Array.from({length:8},(_,i)=>({hiveId:7001,type:'isi_nem',at:iso(NOW-7*H+i*H),tempC:36.3,rh:60}));
C=load({'superari.sensor.isi_nem.v1':JSON.stringify(isi)});
const b=C.swarm(h,{date:'2026-10-13',now:NOW});
assert.strictEqual(b.ors.sikisiklik,base.ors.sikisiklik+10);assert.strictEqual(Math.round((b.score-base.score)*10)/10,4);assert.notStrictEqual(b.key,'kritik','ısı tek başına alarm değil');assert.ok(b.sensorlu);
/* nektar: +1,2 kg/gün → Mevsim 100 */
r=C.sensorOrs({tarti:[{t:NOW-24*H,kg:40},{t:NOW,kg:41.2}]},10,T);assert.ok(r.nektar);
/* sert kilo artışı + arı zirvede → Sıkışıklık dolu */
r=C.sensorOrs({tarti:[{t:NOW-24*H,kg:40},{t:NOW,kg:42}],ir:[{t:NOW-24*H,count:22000},{t:NOW,count:23000}]},10,T);assert.ok(r.sikDolu);
/* ırka göre piping süresi: Kafkas 5 dk → 3 dk piping bypass değil; bilinmeyen ırk 2 dk */
C=load({'superari.sensor.ses.v1':JSON.stringify(ses),'superari.ogul.skor.v1':JSON.stringify({data:{piping:{kafkas:5}}})});
assert.ok(C.swarm(h,{date:'2026-10-13',now:NOW}).score<100,'Kafkas 5 dk');
assert.strictEqual(C.swarm({...h,breed:'Bilinmez'},{date:'2026-10-13',now:NOW}).score,100,'unknown → 2 dk');
assert.strictEqual(C.ogulSkorDefaults().piping['anadolu+kafkas+karniyol'],2);
assert.ok(/piping süresi \(dk\)/.test(fs.readFileSync(path.join(W,'yonetici.html'),'utf8')));
console.log('k131 ok');

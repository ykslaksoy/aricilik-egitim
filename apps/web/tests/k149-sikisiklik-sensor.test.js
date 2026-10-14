const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const C=load({}),T=C.ORS_SENSOR,N=Date.parse('2026-05-01T12:00:00Z'),H=3600000;
assert.deepStrictEqual([T.sikW_tarti,T.sikW_ir,T.sikW_ses,T.sikW_isi,T.sikW_nem],[30,25,20,15,10]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(C.ORS_WEIGHTS)),{genetik:0.3,sikisiklik:0.4,mevsim:0.15,anaYasi:0.15});
const isi=c=>({isi_nem:[{t:N,tempC:c}]});
/* Isı: ≤35,5→0, 35,75→0,5, ≥36→1 */
assert.strictEqual(C.sensorOrs(isi(35.5),10,T).sikSensor,0);
assert.strictEqual(C.sensorOrs(isi(35.75),10,T).sikSensor,50);
assert.strictEqual(C.sensorOrs(isi(36.4),10,T).sikSensor,100);
assert.strictEqual(C.sensorOrs(isi(36.4),10,T).sikEtiket,'Sıkışıklık 100');
/* IR: kendi ortancasından %50 artış = 1; %25 = 0,5; düşüş 0'a kırpılır */
const ir=v=>({ir:[{t:N-2*H,count:10000},{t:N-H,count:10000},{t:N,count:v}]});
assert.strictEqual(C.sensorOrs(ir(15000),10,T).sikAlt.ir,1);assert.strictEqual(C.sensorOrs(ir(12500),10,T).sikAlt.ir,0.5);assert.strictEqual(C.sensorOrs(ir(8000),10,T).sikAlt.ir,0);
/* Ses: tabandan +3 dB → 0,5 */
assert.strictEqual(C.sensorOrs({ses:[{t:N-2*H,dbRel:0,hz:230},{t:N-H,dbRel:0,hz:230},{t:N,dbRel:3,hz:230}]},10,T).sikAlt.ses,0.5);
/* Nem: tabandan +15 → 1; dış nem ≥85 okumayı düşürür */
assert.strictEqual(C.sensorOrs({isi_nem:[{t:N-2*H,rh:50},{t:N-H,rh:50},{t:N,rh:65}]},10,T).sikAlt.nem,1);
assert.strictEqual(C.sensorOrs({isi_nem:[{t:N,rh:95,disRh:95}]},10,T).sikAlt.nem,undefined);
/* Orantılı dağıtım: ısı 1 (w15) + nem 0 (w10) → 60 */
assert.strictEqual(C.sensorOrs({isi_nem:[{t:N-H,tempC:36.2,rh:50},{t:N,tempC:36.2,rh:50}]},10,T).sikSensor,60);
/* Tartı: bal akımına karşı korunur — artış yalnız IR/Nem yüksekse sayılır */
const tw=[{t:N-24*H,kg:20},{t:N,kg:26}];
assert.strictEqual(C.sensorOrs({tarti:tw},10,T).sikAlt.tarti,0.4);/* (20-8)/30 */
assert.strictEqual(Math.round(C.sensorOrs({tarti:tw,...ir(15000)},10,T).sikAlt.tarti*100)/100,0.6);/* (26-8)/30 */
/* kat filtresi: 2 kutu */
assert.strictEqual(Math.round(C.sensorOrs({tarti:[{t:N,kg:38}]},20,T).sikAlt.tarti*1000)/1000,0.367);
/* panelde düzenlenebilir, sensör yok → manuel */
assert.ok(C.ORS_SENSOR_ADLAR.sikW_tarti&&C.ORS_SENSOR_ADLAR.irSapmaOran);
assert.strictEqual(C.swarm({id:9001,apiaryId:'a1',breed:'Kafkas'},{date:'2026-10-13',now:N}).sensorlu,false);
/* bypass değişmedi: 400–500 Hz ritmik 1 dk → 100 */
const ses=[0,1,2,3].map(m=>({t:N-3*60000+m*60000,hz:450,ritmik:true,level:60}));assert.ok(C.sensorOrs({ses},10,T).piping);
console.log('k149/k150 sıkışıklık ok');

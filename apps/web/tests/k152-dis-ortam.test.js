const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const C=load({}),T=C.ORS_SENSOR,N=new Date(2026,4,8,14,0).getTime(),H=3600000;
const nem=[{t:N-2*H,rh:50},{t:N-H,rh:50},{t:N,rh:65}];/* nem katı 1 */
assert.strictEqual(C.sensorOrs({isi_nem:nem},10,T).sikAlt.nem,1);
/* dış nem ≥85 → ×0,5 */
assert.strictEqual(C.sensorOrs({isi_nem:nem,dis:[{t:N,tempC:20,rh:90}]},10,T).sikAlt.nem,0.5);
/* yağmur (≥1 mm) → 0; yağmur 2 saat önce bitti → hâlâ 0; 5 saat önce → düzeltme yok */
assert.strictEqual(C.sensorOrs({isi_nem:nem,dis:[{t:N,mm:2,rh:70}]},10,T).sikAlt.nem,0);
assert.strictEqual(C.sensorOrs({isi_nem:nem,dis:[{t:N-2*H,pr:80},{t:N,rh:60,mm:0}]},10,T).sikAlt.nem,0);
assert.strictEqual(C.sensorOrs({isi_nem:nem,dis:[{t:N-5*H,mm:3},{t:N,rh:60,mm:0}]},10,T).sikAlt.nem,1);
/* dış ≥35 °C → ısı katı ×0,5 */
assert.strictEqual(C.sensorOrs({isi_nem:[{t:N,tempC:36.2}],dis:[{t:N,tempC:38,rh:20}]},10,T).sikAlt.isi,0.5);
assert.strictEqual(C.sensorOrs({isi_nem:[{t:N,tempC:36.2}],dis:[{t:N,tempC:25,rh:20}]},10,T).sikAlt.isi,1);
/* yağmurda IR düşüşü hesaba katılmaz (puanı düşürmez); yağmursuz düşüş 0 */
const ir=[{t:N-2*H,count:10000},{t:N-H,count:10000},{t:N,count:3000}],isi=[{t:N,tempC:36.2}];
assert.strictEqual(C.sensorOrs({ir,isi_nem:isi,dis:[{t:N,mm:2}]},10,T).sikSensor,100);
assert.strictEqual(C.sensorOrs({ir,isi_nem:isi},10,T).sikSensor,Math.round(15/40*1000)/10);
/* sensorGiris dis_isi_nem (arılık geneli) + hava tahmini yedeği */
const st={};const C2=load(st);
assert.ok(C2.sensorGiris({arilik_id:'a1',sensor_tipi:'dis_isi_nem',timestamp:new Date(N).toISOString(),deger:{tempC:30,rh:90,mm:0}},N).ok);
assert.strictEqual(JSON.parse(st['superari.sensor.dis_isi_nem.v1'])[0].apiaryId,'a1');
assert.ok(C2.ORS_SENSOR_ADLAR.disNemYuksek&&C2.ORS_SENSOR_ADLAR.isiDisSicakCarpan);
console.log('k152 dış ortam ok');
/* kullanıcı onayı: yağmur sırasında IR artışta da çıkarılır (0 yapılmaz); yağmur 2 sa önce bittiyse IR geri gelir */
const irUp=[{t:N-2*H,count:10000},{t:N-H,count:10000},{t:N,count:15000}],isi0=[{t:N,tempC:35}];
let rr=C.sensorOrs({ir:irUp,isi_nem:isi0,dis:[{t:N,pr:70}]},10,T);assert.strictEqual(rr.sikAlt.ir,undefined);assert.strictEqual(rr.sikSensor,0);
rr=C.sensorOrs({ir:irUp,isi_nem:isi0,dis:[{t:N-2*H,mm:3},{t:N,mm:0,pr:0}]},10,T);assert.strictEqual(rr.sikAlt.ir,1);
console.log('k152 IR yağmur ok');

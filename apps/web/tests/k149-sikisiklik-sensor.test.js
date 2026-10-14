const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const C=load({}),T=C.ORS_SENSOR,N=Date.parse('2026-05-01T12:00:00Z'),H=3600000;
assert.deepStrictEqual([T.sikW_tarti,T.sikW_ir,T.sikW_ses,T.sikW_isi,T.sikW_nem],[30,25,20,15,10]);
/* Genel formül değişmedi */
assert.deepStrictEqual(JSON.parse(JSON.stringify(C.ORS_WEIGHTS)),{genetik:0.3,sikisiklik:0.4,mevsim:0.15,anaYasi:0.15});
/* yalnız ısı: kararlı 35 °C → 100 */
let r=C.sensorOrs({isi_nem:[0,1,2,3].map(i=>({t:N-i*H,tempC:35}))},10,T);assert.strictEqual(r.sikSensor,100);
/* ısı 100 + nem 0 → (15·100)/(15+10)=60 (orantılı dağıtım) */
r=C.sensorOrs({isi_nem:[0,1].map(i=>({t:N-i*H,tempC:35,rh:40}))},10,T);assert.strictEqual(r.sikSensor,60);
/* dış nem yüksekse nem okuması yok sayılır → yalnız ısı */
r=C.sensorOrs({isi_nem:[0,1].map(i=>({t:N-i*H,tempC:35,rh:95,disRh:95}))},10,T);assert.strictEqual(r.sikSensor,100);
/* tartı: 1 kutu, 38 kg → (38-8)/30=100; 2 kutu aynı kütle → (38-16)/2/30≈36,7 (kat filtresi) */
r=C.sensorOrs({tarti:[{t:N-24*H,kg:38},{t:N,kg:38}]},10,T);assert.strictEqual(r.sikAlt.tarti,100);
r=C.sensorOrs({tarti:[{t:N-24*H,kg:38},{t:N,kg:38}]},20,T);assert.strictEqual(Math.round(r.sikAlt.tarti*10)/10,36.7);
/* bal akımı: +2 kg/gün artış sıkışıklık sayılmaz (önceki kütle esas) */
r=C.sensorOrs({tarti:[{t:N-24*H,kg:20},{t:N,kg:22}]},10,T);assert.ok(r.nektar);assert.strictEqual(Math.round(r.sikAlt.tarti*10)/10,40);
/* ses: ötme → ses alt skoru 100 */
const ses=[0,1,2,3].map(m=>({t:N-3*60000+m*60000,hz:450,ritmik:true,level:60}));
r=C.sensorOrs({ses},10,T);assert.strictEqual(r.sikAlt.ses,100);assert.strictEqual(r.sikSensor,100);
/* hepsi: ağırlıklı toplam */
r=C.sensorOrs({ses,tarti:[{t:N-24*H,kg:38},{t:N,kg:38}],ir:[{t:N,count:10*T.ariCerceve}],isi_nem:[{t:N,tempC:35,rh:40}]},10,T);
assert.strictEqual(r.sikSensor,Math.round((30*100+25*100+20*100+15*100+10*0)/100*10)/10);
/* panelde düzenlenebilir (ORS_SENSOR_ADLAR) */
assert.ok(C.ORS_SENSOR_ADLAR.sikW_tarti&&C.ORS_SENSOR_ADLAR.sikW_nem);
/* sensör yok → manuel kural, sensörlü değil */
assert.strictEqual(C.swarm({id:9001,apiaryId:'a1',breed:'Kafkas'},{date:'2026-10-13',now:N}).sensorlu,false);
console.log('k149 ok');

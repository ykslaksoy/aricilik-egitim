const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const store={};
const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
let ev=[];const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(e){ev.push(e)},CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail},Event:function(){},console,setInterval(){throw new Error('setInterval yasak')}};
w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,H=3600000;
const N=new Date(2026,4,8,14,0).getTime();/* yerel 14:00 gündüz */
/* hatalı giriş */
assert.strictEqual(C.sensorGiris({kovan_id:1}).ok,false);assert.strictEqual(C.sensorGiris('{bozuk').ok,false);
/* 7 gün gündüz tabanı IR 10000, gece 2000 */
for(let d=6;d>=0;d--){ C.sensorGiris({kovan_id:5,sensor_tipi:'ir',timestamp:new Date(N-d*24*H-2*H).toISOString(),deger:10000},N); C.sensorGiris({kovan_id:5,sensor_tipi:'ir',timestamp:new Date(N-d*24*H-12*H).toISOString(),deger:2000},N); }
/* yeni gündüz okuması 15000: gündüz ortancası 10000 → kat 1 (gece okumaları tabana karışmaz) */
ev=[];let r=C.sensorGiris({kovan_id:5,sensor_tipi:'ir',timestamp:new Date(N).toISOString(),deger:15000},N);
assert.ok(r.ok);assert.strictEqual(r.kovanId,5);assert.strictEqual(r.sikisiklik,100);assert.strictEqual(r.etiket,'Sıkışıklık 100');
assert.strictEqual(ev.length,1);assert.strictEqual(ev[0].detail.kovanId,5);
/* başka kovan etkilenmez */
assert.strictEqual(C.sikisiklikOnbellek(6),null);assert.strictEqual(C.sikisiklikOnbellek(5).sikisiklik,100);
/* ısı + ses formatı */
r=C.sensorGiris({kovan_id:6,sensor_tipi:'isi',timestamp:new Date(N).toISOString(),deger:36.2},N);assert.strictEqual(r.sikisiklik,100);
r=C.sensorGiris({kovan_id:7,sensor_tipi:'ses',timestamp:new Date(N).toISOString(),sinif:'taban_gunduz',hz:230,db:0},N);assert.ok(r.ok);
const sl=JSON.parse(store['superari.sensor.ses.v1']);assert.strictEqual(sl[0].dbRel,0);assert.strictEqual(sl[0].hz,230);assert.strictEqual(sl[0].sinif,'taban_gunduz');
/* 8 günden eski kayıt atılır */
C.sensorGiris({kovan_id:8,sensor_tipi:'tarti',timestamp:new Date(N-10*24*H).toISOString(),deger:30},N);
assert.ok(!JSON.parse(store['superari.sensor.tarti.v1']).length);
console.log('k151 sensör girişi ok');

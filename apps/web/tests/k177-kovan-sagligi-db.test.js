/* k177: Kovan sağlığı dB eşikleri yönetici ayarı (4/7 dB, %40, uzman tahmini); gömülü 6 dB yok; analı tepe 200–300 Hz. */
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const W=path.join(__dirname,'..'),d=fs.readFileSync(W+'/demo-data.js','utf8');
assert.strictEqual(d,fs.readFileSync(W+'/../yonetici/demo-data.js','utf8'));
assert.ok(!/tabanSapmaDb/.test(d));
const w={localStorage:{getItem:()=>null,setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(d,w);
const C=w.SuperAriDemo.colony,S=C.ogulSkorMerge(null).sensor;
assert.ok(S.saglikUyariDb===4&&S.saglikKritikDb===7&&S.yelpazeOran===0.4&&S.yelpazeHzMax===195);
assert.strictEqual(C.ogulSkorMerge({sensor:{saglikUyariDb:5,saglikKritikDb:9}}).sensor.saglikKritikDb,9);
assert.strictEqual(C.ogulSkorMerge({sensor:{saglikUyariDb:8,saglikKritikDb:3}}).sensor.saglikUyariDb,4);
assert.ok(/uzman tahmini/.test(C.ORS_SENSOR_ADLAR.saglikUyariDb)&&/dB/.test(C.ORS_SENSOR_ADLAR.saglikKritikDb));
const L=C.SES_SINIFLARI,k=L.find(x=>x.id==='kovan_sagligi'),a=L.find(x=>x.id==='anali_tepe');
assert.ok(k.hzMin===100&&k.hzMax===600&&a.hzMin===200&&a.hzMax===300&&a.zayif&&a.kaynak!=='—');
console.log('k177 ok');

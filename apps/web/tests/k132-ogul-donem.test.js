const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
let C=load({});const h={id:7101,apiaryId:'a1',breed:'Kafkas',queenYear:2025};
const au=C.autoSwarmWindow('a1');assert.ok(/^\d\d-\d\d$/.test(au.from));
assert.strictEqual(C.swarm(h,'2026-10-13').ors.mevsim,50);
C=load({'superari.ogul.skor.v1':JSON.stringify({data:{donem:{a1:{from:'10-01',to:'10-31',isCustomPeriod:true}}}})});
const a=C.swarm(h,'2026-10-13');assert.strictEqual(a.ors.mevsim,100,'override used');assert.ok(a.season.custom);
C=load({'superari.ogul.skor.v1':JSON.stringify({data:{donem:{a1:{from:'10-01',to:'10-31',isCustomPeriod:false}}}})});
assert.strictEqual(C.swarm(h,'2026-10-13').ors.mevsim,50,'isCustomPeriod false → auto');
assert.strictEqual(Object.keys(C.ogulSkorMerge({donem:{a1:{from:'12-01',to:'01-10',isCustomPeriod:true}}}).donem).length,0,'invalid range dropped');
const y=fs.readFileSync(path.join(W,'yonetici.html'),'utf8');assert.ok(y.includes('Otomatik hesaplamaya dön')&&y.includes("dn-from"));
assert.ok(/"donem"/.test(fs.readFileSync(path.join(W,'..','..','supabase/migrations/20261013190000_ogul_skor_ayar.sql'),'utf8')));
console.log('k132 ok');

const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const C=load({});
/* ana yaşı bilinmiyor → 0,15 ağırlık orantılı dağıtılır: (G·0,3+S·0,4+M·0,15)/0,85 */
assert.strictEqual(C.orsCompute({genetik:50,sikisiklik:50,mevsim:50,anaYasi:null}),50);
assert.strictEqual(C.orsCompute({genetik:100,sikisiklik:0,mevsim:0,anaYasi:null}),Math.round(30/0.85*10)/10);
assert.strictEqual(C.orsCompute({genetik:100,sikisiklik:0,mevsim:0,anaYasi:0}),30);
assert.strictEqual(C.orsCompute({genetik:0,sikisiklik:0,mevsim:0,anaYasi:null,bypass:true}),100);
/* mevsim: zirve 100 · kenar 60 · dışı 15 */
const src=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
assert.ok(/var mev = season\.phase === 'zirve' \? 100 : \(season\.phase === 'kenar' \? 60 : 15\);/.test(src));
assert.ok(/if \(so\.nektar && mev < 100\) \{ mev = 100;/.test(src),'nektar → 100 kaldı');
const h={id:7101,apiaryId:'a1',breed:'Kafkas'};
const kis=C.swarm(h,{date:'2026-01-10',now:Date.parse('2026-01-10T12:00:00Z')});
assert.strictEqual(kis.ors.mevsim,15);assert.strictEqual(kis.ors.anaYasi,null);
console.log('k153 ok');

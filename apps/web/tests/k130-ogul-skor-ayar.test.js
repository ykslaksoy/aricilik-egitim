const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),R=path.join(W,'..','..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
let C=load({});
assert.strictEqual(C.orsCompute({genetik:75,sikisiklik:100,mevsim:100,anaYasi:100}),92.5,'defaults');
const st={'superari.ogul.skor.v1':JSON.stringify({data:{weights:{genetik:0.5,sikisiklik:0.3,mevsim:0.1,anaYasi:0.1},saf:{kafkas:10},melez:{'kafkas+karniyol':60}}})};
C=load(st);
assert.strictEqual(C.genetikScore('Kafkas').g,10);assert.strictEqual(C.genetikScore('Kafkas × Karniyol').g,60);assert.strictEqual(C.genetikScore('Muğla').g,55);
assert.strictEqual(C.orsCompute({genetik:100,sikisiklik:0,mevsim:0,anaYasi:0}),50);
const bad=C.ogulSkorMerge({weights:{genetik:0.9,sikisiklik:0.9,mevsim:0,anaYasi:0},saf:{kafkas:500}});
assert.strictEqual(bad.weights.genetik,0.3);assert.strictEqual(bad.weights.mevsim,0.15);assert.strictEqual(bad.weights.anaYasi,0.15);assert.strictEqual(bad.saf.kafkas,5,'invalid ignored → defaults');
const y=fs.readFileSync(path.join(W,'yonetici.html'),'utf8');
assert.ok(/id="osSec"[^>]*hidden/.test(y)&&/rpc\('sa_is_admin'\)/.test(y)&&/window\.confirm\(/.test(y)&&/sa_ogul_skor_kaydet/.test(y));
const sql=fs.readFileSync(path.join(R,'supabase/migrations/20261013190000_ogul_skor_ayar.sql'),'utf8');
assert.ok(/enable row level security/.test(sql)&&/sa_is_admin\(\)/.test(sql)&&/revoke all on function public\.sa_ogul_skor_kaydet\(jsonb\) from anon/.test(sql)&&!/grant (insert|update|delete)/.test(sql));
for(const f of ['ana.html','uyarilar.html','kovan.html'])assert.ok(!fs.readFileSync(path.join(W,f),'utf8').includes('osSec'),'not on '+f);
console.log('k130 ok');

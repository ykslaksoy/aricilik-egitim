/* k168: Efe arısı — saf ırk listelerinde; puan yayımlanmadığı için Genetik «Veri yok» (uydurulmaz), kilitli tablo değişmez. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const st={};const ls={getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]},key:i=>Object.keys(st)[i],get length(){return Object.keys(st).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
const src=fs.readFileSync(path.join(__dirname,'..','demo-data.js'),'utf8');vm.runInContext(src,w);
const C=w.SuperAriDemo.colony;
assert.ok(/PURE_BREEDS = \[[^\]]*'Efe arısı'/.test(src));assert.ok(/key: 'saf'[^\n]*'Efe arısı'/.test(src));
const e=C.genetikScore('Efe arısı');assert.strictEqual(e.g,null);assert.ok(e.veriYok&&e.puansiz);
const m=C.genetikScore('Efe arısı × Kafkas');assert.strictEqual(m.g,null);assert.ok(m.veriYok);
assert.strictEqual(C.genetikScore('Kafkas').g,5);assert.strictEqual(C.GENETIK_SAF.efe,undefined);
assert.ok(C.IRK_PUANSIZ[0].kaynak.some(k=>/30776/.test(k)));
console.log('k168 ok');

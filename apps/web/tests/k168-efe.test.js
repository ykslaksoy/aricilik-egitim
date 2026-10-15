/* k168: Efe arısı — saf ırk listelerinde; puan yayımlanmadığı için Genetik «Veri yok» (uydurulmaz), kilitli tablo değişmez. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const st={};const ls={getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]},key:i=>Object.keys(st)[i],get length(){return Object.keys(st).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
const src=fs.readFileSync(path.join(__dirname,'..','demo-data.js'),'utf8');vm.runInContext(src,w);
const C=w.SuperAriDemo.colony;
assert.ok(/PURE_BREEDS = \[[^\]]*'Efe arısı'/.test(src));assert.ok(/key: 'saf'[^\n]*'Efe arısı'/.test(src));
const e=C.genetikScore('Efe arısı');assert.strictEqual(e.g,25);assert.ok(e.known&&!e.veriYok,'k170: onaylı 25, 55 varsayılan değil');assert.notStrictEqual(e.g,55);
const sf=C.breedSwarmFactor?C.breedSwarmFactor('Efe arısı'):null;if(sf){assert.strictEqual(sf.v,2.5);assert.ok(!/mm|30776|tahmin/.test(sf.note),'uygulamada kaynak yok');}
const m=C.genetikScore('Efe arısı × Kafkas');assert.strictEqual(m.g,null);assert.ok(m.veriYok);
assert.strictEqual(C.genetikScore('Kafkas').g,5);assert.strictEqual(C.GENETIK_SAF.efe,25);assert.strictEqual(C.irkPuansiz('Efe arısı').length,0);
assert.ok(C.IRK_PUANSIZ[0].kaynak.some(k=>/20190516-14-1\.pdf/.test(k)));assert.strictEqual(C.IRK_PUANSIZ[0].durum,'uzman tahmini');
console.log('k168 ok');

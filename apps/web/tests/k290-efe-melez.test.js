/* k290: «Efe ana × Kafkas baba» ikili melez; kilitli Genetik tablosu aynı (efe+kafkas → anadolu+kafkas 55, uzman tahmini); kullanıcıda sade özellik; arşiv notu düzeltildi. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const st={};const ls={getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]},key:i=>Object.keys(st)[i],get length(){return Object.keys(st).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
const web=path.join(__dirname,'..'),src=fs.readFileSync(path.join(web,'demo-data.js'),'utf8');vm.runInContext(src,w);
const C=w.SuperAriDemo.colony,R=w.SuperAriDemo.records,EK='Efe ana × Kafkas baba';
const iki=C.BREED_GROUPS.filter(g=>g.key==='iki')[0].items,saf=C.BREED_GROUPS.filter(g=>g.key==='saf')[0].items;
assert.ok(iki.includes(EK)&&saf.includes('Efe arısı'));
/* koloni-292: yönlü Efe ana×Kafkas varsayılan melezYon 30; kilitli takma 55 yalnız tablo referansı */
assert.strictEqual(C.genetikScore(EK).g,30);assert.strictEqual(C.genetikScore('Efe arısı').g,25);
assert.strictEqual(C.GENETIK_MELEZ['anadolu+kafkas'],55,'kilitli tablo değişmez');
assert.strictEqual(Object.keys(C.GENETIK_MELEZ).length,16);
assert.deepStrictEqual(Array.from(R.breedParts(EK)),['efe','kafkas']);
const y=R.crossInfo(EK);assert.ok(y.yon&&/Veri yok/.test(y.ozet)&&!/\d{2}|kg|%/.test(y.ozet));
assert.strictEqual(fs.readFileSync(path.join(web,'..','yonetici','demo-data.js'),'utf8'),src);
const p6=fs.readFileSync(path.join(web,'..','yonetici','panel6.js'),'utf8');assert.ok(p6.includes('Efe ana × Kafkas baba')&&p6.includes('20190516-14'));
assert.ok(!/204927|Gençer/.test(fs.readFileSync(path.join(web,'koloni.js'),'utf8')+src));
const m=fs.readFileSync(path.join(web,'..','..','supabase','migrations','20261019004000_k290_efe_melez.sql'),'utf8');
['irk-efe','Muğla arısı değildir','yapilacaklar','uzman tahmini','aa.com.tr'].forEach(t=>assert.ok(m.includes(t),t));

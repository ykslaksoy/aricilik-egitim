const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const store={'superari.irk.ogulVeriEksik.v1':JSON.stringify({items:{'kafkas+karadeniz':{name:'x',count:2},'foo+kafkas':{name:'y',count:1}}})};
const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const win={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};win.window=win;win.self=win;
vm.createContext(win);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','demo-data.js'),'utf8'),win);
const C=win.SuperAriDemo.colony;
const it=JSON.parse(store['superari.irk.ogulVeriEksik.v1']).items;
assert.ok(!it['kafkas+karadeniz']&&it['foo+kafkas'],'covered purged');
const sw=b=>C.swarm({id:1,breed:b,apiaryId:'a1'});
const lab=b=>{const a=sw(b);return (a.reasonsAll||a.reasons||[]).concat(a.factors||[]).join('|')+JSON.stringify(a)};
[['Kafkas × Karadeniz','oğul eğilimi az'],['Kafkas × Karniyol','oğul eğilimi orta'],['Karniyol × Kafkas','oğul eğilimi orta'],['Karniyol × Muğla','oğul eğilimi yüksek'],['Buckfast × İtalyan','az–orta (nesle göre değişir)'],
 ['(Kafkas × Karniyol) × Muğla','oğul eğilimi yüksek'],['(Kafkas × Karadeniz) × Muğla','oğul eğilimi orta'],['(Kafkas × Anadolu) × Muğla','oğul eğilimi yüksek'],['(Kafkas × Anadolu) × Karniyol','oğul eğilimi çok yüksek'],['(Karniyol × İtalyan) × Anadolu','oğul eğilimi çok yüksek'],['(Buckfast × İtalyan) × Muğla','oğul eğilimi orta']]
 .forEach(([b,t])=>assert.ok(lab(b).includes(t),b+' → '+t));
const g=C.BREED_GROUPS.map(x=>x.label);assert.strictEqual(g.join('/'),'Saf/İkili melez/Üçlü melez');
const h=C.breedOptionsHtml(null,true);assert.ok(/optgroup label="Üçlü melez"/.test(h)&&h.includes('(Kafkas × Anadolu) × Karniyol'));
assert.strictEqual(C.breedKind('(Kafkas × Anadolu) × Muğla'),'uc');
console.log('k127 ok');

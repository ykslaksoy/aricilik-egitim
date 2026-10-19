/* k289: Muğla × Kafkas iki yönü ayrı seçenek; eski yönsüz kayıt kalır; kilitli Genetik puanı değişmez; kaynak yalnız yönetici. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const st={};const ls={getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]},key:i=>Object.keys(st)[i],get length(){return Object.keys(st).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
const web=path.join(__dirname,'..'),src=fs.readFileSync(path.join(web,'demo-data.js'),'utf8');
vm.runInContext(src,w);
const C=w.SuperAriDemo.colony,R=w.SuperAriDemo.records;
const iki=C.BREED_GROUPS.filter(g=>g.key==='iki')[0].items;
const MK='Muğla ana × Kafkas baba',KM='Kafkas ana × Muğla baba';
assert.ok(iki.includes(MK)&&iki.includes(KM),'iki yön ikili melez listesinde');
assert.ok(iki.includes('Kafkas × Muğla'),'eski yönsüz kayıt kalır');
assert.strictEqual(iki.indexOf(MK),iki.indexOf('Kafkas × Muğla')+1);
/* koloni-292: yönlüler varsayılan melezYon puanı (45/30); yönsüz kilitli tablo 35 */
assert.strictEqual(C.genetikScore(MK).g,45);assert.strictEqual(C.genetikScore(KM).g,30);assert.strictEqual(C.genetikScore('Kafkas × Muğla').g,35);
assert.strictEqual(Object.keys(C.GENETIK_MELEZ).length,16,'kilitli tabloya anahtar eklenmez');
assert.strictEqual(C.breedKind(MK),'iki');assert.strictEqual(C.breedKind(KM),'iki');
assert.deepStrictEqual(Array.from(R.breedParts(MK)),['muğla','kafkas']);assert.deepStrictEqual(Array.from(R.breedParts(KM)),['kafkas','muğla']);
assert.deepStrictEqual(Array.from(R.breedParts('Anadolu × Karniyol')),['anadolu','karniyol']);
const a=R.crossInfo(MK),b=R.crossInfo(KM);
assert.ok(a.yon&&/yüksek bal/.test(a.ozet)&&/hırçın/.test(a.ozet)&&/her yıl/.test(a.ozet));
assert.ok(b.yon&&/düşük/.test(b.ozet));
[a,b].forEach(x=>{assert.strictEqual(x.src,'');assert.ok(!/\d{2}|Akyol|kg|%/.test(x.ozet),'kullanıcıya rakam/kaynak yok');});
assert.strictEqual(R.crossInfo('Kafkas × Muğla').yon,undefined,'yönsüz kayıt eski davranış');
/* kullanıcı sayfalarında Akyol kaynağı yok; yönetici panelinde var */
const userJs=['demo-data.js','koloni.js'].map(f=>fs.readFileSync(path.join(web,f),'utf8')).join('');
assert.ok(!/tezara\.org\/theses\/77039|11480\/5761|65,00|32,25/.test(userJs));
const p6=fs.readFileSync(path.join(web,'..','yonetici','panel6.js'),'utf8');
['https://tezara.org/theses/77039','https://hdl.handle.net/11480/5761','16,15 kg','65,00 kg','9,55 kg','32,25 kg','53,9 kg','33,0 kg','uzman tahmini','en hırçın'].forEach(t=>assert.ok(p6.includes(t),'panel6: '+t));
assert.strictEqual(fs.readFileSync(path.join(web,'..','yonetici','demo-data.js'),'utf8'),src,'yönetici demo-data.js eşit');
const mig=fs.readFileSync(path.join(web,'..','..','supabase','migrations','20261019003000_k289_melez_yon.sql'),'utf8');
assert.ok(/yapilacaklar/.test(mig)&&/uzman tahmini/.test(mig)&&!/update public\.hives/i.test(mig),'Yapılacaklar var, kovan taşıma yok');
/* koloni editöründe sade özellik satırı */
const kj=fs.readFileSync(path.join(web,'koloni.js'),'utf8');assert.ok(kj.includes('kolIrkMelez')&&kj.includes('irkBilgiSatir'));
assert.strictEqual(+JSON.parse(fs.readFileSync(path.join(web,'version.json'),'utf8')).version.replace('koloni-','')>=289,true);
console.log('k289 ok');

/* KİLİT: kullanıcı onaylı Genetik puanları. Değer değişirse test kırılır (onaysız değiştirmeyin). */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const st={};const ls={getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]},key:i=>Object.keys(st)[i],get length(){return Object.keys(st).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','demo-data.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,G=b=>C.genetikScore(b).g;
const LOCK={'Kafkas':5,'Buckfast':15,'Karadeniz':35,'İtalyan':55,'Muğla':55,'Anadolu':75,'Trakya':75,'Karniyol':75,'İran':75,'Yığılca':90,'Hatay':100,'Suriye':100,
 'Kafkas × Karadeniz':35,'Buckfast × İtalyan':45,'Buckfast × Kafkas':45,'Kafkas × Anadolu':55,'Kafkas × Karniyol':55,'Karniyol × Kafkas':55,'Karniyol × Muğla':75,'Anadolu × Karniyol':75,'Anadolu × Muğla':75,'İtalyan × Karniyol':65,
 '(Kafkas × Karadeniz) × Muğla':55,'(Buckfast × İtalyan) × Muğla':55,'(Kafkas × Karniyol) × Muğla':75,'(Kafkas × Anadolu) × Muğla':75,'(Kafkas × Anadolu) × Karniyol':90,'(Karniyol × İtalyan) × Anadolu':90};
Object.keys(LOCK).forEach(b=>assert.strictEqual(G(b),LOCK[b],'KİLİT: '+b));
assert.strictEqual(JSON.stringify(C.GENETIK_SAF),'{"kafkas":5,"buckfast":15,"karadeniz":35,"italyan":55,"mugla":55,"anadolu":75,"trakya":75,"karniyol":75,"iran":75,"yigilca":90,"hatay":100}');
assert.strictEqual(Object.keys(C.GENETIK_MELEZ).length,13);
const u=C.genetikScore('Karadeniz × İran');assert.strictEqual(u.g,55);assert.ok(u.missing);
assert.ok(JSON.parse(st['superari.irk.ogulVeriEksik.v1']).items['iran+karadeniz'],'unknown cross flagged');
/* Birim: (Kafkas×Karniyol)×Muğla, %100 dolu, mevsimde, ana 2+ yaş = 92,5 */
assert.strictEqual(C.orsCompute({genetik:G('(Kafkas × Karniyol) × Muğla'),sikisiklik:100,mevsim:100,anaYasi:100}),92.5);
assert.strictEqual(C.orsCompute({bypass:true,genetik:5,sikisiklik:0,mevsim:50,anaYasi:20}),100);
assert.strictEqual(C.swarmLevelOf(34.9).label,'Düşük');assert.strictEqual(C.swarmLevelOf(35).label,'Orta');assert.strictEqual(C.swarmLevelOf(69.9).label,'Orta');assert.strictEqual(C.swarmLevelOf(70).label,'Kritik');
/* ctx.date düzeltmesi: tarih (string veya {date}) mevsimi değiştirir */
const h={id:9001,apiaryId:'a1',breed:'Kafkas',queenYear:2024};
const a1=C.swarm(h,'2026-04-01'),a2=C.swarm(h,{date:'2026-10-13'});
assert.strictEqual(a1.ors.mevsim,100);assert.strictEqual(a2.ors.mevsim,50);assert.ok(a1.score>a2.score);
console.log('k129 ok');

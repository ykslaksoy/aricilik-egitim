const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');const W=path.join(__dirname,'..');
const store={};const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);
['demo-data.js','plan-planlayici.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(W,f),'utf8'),w));
['cicek-veri.js','cicek.js','rota-motoru.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(W,f),'utf8'),w));
const R=w.SuperAriRota,Ck=w.SuperAriCicek,P=w.SuperAriPlan2;
// takvim
assert.strictEqual(Ck.donem({il:'Rize',ilce:'İkizdere'},7).aktif,true);
assert.strictEqual(Ck.donem({il:'Rize',ilce:'İkizdere'},10).aktif,false);
assert.strictEqual(Ck.donem({il:'Konya',ilce:'Ereğli'},7).durum,'veri_yok');
assert.ok(Ck.eksikler().includes('konya'));
// seri yok → eşik öğrenilmez, puan yok
const seri={};P.netArtis=(id)=>seri[id]||[];
assert.strictEqual(R.esikOgren('a1'),null);
const rp=R.rotaPuan('Muğla','Fethiye');assert.strictEqual(rp.puan==null||typeof rp.puan==='number',true);
assert.strictEqual(R.rotaPuan('Konya','Ereğli').metin,'Henüz kayıt yok');
// eşik öğrenme (kayan pencere)
const mk=a=>a.map((kg,i)=>({gun:'2026-07-'+String(i+1).padStart(2,'0'),kg}));
seri.a1=mk([2,2.5,3,2.8,2.2,2,1.5,1.2,1,0.8,0.5,0,-0.1,0,-0.2,0,-0.1,-0.3]);
const e=R.esikOgren('a1');assert.ok(e&&e.gun>=2&&e.gun<=7&&e.esikKg>=0,JSON.stringify(e));
assert.strictEqual(R.artisBitti(w.SuperAriDemo.apiaryById('a1')).bitti,true);
// puan dinamik: seri eklenince değer üretir
const p1=R.rotaPuan('Muğla','Fethiye');assert.ok(typeof p1.puan==='number'&&p1.puan>=0&&p1.puan<=100);
// yönlendirme: önce kayıtlı arılık
seri.a5=mk(Array(18).fill(1.5));
const y=R.yonlendir('a1',7);assert.strictEqual(y.durum,'kayitli',JSON.stringify(y));assert.ok(/kontrol et, taşınmayı planla/.test(y.metin));
// kayıtlı uygun yoksa harici ilçe (yalnız doğrulanmış, ayı aralıkta)
Object.keys(seri).forEach(k=>delete seri[k]);seri.a1=mk([2,2.5,3,2.8,2.2,2,1.5,1.2,1,0.8,0.5,0,-0.1,0,-0.2,0,-0.1,-0.3]);
const aps=w.SuperAriDemo.loadApiaries();aps.forEach(a=>{if(a.id!=='a1')seri[a.id]=mk(Array(18).fill(0))});
const y2=R.yonlendir('a1',9);assert.strictEqual(y2.durum,'harici',JSON.stringify(y2));assert.ok(w.SuperAriCicek.donem({il:y2.hedef.il,ilce:y2.hedef.ilce},9).aktif,y2.hedef.ilce);
// teknik birim / yabancı terim yok
[y.metin,y2.metin].forEach(m=>assert.ok(!/Hz|dB|kg\/gün|kg\/g/.test(m)));
const goc=fs.readFileSync(path.join(W,'goc.html'),'utf8');assert.ok(goc.includes('id="gVaris" required')&&goc.includes('id="gAyrilis" />')/*k225: ayrılış istenir, boşsa bal sezonu sonu*/&&!/kg\/gün|Open-Meteo|TAGEM/.test(goc));
const pn=fs.readFileSync(path.join(W,'../yonetici/panel.js'),'utf8');assert.ok(pn.includes('rota_puan(ilçe)')&&pn.includes('TAGEM'));
// TAGEM 2022 değerleri (eski matris kalmadı)
const V=JSON.parse(JSON.stringify(w.SuperAriCicekVeri.rows)),g=(i,c)=>V.filter(r=>r.il===i&&r.ilce===c).map(r=>[r.ay1,r.ay2]).map(x=>Array.from(x));
assert.deepStrictEqual(g('Erzurum','Tortum'),[[6,8]]);assert.deepStrictEqual(g('Rize','İkizdere'),[[4,9]]);assert.deepStrictEqual(g('Artvin','Borçka'),[[3,8]]);
assert.deepStrictEqual(g('Ordu','Ünye'),[[4,6]]);assert.deepStrictEqual(g('Muğla','Marmaris'),[[9,10]]);assert.deepStrictEqual(g('Muğla','Milas'),[[7,11]]);
assert.deepStrictEqual(g('Antalya','Korkuteli'),[[7,9]]);assert.deepStrictEqual(g('Antalya','Finike'),[[4,5],[10,10]]);
assert.ok(!V.some(r=>/macahel/i.test(r.ilce)));assert.strictEqual(V.find(r=>r.ilce==='Marmaris').baskin_flora,'Çam');
console.log('k160 ok');

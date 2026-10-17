/* k256 önizleme: Göç (Arılığı Taşı) arılığı tüm kovanlarıyla taşır, aynı yerdeki arılıkla ASLA birleşmez; Kovan arılık değiştir; Birleştir yalnız açık seçimle + Geri al. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');const W=path.join(__dirname,'..');
function boot(mode){const store={};if(mode)store['superari.workMode']=mode;const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return {D:w.SuperAriDemo,store};}
// Demo: a2'yi a3'ün tam koordinatına taşı → ayrı kalır, konum kalıcı (örnek düzeltme geri almaz), geçmiş yazılır
{const {D}=boot();const G=D.goc;const a3=D.apiaryById('a3');const n2=D.hivesForApiary('a2').length,n3=D.hivesForApiary('a3').length;
const r=G.tasi({apiaryId:'a2',lat:a3.lat,lon:a3.lon,place:'Palandöken yanı',il:'Erzurum',ilce:'Palandöken',date:'2026-10-18',tasks:false});
assert.strictEqual(r.kind,'tasi');D.loadApiaries();D.loadApiaries();const a2=D.apiaryById('a2');
assert.strictEqual(a2.lat,a3.lat);assert.strictEqual(a2.lon,a3.lon);assert.strictEqual(a2.il,'Erzurum');assert.strictEqual((a2.locHistory||[]).length,1);
assert.strictEqual(D.hivesForApiary('a2').length,n2);assert.strictEqual(D.hivesForApiary('a3').length,n3);assert.ok(D.apiaryById('a3'));
G.remove(r.id,{revert:true});const b2=D.apiaryById('a2');assert.strictEqual(b2.lat,40.257866);assert.strictEqual((b2.locHistory||[]).length,0);}
// Kovan arılık değiştir + geri al
{const {D}=boot();const G=D.goc;const ids=D.hivesForApiary('a3').slice(0,2).map(h=>h.id);const n1=D.hivesForApiary('a1').length;
const r=G.add({fromApiaryId:'a3',toApiaryId:'a1',hiveIds:ids,date:'2026-10-18',tasks:false});assert.strictEqual(r.kind,'degistir');
assert.strictEqual(D.hivesForApiary('a1').length,n1+2);G.remove(r.id,{revert:true});assert.strictEqual(D.hivesForApiary('a1').length,n1);
assert.ok(ids.every(i=>String(D.hiveById(i).apiaryId)==='a3'));}
// Birleştir: ad zorunlu; kovanlar aktarılır; geri al örnek arılığı fazladan kovanla doğurmaz
{const {D}=boot();const G=D.goc;const n2=D.hivesForApiary('a2').length,n4=D.hivesForApiary('a4').length;
assert.throws(()=>G.birlestir({keepId:'a2',mergeId:'a4',name:''}));
const r=G.birlestir({keepId:'a2',mergeId:'a4',name:'Tortum Birleşik',date:'2026-10-18'});
assert.strictEqual(D.apiaryById('a4'),null);assert.strictEqual(D.apiaryById('a2').name,'Tortum Birleşik');assert.strictEqual(D.hivesForApiary('a2').length,n2+n4);
G.remove(r.id,{revert:true});assert.ok(D.apiaryById('a4'));assert.strictEqual(D.hivesForApiary('a4').length,n4);assert.strictEqual(D.hivesForApiary('a2').length,n2);assert.strictEqual(D.apiaryById('a2').name,'Tortum Yayla Arılığı');}
// Kovan bilgileri kovanla gider (görev, hasat, cihaz, gider) + Geri al hepsini geri yazar — Demo ve Canlı
for (const mode of [null, 'live']) {const {D,store}=boot(mode);const G=D.goc;
 if (mode) { store['superari.ariliklar.v1']=JSON.stringify([{id:'x1',name:'A',place:'A',lat:40,lon:41,hiveCount:2},{id:'x2',name:'B',place:'B',lat:40.5,lon:41.5,hiveCount:1}]); D.loadApiaries(); D.loadHives(); }
 const A=mode?'x1':'a3',B=mode?'x2':'a1';const hs=D.hivesForApiary(A).map(h=>h.id);const h0=hs[0],h1=hs[1];
 const sfx=mode?'':'.demo';
 store['superari.gorevler'+sfx+'.v1']=JSON.stringify([{id:'t1',title:'x',hiveId:h0,apiaryId:A},{id:'t2',title:'y',hiveId:h1,apiaryId:A},{id:'t3',title:'arılık',apiaryId:A}]);
 store['superari.hasat'+sfx+'.v2']=JSON.stringify([{id:'hs1',hiveId:h0,apiaryId:A,kg:5}]);
 store[mode?'superari.devices':'superari.devices.demoUser']=JSON.stringify([{id:'d1',tip:'tarti',hiveId:h0,apiaryId:A}]);
 store['superari.giderler'+sfx+'.v1']=JSON.stringify([{id:'g1',hiveIds:[h0],apiaryId:A,apiaryName:D.apiaryById(A).name}]);
 const pv=G.preview({kind:'degistir',fromApiaryId:A,toApiaryId:B,hiveIds:[h0]});assert.strictEqual(pv.refs,4);
 const r=G.add({fromApiaryId:A,toApiaryId:B,hiveIds:[h0],date:'2026-10-18',tasks:false});
 const T=()=>JSON.parse(store['superari.gorevler'+sfx+'.v1']);
 assert.deepStrictEqual(T().map(t=>t.apiaryId),[B,A,A]);
 assert.strictEqual(JSON.parse(store['superari.hasat'+sfx+'.v2'])[0].apiaryId,B);
 assert.strictEqual(JSON.parse(store[mode?'superari.devices':'superari.devices.demoUser'])[0].apiaryId,B);
 const gd=JSON.parse(store['superari.giderler'+sfx+'.v1'])[0];assert.strictEqual(gd.apiaryId,B);assert.strictEqual(gd.apiaryName,D.apiaryById(B).name);
 assert.strictEqual(D.hiveById(h0).id,h0);
 G.remove(r.id,{revert:true});
 assert.deepStrictEqual(T().map(t=>t.apiaryId),[A,A,A]);assert.strictEqual(JSON.parse(store['superari.hasat'+sfx+'.v2'])[0].apiaryId,A);
 assert.strictEqual(JSON.parse(store['superari.giderler'+sfx+'.v1'])[0].apiaryName,D.apiaryById(A).name);
 // Birleştir: arılığa bağlı her şey gider, Geri al geri getirir
 const r2=G.birlestir({keepId:B,mergeId:A,name:'Birleşik',date:'2026-10-18'});
 assert.deepStrictEqual(T().map(t=>t.apiaryId),[B,B,B]);assert.strictEqual(D.apiaryById(A),null);
 G.remove(r2.id,{revert:true});
 assert.deepStrictEqual(T().map(t=>t.apiaryId),[A,A,A]);assert.ok(D.apiaryById(A));assert.strictEqual(JSON.parse(store[mode?'superari.devices':'superari.devices.demoUser'])[0].apiaryId,A);
 assert.strictEqual(D.hivesForApiary(A).length,hs.length);
}
// Canlı: örnek ad/konum düzeltmesi kullanıcının arılığına uygulanmaz
{const {D,store}=boot('live');store['superari.ariliklar.v1']=JSON.stringify([{id:'x1',name:'Tortum Arılığım',place:'Tortum',lat:40.5,lon:41.5,hiveCount:0}]);
const a=D.loadApiaries()[0];assert.strictEqual(a.lat,40.5);assert.strictEqual(a.lon,41.5);assert.strictEqual(a.name,'Tortum Arılığım');}
// Sayfa: ad «Göç (Arılığı Taşı)», üç sekme
{const g=fs.readFileSync(path.join(W,'goc.html'),'utf8');assert.ok(g.includes("title: 'Göç (Arılığı Taşı)'"));assert.ok(g.includes('data-mod="degistir"')&&g.includes('data-mod="birlestir"'));}
console.log('k256 ok');

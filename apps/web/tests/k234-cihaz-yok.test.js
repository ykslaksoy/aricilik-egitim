/* k234: cihaz yok / Cihaz devre dışı / Veri yok / Mikrofon desteklemiyor ayrımı; sabit satır; admin bilimsel «Veri yok» dokunulmaz. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const store={},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){return true},CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail},Event:function(){},console,setTimeout(){},confirm:()=>true,alert(){},document:{addEventListener(){},removeEventListener(){},getElementById(){return null},visibilityState:'visible',createElement(){return{style:{},setAttribute(){},appendChild(){},textContent:''}},head:{appendChild(){}},body:{appendChild(){}},hidden:false},HTMLElement:function(){}};
w.window=w;w.self=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
vm.runInContext(fs.readFileSync(path.join(W,'device-runtime.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,Dv=w.SuperAriDevices;
assert.strictEqual(C.titresimDurum(99999),'Titreşim uyarıları: Cihaz yok');
assert.strictEqual(C.girisSayacDurum(99999),'Giriş sayacı: Cihaz yok');
assert.strictEqual(C.girisSicakDurum(99999),'Giriş sıcaklığı: Cihaz yok');
assert.strictEqual(C.titresimDurum(101),'Titreşim uyarıları: Cihaz yok','101 titreşim cihazı yok');
assert.match(C.titresimDurum(102),/Titreşim uyarıları: (açık|Veri yok)/,'102 titreşim cihazı var');
assert.match(C.girisSayacDurum(102),/Giriş sayacı: (açık|Veri yok)/,'102 IR cihazı var');
assert.strictEqual(C.girisSayacDurum(101),'Giriş sayacı: Cihaz yok');
/* yalnız disabled cihaz → Cihaz devre dışı */
const row=Dv.addDevice({tip:'titresim',hiveId:301,apiaryId:'a1',name:'t-dd'});
Dv.setDisabled(row.id,true,{hiveId:301,tip:'titresim'});
assert.ok(Dv.listDevices().some(d=>Number(d.hiveId)===301&&d.disabled));
assert.strictEqual(C.titresimDurum(301),'Titreşim uyarıları: Cihaz devre dışı');
assert.strictEqual(C.esekMikDurum(null),'Eşek arısı algılama: Cihaz yok');
assert.strictEqual(C.esekMikDurum({disabled:true}),'Eşek arısı algılama: Cihaz devre dışı');
assert.match(C.esekMikDurum({ornekleme:16000}),/Mikrofon desteklemiyor/);
assert.strictEqual(C.esekMikDurum({ornekleme:32000}),'Eşek arısı algılama: hazır');
assert.ok(!/Veri yok \/ mikrofon/.test(C.esekMikDurum({ornekleme:8000})));
/* aktif cihaz + okuma yok → Veri yok (demoUser cihazı okuma üretmez) */
const r2=Dv.addDevice({tip:'ir',hiveId:401,apiaryId:'a1'});
assert.strictEqual(C.girisSayacDurum(401),'Giriş sayacı: Veri yok');
const kh=fs.readFileSync(path.join(W,'kovan.html'),'utf8');
assert.ok(kh.includes('sensor-durum'));
assert.ok(kh.includes('girisSayacDurum'));
assert.ok(kh.includes('girisSicakDurum'));
assert.ok(kh.includes('min-height:1.25em'));
assert.ok(kh.includes('koloni-235'));
assert.ok(!/Giriş sayacı: Veri yok/.test(kh));
assert.strictEqual(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(W,'version.json'),'utf8')).version,'koloni-235');
console.log('k234-cihaz-yok ok');

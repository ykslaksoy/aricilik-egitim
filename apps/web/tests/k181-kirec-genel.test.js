/* k181: Kireç riski + genel koloni kontrolü — teşhis değil, haftada en çok bir görev; eşikler panelde (uzman tahmini). */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const C=load({}),T=Object.assign({},C.ORS_SENSOR),H=3600000;
assert.strictEqual(T.kirecIsiC,30);assert.strictEqual(T.kirecSaat,24);
assert.match(C.ORS_SENSOR_ADLAR.kirecSaat,/uzman tahmini/);assert.match(C.ORS_SENSOR_ADLAR.kirecIsiC,/Flores/);assert.match(C.ORS_SENSOR_ADLAR.genelKayipKat,/uzman tahmini/);
assert.strictEqual(C.ogulSkorMerge({sensor:{kirecSaat:12}}).sensor.kirecSaat,12);
const R=(S,t,n)=>C.saglikHatirlatmalari(Object.assign({isi_nem:[],tarti:[],ir:[]},S),t||T,n);
const YAZ=Date.parse('2026-06-10T12:00:00'),KIS=Date.parse('2026-01-10T12:00:00');
const isi=(n,c,rh,s)=>Array.from({length:n},(_,i)=>({t:(s||YAZ)-(n-1-i)*H,tempC:c,rh}));
/* 26 saat 28 °C → kireç; 20 saat → yok; 31 °C → yok; kışın → yok */
assert.strictEqual(R({isi_nem:isi(26,28,60)},T,YAZ).kirec,true);
assert.strictEqual(R({isi_nem:isi(26,28,60)},T,YAZ).kirecNem,false);
assert.strictEqual(R({isi_nem:isi(26,28,90)},T,YAZ).kirecNem,true);
assert.strictEqual(R({isi_nem:isi(20,28,60)},T,YAZ).kirec,false);
assert.strictEqual(R({isi_nem:isi(26,31,95)},T,YAZ).kirec,false,'nem tek başına tetiklemez');
assert.strictEqual(R({isi_nem:isi(26,28,60,KIS)},T,KIS).kirec,false,'kuluçka dönemi dışı');
assert.strictEqual(R({isi_nem:isi(20,28,60)},Object.assign({},T,{kirecSaat:12}),YAZ).kirec,true,'panel süresi');
/* araya sıcak okuma girerse süre sıfırlanır */
const k=isi(26,28,60);k[12].tempC=34;assert.strictEqual(R({isi_nem:k},T,YAZ).kirec,false);
/* genel: günde 0,2 kg normal, son gün 1,2 kg → uyarı; 0,3 → yok; yazın → yok */
const tarti=(son,s)=>{const L=[];let kg=40;for(let d=6;d>=0;d--){for(let h=0;h<24;h+=2){L.push({t:(s||KIS)-d*24*H-(22-h)*H,kg});kg-=(d===0?son:0.2)/12;}}return L;};
assert.strictEqual(R({tarti:tarti(1.2)},T,KIS).genel,true);
assert.strictEqual(R({tarti:tarti(1.2)},T,KIS).genelNeden,'agirlik');
assert.strictEqual(R({tarti:tarti(0.3)},T,KIS).genel,false);
assert.strictEqual(R({tarti:tarti(1.2,YAZ)},T,YAZ).genel,false,'mevsim dışı');
const ir=Array.from({length:48},(_,i)=>({t:KIS-(47-i)*H,count:i<24?1000:600}));
assert.strictEqual(R({ir},T,KIS).genelNeden,'nufus');
assert.strictEqual(R({ir},Object.assign({},T,{genelNufusDusOran:0.5}),KIS).genel,false,'panel eşiği');
/* haftada en çok bir; tamamlanınca aynı sig (tekrar açılmaz); 7 gün sonra yeni */
assert.strictEqual(C.haftalikHatirlatma('kirec',1,true,'2026-06-10',7),'2026-06-10');
assert.strictEqual(C.haftalikHatirlatma('kirec',1,true,'2026-06-14',7),'2026-06-10');
assert.strictEqual(C.haftalikHatirlatma('genel',1,true,'2026-06-14',7),'2026-06-14','ayrı anahtar');
assert.strictEqual(C.haftalikHatirlatma('kirec',1,true,'2026-06-17',7),'2026-06-17');
/* metin: birim yok, hastalık adı yok */
const d=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
assert.ok(d.includes("title: 'Kireç riski, kuluçka ve havalandırma kontrolü önerilir — ' + nm"));
const g=d.match(/title: 'Genel koloni kontrolü[^']*'/)[0];assert.ok(!/nosema|varroa|hz|db|°c|kg/i.test(g));
assert.strictEqual(d,fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
const m=fs.readFileSync(path.join(W,'../../supabase/migrations/20261015250000_k181_su_yeniden.sql'),'utf8');
assert.ok(m.includes('Veri yok — uzman tahmini; olası nedenler: açlık, arı kaybı, hastalık'));assert.ok(m.includes('doi:10.1051/apido:19960401'));assert.ok(m.includes('doi:10.1016/j.jip.2009.06.018'));

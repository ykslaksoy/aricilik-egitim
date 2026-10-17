/* k235: eşek arısı tıslamasız IR yedek — mik yok/desteklemiyor → sıcaklık+titreşim+IR; IR yoksa uyarı yok; uzman tahmini; sayısız metin. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const store={},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){return true},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};
w.window=w;w.self=w;w.global=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR);
['esekIrOran','esekIrPencereDk','esekIrTabanDk','esekIrAyBas','esekIrAySon'].forEach(k=>{assert.ok(k in T,k);assert.match(C.ORS_SENSOR_ADLAR[k],/uzman tahmini/,k);});
assert.strictEqual(T.esekIrOran,0.5);assert.strictEqual(T.esekIrAyBas,7);assert.strictEqual(T.esekIrAySon,10);
const N=Date.parse('2026-08-15T14:00:00'),M=60000,H=3600000;
const R=(S,now)=>C.kuralYeni5(Object.assign({isi_nem:[],dis:[],ir:[],tarti:[],ses:[],titresim:[],giris:[],apiaryId:'a1'},S),T,{},now||N);
/* sıcaklık + titreşim tabanı */
const ti=Array.from({length:24},(_,i)=>({t:N-(23-i)*5*M,rms:i>=20?3:1}));
const si=[{t:N-8*M,tempC:34.5},{t:N-M,tempC:33.9}];
const dis=Array.from({length:6},(_,i)=>({t:N-(5-i)*H,tempC:24,mm:0}));
/* IR: taban yüksek çıkan, son pencerede düşük */
const ir=[];
for(let i=0;i<8;i++){const t=N-(7-i)*T.esekIrPencereDk*M;ir.push({t,giren:40,cikan:i>=6?10:80});}
const e=R({isi_nem:si,titresim:ti,ir,dis});
assert.ok(e.esekSicakAt.length,'sicak');
assert.ok(e.esekTitAt.length,'tit');
assert.ok(e.esekIrVar);
assert.ok(e.esekIrAt.length,'IR düşüş');
/* kış ayında IR düşüşü sayılmaz */
const kis=Date.parse('2026-01-15T14:00:00');
const eKis=R({isi_nem:si.map(x=>({t:x.t-(N-kis),tempC:x.tempC})),titresim:ti.map(x=>({t:x.t-(N-kis),rms:x.rms})),ir:ir.map(x=>({t:x.t-(N-kis),giren:x.giren,cikan:x.cikan})),dis:dis.map(x=>({t:x.t-(N-kis),tempC:24,mm:0}))},kis);
assert.strictEqual(eKis.esekIrAt.length,0,'kışta IR yedek yok');
/* IR yok → esekIrVar false */
assert.strictEqual(R({isi_nem:si,titresim:ti,dis}).esekIrVar,false);
/* esekYolDurum */
assert.match(C.esekYolDurum(99999),/tıslama ölçülemiyor, giriş sayacı yok|IR yedek/);
assert.ok(typeof C.esekYolDurum==='function');
/* admin + uyarı metni sayısız */
const src=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
const line=src.split('\n').find(x=>x.includes("ALARM_YUKSEK_ESEK_01")&&x.includes('uçuşta ani düşüş'));
assert.ok(line,'yedek uyarı satırı');
assert.ok(!/\d|°C|Requier|Monceau|0,5/.test(line.replace(/ALARM_YUKSEK_ESEK_01/g,'')),'sayı yok');
const p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');
['10.1007/s10340-018-1063-0','10.1371/journal.pone.0066492','esekIrOran','IR yedek','tıslamasız'].forEach(x=>assert.ok(p.includes(x),x));
assert.ok(fs.readFileSync(path.join(W,'kovan.html'),'utf8').includes('esekYolDurum'));
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(W,'version.json'),'utf8')).version,'koloni-235');
console.log('k235-esek-tislamasiz ok');

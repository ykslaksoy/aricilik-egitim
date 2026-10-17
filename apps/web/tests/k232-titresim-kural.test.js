/* koloni-232: 4 titreşim kuralı — oğul hazırlığı (gece), ana ötmesi, darbe, kış hareketsizliği; tek kaynak, aç/kapa, ses kurallarıyla tek uyarı. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const store={},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR),H=3600000,D=24*H,M=60000;
['titOgulArtisOran','titOgulArtisGece','titOgulTabanGun','titOtmeSiraSaat','titDarbeKat','titDarbeMinSay','titSpikeG','titKisOran','titKisSaat'].forEach(k=>assert.match(C.ORS_SENSOR_ADLAR[k],/uzman tahmini/,k));
assert.strictEqual(T.titOgulHzMin,20);assert.strictEqual(T.titOgulHzMax,800);assert.strictEqual(T.titTootHzMax,550);
const N=Date.parse('2026-05-20T06:00:00');
/* (1) gece seviyesi: 17 gün; son 3 gece artan ve tabanın 1,3 katı üstü */
const g0=new Date(N);g0.setHours(0,0,0,0);const V=[];
for(let d=16;d>=0;d--){for(let h=0;h<5;h++){const lv=d===0?2.0:d===1?1.8:d===2?1.6:1;V.push({t:g0.getTime()-d*D+h*H+10*M,rms:lv,hz:22});}}
let r=C.titresimYeni4({titresim:V},T,{notes:[]},N);assert.strictEqual(r.titOgul,true);assert.strictEqual(r.ogulOnce,true,'ses kuralıyla birleşir');
r=C.titresimYeni4({titresim:V.map(x=>Object.assign({},x,{rms:1}))},T,{notes:[]},N);assert.strictEqual(r.titOgul,false);
r=C.titresimYeni4({titresim:V},T,{notes:[],ogulOnce:true},N);assert.strictEqual(r.ogulOnceOrtak,true);
/* (2) tooting → quacking */
r=C.titresimYeni4({titresim:[{t:N-2*H,hz:400,ritmik:true,rms:1},{t:N-H,hz:320,sureMs:120,rms:1}]},T,{notes:[]},N);assert.strictEqual(r.titOtme,true);
r=C.titresimYeni4({titresim:[{t:N-H,hz:320,sureMs:120,rms:1}]},T,{notes:[]},N);assert.strictEqual(r.titOtme,false,'tooting yoksa yok');
/* (3) darbe: 12 kısa sinyal 5 dk içinde, öncesi yok */
const P=Array.from({length:12},(_,i)=>({t:N-5*M+i*20000,hz:300,sureMs:100,rms:1}));
r=C.titresimYeni4({titresim:P},T,{notes:[]},N);assert.strictEqual(r.titDarbe,true);assert.strictEqual(r.rahatsiz,true,'rahatsız edilme ile tek uyarı');
r=C.titresimYeni4({titresim:[{t:N,rms:1,g:3}]},T,{notes:[]},N);assert.strictEqual(r.titDarbe,true,'tek ivme sıçraması');
r=C.titresimYeni4({titresim:P.slice(0,3)},T,{notes:[]},N);assert.strictEqual(r.titDarbe,false);
/* (4) kış hareketsizliği */
const K=Date.parse('2027-01-15T12:00:00'),KV=[];for(let i=24*10;i>=0;i--){const t=K-i*H;KV.push({t,rms:i<=26?0.02:1});}
r=C.titresimKis({titresim:KV},T,{},K);assert.strictEqual(r.titKis,true);
assert.strictEqual(C.titresimKis({titresim:KV},T,{},N).titKis,false,'kış dışı');
assert.strictEqual(C.titresimKis({titresim:KV.map(x=>({t:x.t,rms:1}))},T,{},K).titKis,false);
/* aç/kapa */
['titOgul','titOtme','titDarbe','titKis'].forEach(id=>assert.ok(C.KURALLAR.some(x=>x[0]===id),id));
/* veri yok */
assert.strictEqual(C.titresimDurum(99999),'Titreşim uyarıları: Cihaz yok');
const src=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
assert.ok(src.includes("Bakire ana çıktı, ikincil oğul riski (' + nm"));assert.ok(src.includes("'⚫ Koloni ölümü şüphesi ("));
const p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');
['10.1016/j.compag.2011.01.004','10.1038/s41598-020-66115-5','10.1371/journal.pone.0171162','10.1038/s41598-024-54107-8',"['Titreşim', ['titresim', 'titOgul', 'titOtme', 'titDarbe', 'titKis']]"].forEach(x=>assert.ok(p.includes(x),x));
assert.ok(!/Hz|Ramsey|Bencsik/.test(fs.readFileSync(path.join(W,'kovan.html'),'utf8').match(/koloni-235[^\n]*\n[^\n]*/)[0].replace(/frekans yok/,'')));
assert.strictEqual(src,fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
console.log('k232-titresim-kural ok');

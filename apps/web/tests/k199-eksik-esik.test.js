/* k199: nem aralığı, IR, titreşim, cihaz sağlığı — uzman tahmini eşikler. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const ls={getItem:()=>null,setItem(){},removeItem(){},key:()=>null,length:0};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR),H=3600000,M=60000;
const E={nemNormalAlt:60,nemNormalUst:75,nemDisiSaat:24,nemKirecUst:80,nemKritikAlt:55,irOgulNetCikis:5000,irOgulDk:30,irYagmaOran:2,irYagmaDk:30,irTrafikOran:0.3,irTrafikGun:2,titresimKat:3,titresimDk:15,sessizOkuma:3,sessizMinDk:60,sessizKirmiziDk:180,kopukSaat:24,arizaAltEksiC:40,arizaUstC:85,arizaAyniSaat:6,arizaSicramaC:10};
Object.keys(E).forEach(k=>{assert.strictEqual(T[k],E[k],k);if(k!=='nemKirecUst')assert.match(C.ORS_SENSOR_ADLAR[k],/uzman tahmini/,k);});assert.match(C.ORS_SENSOR_ADLAR.nemNormalAlt,/Doull/);assert.match(C.ORS_SENSOR_ADLAR.nemKritikAlt,/uzman tahmini/);
assert.match(C.ORS_SENSOR_ADLAR.nemNormalAlt,/doi:10\.1051\/apido:19760104/);assert.match(C.ORS_SENSOR_ADLAR.irOgulNetCikis,/doi:10\.1051\/apido:19940405/);
const Y=Date.parse('2026-06-10T12:00:00');const R=S=>C.yeniKurallar(Object.assign({isi_nem:[],ir:[],titresim:[]},S),T,{},Y);
const nem=(v,n)=>Array.from({length:30},(_,i)=>({t:Y-(29-i)*H,tempC:34.5,rh:i<30-n?65:v}));
let r=R({isi_nem:nem(54,26)});assert.ok(r.nemDisi&&r.nemYon==='dusuk','düşük nem 25 sa');
assert.ok(!R({isi_nem:nem(54,20)}).nemDisi,'24 saatten kısa');assert.strictEqual(R({isi_nem:nem(58,26)}).nemYon,'erken','55–60 erken');assert.strictEqual(R({isi_nem:nem(60,26)}).nemYon,null,'60 sınır normal');assert.strictEqual(R({isi_nem:nem(55,26)}).nemYon,'erken','55 sınır erken');assert.strictEqual(R({isi_nem:nem(54.9,26)}).nemYon,'dusuk','<55 kritik');
r=R({isi_nem:nem(78,26)});assert.ok(r.nemDisi&&r.nemYon==='yuksek','75–80 nötr');r=R({isi_nem:nem(80,26)});assert.strictEqual(r.nemYon,'yuksek','80 sınır nötr');r=R({isi_nem:nem(81,26)});assert.strictEqual(r.nemYon,'kirec','80 üstü kireç');assert.strictEqual(R({isi_nem:nem(81,20)}).nemYon,null,'kısa');assert.match(C.ORS_SENSOR_ADLAR.nemKirecUst,/Liang 2000/);assert.match(C.ORS_SENSOR_ADLAR.nemKirecUst,/Flores/);
assert.ok(!R({isi_nem:nem(75,26)}).nemDisi,'75 sınır içinde');
const ogul=Array.from({length:7},(_,i)=>({t:Y-(6-i)*5*M,giren:50,cikan:i<6?50:5100}));assert.ok(R({ir:ogul}).irOgul,'oğul');
assert.ok(!R({ir:ogul.map(x=>Object.assign({},x,{cikan:x.cikan>1000?4000:50}))}).irOgul,'4000 < 5000');
const yag=Array.from({length:8},(_,i)=>({t:Y-(7-i)*5*M,giren:200,cikan:90}));assert.ok(R({ir:yag}).irYagma,'yağma');
const gece=Date.parse('2026-06-10T23:00:00');assert.ok(!C.yeniKurallar({isi_nem:[],titresim:[],ir:yag.map((x,i)=>({t:gece-(7-i)*5*M,giren:200,cikan:90}))},T,{},gece).irYagma,'gece yok');
const g0=new Date(Y);g0.setHours(0,0,0,0);const tr=[];for(let d=0;d<9;d++)for(let h=7;h<12;h++)tr.push({t:g0.getTime()-d*86400000+h*H,count:d<2?20:100});tr.sort((a,b)=>a.t-b.t);
assert.ok(R({ir:tr}).irTrafik,'trafik düşüşü');assert.ok(!R({ir:tr.map(x=>({t:x.t,count:100}))}).irTrafik);
const tv=Array.from({length:30},(_,i)=>({t:Y-(29-i)*2*M,rms:i<20?1:3.5}));assert.ok(R({titresim:tv}).titresimOlagan,'titreşim');assert.ok(!R({titresim:tv.map(x=>({t:x.t,rms:x.rms>1?2:1}))}).titresimOlagan);
const dv=[{id:'g',tip:'gateway',apiaryId:'a',lastMins:1500},{id:'t1',tip:'tarti',apiaryId:'a',hiveId:1,lastMins:1500},{id:'t2',tip:'tarti',apiaryId:'b',hiveId:2,lastMins:70},{id:'t3',tip:'tarti',apiaryId:'b',hiveId:3,lastMins:200},{id:'t4',tip:'tarti',apiaryId:'b',hiveId:4,lastMins:30,aralikMs:30*M},{id:'t5',tip:'tarti',apiaryId:'b',hiveId:5,lastMins:null},{id:'t6',tip:'tarti',apiaryId:'b',hiveId:6,lastMins:1500}];
const cs=C.cihazSaglik(dv,T,Y,()=>[]);const by=Object.fromEntries(cs.map(c=>[c.id,c]));
assert.strictEqual(by.g.durum,'kopuk');assert.ok(!by.t1,'gateway kopuk → tek uyarı');assert.strictEqual(by.t2.durum,'sari');assert.strictEqual(by.t3.durum,'kirmizi');assert.ok(!by.t4,'30 dk < max(90,60)');assert.ok(!by.t5,'hiç veri yok');assert.strictEqual(by.t6.durum,'kopuk');
const I=v=>[{id:'i',tip:'isi_nem',apiaryId:'b',hiveId:7,lastMins:5}];
const ar=L=>(C.cihazSaglik(I(),T,Y,()=>L)[0]||{}).neden;
assert.strictEqual(ar([{t:Y-H,tempC:90,rh:50},{t:Y,tempC:34,rh:50}]),'imkansiz');assert.strictEqual(ar([{t:Y,tempC:34,rh:105}]),'imkansiz');assert.strictEqual(ar([{t:Y-H,tempC:-41,rh:50}]),'imkansiz');
assert.strictEqual(ar([{t:Y-H,tempC:20,rh:50},{t:Y,tempC:31,rh:50}]),'sicrama');assert.strictEqual(ar(Array.from({length:8},(_,i)=>({t:Y-(7-i)*H,tempC:30,rh:55}))),'ayni');
assert.strictEqual(ar([{t:Y-H,tempC:33,rh:50},{t:Y,tempC:34,rh:51}]),undefined);
const d=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
['kr-nem-','kr-ir-ogul-','kr-ir-yagma-','kr-ir-trafik-','kr-titresim-'].forEach(k=>{const l=d.match(new RegExp("id: '"+k+"'[^\\n]*"))[0];assert.ok(!/%|°C|Hz|dB|doull|struye|flores|\d{2,}/i.test(l.replace(/priority: \d/,'')),k);});
assert.ok(/Nem çok düşük, yavru \(yumurta\) açılmama riski var/.test(d)&&/'Nem normal aralığın üstünde'/.test(d));
assert.strictEqual(d,fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
const p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');Object.keys(E).forEach(k=>assert.ok(p.includes("'"+k+"'"),'panel '+k));
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(W,'version.json'),'utf8')).version,'koloni-213');
console.log('k199-eksik-esik ok');
assert.ok(!/büzüşme/.test(fs.readFileSync(path.join(W,'demo-data.js'),'utf8')+p));
{const d2=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');assert.ok(/'Nem çok yüksek, kireç hastalığı riski var'/.test(d2));assert.ok(/haftalikHatirlatma\('kirec', h\.id, !!\(shR && \(shR\.kirec \|\| nemKr\)\)/.test(d2),'ortak kireç anahtarı');assert.ok(/shR\.nemYon !== 'kirec'/.test(d2),'nem görevinde tekrar yok');}
{const d3=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');assert.ok(/'Nem düşüyor, yavrularda kuruma riski var'/.test(d3));assert.ok(/priority: shR\.nemYon === 'dusuk' \? 1 : 3/.test(d3));}
{/* koloni-204: düzenlenen eşikler dinamik + sıra doğrulama */
const T2=Object.assign({},T,{nemKritikAlt:40,nemNormalAlt:45,nemNormalUst:65,nemKirecUst:70});const R2=S=>C.yeniKurallar(Object.assign({isi_nem:[],ir:[],titresim:[]},S),T2,{},Y);
assert.strictEqual(R2({isi_nem:nem(39,26)}).nemYon,'dusuk');assert.strictEqual(R2({isi_nem:nem(42,26)}).nemYon,'erken');assert.strictEqual(R2({isi_nem:nem(54,26)}).nemYon,null,'yeni normal');assert.strictEqual(R2({isi_nem:nem(67,26)}).nemYon,'yuksek');assert.strictEqual(R2({isi_nem:nem(72,26)}).nemYon,'kirec');
const T3=Object.assign({},T,{nemDisiSaat:10});assert.strictEqual(C.yeniKurallar({isi_nem:nem(54,12),ir:[],titresim:[]},T3,{},Y).nemYon,'dusuk','süre düzenlenebilir');
assert.ok(C.nemSiraGecerli(T));[{nemKritikAlt:60},{nemNormalAlt:80},{nemNormalUst:85},{nemKirecUst:70},{nemKirecUst:101},{nemNormalAlt:55,nemKritikAlt:55}].forEach(x=>assert.ok(!C.nemSiraGecerli(Object.assign({},T,x)),JSON.stringify(x)));
assert.ok(C.nemSiraGecerli(Object.assign({},T,{nemNormalUst:80,nemKirecUst:80})),'üst = kireç geçerli');
const m=C.ogulSkorMerge({sensor:{nemKritikAlt:70}}).sensor;assert.strictEqual(m.nemKritikAlt,55);assert.strictEqual(m.nemNormalAlt,60);
assert.strictEqual(C.ogulSkorMerge({sensor:{nemKritikAlt:40,nemNormalAlt:45}}).sensor.nemKritikAlt,40);
const pn=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8'),nemKart=pn.slice(pn.indexOf("{ t: 'Nem'"),pn.indexOf("{ t: 'Ağırlık"));
assert.ok(/Nem eşikleri sırası hatalı/.test(pn)&&/Nem eşikleri sırası hatalı/.test(fs.readFileSync(path.join(W,'../yonetici/panel.js'),'utf8')));
const lab=nemKart.replace(/src: '[^']*'/,'').replace(/Doull 1976[^']*?%50[^'·]*/g,'').replace(/Liang 2000[^·']*/g,'').replace(/Flores 1996[^·']*/g,'');assert.ok(!/\b(55|60|75|80|24)\b/.test(lab),'Nem kartında sabit sayı yok');
const fn=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');const yk=fn.slice(fn.indexOf('function yeniKurallar'),fn.indexOf('function cihazSaglik'));const nl=yk.split('\n').filter(l=>/rh/.test(l)).join('');assert.ok(!/[<>] ?\d/.test(nl),'nem mantığında sabit eşik yok');
console.log('k204 nem düzenleme ok');}

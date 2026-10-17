/* k230: 5 yeni sensör kuralı — koloni sönmüş, yavrusuz, tarlacı kaybı, eşek arısı (sıcaklık+tıslama+titreşim), havalandırma; tek kaynak, aç/kapa, sayısız metin. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const store={},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR),H=3600000,N=Date.parse('2026-06-10T12:00:00');
['sonukGun','yavrusuzSalinimC','tarlaciOran','esekSicakDegisimC','esekEslesDk','esekTitresimKat','havaSaat'].forEach(k=>{assert.ok(k in T,k);assert.match(C.ORS_SENSOR_ADLAR[k],/uzman tahmini/,k);});
assert.strictEqual(T.esekSicakDegisimC,0.5);
const R=(S,t,now)=>C.kuralYeni5(Object.assign({isi_nem:[],dis:[],ir:[],tarti:[],ses:[],titresim:[],giris:[]},S),t||T,{},now||N);
const hrs=n=>Array.from({length:n},(_,i)=>N-(n-1-i)*H);
const dis=hrs(50).map(t=>({t,tempC:20+8*Math.sin(t/H/24*2*Math.PI)}));
const olu=dis.map(x=>({t:x.t,tempC:x.tempC+1}));
assert.strictEqual(R({isi_nem:olu,dis,ir:[{t:N-H,count:2}]}).koloniSonuk,true);
assert.strictEqual(R({isi_nem:olu,dis}).koloniSonuk,false,'IR/tartı yoksa yok');
assert.strictEqual(R({isi_nem:olu,dis,ir:[{t:N-H,count:500}]}).koloniSonuk,false,'trafik var');
const sabit=dis.map(x=>({t:x.t,tempC:34.5}));
assert.strictEqual(R({isi_nem:sabit,dis,ir:[{t:N-H,count:2}]}).koloniSonuk,false);
const yv=dis.map((x,i)=>({t:x.t,tempC:i%2?31:35.5}));
assert.strictEqual(R({isi_nem:yv,dis,kuluckaSensoru:true}).yavrusuz,true);
assert.strictEqual(R({isi_nem:sabit,dis,kuluckaSensoru:true}).yavrusuz,false);
assert.strictEqual(R({isi_nem:yv,dis}).yavrusuz,false,'kuluçka sensörü değilse yok');
/* tarlacı: 12 gün, sabah 7–10 arası düşüş; son 2 gün düşüş yok */
const g0=new Date(N);g0.setHours(0,0,0,0);const tr=[],hv=[];
for(let d=11;d>=0;d--){const b=g0.getTime()-d*24*H;for(let h=0;h<24;h++){const t=b+h*H;const drop=d>=2&&h>=8&&h<=10?0.4:0;tr.push({t,kg:40-drop});hv.push({t,tempC:22,mm:0});}}
const trS=tr.filter(x=>x.t<=N),hvS=hv.filter(x=>x.t<=N);
assert.strictEqual(R({tarti:trS,dis:hvS}).tarlaciKayip,true);
assert.strictEqual(R({tarti:trS.map(x=>({t:x.t,kg:new Date(x.t).getHours()>=8&&new Date(x.t).getHours()<=10?39.6:40})),dis:hvS}).tarlaciKayip,false);
assert.strictEqual(R({tarti:trS,dis:hvS.map(x=>Object.assign({},x,{mm:5}))}).tarlaciKayip,false,'yağmurlu günler sayılmaz');
/* eşek arısı: sıcaklık değişimi ve titreşim zamanları */
const M=60000,ti=Array.from({length:20},(_,i)=>({t:N-(19-i)*5*M,rms:i===19?3:1}));
const si=[{t:N-8*M,tempC:34.5},{t:N-M,tempC:33.9}];
const e=R({isi_nem:si,titresim:ti,giris:[{t:N,tempC:45,yer:'giris'}]});
assert.ok(e.esekSicakAt.length&&e.esekTitAt.length&&e.esekGirisSicak.length);
assert.strictEqual(R({isi_nem:[{t:N-8*M,tempC:34.5},{t:N-M,tempC:34.3}]}).esekSicakAt.length,0,'0,5 altı');
/* havalandırma */
const hs=hrs(8).map(t=>({t,tempC:36.5,rh:T.nemNormalUst+5}));
assert.strictEqual(R({isi_nem:hs}).havaNeden,'sicak');
const kis=Date.parse('2026-01-10T12:00:00'),ks=Array.from({length:8},(_,i)=>kis-(7-i)*H);
assert.strictEqual(R({isi_nem:ks.map(t=>({t,tempC:20,rh:90})),dis:ks.map(t=>({t,tempC:0}))},T,kis).havaNeden,'yogusma');
const hk=C.kuralYeni5({isi_nem:hs,dis:[],ses:[]},T,{nemDisi:true,nemYon:'yuksek'},N);assert.strictEqual(hk.nemDisi,false,'nem görevi birleşir');
assert.strictEqual(C.kuralYeni5({isi_nem:hs,dis:[],ses:[]},T,{kirec:true},N).havalandirma,false,'kireç varsa çıkmaz');
['koloniSonuk','yavrusuzSicak','tarlaciKayip','esekGiris','havalandirma'].forEach(id=>assert.ok(C.KURALLAR.some(x=>x[0]===id),id));
const src=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
['ALARM_YUKSEK_SONUK_01','ALARM_ORTA_TARLACI_01','ALARM_ORTA_HAVA_01','ALARM_YUKSEK_ESEK_01'].forEach(c=>{const l=src.split('\n').find(x=>x.includes("'"+c+"'"));assert.ok(l,c);const txt=l.slice(l.indexOf("'"+c+"'")).replace("'"+c+"'",'');assert.ok(!/\d|°C|Meikle|Ono|Käfer/.test(txt),c);});
const p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');
['10.1007/s13592-017-0512-8','10.1051/apido:2008055','10.1371/journal.pone.0197589','10.1007/s13592-014-0298-x','10.1038/377334a0','10.1016/j.jinsphys.2012.01.015','10.1016/j.cub.2007.07.033',"'Koloni durumu'"].forEach(x=>assert.ok(p.includes(x),x));
assert.strictEqual(src,fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
console.log('k230-kural-yeni5 ok');

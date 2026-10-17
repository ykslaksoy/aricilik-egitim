/* k233: 5 IR giriş sayacı kuralı — ilaçlama, dönmeyen tarlacı, düşük aktivite, sayaç arızası, oğul çıktı; tek kaynak, aç/kapa, sayısız metin, Cihaz yok / Veri yok. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
const store={},ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console,setTimeout(){}};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);
const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR),H=3600000,M=60000,N=Date.parse('2026-06-10T15:00:00');
['ilacGirisKat','donmeFark','aktiviteOran','sayacSaat','ogulCiktiNet'].forEach(k=>{assert.ok(k in T,k);assert.match(C.ORS_SENSOR_ADLAR[k],/uzman tahmini/,k);});
const R=(S,t,now)=>C.kuralIr5(Object.assign({ir:[],dis:[],tarti:[]},S),t||T,{},now||N);
/* normal seri: 15 gün, saatlik; gündüz 07–19 giren≈çıkan; gelen fonksiyon f(gün,saat) */
function seri(f,gun){const g0=new Date(N);g0.setHours(0,0,0,0);const L=[];for(let d=gun-1;d>=0;d--)for(let h=0;h<24;h++){const t=g0.getTime()-d*24*H+h*H;if(t>N)continue;const x=f(d,h,t);if(x)L.push(Object.assign({t},x));}return L;}
const norm=(d,h)=>h>=7&&h<19?{giren:100,cikan:100}:{giren:0,cikan:0};
const hava=seri((d,h)=>({tempC:22,mm:0}),18);
const r0=R({});assert.strictEqual(r0.irVeri,false,'IR yok → Veri yok');assert.strictEqual(r0.irIlac||r0.irDonmeyen||r0.irSayac,false);
const rn=R({ir:seri(norm,15),dis:hava});['irIlac','irDonmeyen','irDusukAktivite','irSayac','irOgulCikti'].forEach(k=>assert.strictEqual(rn[k],false,'normal: '+k));
/* (1) ilaçlama: bugün 13–15 giren ×3, çıkan ×0,3 */
const il=seri((d,h)=>d===0&&h>=13&&h<15?{giren:300,cikan:30}:norm(d,h),15);
assert.strictEqual(R({ir:il,dis:hava}).irIlac,true);
const il2=seri((d,h)=>d===0&&h>=13&&h<15?{giren:300,cikan:100}:norm(d,h),15);assert.strictEqual(R({ir:il2,dis:hava}).irIlac,false,'çıkan düşmezse yok');
/* (2) dönmeyen: son 3 gün giren %75 */
const dn=seri((d,h)=>h>=7&&h<19?{giren:d>=1&&d<=3?75:100,cikan:100}:{giren:0,cikan:0},15);
assert.strictEqual(R({ir:dn,dis:hava}).irDonmeyen,true);
/* (3) düşük aktivite: son 3 gün çıkış %30, sıcaklık değişkenliği ile öğrenme */
const hv2=seri((d,h)=>({tempC:18+(d%4),mm:0}),18);
const da=seri((d,h)=>{if(!(h>=7&&h<19))return{giren:0,cikan:0};const v=Math.round((50+10*(d%4))*(d>=1&&d<=3?0.3:1));return{giren:v,cikan:v};},15);
assert.strictEqual(R({ir:da,dis:hv2}).irDusukAktivite,true);
assert.strictEqual(R({ir:da,dis:hv2.map(x=>Object.assign({},x,{mm:5}))}).irDusukAktivite,false,'yağmurlu günler sayılmaz');
/* (4) sayaç: kanal 2 son 3 saat sıfır */
const ka=seri((d,h)=>{const b=norm(d,h);return Object.assign({},b,{kanallar:[{kanal:1,giren:b.giren/2,cikan:b.cikan/2},{kanal:2,giren:d===0&&h>=12?0:b.giren/2,cikan:d===0&&h>=12?0:b.cikan/2}]});},15);
const rk=R({ir:ka,dis:hava});assert.strictEqual(rk.irSayac,true);assert.strictEqual(rk.irSayacNeden,'kanal');
const db=seri((d,h)=>h>=7&&h<19?{giren:d>=1&&d<=2?20:100,cikan:100}:{giren:0,cikan:0},15);
const rd=R({ir:db,dis:hava});assert.strictEqual(rd.irSayac,true);assert.strictEqual(rd.irDonmeyen,false,'arızada diğerleri susar');
/* (5) oğul çıktı: 13:00'te 10 dk içinde 3000 net çıkış, dönüş yok; tartı 2 kg düşer */
const og=seri(norm,15).filter(x=>x.t<N-2*H).concat([{t:N-2*H,giren:0,cikan:1500},{t:N-2*H+5*M,giren:0,cikan:1500},{t:N-H,giren:50,cikan:50},{t:N,giren:50,cikan:50}]);
const tr=[{t:N-2*H-10*M,kg:40},{t:N-H,kg:38}];
const ro=R({ir:og,tarti:tr,dis:hava});assert.strictEqual(ro.irOgulCikti,true);assert.strictEqual(ro.irOgulTarti,true);
const og2=og.concat([{t:N-90*M,giren:2500,cikan:0}]).sort((a,b)=>a.t-b.t);assert.strictEqual(R({ir:og2,dis:hava}).irOgulCikti,false,'arılar döndüyse yok');
/* aç/kapa */
['irIlac','irDonmeyen','irDusukAktivite','irSayac','irOgulCikti'].forEach(id=>assert.ok(C.KURALLAR.some(x=>x[0]===id),id));
const src=fs.readFileSync(path.join(W,'demo-data.js'),'utf8');
['ALARM_YUKSEK_ILAC_01','ALARM_ORTA_AKTIVITE_01','ALARM_ORTA_IRSAYAC_01'].forEach(c=>{const l=src.split('\n').find(x=>x.includes("'"+c+"'"));assert.ok(l,c);const txt=l.slice(l.indexOf("'"+c+"'")).replace("'"+c+"'",'');assert.ok(!/\d|°C|Struye|Henry|Clarke|Odemer/.test(txt),c);});
assert.ok(/shY\.tarlaciKayip && !shY\.irDonmeyen/.test(src),'tarlacı tek uyarı');
assert.ok(/kra-ses-ogulani-' \+ h\.id, code: 'ALARM_KRITIK_SW_01'/.test(src),'oğul tek uyarı');
const p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');
['10.1051/apido:19940405','10.1126/science.1215039','10.1007/s13592-018-0565-3','10.1111/aab.12727',"'irOgulCikti']]"].forEach(x=>assert.ok(p.includes(x),x));
assert.ok(fs.readFileSync(path.join(W,'kovan.html'),'utf8').includes('girisSayacDurum'));
assert.ok(fs.readFileSync(path.join(W,'kovan.html'),'utf8').includes('Cihaz yok'));
const m=fs.readFileSync(path.join(W,'../../supabase/migrations/20261017190000_k233_ir_kural5.sql'),'utf8');['ir_ilac','ir_ogul_cikti','uzman tahmini','yapilacaklar'].forEach(x=>assert.ok(m.includes(x),x));
assert.strictEqual(src,fs.readFileSync(path.join(W,'../yonetici/demo-data.js'),'utf8'));
console.log('k233-ir-kural5 ok');

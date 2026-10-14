const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..');
function load(store){const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}};
 const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),w);return w.SuperAriDemo.colony;}
const C=load({}),T=Object.assign({},C.ORS_SENSOR),N=Date.parse('2026-05-01T12:00:00Z'),M=60000;
const run=(ses)=>C.sensorOrs({ses:ses.map(x=>Object.assign({t:x.t},x)),titresim:[],isi_nem:[],ir:[],tarti:[]},10,T);
/* ötme kuralı aynen: 400–500 Hz, 1 dk → piping */
assert.strictEqual(T.pipingHzMin,400);assert.strictEqual(T.pipingHzMax,500);assert.strictEqual(T.pipingDk,1);
const toot=[0,30,60,75].map(s=>({t:N+s*1000,hz:450,ritmik:true}));
assert.strictEqual(run(toot).piping,true);
/* dur sinyali (390 Hz, 120 ms darbeler) ötme sayılmaz */
assert.strictEqual(run([0,30,60,75].map(s=>({t:N+s*1000,hz:420,ritmik:true,sureMs:120}))).piping,false);
/* vızıldama tek başına → erken uyarı, skor bypass yok */
const q=[0,300,600,900].map(ms=>({t:N+ms,hz:280,sureMs:150}));
let r=run(q);assert.strictEqual(r.quack,true);assert.strictEqual(r.quackYuksek,false);assert.strictEqual(r.piping,false);
assert.ok(r.notes.some(t=>/Yüksükte bakire ana olabilir — ikinci oğul riski/.test(t)));
/* ötme + vızıldama 30 dk içinde → Yüksek */
r=run(toot.concat(q.map(x=>Object.assign({},x,{t:x.t+20*M}))));assert.strictEqual(r.quackYuksek,true);
r=run(toot.concat(q.map(x=>Object.assign({},x,{t:x.t+45*M}))));assert.strictEqual(r.quackYuksek,false);
/* işçi 200–250 Hz sürekli (uzun) vızıldama değil */
assert.strictEqual(run([0,1,2,3,4].map(s=>({t:N+s*1000,hz:230,sureMs:5000}))).quack,false);
/* anasızlık: 350 Hz sürekli, tabana göre +8 dB, 10 dk → şüphe; skoru etkilemez */
const base=[];for(let m=0;m<60;m++)base.push({t:N-120*M+m*M,hz:230,dbRel:0});
const qs=[];for(let m=0;m<=11;m++)qs.push({t:N+m*M,hz:350,dbRel:8});
r=run(base.concat(qs));assert.strictEqual(r.anasizSes,true);assert.strictEqual(r.piping,false);
/* 9 dk yetmez; artış yoksa yok */
r=run(base.concat(qs.slice(0,9)));assert.strictEqual(r.anasizSes,false);
r=run(base.concat(qs.map(x=>Object.assign({},x,{dbRel:1}))));assert.strictEqual(r.anasizSes,false);
/* erkek 170 Hz uğultusu anasızlık değil */
r=run(base.concat(qs.map(x=>Object.assign({},x,{hz:170}))));assert.strictEqual(r.anasizSes,false);
/* ses sınıfları: kaynaklı liste */
assert.ok(C.SES_SINIFLARI.length>=16);assert.ok(C.SES_SINIFLARI.find(x=>x.id==='quacking').kaynak.includes('Michelsen'));
console.log('k146-ses-kurallari: ok');

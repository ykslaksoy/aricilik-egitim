const assert=require('assert'),fs=require('fs'),vm=require('vm');
const store={};const ls={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
let ev=[];const w={localStorage:ls,dispatchEvent:e=>ev.push(e.type),addEventListener(){},Event:function(t){this.type=t},CustomEvent:function(t){this.type=t},
  SuperAriDemo:{colony:{ORS_SENSOR:{aniKayipKg:3,aniKayipSaat:6},ogulSkor:()=>({ekipBildirim:['piping','quacking','ogul_ani','ors_orta','ani_kayip']})}}};
w.window=w;vm.createContext(w);w.Event=function(t){this.type=t};
vm.runInContext(fs.readFileSync(__dirname+'/../kritik-alarm.js','utf8'),w);
const K=w.SuperAriKritik;
// sabit kart: piping, tekrar yok, düzelince kapanmaz
K.sesten(5,{piping:true,quack:true,ogulAni:true},'ap1');K.sesten(5,{piping:true},'ap1');
let L=K.liste();assert.strictEqual(L.length,3);assert.deepStrictEqual(L.map(x=>x.kod).join(),'ogul_ani,piping,quacking');
K.sesten(5,{},'ap1');L=K.liste();assert.strictEqual(L.length,3);assert.ok(L.every(x=>x.iyilesti&&/düzeldi/.test(x.metin)));
assert.ok(L.every(x=>!/Hz/.test(x.metin+x.baslik)));
// ilk oluşum ekibe (3), tekrar değil
assert.strictEqual(K._kuyruk().filter(x=>x.olay==='olustu').length,3);
// Tamam: kapatan kaydı + ekip bildirimi
const v=K.tamam(L[1].id,'Ayşe');assert.strictEqual(v.kapandi.kim,'Ayşe');assert.ok(/^Kapatan: Ayşe, /.test(K.kapatanMetni(v)));
assert.strictEqual(K.liste().length,2);const q=K._kuyruk().filter(x=>x.olay==='kapatildi');assert.strictEqual(q.length,1);assert.strictEqual(q[0].metin,'Ayşe kontrol etti, kapattı');
assert.ok(K.gecmis().some(x=>x.olay==='tamam'&&x.kim==='Ayşe'));
// listede olmayan uyarı: ekibe gitmez ama kapatan kaydı tutulur
const b=K.ac({kod:'batarya_7',anahtar:'d1'});const n0=K._kuyruk().length;K.tamam(b.id,'Ali');assert.strictEqual(K._kuyruk().length,n0);assert.ok(K.gecmis().some(x=>x.kim==='Ali'&&x.ekibe===false));
// ORS orta: yalnız düşük→orta, günde bir
assert.ok(K.orsDegisim(7,'dusuk','orta',45));assert.strictEqual(K.orsDegisim(7,'dusuk','orta',45),null);assert.strictEqual(K.orsDegisim(8,'orta','orta',50),null);
// ani kayıp
const t=Date.now();assert.strictEqual(K.aniKayip([{t:t-3*36e5,kg:40},{t:t,kg:36.5}]),true);assert.strictEqual(K.aniKayip([{t:t-3*36e5,kg:40},{t:t,kg:38}]),false);assert.strictEqual(K.aniKayip([]),null);
console.log('k161 kritik/ekip ok');

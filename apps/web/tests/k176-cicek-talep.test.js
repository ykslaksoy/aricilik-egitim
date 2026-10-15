/* k175: çiçek takvimi talebi — il başına tek RPC, eksik il için bulut sorgusu (hazırlanınca kendiliğinden görünür), uygulamada kaynak yok. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const st={};const calls=[];let rows=[];
const c={rpc:(n,a)=>{calls.push([n,a.p_il]);return Promise.resolve({data:'bekliyor'})},from:()=>{const q={select:()=>q,eq:()=>q,then:(f)=>Promise.resolve({data:rows}).then(f)};return q;}};
const w={localStorage:{getItem:k=>k in st?st[k]:null,setItem:(k,v)=>{st[k]=String(v)},removeItem:k=>{delete st[k]}},addEventListener(){},dispatchEvent(){},Event:function(){},setTimeout:(f)=>0,console,SuperAriBulut:{client:()=>Promise.resolve(c)}};w.window=w;
vm.createContext(w);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','cicek-veri.js'),'utf8'),w);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','cicek.js'),'utf8'),w);
const C=w.SuperAriCicek;
(async()=>{
 assert.strictEqual(C.donem({il:'Sakarya',ilce:'Sapanca'},5).metin,'Veri yok');
 C.donem({il:'Sakarya'},5);C.secildi('sakarya');C.secildi('Rize');
 await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.deepStrictEqual(calls,[['sa_takvim_iste','Sakarya']],'il başına tek talep; takvimi olan il için yok');
 const src=fs.readFileSync(path.join(__dirname,'..','cicek.js'),'utf8');assert.ok(!/kaynak/.test(src.match(/select\('([^']*)'\)/)[1]),'uygulama kaynak sütununu çekmez');
 const mig=fs.readFileSync(path.join(__dirname,'..','..','..','supabase','migrations','20261015200000_cicek_talep_akisi.sql'),'utf8');
 assert.ok(/takvim_eksik_il_tek on public\.takvim_eksik \(lower\(il\)\)/.test(mig)&&/on conflict \(\(lower\(il\)\)\) do update set istek_sayisi/.test(mig)&&/'kaynak_yok'/.test(mig)&&/cicek-takvim-isle/.test(mig));
 console.log('k175 ok');
})().catch(e=>{console.error(e);process.exit(1)});

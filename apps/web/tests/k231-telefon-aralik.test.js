/* koloni-231: Boyut yedekleri arası en az 240 dk (4 saat) varsayılan; uzman tahmini, yönetici değiştirir. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),r=f=>fs.readFileSync(path.join(W,f),'utf8');
const mem={};globalThis.localStorage={getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]},key:i=>Object.keys(mem)[i],get length(){return Object.keys(mem).length}};
globalThis.SuperAriYedek={collect:()=>({createdAt:new Date().toISOString(),keys:{}})};
require(path.join(W,'telefon-yedek.js'));
const T=globalThis.SuperAriTelefonYedek;
assert.deepStrictEqual(T.ayar(),{boyutKb:200,aralikDk:240},'varsayılan 200 KB / 240 dk');
mem['superari.bulut.telYedek']=JSON.stringify({ayar:{boyutKb:50,aralikDk:10}});
assert.deepStrictEqual(T.ayar(),{boyutKb:50,aralikDk:10},'kayıtlı değere uyar');
const m=fs.readFileSync(path.join(W,'../../supabase/migrations/20261017170000_k231_telefon_aralik_240.sql'),'utf8');
assert.ok(/set default 240/.test(m)&&/telefon_aralik_dk = 240/.test(m));
const p=r('../yonetici/panel13.js');
assert.ok(/telefon_aralik_dk \|\| 240/.test(p)&&/data-y-aralik.*240|value = 240/.test(p)&&/Uzman tahmini/.test(p));
const src=r('telefon-yedek.js');
assert.ok(/aralikDk: 240/.test(src));
console.log('telefon-aralik-240 ok');

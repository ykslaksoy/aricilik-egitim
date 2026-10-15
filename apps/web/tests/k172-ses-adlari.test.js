/* k172: ses türleri «Türkçe (İngilizce)»; eski «Vızıldama» kalmadı; uyarı metinlerinde Hz/dB yok. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),Y=path.join(W,'..','yonetici');
const files=[W+'/demo-data.js',W+'/kritik-alarm.js',Y+'/demo-data.js',Y+'/kritik-alarm.js',Y+'/panel3.js'];
files.forEach(f=>{const s=fs.readFileSync(f,'utf8');assert.ok(!/[Vv]ızıldama/.test(s),f+' vızıldama');assert.ok(!/\(Quacking\) \(Quacking\)|\(Piping\) \(Piping\)/.test(s),f+' çift');});
const d=fs.readFileSync(W+'/demo-data.js','utf8'),k=fs.readFileSync(W+'/kritik-alarm.js','utf8');
['Ana Arı Ötmesi (Piping)','Vakvaklama (Quacking)','İşçi Arı Ötmesi (Worker Piping)','Oğul Anı Sesi (Swarming)','Anasızlık Uğultusu (Queenless Roar)'].forEach(n=>assert.ok(d.includes('"ad": "'+n+'"'),n));
const ad=k.slice(k.indexOf('var AD = {'),k.indexOf('};',k.indexOf('var AD = {')));
assert.ok(ad.includes("['Vakvaklama (Quacking)'")&&ad.includes("['Ana Arı Ötmesi (Piping)'")&&ad.includes("['Oğul Anı Sesi (Swarming)'"));
assert.ok(!/Hz|dB/.test(ad),'uyarı kartlarında Hz/dB yok');
console.log('k172 ok');
/* k173: Çıkmış Ana Ötmesi (Tooting) — Piping alt türü, uydurma eşik yok; birlikte uyarısında Tooting adı. */
{const vm=require('vm');const w={localStorage:{getItem:()=>null,setItem(){},removeItem(){}},addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);vm.runInContext(d,w);
const L=w.SuperAriDemo.colony.SES_SINIFLARI,t=L.find(x=>x.id==='cikmis_ana');assert.ok(t&&t.ad==='Çıkmış Ana Ötmesi (Tooting)'&&t.ust==='tooting'&&t.hzMin==null&&t.hzMax==null);
assert.strictEqual(L.find(x=>x.id==='tooting').ad,'Ana Arı Ötmesi (Piping)');
assert.ok(d.includes("hem Çıkmış Ana Ötmesi (Tooting) hem de")&&d.includes("'Sensör: Çıkmış Ana Ötmesi (Tooting) ve Vakvaklama (Quacking) birlikte"));console.log('k173 ok');}

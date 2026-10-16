/* k205: nem tek kaynak — tüm kullanım yerleri Ölçüm kuralları nem anahtarlarına bağlı. */
const assert=require('assert'),vm=require('vm'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),r=f=>fs.readFileSync(path.join(W,f),'utf8');
const ls={getItem:()=>null,setItem(){},removeItem(){},key:()=>null,length:0};
const w={localStorage:ls,addEventListener(){},removeEventListener(){},dispatchEvent(){},CustomEvent:function(){},Event:function(){},console};w.window=w;w.self=w;vm.createContext(w);
vm.runInContext(r('demo-data.js'),w);const C=w.SuperAriDemo.colony,T=Object.assign({},C.ORS_SENSOR);
const k=v=>(C.nemDurum(v,T)||{}).k;assert.strictEqual(k(54),'kritik');assert.strictEqual(k(57),'erken');assert.strictEqual(k(60),'normal');assert.strictEqual(k(75),'normal');assert.strictEqual(k(78),'ustunde');assert.strictEqual(k(81),'kirec');assert.strictEqual(C.nemDurum(null,T),null);
const T2=Object.assign({},T,{nemKritikAlt:40,nemNormalAlt:45,nemNormalUst:65,nemKirecUst:70});assert.strictEqual(C.nemDurum(42,T2).k,'erken');assert.strictEqual(C.nemDurum(68,T2).k,'ustunde');assert.strictEqual(C.nemDurum(55,T2).k,'normal');
assert.ok(!/\d/.test(['kritik','erken','normal','ustunde','kirec'].map(x=>JSON.stringify(C.nemDurum({kritik:30,erken:57,normal:65,ustunde:78,kirec:90}[x],T).etiket)).join('')),'etikette sayı yok');
const m=C.ogulSkorMerge({sensor:{nemNormalUst:70,nemKirecUst:78,nemHigh:99,kirecNemYuksek:99}}).sensor;assert.strictEqual(m.nemHigh,70);assert.strictEqual(m.kirecNemYuksek,78);
const d=r('demo-data.js');assert.ok(/rh > T\.nemNormalUst\) \{ \/\* koloni-205/.test(d)&&!/rh > T\.nemHigh/.test(d));assert.ok(/rh > T\.nemKirecUst; \/\* koloni-205/.test(d)&&!/>= T\.kirecNemYuksek/.test(d));
const kv=r('kovan.html');assert.ok(!/humid < 50|humid > 75/.test(kv));assert.ok(/nemDurum\(humid\)/.test(kv)&&/title="Nem: Veri yok"/.test(kv));
const y=f=>fs.readFileSync(path.join(W,'../yonetici',f),'utf8');
assert.ok(!/nemMaxYuzde/.test(y('panel2.js')),'Eşikler: ayrı nem üst sınırı yok');assert.ok(/k === 'nemHigh' \|\| k === 'kirecNemYuksek'\) return ''/.test(y('panel.js')));
assert.ok(!/'nemHigh'\]|'kirecNemYuksek'\]/.test(y('panel10.js')));assert.ok(/\{s:\(\\w\+\)\\\}/.test(y('panel4.js'))&&/Sağlık kuralları/.test(y('panel4.js')));
assert.strictEqual(d,y('demo-data.js'));assert.strictEqual(JSON.parse(r('version.json')).version,'koloni-217');
console.log('k205-nem-bagla ok');

/* koloni-219: toplu aç/kapa — Tümünü aç/kapat + grup; 22 kuralın hepsi bir kartta anahtarlı. */
const assert=require('assert'),fs=require('fs'),path=require('path');
const W=path.join(__dirname,'..'),p=fs.readFileSync(path.join(W,'../yonetici/panel10.js'),'utf8');
assert.ok(/data-kkall="0">Tümünü kapat/.test(p)&&/data-kkall="1">Tümünü aç/.test(p));
assert.ok(/!ac && !confirm\(/.test(p),'kapatmada onay');
const kg=eval(p.match(/var KG = (\[[\s\S]*?\]\]\]);/)[1]),ids=kg.flatMap(g=>g[1]);
assert.deepStrictEqual(kg.map(g=>g[0]),['Sıcaklık','Nem','Ağırlık','Ses','Titreşim','IR','Cihazlar','Uçuş','Koloni durumu','Oğul riski']); /* koloni-247: Oğul riski grubu */
const d=fs.readFileSync(path.join(W,'demo-data.js'),'utf8'),K=[...d.match(/var KURALLAR = \[([\s\S]*?)\];/)[1].matchAll(/\['(\w+)'/g)].map(m=>m[1]);
assert.strictEqual(K.length,42); /* koloni-247: +ogulYerTahmin · koloni-258: +ogulMemeYerBilinmiyor */assert.deepStrictEqual([...ids].sort(),[...K].sort(),'gruplar = tüm kurallar');
const kk=new Set([...p.matchAll(/kk: \[([^\]]*)\]/g)].flatMap(m=>[...m[1].matchAll(/'(\w+)'/g)].map(x=>x[1])));
K.forEach(id=>assert.ok(kk.has(id),'anahtar kartta: '+id));
console.log('k219-kural-toplu ok');

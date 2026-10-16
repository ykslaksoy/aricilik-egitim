const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('k217: uçuş arı cinsine göre',()=>{const d=r('demo-data.js'),h=r('hava-sayfa.js'),p=fs.readFileSync(path.join(__dirname,'../../yonetici/panel10.js'),'utf8');
for(const g of ['Genel','Kafkas','Karniyol','Karadeniz'])for(const k of ['UygunC','KismenC','UygunRuzgar','KismenRuzgar','YagisMm']){assert.ok(d.includes('ucus'+g+k+':'),g+k);assert.ok(p.includes("+ UT, 's', 'ucus"+g+k+"'"),g+k);}
assert.ok(h.includes('C.ucusEsik(C.apiaryBreed('));assert.ok(!/d\.hi >= 15/.test(h));assert.equal(JSON.parse(r('version.json')).version,'koloni-220');});

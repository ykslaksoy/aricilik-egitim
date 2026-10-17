const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('k215: mevsime duyarlı hasat + km/sa',()=>{const s=r('hava-sayfa.js');assert.ok(s.includes("hasat: true"));assert.ok(s.includes('Uçuşa uygun günler'));assert.ok(!/Akım azalır; son hasat/.test(s));
for(const f of ['hava-sayfa.js','app.js','forage-yield-estimate.js'])assert.ok(!/km\/s(?!a)/.test(r(f)),f);assert.ok(Number(String(JSON.parse(r('version.json')).version).replace(/^koloni-/,''))>=215,'sürüm en az koloni-215');});

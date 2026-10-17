const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('k209: Sıcaklık/Nem ana değer son okuma',()=>{const s=r('kovan.html');assert.ok(s.includes("'%' + Math.round(Number(sN.nem)) + ' nem'"));assert.ok(s.includes('s-val2'));assert.equal(JSON.parse(r('version.json')).version,'koloni-232');});

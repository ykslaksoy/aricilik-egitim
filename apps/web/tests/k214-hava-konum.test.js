const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('k214: Hava Konum düğmesi',()=>{assert.ok(r('nav.js').includes("'hava.html': { t: 'Konum', fn: 'SuperAriHavaKonum' }"));assert.ok(r('hava-sayfa.js').includes('window.SuperAriHavaKonum'));assert.ok(r('arilik.html').includes("location.hash !== '#konum'"));assert.equal(JSON.parse(r('version.json')).version,'koloni-233');});

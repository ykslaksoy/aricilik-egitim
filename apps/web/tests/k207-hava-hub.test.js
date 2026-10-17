const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const W=path.join(__dirname,'..');const r=f=>fs.readFileSync(path.join(W,f),'utf8');
test('k207: Hava girişleri hub (hava.html) açar',()=>{
  assert.ok(r('ana.html').includes("label: 'Hava', badge: weatherBadgeFromDom(), tone: 'blue', href: 'hava.html'"));
  assert.ok(!/hava-raporu\.html/.test(r('kapsam.js')));
  assert.ok(r('nav.js').includes("a.href = 'hava.html'"));
  assert.ok(r('raporlar.html').includes('href="hava.html" aria-label="Hava"'));
  assert.ok(r('bugun.html').includes('href="hava.html"'));
  assert.equal(JSON.parse(r('version.json')).version,'koloni-230');
});

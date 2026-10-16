const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const W=path.join(__dirname,'..');
test('k190: sa-early.css iPhone ilk çizim ölçüleri',()=>{const c=fs.readFileSync(path.join(W,'sa-early.css'),'utf8');
assert.match(c,/margin-top:16px!important/);assert.match(c,/height:36px!important/);assert.match(c,/saEarlyReveal/);});
test('k190: ana/bakım/hava/kovanlar/kovan head içinde sa-early.css',()=>{for(const f of ['ana.html','bakim.html','hava.html','kovanlar.html','kovan.html','bakim-yap.html']){const h=fs.readFileSync(path.join(W,f),'utf8');const i=h.indexOf('sa-early.css');assert.ok(i>0&&i<h.indexOf('</head>'),f);assert.ok(!/height: 48px; padding: 16px 22px 0/.test(h),f);}});
test('k190: version.json',()=>{const v=JSON.parse(fs.readFileSync(path.join(W,'version.json'),'utf8'));assert.equal(v.version,'koloni-190');assert.ok(Date.now()-Date.parse(v.at)<864e5);});

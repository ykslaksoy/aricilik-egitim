const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const W=path.join(__dirname,'..');const r=f=>fs.readFileSync(path.join(W,f),'utf8');
test('k191: Ana yağmur satırı ilk çizimde HTML içinde, sabit yükseklik',()=>{const h=r('ana.html');assert.ok(h.indexOf('id="forecastRain"')<h.indexOf('id="muayeneHint"'));assert.match(h,/\.forecast-rain\{[^}]*height:13px/);});
test('k191: Ana/Hava kutucuk rozeti boşken yer tutucu',()=>{assert.match(r('ana.html'),/visibility:hidden">—<\/div>/);assert.match(r('hava-sayfa.js'),/visibility:hidden">—<\/div>/);});
test('k191: Hava 10 gün yüklenirken iskelet (hata metni değil)',()=>{const j=r('hava-sayfa.js');assert.match(j,/hvLoading/);assert.match(j,/hv-skel/);});
test('k191: version.json',()=>{const v=JSON.parse(r('version.json'));assert.equal(v.version,'koloni-194');});

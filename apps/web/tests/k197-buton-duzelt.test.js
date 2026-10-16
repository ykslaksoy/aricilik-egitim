const test=require('node:test');const assert=require('node:assert');const fs=require('fs');const path=require('path');
const W=path.join(__dirname,'..');const r=f=>fs.readFileSync(path.join(W,f),'utf8');
test('k197: version',()=>assert.equal(JSON.parse(r('version.json')).version,'koloni-226'));
test('k197: stok özet kutuları süzer',()=>{const s=r('stok.html');for(const k of['kalem','azalan','tukenen'])assert.ok(s.includes("href: '#f-"+k+"'"));assert.ok(s.includes('function renderFilter'));assert.ok(!/l: '(Kalem|Azalan|Tükenen)', href: '#'[,\s}]/.test(s));});
test('k197: petek kamera izni uyarısı',()=>{const s=r('petek-tarama.js');assert.ok(s.includes('Kamera izni verilmedi'));assert.ok(s.includes('await ensureCamera()'));});
test('k197: bakim-yap QR kovansız da bağlı',()=>{const s=r('bakim-yap.html');assert.ok(s.indexOf("getElementById('byQr')")<s.indexOf("if (!h)"));});
test('k197: giriş/onay boş form uyarısı',()=>{assert.ok(r('giris.html').includes('form-uyari.js'));assert.ok(r('onay.html').includes('form-uyari.js'));assert.ok(r('form-uyari.js').includes('E-posta adresinizi yazın'));});
test('k197: foraj geç yüklenince arılık ekle kırılmaz',()=>assert.ok(r('ariliklar.html').includes("typeof F.clampRadius !== 'function'")));

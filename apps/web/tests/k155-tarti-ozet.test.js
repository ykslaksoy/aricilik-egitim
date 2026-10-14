const assert=require('assert'),fs=require('fs'),path=require('path');
const k=fs.readFileSync(path.join(__dirname,'..','kovanlar.html'),'utf8');
assert.ok(!/h\.weightKg != null \? Number\(h\.weightKg\)/.test(k),'Ort. kg kovan kartı tahmininden hesaplanmaz');
assert.ok(k.includes("'⚖ Kovanlar henüz hiç tartılmadı'"));
assert.ok(k.includes("a + ' önce'")&&k.includes("' · son tartım ' + tartiAgo(t.lastRec)"));
const kv=fs.readFileSync(path.join(__dirname,'..','kovan.html'),'utf8');
assert.ok(/display:flex;align-items:center;justify-content:center;gap:8px;"><span aria-hidden="true">⚖<\/span><span>Elle tartım gir/.test(kv));
console.log('k155 ok');

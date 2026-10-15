const assert=require('assert'),fs=require('fs'),path=require('path');const W=path.join(__dirname,'..');
['cihazlar.html','ayarlar-eski.html','device-runtime.js'].forEach(f=>{const s=fs.readFileSync(path.join(W,f),'utf8');assert.ok(!/akü|Akü/.test(s),f);assert.ok(s.includes('Kovan bataryası')&&s.includes('Gateway bataryası'),f);});
console.log('k158 ok');

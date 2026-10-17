const fs=require('fs'),path=require('path'),assert=require('assert');const r=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const k=r('koloni.js'),d=r('demo-data.js');
assert.ok(d.includes('function normalizeQueenCert(')&&d.includes("hasOwnProperty.call(patch, 'queenCert')"),'ana kaydına belge');
assert.ok(k.includes('📄 Belgeli ana arı (isteğe bağlı)')&&k.includes('name="certNo"')&&k.includes('name="certDate"'),'form alanları');
assert.ok(k.includes("'belge:' + curQObj.id")&&r('bulut.js').includes("st.keys['queens:' + String(rid).slice(6)]"),'belge fotoğrafı eşitleme');
assert.ok(k.includes('📄 Belgeli</span>'),'kart rozeti');
assert.ok(/function lineCat\(h\) \{\s*var c = C\(\); if \(!h \|\| !String\(h.breed \|\| ''\).trim\(\) \|\| h.breedEstimated\) return 'hatsiz';/.test(k),'Saf Hat sınıfı değişmedi');
console.log('k257 ok');

const assert = require('assert'); const fs = require('fs'); const path = require('path');
const bp = fs.readFileSync(path.join(__dirname, '..', 'bakim-plan.js'), 'utf8');
const dd = fs.readFileSync(path.join(__dirname, '..', 'demo-data.js'), 'utf8');
assert.ok(/data-bo-cellhas/.test(bp) && /<option value="0">Meme yok<\/option><option value="1">Meme var<\/option>/.test(bp), 'Meme yok / Meme var seçimi');
assert.ok(/value="0" data-bo-celln/.test(bp) && /min="0" max="60"/.test(bp), 'sayı 0 başlar');
['Çerçeve alt kenarı (oğul memesi)', 'Petek ortası (sessiz ana değişimi)', 'Acil meme (yatay hücreden dönüştürülmüş)', 'value="bilinmiyor">Bilinmiyor'].forEach(function (t) { assert.ok(bp.indexOf(t) >= 0, t); });
assert.ok(/function cellSync\(src\)/.test(bp) && /cn\.disabled = !has/.test(bp), 'Meme yok: sayı kilitli');
assert.ok(/Meme nerede\? Yerini seçin\./.test(bp), 'yer zorunlu');
assert.ok(/\['yok', 'ogul', 'yenileme', 'acil', 'bilinmiyor'\]/.test(dd) && /unknownCell:/.test(dd), 'bilinmiyor kaydı + durum');
assert.ok(/var anyCell = !!\(st && st\.swarmCell\);/.test(dd), 'yalnız oğul memesi ORS bypass');
assert.strictEqual(dd, fs.readFileSync(path.join(__dirname, '..', '..', 'yonetici', 'demo-data.js'), 'utf8'), 'yönetici kopyası aynı');
console.log('k257 ok');
/* koloni-258: «Bilinmiyor» varsayımı yönetici aç/kapa + Yapılacaklar */
assert.ok(/kuralAcik\('ogulMemeYerBilinmiyor', h\.apiaryId\)/.test(dd), 'kural aç/kapa');
const p10b = fs.readFileSync(path.join(__dirname, '..', '..', 'yonetici', 'panel10.js'), 'utf8');
assert.ok(/kk: \['ogulMemeYerBilinmiyor'\]/.test(p10b), 'yönetici kartı');
const migb = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', 'migrations', '20261018050000_k258_ana_memesi_yer.sql'), 'utf8');
assert.ok(/yapilacaklar/.test(migb) && /uzman tahmini/.test(migb), 'Yapılacaklar');

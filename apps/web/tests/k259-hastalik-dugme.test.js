/* koloni-259 önizleme: doğrudan «🔍 Hastalık tahmini» — Kovan detay (Kolay muayene altında) + Sağlık (kapsamdaki kovan seçilir). */
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const kv = fs.readFileSync(path.join(__dirname, '..', 'kovan.html'), 'utf8');
const sg = fs.readFileSync(path.join(__dirname, '..', 'saglik.html'), 'utf8');
assert.ok(/data-hz-kovan="' \+ escapeHtml\(hive\.id\)/.test(kv) && /closest\('\[data-hz-kovan\]'\)/.test(kv) && /hastalik-tahmin\.js/.test(kv), 'Kovan detay düğmesi');
assert.ok(/data-hz-saglik/.test(sg) && /linear-gradient\(180deg,#fff6df/.test(sg) && /N\.pickHive\('🔍 Hastalık tahmini'/.test(sg) && /hastalik-tahmin\.js/.test(sg), 'Sağlık düğmesi + kapsam');
assert.ok(/t: 'Hastalık tahmini'/.test(sg), '＋ Kayıt listesinde');
console.log('k259 ok');
assert.ok(!/backdrop-filter/.test(require('fs').readFileSync(require('path').join(__dirname,'..','nav.js'),'utf8')), 'kovan seçici bulanık değil');

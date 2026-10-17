/* koloni-250: Oğul sayfasında «Mevsim dışı» düğmesi Orta'nın solunda; bölgesi oğul mevsimi dışında olan kovan sayısı, duzey=mevsimdisi listesi. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const U = fs.readFileSync(path.join(__dirname, '..', 'uyarilar.html'), 'utf8');
assert.ok(/'Mevsim dışı'[\s\S]{0,200}\['dusuk', 'orta', 'yuksek', 'kritik'\]/.test(U), 'Orta’nın solunda (3×2: Uyarılar · Mevsim dışı · Düşük / Orta · Yüksek · Kritik)');
assert.ok(/duzey=mevsimdisi/.test(U) && /season\.phase === 'disi'/.test(U));
assert.ok(/\.badge\.mdblue \{/.test(U), 'kendi sakin rengi');
console.log('k250 ok');

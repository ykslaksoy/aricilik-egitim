/* koloni-250: Oğul sayfasında «Mevsim dışı» düğmesi Orta'nın solunda; bölgesi oğul mevsimi dışında olan kovan sayısı, duzey=mevsimdisi listesi. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const U = fs.readFileSync(path.join(__dirname, '..', 'uyarilar.html'), 'utf8');
assert.ok(/l\.key === 'orta' \? mdChip : ''/.test(U), 'Orta’nın solunda');
assert.ok(/duzey=mevsimdisi/.test(U) && /season\.phase === 'disi'/.test(U));
assert.ok(/\.og-lv a\.og-md \{/.test(U), 'kendi sakin rengi');
console.log('k250 ok');

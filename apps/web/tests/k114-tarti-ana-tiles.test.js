/* k114: Tartı kovan ızgarası Ana karo — sev-check turuncu çerçeve yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const kv = fs.readFileSync(path.join(__dirname, '..', 'kovanlar.html'), 'utf8');
assert.ok(kv.includes('KV.anaHiveTileHtml') && kv.includes('view === \'tarti\''), 'tarti uses ana tiles');
assert.ok(!kv.includes("sev: x.old && liveT ? 'check'"), 'tarti no sev-check border');
assert.ok(kv.includes("badgeTone = x.kg === 'Tartı yok' ? 'tan'"), 'tartı yok tan badge like Ana');
console.log('k114-tarti-ana-tiles ok');

/* k124: Geri ◀ ve eylem ▶ aynı boy/merkez — CSS üçgen */
const assert = require('assert');
const nav = require('fs').readFileSync(require('path').join(__dirname, '..', 'nav.js'), 'utf8');
assert.ok(nav.includes('k124') && nav.includes('.sa-act-row>:first-child .sa-act-tri{border-right:14px solid #4a2f1a'), 'left triangle');
assert.ok(nav.includes('.sa-act-row>.ak-start>span[aria-hidden]{border-left:14px solid #4a2f1a'), 'right triangle incl. Muayene');
console.log('k124 ok');

const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
test('k179 varroa 122–396, tek çalışma (k180: bilgi seviyesi), diğerleri aynı', () => {
  for (const f of ['../demo-data.js', '../../yonetici/demo-data.js']) {
    const s = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const o = JSON.parse(s.match(/\{"id": "stres_varroa"[^}]*\}/)[0]);
    assert.equal(o.hzMin, 122); assert.equal(o.hzMax, 396); assert.equal(o.seviye, 'bilgi'); // k180: hatırlatma
    assert.equal(o.etiket, 'tek çalışma / model özelliği');
    assert.match(o.kaynak, /10\.1007\/s10493-026-01179-y/); assert.match(o.yapi, /tek başına eşik değil/);
    for (const id of ['yagma', 'kumelenme']) { const x = JSON.parse(s.match(new RegExp('\\{"id": "' + id + '"[^}]*\\}'))[0]); assert.equal(x.hzMin, null); }
  }
});

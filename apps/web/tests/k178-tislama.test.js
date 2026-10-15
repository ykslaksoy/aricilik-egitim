const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
test('k178 tıslama 500–20000, kaynak zayıf, tam künye', () => {
  for (const f of ['../demo-data.js', '../../yonetici/demo-data.js']) {
    const s = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const o = JSON.parse(s.match(/\{"id": "tislama"[^}]*\}/)[0]);
    assert.equal(o.hzMin, 500); assert.equal(o.hzMax, 20000); assert.equal(o.seviye, 'kayit'); assert.equal(o.zayif, true);
    assert.match(o.kaynak, /10\.1051\/apido:2008027/); assert.match(o.kaynak, /10\.1371\/journal\.pone\.0118708/);
  }
});

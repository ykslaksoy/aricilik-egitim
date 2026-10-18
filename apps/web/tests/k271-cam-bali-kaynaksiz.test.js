const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const r = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('k271: Çam balı notunda kullanıcıya kaynak adı yok', () => {
  const s = r('hava-sayfa.js');
  assert.match(s, /Kızılçam salgı \(basra\) akımı Ağustos–Kasım sürer; uçuş ve toplama olur\./);
  const strs = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(strs, /MAYBİR|ZMO|Küre|Günbey|AAE/);
});

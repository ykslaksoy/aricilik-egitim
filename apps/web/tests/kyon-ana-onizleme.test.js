/* Yönetici ana sayfa önizleme — dosya varlığı ve index yüklemesi */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..', '..');
const yon = path.join(R, 'apps/yonetici');

assert.match(fs.readFileSync(path.join(yon, 'index.html'), 'utf8'), /ana-sayfa\.js\?v=yon-ana-1/);
const js = fs.readFileSync(path.join(yon, 'ana-sayfa.js'), 'utf8');
assert.match(js, /yon-ana/);
assert.match(js, /yon-mock=1/);
assert.match(fs.readFileSync(path.join(yon, 'panels.css'), 'utf8'), /\.yon-home/);

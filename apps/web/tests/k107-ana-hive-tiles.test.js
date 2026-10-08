/* k107: Kovanlar sayfası kovan döşemeleri = Ana .grid + .tile + ahşap kovan */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const css = fs.readFileSync(path.join(root, 'ana-hive-tiles.css'), 'utf8');
assert.ok(css.includes('.grid.ana-hive-grid') && css.includes('.tile-label') && css.includes('.hive-lid'));
assert.ok(css.includes('grid-template-columns: repeat(3'));

const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('function anaHiveTileHtml'));
assert.ok(ks.includes("class=\"tile") && ks.includes('tile-label'));

const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
assert.ok(kv.includes('ana-hive-tiles.css'));
assert.ok(kv.includes('class="grid ana-hive-grid"') && kv.includes('anaHiveTileHtml'));
assert.ok(!kv.includes('anaHiveHtml({ num:'), 'kovan listesi doğrudan anaHiveHtml kullanmamalı');

const ak = fs.readFileSync(path.join(root, 'bakim-akis.html'), 'utf8');
assert.ok(ak.includes('KS.anaHiveHtml({ num:') && ak.includes('class="tile'));

console.log('k107-ana-hive-tiles ok');

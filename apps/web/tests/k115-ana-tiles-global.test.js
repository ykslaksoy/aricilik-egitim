/* k115: Kapsam/Ana modül kovan döşemeleri — ana-hive-tiles.css, ana-hive-grid, ks-tile yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const mustLinkAnaTiles = [
  'kovanlar.html',
  'cihazlar.html'
];

const mustNotKsTileClass = mustLinkAnaTiles.concat([]);

mustLinkAnaTiles.forEach(function (file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(html.includes('ana-hive-tiles.css'), file + ' must link ana-hive-tiles.css');
  assert.ok(html.includes('ana-hive-grid'), file + ' must use ana-hive-grid');
});

mustNotKsTileClass.forEach(function (file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(!/class="[^"]*ks-tile/.test(html), file + ' must not use class="ks-tile" for hive grids');
  assert.ok(!/class='[^']*ks-tile/.test(html), file + ' must not use class=\'ks-tile\'');
});

const css = fs.readFileSync(path.join(root, 'ana-hive-tiles.css'), 'utf8');
assert.ok(css.includes('body.sa-health-tiles'), 'sev borders scoped to sa-health-tiles');
assert.ok(css.includes('gap: 5px'), 'grid gap matches Ana');

const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('o.sevBorder'), 'anaHiveTileHtml only adds sev border when sevBorder');

console.log('k115-ana-tiles-global ok');

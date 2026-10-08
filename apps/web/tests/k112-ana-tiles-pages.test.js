/* k112: Ana-linked module picker grids use ana-hive-tiles + anaHiveTileHtml / anaModuleTile */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('function anaModuleTile'));
assert.ok(ks.includes('function anaHiveTileHtml'));

const pages = [
  { file: 'kovanlar.html', grid: 'class="grid ana-hive-grid"', helper: 'anaHiveTileHtml', forbid: 'ks-tile' },
  { file: 'cihazlar.html', grid: 'grid ana-hive-grid', helper: 'anaModuleTile', forbid: 'ks-tile' }
];

pages.forEach(function (p) {
  const html = fs.readFileSync(path.join(root, p.file), 'utf8');
  assert.ok(html.includes('ana-hive-tiles.css'), p.file + ' links ana-hive-tiles.css');
  assert.ok(html.includes(p.grid), p.file + ' uses Ana hive grid');
  assert.ok(html.includes(p.helper), p.file + ' uses ' + p.helper);
  assert.ok(!html.includes(p.forbid), p.file + ' must not use ' + p.forbid);
});

console.log('k112-ana-tiles-pages ok');

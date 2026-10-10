/* k112: Ana-linked module picker grids use ana-hive-tiles + anaHiveTileHtml / anaModuleTile */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('function anaModuleTile'));
assert.ok(ks.includes('function anaHiveTileHtml'));
assert.ok(ks.includes('topEndWithWeather') && ks.includes('defaultNavChips') && ks.includes('navChipsHtml'));
assert.ok(ks.includes('scopeCardHeadHtml') && ks.includes('bk-scope-page-title'));
const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
assert.ok(kv.includes("view === 'tarti'") && kv.includes('bk: true') && kv.includes('navInCard: true'));
assert.ok(kv.includes('Elle tart') && ks.includes('weatherEndHtml'));
assert.ok(kv.includes('topEnd: topEndChip') || kv.includes('topEndChip'));
assert.ok(kv.includes('tile-act') && kv.includes('data-te-tart'));
assert.ok(kv.includes('ksNavBakim') || kv.includes('Bakım') && kv.includes('navInCard'));
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('k113: tek Geri')); /* k113: kart ici cam Geri kaldirildi */

const pages = [
  { file: 'kovanlar.html', grid: 'class="grid ana-hive-grid"', helper: 'anaHiveTileHtml', forbid: 'ks-tile' },
  { file: 'cihazlar.html', grid: 'grid ana-hive-grid', helper: 'anaModuleTile', forbid: 'ks-tile' }
];

const css = fs.readFileSync(path.join(root, 'ana-hive-tiles.css'), 'utf8');
assert.ok(!css.match(/^\.grid\.ana-hive-grid \.tile\.sev-check/m), 'sev-check must not apply without sa-health-tiles scope');

pages.forEach(function (p) {
  const html = fs.readFileSync(path.join(root, p.file), 'utf8');
  assert.ok(html.includes('ana-hive-tiles.css'), p.file + ' links ana-hive-tiles.css');
  assert.ok(html.includes(p.grid), p.file + ' uses Ana hive grid');
  assert.ok(html.includes(p.helper), p.file + ' uses ' + p.helper);
  assert.ok(!html.includes(p.forbid), p.file + ' must not use ' + p.forbid);
});

console.log('k112-ana-tiles-pages ok');

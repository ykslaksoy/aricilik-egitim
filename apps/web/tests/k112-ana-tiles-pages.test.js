/* k112: Ana-linked module picker grids use ana-hive-tiles + anaHiveTileHtml / anaModuleTile */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('function anaModuleTile'));
assert.ok(ks.includes('function anaHiveTileHtml'));
assert.ok(ks.includes('topEndWithWeather') && ks.includes('defaultNavChips') && ks.includes('navChipsHtml'));
assert.ok(ks.includes('scopeCardHeadHtml') && ks.includes('bk-geri-pill') && ks.includes('bk-scope-page-title'));
assert.ok(ks.includes('navChipsForView') && ks.includes('smartBackChip') && ks.includes('bk-scope-head--bakim'));
assert.ok(ks.includes("view !== 'tarti'") && ks.includes('data-sa-scope-nav-href'));
const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
assert.ok(kv.includes("view === 'tarti'") && kv.includes('bk: true') && kv.includes('navInCard: true'));
assert.ok(kv.includes('Elle tart') && ks.includes('weatherEndHtml'));
assert.ok(kv.includes('topEnd: topEndChip') || kv.includes('topEndChip'));
assert.ok(kv.includes('tile-act') && kv.includes('data-te-tart'));
assert.ok(kv.includes('navChipsForView') && kv.includes("headLayout: view === 'tarti' ? 'tarti' : 'bakim'"));
assert.ok(ks.includes("layout === 'tarti'") && ks.includes('bk-scope-head--tarti'));
assert.ok(!kv.includes("id: 'ksNavBakim'"), 'tarti mount must not hardcode Bakım chip');
assert.ok(!kv.includes('data-te-bakim'), 'tarti tiles must not show Bakım act');
assert.ok(kv.includes('tartiScopeHasScale'), 'hide auto-scale UI when no device in scope');
const ana = fs.readFileSync(path.join(root, 'ana.html'), 'utf8');
assert.ok(ana.includes("from=ana") && ana.includes("key === 'tarti'"));
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('ks-scope-nav-in-card'));

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

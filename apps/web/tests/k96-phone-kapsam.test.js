/* k96: gercek telefonda sahte chrome yok; Tartı = Ana kovan; Kapsam sag kestirme; Cihazlar ses/titresim */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
assert.ok(nav.includes('status-bar,.phone>.phone-notch'));
assert.ok(nav.includes('display:none!important') && nav.includes('isPhoneMobile') && nav.includes('ensureBakimEnd'));
assert.ok(nav.includes('sa-back-row') && nav.includes('calc(96px + env(safe-area-inset-bottom'));
const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(ks.includes('weatherEndHtml') && ks.includes('topEnd'));
assert.ok(ks.includes('if (o.num != null && !o.svg && !o.burn) return anaHiveHtml(o)'));
const css = fs.readFileSync(path.join(root, 'kapsam.css'), 'utf8');
assert.ok(css.includes('.ks-tile .hive-area') && css.includes('.ks-end.weather-temp') && css.includes('ks-end-chip'));
const kv = fs.readFileSync(path.join(root, 'kovanlar.html'), 'utf8');
assert.ok(kv.includes('anaHiveHtml({ num:'));
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(bk.includes('status-bar { display: none'));
assert.ok(bk.includes('96px') || nav.includes('96px'));
const ak = fs.readFileSync(path.join(root, 'bakim-akis.html'), 'utf8');
assert.ok(ak.includes('topExtra: TOGGLE'), 'Muayene Sesli = topExtra → sağ kestirme');
const cih = fs.readFileSync(path.join(root, 'cihazlar.html'), 'utf8');
assert.ok(cih.includes('topEnd:') && cih.includes('Bağlantı') && cih.includes('ks-end-chip'));
assert.ok(cih.includes("k: 'ses'") && cih.includes("k: 'titresim'") && !/k: 'ses_titresim'/.test(cih));
assert.ok(cih.includes("'ses', 'ses_titresim'"));
const dr = fs.readFileSync(path.join(root, 'device-runtime.js'), 'utf8');
assert.ok(dr.includes("ses: 'Ses (mikrofon)'") && dr.includes("titresim: 'Titreşim (ivmeölçer)'"));
assert.ok(dr.includes("tip: 'ses'") && dr.includes("tip: 'titresim'") && dr.includes('tipFamily'));
{
  const g = { localStorage: { getItem: () => 'demo', setItem() {} }, BroadcastChannel: undefined };
  g.window = g; g.global = g;
  require('vm').runInNewContext(dr, g);
  assert.strictEqual(g.SuperAriDevices.tipFamily('ses_titresim') + '|' + g.SuperAriDevices.tipLabel('ses_titresim'), 'ses|Ses (mikrofon)');
}
console.log('k96-phone-kapsam ok');

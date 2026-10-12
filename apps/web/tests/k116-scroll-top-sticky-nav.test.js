/* k116: üstte sabit yok (durum şeridi içerikle kayar), alt menü .phone dibinde sticky; Kapsam başlığı tek satır, kart içi Geri yok */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
assert.ok(nav.includes('.phone{display:flex!important;flex-direction:column!important;overflow-x:hidden!important;overflow-y:auto!important'), 'phone is the scroller');
assert.ok(nav.includes('.phone>nav.tabbar{position:-webkit-sticky!important;position:sticky!important;bottom:0!important'), 'nav sticky bottom');
assert.ok(nav.includes('.phone>.status-bar{position:relative!important;top:auto!important'), 'status strip scrolls');
assert.ok(!/if \(scopeGeriInCard\(\)\) return;/.test(nav), 'Geri not in card');
assert.ok(ks.includes("var layout = 'stacked';") && ks.includes("var geriHtml = '';"), 'one-row header');
console.log('k116 ok');

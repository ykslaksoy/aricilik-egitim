/* k113: alt menu her sayfada dipte sabit; yalniz .screen kayar; tek Geri; Tarti oklari; Muayene basligi sarmaz */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const ks = fs.readFileSync(path.join(root, 'kapsam.js'), 'utf8');
const kc = fs.readFileSync(path.join(root, 'kapsam.css'), 'utf8');
assert.ok(/html\.sa-phone-mobile body\.sa-phone-mobile \.phone\{position:fixed!important;top:0!important;left:0!important;right:0!important;bottom:0!important/.test(nav), 'phone pinned inset 0');
assert.ok(/\.phone>\.screen\{flex:1 1 auto!important;min-height:0!important[^}]*overflow-y:auto!important/.test(nav), 'only screen scrolls');
assert.ok(/\.phone>nav\.tabbar\{position:relative!important[^}]*flex:0 0 auto!important/.test(nav), 'tabbar in flow at bottom');
assert.ok(nav.includes('padding-bottom:calc(10px + env(safe-area-inset-bottom'), 'safe-area under nav');
assert.ok(nav.includes("addEventListener('resize', onFit)") && nav.includes('orientationchange'), 'live adapt listeners');
assert.ok(!/visualViewport\.height/.test(nav), 'no visualViewport height');
assert.ok(ks.includes("var geriHtml = '';") && !ks.includes("'<div class=\"bk-scope-nav-center\">'"), 'no centered glass Geri');
assert.ok(kc.includes('body:not(.sa-page-ana) .bk-scope .arilik-nav'), 'Tarti arrows styled');
assert.ok(nav.includes('.bk-scope-title-row{display:flex!important;flex-wrap:nowrap!important'), 'Muayene head no wrap');
console.log('k113 ok');

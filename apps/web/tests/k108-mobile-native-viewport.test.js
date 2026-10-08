/* k108: gercek telefon — saPhoneStage / cerceve / scale yok; masaustu k105 birebir */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const bk = fs.readFileSync(path.join(root, 'bk-kabuk.css'), 'utf8');
assert.ok(nav.includes('k108'), 'k108 marker in nav css');
assert.ok(nav.includes('html.sa-phone-mobile') && nav.includes('min-height:100dvh'), 'mobile full viewport');
assert.ok(nav.includes('sa-shell-desktop') && nav.includes('layoutPhoneStage(phone, 1)'), 'desktop 1:1 stage');
assert.ok(/if \(isPhoneMobile\(\)\)[\s\S]{0,900}unwrapPhoneStage/.test(nav), 'mobile skips saPhoneStage mount');
assert.ok(nav.includes('display:none!important') && nav.includes('sa-phone-mobile') && nav.includes('phone-notch'), 'hide fake chrome on phone');
assert.ok(!nav.includes('html:has(.phone),body:has(>.phone)'), 'no global has-phone desktop shell on all viewports');
assert.ok(bk.includes('k108'), 'bk k108 narrow viewport');
assert.ok(bk.includes(':not(.sa-shell-framed)') && bk.includes('border-radius: 0'), 'bk no frame on mobile');
console.log('k108-mobile-native-viewport ok');

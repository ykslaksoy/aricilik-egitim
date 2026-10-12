/* k118: gerçek telefonda da iPhone 12 çerçevesi (bezel + yuvarlak köşe) */
const assert = require('assert');
const fs = require('fs');
const nav = fs.readFileSync(require('path').join(__dirname, '..', 'nav.js'), 'utf8');
assert.ok(nav.includes('k118') && /sa-phone-mobile \.phone\{top:max\(6px,env\(safe-area-inset-top/.test(nav), 'inset frame');
assert.ok(nav.includes('border-radius:38px!important;box-shadow:0 0 0 6px #1b1b1d'), 'bezel');
console.log('k118 ok');

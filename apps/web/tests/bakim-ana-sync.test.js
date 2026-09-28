/* Bakım ekranı Ana ile aynı CSS'i ve alt menüyü taşımalı (scripts/sync-bakim-ana.js --check). */
const { execFileSync } = require('child_process');
const path = require('path');
execFileSync(process.execPath, [path.join(__dirname, '..', '..', '..', 'scripts', 'sync-bakim-ana.js'), '--check'], { stdio: 'inherit' });
console.log('bakim-ana-sync: ok');

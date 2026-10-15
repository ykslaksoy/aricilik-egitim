/* Yönetici paneli apps/yonetici (superari.vercel.app/yonetici/). Testler panel kaynağını birlikte okur. */
const fs = require('fs'), path = require('path');
const D = process.env.YONETICI_DIR || path.join(__dirname, '../../yonetici');
module.exports = fs.readdirSync(D).filter(f => /^(index\.html|panel\d*\.js|kritik-alarm\.js)$/.test(f)).sort()
  .map(f => fs.readFileSync(path.join(D, f), 'utf8')).join('\n');

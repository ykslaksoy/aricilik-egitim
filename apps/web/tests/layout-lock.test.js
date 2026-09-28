/* KİLİTLİ DÜZEN: Ana (ana.html) ve Bakım (bakim.html) koloni-54 durumunda kilitli.
 * 3×4 kutu sırası / etiketleri / bağlantıları, Ana marka şeridi + hava kartı ve Bakım Kapsam kartı yapısı değişirse test başarısız olur.
 * Dinamik sayılar (rozetler) denetlenmez. Değiştirmek için önce kullanıcı onayı alın, sonra bu testi bilinçli olarak güncelleyin. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const web = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(web, f), 'utf8');
const LOCK = 'KİLİTLİ DÜZEN — kullanıcı onayı olmadan değiştirme';

/** Kutu dizisindeki { key, label, href } üçlüleri (href ifadesi metin olarak, rozet/renk hariç). */
function tiles(html) {
  const out = [];
  const re = /\{ key: '([a-z]+)', label: '([^']+)',[^\n]*?href: ((?:[^,{}()]|\([^()]*(?:\([^()]*\)[^()]*)*\))+?)\s*(?:,|\})/g;
  let m; while ((m = re.exec(html))) out.push([m[1], m[2], m[3].trim()]);
  return out;
}
function has(html, s, what) { assert.ok(html.indexOf(s) >= 0, what + ' eksik: ' + s); }

/* ---------- Ana ---------- */
const ana = read('ana.html');
has(ana, LOCK, 'ana.html kilit notu');
assert.deepStrictEqual(tiles(ana), [
  ['tarti', 'Tartı', "'kovanlar.html?view=tarti'"],
  ['saglik', 'Sağlık', "'saglik.html'"],
  ['ogul', 'Oğul', "'uyarilar.html?view=ogul'"],
  ['kovanlar', 'Kovanlar', "'kovanlar.html'"],
  ['koloni', 'Koloni', "'kovanlar.html?view=koloni'"],
  ['ariliklar', 'Arılıklar', "'ariliklar.html'"],
  ['cihazlar', 'Cihazlar', "'cihazlar.html'"],
  ['gorevler', 'Görevler', "'gorevler.html'"],
  ['uyarilar', 'Uyarılar', "'uyarilar.html'"],
  ['raporlar', 'Raporlar', "'raporlar.html'"],
  ['hava', 'Hava', "'hava-raporu.html'"],
  ['kamera', 'Kamera', "'kamera.html'"]
], 'Ana 3×4 kutu sırası/etiket/bağlantı değişti');
[
  ['<header class="brand-strip" id="brand-strip"', 'marka şeridi'],
  ['<section class="weather" id="weatherStrip"', 'hava kartı'],
  ['<section class="grid" id="grid" aria-label="Ana paneller"></section>', 'kutu ızgarası'],
  ['grid-template-columns: repeat(3, 1fr);', '3 sütun'],
  ['grid-template-rows: repeat(4, 1fr);', '4 satır'],
  ['<nav class="tabbar"', 'alt menü']
].forEach(([s, w]) => has(ana, s, 'Ana ' + w));

/* ---------- Bakım ---------- */
const bak = read('bakim.html');
has(bak, LOCK, 'bakim.html kilit notu');
assert.deepStrictEqual(tiles(bak), [
  ['muayene', 'Muayene', "'bakim-akis.html' + apQ()"],
  ['besleme', 'Beslenme', "P && P.besHref ? P.besHref(scope !== 'all' ? scope : '') : kolHref('besleme')"],
  ['ilac', 'İlaçlama', "kolHref('hastalik')"],
  ['hasat', 'Hasat', "'rapor-bal.html' + apQ()"],
  ['kis', 'Kışlık hazırlık', "kolHref('besleme', '&sub=kis')"],
  ['yavru', 'Yavru', "kolHref('yavru')"],
  ['anaari', 'Ana arı', "kolHref('ana')"],
  ['plan', 'Bakım planı', "'bakim-plan.html' + apQ()"],
  ['stok', 'Stok', "'stok.html'"],
  ['gorevler', 'Görevler', "'gorevler.html'"],
  ['goc', 'Göç', "'goc.html' + apQ('?ap=')"],
  ['ekipman', 'Ekipman-Temizlik', "'ekipman.html' + apQ()"]
], 'Bakım 3×4 kutu sırası/etiket/bağlantı değişti');
[
  ['<section class="weather bk-scope" id="bkScope"', 'Kapsam kartı'],
  ['class="bk-top"', 'Kapsam üst satırı'],
  ['<span class="bk-title">Bakım</span>', 'Kapsam başlığı'],
  ['id="bkMode"', 'Canlı/Demo etiketi'],
  ['id="bkPrev"', '‹ seçici'], ['id="bkLabel"', 'kapsam adı'], ['id="bkNext"', '› seçici'],
  ['<div class="bk-stats" id="bkStats"', '5 sütunlu özet'],
  ['id="bkNote"', 'not şeridi'],
  ['<section class="grid" id="grid" aria-label="Bakım bölümleri"></section>', 'kutu ızgarası'],
  ['grid-template-columns: repeat(3, 1fr);', '3 sütun'],
  ['grid-template-rows: repeat(4, 1fr);', '4 satır'],
  ['<!-- ANA-TABBAR:BEGIN -->', 'alt menü']
].forEach(([s, w]) => has(bak, s, 'Bakım ' + w));
const cols = (bak.match(/'kovan'|Kovan'|Geciken muayene|Kritik stok|Açık görev|Bu hafta bakım/g) || []);
['Geciken muayene', 'Kritik stok', 'Açık görev', 'Bu hafta bakım'].forEach((c) => assert.ok(cols.indexOf(c) >= 0, 'Kapsam sütunu eksik: ' + c));
console.log('layout-lock: ok (Ana + Bakım 3×4 ve kartlar kilitli)');

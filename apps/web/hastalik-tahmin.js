/**
 * SüperArı — Hastalık tahmini (kesin değil).
 * Rehberli fotoğraf (adım adım hangi çekim gerektiği + netlik/ışık kontrolü) + belirti listesi
 * + yalnız güvenilir olduğu yerde basit görüntü ipuçları → «muhtemel» hastalıklar ve yapılacaklar.
 * Tamamen cihazda çalışır; internet ve ücretli servis gerekmez. Fotoğraflar kayıtla birlikte IndexedDB'de saklanır.
 * Kesin tanı KOYMAZ: kesin tanı yalnız laboratuvar / veteriner hekim / İl-İlçe Tarım ve Orman Müdürlüğü ile konur.
 */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return isoOf(new Date()); }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); }

  /* foto.js / ilac-katalog.js gerektiğinde aynı sürümle yüklenir. */
  var VER = (function () { var s = document.currentScript, m = s && /[?&]v=([^&]+)/.exec(s.src || ''); return m ? '?v=' + m[1] : ''; })();
  var loading = {};
  function need(file, name) {
    if (global[name]) return Promise.resolve(global[name]);
    if (loading[file]) return loading[file];
    loading[file] = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = file + VER;
      s.onload = function () { global[name] ? res(global[name]) : rej(new Error(name)); };
      s.onerror = function () { loading[file] = null; rej(new Error(name)); };
      document.head.appendChild(s);
    });
    return loading[file];
  }

  /* ---------------- Rehberli çekim adımları ---------------- */
  var STEPS = [
    { id: 'cerceve', icon: '🖼', title: 'Yavrulu çerçeve', shot: 'Yavrulu çerçevenin tamamı, 30 cm\'den, gün ışığında',
      tip: 'Arıları çerçeveden hafifçe silkeleyin. Çerçevenin tamamı kareye girsin; flaş kullanmayın, gölgeye veya güneşe karşı çekmeyin.', cue: 'pattern', edge: 1100 },
    { id: 'kapak', icon: '🔎', title: 'Kapalı yavru kapakları', shot: 'Kapalı yavru kapaklarına yakın çekim',
      tip: '10–15 cm\'den, kapaklara dik çekin. Çökmüş, delikli veya koyulaşmış kapaklar görünsün.', cue: null, edge: 600 },
    { id: 'goz', icon: '🔬', title: 'Tek göz (makro)', shot: 'Hastalıklı görünen tek gözün makro çekimi',
      tip: 'Makro modu veya 5–8 cm; şüpheli göz kareyi doldursun. Kibrit çöpü testini yaptıysanız çöpü çekerken de çekebilirsiniz.', cue: 'gozBeyaz', edge: 600 },
    { id: 'kanat', icon: '🪽', title: 'Bozuk kanatlı arılar', shot: 'Kanatları bozuk arıların yakın çekimi',
      tip: 'Petek üzerinde veya kovan önünde buruşuk/kısa kanatlı arıları yakından, net çekin.', cue: null, edge: 600 },
    { id: 'onu', icon: '🚪', title: 'Uçuş deliği / kovan önü', shot: 'Uçuş deliği / kovan önü',
      tip: 'Uçuş tahtası ve önündeki zemin görünsün: mumyalaşmış larva, ölü arı, ishal lekesi, sürünen arılar.', cue: 'onuBeyaz', edge: 800 },
    { id: 'tabla', icon: '⬜', title: 'Akar tahtası', shot: 'Akar tahtası',
      tip: 'Beyaz akar tahtasını çıkarıp düz, gölgesiz ve yakından çekin (tahtayı 2–4 parça hâlinde çekmek sayımı kolaylaştırır).', cue: 'mite', edge: 1400, light: true }
  ];

  /* ---------------- Belirti listesi ---------------- */
  var SYMPTOMS = [
    { id: 'kapak', label: 'Çökmüş / delikli kapak' },
    { id: 'kibrit', label: 'Kibrit çöpü testinde uzama (2–3 cm ipliklenme)' },
    { id: 'koku', label: 'Kötü koku (tutkal / çürük / ekşi)' },
    { id: 'beyazMumya', label: 'Beyaz mumya (tebeşir gibi sert larva)' },
    { id: 'siyahMumya', label: 'Siyah / gri mumya' },
    { id: 'daginik', label: 'Dağınık (boşluklu) yavru' },
    { id: 'bukuk', label: 'Açık larva bükülmüş, sarı-kahverengi' },
    { id: 'kanat', label: 'Bozuk / buruşuk kanatlı arılar' },
    { id: 'ishal', label: 'İshal lekesi (çerçeve, kovan önü)' },
    { id: 'tulum', label: 'Tulum şeklinde larva (başı kalkık, içi sulu)' },
    { id: 'guve', label: 'Ağ / güve tünelleri' },
    { id: 'akar', label: 'Akar görülmesi (arı üzerinde / tahtada)' }
  ];
  var SYM_LABEL = {}; SYMPTOMS.forEach(function (s) { SYM_LABEL[s.id] = s.label; });

  /* Belirti → hastalık ağırlıkları (iç kullanım; arayüzde gösterilmez). */
  var W = {
    ayc: { kibrit: 5, kapak: 3, koku: 2, daginik: 1.5 },
    eyc: { bukuk: 4, koku: 2, daginik: 2, kapak: 0.5 },
    tulumsu: { tulum: 5, kapak: 1.5, daginik: 1.5 },
    kirec: { beyazMumya: 5, siyahMumya: 3, daginik: 1 },
    varroa: { akar: 5, kanat: 2.5, daginik: 1, kapak: 1 },
    dwv: { kanat: 5, akar: 2 },
    nosema: { ishal: 5 },
    mumguvesi: { guve: 5 }
  };

  /* ---------------- Hastalık bilgisi ve yapılacaklar ---------------- */
  function varroaMeds() {
    var I = global.SuperAriIlac;
    if (!I) return 'Ruhsatlı ilaç listesi yüklenemedi; Bakım yap › Varroa bölümünü kullanın.';
    var l = I.LIST.filter(function (p) { return p.verified && !p.notInList; }).map(function (p) { return p.name + ' (' + p.active.split(' ')[0] + ')'; });
    return 'Yalnız Bakanlık ruhsatlı, etiket dozu doğrulanmış ürünler: ' + l.join(', ') + '. Etiket dozunu kontrol edin; bal katı takılıyken ve bal akımında uygulamayın; aynı etken madde grubunu art arda kullanmayın.';
  }
  var NO_MED = 'Uygulamadaki ruhsatlı ilaç listesinde bu hastalık için ürün yok. Antibiyotik veya ruhsatsız ilaç kullanmayın (balda kalıntı bırakır).';
  var INFO = {
    ayc: { label: 'Amerikan yavru çürüğü (AYÇ)', alarm: true,
      signs: 'Çökmüş, delikli, koyulaşmış kapaklar; kibrit çöpüyle çekilen larva kalıntısı 2–3 cm ipliklenir; tutkal kokusu; dağınık yavru.',
      todo: ['İhbarı zorunludur: şüphede de İl/İlçe Tarım ve Orman Müdürlüğüne bildirin.',
        'Numune: şüpheli gözleri içeren yaklaşık 10×10 cm petek parçasını kâğıda sarıp (plastik poşete koymadan) karton kutuyla laboratuvara gönderin.',
        'Kovanı kapatın: yağmayı önlemek için uçuş deliğini daraltın; bu kovandan çerçeve, bal, arı ve malzeme başka kovana vermeyin.',
        'Alet dezenfeksiyonu: körük, maşa, eldiven ve el temizliği; maşayı alevden geçirin, eldiveni değiştirin. Bu kovanı en son muayene edin.',
        'Arılıktaki diğer kovanları kontrol edin.'],
      meds: 'İlaç uygulamayın. ' + NO_MED + ' Resmî karar ve uygulama İl/İlçe Müdürlüğü ile veteriner hekime aittir.',
      tasks: [{ t: 'AYÇ şüphesi — ihbar: İl/İlçe Tarım ve Orman Müdürlüğüne bildir', p: 1, d: 0 },
        { t: 'AYÇ şüphesi — kovanı kapat, uçuş deliğini daralt, çerçeve/bal alışverişi yapma', p: 1, d: 0 },
        { t: 'AYÇ şüphesi — alet ve eldiven dezenfeksiyonu', p: 1, d: 0 }] },
    eyc: { label: 'Avrupa yavru çürüğü (EYÇ)',
      signs: 'Kapanmadan ölen, bükülmüş, sarı-kahverengi larvalar; ekşi koku; dağınık yavru. Kibrit testinde genelde uzama olmaz.',
      todo: ['AYÇ ile karışabilir: numune alıp laboratuvarda doğrulatın.', 'Koloniyi güçlendirin (yavru arası/besleme); gerekirse ana arıyı değiştirin.',
        'Ağır etkilenen çerçeveleri yenileyin; aletleri temizleyin, çerçeve alışverişi yapmayın.'],
      meds: NO_MED,
      tasks: [{ t: 'EYÇ şüphesi — numune alıp doğrulat (AYÇ ayrımı)', p: 1, d: 2 }, { t: 'EYÇ şüphesi — koloniyi güçlendir / ana değişimini değerlendir', p: 2, d: 7 }] },
    tulumsu: { label: 'Tulumsu yavru',
      signs: 'Kapağı delinmiş gözlerde tulum gibi, içi sulu, başı yukarı kalkık larva; dağınık yavru.',
      todo: ['Ana arıyı genç ve sağlıklı ana ile değiştirmeyi değerlendirin.', 'Koloniyi güçlendirin; ağır etkilenen çerçeveleri yenileyin.', 'Laboratuvarda doğrulatabilirsiniz.'],
      meds: NO_MED,
      tasks: [{ t: 'Tulumsu yavru şüphesi — ana değişimini değerlendir', p: 2, d: 7 }] },
    kirec: { label: 'Kireç hastalığı',
      signs: 'Gözlerde ve kovan önünde beyaz, sert, tebeşir gibi mumyalar; sporlanınca gri-siyah olur.',
      todo: ['Nemi azaltın: havalandırmayı artırın, kovanı yerden yükseltip güneşli yere alın.', 'Mumyalı çerçeveleri yenileyin; tabanı temizleyin.',
        'Koloniyi güçlendirin; sürerse ana arıyı değiştirin.'],
      meds: NO_MED,
      tasks: [{ t: 'Kireç şüphesi — havalandırma, nem ve taban temizliği', p: 2, d: 3 }] },
    varroa: { label: 'Varroa',
      signs: 'Arı üzerinde veya akar tahtasında akar; bozuk kanatlı arılar; dağınık yavru.',
      todo: ['Akar sayımı yapın (≈300 arı, alkol yıkama veya pudra şekeri) ve kaydedin.', 'Bakım yap › Varroa bölümünden etiket dozuna göre ilaçlama planlayın.'],
      medsFn: varroaMeds,
      tasks: [{ t: 'Varroa şüphesi — akar sayımı yap (≈300 arı)', p: 1, d: 2 }] },
    dwv: { label: 'Kanat deformasyonu virüsü (DWV)',
      signs: 'Buruşuk, kısa, bozuk kanatlı genç arılar; çoğu zaman yüksek varroa ile birlikte.',
      todo: ['Virüsün ilacı yoktur; asıl neden çoğunlukla varroadır. Akar sayımı yapın.', 'Varroa mücadelesini etiket dozuyla uygulayın; koloniyi güçlendirin.'],
      medsFn: function () { return 'Virüs için ilaç yok. Varroa için: ' + varroaMeds(); },
      tasks: [{ t: 'Bozuk kanat — akar sayımı yap, varroa mücadelesini planla', p: 1, d: 2 }] },
    nosema: { label: 'Nosema',
      signs: 'Çerçevede, kapakta ve kovan önünde ishal lekeleri; sürünen, uçamayan arılar.',
      todo: ['Kesin tanı mikroskopla konur: 30–60 yaşlı arıyı numune olarak alın.', 'Eski ve lekeli petekleri yenileyin; kovanı kuru ve havadar tutun.', 'Koloniyi güçlendirin; stres yaratan uygulamalardan kaçının.'],
      meds: NO_MED,
      tasks: [{ t: 'Nosema şüphesi — arı numunesi al, mikroskopla doğrulat', p: 2, d: 3 }] },
    mumguvesi: { label: 'Mum güvesi',
      signs: 'Peteklerde ağ, tünel ve larva pislikleri; genellikle zayıf kolonide.',
      todo: ['Arının örtemediği fazla çerçeveleri alın, kovanı daraltın.', 'Ağır zarar gören petekleri eritin; boş petekleri serin yerde saklayın.', 'Koloni zayıfsa birleştirmeyi değerlendirin.'],
      meds: 'Kimyasal kullanmayın. ' + NO_MED,
      tasks: [{ t: 'Mum güvesi — fazla çerçeveleri al, kovanı daralt', p: 2, d: 3 }] }
  };

  /* ---------------- Görüntü analizi ---------------- */
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, mx ? d / mx : 0, mx];
  }
  /** Netlik / ışık kontrolü (merkez %80). */
  function quality(img, natW, natH, light) {
    var w = img.width, hh = img.height, px = img.data;
    var x0 = Math.floor(w * 0.1), x1 = Math.ceil(w * 0.9), y0 = Math.floor(hh * 0.1), y1 = Math.ceil(hh * 0.9), cw = x1 - x0, ch = y1 - y0;
    var gray = new Float32Array(cw * ch), n = 0, sum = 0, sum2 = 0, over = 0;
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var i = (y * w + x) * 4, l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      gray[(y - y0) * cw + (x - x0)] = l; sum += l; sum2 += l * l; n++; if (l > 250) over++;
    }
    var mean = sum / n, sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean)), lap = 0, ln = 0;
    /* Netlik: 480 px ölçeğinde ölçülür (farklı çözünürlükler karşılaştırılabilir olsun). */
    var step = Math.max(1, Math.round(Math.max(cw, ch) / 480));
    for (var yy = step; yy < ch - step; yy += step) for (var xx = step; xx < cw - step; xx += step) {
      var k = yy * cw + xx, v = 4 * gray[k] - gray[k - step] - gray[k + step] - gray[k - step * cw] - gray[k + step * cw];
      lap += v * v; ln++;
    }
    var sharp = ln ? lap / ln : 0, issues = [];
    if (mean < 60) issues.push('Çok karanlık — gün ışığında çekin');
    if (mean > (light ? 238 : 215) || over / n > (light ? 0.6 : 0.25)) issues.push('Çok parlak / patlamış — doğrudan güneşte veya flaşla çekmeyin');
    if (sharp < 35) issues.push('Bulanık — telefonu sabit tutun, ekrana dokunup odaklayın');
    else if (sd < (light ? 6 : 16)) issues.push('Kontrast düşük — ışığı değiştirin');
    if (natW && Math.max(natW, natH) < 700) issues.push('Çözünürlük düşük — daha büyük fotoğraf kullanın');
    return { ok: !issues.length, issues: issues, brightness: mean, sharpness: sharp };
  }
  /** İkili maske → bağlı bileşenler (alan, kutu). */
  function blobs(mask, w, h, minA, maxA) {
    var lab = new Int32Array(w * h), out = [], stack = [], id = 0;
    for (var p = 0; p < w * h; p++) {
      if (!mask[p] || lab[p]) continue;
      id++; var a = 0, minx = w, maxx = 0, miny = h, maxy = 0; stack.length = 0; stack.push(p); lab[p] = id;
      while (stack.length) {
        var q = stack.pop(), qx = q % w, qy = (q - qx) / w; a++;
        if (qx < minx) minx = qx; if (qx > maxx) maxx = qx; if (qy < miny) miny = qy; if (qy > maxy) maxy = qy;
        if (qx > 0 && mask[q - 1] && !lab[q - 1]) { lab[q - 1] = id; stack.push(q - 1); }
        if (qx < w - 1 && mask[q + 1] && !lab[q + 1]) { lab[q + 1] = id; stack.push(q + 1); }
        if (qy > 0 && mask[q - w] && !lab[q - w]) { lab[q - w] = id; stack.push(q - w); }
        if (qy < h - 1 && mask[q + w] && !lab[q + w]) { lab[q + w] = id; stack.push(q + w); }
      }
      if (a < minA || a > maxA) continue;
      var bw = maxx - minx + 1, bh = maxy - miny + 1, fill = a / (bw * bh), asp = Math.max(bw, bh) / Math.min(bw, bh);
      if (fill >= 0.45 && asp <= 3) out.push({ a: a, x: minx, y: miny, w: bw, h: bh });
    }
    return out;
  }
  /** Yavru deseni: kapalı yavru rengi (açık kahve/bej) blokların dağılımındaki boşluk oranı. */
  function cuePattern(img) {
    var w = img.width, h = img.height, px = img.data, cols = 110, bs = Math.max(2, Math.floor(w / cols)), rows = Math.floor(h / bs);
    cols = Math.floor(w / bs);
    var grid = new Uint8Array(cols * rows), xs = [], ys = [];
    for (var gy = 0; gy < rows; gy++) for (var gx = 0; gx < cols; gx++) {
      var r = 0, g = 0, b = 0, n = 0, dk = 0;
      for (var y = gy * bs; y < (gy + 1) * bs; y++) for (var x = gx * bs; x < (gx + 1) * bs; x++) { var i = (y * w + x) * 4; r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; if (Math.max(px[i], px[i + 1], px[i + 2]) < 85) dk++; }
      var hsv = rgb2hsv(r / n, g / n, b / n);
      /* Boş / açık göz: bloğun önemli kısmı koyu. */
      if (dk / n < 0.25 && hsv[0] >= 18 && hsv[0] <= 48 && hsv[1] >= 0.28 && hsv[1] <= 0.85 && hsv[2] >= 0.35 && hsv[2] <= 0.9) { grid[gy * cols + gx] = 1; xs.push(gx); ys.push(gy); }
    }
    if (xs.length < cols * rows * 0.12) return { ok: false, text: 'Kapalı yavru alanı fotoğrafta ayırt edilemedi; desen ipucu yok.' };
    function pct(a, q) { var s = a.slice().sort(function (m, n2) { return m - n2; }); return s[Math.floor((s.length - 1) * q)]; }
    var X0 = pct(xs, 0.15), X1 = pct(xs, 0.85), Y0 = pct(ys, 0.15), Y1 = pct(ys, 0.85), tot = 0, holes = 0;
    for (var yy = Y0; yy <= Y1; yy++) for (var xx = X0; xx <= X1; xx++) { tot++; if (!grid[yy * cols + xx]) holes++; }
    var hr = tot ? holes / tot : 0;
    if (tot < 60) return { ok: false, text: 'Yavru alanı çok küçük; çerçevenin tamamını çekin.' };
    if (hr >= 0.3) return { ok: true, sym: 'daginik', strong: hr >= 0.42, text: 'Yavru alanında çok sayıda boşluk görünüyor → dağınık yavru olabilir.' };
    return { ok: true, sym: null, text: 'Yavru alanı fotoğrafta büyük ölçüde dolu görünüyor.' };
  }
  function whiteMask(img, cx0, cx1, cy0, cy1) {
    var w = img.width, h = img.height, px = img.data, m = new Uint8Array(w * h), cnt = 0, tot = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4, mx = Math.max(px[i], px[i + 1], px[i + 2]), mn = Math.min(px[i], px[i + 1], px[i + 2]);
      var on = mx > 205 && (mx - mn) < 0.16 * mx && mx < 253;
      if (on) m[y * w + x] = 1;
      if (cx1 && x >= cx0 && x < cx1 && y >= cy0 && y < cy1) { tot++; if (on) cnt++; }
    }
    return { m: m, frac: tot ? cnt / tot : 0 };
  }
  function cueGozBeyaz(img) {
    var w = img.width, h = img.height, r = whiteMask(img, Math.floor(w * 0.3), Math.ceil(w * 0.7), Math.floor(h * 0.3), Math.ceil(h * 0.7));
    if (r.frac >= 0.35) return { ok: true, sym: 'beyazMumya', strong: false, text: 'Karenin ortasında tebeşir beyazı bir kütle var → beyaz mumya olabilir (kapak mumu da beyaz görünebilir).' };
    return { ok: true, sym: null, text: 'Ortada belirgin tebeşir beyazı kütle görülmedi.' };
  }
  function cueOnuBeyaz(img) {
    var w = img.width, h = img.height, A = w * h, r = whiteMask(img);
    var l = blobs(r.m, w, h, Math.max(12, A * 0.00015), A * 0.006);
    if (l.length >= 3) return { ok: true, sym: 'beyazMumya', strong: l.length >= 8, count: l.length, text: 'Kovan önünde ' + l.length + ' küçük beyaz leke seçildi → mumyalaşmış larva olabilir (çiçek, taş, kâğıt da karışabilir).' };
    return { ok: true, sym: null, text: 'Belirgin küçük beyaz leke seçilmedi.' };
  }
  function cueMite(img) {
    var w = img.width, h = img.height, px = img.data, A = w * h, sum = 0, n = 0;
    for (var i0 = 0; i0 < A; i0 += 7) { var j = i0 * 4; sum += 0.299 * px[j] + 0.587 * px[j + 1] + 0.114 * px[j + 2]; n++; }
    if (sum / n < 140) return { ok: false, text: 'Tahta açık renkli görünmüyor; akar ipucu hesaplanmadı. Beyaz tahtayı gölgesiz çekin.' };
    var m = new Uint8Array(A);
    for (var p = 0; p < A; p++) {
      var k = p * 4, hsv = rgb2hsv(px[k], px[k + 1], px[k + 2]);
      if ((hsv[0] <= 30 || hsv[0] >= 345) && hsv[1] >= 0.4 && hsv[2] >= 0.18 && hsv[2] <= 0.62) m[p] = 1;
    }
    var sc = Math.max(w, h) / 1400, l = blobs(m, w, h, Math.max(4, 8 * sc * sc), 220 * sc * sc);
    var c = l.length;
    if (c >= 5) return { ok: true, sym: 'akar', strong: c >= 15, count: c, text: '≈ ' + c + ' kırmızı-kahverengi, akar boyutunda nokta seçildi (kaba; kırıntı karışabilir, gözle sayın).' };
    return { ok: true, sym: null, count: c, text: 'Akar benzeri nokta ' + (c ? 'az (' + c + ')' : 'seçilmedi') + '. Küçük akarlar fotoğrafta kaçabilir; gözle kontrol edin.' };
  }
  var CUES = { pattern: cuePattern, gozBeyaz: cueGozBeyaz, onuBeyaz: cueOnuBeyaz, mite: cueMite };
  function analyzeFile(file, step) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var nw = im.naturalWidth, nh = im.naturalHeight, sc = Math.min(1, (step.edge || 600) / Math.max(nw, nh));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(nw * sc)); c.height = Math.max(1, Math.round(nh * sc));
        var g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
        var data = g.getImageData(0, 0, c.width, c.height), res = { q: quality(data, nw, nh, step.light) };
        res.cue = step.cue && CUES[step.cue] ? CUES[step.cue](data) : null;
        var pc = document.createElement('canvas'), ps = Math.min(1, 320 / Math.max(nw, nh));
        pc.width = Math.round(nw * ps); pc.height = Math.round(nh * ps); pc.getContext('2d').drawImage(im, 0, 0, pc.width, pc.height);
        res.preview = pc.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(url); resolve(res);
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Fotoğraf açılamadı')); };
      im.src = url;
    });
  }

  /* ---------------- Değerlendirme ---------------- */
  /** checked: {sym:true}, cues: [{sym, strong, poorQuality}] → sıralı liste (en çok 3). */
  function assess(checked, cues) {
    var ev = {};
    Object.keys(checked || {}).forEach(function (k) { if (checked[k]) ev[k] = 1; });
    (cues || []).forEach(function (c) {
      if (!c || !c.sym || ev[c.sym] === 1) return;
      var v = (c.strong ? 0.5 : 0.35) * (c.poor ? 0.5 : 1);
      ev[c.sym] = Math.max(ev[c.sym] || 0, v);
    });
    var list = Object.keys(W).map(function (k) {
      var s = 0, why = [];
      Object.keys(W[k]).forEach(function (sym) { if (ev[sym]) { s += W[k][sym] * ev[sym]; why.push(SYM_LABEL[sym] + (ev[sym] < 1 ? ' (fotoğraf ipucu)' : '')); } });
      return { key: k, score: s, why: why };
    }).filter(function (x) { return x.score >= 1.5; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
    list.forEach(function (x, i) {
      x.word = x.score >= 5 && i === 0 ? 'En muhtemel' : (x.score >= 3 ? 'Muhtemel' : 'Olası (zayıf belirti)');
      x.strength = x.score >= 5 ? 'orta' : 'hafif';
    });
    /* AYÇ: kibrit testi uzaması tek başına bile şüphe demektir; listeden düşmesin. */
    var aycSusp = !!ev.kibrit && ev.kibrit === 1 || (!!ev.kapak && ev.koku === 1);
    if (aycSusp && !list.some(function (x) { return x.key === 'ayc'; })) list.push({ key: 'ayc', score: 3, why: [SYM_LABEL.kibrit], word: 'Muhtemel', strength: 'hafif' });
    return { list: list, aycSuspect: aycSusp || list.some(function (x) { return x.key === 'ayc'; }), evidence: Object.keys(ev).length };
  }

  /* ---------------- Kaydetme ---------------- */
  function saveSuspect(h, keys, st) {
    var R = D.records, demo = mode() === 'demo', saved = [], tasks = 0;
    var symTxt = Object.keys(st.checked).filter(function (k) { return st.checked[k]; }).map(function (k) { return SYM_LABEL[k].split(' (')[0]; });
    var cueTxt = STEPS.filter(function (s) { return st.photos[s.id] && st.photos[s.id].res && st.photos[s.id].res.cue && st.photos[s.id].res.cue.sym; }).map(function (s) { return s.title + ': ' + SYM_LABEL[st.photos[s.id].res.cue.sym].split(' (')[0]; });
    keys.forEach(function (k) {
      var it = st.result.list.filter(function (x) { return x.key === k; })[0] || { strength: 'hafif' };
      var note = ('Hastalık tahmini (kesin değil) · şüpheli' + (symTxt.length ? ' · Belirtiler: ' + symTxt.join(', ') : '') + (cueTxt.length ? ' · Fotoğraf ipucu: ' + cueTxt.join(', ') : '') + (demo ? ' · Demo' : '')).slice(0, 300);
      var rec = { date: today(), disease: k, note: note, suspected: true, checkDate: plusDays(k === 'ayc' ? 3 : 7) };
      if (k === 'ayc' || k === 'nosema') rec.status = 'suphe';
      else if (k !== 'varroa') rec.severity = it.strength;
      if (demo) rec.demo = true;
      var s = R.add(h.id, 'disease', rec);
      if (s) saved.push(s);
      var open = []; try { open = D.taskStore.open().map(function (x) { return x.title; }); } catch (e) { open = []; }
      (INFO[k].tasks || []).forEach(function (t) {
        var title = t.t + ' — ' + h.name + (demo ? ' · Demo' : '');
        if (open.indexOf(title) >= 0) return;
        if (D.taskStore.add({ title: title, hiveId: h.id, priority: t.p, due: plusDays(t.d), note: '[hastalik:tahmin]' })) tasks++;
      });
    });
    var files = STEPS.map(function (s) { return st.photos[s.id] && st.photos[s.id].file; }).filter(Boolean);
    if (!saved.length || !files.length) return Promise.resolve({ saved: saved, tasks: tasks, photos: 0 });
    return need('foto.js', 'SuperAriFoto').then(function (F) {
      return files.reduce(function (p, f) { return p.then(function (acc) { return F.compress(f).then(function (c) { acc.push(c); return acc; }, function () { return acc; }); }); }, Promise.resolve([]))
        .then(function (items) {
          return F.attach(saved.map(function (s) { return s.id; }), items).then(function (rows) {
            var n = rows.length;
            saved.forEach(function (s) { try { R.setPhotoCount(h.id, 'disease', s.id, n); } catch (e) { /* ignore */ } });
            return { saved: saved, tasks: tasks, photos: n };
          });
        });
    }).catch(function () { return { saved: saved, tasks: tasks, photos: 0, photoErr: true }; });
  }

  /* ---------------- Arayüz ---------------- */
  var css = '.hz-back{position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center;}' +
    '.hz-sheet{background:#fffaf2;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 12px 24px;box-sizing:border-box;color:#3d2616;overflow-wrap:anywhere;}' +
    '.hz-sheet h2{margin:0;font-size:17px;display:flex;align-items:center;gap:8px;}.hz-x{margin-left:auto;flex:none;border:0;background:#efe4d2;border-radius:999px;width:32px;height:32px;font-size:18px;cursor:pointer;}' +
    '.hz-mut{color:#6b5a48;font-size:12px;line-height:1.4;}.hz-sec{border:1px solid #eadfcd;background:#fff;border-radius:12px;padding:10px;margin:10px 0;}.hz-sec h3{margin:0 0 6px;font-size:14px;}' +
    '.hz-step{border:1px solid #eadfcd;border-radius:10px;padding:8px;margin:7px 0;background:#fffdf8;}.hz-step.done{border-color:#9fd3ad;background:#f3fbf5;}' +
    '.hz-shot{font-weight:800;font-size:13.5px;margin:2px 0;}.hz-step p{margin:3px 0;font-size:12.5px;line-height:1.4;}' +
    '.hz-warn{background:#fff4e6;border:1px solid #ffd8a8;color:#8a4b00;border-radius:9px;padding:5px 8px;font-size:12px;margin:4px 0;}' +
    '.hz-ok{color:#1b7a3d;font-size:12.5px;margin:4px 0;}.hz-cue{background:#eef5ff;border:1px solid #c5dbf7;color:#1f4f82;border-radius:9px;padding:5px 8px;font-size:12px;margin:4px 0;}' +
    '.hz-alarm{background:#fdecec;border:2px solid #d9480f;color:#8b1a1a;border-radius:10px;padding:8px;font-size:13px;margin:8px 0;}' +
    '.hz-btn{font:inherit;font-size:13px;font-weight:700;border-radius:10px;padding:8px 11px;border:1px solid #3d2616;background:#3d2616;color:#fff;cursor:pointer;display:inline-block;}' +
    '.hz-btn.sec{background:#fff;color:#3d2616;border-color:#c9b79c;}.hz-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;}' +
    '.hz-prev{width:96px;height:72px;object-fit:cover;border-radius:8px;display:block;}.hz-flex{display:flex;gap:8px;align-items:flex-start;}' +
    '.hz-sym{display:flex;gap:7px;align-items:flex-start;padding:6px 2px;border-top:1px solid #f1e8da;font-size:13px;cursor:pointer;}.hz-sym:first-of-type{border-top:0;}.hz-sym input{margin-top:2px;flex:none;}' +
    '.hz-sug{font-size:11px;color:#1f4f82;font-weight:700;}.hz-cand{border:1px solid #eadfcd;border-radius:10px;padding:8px;margin:8px 0;background:#fffdf8;}' +
    '.hz-cand h4{margin:0 0 4px;font-size:14px;display:flex;gap:6px;align-items:flex-start;}.hz-cand ul{margin:4px 0 4px 18px;padding:0;font-size:12.5px;line-height:1.4;}' +
    '.hz-cand p{margin:3px 0;font-size:12.5px;line-height:1.4;}.hz-tabs{display:flex;gap:6px;margin:10px 0 0;}.hz-tabs button{flex:1;font:inherit;font-size:13px;font-weight:700;padding:7px 4px;border-radius:10px;border:1px solid #c9b79c;background:#fff;color:#3d2616;cursor:pointer;}' +
    '.hz-tabs button.on{background:#3d2616;color:#fff;border-color:#3d2616;}' +
    '.hz-sheet input[type=checkbox]{width:18px !important;height:18px;min-width:0;flex:none;margin:2px 0 0;padding:0;}.hz-cand h4 span,.hz-sym span{flex:1;min-width:0;}';
  function ensureCss() { if (document.getElementById('hzCss')) return; var s = document.createElement('style'); s.id = 'hzCss'; s.textContent = css; document.head.appendChild(s); }
  function close() { var b = document.getElementById('hzSheet'); if (b) b.remove(); }

  function open(hiveId, opts) {
    opts = opts || {}; D = global.SuperAriDemo;
    var h = D && D.hiveById(hiveId); if (!h) return;
    ensureCss(); close();
    need('ilac-katalog.js', 'SuperAriIlac').catch(function () { /* varroa ilaç listesi yoksa metin uyarır */ });
    var st = { tab: 'foto', photos: {}, checked: {}, result: null, sel: {}, done: null };
    var back = document.createElement('div'); back.className = 'hz-back'; back.id = 'hzSheet';
    back.innerHTML = '<div class="hz-sheet" role="dialog" aria-modal="true" aria-label="Hastalık tahmini">' +
      '<h2>🔍 Hastalık tahmini (kesin değil)<button type="button" class="hz-x" data-hz-close aria-label="Kapat">×</button></h2>' +
      '<div class="hz-mut">' + esc(h.name) + (mode() === 'demo' ? ' · Demo' : '') + ' · internet gerekmez, fotoğraflar cihazdan çıkmaz</div>' +
      '<div class="hz-tabs"><button type="button" data-hz-tab="foto">1 · Fotoğraf</button><button type="button" data-hz-tab="belirti">2 · Belirtiler</button><button type="button" data-hz-tab="sonuc">3 · Sonuç</button></div>' +
      '<div data-hz-body></div>' +
      '<p class="hz-mut">Bu araç tanı koymaz; yalnız muhtemel hastalıkları sıralar. Kesin tanı laboratuvar, veteriner hekim veya İl/İlçe Tarım ve Orman Müdürlüğü ile konur.</p></div>';
    document.body.appendChild(back);
    var body = back.querySelector('[data-hz-body]');
    function cues() {
      return STEPS.map(function (s) { var p = st.photos[s.id]; if (!p || !p.res || !p.res.cue || !p.res.cue.sym) return null; return { sym: p.res.cue.sym, strong: p.res.cue.strong, poor: !p.res.q.ok }; }).filter(Boolean);
    }
    function suggested() { var o = {}; cues().forEach(function (c) { o[c.sym] = 1; }); return o; }
    function renderFoto() {
      var n = STEPS.filter(function (s) { return st.photos[s.id]; }).length;
      body.innerHTML = '<div class="hz-sec"><h3>Rehberli çekim (' + n + '/' + STEPS.length + ')</h3><p class="hz-mut">Her adım isteğe bağlıdır; gördüğünüz belirtiye uygun olanları çekin. Gün ışığında, flaşsız çekin.</p>' +
        STEPS.map(function (s, i) {
          var p = st.photos[s.id], r = p && p.res;
          return '<div class="hz-step' + (p ? ' done' : '') + '"><div class="hz-flex">' + (r && r.preview ? '<img class="hz-prev" alt="' + esc(s.title) + '" src="' + r.preview + '">' : '') +
            '<div style="min-width:0;flex:1;"><div class="hz-mut">Adım ' + (i + 1) + ' · ' + s.icon + ' ' + esc(s.title) + '</div><div class="hz-shot">«' + esc(s.shot) + '»</div><p class="hz-mut">' + esc(s.tip) + '</p></div></div>' +
            (r ? (r.q.ok ? '<div class="hz-ok">✓ Netlik ve ışık uygun</div>' : r.q.issues.map(function (x) { return '<div class="hz-warn">⚠ ' + esc(x) + ' — yeniden çekmeniz önerilir</div>'; }).join('')) +
              (r.cue ? '<div class="hz-cue">🖼 Fotoğraf ipucu (zayıf): ' + esc(r.cue.text) + '</div>' : '') : '') +
            (p && p.err ? '<div class="hz-warn">⚠ ' + esc(p.err) + '</div>' : '') +
            '<div class="hz-row"><label class="hz-btn' + (p ? ' sec' : '') + '">📷 ' + (p ? 'Yeniden çek' : 'Çek / seç') + '<input type="file" accept="image/*" capture="environment" data-hz-file="' + s.id + '" hidden></label>' +
            (p ? '<button type="button" class="hz-btn sec" data-hz-del="' + s.id + '">Kaldır</button>' : '') + '</div></div>';
        }).join('') +
        '<div class="hz-row"><button type="button" class="hz-btn" data-hz-tab="belirti">Devam: belirtiler →</button></div></div>';
    }
    function renderBelirti() {
      var sug = suggested();
      body.innerHTML = '<div class="hz-sec"><h3>Gördüğünüz belirtiler</h3><p class="hz-mut">Emin olduklarınızı işaretleyin. «Fotoğraf ipucu» yazanlar fotoğraftan gelen zayıf işaretlerdir; kendiniz görüyorsanız işaretleyin.</p>' +
        SYMPTOMS.map(function (s) {
          return '<label class="hz-sym"><input type="checkbox" data-hz-sym="' + s.id + '"' + (st.checked[s.id] ? ' checked' : '') + '><span>' + esc(s.label) + (sug[s.id] && !st.checked[s.id] ? '<br><span class="hz-sug">🖼 Fotoğraf ipucu</span>' : '') + '</span></label>';
        }).join('') +
        '<p class="hz-mut">Kibrit çöpü testi: şüpheli kapağı delip kibrit çöpünü larva kalıntısına batırın, yavaşça çekin. 2–3 cm ipliklenme AYÇ şüphesidir; bu durumda çöpü ve eldiveni imha edin.</p>' +
        '<div class="hz-row"><button type="button" class="hz-btn" data-hz-tab="sonuc">Sonucu göster →</button></div></div>';
    }
    function renderSonuc() {
      var res = st.result = assess(st.checked, cues());
      if (!res.list.length) {
        body.innerHTML = '<div class="hz-sec"><h3>Sonuç</h3><p>' + (res.evidence ? 'İşaretlenen belirtiler belirli bir hastalığa yeterince işaret etmiyor.' : 'Henüz belirti işaretlenmedi ve fotoğraflardan ipucu çıkmadı.') + '</p><p class="hz-mut">Belirtiler sürerse numune alıp laboratuvara gönderin veya veteriner hekime danışın.</p>' +
          '<div class="hz-row"><button type="button" class="hz-btn sec" data-hz-tab="belirti">← Belirtiler</button></div></div>';
        return;
      }
      if (st.done == null && !Object.keys(st.sel).length) { st.sel[res.list[0].key] = true; if (res.aycSuspect) st.sel.ayc = true; }
      var H = '<div class="hz-sec"><h3>Muhtemel hastalıklar</h3>';
      if (res.aycSuspect) H += '<div class="hz-alarm"><b>⚠ Amerikan yavru çürüğü şüphesi.</b> İhbarı zorunludur: İl/İlçe Tarım ve Orman Müdürlüğüne bildirin, numune alın, kovanı kapatın (çerçeve/bal alışverişi yok) ve aletleri dezenfekte edin. İlaç uygulamayın.</div>';
      H += res.list.map(function (x) {
        var inf = INFO[x.key];
        return '<div class="hz-cand"><h4><input type="checkbox" data-hz-sel="' + x.key + '"' + (st.sel[x.key] ? ' checked' : '') + ' aria-label="Kaydet: ' + esc(inf.label) + '"><span>' + esc(x.word) + ': ' + esc(inf.label) + '</span></h4>' +
          '<p class="hz-mut">Dayanak: ' + esc(x.why.join(', ')) + '</p><p class="hz-mut">Tipik belirtiler: ' + esc(inf.signs) + '</p>' +
          '<p><b>Ne yapmalı?</b></p><ul>' + inf.todo.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
          '<p><b>İlaç:</b> ' + esc(inf.medsFn ? inf.medsFn() : inf.meds) + '</p></div>';
      }).join('');
      var nf = STEPS.filter(function (s) { return st.photos[s.id]; }).length;
      H += st.done ? '<div class="hz-ok" data-hz-msg>' + esc(st.done) + '</div>' :
        '<div class="hz-row"><button type="button" class="hz-btn" data-hz-save>💾 Şüpheli hastalık olarak kaydet' + (nf ? ' (' + nf + ' fotoğrafla)' : '') + '</button></div>' +
        '<p class="hz-mut">İşaretli hastalıklar «şüpheli» kaydı olarak yazılır, yapılacaklar görev olarak eklenir ve kontrol tarihi atanır.</p>';
      body.innerHTML = H + '</div>';
    }
    function render() {
      Array.prototype.forEach.call(back.querySelectorAll('.hz-tabs [data-hz-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-hz-tab') === st.tab); });
      if (st.tab === 'foto') renderFoto(); else if (st.tab === 'belirti') renderBelirti(); else renderSonuc();
    }
    back.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-hz-close],[data-hz-tab],[data-hz-del],[data-hz-save]') : null;
      if (e.target === back) { close(); return; }
      if (!t) return;
      if (t.hasAttribute('data-hz-close')) { close(); return; }
      if (t.hasAttribute('data-hz-tab')) { st.tab = t.getAttribute('data-hz-tab'); render(); back.querySelector('.hz-sheet').scrollTop = 0; return; }
      if (t.hasAttribute('data-hz-del')) { delete st.photos[t.getAttribute('data-hz-del')]; render(); return; }
      if (t.hasAttribute('data-hz-save')) {
        var keys = Object.keys(st.sel).filter(function (k) { return st.sel[k] && INFO[k]; });
        if (!keys.length) { global.alert && global.alert('Kaydetmek için en az bir hastalık işaretleyin.'); return; }
        t.disabled = true; t.textContent = 'Kaydediliyor…';
        saveSuspect(h, keys, st).then(function (r) {
          st.done = r.saved.length ? '✓ Kaydedildi: ' + r.saved.length + ' şüpheli hastalık kaydı' + (r.photos ? ' · ' + r.photos + ' fotoğraf' : '') + (r.tasks ? ' · ' + r.tasks + ' görev' : '') + (r.photoErr ? ' · fotoğraflar kaydedilemedi' : '') + '. Kesin tanı değildir.' : 'Kaydedilemedi.';
          render();
          if (r.saved.length && typeof opts.onSaved === 'function') opts.onSaved(r);
        });
      }
    });
    back.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-hz-sym')) { st.checked[t.getAttribute('data-hz-sym')] = t.checked; st.sel = {}; st.done = null; return; }
      if (t.hasAttribute('data-hz-sel')) { st.sel[t.getAttribute('data-hz-sel')] = t.checked; return; }
      if (t.hasAttribute('data-hz-file') && t.files && t.files[0]) {
        var id = t.getAttribute('data-hz-file'), step = STEPS.filter(function (s) { return s.id === id; })[0], f = t.files[0];
        analyzeFile(f, step).then(function (res) { st.photos[id] = { file: f, res: res }; st.sel = {}; st.done = null; render(); },
          function () { st.photos[id] = null; delete st.photos[id]; global.alert && global.alert('Fotoğraf açılamadı.'); });
      }
    });
    render();
  }
  global.SuperAriHastalik = { open: open, close: close, assess: assess, quality: quality, cuePattern: cuePattern, cueMite: cueMite, cueOnuBeyaz: cueOnuBeyaz, cueGozBeyaz: cueGozBeyaz, STEPS: STEPS, SYMPTOMS: SYMPTOMS, INFO: INFO };
})(window);

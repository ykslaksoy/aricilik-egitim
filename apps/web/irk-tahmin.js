/**
 * SüperArı — Irk tahmini (kesin değil). Tamamen cihazda çalışır: fotoğraf renk analizi (canvas),
 * davranış soruları ve isteğe bağlı kanat kübital indeksi. Hiçbir dış servis çağrılmaz.
 * Kesin ırk için kanat morfometrisi (çok sayıda kanat, uzman) veya DNA analizi gerekir.
 */
(function (global) {
  'use strict';
  var D = global.SuperAriDemo;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mode() { try { return localStorage.getItem('superari.workMode') === 'live' ? 'live' : 'demo'; } catch (e) { return 'demo'; } }
  function num(v, d) { return String(Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).replace('.', ','); }

  /* ---------------- 1) Fotoğraf: karın bantları renk analizi ---------------- */
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, mx ? d / mx : 0, mx];
  }
  /** ImageData (veya {width,height,data}) → analiz. Merkezdeki %70 alan kullanılır. */
  function analyzePixels(img) {
    var w = img.width, hgt = img.height, px = img.data;
    var x0 = Math.floor(w * 0.15), x1 = Math.ceil(w * 0.85), y0 = Math.floor(hgt * 0.15), y1 = Math.ceil(hgt * 0.85);
    var cw = x1 - x0, ch = y1 - y0;
    var gray = new Float32Array(cw * ch);
    var n = 0, sum = 0, sum2 = 0, yel = 0, dark = 0, grey = 0, over = 0;
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) {
        var i = (y * w + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
        var l = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[(y - y0) * cw + (x - x0)] = l; sum += l; sum2 += l * l; n++;
        if (l > 250) over++;
        var hsv = rgb2hsv(r, g, b), H = hsv[0], S = hsv[1], V = hsv[2];
        if (H >= 20 && H <= 60 && S >= 0.35 && V >= 0.40) yel++;
        else if (V < 0.28) dark++;
        else if ((S < 0.35 && V < 0.58) || (H <= 40 && S < 0.55 && V < 0.5)) grey++;
      }
    }
    var mean = sum / n, sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    var lap = 0, ln = 0;
    for (var yy = 1; yy < ch - 1; yy++) {
      for (var xx = 1; xx < cw - 1; xx++) {
        var k = yy * cw + xx;
        var v = 4 * gray[k] - gray[k - 1] - gray[k + 1] - gray[k - cw] - gray[k + cw];
        lap += v * v; ln++;
      }
    }
    var sharp = ln ? lap / ln : 0;
    var bee = yel + dark + grey, cover = bee / n, yr = bee ? yel / bee : 0;
    var issues = [];
    if (mean < 55) issues.push('Fotoğraf çok karanlık — gün ışığında çekin');
    if (mean > 210 || over / n > 0.25) issues.push('Fotoğraf çok parlak / patlamış — gölgede veya flaşsız çekin');
    if (sharp < 40) issues.push('Fotoğraf bulanık — telefonu sabit tutun, arıya odaklanın');
    if (sd < 18) issues.push('Kontrast düşük');
    if (cover < 0.15) issues.push('Arı karnı kareyi doldurmuyor — yakından çekin, arka planı azaltın');
    var group = !bee || cover < 0.08 ? null : (yr >= 0.28 ? 'sari' : (yr <= 0.12 ? 'koyu' : 'karisik'));
    var dist = group === 'sari' ? (yr - 0.28) / 0.25 : (group === 'koyu' ? (0.12 - yr) / 0.12 : 0.15);
    var q = 1 - Math.min(0.6, issues.length * 0.2);
    var conf = group ? Math.round(Math.max(15, Math.min(70, (35 + 45 * Math.min(1, Math.max(0, dist))) * q * Math.min(1, cover / 0.3)))) : 0;
    if (issues.length) conf = Math.min(conf, 45); /* kalite sorunu varsa güven en fazla «düşük» */
    return { ok: !!group, group: group, yellowRatio: yr, coverage: cover, brightness: mean, sharpness: sharp, issues: issues, conf: conf,
      confLabel: conf >= 50 ? 'orta' : 'düşük' };
  }
  var GROUP_TEXT = {
    sari: 'Sarı bantlı — İtalyan / sarı melez olabilir',
    koyu: 'Koyu / gri — Kafkas, Karniyol, Karadeniz grubu olabilir',
    karisik: 'Karışık / kahverengi — Anadolu, Muğla veya melez olabilir'
  };
  function analyzeFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var sc = Math.min(1, 360 / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * sc)); c.height = Math.max(1, Math.round(im.naturalHeight * sc));
        var g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
        var res = analyzePixels(g.getImageData(0, 0, c.width, c.height));
        res.preview = c.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(url); resolve(res);
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Fotoğraf açılamadı')); };
      im.src = url;
    });
  }

  /* ---------------- 2) Davranış soruları ---------------- */
  var BREEDS = ['Kafkas', 'Karadeniz', 'Karniyol', 'Anadolu', 'Muğla', 'İtalyan', 'Buckfast'];
  /* Her seçenek: ırk → puan (0–2). Genel arıcılık kaynaklarındaki özelliklerden; yaklaşık. */
  var QUESTIONS = [
    { id: 'uysal', q: 'Uysallık (muayenede)', opts: [
      ['cok', 'Çok sakin', { Kafkas: 2, Karadeniz: 1, Karniyol: 2, İtalyan: 1, Buckfast: 2 }],
      ['sakin', 'Sakin', { Kafkas: 2, Karadeniz: 2, Karniyol: 2, İtalyan: 2, Buckfast: 2, Muğla: 1 }],
      ['orta', 'Orta', { Kafkas: 1, Karadeniz: 1, Anadolu: 1, Muğla: 2, İtalyan: 1 }],
      ['sinirli', 'Sinirli / saldırgan', { Anadolu: 2, Muğla: 1 }]] },
    { id: 'propolis', q: 'Propolis miktarı', opts: [
      ['cok', 'Çok', { Kafkas: 2, Karadeniz: 2, Anadolu: 1 }],
      ['orta', 'Orta', { Anadolu: 2, Muğla: 2, İtalyan: 1, Kafkas: 1 }],
      ['az', 'Az', { Karniyol: 2, Buckfast: 2, İtalyan: 1 }]] },
    { id: 'gelisim', q: 'İlkbahar gelişim hızı', opts: [
      ['hizli', 'Hızlı / erken', { Karniyol: 2, Muğla: 2, İtalyan: 1, Buckfast: 1 }],
      ['orta', 'Orta', { Karadeniz: 2, Kafkas: 1, Anadolu: 1, İtalyan: 1, Buckfast: 1 }],
      ['yavas', 'Yavaş / geç', { Kafkas: 2, Karadeniz: 1, Anadolu: 1 }]] },
    { id: 'ogul', q: 'Oğul geçmişi', opts: [
      ['sik', 'Sık oğul verir', { Karniyol: 2, Muğla: 2 }],
      ['ara', 'Ara sıra', { Anadolu: 2, İtalyan: 2, Muğla: 1, Karniyol: 1 }],
      ['nadir', 'Nadir / hiç', { Kafkas: 2, Karadeniz: 2, Buckfast: 2 }]] },
    { id: 'kis', q: 'Kış tüketimi', opts: [
      ['az', 'Az (tutumlu)', { Karniyol: 2, Anadolu: 2, Muğla: 1, Karadeniz: 1 }],
      ['orta', 'Orta', { Kafkas: 2, Buckfast: 2, Karadeniz: 1, Muğla: 1 }],
      ['cok', 'Çok', { İtalyan: 2 }]] },
    { id: 'renk', q: 'Renk (gözleminiz)', opts: [
      ['sari', 'Sarı bantlı', { İtalyan: 2, Buckfast: 1 }],
      ['kahve', 'Kahverengi / karışık', { Anadolu: 2, Buckfast: 2, Muğla: 1 }],
      ['koyu', 'Koyu gri / siyah', { Kafkas: 2, Karadeniz: 2, Karniyol: 2, Muğla: 1, Anadolu: 1 }]] },
    { id: 'dil', q: 'Dil uzunluğu (biliniyorsa)', opts: [
      ['uzun', 'Uzun (≈6,8 mm ve üstü)', { Kafkas: 2, Karadeniz: 2 }],
      ['orta', 'Orta / kısa', { Karniyol: 1, Anadolu: 1, Muğla: 1, İtalyan: 1, Buckfast: 1 }]] }
  ];
  var PHOTO_PTS = {
    sari: { İtalyan: 2, Buckfast: 1 },
    koyu: { Kafkas: 1.5, Karadeniz: 1.5, Karniyol: 1.5, Muğla: 0.5, Anadolu: 0.5 },
    karisik: { Anadolu: 1, Muğla: 1, Buckfast: 1 }
  };
  /* ---------------- 3) Kanat: kübital indeks (yaklaşık başvuru aralıkları) ---------------- */
  var CI_REF = [
    { race: 'A. m. caucasica (Kafkas, Karadeniz)', lo: 1.7, hi: 2.2, breeds: ['Kafkas', 'Karadeniz'] },
    { race: 'A. m. anatoliaca (Anadolu, Muğla)', lo: 1.9, hi: 2.4, breeds: ['Anadolu', 'Muğla'] },
    { race: 'A. m. ligustica (İtalyan)', lo: 2.2, hi: 2.6, breeds: ['İtalyan', 'Buckfast'] },
    { race: 'A. m. carnica (Karniyol)', lo: 2.4, hi: 3.0, breeds: ['Karniyol'] }
  ];
  function ciPoints(mean, n) {
    var out = {};
    if (mean == null || !n) return out;
    var w = Math.min(1, n / 5);
    CI_REF.forEach(function (r) {
      var p = mean >= r.lo && mean <= r.hi ? 2 : (mean >= r.lo - 0.15 && mean <= r.hi + 0.15 ? 1 : 0);
      r.breeds.forEach(function (b) { out[b] = Math.max(out[b] || 0, p * w); });
    });
    return out;
  }

  /** Adaylar: { list:[{breed, score, pct, word}], answered, hybrid } */
  function candidates(answers, photo, wing) {
    var sc = {}, max = 0, answered = 0;
    BREEDS.forEach(function (b) { sc[b] = 0; });
    QUESTIONS.forEach(function (q) {
      var a = answers[q.id]; if (!a) return;
      var o = q.opts.filter(function (x) { return x[0] === a; })[0]; if (!o) return;
      answered++; max += 2;
      Object.keys(o[2]).forEach(function (b) { sc[b] += o[2][b]; });
    });
    if (photo && photo.group) {
      var f = photo.conf / 70; max += 2 * f;
      var pp = PHOTO_PTS[photo.group];
      Object.keys(pp).forEach(function (b) { sc[b] += pp[b] * f; });
    }
    if (wing && wing.n) {
      var cp = ciPoints(wing.mean, wing.n); max += 2 * Math.min(1, wing.n / 5);
      Object.keys(cp).forEach(function (b) { sc[b] += cp[b]; });
    }
    var list = BREEDS.map(function (b) { return { breed: b, score: sc[b], pct: max ? Math.round(sc[b] / max * 100) : 0 }; })
      .sort(function (x, y) { return y.score - x.score; }).slice(0, 3);
    list.forEach(function (c, i) { c.word = i === 0 ? 'En muhtemel' : 'Muhtemel'; });
    var enough = answered >= 3 || (answered >= 1 && (photo && photo.group || (wing && wing.n >= 3)));
    var hybrid = enough && list.length > 1 && list[0].pct - list[1].pct <= 8 ? list[0].breed + ' × ' + list[1].breed : '';
    return { list: list, answered: answered, enough: enough && list[0].score > 0, hybrid: hybrid };
  }

  /* ---------------- Arayüz ---------------- */
  var css = '.it-back{position:fixed;inset:0;background:rgba(30,20,10,.45);z-index:9000;display:flex;align-items:flex-end;justify-content:center;}' +
    '.it-sheet{background:#fffaf2;width:100%;max-width:560px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px 24px;box-sizing:border-box;color:#3d2616;}' +
    '.it-sheet h2{margin:0;font-size:18px;display:flex;align-items:center;gap:8px;}.it-x{margin-left:auto;border:0;background:#efe4d2;border-radius:999px;width:32px;height:32px;font-size:18px;cursor:pointer;}' +
    '.it-tabs{display:flex;gap:6px;margin:10px 0;flex-wrap:wrap;}.it-tabs button{flex:1 1 auto;font:inherit;font-size:13px;font-weight:700;padding:7px 8px;border-radius:10px;border:1px solid #c9b79c;background:#fff;color:#3d2616;cursor:pointer;}' +
    '.it-tabs button.on{background:#3d2616;color:#fff;border-color:#3d2616;}' +
    '.it-sec{border:1px solid #eadfcd;background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;}.it-sec h3{margin:0 0 6px;font-size:14px;}' +
    '.it-sec p{margin:4px 0;font-size:13px;line-height:1.4;}.it-mut{color:#6b5a48;font-size:12px;}.it-warn{background:#fff4e6;border:1px solid #ffd8a8;color:#8a4b00;border-radius:10px;padding:6px 8px;font-size:12px;margin:4px 0;}' +
    '.it-q{margin:8px 0;}.it-q b{display:block;font-size:13px;margin-bottom:4px;}.it-opts{display:flex;flex-wrap:wrap;gap:5px;}' +
    '.it-opts label{display:inline-flex;align-items:center;gap:4px;border:1px solid #d9cbb5;border-radius:999px;padding:5px 9px;font-size:12.5px;background:#fff;cursor:pointer;}' +
    '.it-opts input{margin:0;}.it-opts label.on{border-color:#3d2616;background:#f3e9d8;font-weight:700;}' +
    '.it-btn{font:inherit;font-size:13px;font-weight:700;border-radius:10px;padding:8px 11px;border:1px solid #3d2616;background:#3d2616;color:#fff;cursor:pointer;}' +
    '.it-btn.sec{background:#fff;color:#3d2616;border-color:#c9b79c;}.it-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;}' +
    '.it-cand{border:1px solid #eadfcd;border-radius:10px;padding:8px;margin:6px 0;background:#fffdf8;}.it-cand b{font-size:14px;}' +
    '.it-bar{height:7px;background:#efe4d2;border-radius:99px;overflow:hidden;margin:5px 0;}.it-bar i{display:block;height:100%;background:#b07a2a;}' +
    '.it-prev{max-width:100%;border-radius:10px;display:block;margin:6px 0;}.it-wing{position:relative;overflow:auto;max-width:100%;border:1px solid #eadfcd;border-radius:10px;touch-action:manipulation;}' +
    '.it-wing canvas{display:block;}.it-ok{color:#1b7a3d;font-size:13px;margin-top:6px;}';
  function ensureCss() { if (document.getElementById('irkCss')) return; var s = document.createElement('style'); s.id = 'irkCss'; s.textContent = css; document.head.appendChild(s); }
  function close() { var b = document.getElementById('irkSheet'); if (b) b.remove(); }

  function open(hiveId, opts) {
    opts = opts || {};
    var h = D.hiveById(hiveId); if (!h) return;
    ensureCss(); close();
    var st = { tab: 'foto', photo: null, answers: {}, wing: { list: [], pts: [], img: null, zoom: 1 } };
    /* Mevcut kayıtlardan ön doldurma: sakinlik ve gözlenen oğul eğilimi. */
    if (h.calmness != null) st.answers.uysal = h.calmness >= 5 ? 'cok' : (h.calmness >= 4 ? 'sakin' : (h.calmness >= 3 ? 'orta' : 'sinirli'));
    if (h.swarmTendency) st.answers.ogul = h.swarmTendency === 'Yüksek' ? 'sik' : (h.swarmTendency === 'Orta' ? 'ara' : 'nadir');
    var back = document.createElement('div'); back.className = 'it-back'; back.id = 'irkSheet';
    back.innerHTML = '<div class="it-sheet" role="dialog" aria-modal="true" aria-label="Irk tahmini">' +
      '<h2>Irk tahmini (kesin değil)<button type="button" class="it-x" data-it-close aria-label="Kapat">×</button></h2>' +
      '<div class="it-mut">' + esc(h.name) + ' · şu an: ' + esc(D.colony.breedLabel(h)) + (mode() === 'demo' ? ' · Demo' : '') + ' · internet gerekmez, fotoğraf cihazdan çıkmaz</div>' +
      '<div class="it-tabs" role="tablist"><button type="button" data-it-tab="foto">1 · Fotoğraf</button><button type="button" data-it-tab="soru">2 · Davranış</button><button type="button" data-it-tab="kanat">3 · Kanat</button></div>' +
      '<div data-it-body></div><div data-it-res></div>' +
      '<p class="it-mut">Kesin ırk için kanat morfometrisi (çok sayıda kanat, uzman değerlendirmesi) veya DNA analizi gerekir. Bu tahmin yalnız yol göstericidir.</p></div>';
    document.body.appendChild(back);
    var body = back.querySelector('[data-it-body]'), resEl = back.querySelector('[data-it-res]');

    function wingStats() {
      var l = st.wing.list; if (!l.length) return { n: 0, mean: null };
      var m = l.reduce(function (a, b) { return a + b; }, 0) / l.length;
      return { n: l.length, mean: m };
    }
    function renderRes() {
      var c = candidates(st.answers, st.photo, wingStats());
      if (!c.enough) { resEl.innerHTML = '<div class="it-sec"><h3>Sonuç</h3><p class="it-mut">En az 3 soruyu yanıtlayın (veya 1 soru + fotoğraf / 3 kanat ölçümü). Yanıtlanan: ' + c.answered + '</p></div>'; return; }
      resEl.innerHTML = '<div class="it-sec"><h3>Muhtemel ırklar</h3>' + c.list.map(function (x, i) {
        return '<div class="it-cand"><b>' + esc(x.word) + ': ' + esc(x.breed) + '</b><div class="it-bar"><i style="width:' + Math.max(4, x.pct) + '%"></i></div>' +
          '<div class="it-row"><button type="button" class="it-btn' + (i ? ' sec' : '') + '" data-it-accept="' + esc(x.breed) + '">Kabul et → «' + esc(x.breed) + ' (tahmini)»</button></div></div>';
      }).join('') +
        (c.hybrid ? '<p class="it-mut">İlk iki aday birbirine çok yakın: <b>' + esc(c.hybrid) + '</b> melezi olabilir.</p>' +
          (D.colony.BREED_OPTIONS.indexOf(c.hybrid) >= 0 ? '<div class="it-row"><button type="button" class="it-btn sec" data-it-accept="' + esc(c.hybrid) + '">Kabul et → «' + esc(c.hybrid) + ' (tahmini)»</button></div>' : '') : '') +
        '<div class="it-ok" data-it-msg hidden></div></div>';
    }
    function renderFoto() {
      var p = st.photo;
      body.innerHTML = '<div class="it-sec"><h3>İşçi arı fotoğrafı (karın yakın çekim)</h3>' +
        '<p class="it-mut">Gün ışığında, flaşsız, 2–3 işçi arının karnını kareyi dolduracak şekilde çekin. Bal/polen/petek arka planı sonucu yanıltabilir.</p>' +
        '<div class="it-row"><label class="it-btn" style="display:inline-block;">📷 Fotoğraf çek / seç<input type="file" accept="image/*" capture="environment" data-it-file hidden></label></div>' +
        (p ? (p.preview ? '<img class="it-prev" alt="Analiz edilen fotoğraf" src="' + p.preview + '">' : '') +
          p.issues.map(function (x) { return '<div class="it-warn">⚠ ' + esc(x) + '</div>'; }).join('') +
          (p.group ? '<p><b>' + esc(GROUP_TEXT[p.group]) + '</b></p><p class="it-mut">Sarı bant oranı ≈ %' + Math.round(p.yellowRatio * 100) + ' · güven: ' + p.confLabel + ' (%' + p.conf + ')</p>'
            : '<p><b>Arı rengi belirlenemedi.</b> Daha yakından ve net çekin.</p>') +
          '<p class="it-mut">Fotoğraf tek başına ırk söylemez; yalnız renk grubuna işaret eder.</p>' : '') + '</div>';
    }
    function renderSoru() {
      body.innerHTML = '<div class="it-sec"><h3>Davranış ve gözlem</h3><p class="it-mut">Bildiklerinizi işaretleyin; bilmediklerinizi boş bırakın.' + (h.calmness != null || h.swarmTendency ? ' Sakinlik ve oğul eğilimi kovan kaydından dolduruldu.' : '') + '</p>' +
        QUESTIONS.map(function (q) {
          return '<div class="it-q"><b>' + esc(q.q) + '</b><div class="it-opts">' + q.opts.map(function (o) {
            var on = st.answers[q.id] === o[0];
            return '<label class="' + (on ? 'on' : '') + '"><input type="radio" name="it-' + q.id + '" value="' + o[0] + '"' + (on ? ' checked' : '') + ' data-it-q="' + q.id + '">' + esc(o[1]) + '</label>';
          }).join('') + (st.answers[q.id] ? '<label data-it-clear="' + q.id + '">Temizle</label>' : '') + '</div></div>';
        }).join('') + '</div>';
    }
    function renderKanat() {
      var ws = wingStats();
      body.innerHTML = '<div class="it-sec"><h3>Kanat: kübital indeks (isteğe bağlı)</h3>' +
        '<p class="it-mut">Ön kanadın net, düz fotoğrafını yükleyin (lup / makro). 3. kübital hücrenin alt kenarındaki damarda sırayla dokunun: ' +
        '<b>1</b> damarın başı, <b>2</b> birleşme noktası, <b>3</b> damarın sonu. İndeks = a (1→2) / b (2→3). En az 5, ideali 10+ kanat ölçün.</p>' +
        '<div class="it-row"><label class="it-btn" style="display:inline-block;">🪽 Kanat fotoğrafı<input type="file" accept="image/*" data-it-wfile hidden></label>' +
        (st.wing.img ? '<button type="button" class="it-btn sec" data-it-wzoom>' + (st.wing.zoom > 1 ? 'Küçült' : 'Büyüt') + '</button><button type="button" class="it-btn sec" data-it-wundo>Geri al</button>' : '') + '</div>' +
        (st.wing.img ? '<div class="it-wing" data-it-wbox><canvas data-it-wcan></canvas></div><p class="it-mut" data-it-wstep></p>' : '') +
        (ws.n ? '<p><b>Ortalama kübital indeks: ' + num(ws.mean, 2) + '</b> (' + ws.n + ' kanat: ' + st.wing.list.map(function (v) { return num(v, 2); }).join(', ') + ')</p>' +
          '<button type="button" class="it-btn sec" data-it-wclear>Ölçümleri sıfırla</button>' : '') +
        '<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:8px;">' + CI_REF.map(function (r) {
          var hit = ws.n && ws.mean >= r.lo && ws.mean <= r.hi;
          return '<tr style="' + (hit ? 'font-weight:800;background:#f3e9d8;' : '') + '"><td style="padding:3px 4px;border-top:1px solid #eadfcd;">' + esc(r.race) + '</td><td style="padding:3px 4px;border-top:1px solid #eadfcd;white-space:nowrap;">≈ ' + num(r.lo, 1) + '–' + num(r.hi, 1) + '</td></tr>';
        }).join('') + '</table>' +
        '<p class="it-mut">Aralıklar yaklaşıktır ve örtüşür; tek başına ırk belirlemez. Kaynaklar: Ruttner F. (1988) <i>Biogeography and Taxonomy of Honeybees</i>, Springer; ' +
        'Kandemir İ., Kence M., Kence A. (2000) <i>Apidologie</i> 31: 343–356 (Türkiye bal arısı populasyonları). Diskoidal kayma bu araçta ölçülmez.</p></div>';
      if (st.wing.img) drawWing();
    }
    function drawWing() {
      var can = back.querySelector('[data-it-wcan]'), box = back.querySelector('[data-it-wbox]'); if (!can) return;
      var im = st.wing.img, bw = box.clientWidth || 320, W = Math.round(bw * st.wing.zoom), H = Math.round(W * im.naturalHeight / im.naturalWidth);
      can.width = W; can.height = H;
      var g = can.getContext('2d'); g.drawImage(im, 0, 0, W, H);
      var P = st.wing.pts.map(function (p) { return [p[0] * W, p[1] * H]; });
      g.lineWidth = 2; g.strokeStyle = '#e8590c';
      if (P.length > 1) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.stroke(); }
      P.forEach(function (p, i) { g.fillStyle = '#e8590c'; g.beginPath(); g.arc(p[0], p[1], 5, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = 'bold 10px sans-serif'; g.fillText(String(i + 1), p[0] - 3, p[1] + 3.5); });
      var stepEl = back.querySelector('[data-it-wstep]');
      if (stepEl) stepEl.textContent = st.wing.pts.length < 3 ? 'Dokunun: nokta ' + (st.wing.pts.length + 1) + '/3' : '';
    }
    function render() {
      Array.prototype.forEach.call(back.querySelectorAll('[data-it-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-it-tab') === st.tab); });
      if (st.tab === 'foto') renderFoto(); else if (st.tab === 'soru') renderSoru(); else renderKanat();
      renderRes();
    }
    back.addEventListener('click', function (e) {
      var t = e.target;
      if (t === back || t.hasAttribute('data-it-close')) { close(); return; }
      if (t.hasAttribute('data-it-tab')) { st.tab = t.getAttribute('data-it-tab'); render(); return; }
      if (t.hasAttribute('data-it-clear')) { delete st.answers[t.getAttribute('data-it-clear')]; render(); return; }
      if (t.hasAttribute('data-it-wzoom')) { st.wing.zoom = st.wing.zoom > 1 ? 1 : 2.5; drawWing(); t.textContent = st.wing.zoom > 1 ? 'Küçült' : 'Büyüt'; return; }
      if (t.hasAttribute('data-it-wundo')) { st.wing.pts.pop(); drawWing(); return; }
      if (t.hasAttribute('data-it-wclear')) { st.wing.list = []; st.wing.pts = []; render(); return; }
      if (t.hasAttribute('data-it-wcan')) {
        var r = t.getBoundingClientRect();
        st.wing.pts.push([(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]);
        if (st.wing.pts.length === 3) {
          var im = st.wing.img, P = st.wing.pts.map(function (p) { return [p[0] * im.naturalWidth, p[1] * im.naturalHeight]; });
          var a = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), b = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
          if (b > 0 && a / b > 0.8 && a / b < 5) st.wing.list.push(a / b);
          else global.alert && global.alert('Ölçüm geçersiz (a/b beklenen aralıkta değil). Noktaları sırayla işaretleyin.');
          st.wing.pts = [];
          render();
        } else drawWing();
        return;
      }
      if (t.hasAttribute('data-it-accept')) {
        var br = t.getAttribute('data-it-accept');
        var saved = D.colony.setBreedEstimate(h.id, br);
        var m = back.querySelector('[data-it-msg]');
        if (saved) {
          try {
            var row = D.taskStore.add({ title: 'Irk tahmini kaydedildi: ' + br + ' (tahmini) — ' + h.name + (mode() === 'demo' ? ' · Demo' : ''), hiveId: h.id, priority: 3, note: '[irk:tahmin]' });
            if (row) D.taskStore.complete(row.id, { note: 'Irk tahmini (kesin değil)' });
          } catch (eT) { /* ignore */ }
          if (m) { m.hidden = false; m.textContent = 'Kaydedildi: ' + br + ' (tahmini). Oğul riskinde ana arı karakteri olarak kullanılır, «tahmini» etiketiyle.'; }
          if (typeof opts.onSaved === 'function') opts.onSaved(saved);
        } else if (m) { m.hidden = false; m.textContent = 'Kaydedilemedi.'; }
      }
    });
    back.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-it-q')) { st.answers[t.getAttribute('data-it-q')] = t.value; render(); return; }
      if (t.hasAttribute('data-it-file') && t.files && t.files[0]) {
        analyzeFile(t.files[0]).then(function (res) { st.photo = res; render(); }, function () { st.photo = { issues: ['Fotoğraf açılamadı'], group: null }; render(); });
      }
      if (t.hasAttribute('data-it-wfile') && t.files && t.files[0]) {
        var url = URL.createObjectURL(t.files[0]), im = new Image();
        im.onload = function () { st.wing.img = im; st.wing.pts = []; render(); };
        im.src = url;
      }
    });
    render();
  }
  global.SuperAriIrk = { open: open, close: close, analyzePixels: analyzePixels, candidates: candidates, QUESTIONS: QUESTIONS, CI_REF: CI_REF };
})(window);

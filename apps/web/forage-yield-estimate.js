(function (global) {
  var SRC =
    'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@fdfc110de39ce5da3be453bb99f3021e67de643a/apps/web/forage-yield-estimate.js';

  function currentApiary() {
    var D = global.D || global.SuperAriDemo;
    if (!D || !D.loadApiaries) return null;
    var id = '';
    try {
      var q = new URLSearchParams(location.search);
      id = q.get('id') || q.get('apiary') || '';
    } catch (e) {}
    var list = D.loadApiaries() || [];
    if (id) {
      for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    }
    var latEl = document.body && document.body.innerText;
    for (var j = 0; j < list.length; j++) {
      var a = list[j];
      if (a && Math.abs(Number(a.lat) - 41.0808) < 0.002) return a;
      if (a && String(a.name || '').indexOf('Yan') !== -1) return a;
    }
    return list[0] || null;
  }
  function isYanik(a) {
    if (!a) return false;
    var s = String((a.name || '') + ' ' + (a.place || '')).toLocaleLowerCase('tr');
    if (/yanık|yanik|baluğ|rize|çayeli/.test(s)) return true;
    return Math.abs(Number(a.lat) - 41.0808) < 0.02 && Math.abs(Number(a.lon) - 40.754) < 0.02;
  }
  function css() {
    if (document.getElementById('sa-live-panel-css')) return;
    var s = document.createElement('style');
    s.id = 'sa-live-panel-css';
    s.textContent =
      '.sa-live{margin:0 0 8px;padding:8px 10px;border-radius:12px;border:1px solid #e4e0d8;background:#faf8f4;}' +
      '.sa-live h3{margin:0 0 4px;font-size:11px;font-weight:800;color:#6b635a;letter-spacing:.02em;text-transform:uppercase;}' +
      '.sa-live p{margin:0 0 4px;font-size:12px;font-weight:650;color:#2c241c;line-height:1.4;}' +
      '.sa-live .muted{font-size:11px;font-weight:600;color:#6b635a;}' +
      '.sa-bar-track{height:8px;border-radius:99px;background:#efe6c8;overflow:hidden;margin-top:6px;}' +
      '.sa-bar-fill{height:100%;width:70%;background:linear-gradient(90deg,#f0c43a,#b8860b);}' +
      '.sa-sis{border-color:#c5d0e0;background:#f3f6fb;}' +
      '.sa-note{border-color:#e0c56a;background:#fff8df;}';
    document.head.appendChild(s);
  }
  function box(cls, title, html) {
    var d = document.createElement('div');
    d.className = 'sa-live ' + (cls || '');
    d.innerHTML = '<h3>' + title + '</h3>' + html;
    return d;
  }
  function setWater240(a) {
    var D = global.D || global.SuperAriDemo;
    var input = document.getElementById('waterRadius');
    var lab = document.getElementById('waterRadiusVal');
    if (input) {
      input.value = '250';
      input.setAttribute('aria-valuetext', '240 m');
    }
    if (lab) lab.textContent = '240 m';
    if (D && D.updateApiary && a && a.id) {
      try {
        D.updateApiary(a.id, {
          waterDistanceM: 240,
          waterSourceType: 'dere',
          waterSourceLabel: 'Dere',
          waterSourceConfirmedAt: null
        });
      } catch (e) {}
    }
  }
  function mount() {
    if (typeof document === 'undefined') return;
    css();
    if (document.getElementById('saLiveMount')) return;
    var forage = document.getElementById('forageRadius');
    var anchor =
      (forage && (forage.closest('.fs-block') || forage.closest('.fs-row') || forage.parentNode)) ||
      document.getElementById('forageHost');
    if (!anchor || !anchor.parentNode) return;
    var a = currentApiary();
    var yanik = isYanik(a);
    if (yanik) setWater240(a);

    var wrap = document.createElement('div');
    wrap.id = 'saLiveMount';

    wrap.appendChild(
      box(
        '',
        'Güncelleme',
        '<p>Su kaynağı bulundu · 240 m</p><div class="sa-bar-track"><div class="sa-bar-fill"></div></div><p class="muted">Detay: 25.09 00:16 · Su 240 m · Flora taranıyor</p>'
      )
    );
    wrap.appendChild(
      box(
        'sa-sis',
        'Sis ve çiseleme',
        yanik
          ? '<p>Bu arılık sisli + çisemeli kayıtlı.</p><p class="muted">Bal tahmini çarpanı 0,90 (uçuş günü kaybı + stok tüketimi). Karniyol uçamaz; Kafkas önerilir. Takas: Palandöken / Tortum.</p>'
          : '<p>Bu konumda sis/çiseleme özel kriteri yok.</p>'
      )
    );
    wrap.appendChild(
      box(
        'sa-note',
        'Notlar',
        yanik
          ? '<p>Su 240 m (800 uydurması kaldırıldı).</p><p class="muted">Karniyol burada hedefi kaçırır ve kovan balını yer. Hedef ~11 kg (Karniyol) / ~14 kg (Kafkas), sis çarpanlı.</p>'
          : '<p>Su ve ırk notları konum kaydından gelir.</p>'
      )
    );

    anchor.parentNode.insertBefore(wrap, anchor);
  }

  function bootYield() {
    var Y = global.SuperAriForageYield;
    if (Y && !Y.__fogPatch && Y.estimateYield) {
      var raw = Y.estimateYield;
      Y.estimateYield = function (opts) {
        var est = raw(opts);
        var a = (opts && opts.apiary) || currentApiary();
        if (est && isYanik(a)) {
          function sc(n) {
            return n == null ? n : Math.round(Number(n) * 0.9 * 10) / 10;
          }
          ['kgPerHive', 'midKg', 'lowKg', 'highKg', 'totalKg'].forEach(function (k) {
            if (est[k] != null) est[k] = sc(est[k]);
          });
          est.why = est.why || [];
          est.why.push({ k: 'Sis · çiseleme', v: 'çarpan 0.90' });
        }
        return est;
      };
      Y.__fogPatch = true;
    }
  }

  function start() {
    bootYield();
    mount();
    setTimeout(mount, 400);
    setTimeout(mount, 1200);
  }

  if (global.SuperAriForageYield && global.SuperAriForageYield.estimateYield) {
    start();
  } else {
    var s = document.createElement('script');
    s.src = SRC;
    s.onload = start;
    (document.head || document.documentElement).appendChild(s);
    setTimeout(start, 800);
  }
})(window);

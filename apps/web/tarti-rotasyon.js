/**
 * SüperArı — Kat rotasyonu tartım sihirbazı (tek kovan / tüm kovanlar).
 * Adımlar: yapılandırma → tartı A → rotasyon onayı → tartı B → özet.
 */
(function (global) {
  'use strict';

  var KEY_LIVE = 'superari.tartiRotasyon.v1';
  var KEY_DEMO = 'superari.tartiRotasyon.demo.v1';
  var STEPS = ['config', 'weighA', 'rotate', 'weighB', 'summary'];

  function isLive() { try { return localStorage.getItem('superari.workMode') === 'live'; } catch (e) { return false; } }
  function storeKey() { return isLive() ? KEY_LIVE : KEY_DEMO; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function nowLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function num(v) { return String(Math.round(Number(v) * 10) / 10).replace('.', ','); }
  function parseKg(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function katKg() {
    var BD = global.SuperAriTartiBakim;
    return BD && BD.DELTA && BD.DELTA.katKg ? Number(BD.DELTA.katKg) : 8;
  }

  function readSessions() {
    try { var v = JSON.parse(localStorage.getItem(storeKey()) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
  }
  function writeSessions(all) { try { localStorage.setItem(storeKey(), JSON.stringify(all)); } catch (e) { /* ignore */ } }

  function initialState(opts) {
    opts = opts || {};
    return {
      step: opts.step || 'config',
      mode: opts.mode === 'all' ? 'all' : 'single',
      apiaryId: opts.apiaryId != null ? String(opts.apiaryId) : '',
      hiveId: opts.hiveId != null ? Number(opts.hiveId) : null,
      queue: Array.isArray(opts.queue) ? opts.queue.slice() : [],
      queueIndex: opts.queueIndex || 0,
      body: opts.body != null ? Number(opts.body) : 1,
      katBefore: opts.katBefore != null ? Number(opts.katBefore) : null,
      removedBox: opts.removedBox || '2',
      separateSuper: !!opts.separateSuper,
      weighA: opts.weighA || null,
      weighB: opts.weighB || null,
      manualOnly: !!opts.manualOnly,
      fromBakim: !!opts.fromBakim
    };
  }

  function stepIndex(step) {
    var i = STEPS.indexOf(step);
    return i >= 0 ? i : 0;
  }

  /** Durum makinesi — test için saf fonksiyon. */
  function transition(state, action) {
    state = initialState(state);
    action = action || {};
    var t = action.type;
    if (t === 'reset') return initialState(action.payload || {});
    if (t === 'setConfig') {
      state.body = action.body != null ? Number(action.body) : state.body;
      state.katBefore = action.katBefore != null ? Number(action.katBefore) : state.katBefore;
      state.removedBox = action.removedBox || state.removedBox;
      state.separateSuper = action.separateSuper != null ? !!action.separateSuper : state.separateSuper;
      state.step = 'weighA';
      return state;
    }
    if (t === 'weighA' && state.step === 'weighA') {
      state.weighA = action.reading || null;
      state.step = 'rotate';
      return state;
    }
    if (t === 'confirmRotate' && state.step === 'rotate') {
      state.step = 'weighB';
      return state;
    }
    if (t === 'weighB' && state.step === 'weighB') {
      state.weighB = action.reading || null;
      state.step = 'summary';
      return state;
    }
    if (t === 'back' && stepIndex(state.step) > 0) {
      state.step = STEPS[stepIndex(state.step) - 1];
      return state;
    }
    if (t === 'nextHive' && state.mode === 'all') {
      state.queueIndex += 1;
      if (state.queueIndex >= state.queue.length) {
        state.step = 'summary';
        return state;
      }
      state.hiveId = state.queue[state.queueIndex];
      state.step = 'config';
      state.weighA = null;
      state.weighB = null;
      return state;
    }
    return state;
  }

  function reconcile(state) {
    var a = state.weighA && state.weighA.kg != null ? Number(state.weighA.kg) : null;
    var b = state.weighB && state.weighB.kg != null ? Number(state.weighB.kg) : null;
    if (a == null || b == null) return { deltaKg: null, expectedKg: null, note: 'Eksik tartım' };
    var delta = Math.round((b - a) * 100) / 100;
    var k = katKg();
    var expected = state.separateSuper ? k : 0;
    var tol = state.separateSuper ? 2.5 : 1.5;
    var ok = Math.abs(delta - expected) <= tol;
    var note = state.separateSuper
      ? (ok ? 'Üst kat ayrı tartıldı; delta ~' + num(k) + ' kg ile uyumlu.' : 'Beklenen ~' + num(expected) + ' kg, ölçülen ' + num(delta) + ' kg — kutuyu tekrar kontrol edin.')
      : (ok ? 'Tam istif tartımı: rotasyon sonrası toplam ağırlık yakın (±' + num(tol) + ' kg).' : 'Toplam ağırlık ' + num(delta) + ' kg değişti; kutu çıkarıldı/eklendi mi kontrol edin.');
    return { deltaKg: delta, expectedKg: expected, ok: ok, note: note, katKgAssumed: k };
  }

  function hivesForApiary(apiaryId) {
    var D = global.SuperAriDemo;
    if (!D || !D.loadHives) return [];
    return D.loadHives().filter(function (h) {
      return h.colonyState !== 'birlestirildi' && h.colonyState !== 'sonuk'
        && (apiaryId === 'all' || !apiaryId || String(h.apiaryId) === String(apiaryId));
    });
  }

  function hasScale(hiveId) {
    var T = global.SuperAriTarti;
    return !!(T && T.scaleDevice && T.scaleDevice(hiveId));
  }

  function requestAutoWeigh(hiveId) {
    var requestedAt = nowLocal();
    var Poll = global.SuperAriSensorPolling;
    var T = global.SuperAriTarti;
    if (Poll && Poll.requestTartiWeigh) {
      var rq = Poll.requestTartiWeigh(hiveId);
      if (rq && rq.ok && rq.row && rq.row.kg != null) {
        return { kg: Number(rq.row.kg), at: rq.row.at || requestedAt, source: 'talep', deviceId: rq.device && rq.device.id, requestedAt: requestedAt };
      }
    }
    if (T && T.autoReading) {
      var ar = T.autoReading(hiveId);
      if (ar && ar.kg != null) return { kg: Number(ar.kg), at: ar.at || requestedAt, source: 'talep', deviceId: ar.device && ar.device.id, requestedAt: requestedAt };
    }
    return null;
  }

  function saveWeighReading(hiveId, reading, phase) {
    var T = global.SuperAriTarti;
    if (!T || !T.add || !reading || reading.kg == null) return null;
    var note = 'Kat rotasyonu · ' + (phase === 'A' ? 'önce' : 'sonra');
    if (reading.manual) note += ' (elle)';
    return T.add({
      hiveId: hiveId,
      at: reading.at || nowLocal(),
      kg: reading.kg,
      source: reading.source === 'elle' ? 'elle' : 'talep',
      deviceId: reading.deviceId,
      requestedAt: reading.requestedAt,
      note: note
    });
  }

  function persistSession(hiveId, state) {
    var all = readSessions();
    all[String(hiveId)] = { updatedAt: nowLocal(), state: state };
    writeSessions(all);
  }

  var css = '.tr-back{position:fixed;inset:0;background:rgba(30,20,10,.48);z-index:9200;display:flex;align-items:flex-end;justify-content:center;}' +
    '.tr{width:100%;max-width:560px;max-height:92vh;overflow:auto;background:#fffaf2;border-radius:18px 18px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom));color:#3d2616;box-sizing:border-box;}' +
    '.tr h2{margin:0 0 6px;font-size:18px;}.tr .tr-x{float:right;border:0;background:#efe4d2;border-radius:999px;width:48px;height:48px;font-size:22px;}' +
    '.tr-step{margin:8px 0 12px;font-size:13px;font-weight:800;color:#5c4813;}.tr-prog{height:6px;border-radius:999px;background:#efe4d2;margin:0 0 12px;overflow:hidden;}.tr-prog>i{display:block;height:100%;background:#2f9e44;}' +
    '.tr label.f{display:grid;gap:4px;font-size:13px;font-weight:700;margin:8px 0;}.tr input,.tr select{font:inherit;font-size:17px;min-height:52px;padding:8px 10px;border-radius:12px;border:1px solid #d8c7aa;width:100%;box-sizing:border-box;}' +
    '.tr-btn{font:inherit;font-size:17px;font-weight:800;min-height:56px;border-radius:14px;border:1px solid #3d2616;background:#3d2616;color:#fff;width:100%;margin:6px 0;cursor:pointer;}' +
    '.tr-btn.sec{background:#fff;color:#3d2616;}.tr-btn.ok{background:#1b5e20;border-color:#1b5e20;}' +
    '.tr-banner{padding:10px 12px;border-radius:12px;background:#fff3bf;border:1px solid #ffe066;font-size:13px;font-weight:700;margin:0 0 10px;}' +
    '.tr-msg{font-size:14px;font-weight:700;margin:8px 0;}.tr-msg.wait{color:#1864ab;}.tr-msg.ok{color:#1b7a3d;}.tr-msg.warn{color:#c92a2a;}' +
    '.tr-list{max-height:200px;overflow:auto;border:1px solid #e8dcc6;border-radius:12px;padding:8px;font-size:14px;}';

  function ensureCss() {
    if (typeof document === 'undefined' || document.getElementById('trCss')) return;
    var s = document.createElement('style');
    s.id = 'trCss';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function close() {
    var el = document.getElementById('trSheet');
    if (el) el.remove();
  }

  function renderProgress(state) {
    var pct = Math.round((stepIndex(state.step) + 1) / STEPS.length * 100);
    return '<div class="tr-prog" aria-hidden="true"><i style="width:' + pct + '%"></i></div>';
  }

  function open(opts) {
    opts = opts || {};
    var D = global.SuperAriDemo;
    if (!D || typeof document === 'undefined') return;
    ensureCss();
    if (global.SuperAriTarti && global.SuperAriTarti.ensureCss) global.SuperAriTarti.ensureCss();
    close();

    var state = initialState({
      mode: opts.mode || (opts.all ? 'all' : 'single'),
      apiaryId: opts.apiaryId || '',
      hiveId: opts.hiveId != null ? Number(opts.hiveId) : null,
      fromBakim: !!opts.fromBakim
    });

    if (state.mode === 'all') {
      state.queue = hivesForApiary(state.apiaryId || 'all').map(function (h) { return h.id; });
      state.hiveId = state.queue[0] || null;
    }

    var h = state.hiveId != null ? D.hiveById(state.hiveId) : null;
    if (h) {
      try {
        var bx = D.colony && D.colony.boxes ? D.colony.boxes(h) : null;
        if (bx) { state.body = bx.body; state.katBefore = bx.kat; }
      } catch (eB) { /* ignore */ }
    }
    state.manualOnly = h ? !hasScale(h.id) : false;

    var back = document.createElement('div');
    back.className = 'tr-back';
    back.id = 'trSheet';

    function title() {
      var hh = state.hiveId != null ? D.hiveById(state.hiveId) : null;
      return '⚖ Kat rotasyonu tartım' + (hh ? ' · ' + esc(hh.name) : '') + (state.mode === 'all' ? ' (' + (state.queueIndex + 1) + '/' + state.queue.length + ')' : '');
    }

    function bodyHtml() {
      if (state.fromBakim && state.step === 'config') {
        return '<div class="tr-banner">Rotasyon için tartım gerekli — önce tam istifi, rotasyonu yaptıktan sonra tekrar tartın.</div>';
      }
      if (state.step === 'config') {
        return '<p class="tr-step">1/5 · Kovan yapısı (rotasyon öncesi)</p>' +
          '<label class="f">Gövde sayısı<input type="number" name="body" min="1" max="2" value="' + esc(state.body) + '"></label>' +
          '<label class="f">Bal kat sayısı<input type="number" name="katBefore" min="1" max="4" value="' + esc(state.katBefore != null ? state.katBefore : 2) + '"></label>' +
          '<label class="f">Kaldırılan kutu<select name="removedBox"><option value="2"' + (state.removedBox === '2' ? ' selected' : '') + '>2. kat (dolu)</option><option value="ust"' + (state.removedBox === 'ust' ? ' selected' : '') + '>Üst kat</option></select></label>' +
          '<label class="f"><input type="checkbox" name="separateSuper"' + (state.separateSuper ? ' checked' : '') + '> Üst / kaldırılan kat ayrı tartıldı</label>' +
          '<button type="button" class="tr-btn ok" data-tr-next>Devam · Tartı A</button>';
      }
      if (state.step === 'weighA' || state.step === 'weighB') {
        var phase = state.step === 'weighA' ? 'A' : 'B';
        var lab = phase === 'A' ? 'Rotasyon öncesi tam istif' : 'Rotasyon sonrası tam istif';
        var manual = state.manualOnly || !hasScale(state.hiveId);
        return '<p class="tr-step">' + (phase === 'A' ? '2/5' : '4/5') + ' · Tartı ' + phase + '</p>' +
          '<p style="margin:0 0 8px;font-size:14px;font-weight:700;">' + esc(lab) + '</p>' +
          (manual ? '<div class="tr-banner">El kantarı: kg girin.</div>' : '<button type="button" class="tr-btn ok" data-tr-auto>📡 Tarttır (otomatik)</button><p class="tr-msg wait" data-tr-status hidden></p>') +
          '<label class="f">Ağırlık (kg)<input type="number" name="kg" inputmode="decimal" step="0.1" placeholder="ör. 48,2"></label>' +
          '<button type="button" class="tr-btn" data-tr-save-' + phase.toLowerCase() + '>Kaydet · Tartı ' + phase + '</button>';
      }
      if (state.step === 'rotate') {
        return '<p class="tr-step">3/5 · Rotasyon</p>' +
          '<p style="font-size:14px;font-weight:700;">2. katı kaldırın, 3. katı 2. sıraya koyun, istifi tamamlayın. Hazır olduğunuzda onaylayın.</p>' +
          '<button type="button" class="tr-btn ok" data-tr-rotate>Rotasyonu yaptım</button>';
      }
      var rec = reconcile(state);
      return '<p class="tr-step">5/5 · Özet</p>' +
        '<p class="tr-msg ' + (rec.ok ? 'ok' : 'warn') + '">Δ ' + (rec.deltaKg != null ? num(rec.deltaKg) : '—') + ' kg · ' + esc(rec.note) + '</p>' +
        (state.mode === 'all' && state.queueIndex < state.queue.length - 1
          ? '<button type="button" class="tr-btn ok" data-tr-next-hive">Sonraki kovan</button>'
          : '<button type="button" class="tr-btn ok" data-tr-done>Kapat</button>');
    }

    function paint() {
      back.innerHTML = '<div class="tr" role="dialog" aria-modal="true"><h2>' + title() + '<button type="button" class="tr-x" data-tr-close aria-label="Kapat">×</button></h2>' +
        renderProgress(state) + bodyHtml() + '</div>';
    }
    paint();

    function prefillKg() {
      var T = global.SuperAriTarti;
      var lat = T && T.latest ? T.latest(state.hiveId) : null;
      var inp = back.querySelector('input[name=kg]');
      if (inp && lat && lat.kg && !inp.value) inp.value = String(lat.kg).replace('.', ',');
    }
    prefillKg();

    back.addEventListener('click', function (e) {
      if (e.target.closest('[data-tr-close]') || e.target === back) { close(); return; }
      if (e.target.closest('[data-tr-done]')) { close(); return; }

      if (e.target.closest('[data-tr-next]')) {
        var f = back.querySelector('.tr');
        state = transition(state, {
          type: 'setConfig',
          body: Number(f.querySelector('[name=body]').value),
          katBefore: Number(f.querySelector('[name=katBefore]').value),
          removedBox: f.querySelector('[name=removedBox]').value,
          separateSuper: f.querySelector('[name=separateSuper]').checked
        });
        paint();
        prefillKg();
        return;
      }

      if (e.target.closest('[data-tr-auto]')) {
        var st = back.querySelector('[data-tr-status]');
        if (st) { st.hidden = false; st.textContent = 'Tartılıyor…'; }
        global.setTimeout(function () {
          var rd = requestAutoWeigh(state.hiveId);
          var inp = back.querySelector('input[name=kg]');
          if (rd && inp) inp.value = String(rd.kg).replace('.', ',');
          if (st) st.textContent = rd ? 'Okuma alındı: ' + num(rd.kg) + ' kg' : 'Otomatik okuma yok — elle girin.';
        }, 600);
        return;
      }

      function savePhase(phase) {
        var inp = back.querySelector('input[name=kg]');
        var kg = parseKg(inp && inp.value);
        if (!(kg > 0)) return;
        var reading = { kg: kg, at: nowLocal(), source: state.manualOnly ? 'elle' : 'talep', requestedAt: nowLocal(), manual: state.manualOnly };
        if (!state.manualOnly) {
          var auto = requestAutoWeigh(state.hiveId);
          if (auto) reading = Object.assign(reading, auto, { kg: kg });
        }
        saveWeighReading(state.hiveId, reading, phase);
        state = transition(state, { type: phase === 'A' ? 'weighA' : 'weighB', reading: reading });
        persistSession(state.hiveId, state);
        paint();
        prefillKg();
      }

      if (e.target.closest('[data-tr-save-a]')) { savePhase('A'); return; }
      if (e.target.closest('[data-tr-save-b]')) { savePhase('B'); return; }
      if (e.target.closest('[data-tr-rotate]')) {
        state = transition(state, { type: 'confirmRotate' });
        paint();
        prefillKg();
        return;
      }
      if (e.target.closest('[data-tr-next-hive]')) {
        state = transition(state, { type: 'nextHive' });
        var hh = state.hiveId != null ? D.hiveById(state.hiveId) : null;
        state.manualOnly = hh ? !hasScale(hh.id) : true;
        paint();
        prefillKg();
      }
    });

    document.body.appendChild(back);
  }

  /** Tüm kovanları sırayla tarttır (otomatik cihazlar aralıklı, manuel liste). */
  function weighAll(opts) {
    opts = opts || {};
    var apiaryId = opts.apiaryId || '';
    var hives = hivesForApiary(apiaryId || 'all');
    var auto = [], manual = [];
    hives.forEach(function (h) {
      if (hasScale(h.id)) auto.push(h);
      else manual.push(h);
    });
    if (manual.length && !opts.skipManualPrompt) {
      ensureCss();
      var back = document.createElement('div');
      back.className = 'tr-back';
      back.id = 'trBulkManual';
      var rows = manual.map(function (h) {
        return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0;"><input type="checkbox" checked data-hive="' + h.id + '"> ' + esc(h.name) + ' (manuel)</label>';
      }).join('');
      back.innerHTML = '<div class="tr"><h2>Tümünü tarttır</h2><p>El kantarı olan kovanlar için tartım sihirbazı açılacak. Otomatik tartı: ' + auto.length + ' kovan.</p><div class="tr-list">' + rows + '</div>' +
        '<button type="button" class="tr-btn ok" data-bulk-go>Başlat</button></div>';
      back.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-bulk-go]')) {
          var ids = [];
          back.querySelectorAll('[data-hive]').forEach(function (cb) {
            if (cb.checked) ids.push(Number(cb.getAttribute('data-hive')));
          });
          back.remove();
          runBulkAuto(auto, ids, apiaryId);
        }
      });
      document.body.appendChild(back);
      return;
    }
    runBulkAuto(auto, manual.map(function (h) { return h.id; }), apiaryId);
  }

  function runBulkAuto(autoHives, manualIds, apiaryId) {
    var stagger = 7000;
    autoHives.forEach(function (h, i) {
      global.setTimeout(function () {
        var rd = requestAutoWeigh(h.id);
        if (rd) saveWeighReading(h.id, rd, 'A');
      }, i * stagger);
    });
    if (manualIds && manualIds.length) {
      global.setTimeout(function () {
        open({ mode: 'all', apiaryId: apiaryId, hiveId: manualIds[0], queue: manualIds });
      }, autoHives.length * stagger + 400);
    }
  }

  function weighOne(hiveId) {
    var rd = requestAutoWeigh(hiveId);
    if (rd) {
      saveWeighReading(hiveId, rd, 'A');
      return { ok: true, reading: rd };
    }
    open({ hiveId: hiveId });
    return { ok: false, openedWizard: true };
  }

  var API = {
    STEPS: STEPS,
    initialState: initialState,
    transition: transition,
    reconcile: reconcile,
    katKg: katKg,
    open: open,
    close: close,
    weighAll: weighAll,
    weighOne: weighOne,
    requestAutoWeigh: requestAutoWeigh
  };

  if (typeof document === 'undefined') {
    if (typeof module !== 'undefined') module.exports = API;
    return;
  }
  global.SuperAriTartiRotasyon = API;
})(typeof window !== 'undefined' ? window : this);

/**
 * SüperArı — Net bal ağırlığı (kovan tipi kataloğu, darası, çerçeve tahmini).
 *
 * Depo: superari.balAgirlik.v1 — global ince ayar (özellikle «özel» tip ve arı kitlesi).
 * Kovan: hiveType, emptyHiveKg, emptyHiveSource (manuel|tarti|varsayilan), lastTareAt.
 */
(function (global) {
  'use strict';

  var KEY = 'superari.balAgirlik.v1';
  var TARE_SOURCES = ['manuel', 'tarti', 'varsayilan'];
  var DEFAULT_HIVE_TYPE = 'langstroth_10';

  /**
   * Türkiye pazarı varsayılanları — ballı çerçeve ≈ 3 kg (bakim-plan.js KG_PER_HONEY_FRAME ile uyumlu).
   * emptyHiveKg: taban + çatı + boş gövde/kat yığını (çerçeveli, arısız).
   */
  var HIVE_TYPE_CATALOG = {
    langstroth_10: {
      key: 'langstroth_10',
      label: 'Langstroth 10 çerçeve (standart)',
      frameCapacity: 10,
      emptyHiveKg: 18.5,
      frameEmptyKg: 1.2,
      frameHoneyKg: 3
    },
    dadant_11: {
      key: 'dadant_11',
      label: 'Dadant 11 çerçeve',
      frameCapacity: 11,
      emptyHiveKg: 20,
      frameEmptyKg: 1.25,
      frameHoneyKg: 3.1
    },
    langstroth_8: {
      key: 'langstroth_8',
      label: 'Langstroth 8 çerçeve (küçük)',
      frameCapacity: 8,
      emptyHiveKg: 15.5,
      frameEmptyKg: 1.1,
      frameHoneyKg: 2.8
    },
    kafkas: {
      key: 'kafkas',
      label: 'Kafkas / bölgesel yüksek gövde',
      frameCapacity: 10,
      emptyHiveKg: 22,
      frameEmptyKg: 1.3,
      frameHoneyKg: 3
    },
    ozel: {
      key: 'ozel',
      label: 'Özel — elle kg girin',
      frameCapacity: null,
      emptyHiveKg: null,
      frameEmptyKg: 1.2,
      frameHoneyKg: 3
    }
  };

  var DEFAULTS = {
    tabanKg: 2.5,
    govdeKg: 8,
    katKg: 6.5,
    frameEmptyKg: HIVE_TYPE_CATALOG.langstroth_10.frameEmptyKg,
    frameHoneyKg: HIVE_TYPE_CATALOG.langstroth_10.frameHoneyKg,
    subtractBeeMass: false,
    beeMassKg: 0.8
  };

  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  function parseKg(v) {
    var n = Number(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(n) ? round2(n) : NaN;
  }
  function readJ(k, d) {
    try { var v = JSON.parse(global.localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; }
  }
  function writeJ(k, v) { try { global.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtKg(n) {
    if (n == null || !isFinite(Number(n))) return '—';
    return String(round2(n)).replace('.', ',') + ' kg';
  }

  function normalizeHiveTypeKey(v) {
    var k = String(v == null ? '' : v).trim();
    return HIVE_TYPE_CATALOG[k] ? k : DEFAULT_HIVE_TYPE;
  }

  function typeSpec(key) {
    return HIVE_TYPE_CATALOG[normalizeHiveTypeKey(key)] || HIVE_TYPE_CATALOG[DEFAULT_HIVE_TYPE];
  }

  function hiveTypeOptionsHtml(selected) {
    var cur = normalizeHiveTypeKey(selected);
    return Object.keys(HIVE_TYPE_CATALOG).map(function (k) {
      var t = HIVE_TYPE_CATALOG[k];
      return '<option value="' + esc(k) + '"' + (k === cur ? ' selected' : '') + '>' + esc(t.label) + '</option>';
    }).join('');
  }

  function defaultSettings() {
    return {
      global: {
        frameEmptyKg: DEFAULTS.frameEmptyKg,
        frameHoneyKg: DEFAULTS.frameHoneyKg,
        subtractBeeMass: DEFAULTS.subtractBeeMass,
        beeMassKg: DEFAULTS.beeMassKg
      },
      apiaries: {}
    };
  }
  function loadSettings() {
    var s = readJ(KEY, null);
    if (!s || typeof s !== 'object') return defaultSettings();
    if (!s.global || typeof s.global !== 'object') s.global = defaultSettings().global;
    if (!s.apiaries || typeof s.apiaries !== 'object') s.apiaries = {};
    return s;
  }
  function saveSettings(s) { writeJ(KEY, s || defaultSettings()); }

  function D() { return global.SuperAriDemo || null; }
  function hiveById(id) {
    var demo = D();
    if (!demo || !demo.hiveById) return null;
    return demo.hiveById(Number(id)) || null;
  }

  function resolveHiveType(h) {
    if (!h) return DEFAULT_HIVE_TYPE;
    return normalizeHiveTypeKey(h.hiveType);
  }

  function hiveBoxes(h) {
    if (!h) return { body: 1, kat: 0 };
    var Ddemo = D();
    if (Ddemo && Ddemo.colony && Ddemo.colony.boxes) {
      try { var b = Ddemo.colony.boxes(h); return { body: b.body || 1, kat: b.kat || 0 }; } catch (e) { /* ignore */ }
    }
    var bx = h.boxes;
    if (bx && typeof bx === 'object') return { body: Number(bx.body) || 1, kat: Number(bx.kat) || 0 };
    return { body: 1, kat: 0 };
  }

  /** Tip kataloğundan veya (özel) yığın formülünden boş kovan kg. */
  function defaultEmptyHiveKg(hive) {
    var h = hive || {};
    var type = resolveHiveType(h);
    var spec = typeSpec(type);
    if (type !== 'ozel' && spec.emptyHiveKg > 0) return spec.emptyHiveKg;
    var b = hiveBoxes(h);
    var body = Math.max(1, Math.min(3, Math.round(Number(b.body) || 1)));
    var kat = Math.max(0, Math.min(4, Math.round(Number(b.kat) || 0)));
    return round2(DEFAULTS.tabanKg + body * DEFAULTS.govdeKg + kat * DEFAULTS.katKg);
  }

  function frameWeightsForHive(h, apiaryId) {
    var type = resolveHiveType(h);
    var spec = typeSpec(type);
    var s = loadSettings(), g = s.global || {}, a = apiaryId ? (s.apiaries[String(apiaryId)] || {}) : {};
    if (type === 'ozel') {
      return {
        frameEmptyKg: parseKg(a.frameEmptyKg != null ? a.frameEmptyKg : g.frameEmptyKg) || spec.frameEmptyKg,
        frameHoneyKg: parseKg(a.frameHoneyKg != null ? a.frameHoneyKg : g.frameHoneyKg) || spec.frameHoneyKg
      };
    }
    return {
      frameEmptyKg: spec.frameEmptyKg,
      frameHoneyKg: spec.frameHoneyKg
    };
  }

  function frameWeights(apiaryId, hiveId) {
    var h = hiveId != null ? hiveById(hiveId) : null;
    return frameWeightsForHive(h, apiaryId || (h ? h.apiaryId : null));
  }

  function getHiveTare(hiveId) {
    var h = hiveById(hiveId);
    if (!h) return { kg: typeSpec(DEFAULT_HIVE_TYPE).emptyHiveKg, source: 'varsayilan', lastTareAt: null, hiveType: DEFAULT_HIVE_TYPE };
    var kg = parseKg(h.emptyHiveKg);
    var src = TARE_SOURCES.indexOf(h.emptyHiveSource) >= 0 ? h.emptyHiveSource : (kg > 0 ? 'manuel' : 'varsayilan');
    if (!(kg > 0)) {
      kg = defaultEmptyHiveKg(h);
      src = 'varsayilan';
    }
    return { kg: kg, source: src, lastTareAt: h.lastTareAt || null, hiveType: resolveHiveType(h) };
  }

  function setHiveTare(hiveId, kg, source, at) {
    var demo = D();
    if (!demo || !demo.colony || !demo.colony.updateHive) return null;
    var n = parseKg(kg);
    if (!(n > 0 && n < 200)) throw new Error('Geçerli bir kovan boş ağırlığı girin (kg)');
    var src = TARE_SOURCES.indexOf(source) >= 0 ? source : 'manuel';
    var day = String(at || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      day = demo.colony.todayLocal ? demo.colony.todayLocal() : new Date().toISOString().slice(0, 10);
    }
    return demo.colony.updateHive(hiveId, { emptyHiveKg: n, emptyHiveSource: src, lastTareAt: day }, 'correct');
  }

  /** Tip değişince önerilen dara; updateTare true ise varsayılana yaz. */
  function applyHiveType(hiveId, typeKey, opts) {
    var o = opts || {};
    var demo = D();
    if (!demo || !demo.colony || !demo.colony.updateHive) return null;
    var h = hiveById(hiveId);
    if (!h) return null;
    var type = normalizeHiveTypeKey(typeKey);
    var spec = typeSpec(type);
    var patch = { hiveType: type };
    var src = h.emptyHiveSource || 'varsayilan';
    if (o.updateTare || src === 'varsayilan' || !(parseKg(h.emptyHiveKg) > 0)) {
      if (type !== 'ozel' && spec.emptyHiveKg > 0) {
        patch.emptyHiveKg = spec.emptyHiveKg;
        patch.emptyHiveSource = 'varsayilan';
        patch.lastTareAt = demo.colony.todayLocal ? demo.colony.todayLocal() : new Date().toISOString().slice(0, 10);
      }
    }
    if (o.emptyHiveKg != null) {
      patch.emptyHiveKg = parseKg(o.emptyHiveKg);
      patch.emptyHiveSource = o.emptyHiveSource || 'manuel';
    }
    return demo.colony.updateHive(hiveId, patch, 'correct');
  }

  function typeHintHtml(typeKey) {
    var spec = typeSpec(typeKey);
    var per = round2(spec.frameHoneyKg - spec.frameEmptyKg);
    return 'Önerilen boş kovan: <b>' + fmtKg(spec.emptyHiveKg) + '</b> · çerçeve farkı ≈ ' + fmtKg(per) +
      (spec.frameCapacity ? ' · ' + spec.frameCapacity + ' çerçeve kapasite' : ' · kg elle girilir');
  }

  function materialTareKg(hiveId, at) {
    var T = global.SuperAriTarti;
    if (!T || !T.tare) return { kg: 0, items: [] };
    try { return T.tare(hiveId, at || ''); } catch (e) { return { kg: 0, items: [] }; }
  }

  function netHoneyFromScale(totalKg, hiveId, opts) {
    var o = opts || {};
    var total = parseKg(totalKg);
    if (!(total > 0)) return null;
    var tare = getHiveTare(hiveId);
    var mat = o.skipMaterial ? { kg: 0 } : materialTareKg(hiveId, o.at);
    var s = loadSettings().global || {};
    var bee = (o.subtractBeeMass != null ? o.subtractBeeMass : s.subtractBeeMass) ? (parseKg(s.beeMassKg) || DEFAULTS.beeMassKg) : 0;
    var net = round2(total - tare.kg - (mat.kg || 0) - bee);
    return {
      netKg: net > 0 ? net : 0,
      grossKg: total,
      emptyHiveKg: tare.kg,
      emptyHiveSource: tare.source,
      hiveType: tare.hiveType,
      materialTareKg: mat.kg || 0,
      beeMassKg: bee || 0
    };
  }

  function estimateHarvestKg(hiveId, honeyFrames, partial) {
    var h = hiveById(hiveId);
    var fw = frameWeightsForHive(h, h ? h.apiaryId : null);
    var n = Math.max(0, Math.round(Number(honeyFrames) || 0));
    var p = partial == null ? 1 : Math.max(0, Math.min(1, Number(partial)));
    var per = Math.max(0, fw.frameHoneyKg - fw.frameEmptyKg);
    return round2(n * per * p);
  }

  function reconcileHarvestScale(hiveId, beforeKg, afterKg, opts) {
    var b = parseKg(beforeKg), a = parseKg(afterKg);
    if (!(b > 0 && a >= 0)) return null;
    var o = opts || {};
    var matBefore = o.skipMaterial ? 0 : (materialTareKg(hiveId, o.beforeAt).kg || 0);
    var matAfter = o.skipMaterial ? 0 : (materialTareKg(hiveId, o.afterAt).kg || 0);
    var netScale = round2((b - matBefore) - (a - matAfter));
    var est = estimateHarvestKg(hiveId, o.honeyFrames, o.partial);
    return {
      netKg: netScale > 0 ? netScale : 0,
      scaleDeltaKg: netScale,
      frameEstimateKg: est > 0 ? est : null,
      method: est > 0 && Math.abs(netScale - est) <= Math.max(1.5, est * 0.25) ? 'karma' : 'tarti'
    };
  }

  function pickMethod(hasKg, hasFrames, explicit) {
    if (explicit && /^(cerceve|tarti|karma)$/.test(explicit)) return explicit;
    if (hasKg && hasFrames) return 'karma';
    if (hasFrames) return 'cerceve';
    if (hasKg) return 'tarti';
    return 'tarti';
  }

  function enrichHarvestRow(row) {
    if (!row || row.hiveId == null) return row;
    var out = {};
    Object.keys(row).forEach(function (k) { out[k] = row[k]; });
    var userHoney = parseKg(out.honeyKg != null ? out.honeyKg : out.kg);
    var hadUserKg = userHoney > 0;
    var frames = Math.max(0, Math.round(Number(out.frames) || 0));
    var est = frames > 0 ? estimateHarvestKg(out.hiveId, frames, out.partial) : null;
    var honey = hadUserKg ? userHoney : (est > 0 ? est : 0);
    if (honey > 0) out.honeyKg = honey;
    out.method = pickMethod(hadUserKg, frames > 0, out.method);
    if (out.netKg == null || !isFinite(Number(out.netKg))) {
      if (out.method === 'cerceve' && est > 0) out.netKg = est;
      else if (honey > 0) out.netKg = honey;
    }
    if (out.scaleBeforeKg != null && out.scaleAfterKg != null) {
      var rec = reconcileHarvestScale(out.hiveId, out.scaleBeforeKg, out.scaleAfterKg, { honeyFrames: frames, partial: out.partial });
      if (rec && rec.netKg > 0) {
        out.netKg = rec.netKg;
        if (rec.method === 'karma') out.method = 'karma';
        else if (out.method === 'cerceve' && honey > 0) out.method = 'karma';
        else out.method = 'tarti';
      }
    }
    return out;
  }

  function harvestEventText(row) {
    var kg = row.netKg != null ? row.netKg : row.honeyKg;
    if (!(Number(kg) > 0)) return null;
    var p = ['Sağım: ' + fmtKg(kg) + ' bal'];
    if (row.frames) p.push(row.frames + ' çerçeve');
    if (row.method === 'cerceve') p.push('çerçeve tahmini');
    else if (row.method === 'tarti') p.push('tartı');
    else if (row.method === 'karma') p.push('tartı + çerçeve');
    return p.join(' · ');
  }

  function settingsPanelHtml() {
    var s = loadSettings(), g = s.global || {};
    return '<div id="balAgirlikBox" style="display:grid;gap:.55rem;padding:.7rem .8rem;border:1px solid var(--border,#ead9b3);border-radius:12px;background:#fffdf6;min-width:0;">' +
      '<strong style="font-size:.95rem;">🍯 Net bal ve çerçeve varsayılanları</strong>' +
      '<p class="muted" style="margin:0;font-size:.82rem;line-height:1.4;">Kovan tipi kovan kaydında seçilir (varsayılan Langstroth 10). «Özel» tip için aşağıdaki çerçeve kg kullanılır.</p>' +
      '<label style="font-size:.85rem;">Boş çerçeve (kg, özel tip) <input type="number" id="baFrameEmpty" min="0.5" max="5" step="0.1" inputmode="decimal" value="' + esc(g.frameEmptyKg) + '"></label>' +
      '<label style="font-size:.85rem;">Ballı çerçeve (kg, özel tip) <input type="number" id="baFrameHoney" min="1" max="6" step="0.1" inputmode="decimal" value="' + esc(g.frameHoneyKg) + '"></label>' +
      '<label class="kr-checkline" style="font-size:.85rem;"><input type="checkbox" id="baBeeMass" ' + (g.subtractBeeMass ? 'checked' : '') + '> Tartıdan arı kitlesi düş (varsayılan kapalı, ~' + DEFAULTS.beeMassKg + ' kg)</label>' +
      '<button type="button" class="btn secondary" id="baSaveDefaults">Kaydet</button>' +
      '</div>';
  }

  function wireSettingsPanel(root) {
    var box = (root || document).getElementById('balAgirlikBox');
    if (!box) return;
    var btn = box.querySelector('#baSaveDefaults');
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', function () {
      var s = loadSettings();
      s.global.frameEmptyKg = parseKg(box.querySelector('#baFrameEmpty').value) || DEFAULTS.frameEmptyKg;
      s.global.frameHoneyKg = parseKg(box.querySelector('#baFrameHoney').value) || DEFAULTS.frameHoneyKg;
      s.global.subtractBeeMass = !!box.querySelector('#baBeeMass').checked;
      saveSettings(s);
      btn.textContent = 'Kaydedildi ✓';
      setTimeout(function () { btn.textContent = 'Kaydet'; }, 2000);
    });
  }

  function openHiveTareDialog(hiveId, onSaved) {
    var h = hiveById(hiveId);
    if (!h) return;
    var cur = getHiveTare(hiveId);
    var spec = typeSpec(cur.hiveType);
    var def = defaultEmptyHiveKg(h);
    var msg = spec.label + '\n\nÖnerilen boş kovan: ' + def + ' kg\nMevcut: ' + cur.kg + ' kg (' + cur.source + ')';
    var v = global.prompt(msg, String(cur.source === 'varsayilan' ? def : cur.kg));
    if (v == null) return;
    try {
      setHiveTare(hiveId, v, 'manuel');
      if (typeof onSaved === 'function') onSaved();
    } catch (e) {
      global.alert((e && e.message) || 'Kaydedilemedi');
    }
  }

  /** loadHives sonrası bir kez: hiveType yok → langstroth_10 */
  function migrateHiveTypesOnList(list) {
    if (!Array.isArray(list)) return { list: list, changed: false };
    var changed = false;
    var out = list.map(function (h) {
      if (!h || !isFinite(h.id)) return h;
      if (h.hiveType && HIVE_TYPE_CATALOG[h.hiveType]) return h;
      var c = {};
      Object.keys(h).forEach(function (k) { c[k] = h[k]; });
      c.hiveType = DEFAULT_HIVE_TYPE;
      changed = true;
      return c;
    });
    return { list: out, changed: changed };
  }

  global.SuperAriBalAgirlik = {
    KEY: KEY,
    DEFAULTS: DEFAULTS,
    DEFAULT_HIVE_TYPE: DEFAULT_HIVE_TYPE,
    HIVE_TYPE_CATALOG: HIVE_TYPE_CATALOG,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    normalizeHiveTypeKey: normalizeHiveTypeKey,
    typeSpec: typeSpec,
    hiveTypeOptionsHtml: hiveTypeOptionsHtml,
    typeHintHtml: typeHintHtml,
    resolveHiveType: resolveHiveType,
    frameWeights: frameWeights,
    frameWeightsForHive: frameWeightsForHive,
    defaultEmptyHiveKg: defaultEmptyHiveKg,
    getHiveTare: getHiveTare,
    setHiveTare: setHiveTare,
    applyHiveType: applyHiveType,
    netHoneyFromScale: netHoneyFromScale,
    estimateHarvestKg: estimateHarvestKg,
    reconcileHarvestScale: reconcileHarvestScale,
    enrichHarvestRow: enrichHarvestRow,
    harvestEventText: harvestEventText,
    fmtKg: fmtKg,
    settingsPanelHtml: settingsPanelHtml,
    wireSettingsPanel: wireSettingsPanel,
    openHiveTareDialog: openHiveTareDialog,
    migrateHiveTypesOnList: migrateHiveTypesOnList
  };
})(typeof window !== 'undefined' ? window : globalThis);

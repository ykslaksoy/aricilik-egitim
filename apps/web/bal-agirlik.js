/**
 * SüperArı — Net bal ağırlığı (kovan tipi kataloğu, darası, çerçeve tahmini).
 *
 * Depo: superari.balAgirlik.v1 — global ince ayar (özellikle «özel» tip ve arı kitlesi).
 * Kovan: hiveType, emptyHiveKg, emptyHiveSource (manuel|tarti|varsayilan), lastTareAt.
 */
(function (global) {
  'use strict';

  var KEY = 'superari.balAgirlik.v1';
  var CUSTOM_TYPES_KEY = 'superari.hiveTypes.custom.v1';
  var TARE_SOURCES = ['manuel', 'tarti', 'varsayilan'];
  var DEFAULT_HIVE_TYPE = 'langstroth_10';

  /**
   * TR/Avrupa yaygın tipler — ballı çerçeve ≈ 3 kg (bakim-plan.js KG_PER_HONEY_FRAME ile uyumlu).
   * emptyHiveKg: taban + çatı + boş gövde/kat (çerçeveli, arısız). Ağırlıklar pazar ortalaması tahmini.
   */
  var HIVE_TYPE_CATALOG = {
    langstroth_10: {
      key: 'langstroth_10',
      label: 'Langstroth',
      subtitle: 'Standart · 10 çerçeve',
      frameCapacity: 10,
      emptyHiveKg: 18.5,
      frameEmptyKg: 1.2,
      frameHoneyKg: 3
    },
    langstroth_8: {
      key: 'langstroth_8',
      label: 'Langstroth',
      subtitle: 'Küçük gövde · 8 çerçeve',
      frameCapacity: 8,
      emptyHiveKg: 15.5,
      frameEmptyKg: 1.1,
      frameHoneyKg: 2.8
    },
    dadant_11: {
      key: 'dadant_11',
      label: 'Dadant',
      subtitle: '11 çerçeve',
      frameCapacity: 11,
      emptyHiveKg: 20,
      frameEmptyKg: 1.25,
      frameHoneyKg: 3.1
    },
    layens_12: {
      key: 'layens_12',
      label: 'Layens',
      subtitle: '12 çerçeve (yaygın referans)',
      frameCapacity: 12,
      emptyHiveKg: 17.5,
      frameEmptyKg: 1.05,
      frameHoneyKg: 2.85
    },
    national: {
      key: 'national',
      label: 'National',
      subtitle: 'British National · 10 çerçeve',
      frameCapacity: 10,
      emptyHiveKg: 16,
      frameEmptyKg: 1.1,
      frameHoneyKg: 2.9
    },
    warre: {
      key: 'warre',
      label: 'Warre',
      subtitle: 'Küçük kutu · 8 çerçeve eşdeğeri',
      frameCapacity: 8,
      emptyHiveKg: 12.5,
      frameEmptyKg: 0.85,
      frameHoneyKg: 2.2
    },
    kafkas: {
      key: 'kafkas',
      label: 'Kafkas',
      subtitle: 'Bölgesel yüksek gövde · 10 çerçeve',
      frameCapacity: 10,
      emptyHiveKg: 22,
      frameEmptyKg: 1.3,
      frameHoneyKg: 3
    },
    ozel: {
      key: 'ozel',
      label: 'Özel',
      subtitle: 'Elle boş kg ve çerçeve ağırlığı',
      frameCapacity: null,
      emptyHiveKg: null,
      frameEmptyKg: 1.2,
      frameHoneyKg: 3
    }
  };

  var HIVE_TYPE_ORDER = ['langstroth_10', 'langstroth_8', 'dadant_11', 'layens_12', 'national', 'warre', 'kafkas', 'ozel'];

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

  function loadCustomHiveType() {
    var raw = readJ(CUSTOM_TYPES_KEY, null);
    if (!raw || typeof raw !== 'object' || !raw.id) return null;
    var id = String(raw.id).trim();
    if (!/^custom_[a-z0-9_]{1,28}$/.test(id)) return null;
    var label = String(raw.label || '').trim().slice(0, 60);
    if (!label) return null;
    var emptyHiveKg = parseKg(raw.emptyHiveKg);
    var frameEmptyKg = parseKg(raw.frameEmptyKg);
    var frameHoneyKg = parseKg(raw.frameHoneyKg);
    var frameCapacity = raw.frameCapacity == null || raw.frameCapacity === '' ? null : Math.round(Number(raw.frameCapacity));
    if (!(emptyHiveKg > 0) || !(frameEmptyKg > 0) || !(frameHoneyKg > frameEmptyKg)) return null;
    if (frameCapacity != null && (!(frameCapacity > 0) || frameCapacity > 24)) frameCapacity = null;
    return {
      id: id,
      label: label,
      emptyHiveKg: emptyHiveKg,
      frameEmptyKg: frameEmptyKg,
      frameHoneyKg: frameHoneyKg,
      frameCapacity: frameCapacity
    };
  }

  function saveCustomHiveType(entry) {
    if (!entry) { try { global.localStorage.removeItem(CUSTOM_TYPES_KEY); } catch (e) { /* ignore */ } return true; }
    return writeJ(CUSTOM_TYPES_KEY, entry);
  }

  function customToSpec(c) {
    return {
      key: c.id,
      label: c.label,
      subtitle: c.frameCapacity ? c.frameCapacity + ' çerçeve · özel katalog' : 'Özel katalog girişi',
      frameCapacity: c.frameCapacity,
      emptyHiveKg: c.emptyHiveKg,
      frameEmptyKg: c.frameEmptyKg,
      frameHoneyKg: c.frameHoneyKg,
      customCatalog: true
    };
  }

  function catalogEntry(key) {
    var k = String(key == null ? '' : key).trim();
    if (HIVE_TYPE_CATALOG[k]) return HIVE_TYPE_CATALOG[k];
    var custom = loadCustomHiveType();
    if (custom && custom.id === k) return customToSpec(custom);
    return null;
  }

  function fullCatalog() {
    var out = {};
    Object.keys(HIVE_TYPE_CATALOG).forEach(function (k) { out[k] = HIVE_TYPE_CATALOG[k]; });
    var custom = loadCustomHiveType();
    if (custom) out[custom.id] = customToSpec(custom);
    return out;
  }

  function isKnownHiveType(key) {
    return !!catalogEntry(key);
  }

  function normalizeHiveTypeKey(v) {
    var k = String(v == null ? '' : v).trim();
    return catalogEntry(k) ? k : DEFAULT_HIVE_TYPE;
  }

  function typeSpec(key) {
    return catalogEntry(key) || HIVE_TYPE_CATALOG[DEFAULT_HIVE_TYPE];
  }

  function typeDisplayLabel(typeKey, hive) {
    var k = normalizeHiveTypeKey(typeKey);
    if (k === 'ozel' && hive && String(hive.customTypeLabel || '').trim()) {
      return String(hive.customTypeLabel).trim().slice(0, 60);
    }
    return typeSpec(k).label || k;
  }

  function hiveTypeOptionsHtml(selected) {
    var cur = normalizeHiveTypeKey(selected);
    var cat = fullCatalog();
    var keys = HIVE_TYPE_ORDER.filter(function (k) { return cat[k]; });
    Object.keys(cat).forEach(function (k) {
      if (keys.indexOf(k) < 0) keys.push(k);
    });
    return keys.map(function (k) {
      var t = cat[k];
      var text = t.label + (t.subtitle ? ' — ' + t.subtitle : '');
      return '<option value="' + esc(k) + '"' + (k === cur ? ' selected' : '') + '>' + esc(text) + '</option>';
    }).join('');
  }

  function hiveTypeSelectAttrs() {
    return ' class="sa-hive-type-select" size="8"';
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
    var sub = spec.subtitle ? '<span style="display:block;font-size:.82em;color:#6b7280;font-weight:650;margin-bottom:.15rem;">' + esc(spec.subtitle) + '</span>' : '';
    return sub + 'Önerilen boş kovan: <b>' + fmtKg(spec.emptyHiveKg) + '</b> · çerçeve farkı ≈ ' + fmtKg(per) +
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
    var custom = loadCustomHiveType();
    return '<div id="balAgirlikBox" style="display:grid;gap:.55rem;padding:.7rem .8rem;border:1px solid var(--border,#ead9b3);border-radius:12px;background:#fffdf6;min-width:0;">' +
      '<strong style="font-size:.95rem;">🍯 Net bal ve çerçeve varsayılanları</strong>' +
      '<p class="muted" style="margin:0;font-size:.82rem;line-height:1.4;">Kovan tipi kovan kaydında seçilir (varsayılan Langstroth). «Özel» tip için aşağıdaki çerçeve kg kullanılır.</p>' +
      '<label style="font-size:.85rem;">Boş çerçeve (kg, özel tip) <input type="number" id="baFrameEmpty" min="0.5" max="5" step="0.1" inputmode="decimal" value="' + esc(g.frameEmptyKg) + '"></label>' +
      '<label style="font-size:.85rem;">Ballı çerçeve (kg, özel tip) <input type="number" id="baFrameHoney" min="1" max="6" step="0.1" inputmode="decimal" value="' + esc(g.frameHoneyKg) + '"></label>' +
      '<label class="kr-checkline" style="font-size:.85rem;"><input type="checkbox" id="baBeeMass" ' + (g.subtractBeeMass ? 'checked' : '') + '> Tartıdan arı kitlesi düş (varsayılan kapalı, ~' + DEFAULTS.beeMassKg + ' kg)</label>' +
      '<button type="button" class="btn secondary" id="baSaveDefaults">Kaydet</button>' +
      '<details id="baCustomTypeDetails" style="margin-top:.25rem;font-size:.85rem;">' +
        '<summary style="cursor:pointer;font-weight:800;">Gelişmiş · standart kovan ekle</summary>' +
        '<p class="muted" style="margin:.45rem 0;font-size:.8rem;line-height:1.4;">Tek özel katalog girişi (cihazda saklanır). Kovan ekle/düzenle listesinde görünür.</p>' +
        (custom ? '<p style="margin:0 0 .4rem;font-weight:700;">Kayıtlı: ' + esc(custom.label) + ' <button type="button" class="btn secondary" id="baCustomRemove" style="margin-left:.35rem;padding:.2rem .5rem;font-size:.78rem;">Kaldır</button></p>' : '') +
        '<label>Görünen ad<input type="text" id="baCustomLabel" maxlength="60" placeholder="ör. WBC National" value="' + esc(custom ? custom.label : '') + '"></label>' +
        '<label>Boş kovan (kg)<input type="number" id="baCustomEmpty" min="5" max="80" step="0.1" inputmode="decimal" value="' + esc(custom ? custom.emptyHiveKg : '') + '"></label>' +
        '<label>Boş çerçeve (kg)<input type="number" id="baCustomFrameEmpty" min="0.4" max="5" step="0.05" inputmode="decimal" value="' + esc(custom ? custom.frameEmptyKg : '') + '"></label>' +
        '<label>Ballı çerçeve (kg)<input type="number" id="baCustomFrameHoney" min="1" max="6" step="0.05" inputmode="decimal" value="' + esc(custom ? custom.frameHoneyKg : '') + '"></label>' +
        '<label>Kapasite (çerçeve, isteğe bağlı)<input type="number" id="baCustomCap" min="1" max="24" step="1" inputmode="numeric" value="' + esc(custom && custom.frameCapacity != null ? custom.frameCapacity : '') + '"></label>' +
        '<button type="button" class="btn secondary" id="baCustomSave">Standart kovanı kaydet</button>' +
      '</details></div>';
  }

  function slugCustomId(label) {
    var s = String(label || '').toLocaleLowerCase('tr').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 28);
    return s ? 'custom_' + s : 'custom_tip';
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
    var cSave = box.querySelector('#baCustomSave');
    if (cSave && !cSave.__wired) {
      cSave.__wired = true;
      cSave.addEventListener('click', function () {
        var label = String(box.querySelector('#baCustomLabel').value || '').trim();
        if (!label) { global.alert('Görünen ad girin.'); return; }
        var entry = {
          id: slugCustomId(label),
          label: label,
          emptyHiveKg: parseKg(box.querySelector('#baCustomEmpty').value),
          frameEmptyKg: parseKg(box.querySelector('#baCustomFrameEmpty').value),
          frameHoneyKg: parseKg(box.querySelector('#baCustomFrameHoney').value),
          frameCapacity: parseKg(box.querySelector('#baCustomCap').value) || null
        };
        if (!(entry.emptyHiveKg > 0) || !(entry.frameEmptyKg > 0) || !(entry.frameHoneyKg > entry.frameEmptyKg)) {
          global.alert('Boş kovan ve çerçeve ağırlıklarını kontrol edin.');
          return;
        }
        saveCustomHiveType(entry);
        cSave.textContent = 'Kaydedildi ✓';
        setTimeout(function () { location.reload(); }, 600);
      });
    }
    var cRem = box.querySelector('#baCustomRemove');
    if (cRem && !cRem.__wired) {
      cRem.__wired = true;
      cRem.addEventListener('click', function () {
        if (!global.confirm('Özel katalog girişi kaldırılsın mı?')) return;
        saveCustomHiveType(null);
        location.reload();
      });
    }
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
      if (h.hiveType && isKnownHiveType(h.hiveType)) return h;
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
    CUSTOM_TYPES_KEY: CUSTOM_TYPES_KEY,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    loadCustomHiveType: loadCustomHiveType,
    saveCustomHiveType: saveCustomHiveType,
    fullCatalog: fullCatalog,
    isKnownHiveType: isKnownHiveType,
    normalizeHiveTypeKey: normalizeHiveTypeKey,
    typeSpec: typeSpec,
    typeDisplayLabel: typeDisplayLabel,
    hiveTypeOptionsHtml: hiveTypeOptionsHtml,
    hiveTypeSelectAttrs: hiveTypeSelectAttrs,
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

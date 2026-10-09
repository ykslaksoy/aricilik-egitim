/* Görevleri kategori anahtarına göre grupla (Besleme, Varroa, …) — gorevler.html, bugun.html */
(function (global) {
  'use strict';

  var CATEGORIES = {
    besleme: { label: 'Besleme', icon: '🍯', order: 1 },
    varroa: { label: 'Varroa', icon: '🦟', order: 2 },
    ogul: { label: 'Oğul', icon: '🐝', order: 3 },
    kislik: { label: 'Kışlık', icon: '❄️', order: 4 },
    hastalik: { label: 'Hastalık / ilaç', icon: '🩺', order: 5 },
    ana: { label: 'Ana arı', icon: '👑', order: 6 },
    diger: { label: 'Diğer görevler', icon: '📋', order: 9 }
  };

  var EXPAND_KEY = 'superari.gorevler.expanded.v1';

  function fold(s) {
    return String(s == null ? '' : s).toLocaleLowerCase('tr');
  }

  /** @returns {'besleme'|'varroa'|'ogul'|'kislik'|'hastalik'|'ana'|'diger'} */
  function taskCategoryKey(task) {
    if (!task) return 'diger';
    if (task.kind === 'ana') return 'ana';
    var note = String(task.note || '');
    var title = String(task.title || '');
    var blob = fold(note + ' ' + title);
    var id = String(task.id || '');

    if (/\[ogul:|muayene-oto:ogul\]/i.test(note) || /\boğul\b|\bogul\b/.test(blob)) return 'ogul';
    if (/\[varroa|muayene-oto:varroa\]/i.test(note) || /\bvarroa\b|şerit|altlık|akar|kontrol sayımı/.test(blob)) return 'varroa';
    if (/\[kis|kışlık|winter\]/i.test(note) || /\bkışlık\b|\bkislik\b|winter stok|kışa hazır/.test(blob)) return 'kislik';
    if (/\[hastalik|muayene-oto:(ayc|nosema|kirec|hastalik)/i.test(note) || /\bhastalık\b|\bayç\b|nosema|kireç|ilaç bekleme|kontrol:/.test(blob)) return 'hastalik';
    if (/\[besle|besleme\]/i.test(note) || /\bbesle|\bşurup\b|\bkek\b|fondan|\bpolen\b/.test(blob)) return 'besleme';
    if (/^kr-bekleme-bitti-/.test(id) || /\bbekleme\b/.test(blob)) return 'hastalik';
    if (/^kr-/.test(id)) {
      var k = id.replace(/^kr-/, '').replace(/-\d+$/, '');
      if (/^bekleme-bitti/.test(k)) return 'hastalik';
      if (/varroa|sayim|serit|altlik/.test(k)) return 'varroa';
      if (/ogul|meme|bolme/.test(k)) return 'ogul';
      if (/besle|feed|surup|kek/.test(k)) return 'besleme';
      if (/kis|winter/.test(k)) return 'kislik';
    }
    if (/\bana ar|ana hücre|anasız|ana üret|ana yenile/i.test(blob)) return 'ana';
    if (/\bbesle|\bşurup\b|\bkek\b/.test(title)) return 'besleme';
    if (/\bvarroa\b/i.test(title)) return 'varroa';
    return 'diger';
  }

  function categoryMeta(key) {
    return CATEGORIES[key] || CATEGORIES.diger;
  }

  function daysBetween(fromIso, toIso) {
    if (!fromIso || !toIso) return 0;
    var pa = fromIso.split('-'), pb = toIso.split('-');
    return Math.round((new Date(+pb[0], pb[1] - 1, +pb[2]) - new Date(+pa[0], pa[1] - 1, +pa[2])) / 86400000);
  }

  function summarizeTasks(tasks, today) {
    var pr = 3, worstLate = 0, earliest = '', late = false, nLate = 0;
    (tasks || []).forEach(function (t) {
      var p = t.priority || 3;
      if (p < pr) pr = p;
      if (t.due) {
        if (!earliest || t.due < earliest) earliest = t.due;
        if (today && t.due < today) {
          late = true;
          nLate++;
          var d = daysBetween(t.due, today);
          if (d > worstLate) worstLate = d;
        }
      }
    });
    return { pr: pr, due: earliest, late: late, worstLateDays: worstLate, lateCount: nLate };
  }

  function groupTasksByCategory(tasks, today) {
    var map = {}, order = [];
    (tasks || []).forEach(function (t) {
      var k = taskCategoryKey(t);
      if (!map[k]) { map[k] = []; order.push(k); }
      map[k].push(t);
    });
    return order.map(function (k) {
      var ts = map[k].slice().sort(function (a, b) {
        return (a.due || '9999') < (b.due || '9999') ? -1 : ((a.due || '9999') > (b.due || '9999') ? 1 : (a.priority || 3) - (b.priority || 3));
      });
      var meta = categoryMeta(k);
      var sum = summarizeTasks(ts, today);
      return {
        key: k,
        label: meta.label,
        icon: meta.icon,
        order: meta.order,
        tasks: ts,
        count: ts.length,
        auto: ts.every(function (t) { return t.auto; }),
        pr: sum.pr,
        due: sum.due,
        late: sum.late,
        worstLateDays: sum.worstLateDays,
        lateCount: sum.lateCount
      };
    }).sort(function (a, b) {
      return (b.late - a.late) || (a.pr - b.pr) || ((a.due || '9999') < (b.due || '9999') ? -1 : ((a.due || '9999') > (b.due || '9999') ? 1 : 0)) || (a.order - b.order) || (b.count - a.count);
    });
  }

  function readExpanded(storageKey) {
    try {
      var raw = global.sessionStorage.getItem(storageKey || EXPAND_KEY);
      if (!raw) return {};
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return {};
      var o = {};
      arr.forEach(function (id) { o[id] = true; });
      return o;
    } catch (e) { return {}; }
  }

  function writeExpanded(map, storageKey) {
    try {
      var ids = Object.keys(map || {}).filter(function (k) { return map[k]; });
      global.sessionStorage.setItem(storageKey || EXPAND_KEY, JSON.stringify(ids));
    } catch (e) { /* ignore */ }
  }

  function toggleExpanded(map, id, storageKey) {
    var next = Object.assign({}, map || {});
    next[id] = !next[id];
    if (!next[id]) delete next[id];
    writeExpanded(next, storageKey);
    return next;
  }

  /** Besleme satırı için başlıktan miktar ipucu */
  function feedingHint(title) {
    var m = String(title || '').match(/(\d+[.,]?\d*)\s*(L|l|kg|Kg)/);
    return m ? m[1].replace(',', '.') + ' ' + m[2].toLowerCase() : '';
  }

  var API = {
    CATEGORIES: CATEGORIES,
    EXPAND_KEY: EXPAND_KEY,
    taskCategoryKey: taskCategoryKey,
    categoryMeta: categoryMeta,
    groupTasksByCategory: groupTasksByCategory,
    summarizeTasks: summarizeTasks,
    daysBetween: daysBetween,
    readExpanded: readExpanded,
    writeExpanded: writeExpanded,
    toggleExpanded: toggleExpanded,
    feedingHint: feedingHint
  };

  global.SuperAriTaskGroup = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);

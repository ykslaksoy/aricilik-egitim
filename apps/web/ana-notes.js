(function (global) {
  'use strict';
  var KEY = 'superari.ana.notes.v1';
  var DEFAULT_NOTE = {
    id: 'yanikdag-cimil-kafkas-karadeniz-v1',
    title: 'Kafkas × Karadeniz — Yanıkdağ / Cimil',
    body: [
      'Irk tercihi: Kafkas × Karadeniz (F1) melezi; Rize–Erzurum / uzun sezon için.',
      'Merkez: Yanıkdağ (genel merkez, yıl boyu üs).',
      'Yaz göçü: Cimil yaylası yaklaşık 3–3,5 ay (Haziran başı → Eylül ortası).',
      'Tortum: isteğe bağlı deneme yaklaşık 2–2,5 ay; ana hat değil.',
      'Bal yapan dönem: yaklaşık 5–5,5 ay (Nisan → Eylül ortası); asıl fazla bal Haziran–Ağustos / Eylül başı.',
      'Sadece kovanda: yaklaşık 6,5–7 ay (Eylül sonu → Mart).',
      'Kısa ırk notu: F1 melez performansı ana ve baba hattına, yükseltiye, nektar akımına ve kışlatmaya göre değişir; süreler planlama tahminidir.'
    ]
  };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function ensureDefault() {
    var list = read();
    if (!list.some(function (n) { return n && n.id === DEFAULT_NOTE.id; })) {
      list.unshift(DEFAULT_NOTE);
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    }
    return list;
  }
  global.SuperAriNotes = { KEY: KEY, DEFAULT_NOTE: DEFAULT_NOTE, read: read, ensureDefault: ensureDefault };
})(window);

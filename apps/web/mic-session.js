/**
 * SüperArı — Tek mikrofon oturumu (Muayene boyunca izin bir kez).
 * Sayfada TEK bir SpeechRecognition nesnesi kullanılır; kolay muayene (sesle-muayene.js) ve öneri kartları (bakim-akis.js)
 * create() ile aynı gerçek tanıyıcıyı paylaşır — kart / kovan değişince yeni tanıyıcı ve yeni izin isteği açılmaz.
 * İzin durumu: navigator.permissions ('microphone') + localStorage bayrağı. Safari/iOS'ta izin sayfa başına sorulabildiği için
 * ilk açılışta tek bir MediaStream alınır ve sayfa boyunca açık tutulur (kovanlar arası sayfa değişmez).
 */
(function (global) {
  'use strict';
  var KEY = 'superari.micGranted.v1';
  var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
  var real = null, owner = null, running = false, queued = null, stream = null, streamP = null, perm = 'unknown';
  function flag() { try { return global.localStorage.getItem(KEY); } catch (e) { return null; } }
  function setFlag(v) { try { global.localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }
  function markGranted() { perm = 'granted'; if (flag() !== '1') setFlag('1'); }
  function markDenied() { perm = 'denied'; setFlag('0'); }
  function granted() { return perm === 'granted' || (perm !== 'denied' && flag() === '1'); }
  try {
    if (global.navigator && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then(function (p) {
        perm = p.state; if (p.state === 'granted') markGranted(); else if (p.state === 'denied') markDenied();
        p.onchange = function () { perm = p.state; if (p.state === 'granted') markGranted(); else if (p.state === 'denied') markDenied(); };
      }).catch(function () { /* Safari eski sürüm / Firefox: bayrak kullanılır */ });
    }
  } catch (e) { /* ignore */ }
  function isSafari() { var ua = (global.navigator && navigator.userAgent) || ''; return /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Android|FxiOS|EdgiOS/.test(ua); }
  function getReal() {
    if (!SR) return null;
    if (real) return real;
    real = new SR();
    real.onstart = function (e) { markGranted(); if (owner && owner.onstart) owner.onstart(e); };
    real.onresult = function (e) { if (owner && owner.onresult) owner.onresult(e); };
    real.onerror = function (e) { if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) markDenied(); if (owner && owner.onerror) owner.onerror(e); };
    real.onend = function (e) {
      running = false; var o = owner; owner = null;
      if (queued) { var q = queued; queued = null; try { begin(q); } catch (x) { if (q.onend) setTimeout(function () { q.onend({}); }, 0); } }
      if (o && o.onend) o.onend(e);
    };
    return real;
  }
  function begin(v) {
    var r = getReal();
    owner = v; r.lang = v.lang || 'tr-TR'; r.continuous = !!v.continuous; r.interimResults = !!v.interimResults; r.maxAlternatives = v.maxAlternatives || 1;
    running = true;
    try { r.start(); } catch (e) { running = false; owner = null; throw e; }
  }
  function request(v) {
    var r = getReal(); if (!r) throw new Error('SpeechRecognition yok');
    if (running && owner === v) throw new Error('InvalidStateError: zaten dinliyor');
    if (running) {
      /* başka bir kart dinliyorsa: onu kapat, bu isteği sıraya al (aynı gerçek oturum) */
      var old = owner; owner = null; queued = v;
      try { r.abort(); } catch (e) { /* ignore */ }
      if (old && old !== v && old.onend) setTimeout(function () { old.onend({}); }, 0);
      return;
    }
    begin(v);
  }
  function release(v, hard) {
    if (queued === v) queued = null;
    if (owner === v && running) { try { if (hard) real.abort(); else real.stop(); } catch (e) { /* ignore */ } }
  }
  /** SpeechRecognition ile aynı arayüz; arkada sayfanın tek tanıyıcısı. */
  function create() {
    var v = { lang: 'tr-TR', continuous: false, interimResults: false, maxAlternatives: 1, onstart: null, onresult: null, onerror: null, onend: null };
    v.start = function () { request(v); };
    v.abort = function () { release(v, true); };
    v.stop = function () { release(v, false); };
    return v;
  }
  /** Kullanıcı dokunuşunda çağırın (Sesli mod açılınca). Safari'de tek MediaStream alıp açık tutar; diğerlerinde izin zaten verildiyse bir şey yapmaz. */
  function warm() {
    if (stream) return Promise.resolve(true);
    if (streamP) return streamP;
    var md = global.navigator && navigator.mediaDevices;
    if (!md || !md.getUserMedia || !isSafari()) return Promise.resolve(granted());
    streamP = md.getUserMedia({ audio: true }).then(function (s) { stream = s; markGranted(); return true; })
      .catch(function (e) { streamP = null; if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) markDenied(); return false; });
    return streamP;
  }
  function releaseAll() { try { if (real) real.abort(); } catch (e) { /* ignore */ } if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } } stream = null; streamP = null; }
  try { global.addEventListener('pagehide', releaseAll); } catch (e) { /* ignore */ }
  global.SuperAriMic = { supported: function () { return !!SR; }, create: create, warm: warm, granted: granted, state: function () { return perm; }, markGranted: markGranted, markDenied: markDenied, release: releaseAll, _debug: function () { return { running: running, hasOwner: !!owner, queued: !!queued, stream: !!stream, instances: real ? 1 : 0 }; } };
})(typeof window !== 'undefined' ? window : this);

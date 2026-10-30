/* P0-1 · Süreli salt okunur kovan paneli paylaşım bağlantısı (yerel + bulut RPC) */
(function (global) {
  'use strict';
  if (global.SuperAriPaylasim) return;
  var KEY = 'superari.paylasim.baglanti.v1';
  var MIG = 'supabase/migrations/20261025130000_p0_paylasim_baglanti.sql';

  function esc(s) { return String(s == null ? '' : s); }
  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function okuStore() { try { return JSON.parse(global.localStorage.getItem(KEY) || '{"links":[]}') || { links: [] }; } catch (e) { return { links: [] }; } }
  function yazStore(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function ozellikAcik() { return global.SuperAriOzellik && global.SuperAriOzellik.acik('paylasim_baglanti'); }
  function migErr() { return new Error('Bu özellik için veritabanı güncellemesi gerekli (' + MIG + ').'); }

  function hiveKeyOf(hiveId) {
    var B = global.SuperAriBulut;
    if (!B || !B._loadState) return null;
    try {
      var st = B._loadState();
      var c = B._collect && B._collect(st);
      if (!c || !c.hiveKey) return null;
      return c.hiveKey(hiveId);
    } catch (e) { return null; }
  }

  function snapshotFromHive(hive, apiary) {
    if (!hive) return {};
    var D = global.SuperAriDemo;
    var wx = { temp: '—', humid: '—', wind: '—', cond: '—', dir: '—' };
    try {
      if (D && D.weatherForHive) {
        var w = D.weatherForHive(hive.id);
        if (w) { wx.temp = Math.round(w.temp); wx.humid = Math.round(w.humidity); wx.wind = Math.round(w.windKmh); wx.cond = w.condition || '—'; wx.dir = w.windDir || '—'; }
      }
    } catch (e) { /* ignore */ }
    var ok = { label: 'Durum', cls: '' };
    try {
      if (D && D.hiveOkPill) ok = D.hiveOkPill(hive) || ok;
    } catch (e2) { /* ignore */ }
    var wt = hive.sensors && hive.sensors.weight;
    return {
      v: 1,
      hiveId: hive.id,
      hiveName: hive.name || 'Kovan',
      apiaryName: (apiary && apiary.name) || '',
      colonyState: hive.colonyState || null,
      queenYear: hive.queenYear,
      ok: ok,
      weather: wx,
      weightKg: wt && wt.kg != null ? wt.kg : null,
      weightDelta: wt && wt.deltaKg != null ? wt.deltaKg : null,
      hive: hive
    };
  }

  function urlFor(tok) {
    var base = global.location.origin + global.location.pathname.replace(/[^/]+$/, '');
    return base + 'paylasim.html?t=' + encodeURIComponent(tok);
  }

  function aktifLink(link) {
    if (!link || link.iptal_at) return false;
    return Date.parse(link.bitis) > Date.now();
  }

  function yerelOlustur(hiveId, gun) {
    var D = global.SuperAriDemo;
    if (!D) return Promise.reject(new Error('Kovan verisi yok'));
    var hive = D.hiveById(hiveId);
    if (!hive) return Promise.reject(new Error('Kovan bulunamadı'));
    var apiary = D.apiaryById(hive.apiaryId);
    var g = Math.max(1, Math.min(Number(gun) || 7, 90));
    var tok = uuid();
    var bitis = new Date(Date.now() + g * 864e5).toISOString();
    var st = okuStore();
    st.links.push({ token: tok, hiveId: String(hiveId), hive_key: hiveKeyOf(hiveId), snapshot: snapshotFromHive(hive, apiary), bitis: bitis, iptal_at: null, created_at: new Date().toISOString(), yerel: true });
    yazStore(st);
    return Promise.resolve({ token: tok, bitis: bitis, url: urlFor(tok), yerel: true });
  }

  function yerelOku(tok) {
    if (!ozellikAcik()) return Promise.resolve(null);
    var st = okuStore();
    var row = (st.links || []).filter(function (x) { return x.token === tok; })[0];
    if (!row || row.iptal_at || !aktifLink(row)) return Promise.resolve(null);
    return Promise.resolve({
      hiveName: row.snapshot.hiveName,
      apiaryName: row.snapshot.apiaryName,
      bitis: row.bitis,
      snapshot: row.snapshot
    });
  }

  function yerelIptal(tok) {
    var st = okuStore(), ok = false;
    (st.links || []).forEach(function (x) {
      if (x.token === tok && !x.iptal_at) { x.iptal_at = new Date().toISOString(); ok = true; }
    });
    if (ok) yazStore(st);
    return Promise.resolve(ok);
  }

  function bulutOlustur(hiveId, gun) {
    var hk = hiveKeyOf(hiveId);
    if (!hk) return Promise.reject(new Error('Kovan buluta bağlı değil. Yerel bağlantı oluşturuluyor…'));
    var B = global.SuperAriBulut;
    return B.client().then(function (c) {
      return c.rpc('sa_paylasim_olustur', { p_hive_key: hk, p_gun: Number(gun) || 7 });
    }).then(function (r) {
      if (r.error) {
        if (/Could not find the function|schema cache/i.test(String(r.error.message || r.error))) throw migErr();
        throw r.error;
      }
      var row = Array.isArray(r.data) ? r.data[0] : r.data;
      if (!row || !row.token) throw migErr();
      return { token: row.token, bitis: row.bitis, url: urlFor(row.token), yerel: false };
    });
  }

  function bulutOku(tok) {
    var B = global.SuperAriBulut;
    if (!B || typeof B.client !== 'function') return Promise.resolve(null);
    return B.client().then(function (c) { return c.rpc('sa_paylasim_oku', { p_token: tok }); }).then(function (r) {
      if (r.error) {
        if (/Could not find the function|schema cache/i.test(String(r.error.message || r.error))) return null;
        throw r.error;
      }
      return r.data || null;
    });
  }

  function olustur(hiveId, gun) {
    if (!ozellikAcik()) {
      if (global.SuperAriOzellik) global.SuperAriOzellik.yakinda('paylasim_baglanti');
      return Promise.reject(new Error('Paylaşım bağlantısı kapalı.'));
    }
    var B = global.SuperAriBulut;
    return (B && B.session ? B.session() : Promise.resolve(null)).then(function (s) {
      if (s && s.user) return bulutOlustur(hiveId, gun).catch(function (e) {
        if (/buluta bağlı değil/i.test(String(e.message))) return yerelOlustur(hiveId, gun);
        throw e;
      });
      return yerelOlustur(hiveId, gun);
    });
  }

  function oku(tok) {
    tok = String(tok || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(tok)) return Promise.resolve(null);
    return bulutOku(tok).then(function (row) {
      if (row) return row;
      return yerelOku(tok);
    }).catch(function () { return yerelOku(tok); });
  }

  function iptal(tok) {
    return bulutIptal(tok).then(function (ok) { return ok || yerelIptal(tok); });
  }

  function bulutIptal(tok) {
    var B = global.SuperAriBulut;
    if (!B || typeof B.client !== 'function') return Promise.resolve(false);
    return B.session().then(function (s) {
      if (!s || !s.user) return false;
      return B.client().then(function (c) { return c.rpc('sa_paylasim_iptal', { p_token: tok }); }).then(function (r) {
        if (r.error) return false;
        return !!r.data;
      });
    }).catch(function () { return false; });
  }

  function sheetHtml(hiveId) {
    return '<div id="saPaylasimSheet" role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:2147482000;background:rgba(20,16,10,.45);display:flex;align-items:flex-end;justify-content:center">' +
      '<div style="background:#fffaf0;width:100%;max-width:430px;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));font-family:inherit">' +
      '<b style="font-size:17px">Paylaşım bağlantısı</b>' +
      '<p style="margin:.35rem 0 .75rem;font-size:.86rem;color:#5b4a33">Salt okunur kovan paneli. Süre bitince bağlantı kapanır; giriş gerekmez.</p>' +
      '<label style="display:grid;gap:.25rem;font-size:.8rem;font-weight:700;color:#5c4813">Süre (gün)<select id="saPayGun" style="font:inherit;padding:.55rem;border-radius:10px;border:1px solid #e6e8ec">' +
      '<option value="7" selected>7 gün</option><option value="14">14 gün</option><option value="30">30 gün</option></select></label>' +
      '<p id="saPayMsg" style="min-height:1.2em;font-size:.84rem;margin:.5rem 0" aria-live="polite"></p>' +
      '<div id="saPayResult" hidden style="display:grid;gap:.45rem;margin-bottom:.5rem">' +
      '<input id="saPayUrl" readonly style="width:100%;font-size:.82rem;padding:.5rem;border-radius:10px;border:1px solid #e6e8ec;box-sizing:border-box">' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap"><button type="button" class="btn" id="saPayKopyala" style="flex:1;min-height:44px">Kopyala</button>' +
      (global.navigator && global.navigator.share ? '<button type="button" class="btn secondary" id="saPayNative" style="flex:1;min-height:44px">Paylaş</button>' : '') +
      '</div></div>' +
      '<div style="display:flex;gap:.4rem"><button type="button" class="btn" id="saPayOlustur" style="flex:1;min-height:44px">Bağlantı oluştur</button>' +
      '<button type="button" class="btn secondary" id="saPayKapat" style="min-height:44px">Kapat</button></div></div></div>';
  }

  function bindSheet(hiveId) {
    var root = global.document.getElementById('saPaylasimSheet');
    if (!root) return;
    var msg = root.querySelector('#saPayMsg');
    var res = root.querySelector('#saPayResult');
    var urlIn = root.querySelector('#saPayUrl');
    function kapat() { root.remove(); }
    root.querySelector('#saPayKapat').onclick = kapat;
    root.addEventListener('click', function (e) { if (e.target === root) kapat(); });
    root.querySelector('#saPayOlustur').onclick = function () {
      var gun = root.querySelector('#saPayGun').value;
      msg.textContent = 'Oluşturuluyor…';
      olustur(hiveId, gun).then(function (r) {
        msg.textContent = 'Bağlantı hazır. Bitiş: ' + new Date(r.bitis).toLocaleString('tr-TR');
        urlIn.value = r.url;
        res.hidden = false;
      }).catch(function (e) { msg.textContent = (e && e.message) || 'Oluşmadı'; });
    };
    root.querySelector('#saPayKopyala').onclick = function () {
      var t = urlIn.value;
      if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
        global.navigator.clipboard.writeText(t).then(function () { msg.textContent = 'Kopyalandı.'; });
      } else { urlIn.select(); global.document.execCommand('copy'); msg.textContent = 'Kopyalandı.'; }
    };
    var nat = root.querySelector('#saPayNative');
    if (nat) nat.onclick = function () {
      global.navigator.share({ title: 'SüperArı kovan paneli', text: 'Salt okunur kovan paneli:', url: urlIn.value }).catch(function () {});
    };
  }

  function ac(hiveId) {
    if (!ozellikAcik()) {
      if (global.SuperAriOzellik) global.SuperAriOzellik.yakinda('paylasim_baglanti');
      return;
    }
    var old = global.document.getElementById('saPaylasimSheet');
    if (old) old.remove();
    var wrap = global.document.createElement('div');
    wrap.innerHTML = sheetHtml(hiveId);
    (global.document.body || global.document.documentElement).appendChild(wrap.firstChild);
    bindSheet(hiveId);
  }

  global.SuperAriPaylasim = {
    olustur: olustur,
    oku: oku,
    iptal: iptal,
    urlFor: urlFor,
    snapshotFromHive: snapshotFromHive,
    ac: ac,
    ozellikAcik: ozellikAcik,
    MIG: MIG
  };
})(window);

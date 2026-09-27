/**
 * SüperArı — Kullanım Şartları ve KVKK Aydınlatma Metni onayı.
 * İlk kullanımda (ve buluta ilk girişten önce) «Okudum, kabul ediyorum» ister.
 * Onay sürüm + tarih ile saklanır (superari.sartlar.onay.v1), girişte hesap bilgisine (bulut) eşitlenir.
 * Sürüm değişirse yeniden sorulur. pwa.js her sayfada yükler.
 */
(function (global) {
  var doc = global.document;
  var VERSION = '2026-09-28';
  var KEY = 'superari.sartlar.onay.v1';
  var waiters = [];
  function get() { try { var o = JSON.parse(global.localStorage.getItem(KEY) || 'null'); return o && o.version ? o : null; } catch (e) { return null; } }
  function accepted() { var o = get(); return !!(o && o.version === VERSION); }
  function store(o) { try { global.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  function done() {
    var el = doc.getElementById('saTermsGate'); if (el) el.parentNode.removeChild(el);
    doc.documentElement.style.overflow = '';
    var w = waiters; waiters = []; w.forEach(function (fn) { try { fn(true); } catch (e) { /* ignore */ } });
    try { global.dispatchEvent(new Event('superari-terms-accepted')); } catch (e) { /* ignore */ }
  }
  function accept(source) {
    var o = { version: VERSION, acceptedAt: new Date().toISOString(), source: source || 'uygulama' };
    store(o);
    done();
    if (global.SuperAriBulut && global.SuperAriBulut.syncConsent) global.SuperAriBulut.syncConsent();
    return o;
  }
  /** Buluttaki (hesap bilgisindeki) onay: bu sürümse cihaza da yazılır. */
  function adoptRemote(meta) {
    if (!meta || meta.version !== VERSION || accepted()) return false;
    store({ version: meta.version, acceptedAt: meta.acceptedAt || new Date().toISOString(), source: 'bulut' });
    done();
    return true;
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(iso || ''); }
  }
  function isTermsPage() { return /\/sartlar\.html$/.test(global.location.pathname); }
  function show() {
    if (accepted() || doc.getElementById('saTermsGate') || !doc.body) return;
    var prev = get();
    var back = doc.createElement('div');
    back.id = 'saTermsGate';
    back.setAttribute('role', 'dialog'); back.setAttribute('aria-modal', 'true'); back.setAttribute('aria-labelledby', 'saTermsTitle');
    back.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(31,41,51,.55);display:flex;align-items:flex-end;justify-content:center;padding:0;font-family:inherit;';
    var here = global.location.pathname.split('/').pop() + global.location.search;
    back.innerHTML = '<div style="background:#fffdf5;width:100%;max-width:440px;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom));box-sizing:border-box;box-shadow:0 -8px 30px rgba(0,0,0,.25);color:#1f2933;">' +
      '<h2 id="saTermsTitle" style="margin:0 0 .35rem;font-size:1.08rem;">🐝 Kullanım Şartları ve KVKK Aydınlatma Metni</h2>' +
      (prev ? '<p style="margin:0 0 .5rem;font-size:.82rem;color:#8a5a00;font-weight:700;">Metin güncellendi (sürüm ' + VERSION + '). Devam etmek için yeniden onaylayın.</p>' : '') +
      '<ul style="margin:0 0 .6rem;padding-left:1.1rem;font-size:.86rem;line-height:1.45;display:grid;gap:.3rem;">' +
        '<li>Uygulama önce bu cihazda çalışır. Giriş yaparsanız verileriniz (arılık, kovan, kayıt, görev, stok, gider/satış, fotoğraf) <b>bulutta saklanır</b> ve cihazlarınız arasında eşitlenir.</li>' +
        '<li>Verileriniz <b>anonimleştirilerek</b> (ad, e-posta ve tam konum olmadan; yalnız bölge düzeyinde) uygulamanın <b>sağlık skoru, oğul riski, hastalık / ırk tahmini, bal tahmini ve bakım takvimini</b> iyileştirmek için kullanılır.</li>' +
        '<li>Verileriniz satılmaz, reklam için kullanılmaz. Hesap sayfasından verilerinizi indirebilir ve hesabınızı silebilirsiniz.</li>' +
        '<li>Uygulamadaki öneriler (ilaç dozu, besleme, tahminler) yardımcı bilgidir; kararı siz, ilaçta prospektüs ve veteriner hekim verir.</li>' +
      '</ul>' +
      '<p style="margin:0 0 .7rem;font-size:.86rem;"><a href="sartlar.html?geri=' + encodeURIComponent(here) + '" style="color:#2b6cb0;font-weight:700;text-decoration:underline;">Metnin tamamını okuyun</a> (Kullanım Şartları, Gizlilik ve KVKK Aydınlatma Metni)</p>' +
      '<label style="display:flex;gap:.55rem;align-items:flex-start;font-size:.92rem;font-weight:700;background:#fff;border:1px solid #e9d8a6;border-radius:12px;padding:.65rem .7rem;cursor:pointer;">' +
        '<input type="checkbox" id="saTermsChk" style="width:1.25rem;height:1.25rem;margin:.05rem 0 0;flex:none;"><span>Okudum, kabul ediyorum</span></label>' +
      '<button type="button" id="saTermsOk" disabled style="margin-top:.7rem;width:100%;font:inherit;font-weight:800;font-size:1rem;padding:.8rem;border-radius:12px;border:0;background:#f5c542;color:#3b2f06;opacity:.5;cursor:pointer;">Kabul et ve devam et</button>' +
      '<p style="margin:.55rem 0 0;font-size:.74rem;color:#6b7280;">Sürüm ' + VERSION + '. Kabul etmeden uygulama kullanılamaz.</p>' +
      '</div>';
    doc.body.appendChild(back);
    doc.documentElement.style.overflow = 'hidden';
    var chk = back.querySelector('#saTermsChk'), ok = back.querySelector('#saTermsOk');
    chk.addEventListener('change', function () { ok.disabled = !chk.checked; ok.style.opacity = chk.checked ? '1' : '.5'; });
    ok.addEventListener('click', function () { if (chk.checked) accept('uygulama'); });
  }
  /** Onay yoksa pencereyi açar; onaylanınca çözülür. */
  function require() {
    if (accepted()) return Promise.resolve(true);
    return new Promise(function (res) { waiters.push(res); show(); });
  }
  function boot() { if (!accepted() && !isTermsPage()) show(); }
  global.SuperAriSartlar = { VERSION: VERSION, KEY: KEY, get: get, accepted: accepted, accept: accept, adoptRemote: adoptRemote, require: require, show: show, fmtDate: fmtDate };
  if (doc.body) boot(); else doc.addEventListener('DOMContentLoaded', boot);
  global.addEventListener('storage', function (e) { if (e.key === KEY && accepted()) done(); });
})(window);

(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  var HESAP_KEY = 'superari.hesapTipi';
  var ACCOUNT_KEY = 'superari.account.v1';
  var PENDING_KEY = 'superari.account.pending.v1';
  var SESSION_KEY = 'superari.session.v1';
  var HOME = {
    arici: 'ana.html',
    yonetici: 'yonetici.html',
    bakici: 'bakici.html'
  };
  var LABELS = {
    arici: 'Arıcı',
    yonetici: 'Yönetici',
    bakici: 'Bakıcı'
  };

  function normalizeHesapTipi(v) {
    var s = String(v || '').trim().toLowerCase()
      .replace(/ı/g, 'i').replace(/İ/g, 'i')
      .replace(/ş/g, 's').replace(/Ş/g, 's')
      .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/Ü/g, 'u')
      .replace(/ö/g, 'o').replace(/Ö/g, 'o')
      .replace(/ç/g, 'c').replace(/Ç/g, 'c');
    if (!s) return 'arici';
    if (/yonetici|admin|manager/.test(s)) return 'yonetici';
    if (/bakici|isci|worker|employee|caretaker/.test(s)) return 'bakici';
    if (/arici|beekeeper|ana/.test(s)) return 'arici';
    if (HOME[s]) return s;
    return 'arici';
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function genDemoCode() {
    var n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  }

  function normalizeAccount(raw) {
    raw = raw || {};
    var tip = normalizeHesapTipi(raw.hesapTipi || raw.role || raw.rol || 'arici');
    return {
      name: String(raw.name || raw.ad || '').trim(),
      email: String(raw.email || '').trim().toLowerCase(),
      phone: String(raw.phone || raw.telefon || '').trim(),
      aricilikAdi: String(raw.aricilikAdi || raw.businessName || '').trim(),
      hesapTipi: tip,
      password: String(raw.password || ''),
      notifEmail: String(raw.notifEmail || raw.email || '').trim().toLowerCase(),
      lang: raw.lang || 'tr',
      verified: !!raw.verified,
      verifiedAt: raw.verifiedAt || null,
      createdAt: raw.createdAt || nowIso(),
      updatedAt: nowIso()
    };
  }

  var SuperAriHesap = {
    KEY: HESAP_KEY,
    ACCOUNT_KEY: ACCOUNT_KEY,
    PENDING_KEY: PENDING_KEY,
    SESSION_KEY: SESSION_KEY,
    HOME: HOME,
    LABELS: LABELS,
    normalize: normalizeHesapTipi,
    get: function () {
      try {
        var raw = localStorage.getItem(HESAP_KEY) || 'arici';
        var n = normalizeHesapTipi(raw);
        if (n === 'bakici' && /isci/i.test(String(raw)) && String(raw) !== 'bakici') {
          try { localStorage.setItem(HESAP_KEY, 'bakici'); } catch (e2) { /* ignore */ }
        }
        return n;
      } catch (e) {
        return 'arici';
      }
    },
    set: function (tip) {
      var n = normalizeHesapTipi(tip);
      try { localStorage.setItem(HESAP_KEY, n); } catch (e) { /* ignore */ }
      var acc = this.getAccount();
      if (acc) {
        acc.hesapTipi = n;
        acc.updatedAt = nowIso();
        writeJson(ACCOUNT_KEY, acc);
      }
      return n;
    },
    migrate: function () {
      try {
        var raw = localStorage.getItem(HESAP_KEY);
        if (!raw) return this.get();
        var n = normalizeHesapTipi(raw);
        if (n === 'bakici' && String(raw).toLowerCase().indexOf('isci') !== -1) {
          localStorage.setItem(HESAP_KEY, 'bakici');
        } else if (raw !== n) {
          localStorage.setItem(HESAP_KEY, n);
        }
        return n;
      } catch (e) {
        return 'arici';
      }
    },
    homeFor: function (tip) {
      return HOME[normalizeHesapTipi(tip != null ? tip : this.get())] || HOME.arici;
    },
    labelFor: function (tip) {
      return LABELS[normalizeHesapTipi(tip)] || LABELS.arici;
    },
    goHome: function (tip) {
      window.location.href = this.homeFor(tip != null ? tip : this.get());
    },
    requireYonetici: function (opts) {
      opts = opts || {};
      if (this.get() === 'yonetici') return true;
      var msg = opts.message || 'Bu sayfa yalnızca Yönetici hesap tipi içindir. Ayarlar → Hesap tipi ile değiştirebilirsiniz (demo).';
      try { window.alert(msg); } catch (e) { /* ignore */ }
      window.location.replace(opts.fallback || this.homeFor(this.get()));
      return false;
    },

    getAccount: function () {
      var raw = readJson(ACCOUNT_KEY, null);
      return raw ? normalizeAccount(raw) : null;
    },
    setAccount: function (data) {
      var acc = normalizeAccount(Object.assign({}, this.getAccount() || {}, data || {}));
      writeJson(ACCOUNT_KEY, acc);
      this.set(acc.hesapTipi);
      return acc;
    },
    updateAccount: function (patch) {
      var cur = this.getAccount() || {};
      return this.setAccount(Object.assign({}, cur, patch || {}));
    },
    getPending: function () {
      return readJson(PENDING_KEY, null);
    },
    clearPending: function () {
      try { localStorage.removeItem(PENDING_KEY); } catch (e) { /* ignore */ }
    },
    /** Start signup → pending + demo 6-digit code (email/SMS stub). */
    startSignup: function (data) {
      var tip = normalizeHesapTipi(data.hesapTipi || data.role || data.rol || 'arici');
      var channel = data.phone ? 'sms' : 'email';
      if (data.channel === 'email' || data.channel === 'sms') channel = data.channel;
      var pending = {
        name: String(data.name || data.ad || '').trim(),
        email: String(data.email || '').trim().toLowerCase(),
        phone: String(data.phone || data.telefon || '').trim(),
        aricilikAdi: String(data.aricilikAdi || '').trim(),
        hesapTipi: tip,
        password: String(data.password || ''),
        channel: channel,
        demoCode: String(data.demoCode || genDemoCode()),
        createdAt: nowIso()
      };
      writeJson(PENDING_KEY, pending);
      return pending;
    },
    /** Verify pending code → verified account in localStorage. */
    verifyPending: function (code) {
      var pending = this.getPending();
      if (!pending) return { ok: false, error: 'pending_missing' };
      var entered = String(code || '').replace(/\D/g, '');
      if (entered.length !== 6) return { ok: false, error: 'code_format' };
      if (entered !== String(pending.demoCode)) return { ok: false, error: 'code_mismatch' };
      var acc = this.setAccount({
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        aricilikAdi: pending.aricilikAdi,
        hesapTipi: pending.hesapTipi,
        password: pending.password,
        notifEmail: pending.email,
        verified: true,
        verifiedAt: nowIso()
      });
      this.clearPending();
      writeJson(SESSION_KEY, { email: acc.email, at: nowIso() });
      if (window.SuperAriAdminNotify && SuperAriAdminNotify.upsertUser) {
        SuperAriAdminNotify.upsertUser({
          name: acc.name,
          email: acc.email,
          phone: acc.phone,
          aricilikAdi: acc.aricilikAdi,
          role: acc.hesapTipi,
          status: 'verified',
          source: 'kayit'
        });
      }
      return { ok: true, account: acc };
    },
    login: function (email, password) {
      var acc = this.getAccount();
      var em = String(email || '').trim().toLowerCase();
      var pw = String(password || '');
      if (!acc) {
        // Demo soft-login: create session with typed email, keep current hesap tipi
        writeJson(SESSION_KEY, { email: em, at: nowIso(), demo: true });
        return { ok: true, demo: true, account: null };
      }
      if (acc.email && em && acc.email !== em) {
        return { ok: false, error: 'email_mismatch' };
      }
      if (acc.password && pw && acc.password !== pw) {
        return { ok: false, error: 'password_mismatch' };
      }
      if (acc.email && !acc.verified) {
        return { ok: false, error: 'not_verified' };
      }
      writeJson(SESSION_KEY, { email: acc.email || em, at: nowIso() });
      this.set(acc.hesapTipi);
      return { ok: true, account: acc };
    },
    logout: function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    },
    isVerified: function () {
      var acc = this.getAccount();
      return !!(acc && acc.verified);
    },
    session: function () {
      return readJson(SESSION_KEY, null);
    }
  };
  window.SuperAriHesap = SuperAriHesap;
  SuperAriHesap.migrate();

  var USER_BUSY = 'Talep yoğunluğundan dolayı lütfen yarın deneyiniz.';

  qsa("[data-toggle-password]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-toggle-password");
      var input = qs("#" + id);
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Gizle" : "Göster";
    });
  });

  function notifyBusy(meta) {
    if (window.SuperAriAdminNotify && SuperAriAdminNotify.warnUserBusyAndNotify) {
      return SuperAriAdminNotify.warnUserBusyAndNotify(meta || {});
    }
    try {
      var key = 'superari_admin_notifications';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({
        id: 'notif-' + Date.now(),
        type: 'user_add_failed',
        message: 'Kullanıcı yoğunluktan dolayı ekleme yapılamadı',
        name: (meta && meta.name) || '',
        email: (meta && meta.email) || '',
        source: (meta && meta.source) || 'panels',
        ts: new Date().toISOString(),
        read: false
      });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
    } catch (e) { /* ignore */ }
    return USER_BUSY;
  }

  function showFormError(form, msg) {
    var box = form.querySelector('[data-form-error]');
    if (!box) {
      box = document.createElement('p');
      box.setAttribute('data-form-error', '1');
      box.setAttribute('role', 'alert');
      box.className = 'form-alert';
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = msg;
  }

  function clearFormError(form) {
    var box = form.querySelector('[data-form-error]');
    if (box) box.textContent = '';
  }

  qsa("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var target = form.getAttribute("data-demo") || "arici.html";
      var isLogin = form.getAttribute("data-login") === "1" || /giris\.html$/i.test(location.pathname);
      var isVerify = form.getAttribute("data-verify") === "1" || /onay\.html$/i.test(location.pathname);
      var fd = new FormData(form);
      var btn = form.querySelector('[type="submit"]');

      if (isLogin) {
        clearFormError(form);
        var email = String(fd.get('email') || '').trim();
        var password = String(fd.get('password') || '');
        var result = SuperAriHesap.login(email, password);
        if (!result.ok) {
          var msg = 'Giriş başarısız.';
          if (result.error === 'password_mismatch' || result.error === 'email_mismatch') {
            msg = 'E-posta veya şifre hatalı.';
          } else if (result.error === 'not_verified') {
            msg = 'Hesap henüz doğrulanmadı. Lütfen onay kodunu girin.';
          }
          showFormError(form, msg);
          if (result.error === 'not_verified') {
            setTimeout(function () { window.location.href = 'onay.html'; }, 900);
          }
          return;
        }
        window.location.href = SuperAriHesap.homeFor(SuperAriHesap.get());
        return;
      }

      if (isVerify) {
        clearFormError(form);
        var code = String(fd.get('code') || '').trim();
        var vr = SuperAriHesap.verifyPending(code);
        if (!vr.ok) {
          var vmsg = 'Kod geçersiz.';
          if (vr.error === 'pending_missing') vmsg = 'Bekleyen kayıt yok. Lütfen önce kayıt olun.';
          else if (vr.error === 'code_format') vmsg = '6 haneli kod girin.';
          else if (vr.error === 'code_mismatch') vmsg = 'Kod eşleşmedi. Demo kodunu kontrol edin.';
          showFormError(form, vmsg);
          return;
        }
        window.location.href = SuperAriHesap.homeFor(vr.account.hesapTipi);
        return;
      }

      var isSignup = form.getAttribute("data-signup") === "1" ||
        /kayit|onay/i.test(target) || /kayit\.html$/i.test(location.pathname);
      if (!isSignup) {
        window.location.href = target;
        return;
      }

      var name = String(fd.get('name') || fd.get('ad') || '').trim();
      var email = String(fd.get('email') || '').trim();
      var phone = String(fd.get('phone') || fd.get('telefon') || '').trim();
      var aricilikAdi = String(fd.get('aricilikAdi') || fd.get('aricilik_adi') || '').trim();
      var role = String(fd.get('role') || fd.get('rol') || fd.get('hesapTipi') || '').trim();
      var password = String(fd.get('password') || '');
      if (btn) { btn.disabled = true; }
      clearFormError(form);

      function succeed() {
        var pending = SuperAriHesap.startSignup({
          name: name,
          email: email,
          phone: phone,
          aricilikAdi: aricilikAdi,
          role: role,
          password: password
        });
        SuperAriHesap.set(role);
        if (window.SuperAriAdminNotify && SuperAriAdminNotify.upsertUser) {
          SuperAriAdminNotify.upsertUser({
            name: name,
            email: email,
            phone: phone,
            aricilikAdi: aricilikAdi,
            role: role,
            status: 'pending',
            source: 'kayit'
          });
        }
        try {
          sessionStorage.setItem('superari.demoCodeFlash', pending.demoCode);
        } catch (e) { /* ignore */ }
        window.location.href = target.indexOf('onay') >= 0 ? target : 'onay.html';
      }

      function failBusy(reason) {
        notifyBusy({ name: name, email: email, source: 'kayit', reason: reason || 'capacity' });
        showFormError(form, USER_BUSY);
        if (btn) btn.disabled = false;
      }

      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          phone: phone,
          aricilikAdi: aricilikAdi,
          role: role,
          password: password
        }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        clearTimeout(timer);
        return res.json().then(function (body) {
          return { res: res, body: body || {} };
        }).catch(function () { return { res: res, body: {} }; });
      }).then(function (pack) {
        var res = pack.res;
        var body = pack.body;
        var err = String(body.error || body.code || '');
        if (res.status === 429 || /capacity|busy|quota|limit|yogun|yoğun/i.test(err)) {
          failBusy(err || 'capacity');
          return;
        }
        if (!res.ok) {
          failBusy(err || ('http_' + res.status));
          return;
        }
        succeed();
      }).catch(function () {
        clearTimeout(timer);
        succeed();
      });
    });
  });
})();

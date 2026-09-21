(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  var HESAP_KEY = 'superari.hesapTipi';
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
    // Prefer bakici; migrate legacy isci (+ synonyms) → bakici
    if (/bakici|isci|worker|employee|caretaker/.test(s)) return 'bakici';
    if (/arici|beekeeper|ana/.test(s)) return 'arici';
    if (HOME[s]) return s;
    return 'arici';
  }

  var SuperAriHesap = {
    KEY: HESAP_KEY,
    HOME: HOME,
    LABELS: LABELS,
    normalize: normalizeHesapTipi,
    get: function () {
      try {
        var raw = localStorage.getItem(HESAP_KEY) || 'arici';
        var n = normalizeHesapTipi(raw);
        // Persist migration isci → bakici when reading
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
      return n;
    },
    /** One-shot migrate: rewrite legacy isci → bakici in storage. */
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
      return HOME[normalizeHesapTipi(tip)] || HOME.arici;
    },
    labelFor: function (tip) {
      return LABELS[normalizeHesapTipi(tip)] || LABELS.arici;
    },
    goHome: function (tip) {
      window.location.href = this.homeFor(tip != null ? tip : this.get());
    },
    /** Soft guard: non-yonetici visiting admin-only pages. */
    requireYonetici: function (opts) {
      opts = opts || {};
      if (this.get() === 'yonetici') return true;
      var msg = opts.message || 'Bu sayfa yalnızca Yönetici hesap tipi içindir. Ayarlar → Hesap tipi ile değiştirebilirsiniz (demo).';
      try { window.alert(msg); } catch (e) { /* ignore */ }
      window.location.replace(opts.fallback || this.homeFor(this.get()));
      return false;
    }
  };
  window.SuperAriHesap = SuperAriHesap;

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
      box.style.cssText = 'margin:0;padding:10px 12px;border-radius:10px;background:#fff6e8;border:1px solid #e0c56a;color:#2c241c;font-size:13px;font-weight:700;';
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = msg;
  }

  qsa("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var target = form.getAttribute("data-demo") || "arici.html";
      var isLogin = form.getAttribute("data-login") === "1" || /giris\.html$/i.test(location.pathname);
      if (isLogin) {
        window.location.href = SuperAriHesap.homeFor(SuperAriHesap.get());
        return;
      }
      var isSignup = /kayit|onay/i.test(target) || /kayit\.html$/i.test(location.pathname);
      if (!isSignup) {
        window.location.href = target;
        return;
      }
      var fd = new FormData(form);
      var name = String(fd.get('name') || fd.get('ad') || '').trim();
      var email = String(fd.get('email') || '').trim();
      var role = String(fd.get('role') || fd.get('rol') || '').trim();
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; }

      function succeed() {
        if (role) SuperAriHesap.set(role);
        if (window.SuperAriAdminNotify && SuperAriAdminNotify.upsertUser) {
          SuperAriAdminNotify.upsertUser({ name: name, email: email, role: role, status: 'pending', source: 'kayit' });
        }
        window.location.href = target;
      }

      function failBusy(reason) {
        notifyBusy({ name: name, email: email, source: 'kayit', reason: reason || 'capacity' });
        showFormError(form, USER_BUSY);
        if (btn) btn.disabled = false;
      }

      // Try API register when available; capacity/busy → exact warning + admin notify
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
      fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: name, email: email, role: role, password: fd.get('password') || '' }),
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
          // Non-capacity API errors still notify admins («bize») with same user warning when add fails
          failBusy(err || ('http_' + res.status));
          return;
        }
        succeed();
      }).catch(function () {
        clearTimeout(timer);
        // Static host / no API: demo success path (no false busy)
        succeed();
      });
    });
  });
})();

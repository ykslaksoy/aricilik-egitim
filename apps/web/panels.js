(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

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
      var isSignup = /kayit|onay/i.test(target) || form.querySelector('[name="email"]');
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

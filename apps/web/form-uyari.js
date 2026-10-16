/* koloni: Boş/geçersiz formda Türkçe uyarı (giriş, doğrulama). Tarayıcı balonu yerine form altında net mesaj. */
(function () {
  function textFor(inp) {
    var v = inp.validity, n = inp.name;
    if (n === 'email') return v.valueMissing ? 'E-posta adresinizi yazın.' : 'Geçerli bir e-posta adresi yazın (ör. ornek@mail.com).';
    if (n === 'password') return 'Şifrenizi yazın.';
    if (n === 'code') return v.valueMissing ? '6 haneli doğrulama kodunu yazın.' : 'Kod 6 rakamdan oluşmalı.';
    return 'Bu alanı doldurun.';
  }
  function box(form) {
    var p = form.querySelector('.form-uyari');
    if (!p) {
      p = document.createElement('p'); p.className = 'form-uyari'; p.setAttribute('role', 'alert');
      p.style.cssText = 'margin:0;color:#b42318;font-weight:700;font-size:.9rem;';
      var btn = form.querySelector('[type=submit]'); form.insertBefore(p, btn);
    }
    return p;
  }
  document.querySelectorAll('form[data-login],form[data-verify]').forEach(function (form) {
    var shown = false;
    form.addEventListener('invalid', function (e) {
      e.preventDefault();
      if (shown) return; shown = true; setTimeout(function () { shown = false; }, 0);
      var inp = e.target, msgs = [];
      form.querySelectorAll('input').forEach(function (i) { if (!i.checkValidity()) { msgs.push(textFor(i)); i.setAttribute('aria-invalid', 'true'); } });
      box(form).textContent = msgs.join(' ');
      try { inp.focus(); } catch (x) { /* ignore */ }
    }, true);
    form.addEventListener('input', function (e) {
      if (e.target.checkValidity && e.target.checkValidity()) e.target.removeAttribute('aria-invalid');
      var p = form.querySelector('.form-uyari'); if (p && form.checkValidity()) p.textContent = '';
    });
  });
})();

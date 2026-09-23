/* Geri al: pre-layout device-runtime (commit 6673acd, no injectAnaHomeLayout). */
(function () {
  var x = new XMLHttpRequest();
  x.open('GET', 'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@6673acd59e973cf9b20cb41fe4638979ded57dac/apps/web/device-runtime.js', false);
  x.send(null);
  if (x.status >= 200 && x.status < 300 && x.responseText) {
    (0, eval)(x.responseText);
  } else {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@6673acd59e973cf9b20cb41fe4638979ded57dac/apps/web/device-runtime.js';
    (document.head || document.documentElement).appendChild(s);
  }
})();

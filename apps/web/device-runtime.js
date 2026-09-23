/* Emergency loader: restore pre-layout device-runtime from commit 6673acd (no ana-home-layout inject). */
(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/ykslaksoy/aricilik-egitim@6673acd59e973cf9b20cb41fe4638979ded57dac/apps/web/device-runtime.js';
  s.async = false;
  (document.head || document.documentElement).appendChild(s);
})();

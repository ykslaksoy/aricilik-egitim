/* SüperArı service worker — uygulama kabuğunu önbelleğe alır, çevrimdışı açılış sağlar.
 * Sürüm, kayıt adresindeki ?v= değerinden gelir (pwa.js: sw.js?v=<sayfa sürümü>);
 * her yayında ?v= değişince yeni SW kurulur ve eski önbellekler silinir.
 * HTML / JS / CSS: önce ağ (canlı güncellemeler hemen gelir), ağ yoksa önbellek.
 * Görseller / simgeler: önce önbellek, arka planda yenilenir.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = "superari-shell-" + VERSION;
const RUNTIME = "superari-runtime-" + VERSION;
const SHELL = [
  "/",
  "/ana.css",
  "/ana.html",
  "/ana.js",
  "/arici.html",
  "/arilik.html",
  "/ariliklar.html",
  "/ayarlar.html",
  "/bakici.html",
  "/bakim.html",
  "/bugun.html",
  "/cihazlar.html",
  "/demo-data.js",
  "/device-runtime.js",
  "/forage-analysis.js",
  "/forage-yield-estimate.js",
  "/foto.js",
  "/gider-store.js",
  "/giderler.html",
  "/giris.html",
  "/gorevler.html",
  "/hava-gecmis.html",
  "/hava-kayit.js",
  "/hava-raporu.html",
  "/index.html",
  "/isci.html",
  "/kamera.html",
  "/kayit.html",
  "/koloni-islem.html",
  "/koloni.js",
  "/kovan-ara.js",
  "/kovan.html",
  "/kovanlar.html",
  "/kullanicilar.html",
  "/kullanicilar.js",
  "/kurulum.html",
  "/landcover-sync.js",
  "/logo-sec.html",
  "/nav.js",
  "/onay.html",
  "/panels.css",
  "/panels.js",
  "/petek-tarama.css",
  "/petek-tarama.html",
  "/petek-tarama.js",
  "/qr-etiket.html",
  "/rapor-bal.html",
  "/rapor-common.css",
  "/rapor-donem.html",
  "/rapor-export.html",
  "/rapor-kar-zarar.html",
  "/rapor-muayene.html",
  "/rapor-saglik.html",
  "/rapor-store.js",
  "/rapor-uyari-gorev.html",
  "/raporlar.html",
  "/saglik-detay.html",
  "/saglik.html",
  "/ogul.js",
  "/irk-tahmin.js",
  "/hastalik-tahmin.js",
  "/sensor-health.js",
  "/sensorler.html",
  "/stok.html",
  "/styles.css",
  "/uyarilar.html",
  "/yandex-config.js",
  "/yandex-map.js",
  "/yonetici.html",
  "/pwa.js",
  "/hesap.html",
  "/bakim-plan.html",
  "/bakim-plan.js",
  "/bakim-yap.html",
  "/ilac-katalog.js",
  "/bulut.js",
  "/vendor/supabase.js",
  "/manifest.json",
  "/logos/hardal-bees.js",
  "/vendor/qrcode.js",
  "/vendor/jsqr.js",
  "/assets/logos/hardal-italyan-bee.png",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png"
];
const NET_TIMEOUT_MS = 6000;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => (k.indexOf("superari-") === 0 || k.indexOf("koloni-v") === 0) && k !== CACHE && k !== RUNTIME)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromCache(req) {
  return caches.match(req).then((hit) => hit || caches.match(req, { ignoreSearch: true }));
}
function putRuntime(req, res) {
  if (!res || !res.ok || res.type === "opaque") return;
  const copy = res.clone();
  caches.open(RUNTIME).then((c) => c.put(req, copy)).catch(() => {});
}
function networkFirst(req, isNav) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      fromCache(req).then((hit) => { if (hit && !done) { done = true; resolve(hit); } });
    }, NET_TIMEOUT_MS);
    fetch(req).then((res) => {
      putRuntime(req, res);
      if (!done) { done = true; clearTimeout(timer); resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache(req).then((hit) => {
        if (done) return;
        done = true;
        if (hit) { resolve(hit); return; }
        if (isNav) {
          fromCache(new Request("/ana.html")).then((a) => resolve(a || new Response(
            "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Çevrimdışı</title><body style='font-family:system-ui;padding:2rem'><h1>Çevrimdışı</h1><p>Bu sayfa henüz cihaza kaydedilmedi. İnternete bağlanınca tekrar deneyin.</p><p><a href='/ana.html'>Ana sayfa</a></p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } })));
        } else {
          resolve(new Response("", { status: 504, statusText: "offline" }));
        }
      });
    });
  });
}
function cacheFirst(req) {
  return fromCache(req).then((hit) => {
    const net = fetch(req).then((res) => { putRuntime(req, res); return res; });
    if (hit) { net.catch(() => {}); return hit; }
    return net.catch(() => new Response("", { status: 504, statusText: "offline" }));
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;
  const isNav = req.mode === "navigate";
  if (isNav || /\.(html|js|css|json)$/i.test(url.pathname) || url.pathname === "/") {
    e.respondWith(networkFirst(req, isNav));
    return;
  }
  if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|wav|mp3)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req));
  }
});

/* Bildirime dokununca ilgili sayfayı aç / öne getir. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/gorevler.html", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === target && "focus" in c) return c.focus();
      }
      for (const c of list) {
        if ("navigate" in c && "focus" in c) return c.navigate(target).then((w) => (w || c).focus());
      }
      return self.clients.openWindow ? self.clients.openWindow(target) : null;
    })
  );
});

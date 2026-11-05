// Bei jeder Änderung an der App VERSION erhöhen. Die Daten liegen in IndexedDB
// und die Karten in TILE_CACHE, beides bleibt bei einem Update unangetastet.
var VERSION = '1.4.0';
var APP_CACHE = 'kb-app-' + VERSION;
var TILE_CACHE = 'kb-tiles-v1';
var SHELL = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/db.js', 'js/geo.js', 'js/map.js', 'js/app.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  // cache: 'reload' umgeht den Browser-Cache, sonst landen alte Dateien in der neuen Version.
  e.waitUntil(caches.open(APP_CACHE).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf('kb-app-') === 0 && k !== APP_CACHE;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) {
  if (e.data === 'update-now') self.skipWaiting();
  if (e.data === 'version' && e.ports[0]) e.ports[0].postMessage(VERSION);
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  if (url.hostname === 'wmts.geo.admin.ch') {
    e.respondWith(caches.open(TILE_CACHE).then(function (c) {
      return c.match(e.request.url).then(function (hit) {
        return hit || fetch(e.request);
      });
    }));
    return;
  }

  // Legendenbilder einmal laden und danach auch offline zeigen.
  if (url.hostname === 'api3.geo.admin.ch' && url.pathname.indexOf('/static/images/legends/') === 0) {
    e.respondWith(caches.open(TILE_CACHE).then(function (c) {
      return c.match(e.request.url).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          c.put(e.request.url, res.clone());
          return res;
        });
      });
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(APP_CACHE).then(function (c) {
      return c.match('index.html').then(function (hit) { return hit || fetch(e.request); });
    }));
    return;
  }

  e.respondWith(caches.open(APP_CACHE).then(function (c) {
    return c.match(e.request).then(function (hit) { return hit || fetch(e.request); });
  }));
});

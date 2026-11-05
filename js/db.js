// Lokale Datenbank (IndexedDB). Nichts davon verlässt das Gerät, ausser über das Backup.
var DB = (function () {
  var STORES = ['klufte', 'funde', 'begehungen', 'media', 'meta'];
  var dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open('kluftbuch', 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        STORES.forEach(function (s) {
          if (d.objectStoreNames.contains(s)) return;
          var os = d.createObjectStore(s, { keyPath: 'id' });
          if (s === 'funde' || s === 'begehungen') os.createIndex('kluftId', 'kluftId');
        });
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode);
        var out;
        var q = fn(t.objectStore(store));
        if (q) q.onsuccess = function () { out = q.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function get(s, id) { return tx(s, 'readonly', function (o) { return o.get(id); }); }
  function all(s) { return tx(s, 'readonly', function (o) { return o.getAll(); }); }
  function put(s, v) { return tx(s, 'readwrite', function (o) { return o.put(v); }).then(function () { return v; }); }
  function del(s, id) { return tx(s, 'readwrite', function (o) { return o.delete(id); }); }
  function byKluft(s, id) { return tx(s, 'readonly', function (o) { return o.index('kluftId').getAll(id); }); }

  function meta(key, fallback) {
    return get('meta', key).then(function (r) { return r ? r.value : fallback; });
  }
  function setMeta(key, value) { return put('meta', { id: key, value: value }); }

  function nextKluftNr() {
    return meta('kluftCounter', 0).then(function (n) {
      n += 1;
      return setMeta('kluftCounter', n).then(function () { return 'K-' + String(n).padStart(3, '0'); });
    });
  }

  function blobToB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  }

  function b64ToBlob(b64, type) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: type || 'application/octet-stream' });
  }

  // Backup als Blob aus Einzelteilen, damit grosse Fotomengen nicht in einen String müssen.
  function exportBlob() {
    return Promise.all([all('klufte'), all('funde'), all('begehungen'), all('meta'), all('media')]).then(function (r) {
      var keepMeta = r[3].filter(function (m) { return m.id !== 'lastBackup'; });
      var parts = ['{"app":"kluftbuch","v":1,"exportedAt":' + JSON.stringify(new Date().toISOString()) +
        ',"klufte":' + JSON.stringify(r[0]) + ',"funde":' + JSON.stringify(r[1]) +
        ',"begehungen":' + JSON.stringify(r[2]) + ',"meta":' + JSON.stringify(keepMeta) + ',"media":['];
      var media = r[4];
      return media.reduce(function (p, m, i) {
        return p.then(function () { return blobToB64(m.blob); }).then(function (b64) {
          parts.push((i ? ',' : '') + JSON.stringify({ id: m.id, type: m.blob.type, createdAt: m.createdAt, data: b64 }));
        });
      }, Promise.resolve()).then(function () {
        parts.push(']}');
        return new Blob(parts, { type: 'application/json' });
      });
    });
  }

  // Import ergänzt: Neues kommt dazu, bei gleichem Eintrag gewinnt der jüngere Stand.
  function importData(data) {
    if (!data || data.app !== 'kluftbuch') return Promise.reject(new Error('Das ist kein Kluftbuch-Backup.'));
    var added = 0;
    function merge(store, list) {
      return (list || []).reduce(function (p, item) {
        return p.then(function () { return get(store, item.id); }).then(function (cur) {
          if (cur && (cur.updatedAt || '') >= (item.updatedAt || '')) return null;
          if (!cur) added += 1;
          return put(store, item);
        });
      }, Promise.resolve());
    }
    return merge('klufte', data.klufte).then(function () {
      return merge('funde', data.funde);
    }).then(function () {
      return merge('begehungen', data.begehungen);
    }).then(function () {
      return (data.media || []).reduce(function (p, m) {
        return p.then(function () { return get('media', m.id); }).then(function (cur) {
          if (cur) return null;
          return put('media', { id: m.id, blob: b64ToBlob(m.data, m.type), createdAt: m.createdAt });
        });
      }, Promise.resolve());
    }).then(function () {
      var incoming = (data.meta || []).filter(function (m) { return m.id === 'kluftCounter'; })[0];
      return meta('kluftCounter', 0).then(function (n) {
        return setMeta('kluftCounter', Math.max(n, incoming ? incoming.value : 0));
      });
    }).then(function () { return added; });
  }

  return {
    uid: uid, get: get, all: all, put: put, del: del, byKluft: byKluft,
    meta: meta, setMeta: setMeta, nextKluftNr: nextKluftNr,
    exportBlob: exportBlob, importData: importData
  };
})();

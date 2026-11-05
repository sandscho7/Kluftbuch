(function () {
  'use strict';

  var TILE_CACHE = 'kb-tiles-v1';
  var STATUS = ['Vermutet', 'In Arbeit', 'Ausgeräumt'];
  var ANZEICHEN = ['Quarzband', 'Rostspuren', 'Hohlklang', 'Chloritsand', 'Kluftöffnung'];
  var GESTEIN = ['Granit', 'Gneis', 'Amphibolit', 'Dolomit', 'Schiefer'];
  var EXPO = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  var MINERALE = ['Bergkristall', 'Rauchquarz', 'Morion', 'Adular', 'Albit', 'Chlorit', 'Hämatit', 'Titanit', 'Rutil', 'Anatas', 'Calcit', 'Fluorit', 'Pyrit'];
  var LAGE = ['Decke', 'Wand', 'Boden', 'Sand'];
  var ZUSTAND = ['Intakt', 'Bestossen', 'Bruch'];

  var ICONS = {
    map: '<path d="M3 20l6-12 4 7 2-3 6 8H3z"/>',
    book: '<path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3z"/><path d="M5 17h14"/><path d="M12 6l-2 4 3 1-2 3"/>',
    gem: '<path d="M7 4h10l4 6-9 11L3 10l4-6z"/><path d="M3 10h18M9 10l3 11 3-11"/>',
    more: '<circle cx="5" cy="12" r="1.500"/><circle cx="12" cy="12" r="1.500"/><circle cx="19" cy="12" r="1.500"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    eyeoff: '<path d="M3 3l18 18"/><path d="M10.600 5.200A9 9 0 0 1 12 5c6 0 9.500 7 9.500 7a15 15 0 0 1-3 3.800"/><path d="M6.300 6.600A15 15 0 0 0 2.500 12S6 19 12 19a9 9 0 0 0 4.500-1.200"/>',
    eye: '<path d="M2.500 12S6 5 12 5s9.500 7 9.500 7-3.500 7-9.500 7-9.500-7-9.500-7z"/><circle cx="12" cy="12" r="3"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    pin: '<path d="M12 21s7-6.500 7-12a7 7 0 1 0-14 0c0 5.500 7 12 7 12z"/><circle cx="12" cy="9" r="2.500"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
  };

  var state = {
    tarn: false, tour: null, pos: null, watchId: null, map: null, lastBounds: null,
    draft: null, pick: null, filter: 'Alle', search: '', fsearch: '', reveal: {},
    dl: null, reg: null, updateReady: false, recorder: null, inited: false
  };

  var el = {
    screen: $('#screen'), mapView: $('#map-view'), tabs: $('#tabs'), top: $('#map-top'),
    tools: $('#map-tools'), sheet: $('#map-sheet'), cross: $('#crosshair'), modal: $('#modal'),
    light: $('#lightbox'), toast: $('#toast')
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icon(n, s) {
    s = s || 24;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg>';
  }
  function num(v) {
    if (v == null || v === '') return null;
    var n = parseFloat(String(v).replace(',', '.').replace(/'/g, ''));
    return isNaN(n) ? null : n;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fmtDate(s) {
    if (!s) return '';
    var p = String(s).slice(0, 10).split('-');
    return p[2] + '.' + p[1] + '.' + p[0];
  }
  function fmtM(v) {
    return v == null ? '–' : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "'") + ' m';
  }
  function fmtDist(m) {
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km';
  }
  function fmtBytes(b) {
    if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB';
    return Math.max(1, Math.round(b / 1e6)) + ' MB';
  }
  function now() { return new Date().toISOString(); }

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.toast.hidden = true; }, 3000);
  }

  function dialog(html) {
    el.modal.innerHTML = '<div class="modal-box" role="dialog" aria-modal="true">' + html + '</div>';
    el.modal.hidden = false;
  }
  function closeDialog() { el.modal.hidden = true; el.modal.innerHTML = ''; }

  function ask(title, text, ok, danger) {
    return new Promise(function (res) {
      dialog('<h2>' + esc(title) + '</h2>' + (text ? '<p>' + esc(text) + '</p>' : '') +
        '<div class="row2"><button class="btn" id="m-no">Abbrechen</button>' +
        '<button class="btn ' + (danger ? 'danger' : 'primary') + '" id="m-yes">' + esc(ok) + '</button></div>');
      $('#m-no').onclick = function () { closeDialog(); res(false); };
      $('#m-yes').onclick = function () { closeDialog(); res(true); };
    });
  }

  function promptText(title, label) {
    return new Promise(function (res) {
      dialog('<h2>' + esc(title) + '</h2><label class="field">' + esc(label) +
        '<input id="m-in" type="text" autocomplete="off"></label>' +
        '<div class="row2"><button class="btn" id="m-no">Abbrechen</button>' +
        '<button class="btn primary" id="m-yes">OK</button></div>');
      $('#m-in').focus();
      $('#m-no').onclick = function () { closeDialog(); res(null); };
      $('#m-yes').onclick = function () {
        var v = $('#m-in').value.trim();
        closeDialog();
        res(v || null);
      };
    });
  }

  var urls = {};
  function mediaUrl(id) {
    if (urls[id]) return Promise.resolve(urls[id]);
    return DB.get('media', id).then(function (m) {
      if (!m) return '';
      urls[id] = URL.createObjectURL(m.blob);
      return urls[id];
    });
  }
  function hydrate(root) {
    (root || document).querySelectorAll('[data-media]').forEach(function (n) {
      mediaUrl(n.getAttribute('data-media')).then(function (u) { if (u) n.src = u; });
    });
  }

  function compress(file) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var f = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * f);
        c.height = Math.round(img.naturalHeight * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(function (b) { res(b || file); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(file); };
      img.src = u;
    });
  }

  function saveMedia(blob) {
    var m = { id: DB.uid(), blob: blob, createdAt: now() };
    return DB.put('media', m).then(function () { return m.id; });
  }

  function pickPhotos() {
    return new Promise(function (res) {
      var i = document.createElement('input');
      i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.hidden = true;
      document.body.appendChild(i);
      i.onchange = function () {
        var files = Array.prototype.slice.call(i.files || []);
        i.remove();
        files.reduce(function (p, f) {
          return p.then(function (ids) {
            return compress(f).then(saveMedia).then(function (id) { ids.push(id); return ids; });
          });
        }, Promise.resolve([])).then(res);
      };
      i.click();
    });
  }

  function askPersist() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  }

  function locate(ok, fail) {
    if (!navigator.geolocation) { fail('Dieses Gerät gibt keinen Standort her.'); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      var c = p.coords;
      state.pos = { lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude };
      ok(state.pos);
    }, function (e) {
      fail(e.code === 1 ? 'Standort ist nicht erlaubt. Prüfe die Ortungsdienste.' : 'Kein GPS-Signal. Setze den Punkt auf der Karte.');
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
  }

  /* Karte ------------------------------------------------------------ */

  function initMap() {
    if (state.map) return;
    state.map = new TileMap($('#map'), {
      onMove: function () {
        if (!el.mapView.hidden) state.lastBounds = state.map.bounds();
      }
    });
    DB.meta('mapView', null).then(function (v) {
      if (v) state.map.setView(v.lat, v.lon, v.zoom);
    });
  }

  function statusKind(s) { return s === 'Vermutet' ? 'guess' : s === 'In Arbeit' ? 'work' : 'done'; }

  function renderMap() {
    initMap();
    el.cross.hidden = !state.pick;
    return Promise.all([DB.all('klufte'), DB.meta('areas', [])]).then(function (r) {
      var klufte = r[0], areas = r[1];
      var visible = klufte.filter(function (k) { return k.lat != null; });
      state.map.setMarkers(state.tarn || state.pick ? [] : visible.map(function (k) {
        return {
          lat: k.lat, lon: k.lon, kind: statusKind(k.status),
          label: 'Kluft ' + k.nr + ' öffnen, ' + k.status,
          onClick: function () { location.hash = '#/kluft/' + k.id; }
        };
      }));
      state.map.setMe(state.pos ? state.pos.lat : null, state.pos ? state.pos.lon : null);

      var c = state.map.center();
      var title = Geo.areaAt(c.lat, c.lon) || 'Karte';
      var net = navigator.onLine ? 'Online' : 'Offline';
      var n = areas.length;
      el.top.innerHTML = state.pick ?
        '<div class="map-title"><strong>Punkt wählen</strong><span>Karte unter das Kreuz schieben</span></div>' :
        '<div class="map-title"><strong>' + esc(title) + '</strong><span>' + net + ' · ' + n + (n === 1 ? ' Gebiet' : ' Gebiete') + ' geladen</span></div>' +
        '<button class="map-btn' + (state.tarn ? ' on' : '') + '" data-act="tarn" aria-pressed="' + state.tarn + '" aria-label="Tarnmodus, Fundpunkte ausblenden">' + icon(state.tarn ? 'eyeoff' : 'eye') + '</button>' +
        '<a class="map-btn" href="#/mehr" aria-label="Offline-Karten verwalten">' + icon('layers') + '</a>';

      el.tools.innerHTML =
        '<button class="map-btn" data-act="zoom-in" aria-label="Hineinzoomen">' + icon('plus') + '</button>' +
        '<button class="map-btn" data-act="zoom-out" aria-label="Herauszoomen">' + icon('minus') + '</button>' +
        '<button class="map-btn' + (state.watchId != null ? ' on' : '') + '" data-act="locate" aria-label="Mein Standort">' + icon('locate') + '</button>';

      if (state.pick) {
        el.sheet.innerHTML = '<div class="row2"><button class="btn" data-act="pick-cancel">Abbrechen</button><button class="btn primary" data-act="pick-ok">Punkt setzen</button></div>';
      } else {
        el.sheet.innerHTML = sheetHtml(visible);
      }
      state.map.refresh();
    });
  }

  function sheetHtml(klufte) {
    var html = '';
    if (state.tarn) {
      html = '<p class="muted center">Tarnmodus an. Fundpunkte sind ausgeblendet.</p>';
    } else if (!klufte.length) {
      html = '<div class="sheet-main"><div class="grow"><div class="eyebrow">Noch leer</div><div class="sheet-title">Erste Kluft erfassen</div></div><a class="btn dark" href="#/neu">Neu</a></div>';
    } else {
      var k, d = null;
      if (state.pos) {
        klufte.forEach(function (x) {
          var dist = Geo.distance(state.pos.lat, state.pos.lon, x.lat, x.lon);
          if (d == null || dist < d) { d = dist; k = x; }
        });
      } else {
        k = klufte.slice().sort(function (a, b) { return b.updatedAt > a.updatedAt ? 1 : -1; })[0];
      }
      var eyebrow = d != null ? 'Nächste Kluft · ' + fmtDist(d) : 'Zuletzt bearbeitet';
      if (d != null && k.alt != null && state.pos.alt != null) {
        var dh = Math.round(k.alt - state.pos.alt);
        eyebrow += ' · ' + (dh >= 0 ? '+' : '') + dh + ' Hm';
      }
      html = '<div class="sheet-main"><div class="grow"><div class="eyebrow">' + esc(eyebrow) + '</div>' +
        '<div class="sheet-title">' + esc(k.name || k.nr) + '</div>' +
        '<div class="mono small">' + esc(k.nr) + ' · ' + esc(k.status) + ' · ' + fmtM(k.alt) + '</div></div>' +
        '<a class="btn dark" href="#/kluft/' + k.id + '">Öffnen</a></div>';
    }
    return html + tourRow();
  }

  function tourRow() {
    var t = state.tour;
    if (!t) return '<button class="tour-row" data-act="tour">' + icon('clock', 18) + '<span>Rückmeldezeit setzen</span></button>';
    var late = new Date() > new Date(t.at);
    var time = new Date(t.at).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    return '<button class="tour-row' + (late ? ' late' : '') + '" data-act="tour">' + icon('clock', 18) +
      '<span>' + (late ? 'Überfällig: ' : 'Rückmeldung bis ') + esc(time) + ' an ' + esc(t.name || 'Kontakt') + '</span></button>';
  }

  /* Rückmeldung ------------------------------------------------------ */

  function tourDialog() {
    var t = state.tour;
    DB.meta('contact', {}).then(function (c) {
      dialog('<h2>Rückmeldung</h2><p>Die App erinnert dich nur, solange sie offen ist. Vereinbare die Zeit deshalb auch direkt mit deinem Kontakt.</p>' +
        '<label class="field">Zurück bis<input id="t-time" type="time" value="' + (t ? new Date(t.at).toTimeString().slice(0, 5) : '17:00') + '"></label>' +
        '<label class="field">Kontakt<input id="t-name" type="text" value="' + esc(c.name || '') + '"></label>' +
        '<label class="field">Telefon<input id="t-tel" type="tel" value="' + esc(c.tel || '') + '"></label>' +
        '<button class="btn primary wide" id="t-save">Speichern</button>' +
        (t ? '<button class="btn wide" id="t-back">Bin zurück, per SMS melden</button><button class="btn wide" id="t-clear">Rückmeldung entfernen</button>' : '') +
        '<button class="btn wide" id="t-close">Schliessen</button>');
      $('#t-close').onclick = closeDialog;
      $('#t-save').onclick = function () {
        var p = $('#t-time').value.split(':');
        var d = new Date();
        d.setHours(+p[0], +p[1], 0, 0);
        if (d < new Date()) d.setDate(d.getDate() + 1);
        var contact = { name: $('#t-name').value.trim(), tel: $('#t-tel').value.trim() };
        state.tour = { at: d.toISOString(), name: contact.name, tel: contact.tel };
        Promise.all([DB.setMeta('contact', contact), DB.setMeta('tour', state.tour)]).then(function () {
          closeDialog(); route();
        });
      };
      if (t) {
        var clear = function () {
          state.tour = null;
          return DB.setMeta('tour', null).then(function () { closeDialog(); route(); });
        };
        $('#t-clear').onclick = clear;
        $('#t-back').onclick = function () {
          var tel = $('#t-tel').value.trim();
          if (tel) location.href = 'sms:' + tel.replace(/[^\d+]/g, '') + '&body=' + encodeURIComponent('Bin zurück.');
          clear();
        };
      }
    });
  }

  /* Bausteine -------------------------------------------------------- */

  function chip(field, val, on, cls) {
    return '<button type="button" class="' + (cls || 'chip') + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="toggle" data-field="' + esc(field) + '" data-val="' + esc(val) + '">' + esc(val) + '</button>';
  }

  function group(field, label, options, multi, custom) {
    var d = state.draft;
    var cur = d[field];
    var opts = options.slice();
    if (multi) (cur || []).forEach(function (v) { if (opts.indexOf(v) < 0) opts.push(v); });
    else if (cur && opts.indexOf(cur) < 0) opts.push(cur);
    var cls = 'chip', wrap = 'chips';
    if (field === 'expo') { cls = 'seg mono'; wrap = 'grid8'; }
    if (field === 'status' || field === 'zustand') { cls = 'seg'; wrap = 'grid3'; }
    if (field === 'lage') { cls = 'seg'; wrap = 'grid4'; }
    return '<fieldset id="g-' + field + '" data-multi="' + (multi ? 1 : 0) + '"><legend>' + esc(label) + '</legend><div class="' + wrap + '">' +
      opts.map(function (o) { return chip(field, o, multi ? (cur || []).indexOf(o) >= 0 : cur === o, cls); }).join('') +
      (custom ? '<button type="button" class="chip" data-act="custom" data-field="' + field + '" data-label="' + esc(label) + '">Eigene +</button>' : '') +
      '</div></fieldset>';
  }

  function refreshGroup(field, label, options, multi, custom) {
    var g = $('#g-' + field);
    if (g) g.outerHTML = group(field, label, options, multi, custom);
  }

  var GROUPS = {
    status: ['Status', STATUS, false, false],
    anzeichen: ['Anzeichen', ANZEICHEN, true, true],
    gestein: ['Gestein', GESTEIN, false, true],
    expo: ['Exposition', EXPO, false, false],
    mineralien: ['Mineralien', MINERALE, true, true],
    lage: ['Lage in der Kluft', LAGE, false, false],
    zustand: ['Zustand', ZUSTAND, false, false]
  };

  function input(name, label, type, attrs) {
    var v = state.draft[name];
    return '<label class="field">' + esc(label) + '<input data-bind="' + name + '" type="' + (type || 'text') + '" value="' + esc(v == null ? '' : v) + '" ' + (attrs || '') + '></label>';
  }

  function textarea(name, label) {
    return '<label class="field">' + esc(label) + '<textarea data-bind="' + name + '" rows="3">' + esc(state.draft[name] || '') + '</textarea></label>';
  }

  function mediaList(d) {
    var ph = (d.photos || []).map(function (id) {
      return '<div class="thumb"><img data-media="' + id + '" alt="Foto" data-act="zoom" data-id="' + id + '"><button type="button" class="thumb-x" data-act="rm-media" data-id="' + id + '" aria-label="Foto entfernen">' + icon('close', 16) + '</button></div>';
    }).join('');
    var au = (d.voice || []).map(function (id, i) {
      return '<div class="voice"><span>Sprachnotiz ' + (i + 1) + '</span><audio controls data-media="' + id + '"></audio><button type="button" class="btn small" data-act="rm-media" data-id="' + id + '">Entfernen</button></div>';
    }).join('');
    return (ph ? '<div class="thumbs">' + ph + '</div>' : '') + au;
  }

  function refreshMedia() {
    var n = $('#media');
    if (n) { n.innerHTML = mediaList(state.draft); hydrate(n); }
  }

  /* Kluft-Formular --------------------------------------------------- */

  function posHtml(d) {
    var txt = d.lat != null ?
      '<strong>' + (d.gps ? 'Punkt gesetzt' + (d.acc ? ', ± ' + Math.round(d.acc) + ' m' : '') : 'Punkt auf Karte gesetzt') + '</strong>' +
      '<span class="mono">' + esc(Geo.maskLV95(d.lat, d.lon)) + '</span>' :
      '<strong>' + (d.gpsBusy ? 'Suche GPS …' : 'Noch kein Punkt') + '</strong><span>' + esc(d.gpsErr || 'GPS oder Karte verwenden') + '</span>';
    return '<div class="dark-card">' + icon('pin', 26) + '<div class="grow">' + txt + '</div></div>' +
      '<div class="row2"><button type="button" class="btn" data-act="gps">GPS messen</button><button type="button" class="btn" data-act="pick">Auf Karte wählen</button></div>';
  }

  function refreshPos() {
    var n = $('#pos');
    if (n) n.innerHTML = posHtml(state.draft);
  }

  function runGps() {
    var d = state.draft;
    d.gpsBusy = true; d.gpsErr = null;
    refreshPos();
    locate(function (p) {
      if (state.draft !== d) return;
      d.gpsBusy = false; d.lat = p.lat; d.lon = p.lon; d.acc = p.acc; d.gps = true;
      if (p.alt != null) d.alt = Math.round(p.alt);
      if (!d.gebiet) d.gebiet = Geo.areaAt(p.lat, p.lon);
      var a = $('[data-bind=alt]'); if (a) a.value = d.alt == null ? '' : d.alt;
      var g = $('[data-bind=gebiet]'); if (g) g.value = d.gebiet || '';
      refreshPos();
    }, function (msg) {
      if (state.draft !== d) return;
      d.gpsBusy = false; d.gpsErr = msg;
      refreshPos();
    });
  }

  function renderKluftForm() {
    var d = state.draft;
    el.screen.innerHTML =
      '<div class="form">' +
      '<header class="form-head"><button type="button" class="square" data-act="cancel" aria-label="Abbrechen">' + icon('close') + '</button>' +
      '<h1>' + (d.id ? 'Kluft bearbeiten' : 'Neue Kluft') + '</h1><span class="mono strong">' + esc(d.nr || '') + '</span></header>' +
      '<div id="pos" class="stack">' + posHtml(d) + '</div>' +
      '<div class="grid2">' +
      '<button type="button" class="big-btn accent" data-act="photo">' + icon('camera', 26) + '<span>Foto</span></button>' +
      '<button type="button" class="big-btn" data-act="voice" id="voice-btn">' + icon('mic', 26) + '<span>Sprachnotiz</span></button></div>' +
      '<div id="media">' + mediaList(d) + '</div>' +
      input('name', 'Name') +
      group('status', 'Status', STATUS, false, false) +
      group('anzeichen', 'Anzeichen', ANZEICHEN, true, true) +
      group('gestein', 'Gestein', GESTEIN, false, true) +
      group('expo', 'Exposition', EXPO, false, false) +
      textarea('befund', 'Befund') +
      '<details' + (d.id ? ' open' : '') + '><summary>Mehr Angaben</summary><div class="stack">' +
      input('gebiet', 'Gebiet') +
      '<div class="grid2">' + input('alt', 'Höhe m', 'text', 'inputmode="numeric"') + input('tiefe', 'Tiefe m', 'text', 'inputmode="decimal"') + '</div>' +
      textarea('zustieg', 'Zustieg') +
      input('bewGemeinde', 'Bewilligung: Gemeinde') +
      '<div class="grid2">' + input('bewNr', 'Nummer') + input('bewBis', 'Gültig bis', 'date') + '</div>' +
      '</div></details>' +
      '<button type="button" class="btn accent wide tall" data-act="save-kluft">Kluft speichern</button>' +
      (d.id ? '<button type="button" class="btn wide" data-act="del-kluft">Kluft löschen</button>' : '') +
      '</div>';
    hydrate(el.screen);
  }

  function startNew() {
    return Promise.resolve({
      _route: 'neu', photos: [], voice: [], anzeichen: [], status: 'Vermutet',
      name: '', befund: '', _newMedia: []
    });
  }

  function saveKluft() {
    var d = state.draft;
    var isNew = !d.id;
    var prep = isNew ? DB.nextKluftNr() : Promise.resolve(d.nr);
    return prep.then(function (nr) {
      var k = {
        id: d.id || DB.uid(), nr: nr, name: (d.name || '').trim(), status: d.status,
        lat: d.lat == null ? null : d.lat, lon: d.lon == null ? null : d.lon, acc: d.acc || null,
        alt: num(d.alt), tiefe: num(d.tiefe), expo: d.expo || '', gestein: d.gestein || '',
        anzeichen: d.anzeichen || [], befund: d.befund || '', gebiet: (d.gebiet || '').trim(),
        zustieg: d.zustieg || '', bewGemeinde: d.bewGemeinde || '', bewNr: d.bewNr || '', bewBis: d.bewBis || '',
        photos: d.photos || [], voice: d.voice || [], fundCounter: d.fundCounter || 0,
        createdAt: d.createdAt || now(), updatedAt: now()
      };
      return DB.put('klufte', k).then(function () {
        if (!isNew) return k;
        return DB.put('begehungen', { id: DB.uid(), kluftId: k.id, datum: today(), notiz: 'Erfasst', updatedAt: now() }).then(function () { return k; });
      });
    }).then(function (k) {
      askPersist();
      state.draft = null;
      location.replace('#/kluft/' + k.id);
      toast('Gespeichert');
    });
  }

  /* Kluft-Detail ----------------------------------------------------- */

  function renderKluft(id) {
    return Promise.all([DB.get('klufte', id), DB.byKluft('funde', id), DB.byKluft('begehungen', id)]).then(function (r) {
      var k = r[0];
      if (!k) { location.replace('#/kluefte'); return; }
      var funde = r[1].sort(function (a, b) { return a.nr < b.nr ? 1 : -1; });
      var beg = r[2].sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
      var shown = state.reveal[id] && !state.tarn;
      var ph = k.photos || [];
      var hero = ph.length ?
        '<div class="hero"><div class="hero-scroll">' + ph.map(function (p) {
          return '<img data-media="' + p + '" alt="Foto der Kluft" data-act="zoom" data-id="' + p + '">';
        }).join('') + '</div></div>' : '<div class="hero-empty"></div>';
      var cell = function (l, v, span) {
        return '<div class="cell' + (span ? ' span2' : '') + '"><div class="label">' + esc(l) + '</div><div class="value">' + esc(v || '–') + '</div></div>';
      };
      var coords = k.lat != null ?
        '<div class="dark-card">' + icon('lock', 22) + '<div class="grow"><span>Koordinaten LV95' + (shown ? '' : ', verdeckt') + '</span>' +
        '<span class="mono big">' + esc(shown ? Geo.fmtLV95(k.lat, k.lon) : Geo.maskLV95(k.lat, k.lon)) + '</span></div>' +
        '<button class="btn small" data-act="reveal" data-id="' + id + '">' + (shown ? 'Verbergen' : 'Zeigen') + '</button></div>' +
        '<button class="btn wide" data-act="show-on-map" data-id="' + id + '">Auf Karte zeigen</button>' : '';

      el.screen.innerHTML =
        '<a class="square float" href="#/kluefte" aria-label="Zurück zu den Klüften">' + icon('back') + '</a>' + hero +
        '<div class="page stack-l">' +
        '<div><div class="mono accent-text strong">' + esc(k.nr) + ' · ' + esc(k.status) + '</div>' +
        '<h1>' + esc(k.name || 'Kluft ' + k.nr) + '</h1>' +
        '<div class="muted">' + esc(k.gebiet || 'Ohne Gebiet') + ' · erfasst ' + fmtDate(k.createdAt) + '</div></div>' +
        '<div class="grid3 gap8">' + cell('Höhe', fmtM(k.alt)) + cell('Exposition', k.expo) + cell('Tiefe', k.tiefe != null ? k.tiefe + ' m' : '') +
        cell('Gestein', k.gestein, true) + cell('Funde', String(funde.length)) + '</div>' +
        coords +
        ((k.anzeichen || []).length ? '<section><h2>Anzeichen</h2><p>' + esc(k.anzeichen.join(', ')) + '</p></section>' : '') +
        (k.befund ? '<section><h2>Befund</h2><p class="pre">' + esc(k.befund) + '</p></section>' : '') +
        (k.zustieg ? '<section><h2>Zustieg</h2><p class="pre">' + esc(k.zustieg) + '</p></section>' : '') +
        ((k.voice || []).length ? '<section><h2>Sprachnotizen</h2>' + k.voice.map(function (v) { return '<audio controls data-media="' + v + '"></audio>'; }).join('') + '</section>' : '') +
        '<section><div class="head-row"><h2>Funde</h2><a class="btn accent small" href="#/fund/neu/' + id + '">Fund erfassen</a></div>' +
        (funde.length ? '<div class="list-card">' + funde.map(fundRow).join('') + '</div>' : '<p class="muted">Noch keine Funde.</p>') + '</section>' +
        '<section><div class="head-row"><h2>Begehungen</h2><button class="btn small" data-act="add-beg" data-id="' + id + '">Eintrag</button></div>' +
        beg.map(function (b) {
          return '<button class="beg" data-act="del-beg" data-id="' + b.id + '" data-kluft="' + id + '"><span class="mono">' + fmtDate(b.datum) + '</span><span>' + esc(b.notiz) + '</span></button>';
        }).join('') + '</section>' +
        '<div class="cell"><div class="label">Bewilligung</div><div class="value-s">' +
        esc(k.bewGemeinde ? [k.bewGemeinde, k.bewNr, k.bewBis ? 'gültig bis ' + fmtDate(k.bewBis) : ''].filter(Boolean).join(' · ') : 'Nicht erfasst') + '</div></div>' +
        '<div class="grid2"><button class="btn" data-act="add-photo" data-id="' + id + '">Foto dazu</button><a class="btn dark" href="#/bearbeiten/' + id + '">Bearbeiten</a></div>' +
        '</div>';
      hydrate(el.screen);
    });
  }

  function fundTitle(f) {
    return (f.mineralien || []).join(', ') || 'Fund';
  }
  function fundSize(f) {
    var v = [f.l, f.b, f.h].filter(function (x) { return x != null && x !== ''; });
    return v.length ? v.join(' × ') + ' cm' : '';
  }
  function fundRow(f) {
    var th = (f.photos || [])[0];
    return '<a class="fund-row" href="#/fund/' + f.id + '">' +
      (th ? '<img class="fund-th" data-media="' + th + '" alt="">' : '<span class="fund-th"></span>') +
      '<span class="grow"><span class="fund-t">' + esc(fundTitle(f)) + '</span>' +
      '<span class="mono small muted-b">' + esc([f.nr, fundSize(f)].filter(Boolean).join(' · ')) + '</span></span></a>';
  }

  /* Fund-Formular ---------------------------------------------------- */

  function renderFundForm() {
    var d = state.draft;
    el.screen.innerHTML =
      '<div class="form"><header class="form-head"><button type="button" class="square" data-act="cancel" aria-label="Zurück">' + icon('back') + '</button>' +
      '<div class="grow"><h1>' + (d.id ? 'Fund bearbeiten' : 'Fund erfassen') + '</h1><div class="muted small">' + esc(d._kluftName || '') + '</div></div>' +
      '<span class="mono strong small">' + esc(d.nr || '') + '</span></header>' +
      '<button type="button" class="photo-btn" data-act="photo">' + icon('camera', 30) + '<span>Foto mit Massstab</span></button>' +
      '<div id="media">' + mediaList(d) + '</div>' +
      group('mineralien', 'Mineralien', MINERALE, true, true) +
      '<div class="grid3 gap8">' + input('l', 'Länge cm', 'text', 'inputmode="decimal"') + input('b', 'Breite cm', 'text', 'inputmode="decimal"') + input('h', 'Höhe cm', 'text', 'inputmode="decimal"') + '</div>' +
      group('lage', 'Lage in der Kluft', LAGE, false, false) +
      group('zustand', 'Zustand', ZUSTAND, false, false) +
      '<div class="grid2">' + input('gewicht', 'Gewicht g', 'text', 'inputmode="decimal"') + input('datum', 'Funddatum', 'date') + '</div>' +
      input('lagerort', 'Lagerort') +
      textarea('notiz', 'Notiz') +
      '<button type="button" class="btn accent wide tall" data-act="save-fund">Fund speichern</button>' +
      (d.id ? '<button type="button" class="btn wide" data-act="del-fund">Fund löschen</button>' : '') +
      '</div>';
    hydrate(el.screen);
  }

  function saveFund() {
    var d = state.draft;
    var isNew = !d.id;
    var nrp = isNew ? DB.get('klufte', d.kluftId).then(function (k) {
      k.fundCounter = (k.fundCounter || 0) + 1;
      k.updatedAt = now();
      return DB.put('klufte', k).then(function () {
        return 'F-' + k.nr.replace('K-', '') + '-' + String(k.fundCounter).padStart(2, '0');
      });
    }) : Promise.resolve(d.nr);
    return nrp.then(function (nr) {
      var f = {
        id: d.id || DB.uid(), nr: nr, kluftId: d.kluftId, mineralien: d.mineralien || [],
        l: num(d.l), b: num(d.b), h: num(d.h), gewicht: num(d.gewicht), lage: d.lage || '', zustand: d.zustand || '',
        datum: d.datum || today(), lagerort: (d.lagerort || '').trim(), notiz: d.notiz || '',
        photos: d.photos || [], voice: d.voice || [], createdAt: d.createdAt || now(), updatedAt: now()
      };
      return DB.put('funde', f);
    }).then(function (f) {
      state.draft = null;
      location.replace('#/kluft/' + f.kluftId);
      toast('Fund gespeichert');
    });
  }

  /* Listen ----------------------------------------------------------- */

  function renderKluefte() {
    return Promise.all([DB.all('klufte'), DB.all('funde'), DB.meta('lastBackup', null)]).then(function (r) {
      var all = r[0], funde = r[1], last = r[2];
      var q = state.search.toLowerCase();
      var mineral = {}, counts = {};
      funde.forEach(function (f) {
        counts[f.kluftId] = (counts[f.kluftId] || 0) + 1;
        mineral[f.kluftId] = (mineral[f.kluftId] || []).concat(f.mineralien || []);
      });
      var list = all.filter(function (k) {
        if (state.filter !== 'Alle' && k.status !== state.filter) return false;
        if (!q) return true;
        return [k.name, k.nr, k.gebiet, k.gestein].concat(mineral[k.id] || []).concat(k.anzeichen || []).join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return a.updatedAt < b.updatedAt ? 1 : -1; });

      var stale = all.length && (!last || Date.now() - new Date(last) > 30 * 864e5);
      el.screen.innerHTML =
        '<div class="page"><h1 class="big">Klüfte</h1>' +
        (stale ? '<a class="warn" href="#/mehr">' + (last ? 'Letztes Backup ist über 30 Tage alt.' : 'Noch kein Backup gemacht.') + ' Jetzt sichern</a>' : '') +
        '<label class="search">' + icon('search', 20) + '<input id="q" type="search" aria-label="Klüfte suchen" placeholder="Name, Mineral, Gebiet" value="' + esc(state.search) + '"></label>' +
        '<div class="chips scroll">' + ['Alle'].concat(STATUS).map(function (s) {
          return '<button class="chip' + (state.filter === s ? ' on' : '') + '" aria-pressed="' + (state.filter === s) + '" data-act="filter" data-val="' + s + '">' + s + '</button>';
        }).join('') + '</div>' +
        '<div id="klist" class="stack-s">' + (list.length ? list.map(function (k) { return kluftRow(k, mineral, counts); }).join('') :
          '<p class="muted center pad">' + (all.length ? 'Nichts gefunden.' : 'Noch keine Klüfte. Tippe unten auf Plus.') + '</p>') + '</div></div>';
      var qi = $('#q');
      qi.addEventListener('input', function () {
        state.search = qi.value;
        clearTimeout(qi.t);
        qi.t = setTimeout(function () {
          renderKluefte().then(function () {
            var n = $('#q');
            n.focus();
            n.setSelectionRange(n.value.length, n.value.length);
          });
        }, 250);
      });
    });
  }

  function kluftRow(k, mineral, counts) {
    var m = Array.from(new Set(mineral[k.id] || [])).slice(0, 2);
    var sub = [k.status, k.gebiet].concat(m.length ? [m.join(', ')] : (k.anzeichen || []).slice(0, 2)).filter(Boolean).join(' · ');
    var meta = [k.nr, k.alt != null ? fmtM(k.alt) : '', k.expo, (counts[k.id] || 0) + ' Funde'].filter(Boolean).join(' · ');
    return '<a class="row" href="#/kluft/' + k.id + '"><span class="dot ' + statusKind(k.status) + '"></span><span class="grow">' +
      '<span class="row-t">' + esc(k.name || 'Kluft ' + k.nr) + '</span><span class="row-s">' + esc(sub) + '</span>' +
      '<span class="mono small muted-b">' + esc(meta) + '</span></span></a>';
  }

  function renderFunde() {
    return DB.all('funde').then(function (all) {
      var q = state.fsearch.toLowerCase();
      var list = all.filter(function (f) {
        return !q || [f.nr, f.lagerort, f.notiz, f.zustand].concat(f.mineralien || []).join(' ').toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      el.screen.innerHTML = '<div class="page"><h1 class="big">Funde</h1>' +
        '<label class="search">' + icon('search', 20) + '<input id="fq" type="search" aria-label="Funde suchen" placeholder="Mineral, Nummer, Lagerort" value="' + esc(state.fsearch) + '"></label>' +
        (list.length ? '<div class="list-card">' + list.map(fundRow).join('') + '</div>' : '<p class="muted center pad">' + (all.length ? 'Nichts gefunden.' : 'Noch keine Funde. Du erfasst sie in einer Kluft.') + '</p>') + '</div>';
      hydrate(el.screen);
      var i = $('#fq');
      i.addEventListener('input', function () {
        state.fsearch = i.value;
        clearTimeout(i.t);
        i.t = setTimeout(function () {
          renderFunde().then(function () {
            var n = $('#fq');
            n.focus();
            n.setSelectionRange(n.value.length, n.value.length);
          });
        }, 250);
      });
    });
  }

  /* Mehr ------------------------------------------------------------- */

  function renderMehr() {
    return Promise.all([DB.meta('areas', []), DB.meta('lastBackup', null), DB.all('klufte'), DB.all('funde')]).then(function (r) {
      var areas = r[0], last = r[1];
      var standalone = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
      var byId = {};
      areas.forEach(function (a) { byId[a.id] = a; });
      el.screen.innerHTML = '<div class="page stack-l"><h1 class="big">Mehr</h1>' +
        (standalone ? '' : '<div class="warn">Für Offline-Nutzung: in Safari Teilen antippen und «Zum Home-Bildschirm» wählen.</div>') +
        '<section><h2>Offline-Karten</h2><p class="muted small">Im WLAN laden. Die Kartendaten stammen von swisstopo.</p>' +
        '<div id="dl"></div><div class="list-card">' +
        Geo.AREAS.map(function (a) { return areaRow(a, byId[a.id]); }).join('') +
        areas.filter(function (a) { return a.id.indexOf('own-') === 0; }).map(function (a) { return areaRow(a, a); }).join('') +
        '</div><button class="btn wide" data-act="dl-view">Aktuellen Kartenausschnitt laden</button></section>' +
        '<section><h2>Sicherung</h2><p class="muted small">Deine Daten liegen nur auf diesem iPhone. Sichere sie regelmässig, zum Beispiel in iCloud Drive.</p>' +
        '<div class="cell"><div class="label">Letztes Backup</div><div class="value-s">' + (last ? fmtDate(last) : 'Noch keines') + ' · ' + r[2].length + ' Klüfte, ' + r[3].length + ' Funde</div></div>' +
        '<div class="grid2 top8"><button class="btn dark" data-act="backup">Backup erstellen</button><button class="btn" data-act="restore">Einspielen</button></div></section>' +
        '<section><h2>Privatsphäre</h2><button class="btn wide" data-act="tarn">' + (state.tarn ? 'Tarnmodus ausschalten' : 'Tarnmodus einschalten') + '</button>' +
        '<p class="muted small top8">Der Tarnmodus blendet Fundpunkte aus und sperrt die Koordinaten. Die Daten selbst schützt die Sperre deines iPhones.</p></section>' +
        '<section><h2>App</h2><div class="cell"><div class="label">Speicher belegt</div><div class="value-s" id="usage">…</div></div>' +
        '<div class="cell top8"><div class="label">Version</div><div class="value-s" id="ver">…</div></div>' +
        '<button class="btn wide top8" data-act="check-update">Nach Update suchen</button></section></div>';
      renderDl();
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (e) {
          var n = $('#usage'); if (n) n.textContent = fmtBytes(e.usage || 0);
        });
      } else { $('#usage').textContent = 'Unbekannt'; }
      showVersion();
    });
  }

  function areaRow(a, saved) {
    var info = saved ? (saved.failed ? saved.failed + ' Kacheln fehlen' : fmtBytes(saved.bytes) + ' · ' + fmtDate(saved.at)) : 'Noch nicht geladen';
    return '<div class="area"><span class="grow"><span class="row-t">' + esc(a.name) + '</span><span class="row-s">' + esc(info) + '</span></span>' +
      (saved ? '<button class="btn small" data-act="rm-area" data-id="' + a.id + '">Löschen</button>' : '') +
      ((!saved || saved.failed) ? '<button class="btn small dark" data-act="dl-area" data-id="' + a.id + '">Laden</button>' : '') + '</div>';
  }

  function renderDl() {
    var n = $('#dl');
    if (!n) return;
    var d = state.dl;
    if (!d) { n.innerHTML = ''; return; }
    var pct = Math.round(d.done / d.total * 100);
    n.innerHTML = '<div class="cell dl"><div class="value-s">' + esc(d.name) + ' · ' + d.done + ' von ' + d.total + ' Kacheln</div>' +
      '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
      '<div class="muted small">App offen lassen und Bildschirm nicht sperren.</div>' +
      '<button class="btn small" data-act="dl-stop">Stoppen</button></div>';
  }

  function downloadArea(area) {
    if (state.dl) { toast('Es läuft bereits ein Download.'); return; }
    if (!window.caches) { toast('Offline-Karten werden hier nicht unterstützt.'); return; }
    if (!navigator.onLine) { toast('Dafür brauchst du Internet.'); return; }
    var list = Geo.tilesFor(area, 10, 16);
    var mb = Math.round(list.length * 0.035);
    ask(area.name + ' laden?', list.length + ' Kacheln, ungefähr ' + mb + ' MB. Am besten im WLAN.', 'Laden').then(function (ok) {
      if (!ok) return;
      var d = state.dl = { name: area.name, total: list.length, done: 0, failed: 0, bytes: 0, stop: false };
      var wake = null;
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
      askPersist();
      renderDl();
      caches.open(TILE_CACHE).then(function (cache) {
        var i = 0;
        function fetchTile(url) {
          return fetch(url, { mode: 'cors' }).catch(function () { return fetch(url, { mode: 'no-cors' }); });
        }
        function worker() {
          if (d.stop || i >= list.length) return Promise.resolve();
          var url = list[i++];
          return cache.match(url).then(function (hit) {
            if (hit) return hit.type === 'opaque' ? null : hit.clone().blob().then(function (b) { d.bytes += b.size; });
            return fetchTile(url).then(function (res) {
              if (!res.ok && res.type !== 'opaque') { d.failed += 1; return null; }
              return res.clone().blob().then(function (b) {
                d.bytes += b.size;
                return cache.put(url, res);
              });
            }).catch(function () { d.failed += 1; });
          }).then(function () {
            d.done += 1;
            if (d.done % 10 === 0 || d.done === d.total) renderDl();
            return worker();
          });
        }
        return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
      }).then(function () {
        if (wake) wake.release();
        var stopped = d.stop;
        state.dl = null;
        var failed = d.failed + (stopped ? d.total - d.done : 0);
        return DB.meta('areas', []).then(function (areas) {
          areas = areas.filter(function (a) { return a.id !== area.id; });
          areas.push({ id: area.id, name: area.name, w: area.w, s: area.s, e: area.e, n: area.n, bytes: d.bytes, failed: failed, at: now() });
          return DB.setMeta('areas', areas);
        }).then(function () {
          toast(failed ? 'Unvollständig. Tippe nochmals auf Laden.' : area.name + ' ist offline verfügbar.');
          if (state.map) state.map.reloadTiles();
          route();
        });
      }).catch(function () {
        state.dl = null;
        toast('Download fehlgeschlagen. Vermutlich ist der Speicher voll.');
        route();
      });
    });
  }

  function removeArea(id) {
    return DB.meta('areas', []).then(function (areas) {
      var target = areas.filter(function (a) { return a.id === id; })[0];
      if (!target) return null;
      return ask(target.name + ' löschen?', 'Die Offline-Karte wird entfernt. Deine Klüfte bleiben.', 'Löschen', true).then(function (ok) {
        if (!ok) return null;
        var rest = areas.filter(function (a) { return a.id !== id; });
        var keep = {};
        rest.forEach(function (a) { Geo.tilesFor(a, 10, 16).forEach(function (u) { keep[u] = 1; }); });
        return caches.open(TILE_CACHE).then(function (c) {
          return Promise.all(Geo.tilesFor(target, 10, 16).map(function (u) { return keep[u] ? null : c.delete(u); }));
        }).then(function () { return DB.setMeta('areas', rest); }).then(function () {
          toast('Gelöscht');
          route();
        });
      });
    });
  }

  function makeBackup() {
    toast('Backup wird erstellt …');
    return DB.exportBlob().then(function (blob) {
      var name = 'Kluftbuch-Backup-' + today() + '.json';
      var file = new File([blob], name, { type: 'application/json' });
      var done = function () {
        return DB.setMeta('lastBackup', now()).then(function () { toast('Backup erstellt'); route(); });
      };
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: name }).then(done).catch(function (e) {
          if (e && e.name === 'AbortError') toast('Backup abgebrochen');
          else toast('Backup konnte nicht geteilt werden.');
        });
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
      return done();
    });
  }

  function restore() {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = '.json,application/json'; i.hidden = true;
    document.body.appendChild(i);
    i.onchange = function () {
      var f = i.files && i.files[0];
      i.remove();
      if (!f) return;
      f.text().then(function (t) { return DB.importData(JSON.parse(t)); }).then(function (n) {
        toast(n + ' neue Einträge eingespielt');
        route();
      }).catch(function (e) { toast(e.message || 'Backup konnte nicht gelesen werden.'); });
    };
    i.click();
  }

  function showVersion() {
    var n = $('#ver');
    if (!n) return;
    var c = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!c) { n.textContent = 'Noch nicht offline bereit'; return; }
    var ch = new MessageChannel();
    ch.port1.onmessage = function (e) {
      var m = $('#ver');
      if (m) m.textContent = e.data + (state.updateReady ? ' · Update bereit' : '');
    };
    c.postMessage('version', [ch.port2]);
  }

  function showUpdate() {
    state.updateReady = true;
    var b = $('#update-bar');
    if (b) return;
    b = document.createElement('button');
    b.id = 'update-bar';
    b.textContent = 'Neue Version bereit. Jetzt aktualisieren';
    b.onclick = function () {
      if (state.reg && state.reg.waiting) state.reg.waiting.postMessage('update-now');
    };
    document.body.appendChild(b);
  }

  function initSW() {
    if (!('serviceWorker' in navigator)) return;
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!state.updateReady || refreshing) return;
      refreshing = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      state.reg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate();
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
        });
      });
    }).catch(function () {});
  }

  /* Aktionen --------------------------------------------------------- */

  var ACT = {
    tarn: function () {
      state.tarn = !state.tarn;
      DB.setMeta('tarn', state.tarn).then(route);
    },
    'zoom-in': function () { state.map.zoomBy(1); },
    'zoom-out': function () { state.map.zoomBy(-1); },
    locate: function () {
      if (state.watchId != null) {
        navigator.geolocation.clearWatch(state.watchId);
        state.watchId = null;
        renderMap();
        return;
      }
      locate(function (p) {
        state.map.setView(p.lat, p.lon, Math.max(state.map.center().zoom, 14));
        if (navigator.geolocation.watchPosition) {
          state.watchId = navigator.geolocation.watchPosition(function (w) {
            var c = w.coords;
            state.pos = { lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude };
            state.map.setMe(c.latitude, c.longitude);
          }, function () {}, { enableHighAccuracy: true, maximumAge: 5000 });
        }
        renderMap();
      }, toast);
    },
    tour: tourDialog,
    toggle: function (n) {
      var f = n.getAttribute('data-field'), v = n.getAttribute('data-val');
      var g = GROUPS[f];
      var d = state.draft;
      if (g[2]) {
        var i = d[f].indexOf(v);
        if (i >= 0) d[f].splice(i, 1); else d[f].push(v);
      } else {
        d[f] = d[f] === v ? (f === 'status' ? v : '') : v;
      }
      refreshGroup(f, g[0], g[1], g[2], g[3]);
    },
    custom: function (n) {
      var f = n.getAttribute('data-field');
      var g = GROUPS[f];
      promptText('Eigener Eintrag', g[0]).then(function (v) {
        if (!v) return;
        if (g[2]) { if (state.draft[f].indexOf(v) < 0) state.draft[f].push(v); }
        else state.draft[f] = v;
        refreshGroup(f, g[0], g[1], g[2], g[3]);
      });
    },
    gps: runGps,
    pick: function () {
      var d = state.draft;
      state.pick = { back: location.hash };
      if (d.lat != null) state.map && state.map.setView(d.lat, d.lon, 15);
      location.hash = '#/karte';
    },
    'pick-cancel': function () {
      var b = state.pick.back;
      state.pick = null;
      location.hash = b;
    },
    'pick-ok': function () {
      var c = state.map.center();
      var d = state.draft;
      d.lat = c.lat; d.lon = c.lon; d.acc = null; d.gps = false; d.gpsErr = null;
      if (!d.gebiet) d.gebiet = Geo.areaAt(c.lat, c.lon);
      var b = state.pick.back;
      state.pick = null;
      location.hash = b;
    },
    photo: function () {
      var d = state.draft;
      pickPhotos().then(function (ids) {
        if (state.draft !== d) return;
        d.photos = d.photos.concat(ids);
        d._newMedia = (d._newMedia || []).concat(ids);
        refreshMedia();
      });
    },
    voice: function (n) {
      var d = state.draft;
      if (state.recorder) { state.recorder.stop(); return; }
      if (!window.MediaRecorder || !navigator.mediaDevices) { toast('Sprachnotizen gehen auf diesem Gerät nicht.'); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var chunks = [];
        var rec = new MediaRecorder(stream);
        state.recorder = rec;
        rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          state.recorder = null;
          n.classList.remove('rec');
          n.querySelector('span').textContent = 'Sprachnotiz';
          if (!chunks.length) return;
          saveMedia(new Blob(chunks, { type: rec.mimeType })).then(function (id) {
            if (state.draft !== d) return;
            d.voice = (d.voice || []).concat(id);
            d._newMedia = (d._newMedia || []).concat(id);
            refreshMedia();
          });
        };
        rec.start();
        n.classList.add('rec');
        n.querySelector('span').textContent = 'Stoppen';
      }).catch(function () { toast('Mikrofon ist nicht erlaubt.'); });
    },
    'rm-media': function (n) {
      var id = n.getAttribute('data-id');
      var d = state.draft;
      d.photos = (d.photos || []).filter(function (x) { return x !== id; });
      d.voice = (d.voice || []).filter(function (x) { return x !== id; });
      d._removed = (d._removed || []).concat(id);
      refreshMedia();
    },
    zoom: function (n) {
      mediaUrl(n.getAttribute('data-id')).then(function (u) {
        el.light.innerHTML = '<img src="' + u + '" alt="Foto"><button class="square" data-act="light-close" aria-label="Schliessen">' + icon('close') + '</button>';
        el.light.hidden = false;
      });
    },
    'light-close': function () { el.light.hidden = true; el.light.innerHTML = ''; },
    cancel: function () {
      var d = state.draft;
      state.draft = null;
      Promise.all((d._newMedia || []).map(function (id) { return DB.del('media', id); })).then(function () {
        if (d.id && d._route.indexOf('bearbeiten') === 0) location.replace('#/kluft/' + d.id);
        else if (d.kluftId) location.replace('#/kluft/' + d.kluftId);
        else location.replace('#/karte');
      });
    },
    'save-kluft': function () {
      var d = state.draft;
      Promise.all((d._removed || []).map(function (id) { return DB.del('media', id); })).then(saveKluft);
    },
    'save-fund': function () {
      var d = state.draft;
      Promise.all((d._removed || []).map(function (id) { return DB.del('media', id); })).then(saveFund);
    },
    'del-kluft': function () {
      var id = state.draft.id;
      DB.byKluft('funde', id).then(function (fu) {
        return ask('Kluft löschen?', fu.length ? 'Auch ' + fu.length + ' Funde und alle Fotos werden gelöscht. Das geht nicht rückgängig.' : 'Das geht nicht rückgängig.', 'Löschen', true).then(function (ok) {
          if (!ok) return null;
          return DB.byKluft('begehungen', id).then(function (be) {
            return DB.get('klufte', id).then(function (k) {
              var media = (k.photos || []).concat(k.voice || []);
              fu.forEach(function (f) { media = media.concat(f.photos || []); });
              return Promise.all([]
                .concat(media.map(function (m) { return DB.del('media', m); }))
                .concat(fu.map(function (f) { return DB.del('funde', f.id); }))
                .concat(be.map(function (b) { return DB.del('begehungen', b.id); }))
                .concat([DB.del('klufte', id)]));
            });
          }).then(function () {
            state.draft = null;
            location.replace('#/kluefte');
            toast('Gelöscht');
          });
        });
      });
    },
    'del-fund': function () {
      var d = state.draft;
      ask('Fund löschen?', 'Das geht nicht rückgängig.', 'Löschen', true).then(function (ok) {
        if (!ok) return;
        Promise.all((d.photos || []).map(function (m) { return DB.del('media', m); }).concat([DB.del('funde', d.id)])).then(function () {
          state.draft = null;
          location.replace('#/kluft/' + d.kluftId);
          toast('Gelöscht');
        });
      });
    },
    reveal: function (n) {
      if (state.tarn) { toast('Im Tarnmodus gesperrt.'); return; }
      var id = n.getAttribute('data-id');
      state.reveal[id] = !state.reveal[id];
      route();
    },
    'show-on-map': function (n) {
      if (state.tarn) { toast('Im Tarnmodus gesperrt.'); return; }
      DB.get('klufte', n.getAttribute('data-id')).then(function (k) {
        initMap();
        location.hash = '#/karte';
        el.mapView.hidden = false;
        state.map.setView(k.lat, k.lon, 15);
      });
    },
    'add-photo': function (n) {
      var id = n.getAttribute('data-id');
      pickPhotos().then(function (ids) {
        if (!ids.length) return null;
        return DB.get('klufte', id).then(function (k) {
          k.photos = (k.photos || []).concat(ids);
          k.updatedAt = now();
          return DB.put('klufte', k);
        }).then(route);
      });
    },
    'add-beg': function (n) {
      var id = n.getAttribute('data-id');
      dialog('<h2>Begehung</h2><label class="field">Datum<input id="b-d" type="date" value="' + today() + '"></label>' +
        '<label class="field">Notiz<textarea id="b-n" rows="3"></textarea></label>' +
        '<div class="row2"><button class="btn" id="m-no">Abbrechen</button><button class="btn primary" id="m-yes">Speichern</button></div>');
      $('#m-no').onclick = closeDialog;
      $('#m-yes').onclick = function () {
        var note = $('#b-n').value.trim(), d = $('#b-d').value || today();
        DB.put('begehungen', { id: DB.uid(), kluftId: id, datum: d, notiz: note || 'Begehung', updatedAt: now() }).then(function () {
          closeDialog();
          route();
        });
      };
    },
    'del-beg': function (n) {
      var id = n.getAttribute('data-id');
      ask('Eintrag löschen?', '', 'Löschen', true).then(function (ok) {
        if (ok) DB.del('begehungen', id).then(route);
      });
    },
    filter: function (n) { state.filter = n.getAttribute('data-val'); renderKluefte(); },
    'dl-area': function (n) {
      var id = n.getAttribute('data-id');
      var a = Geo.AREAS.filter(function (x) { return x.id === id; })[0];
      if (a) { downloadArea(a); return; }
      DB.meta('areas', []).then(function (areas) {
        var o = areas.filter(function (x) { return x.id === id; })[0];
        if (o) downloadArea(o);
      });
    },
    'dl-view': function () {
      var b = state.lastBounds;
      if (!b) { toast('Öffne zuerst die Karte und wähle den Ausschnitt.'); return; }
      promptText('Name des Gebiets', 'Name').then(function (name) {
        if (!name) return;
        var a = { id: 'own-' + DB.uid(), name: name, w: b.w, s: b.s, e: b.e, n: b.n };
        if (Geo.tilesFor(a, 10, 16).length > 30000) { toast('Ausschnitt ist zu gross. Zoome hinein.'); return; }
        downloadArea(a);
      });
    },
    'dl-stop': function () { if (state.dl) state.dl.stop = true; },
    'rm-area': function (n) { removeArea(n.getAttribute('data-id')); },
    backup: function () {
      makeBackup().catch(function () { toast('Backup fehlgeschlagen.'); });
    },
    restore: restore,
    'check-update': function () {
      if (!state.reg) { toast('Updates sind hier nicht verfügbar.'); return; }
      if (!navigator.onLine) { toast('Dafür brauchst du Internet.'); return; }
      state.reg.update().then(function () {
        setTimeout(function () { toast(state.updateReady ? 'Update gefunden' : 'Du hast die neuste Version.'); }, 1200);
      }).catch(function () { toast('Update-Prüfung fehlgeschlagen.'); });
    }
  };

  document.addEventListener('click', function (e) {
    var n = e.target.closest ? e.target.closest('[data-act]') : null;
    if (n && ACT[n.getAttribute('data-act')]) {
      e.preventDefault();
      ACT[n.getAttribute('data-act')](n);
    }
  });

  document.addEventListener('input', function (e) {
    var name = e.target.getAttribute && e.target.getAttribute('data-bind');
    if (name && state.draft) state.draft[name] = e.target.value;
  });

  /* Navigation ------------------------------------------------------- */

  function renderTabs(active) {
    var t = function (href, key, ic, label) {
      return '<a href="' + href + '"' + (active === key ? ' class="on" aria-current="page"' : '') + '>' + icon(ic) + '<span>' + label + '</span></a>';
    };
    el.tabs.innerHTML = t('#/karte', 'karte', 'map', 'Karte') + t('#/kluefte', 'kluefte', 'book', 'Klüfte') +
      '<a href="#/neu" class="add" aria-label="Neue Kluft erfassen">' + icon('plus', 28) + '</a>' +
      t('#/funde', 'funde', 'gem', 'Funde') + t('#/mehr', 'mehr', 'more', 'Mehr');
  }

  function route() {
    if (el.modal.hidden === false) closeDialog();
    var path = (location.hash || '#/karte').replace(/^#\/?/, '');
    var p = path.split('/');
    var r = p[0] || 'karte';
    var isMap = r === 'karte';

    if (!isMap && r !== 'neu' && r !== 'bearbeiten' && r !== 'fund' && state.draft && !state.pick) state.draft = null;
    if (!isMap && state.map) {
      var c = state.map.center();
      DB.setMeta('mapView', c);
    }

    el.mapView.hidden = !isMap;
    el.screen.hidden = isMap;
    var form = r === 'neu' || r === 'bearbeiten' || r === 'fund' || state.pick;
    el.tabs.hidden = !!form;
    document.body.classList.toggle('with-tabs', !form);
    if (!form) renderTabs(r === 'kluft' ? 'kluefte' : r);
    if (!isMap) window.scrollTo(0, 0);

    if (isMap) return renderMap();
    if (r === 'kluefte') return renderKluefte();
    if (r === 'funde') return renderFunde();
    if (r === 'mehr') return renderMehr();
    if (r === 'kluft') return renderKluft(p[1]);
    if (r === 'neu') {
      if (state.draft && state.draft._route === 'neu') { renderKluftForm(); return null; }
      return startNew().then(function (d) {
        state.draft = d;
        renderKluftForm();
        runGps();
      });
    }
    if (r === 'bearbeiten') {
      if (state.draft && state.draft._route === path) { renderKluftForm(); return null; }
      return DB.get('klufte', p[1]).then(function (k) {
        if (!k) { location.replace('#/kluefte'); return; }
        state.draft = Object.assign({}, k, {
          _route: path, _newMedia: [], photos: (k.photos || []).slice(), voice: (k.voice || []).slice(),
          anzeichen: (k.anzeichen || []).slice(), gps: k.acc != null
        });
        renderKluftForm();
      });
    }
    if (r === 'fund') {
      if (state.draft && state.draft._route === path) { renderFundForm(); return null; }
      if (p[1] === 'neu') {
        return DB.get('klufte', p[2]).then(function (k) {
          if (!k) { location.replace('#/kluefte'); return; }
          state.draft = {
            _route: path, _newMedia: [], kluftId: k.id, _kluftName: k.name || k.nr, photos: [], voice: [],
            mineralien: [], datum: today(), lage: '', zustand: '',
            nr: 'F-' + k.nr.replace('K-', '') + '-' + String((k.fundCounter || 0) + 1).padStart(2, '0')
          };
          renderFundForm();
        });
      }
      return DB.get('funde', p[1]).then(function (f) {
        if (!f) { location.replace('#/funde'); return null; }
        return DB.get('klufte', f.kluftId).then(function (k) {
          state.draft = Object.assign({}, f, {
            _route: path, _newMedia: [], _kluftName: k ? k.name || k.nr : '',
            photos: (f.photos || []).slice(), voice: (f.voice || []).slice(), mineralien: (f.mineralien || []).slice()
          });
          renderFundForm();
        });
      });
    }
    location.replace('#/karte');
    return null;
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('online', function () { if (!el.mapView.hidden) renderMap(); });
  window.addEventListener('offline', function () { if (!el.mapView.hidden) renderMap(); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !el.mapView.hidden) renderMap();
  });

  Promise.all([DB.meta('tarn', false), DB.meta('tour', null)]).then(function (r) {
    state.tarn = r[0];
    state.tour = r[1];
    initSW();
    route();
  }).catch(function () {
    el.screen.innerHTML = '<div class="page"><h1>Speicher nicht verfügbar</h1><p>Die App kann hier keine Daten speichern. Öffne sie in Safari, nicht im privaten Modus.</p></div>';
  });
})();

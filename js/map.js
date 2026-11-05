// Kleine Kartenansicht ohne Fremdbibliothek, damit alles offline mitkommt.
function TileMap(el, opts) {
  opts = opts || {};
  var MINZ = 8, MAXZ = 18, TS = 256;
  var self = this;
  var cx = Geo.lon2x(8.2), cy = Geo.lat2y(46.38), zoom = 12;
  var tiles = {};
  var pointers = {};
  var pinch = null, moved = false, lastTap = 0;
  var scheduled = false;

  var tileLayer = document.createElement('div');
  tileLayer.className = 'tile-layer';
  var markerLayer = document.createElement('div');
  markerLayer.className = 'marker-layer';
  el.appendChild(tileLayer);
  el.appendChild(markerLayer);

  var markers = [];
  var overlays = [];
  var me = null;

  function size() { return { w: el.clientWidth, h: el.clientHeight }; }
  function worldPx() { return TS * Math.pow(2, zoom); }
  function clampCenter() {
    cx = Math.min(Geo.lon2x(11.2), Math.max(Geo.lon2x(5.4), cx));
    cy = Math.min(Geo.lat2y(45.3), Math.max(Geo.lat2y(48.3), cy));
  }

  function screen(lat, lon) {
    var s = size(), w = worldPx();
    return { x: (Geo.lon2x(lon) - cx) * w + s.w / 2, y: (Geo.lat2y(lat) - cy) * w + s.h / 2 };
  }

  function makeTile(z, x, y) {
    var box = document.createElement('div');
    box.className = 'tile';
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    var depth = 0;
    img.onerror = function () {
      // Fehlt die Kachel, wird die gröbere vergrössert angezeigt.
      depth += 1;
      if (depth > 5 || z - depth < MINZ) { img.style.visibility = 'hidden'; return; }
      var f = Math.pow(2, depth);
      img.style.width = img.style.height = TS * f + 'px';
      img.style.left = -(x % f) * TS + 'px';
      img.style.top = -(y % f) * TS + 'px';
      img.src = Geo.tileUrl(z - depth, Math.floor(x / f), Math.floor(y / f));
    };
    img.src = Geo.tileUrl(z, x, y);
    box.appendChild(img);
    return box;
  }

  function overlayTile(o, z, x, y) {
    var box = document.createElement('div');
    box.className = 'tile over';
    var img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    var list = o.urls(z, x, y), i = 0;
    img.onerror = function () {
      i += 1;
      if (i < list.length) img.src = list[i];
      else img.style.visibility = 'hidden';
    };
    img.src = list[0];
    box.appendChild(img);
    return box;
  }

  function render() {
    scheduled = false;
    var s = size();
    if (!s.w || !s.h) return;
    var base = Math.max(MINZ, Math.min(MAXZ, Math.round(zoom)));
    var n = Math.pow(2, base);
    var scale = Math.pow(2, zoom - base);
    var ts = TS * scale;
    var ox = cx * n * ts - s.w / 2, oy = cy * n * ts - s.h / 2;
    var x0 = Math.floor(ox / ts), x1 = Math.floor((ox + s.w) / ts);
    var y0 = Math.floor(oy / ts), y1 = Math.floor((oy + s.h) / ts);
    var want = {};
    for (var x = x0; x <= x1; x++) {
      for (var y = y0; y <= y1; y++) {
        var key = base + '/' + x + '/' + y;
        want[key] = true;
        if (!tiles[key]) {
          tiles[key] = makeTile(base, x, y);
          tileLayer.appendChild(tiles[key]);
        }
        var tf = 'translate3d(' + (x * ts - ox) + 'px,' + (y * ts - oy) + 'px,0) scale(' + (scale * 1.004) + ')';
        tiles[key].style.transform = tf;
        for (var o = 0; o < overlays.length; o++) {
          var ov = overlays[o];
          if (!ov.tiles[key]) {
            ov.tiles[key] = overlayTile(ov, base, x, y);
            ov.el.appendChild(ov.tiles[key]);
          }
          ov.tiles[key].style.transform = tf;
        }
      }
    }
    Object.keys(tiles).forEach(function (k) {
      if (!want[k]) { tileLayer.removeChild(tiles[k]); delete tiles[k]; }
    });
    overlays.forEach(function (ov) {
      Object.keys(ov.tiles).forEach(function (k) {
        if (!want[k]) { ov.el.removeChild(ov.tiles[k]); delete ov.tiles[k]; }
      });
    });
    markers.forEach(function (m) {
      var p = screen(m.lat, m.lon);
      m.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
    });
    if (me) {
      var p = screen(me.lat, me.lon);
      me.el.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
    }
    if (opts.onMove) opts.onMove();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  }

  function zoomAt(nz, px, py) {
    nz = Math.max(MINZ, Math.min(MAXZ, nz));
    var s = size();
    var w0 = worldPx();
    var wx = cx + (px - s.w / 2) / w0, wy = cy + (py - s.h / 2) / w0;
    zoom = nz;
    var w1 = worldPx();
    cx = wx - (px - s.w / 2) / w1;
    cy = wy - (py - s.h / 2) / w1;
    clampCenter();
    schedule();
  }

  function pts() {
    return Object.keys(pointers).map(function (k) { return pointers[k]; });
  }

  el.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.pin')) return;
    el.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    moved = false;
    var p = pts();
    if (p.length === 2) {
      pinch = {
        d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        z: zoom
      };
    }
  });

  el.addEventListener('pointermove', function (e) {
    var cur = pointers[e.pointerId];
    if (!cur) return;
    var dx = e.clientX - cur.x, dy = e.clientY - cur.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
    var rect = el.getBoundingClientRect();
    if (pinch && pts().length >= 2) {
      cur.x = e.clientX; cur.y = e.clientY;
      var p = pts();
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      var mx = (p[0].x + p[1].x) / 2 - rect.left, my = (p[0].y + p[1].y) / 2 - rect.top;
      zoomAt(pinch.z + Math.log(d / pinch.d) / Math.LN2, mx, my);
      return;
    }
    cur.x = e.clientX; cur.y = e.clientY;
    var w = worldPx();
    cx -= dx / w; cy -= dy / w;
    clampCenter();
    schedule();
  });

  function up(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    if (pts().length < 2) pinch = null;
    if (!moved && e.type === 'pointerup') {
      var now = Date.now();
      if (now - lastTap < 320) {
        var r = el.getBoundingClientRect();
        zoomAt(Math.round(zoom) + 1, e.clientX - r.left, e.clientY - r.top);
        lastTap = 0;
      } else lastTap = now;
    }
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);

  el.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = el.getBoundingClientRect();
    zoomAt(zoom - e.deltaY / 300, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  this.refresh = schedule;
  this.setOverlays = function (list) {
    var ids = list.map(function (o) { return o.id; });
    overlays = overlays.filter(function (ov) {
      if (ids.indexOf(ov.id) >= 0) return true;
      ov.el.remove();
      return false;
    });
    list.forEach(function (o) {
      if (overlays.some(function (ov) { return ov.id === o.id; })) return;
      var d = document.createElement('div');
      d.className = 'tile-layer';
      d.style.opacity = o.opacity;
      el.insertBefore(d, markerLayer);
      overlays.push({ id: o.id, urls: o.urls, el: d, tiles: {} });
    });
    schedule();
  };
  this.reloadTiles = function () {
    Object.keys(tiles).forEach(function (k) { tileLayer.removeChild(tiles[k]); delete tiles[k]; });
    schedule();
  };
  this.zoomBy = function (d) {
    var s = size();
    zoomAt(Math.round(zoom) + d, s.w / 2, s.h / 2);
  };
  this.setView = function (lat, lon, z) {
    cx = Geo.lon2x(lon); cy = Geo.lat2y(lat);
    if (z != null) zoom = z;
    clampCenter();
    schedule();
  };
  this.center = function () { return { lat: Geo.y2lat(cy), lon: Geo.x2lon(cx), zoom: zoom }; };
  this.bounds = function () {
    var s = size(), w = worldPx();
    return {
      w: Geo.x2lon(cx - s.w / 2 / w), e: Geo.x2lon(cx + s.w / 2 / w),
      n: Geo.y2lat(cy - s.h / 2 / w), s: Geo.y2lat(cy + s.h / 2 / w)
    };
  };
  this.setMarkers = function (list) {
    markerLayer.querySelectorAll('.pin').forEach(function (n) { n.remove(); });
    markers = list.map(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin pin-' + m.kind;
      b.setAttribute('aria-label', m.label);
      b.innerHTML = '<span></span>';
      b.addEventListener('click', m.onClick);
      markerLayer.appendChild(b);
      return { lat: m.lat, lon: m.lon, el: b };
    });
    schedule();
  };
  this.setMe = function (lat, lon) {
    if (lat == null) {
      if (me) { me.el.remove(); me = null; }
      return;
    }
    if (!me) {
      var d = document.createElement('div');
      d.className = 'me';
      markerLayer.appendChild(d);
      me = { el: d };
    }
    me.lat = lat; me.lon = lon;
    schedule();
  };
  void self;
}

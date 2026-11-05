// Koordinaten, Kacheln und vordefinierte Gebiete.
var Geo = (function () {
  // Näherungsformeln von swisstopo, Genauigkeit rund 1 m.
  function toLV95(lat, lon) {
    var phi = (lat * 3600 - 169028.66) / 10000;
    var lam = (lon * 3600 - 26782.5) / 10000;
    var e = 2600072.37 + 211455.93 * lam - 10938.51 * lam * phi - 0.36 * lam * phi * phi - 44.54 * lam * lam * lam;
    var n = 1200147.07 + 308807.95 * phi + 3745.25 * lam * lam + 76.63 * phi * phi -
      194.56 * lam * lam * phi + 119.79 * phi * phi * phi;
    return { e: e, n: n };
  }

  function group(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

  function fmtLV95(lat, lon) {
    var c = toLV95(lat, lon);
    return group(c.e) + ' / ' + group(c.n);
  }

  function maskLV95(lat, lon) {
    return fmtLV95(lat, lon).replace(/\d{3}(?= \/|$)/g, '•••');
  }

  function distance(a, b, c, d) {
    var r = 6371000, p = Math.PI / 180;
    var x = Math.sin((c - a) * p / 2), y = Math.sin((d - b) * p / 2);
    return 2 * r * Math.asin(Math.sqrt(x * x + Math.cos(a * p) * Math.cos(c * p) * y * y));
  }

  function lon2x(lon) { return (lon + 180) / 360; }
  function lat2y(lat) {
    var s = Math.sin(lat * Math.PI / 180);
    return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  }
  function x2lon(x) { return x * 360 - 180; }
  function y2lat(y) {
    return 90 - 360 * Math.atan(Math.exp((y - 0.5) * 2 * Math.PI)) / Math.PI;
  }

  function tileUrl(z, x, y) {
    return 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/' +
      z + '/' + x + '/' + y + '.jpeg';
  }

  function tilesFor(b, zmin, zmax) {
    var out = [];
    for (var z = zmin; z <= zmax; z++) {
      var n = Math.pow(2, z);
      var x0 = Math.floor(lon2x(b.w) * n), x1 = Math.floor(lon2x(b.e) * n);
      var y0 = Math.floor(lat2y(b.n) * n), y1 = Math.floor(lat2y(b.s) * n);
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) out.push(tileUrl(z, x, y));
    }
    return out;
  }

  function wmsUrl(layer, z, x, y) {
    var R = 20037508.342789, size = 2 * R / Math.pow(2, z);
    var minx = -R + x * size, maxy = R - y * size;
    return 'https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=' + layer +
      '&STYLES=&CRS=EPSG:3857&BBOX=' + [minx, maxy - size, minx + size, maxy].join(',') +
      '&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true&LANG=de';
  }

  // Kartenebenen für den Schnellzugriff. urls liefert die Quellen der Reihe nach.
  var OVERLAYS = [
    {
      id: 'steilheit', title: 'Steilheit', opacity: 0.7,
      urls: function (z, x, y) {
        return ['https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.hangneigung-ueber_30/default/current/3857/' + z + '/' + x + '/' + y + '.png',
          wmsUrl('ch.swisstopo.hangneigung-ueber_30', z, x, y)];
      }
    },
    {
      id: 'geologie', title: 'Geologie', opacity: 0.6,
      urls: function (z, x, y) { return [wmsUrl('ch.swisstopo.geologie-geocover', z, x, y)]; }
    }
  ];

  var AREAS = [
    { id: 'binntal', name: 'Binntal', w: 8.13, s: 46.33, e: 8.30, n: 46.43 },
    { id: 'goms', name: 'Goms', w: 8.05, s: 46.40, e: 8.42, n: 46.58 },
    { id: 'grimsel', name: 'Grimsel', w: 8.22, s: 46.52, e: 8.40, n: 46.62 },
    { id: 'loetschental', name: 'Lötschental', w: 7.62, s: 46.36, e: 7.88, n: 46.48 },
    { id: 'simplon', name: 'Simplon', w: 7.95, s: 46.20, e: 8.13, n: 46.30 },
    { id: 'mattertal', name: 'Mattertal', w: 7.66, s: 45.97, e: 7.85, n: 46.16 }
  ];

  function areaAt(lat, lon) {
    for (var i = 0; i < AREAS.length; i++) {
      var a = AREAS[i];
      if (lat >= a.s && lat <= a.n && lon >= a.w && lon <= a.e) return a.name;
    }
    return '';
  }

  return {
    toLV95: toLV95, fmtLV95: fmtLV95, maskLV95: maskLV95, distance: distance,
    lon2x: lon2x, lat2y: lat2y, x2lon: x2lon, y2lat: y2lat,
    tileUrl: tileUrl, tilesFor: tilesFor, AREAS: AREAS, OVERLAYS: OVERLAYS, wmsUrl: wmsUrl, areaAt: areaAt
  };
})();

# Kluftbuch

Persönliches Kluftbuch für Strahler als offline-fähige Web-App. Reines HTML, CSS und JavaScript, ohne Build-Schritt und ohne Fremdbibliotheken.

## Daten

- Klüfte, Funde, Begehungen und Fotos liegen nur in IndexedDB auf dem Gerät.
- Offline-Karten liegen im Browser-Cache `kb-tiles-v1`.
- Dieses Projekt enthält keine persönlichen Daten.
- Die Daten hängen an der Web-Adresse. Bleibt die Adresse gleich, überstehen sie jedes Update.

## Bereitstellen

Die Dateien müssen über HTTPS erreichbar sein, zum Beispiel über GitHub Pages aus dem Hauptverzeichnis.

## Ändern

Bei jeder Änderung `VERSION` in `sw.js` erhöhen, sonst bekommt das iPhone die neue Version nicht.

## Karte

Landeskarte `ch.swisstopo.pixelkarte-farbe` über den WMTS von geo.admin.ch, Quelle swisstopo.

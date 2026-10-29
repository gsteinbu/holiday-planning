# Bayerische Schulferien pflegen

Die Schulferien stehen in **`data/schulferien-by.js`**. Die App lädt die Datei
direkt (ohne Webserver), deshalb beginnt sie mit einer Zuweisung
`window.UP_SCHULFERIEN_BY = { … };` – **alles innerhalb der geschweiften
Klammern ist reines JSON** (doppelte Anführungszeichen, keine Kommentare, kein
Komma nach dem letzten Eintrag).

## Quelle

Verbindlich sind die Ferientermine des **Bayerischen Staatsministeriums für
Unterricht und Kultus**:

- <https://www.km.bayern.de/ministerium/termine/ferientermine> (Seite
  „Ferientermine“, dort für mehrere Schuljahre im Voraus veröffentlicht)

Zum Gegenprüfen eignen sich z. B. die Übersichten der Kultusministerkonferenz
(<https://www.kmk.org/service/ferien.html>) oder Seiten wie schulferien.org,
kalenderpedia.de. Bei Abweichungen gilt immer die Seite des Kultusministeriums.

## Datenformat

```json
{
  "land": "BY",
  "quelle": "Bayerisches Staatsministerium für Unterricht und Kultus …",
  "stand": "2026-10-29",
  "schuljahre": {
    "2026/27": [
      { "name": "Herbstferien",     "start": "2026-11-02", "ende": "2026-11-06" },
      { "name": "Buß- und Bettag",  "start": "2026-11-18", "ende": "2026-11-18" },
      { "name": "Weihnachtsferien", "start": "2026-12-24", "ende": "2027-01-08" }
    ]
  }
}
```

- Gruppiert nach **Schuljahr**, so wie das Ministerium die Termine
  veröffentlicht. Ferien über den Jahreswechsel sind deshalb ein einziger Eintrag.
- `start` und `ende` sind **inklusive** und im Format `YYYY-MM-DD`.
- Angegeben werden die **Ferientage selbst**, also ohne die umliegenden
  Wochenenden. Das Ministerium nennt z. B. für die Pfingstferien „26.05.–05.06.“,
  genau das wird übernommen.
- `name` ist frei wählbar und erscheint in der Tagesinfo.
- Einzelne unterrichtsfreie Tage (z. B. Buß- und Bettag) sind normale Einträge mit
  `start` = `ende`.

## Neues Schuljahr ergänzen – Schritt für Schritt

1. Auf der Ministeriumsseite die Termine des neuen Schuljahres öffnen.
2. In `data/schulferien-by.js` unter `"schuljahre"` einen neuen Schlüssel
   anlegen, z. B. `"2029/30": [ … ]`, und jede Ferienperiode als Objekt
   eintragen. Das vorherige Schuljahr mit einem Komma abschließen.
3. Das Ministerium schreibt Daten als `TT.MM.` – in ISO umwandeln, z. B.
   „Sommerferien 29.07.–09.09.2030“ → `"start": "2030-07-29", "ende": "2030-09-09"`.
   Beim Wechsel ins nächste Kalenderjahr (Weihnachtsferien) auf das Jahr achten.
4. `"stand"` auf das heutige Datum setzen.
5. Prüfen:
   - `node tests/test.js` ausführen (oder `tests/index.html` im Browser öffnen).
     Der Test „Schulferien-Datei …“ meldet ungültiges JSON oder fehlerhafte
     Zeiträume. Die Liste der Pflichtjahre steht in `tests/test.js` und kann um
     das neue Jahr erweitert werden.
   - Die App neu laden: Für Jahre ohne Daten erscheint neben den
     Anzeigeoptionen der Hinweis „Keine Schulferien-Daten für …“.

Ist die Datei fehlerhaft, läuft die App weiter; die Fehler stehen in der
Legende („Legende“-Knopf).

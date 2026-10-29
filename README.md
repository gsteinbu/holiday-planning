# Urlaubsplaner

Jahresurlaubsplanung für zwei Personen. Reines Frontend (HTML, CSS,
JavaScript) ohne Build-Schritt und ohne externe Abhängigkeiten.

## Starten

`index.html` per Doppelklick im Browser öffnen – oder den Ordner auf einen
beliebigen statischen Webspace legen (z. B. GitHub Pages).

## Funktionen

- **Zwei Personen** mit Name, Farbe, Bundesland (Hessen/Bayern, unabhängig
  voneinander wählbar), Jahresurlaubsanspruch und – in Bayern – der Option
  „Mariä Himmelfahrt ist Feiertag“.
- **Jahreskalender** mit Jahreswechsel-Ansicht (Dez. des Vorjahres und Jan. des
  Folgejahres zuschaltbar).
  - Wochenenden grau, Feiertage rot (mit Bundesland-Kürzel, wenn sie nur für eine
    Person gelten), Schulferien Bayern als oranger Streifen oben, KiTa-Ferien als
    türkiser Streifen unten.
  - Urlaub in der Farbe der Person; Überlappung diagonal geteilt. Urlaub an
    arbeitsfreien Tagen wird blass dargestellt (zählt nicht).
- **Bedienung**: Person oben wählen. Tag antippen/anklicken = an/aus.
  Zeitraum: mit der Maus ziehen, am Handy *lange drücken und ziehen*. Beginnt
  der Zeitraum auf einem Urlaubstag, wird gelöscht, sonst eingetragen. Modus
  „KiTa“ legt per Ziehen einen KiTa-Zeitraum an, „Nur ansehen“ zeigt nur Infos.
- **Zähler** (fixiert oben): verplante Arbeitstage (ohne Wochenenden und Feiertage
  des eigenen Bundeslandes), Anspruch, Rest; Warnung bei Überschreitung.
- **KiTa-Ferien/Schließtage**: Zeitraum + Bezeichnung, bearbeitbar, löschbar.
- **Export/Import** (Knopf „Daten“):
  - CSV pro Person: `Start;Ende;Typ;Bezeichnung`, ISO-Daten, Typ `Urlaub` oder
    `KiTa-Ferien`, UTF-8 mit BOM. Aufeinanderfolgende Urlaubstage werden zu
    Zeiträumen zusammengefasst (auch über Wochenenden/Feiertage hinweg).
  - JSON mit vollständigem Stand und Versionsfeld; Import mit Validierung und
    Rückfrage vor dem Überschreiben.
- **Speicherung** im `localStorage` des Browsers, mit Erinnerung, regelmäßig
  zu exportieren.

## Annahmen

- Nur ganze Urlaubstage; der Anspruch gilt je Kalenderjahr (kein Resturlaubs-Übertrag).
- Feiertage Hessen: Neujahr, Karfreitag, Ostersonntag, Ostermontag, 1. Mai,
  Christi Himmelfahrt, Pfingstsonntag, Pfingstmontag, Fronleichnam, 3. Oktober,
  1./2. Weihnachtstag.
- Feiertage Bayern: zusätzlich Heilige Drei Könige, Allerheiligen und optional
  Mariä Himmelfahrt; ohne Ostersonntag/Pfingstsonntag. Das Augsburger
  Friedensfest wird nicht berücksichtigt. Buß- und Bettag ist kein Feiertag,
  sondern schulfrei und steht in den Schulferien-Daten.

## Struktur

| Datei | Inhalt |
|---|---|
| `js/dates.js` | Datumshelfer (ISO-Strings, UTC-Rechnung) |
| `js/holidays.js` | Osterberechnung, Feiertage HE/BY |
| `js/workdays.js` | Arbeitstage, Urlaubszähler, Zeiträume bilden |
| `js/model.js` | Datenmodell, Validierung, Änderungen |
| `js/ferien.js` | Schulferien-/KiTa-Index |
| `js/io.js` | CSV- und JSON-Export/-Import |
| `js/storage.js` | localStorage |
| `js/ui/calendar.js`, `js/ui/app.js` | Oberfläche |
| `data/schulferien-by.js` | Schulferien Bayern – Pflege siehe [docs/SCHULFERIEN.md](docs/SCHULFERIEN.md) |

## Tests

```bash
node tests/test.js
```

oder `tests/index.html` im Browser öffnen.

## JSON-Format (Version 1)

```json
{
  "format": "urlaubsplaner",
  "version": 1,
  "exportedAt": "2026-10-29T12:00:00.000Z",
  "persons": [
    { "id": "p1", "name": "Anna", "color": "#2563eb", "state": "HE",
      "entitlement": 30, "assumptionDay": false, "vacationDays": ["2026-08-03"] },
    { "id": "p2", "name": "Ben", "color": "#ea580c", "state": "BY",
      "entitlement": 30, "assumptionDay": true, "vacationDays": [] }
  ],
  "kitaClosures": [ { "id": "k1", "start": "2026-08-17", "end": "2026-08-28", "label": "Sommerschließung" } ],
  "ui": { "year": 2026, "activeMode": "p1", "showHolidays": true, "showSchool": true,
          "showKita": true, "showYearTurn": false }
}
```

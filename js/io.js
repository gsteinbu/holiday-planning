/*
 * Export/Import: CSV und ICS (Kalender) pro Person, vollständiger Stand als JSON.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var D = UP.dates;
  var W = UP.workdays;
  var M = UP.model;

  /**
   * CSV mit den Urlaubszeiträumen einer Person (ohne KiTa-Ferien).
   * Spalten: Start;Ende;Anzahl Tage;Anzahl Arbeitstage
   *  - Anzahl Tage: Kalendertage von Start bis Ende (inklusive)
   *  - Anzahl Arbeitstage: davon verbrauchte Urlaubstage (ohne Wochenenden,
   *    Feiertage und freie Wochentage der Person)
   * Daten im deutschen Format TT.MM.JJJJ.
   * Inhalt ist reines ASCII (Daten, Zahlen) - daher ohne BOM, die manche
   * Programme sonst als "ï»¿" anzeigen. Trennzeichen Semikolon, CRLF.
   */
  function personCsv(state, person) {
    var lines = ['Start;Ende;Anzahl Tage;Anzahl Arbeitstage'];
    W.toRanges(person.vacationDays, person).forEach(function (r) {
      lines.push([D.formatDE(r.start), D.formatDE(r.end), D.diffDays(r.start, r.end) + 1, W.countWorkdays(r.start, r.end, person)].join(';'));
    });
    return lines.join('\r\n') + '\r\n';
  }

  /** Text für ICS-Eigenschaften maskieren (RFC 5545, 3.3.11). */
  function icsText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /** Zeilen über 75 Byte (UTF-8) falten; Fortsetzungszeilen beginnen mit Leerzeichen. */
  function icsFold(line) {
    var out = [], cur = '', bytes = 0;
    Array.from(line).forEach(function (ch) {
      var c = ch.codePointAt(0);
      var n = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
      cur += ch;
      bytes += n;
    });
    out.push(cur);
    return out.join('\r\n ');
  }

  function icsDate(isoDay) {
    return isoDay.replace(/-/g, '');
  }

  /**
   * ICS-Kalenderdatei mit den Urlaubszeiträumen einer Person (ohne KiTa-Ferien).
   * Ein ganztägiger Termin je Zeitraum (wie in der CSV zusammengefasst);
   * DTEND ist laut RFC 5545 der Tag nach dem letzten Urlaubstag.
   * Die UID hängt nur von Person und Zeitraum ab, so dass ein erneuter Import
   * bestehende Termine aktualisiert statt sie zu verdoppeln.
   * now: Zeitpunkt für DTSTAMP (Date), Standard: jetzt.
   */
  function personIcs(state, person, now) {
    var stamp = (now || new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Urlaubsplaner//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsText('Urlaub ' + person.name)
    ];
    W.toRanges(person.vacationDays, person).forEach(function (r) {
      var days = D.diffDays(r.start, r.end) + 1;
      var work = W.countWorkdays(r.start, r.end, person);
      lines.push(
        'BEGIN:VEVENT',
        'UID:urlaub-' + person.id + '-' + icsDate(r.start) + '-' + icsDate(r.end) + '@urlaubsplaner',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + icsDate(r.start),
        'DTEND;VALUE=DATE:' + icsDate(D.addDays(r.end, 1)),
        'SUMMARY:' + icsText('Urlaub ' + person.name),
        'DESCRIPTION:' + icsText(days + (days === 1 ? ' Tag' : ' Tage') + ', davon ' + work +
          (work === 1 ? ' Arbeitstag' : ' Arbeitstage') + ' Urlaub'),
        'TRANSP:OPAQUE',
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    return lines.map(icsFold).join('\r\n') + '\r\n';
  }

  /** Vollständiger Planungsstand als JSON-Text. */
  function stateToJson(state) {
    var out = {
      format: M.FORMAT,
      version: M.VERSION,
      exportedAt: new Date().toISOString(),
      persons: state.persons,
      kitaClosures: state.kitaClosures,
      ui: state.ui
    };
    return JSON.stringify(out, null, 2);
  }

  /**
   * Liest JSON-Text ein und validiert ihn.
   * Rückgabe wie model.validateState: { ok, state } oder { ok: false, errors }.
   */
  function parseStateJson(text) {
    var data;
    if (typeof text === 'string' && text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, errors: ['Die Datei ist kein gültiges JSON (' + e.message + ').'] };
    }
    return M.validateState(data);
  }

  /** Dateiname-taugliche Variante eines Namens. */
  function safeFileName(s) {
    var map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ß': 'ss' };
    return String(s).replace(/[äöüÄÖÜß]/g, function (c) { return map[c]; })
      .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'person';
  }

  UP.io = {
    personCsv: personCsv,
    personIcs: personIcs,
    stateToJson: stateToJson,
    parseStateJson: parseStateJson,
    safeFileName: safeFileName
  };
})(typeof window !== 'undefined' ? window : globalThis);

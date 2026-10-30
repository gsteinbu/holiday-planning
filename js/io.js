/*
 * Export/Import: CSV pro Person und vollständiger Stand als JSON.
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
   * Inhalt ist reines ASCII (ISO-Daten, Zahlen) - daher ohne BOM, die manche
   * Programme sonst als "ï»¿" anzeigen. Trennzeichen Semikolon, CRLF.
   */
  function personCsv(state, person) {
    var lines = ['Start;Ende;Anzahl Tage;Anzahl Arbeitstage'];
    W.toRanges(person.vacationDays, person).forEach(function (r) {
      lines.push([r.start, r.end, D.diffDays(r.start, r.end) + 1, W.countWorkdays(r.start, r.end, person)].join(';'));
    });
    return lines.join('\r\n') + '\r\n';
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
    stateToJson: stateToJson,
    parseStateJson: parseStateJson,
    safeFileName: safeFileName
  };
})(typeof window !== 'undefined' ? window : globalThis);

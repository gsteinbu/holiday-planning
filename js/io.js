/*
 * Export/Import: CSV pro Person und vollständiger Stand als JSON.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var W = UP.workdays;
  var M = UP.model;

  var BOM = '﻿';

  function csvField(v) {
    var s = String(v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /**
   * CSV für eine Person: Urlaubszeiträume plus KiTa-Ferien.
   * Spalten: Start;Ende;Typ;Bezeichnung - ISO-Daten, UTF-8 mit BOM, CRLF.
   */
  function personCsv(state, person) {
    var rows = W.toRanges(person.vacationDays, person).map(function (r) {
      return { start: r.start, end: r.end, type: 'Urlaub', label: '' };
    });
    state.kitaClosures.forEach(function (k) {
      rows.push({ start: k.start, end: k.end, type: 'KiTa-Ferien', label: k.label });
    });
    rows.sort(function (a, b) {
      return a.start < b.start ? -1 : a.start > b.start ? 1 : a.type < b.type ? -1 : 1;
    });
    var lines = [['Start', 'Ende', 'Typ', 'Bezeichnung'].join(';')];
    rows.forEach(function (r) {
      lines.push([r.start, r.end, r.type, r.label].map(csvField).join(';'));
    });
    return BOM + lines.join('\r\n') + '\r\n';
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

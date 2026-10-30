/*
 * Datums-Hilfsfunktionen.
 * Alle Tage werden als ISO-String "YYYY-MM-DD" behandelt. Rechnungen laufen
 * über UTC, damit Sommerzeit/Zeitzonen keine Tage verschieben.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});

  var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var DAY_MS = 86400000;

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /** Baut einen ISO-String aus Jahr, Monat (1-12) und Tag. */
  function iso(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }

  /** Prüft, ob ein String ein gültiges Datum im Format YYYY-MM-DD ist. */
  function isValidISO(s) {
    if (typeof s !== 'string') return false;
    var m = ISO_RE.exec(s);
    if (!m) return false;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    return iso(y, mo, d) === s;
  }

  function toUTC(s) {
    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  }

  function fromUTC(ms) {
    var dt = new Date(ms);
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }

  function addDays(s, n) {
    return fromUTC(toUTC(s) + n * DAY_MS);
  }

  /** Wochentag: 0 = Sonntag ... 6 = Samstag. */
  function weekday(s) {
    return new Date(toUTC(s)).getUTCDay();
  }

  function isWeekend(s) {
    var w = weekday(s);
    return w === 0 || w === 6;
  }

  /** Anzahl Tage von a nach b (b - a). */
  function diffDays(a, b) {
    return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
  }

  /** Alle Tage von start bis end (inklusive), Reihenfolge egal. */
  function range(start, end) {
    if (start > end) { var t = start; start = end; end = t; }
    var out = [];
    for (var d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }

  function year(s) {
    return +s.slice(0, 4);
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  /** Heutiges Datum in lokaler Zeit als ISO. */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  var WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
    'August', 'September', 'Oktober', 'November', 'Dezember'];

  /** Deutsches Anzeigeformat, z. B. "Mo 05.10.2026". */
  function formatDE(s, withWeekday) {
    var out = s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4);
    return withWeekday ? WEEKDAYS_SHORT[weekday(s)] + ' ' + out : out;
  }

  UP.dates = {
    iso: iso,
    isValidISO: isValidISO,
    addDays: addDays,
    weekday: weekday,
    isWeekend: isWeekend,
    diffDays: diffDays,
    range: range,
    year: year,
    daysInMonth: daysInMonth,
    today: today,
    formatDE: formatDE,
    WEEKDAYS_SHORT: WEEKDAYS_SHORT,
    WEEKDAYS_LONG: WEEKDAYS_LONG,
    MONTHS: MONTHS
  };
})(typeof window !== 'undefined' ? window : globalThis);

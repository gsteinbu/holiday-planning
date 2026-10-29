/*
 * Schulferien (statische Datendatei) und KiTa-Schließzeiten als Tages-Index.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var D = UP.dates;

  /**
   * Prüft die Schulferien-Daten und baut eine Map ISO-Datum -> Ferienname.
   * Rückgabe: { map, errors, years: [Kalenderjahre mit Daten] }.
   * Fehlerhafte Einträge werden übersprungen, damit die App weiterläuft.
   */
  function indexSchoolHolidays(data) {
    var map = new Map();
    var errors = [];
    var years = new Set();
    if (!data || typeof data.schuljahre !== 'object' || data.schuljahre === null) {
      return { map: map, errors: ['Schulferien-Daten fehlen oder haben kein Feld "schuljahre".'], years: [] };
    }
    Object.keys(data.schuljahre).forEach(function (sj) {
      var list = data.schuljahre[sj];
      if (!Array.isArray(list)) { errors.push('Schuljahr ' + sj + ': keine Liste.'); return; }
      list.forEach(function (e, i) {
        if (!e || !D.isValidISO(e.start) || !D.isValidISO(e.ende) || e.start > e.ende) {
          errors.push('Schuljahr ' + sj + ', Eintrag ' + (i + 1) + ': ungültiger Zeitraum.');
          return;
        }
        D.range(e.start, e.ende).forEach(function (d) {
          map.set(d, e.name || 'Schulferien');
          years.add(D.year(d));
        });
      });
    });
    return { map: map, errors: errors, years: Array.from(years).sort() };
  }

  /** Map ISO-Datum -> KiTa-Eintrag (bei Überschneidung gewinnt der spätere). */
  function indexKita(closures) {
    var map = new Map();
    closures.forEach(function (k) {
      D.range(k.start, k.end).forEach(function (d) { map.set(d, k); });
    });
    return map;
  }

  UP.ferien = {
    indexSchoolHolidays: indexSchoolHolidays,
    indexKita: indexKita
  };
})(typeof window !== 'undefined' ? window : globalThis);

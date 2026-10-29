/*
 * Gesetzliche Feiertage für Hessen (HE) und Bayern (BY), rein berechnet.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var D = UP.dates;

  var STATES = {
    HE: 'Hessen',
    BY: 'Bayern'
  };

  /**
   * Ostersonntag nach dem gregorianischen Kalender
   * (anonymer Algorithmus nach Meeus/Jones/Butcher).
   */
  function easterSunday(y) {
    var a = y % 19;
    var b = Math.floor(y / 100);
    var c = y % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return D.iso(y, month, day);
  }

  /**
   * Liefert die Feiertage eines Jahres als Map ISO-Datum -> Name.
   * options.assumptionDay: Mariä Himmelfahrt (nur Bayern) als Feiertag zählen.
   */
  function holidaysForYear(y, state, options) {
    if (!STATES[state]) throw new Error('Unbekanntes Bundesland: ' + state);
    var opts = options || {};
    var easter = easterSunday(y);
    var list = [
      [D.iso(y, 1, 1), 'Neujahr'],
      [D.addDays(easter, -2), 'Karfreitag'],
      [D.addDays(easter, 1), 'Ostermontag'],
      [D.iso(y, 5, 1), 'Tag der Arbeit'],
      [D.addDays(easter, 39), 'Christi Himmelfahrt'],
      [D.addDays(easter, 50), 'Pfingstmontag'],
      [D.addDays(easter, 60), 'Fronleichnam'],
      [D.iso(y, 10, 3), 'Tag der Deutschen Einheit'],
      [D.iso(y, 12, 25), '1. Weihnachtstag'],
      [D.iso(y, 12, 26), '2. Weihnachtstag']
    ];
    if (state === 'HE') {
      // Im Hessischen Feiertagsgesetz ausdrücklich genannt (fallen immer auf Sonntag).
      list.push([easter, 'Ostersonntag']);
      list.push([D.addDays(easter, 49), 'Pfingstsonntag']);
    }
    if (state === 'BY') {
      list.push([D.iso(y, 1, 6), 'Heilige Drei Könige']);
      list.push([D.iso(y, 11, 1), 'Allerheiligen']);
      if (opts.assumptionDay) list.push([D.iso(y, 8, 15), 'Mariä Himmelfahrt']);
    }
    list.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
    var map = new Map();
    list.forEach(function (e) { map.set(e[0], e[1]); });
    return map;
  }

  // Kleiner Cache, da der Kalender sehr oft nachfragt.
  var cache = new Map();

  function holidaysCached(y, state, assumptionDay) {
    var key = y + '|' + state + '|' + (assumptionDay ? 1 : 0);
    var m = cache.get(key);
    if (!m) {
      m = holidaysForYear(y, state, { assumptionDay: assumptionDay });
      cache.set(key, m);
    }
    return m;
  }

  /** Feiertagsname für einen Tag oder null. */
  function holidayName(isoDay, state, options) {
    var opts = options || {};
    return holidaysCached(D.year(isoDay), state, !!opts.assumptionDay).get(isoDay) || null;
  }

  UP.holidays = {
    STATES: STATES,
    easterSunday: easterSunday,
    holidaysForYear: holidaysForYear,
    holidayName: holidayName
  };
})(typeof window !== 'undefined' ? window : globalThis);

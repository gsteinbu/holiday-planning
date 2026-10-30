/*
 * Arbeitstage und Urlaubszählung pro Person.
 * Ein Arbeitstag ist Mo-Fr, kein persönlicher freier Wochentag (z. B. jeden
 * Donnerstag) und kein Feiertag im Bundesland der Person.
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var D = UP.dates;
  var H = UP.holidays;

  function holidayOptions(person) {
    return { assumptionDay: person.state === 'BY' && !!person.assumptionDay };
  }

  /** Ist der Wochentag für die Person regelmäßig arbeitsfrei (z. B. Teilzeit)? */
  function isPersonalFreeDay(isoDay, person) {
    var free = person.freeWeekdays;
    return !!free && free.length > 0 && free.indexOf(D.weekday(isoDay)) >= 0;
  }

  /** Ist der Tag für diese Person ein Arbeitstag? */
  function isWorkday(isoDay, person) {
    if (D.isWeekend(isoDay)) return false;
    if (isPersonalFreeDay(isoDay, person)) return false;
    return !H.holidayName(isoDay, person.state, holidayOptions(person));
  }

  /** Warum ist der Tag für die Person arbeitsfrei? null = Arbeitstag. */
  function freeReason(isoDay, person) {
    if (D.isWeekend(isoDay)) return 'Wochenende';
    var hol = H.holidayName(isoDay, person.state, holidayOptions(person));
    if (hol) return 'Feiertag';
    if (isPersonalFreeDay(isoDay, person)) return 'freier ' + D.WEEKDAYS_LONG[D.weekday(isoDay)];
    return null;
  }

  /** Feiertagsname des Tages im Bundesland der Person oder null. */
  function personHoliday(isoDay, person) {
    return H.holidayName(isoDay, person.state, holidayOptions(person));
  }

  /** Arbeitstage zwischen start und end (inklusive) für eine Person. */
  function countWorkdays(start, end, person) {
    return D.range(start, end).filter(function (d) { return isWorkday(d, person); }).length;
  }

  /** Verplante Urlaubstage (nur Arbeitstage) einer Person im Kalenderjahr. */
  function usedVacationDays(person, y) {
    var prefix = y + '-';
    var n = 0;
    person.vacationDays.forEach(function (d) {
      if (d.slice(0, 5) === prefix && isWorkday(d, person)) n++;
    });
    return n;
  }

  /** Zählerstand einer Person für ein Jahr. */
  function summary(person, y) {
    var used = usedVacationDays(person, y);
    var entitlement = person.entitlement;
    return {
      used: used,
      entitlement: entitlement,
      remaining: entitlement - used,
      exceeded: used > entitlement
    };
  }

  /**
   * Fasst einzelne Tage zu Zeiträumen zusammen.
   * Lücken, die nur aus arbeitsfreien Tagen der Person bestehen (Wochenende,
   * Feiertag, freier Wochentag), werden überbrückt - so wird z. B. Mo-Fr + Mo-Fr zu einem
   * zweiwöchigen Zeitraum. Ohne person werden nur direkt aufeinanderfolgende
   * Tage zusammengefasst.
   */
  function toRanges(days, person) {
    var sorted = Array.from(new Set(days)).sort();
    var ranges = [];
    sorted.forEach(function (d) {
      var last = ranges[ranges.length - 1];
      if (last) {
        var gapStart = D.addDays(last.end, 1);
        var bridge = gapStart === d;
        if (!bridge && person) {
          bridge = true;
          for (var g = gapStart; g < d; g = D.addDays(g, 1)) {
            if (isWorkday(g, person)) { bridge = false; break; }
          }
        }
        if (bridge) { last.end = d; return; }
      }
      ranges.push({ start: d, end: d });
    });
    return ranges;
  }

  UP.workdays = {
    isWorkday: isWorkday,
    isPersonalFreeDay: isPersonalFreeDay,
    freeReason: freeReason,
    personHoliday: personHoliday,
    countWorkdays: countWorkdays,
    usedVacationDays: usedVacationDays,
    summary: summary,
    toRanges: toRanges
  };
})(typeof window !== 'undefined' ? window : globalThis);

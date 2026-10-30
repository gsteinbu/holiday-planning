/*
 * Datenmodell: Aufbau, Validierung und Änderungen am Planungsstand.
 *
 * {
 *   format: "urlaubsplaner", version: 1,
 *   persons: [ { id, name, color, state: "HE"|"BY", entitlement, assumptionDay,
 *                freeWeekdays: [1..5],          // regelmäßig freie Wochentage (1 = Mo)
 *                vacationDays: ["YYYY-MM-DD", ...] }, ... ],   // genau 2
 *
 * Versionen: 1 = ohne freeWeekdays (wird beim Laden mit [] ergänzt), 2 = aktuell.
 *   kitaClosures: [ { id, start, end, label } ],
 *   ui: { year, activeMode, showHolidays, showSchool, showKita, showYearTurn }
 * }
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var D = UP.dates;
  var H = UP.holidays;

  var FORMAT = 'urlaubsplaner';
  var VERSION = 2;
  var COLOR_RE = /^#[0-9a-fA-F]{6}$/;

  function uid() {
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaultUi() {
    return {
      year: new Date().getFullYear(),
      activeMode: 'p1',
      showHolidays: true,
      showSchool: true,
      showKita: true,
      showYearTurn: false
    };
  }

  function createDefaultState() {
    return {
      format: FORMAT,
      version: VERSION,
      persons: [
        { id: 'p1', name: 'Person 1', color: '#2563eb', state: 'HE', entitlement: 30, assumptionDay: false, freeWeekdays: [], vacationDays: [] },
        { id: 'p2', name: 'Person 2', color: '#ea580c', state: 'BY', entitlement: 30, assumptionDay: true, freeWeekdays: [], vacationDays: [] }
      ],
      kitaClosures: [],
      ui: defaultUi()
    };
  }

  function isObj(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x);
  }

  /**
   * Prüft einen (z. B. importierten) Planungsstand.
   * Rückgabe: { ok: true, state } mit bereinigten Daten oder
   *           { ok: false, errors: [verständliche Meldungen] }.
   */
  function validateState(input) {
    var errors = [];
    if (!isObj(input)) {
      return { ok: false, errors: ['Die Datei enthält kein gültiges Planungsobjekt.'] };
    }
    if (input.format !== FORMAT) {
      errors.push('Unbekanntes Dateiformat (Feld "format" muss "' + FORMAT + '" sein). Ist das eine Urlaubsplaner-Exportdatei?');
    }
    if (typeof input.version !== 'number' || !isFinite(input.version)) {
      errors.push('Feld "version" fehlt oder ist keine Zahl.');
    } else if (input.version > VERSION) {
      errors.push('Die Datei stammt aus einer neueren Version (Format-Version ' + input.version +
        '). Diese App unterstützt bis Version ' + VERSION + '.');
    } else if (input.version < 1) {
      errors.push('Ungültige Format-Version: ' + input.version + '.');
    }
    if (errors.length) return { ok: false, errors: errors };

    var persons = [];
    if (!Array.isArray(input.persons) || input.persons.length !== 2) {
      errors.push('Es müssen genau zwei Personen enthalten sein.');
    } else {
      input.persons.forEach(function (p, i) {
        var label = 'Person ' + (i + 1);
        if (!isObj(p)) { errors.push(label + ': Eintrag ist kein Objekt.'); return; }
        var name = typeof p.name === 'string' ? p.name.trim() : '';
        if (!name) errors.push(label + ': Name fehlt.');
        if (typeof p.color !== 'string' || !COLOR_RE.test(p.color)) {
          errors.push(label + ': Farbe muss im Format #RRGGBB angegeben sein.');
        }
        if (!H.STATES[p.state]) errors.push(label + ': Bundesland muss "HE" oder "BY" sein.');
        if (typeof p.entitlement !== 'number' || !Number.isInteger(p.entitlement) || p.entitlement < 0 || p.entitlement > 366) {
          errors.push(label + ': Urlaubsanspruch muss eine ganze Zahl zwischen 0 und 366 sein.');
        }
        if (p.assumptionDay !== undefined && typeof p.assumptionDay !== 'boolean') {
          errors.push(label + ': "assumptionDay" muss true oder false sein.');
        }
        var free = [];
        if (p.freeWeekdays !== undefined) {
          var okFree = Array.isArray(p.freeWeekdays) && p.freeWeekdays.every(function (w) {
            return Number.isInteger(w) && w >= 1 && w <= 5;
          });
          if (!okFree) errors.push(label + ': Freie Wochentage müssen eine Liste von Zahlen 1 (Mo) bis 5 (Fr) sein.');
          else free = Array.from(new Set(p.freeWeekdays)).sort();
        }
        var days = [];
        if (!Array.isArray(p.vacationDays)) {
          errors.push(label + ': Liste der Urlaubstage fehlt.');
        } else {
          var bad = p.vacationDays.filter(function (d) { return !D.isValidISO(d); });
          if (bad.length) {
            errors.push(label + ': ' + bad.length + ' ungültige Urlaubstage (erwartet YYYY-MM-DD), z. B. "' + String(bad[0]) + '".');
          }
          days = Array.from(new Set(p.vacationDays.filter(D.isValidISO))).sort();
        }
        persons.push({
          id: i === 0 ? 'p1' : 'p2',
          name: name,
          color: typeof p.color === 'string' ? p.color.toLowerCase() : '',
          state: p.state,
          entitlement: p.entitlement,
          assumptionDay: !!p.assumptionDay,
          freeWeekdays: free,
          vacationDays: days
        });
      });
    }

    var kita = [];
    if (input.kitaClosures !== undefined && !Array.isArray(input.kitaClosures)) {
      errors.push('"kitaClosures" muss eine Liste sein.');
    } else {
      (input.kitaClosures || []).forEach(function (k, i) {
        var label = 'KiTa-Eintrag ' + (i + 1);
        if (!isObj(k)) { errors.push(label + ': Eintrag ist kein Objekt.'); return; }
        if (!D.isValidISO(k.start) || !D.isValidISO(k.end)) {
          errors.push(label + ': Start und Ende müssen Daten im Format YYYY-MM-DD sein.');
          return;
        }
        if (k.start > k.end) errors.push(label + ': Start liegt nach dem Ende.');
        if (k.label !== undefined && typeof k.label !== 'string') errors.push(label + ': Bezeichnung muss Text sein.');
        kita.push({
          id: typeof k.id === 'string' && k.id ? k.id : uid(),
          start: k.start,
          end: k.end,
          label: (k.label || '').trim()
        });
      });
    }

    if (errors.length) return { ok: false, errors: errors };

    var ui = defaultUi();
    if (isObj(input.ui)) {
      if (Number.isInteger(input.ui.year) && input.ui.year >= 1900 && input.ui.year <= 2200) ui.year = input.ui.year;
      if (['p1', 'p2', 'view', 'kita'].indexOf(input.ui.activeMode) >= 0) ui.activeMode = input.ui.activeMode;
      ['showHolidays', 'showSchool', 'showKita', 'showYearTurn'].forEach(function (key) {
        if (typeof input.ui[key] === 'boolean') ui[key] = input.ui[key];
      });
    }

    return {
      ok: true,
      state: {
        format: FORMAT,
        version: VERSION,
        persons: persons,
        kitaClosures: sortKita(kita),
        ui: ui
      }
    };
  }

  function sortKita(list) {
    return list.slice().sort(function (a, b) {
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
    });
  }

  function findPerson(state, id) {
    return state.persons.filter(function (p) { return p.id === id; })[0] || null;
  }

  /** Setzt (add=true) oder entfernt Urlaubstage einer Person. */
  function setVacation(person, days, add) {
    var set = new Set(person.vacationDays);
    days.forEach(function (d) { if (add) set.add(d); else set.delete(d); });
    person.vacationDays = Array.from(set).sort();
  }

  function hasVacation(person, day) {
    // vacationDays ist sortiert -> binäre Suche
    var a = person.vacationDays, lo = 0, hi = a.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (a[mid] === day) return true;
      if (a[mid] < day) lo = mid + 1; else hi = mid - 1;
    }
    return false;
  }

  /** Legt einen KiTa-Zeitraum an oder aktualisiert ihn (gleiche id). */
  function upsertKita(state, entry) {
    if (!D.isValidISO(entry.start) || !D.isValidISO(entry.end)) throw new Error('Bitte gültige Daten angeben.');
    if (entry.start > entry.end) throw new Error('Das Startdatum liegt nach dem Enddatum.');
    var item = { id: entry.id || uid(), start: entry.start, end: entry.end, label: (entry.label || '').trim() };
    var list = state.kitaClosures.filter(function (k) { return k.id !== item.id; });
    list.push(item);
    state.kitaClosures = sortKita(list);
    return item;
  }

  function removeKita(state, id) {
    state.kitaClosures = state.kitaClosures.filter(function (k) { return k.id !== id; });
  }

  /** Hat der Stand Nutzdaten (Urlaub oder KiTa)? Für die Rückfrage beim Import. */
  function hasUserData(state) {
    return state.kitaClosures.length > 0 || state.persons.some(function (p) { return p.vacationDays.length > 0; });
  }

  UP.model = {
    FORMAT: FORMAT,
    VERSION: VERSION,
    uid: uid,
    createDefaultState: createDefaultState,
    validateState: validateState,
    findPerson: findPerson,
    setVacation: setVacation,
    hasVacation: hasVacation,
    upsertKita: upsertKita,
    removeKita: removeKita,
    hasUserData: hasUserData
  };
})(typeof window !== 'undefined' ? window : globalThis);

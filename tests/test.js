/*
 * Tests für Datums-, Feiertags-, Arbeitstags-, Modell- und Export-Logik.
 *   Node:    node tests/test.js
 *   Browser: tests/index.html öffnen
 */
(function (root) {
  'use strict';
  var isNode = typeof window === 'undefined';
  if (isNode) {
    ['dates', 'holidays', 'workdays', 'model', 'ferien', 'io'].forEach(function (m) {
      require('../js/' + m + '.js');
    });
    // Datendatei: alles nach dem ersten "=" muss reines JSON sein.
    var src = require('fs').readFileSync(require('path').join(__dirname, '../data/schulferien-by.js'), 'utf8');
    var body = src.slice(src.indexOf("UP_SCHULFERIEN_BY =") + 19).trim().replace(/;\s*$/, '');
    root.UP_SCHULFERIEN_BY = JSON.parse(body);
  }
  var UP = root.UP;
  var D = UP.dates, H = UP.holidays, W = UP.workdays, M = UP.model, F = UP.ferien, IO = UP.io;

  var results = [];
  function test(name, fn) {
    try { fn(); results.push({ name: name, ok: true }); }
    catch (e) { results.push({ name: name, ok: false, error: e && e.message ? e.message : String(e) }); }
  }
  function eq(actual, expected, msg) {
    var a = JSON.stringify(actual), e = JSON.stringify(expected);
    if (a !== e) throw new Error((msg ? msg + ': ' : '') + 'erwartet ' + e + ', erhalten ' + a);
  }
  function ok(cond, msg) { if (!cond) throw new Error(msg || 'Bedingung nicht erfüllt'); }

  function holidayList(y, state, opts) {
    var out = [];
    H.holidaysForYear(y, state, opts).forEach(function (name, d) { out.push(d + ' ' + name); });
    return out;
  }
  function person(state, extra) {
    var p = { id: 'p1', name: 'Test', color: '#000000', state: state, entitlement: 30, assumptionDay: false, vacationDays: [] };
    Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  // ---------- Datum ----------
  test('ISO-Validierung', function () {
    ok(D.isValidISO('2028-02-29'), 'Schalttag 2028');
    ok(!D.isValidISO('2027-02-29'), 'kein Schalttag 2027');
    ok(!D.isValidISO('2026-13-01'));
    ok(!D.isValidISO('26-01-01'));
    ok(!D.isValidISO(20260101));
  });
  test('Datumsarithmetik über Monats-/Jahreswechsel und Zeitumstellung', function () {
    eq(D.addDays('2026-12-31', 1), '2027-01-01');
    eq(D.addDays('2026-03-28', 2), '2026-03-30');
    eq(D.addDays('2026-10-24', 3), '2026-10-27');
    eq(D.range('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    eq(D.range('2027-01-02', '2026-12-31'), ['2026-12-31', '2027-01-01', '2027-01-02'], 'umgekehrte Reihenfolge');
    eq(D.weekday('2026-01-01'), 4, '1.1.2026 ist Donnerstag');
  });

  // ---------- Ostern ----------
  test('Ostersonntag bekannter Jahre', function () {
    var known = { 2019: '2019-04-21', 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05',
      2027: '2027-03-28', 2028: '2028-04-16', 2029: '2029-04-01', 2038: '2038-04-25', 2285: '2285-03-22' };
    Object.keys(known).forEach(function (y) { eq(H.easterSunday(+y), known[y], 'Ostern ' + y); });
  });

  // ---------- Feiertage ----------
  test('Feiertage Hessen 2026', function () {
    eq(holidayList(2026, 'HE'), [
      '2026-01-01 Neujahr', '2026-04-03 Karfreitag', '2026-04-05 Ostersonntag', '2026-04-06 Ostermontag',
      '2026-05-01 Tag der Arbeit', '2026-05-14 Christi Himmelfahrt', '2026-05-24 Pfingstsonntag',
      '2026-05-25 Pfingstmontag', '2026-06-04 Fronleichnam', '2026-10-03 Tag der Deutschen Einheit',
      '2026-12-25 1. Weihnachtstag', '2026-12-26 2. Weihnachtstag']);
  });
  test('Feiertage Hessen 2027', function () {
    eq(holidayList(2027, 'HE'), [
      '2027-01-01 Neujahr', '2027-03-26 Karfreitag', '2027-03-28 Ostersonntag', '2027-03-29 Ostermontag',
      '2027-05-01 Tag der Arbeit', '2027-05-06 Christi Himmelfahrt', '2027-05-16 Pfingstsonntag',
      '2027-05-17 Pfingstmontag', '2027-05-27 Fronleichnam', '2027-10-03 Tag der Deutschen Einheit',
      '2027-12-25 1. Weihnachtstag', '2027-12-26 2. Weihnachtstag']);
  });
  test('Feiertage Bayern 2026 (mit Mariä Himmelfahrt)', function () {
    eq(holidayList(2026, 'BY', { assumptionDay: true }), [
      '2026-01-01 Neujahr', '2026-01-06 Heilige Drei Könige', '2026-04-03 Karfreitag', '2026-04-06 Ostermontag',
      '2026-05-01 Tag der Arbeit', '2026-05-14 Christi Himmelfahrt', '2026-05-25 Pfingstmontag',
      '2026-06-04 Fronleichnam', '2026-08-15 Mariä Himmelfahrt', '2026-10-03 Tag der Deutschen Einheit',
      '2026-11-01 Allerheiligen', '2026-12-25 1. Weihnachtstag', '2026-12-26 2. Weihnachtstag']);
  });
  test('Feiertage Bayern 2027 (ohne Mariä Himmelfahrt)', function () {
    eq(holidayList(2027, 'BY'), [
      '2027-01-01 Neujahr', '2027-01-06 Heilige Drei Könige', '2027-03-26 Karfreitag', '2027-03-29 Ostermontag',
      '2027-05-01 Tag der Arbeit', '2027-05-06 Christi Himmelfahrt', '2027-05-17 Pfingstmontag',
      '2027-05-27 Fronleichnam', '2027-10-03 Tag der Deutschen Einheit',
      '2027-11-01 Allerheiligen', '2027-12-25 1. Weihnachtstag', '2027-12-26 2. Weihnachtstag']);
  });
  test('Mariä Himmelfahrt nur in Bayern', function () {
    eq(H.holidayName('2027-08-15', 'HE', { assumptionDay: true }), null);
    eq(H.holidayName('2027-08-15', 'BY', { assumptionDay: true }), 'Mariä Himmelfahrt');
    eq(H.holidayName('2027-08-15', 'BY', { assumptionDay: false }), null);
  });
  test('Unbekanntes Bundesland wirft Fehler', function () {
    var threw = false;
    try { H.holidaysForYear(2026, 'NW'); } catch (e) { threw = true; }
    ok(threw);
  });

  // ---------- Arbeitstage ----------
  test('Arbeitstage im Jahr 2026: Hessen 253, Bayern 252', function () {
    // 261 Mo-Fr; HE: 8 Feiertage an Werktagen (03.10. und 26.12. sind Sa);
    // BY: zusätzlich 06.01. (Di), 01.11. ist So, 15.08. ist Sa.
    eq(W.countWorkdays('2026-01-01', '2026-12-31', person('HE')), 253);
    eq(W.countWorkdays('2026-01-01', '2026-12-31', person('BY', { assumptionDay: true })), 252);
  });
  test('Arbeitstage im Jahr 2027: Mariä Himmelfahrt fällt auf Sonntag', function () {
    // 261 Mo-Fr; 1.5. Sa, 3.10. So, 25./26.12. Sa/So
    eq(W.countWorkdays('2027-01-01', '2027-12-31', person('HE')), 255);
    eq(W.countWorkdays('2027-01-01', '2027-12-31', person('BY', { assumptionDay: true })), 253);
  });
  test('Mariä Himmelfahrt 2029 (Mittwoch) zählt nur mit Option', function () {
    eq(W.isWorkday('2029-08-15', person('BY', { assumptionDay: false })), true);
    eq(W.isWorkday('2029-08-15', person('BY', { assumptionDay: true })), false);
    eq(W.isWorkday('2029-08-15', person('HE', { assumptionDay: true })), true, 'Option wirkt in HE nicht');
  });
  test('Urlaubszählung: Wochenenden und eigene Feiertage zählen nicht', function () {
    // Osterwoche 2026: Mo 30.03. bis Mo 06.04. -> Karfreitag + Ostermontag + Wochenende frei
    var days = D.range('2026-03-30', '2026-04-06');
    var he = person('HE', { vacationDays: days });
    eq(W.usedVacationDays(he, 2026), 4);
    // 06.01.2026: Feiertag in BY, Arbeitstag in HE
    eq(W.usedVacationDays(person('HE', { vacationDays: ['2026-01-06'] }), 2026), 1);
    eq(W.usedVacationDays(person('BY', { vacationDays: ['2026-01-06'] }), 2026), 0);
  });
  test('Urlaubszählung trennt nach Kalenderjahren', function () {
    var p = person('HE', { vacationDays: D.range('2026-12-28', '2027-01-08') });
    eq(W.usedVacationDays(p, 2026), 4, '28.-31.12.');
    eq(W.usedVacationDays(p, 2027), 5, '04.-08.01. (01.01. Feiertag)');
  });
  test('Zusammenfassung mit Überschreitung', function () {
    var p = person('HE', { entitlement: 3, vacationDays: D.range('2026-07-06', '2026-07-10') });
    eq(W.summary(p, 2026), { used: 5, entitlement: 3, remaining: -2, exceeded: true });
    p.entitlement = 5;
    eq(W.summary(p, 2026).exceeded, false);
  });
  test('Zeiträume bilden und arbeitsfreie Lücken überbrücken', function () {
    var p = person('HE');
    var days = D.range('2026-07-06', '2026-07-10').concat(D.range('2026-07-13', '2026-07-17'), ['2026-07-21']);
    eq(W.toRanges(days, p), [{ start: '2026-07-06', end: '2026-07-17' }, { start: '2026-07-21', end: '2026-07-21' }]);
    eq(W.toRanges(days).length, 3, 'ohne Person nur direkt angrenzende Tage');
    // Überbrückung eines Feiertags: Do 02.04. und Di 07.04.2026 (Karfreitag, WE, Ostermontag dazwischen)
    eq(W.toRanges(['2026-04-02', '2026-04-07'], p), [{ start: '2026-04-02', end: '2026-04-07' }]);
  });

  // ---------- Modell ----------
  test('Standardzustand ist gültig', function () {
    var res = M.validateState(M.createDefaultState());
    ok(res.ok, JSON.stringify(res.errors));
  });
  test('Personen dürfen dasselbe Bundesland haben', function () {
    var s = M.createDefaultState();
    s.persons[1].state = 'HE';
    ok(M.validateState(s).ok);
  });
  test('Validierung meldet verständliche Fehler', function () {
    eq(M.validateState(null).ok, false);
    eq(M.validateState([]).ok, false);
    var wrongFormat = M.validateState({ format: 'x', version: 1 });
    ok(!wrongFormat.ok && /format/.test(wrongFormat.errors[0]));
    var newer = M.validateState({ format: 'urlaubsplaner', version: 99, persons: [] });
    ok(!newer.ok && /neueren Version/.test(newer.errors[0]));
    var s = M.createDefaultState();
    s.persons[0].state = 'NW';
    s.persons[0].entitlement = 2.5;
    s.persons[1].vacationDays = ['2026-02-30'];
    s.kitaClosures = [{ start: '2026-08-10', end: '2026-08-01', label: 'x' }];
    var res = M.validateState(s);
    eq(res.ok, false);
    eq(res.errors.length, 4, res.errors.join(' | '));
  });
  test('Validierung bereinigt doppelte und unsortierte Tage', function () {
    var s = M.createDefaultState();
    s.persons[0].vacationDays = ['2026-05-02', '2026-05-01', '2026-05-02'];
    var res = M.validateState(s);
    eq(res.state.persons[0].vacationDays, ['2026-05-01', '2026-05-02']);
  });
  test('Urlaub setzen und löschen', function () {
    var p = person('HE');
    M.setVacation(p, ['2026-05-05', '2026-05-04'], true);
    eq(p.vacationDays, ['2026-05-04', '2026-05-05']);
    ok(M.hasVacation(p, '2026-05-05'));
    M.setVacation(p, ['2026-05-04'], false);
    eq(p.vacationDays, ['2026-05-05']);
    ok(!M.hasVacation(p, '2026-05-04'));
  });
  test('KiTa-Zeiträume anlegen, bearbeiten, löschen', function () {
    var s = M.createDefaultState();
    var k = M.upsertKita(s, { start: '2026-08-10', end: '2026-08-21', label: ' Sommer ' });
    eq(s.kitaClosures.length, 1);
    eq(s.kitaClosures[0].label, 'Sommer');
    M.upsertKita(s, { id: k.id, start: '2026-08-10', end: '2026-08-28', label: 'Sommer' });
    eq(s.kitaClosures.length, 1);
    eq(s.kitaClosures[0].end, '2026-08-28');
    var threw = false;
    try { M.upsertKita(s, { start: '2026-09-02', end: '2026-09-01' }); } catch (e) { threw = true; }
    ok(threw, 'Start nach Ende muss abgelehnt werden');
    M.removeKita(s, k.id);
    eq(s.kitaClosures.length, 0);
  });

  // ---------- Ferien ----------
  test('Schulferien-Datei ist vollständig für 2026 bis 2028', function () {
    var idx = F.indexSchoolHolidays(root.UP_SCHULFERIEN_BY);
    eq(idx.errors, []);
    [2026, 2027, 2028].forEach(function (y) { ok(idx.years.indexOf(y) >= 0, 'Jahr ' + y); });
    eq(idx.map.get('2026-08-03'), 'Sommerferien');
    eq(idx.map.get('2027-01-08'), 'Weihnachtsferien');
    eq(idx.map.get('2026-07-31'), undefined);
  });
  test('Schulferien-Index meldet fehlerhafte Einträge, ohne abzustürzen', function () {
    var idx = F.indexSchoolHolidays({ schuljahre: { 'x': [{ name: 'A', start: '2026-01-05', ende: '2026-01-01' }] } });
    eq(idx.errors.length, 1);
    eq(F.indexSchoolHolidays(null).map.size, 0);
  });

  // ---------- Export / Import ----------
  test('CSV-Export: BOM, Semikolon, ISO-Daten, Typen', function () {
    var s = M.createDefaultState();
    s.persons[0].vacationDays = D.range('2026-07-06', '2026-07-10');
    M.upsertKita(s, { start: '2026-08-10', end: '2026-08-21', label: 'Sommer; "groß"' });
    var csv = IO.personCsv(s, s.persons[0]);
    eq(csv.charCodeAt(0), 0xFEFF, 'BOM');
    eq(csv.slice(1).split('\r\n'), [
      'Start;Ende;Typ;Bezeichnung',
      '2026-07-06;2026-07-10;Urlaub;',
      '2026-08-10;2026-08-21;KiTa-Ferien;"Sommer; ""groß"""',
      '']);
  });
  test('JSON-Export und -Import ergeben denselben Stand', function () {
    var s = M.createDefaultState();
    s.persons[0].name = 'Anna';
    s.persons[1].vacationDays = ['2027-01-04'];
    M.upsertKita(s, { start: '2026-12-24', end: '2027-01-06', label: 'Weihnachten' });
    var json = IO.stateToJson(s);
    var parsed = JSON.parse(json);
    eq(parsed.version, M.VERSION);
    eq(parsed.format, 'urlaubsplaner');
    var res = IO.parseStateJson(json);
    ok(res.ok);
    eq(res.state.persons, s.persons);
    eq(res.state.kitaClosures, s.kitaClosures);
  });
  test('Import von kaputtem JSON liefert Fehlermeldung statt Absturz', function () {
    var res = IO.parseStateJson('{ kaputt');
    eq(res.ok, false);
    ok(/kein gültiges JSON/.test(res.errors[0]));
  });
  test('Dateinamen ohne Umlaute', function () {
    eq(IO.safeFileName('Jörg Müßig'), 'Joerg-Muessig');
  });

  // ---------- Ausgabe ----------
  var failed = results.filter(function (r) { return !r.ok; });
  if (isNode) {
    results.forEach(function (r) {
      console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name + (r.ok ? '' : '\n      ' + r.error));
    });
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' Tests bestanden');
    process.exitCode = failed.length ? 1 : 0;
  } else {
    root.UP_TEST_RESULTS = results;
  }
})(typeof window !== 'undefined' ? window : globalThis);

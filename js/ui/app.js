/*
 * App: verbindet Datenmodell, Speicher und Oberfläche.
 */
(function (root) {
  'use strict';
  var UP = root.UP;
  var D = UP.dates, H = UP.holidays, W = UP.workdays, M = UP.model;
  var F = UP.ferien, IO = UP.io, S = UP.storage;
  var esc = UP.calendar.esc;

  var EXPORT_REMINDER_DAYS = 14;

  function $(id) { return document.getElementById(id); }

  // ---------- Zustand ----------
  var loaded = S.load();
  var state = loaded.state;
  var schoolIndex = F.indexSchoolHolidays(root.UP_SCHULFERIEN_BY);
  var kitaMap = F.indexKita(state.kitaClosures);
  var selectedDay = null;

  function persist() {
    kitaMap = F.indexKita(state.kitaClosures);
    var okSave = S.save(state);
    var banner = $('storageBanner');
    if (!okSave) {
      banner.textContent = 'Achtung: Speichern im Browser ist nicht möglich (z. B. privater Modus oder Speicher voll). ' +
        'Bitte den Stand unter „Daten“ als JSON exportieren, sonst geht er verloren.';
      banner.hidden = false;
    } else if (!loaded.warning) {
      banner.hidden = true;
    }
  }

  function activePerson() {
    return M.findPerson(state, state.ui.activeMode);
  }

  // ---------- Kalender ----------
  var calendar = UP.calendar.create($('calendar'), {
    getState: function () { return state; },
    getSchoolMap: function () { return schoolIndex.map; },
    getKitaMap: function () { return kitaMap; },
    previewKind: function (day) {
      var p = activePerson();
      if (p) return M.hasVacation(p, day) ? 'del' : 'add';
      if (state.ui.activeMode === 'kita') return 'kita';
      return null;
    },
    onTap: function (day) {
      var p = activePerson();
      if (p) {
        M.setVacation(p, [day], !M.hasVacation(p, day));
        commit();
      } else if (state.ui.activeMode === 'kita') {
        var existing = kitaMap.get(day);
        openKita(existing || { start: day, end: day, label: '' });
      }
      showDayInfo(day);
    },
    onRange: function (anchor, end) {
      var p = activePerson();
      var days = D.range(anchor, end);
      if (p) {
        M.setVacation(p, days, !M.hasVacation(p, anchor));
        commit();
        var n = days.filter(function (d) { return W.isWorkday(d, p); }).length;
        toast((M.hasVacation(p, anchor) ? 'Eingetragen: ' : 'Gelöscht: ') +
          D.formatDE(days[0]) + ' – ' + D.formatDE(days[days.length - 1]) + ' (' + n + ' Arbeitstage)');
      } else if (state.ui.activeMode === 'kita') {
        openKita({ start: days[0], end: days[days.length - 1], label: '' });
      }
    }
  });

  function commit() {
    persist();
    renderAll();
  }

  // ---------- Kopfzeile / Zähler ----------
  function renderCounters() {
    var y = state.ui.year;
    $('counters').innerHTML = state.persons.map(function (p) {
      var s = W.summary(p, y);
      var active = state.ui.activeMode === p.id;
      var warn = s.exceeded
        ? '<div class="warnline">⚠ Anspruch um ' + (-s.remaining) + ' ' + (s.remaining === -1 ? 'Tag' : 'Tage') + ' überschritten</div>'
        : '';
      return '<button type="button" role="radio" aria-checked="' + active + '" class="counter' +
        (active ? ' active' : '') + (s.exceeded ? ' exceeded' : '') + '" data-mode="' + p.id + '" style="--pc:' + p.color + '" title="' + y + ': ' + s.used +
        ' Arbeitstage verplant, Jahresanspruch ' + s.entitlement + ', Rest ' + s.remaining + '">' +
        '<div class="c-head"><span class="dot"></span><span class="c-name">' + esc(p.name) + '</span>' +
        '<span class="c-state">' + p.state + '</span></div>' +
        '<div class="c-nums">' +
        '<span><b>' + s.used + '</b> von <b>' + s.entitlement + '</b> verplant</span>' +
        '<span class="rest">Rest <b>' + s.remaining + '</b></span>' +
        '</div>' + warn + '</button>';
    }).join('');
  }

  function renderModes() {
    var modes = state.persons.map(function (p) {
      return { id: p.id, label: p.name, color: p.color };
    }).concat([{ id: 'kita', label: 'KiTa' }, { id: 'view', label: 'Nur ansehen' }]);
    $('modeButtons').innerHTML = modes.map(function (m) {
      var active = state.ui.activeMode === m.id;
      return '<button type="button" role="radio" aria-checked="' + active + '" class="seg' + (active ? ' active' : '') +
        '" data-mode="' + m.id + '"' + (m.color ? ' style="--pc:' + m.color + '"' : '') + '>' +
        (m.color ? '<span class="dot"></span>' : '') + esc(m.label) + '</button>';
    }).join('');
  }

  function setMode(mode) {
    state.ui.activeMode = mode;
    var p = activePerson();
    $('calendar').style.setProperty('--active', p ? p.color : '#0d9488');
    persist();
    renderCounters();
    renderModes();
  }

  function renderToolbar() {
    ['showHolidays', 'showSchool', 'showKita', 'showYearTurn'].forEach(function (k) {
      $(k).checked = !!state.ui[k];
    });
    $('yearLabel').textContent = state.ui.year;
    var p1 = state.persons[0], p2 = state.persons[1];
    $('lgP1').style.background = p1.color;
    $('lgP2').style.background = p2.color;
    $('lgP1Name').textContent = p1.name + ' (Urlaub)';
    $('lgP2Name').textContent = p2.name + ' (Urlaub)';
    $('lgBoth').style.background = 'linear-gradient(135deg,' + p1.color + ' 50%,' + p2.color + ' 50%)';
    $('lgFree').style.background = p1.color + '59';

    var missing = schoolIndex.years.indexOf(state.ui.year) < 0;
    var hint = missing
      ? 'Für ' + state.ui.year + ' sind keine bayerischen Schulferien hinterlegt (Datei data/schulferien-by.js, Anleitung in docs/SCHULFERIEN.md).'
      : 'Schulferien-Daten: ' + (root.UP_SCHULFERIEN_BY && root.UP_SCHULFERIEN_BY.quelle || '') + '.';
    if (schoolIndex.errors.length) hint += ' Fehler in der Datendatei: ' + schoolIndex.errors.join(' ');
    $('schoolDataHint').textContent = hint;
    var tb = $('schoolMissing');
    tb.hidden = !(missing && state.ui.showSchool);
    tb.textContent = 'Keine Schulferien-Daten für ' + state.ui.year;
  }

  function renderAll() {
    var p = activePerson();
    $('calendar').style.setProperty('--active', p ? p.color : '#0d9488');
    renderCounters();
    renderModes();
    renderToolbar();
    calendar.render();
    if (selectedDay) markSelected();
    renderExportReminder();
  }

  // ---------- Tagesinfo ----------
  function markSelected() {
    var prev = document.querySelector('.day.selected');
    if (prev) prev.classList.remove('selected');
    var el = document.querySelector('.day[data-d="' + selectedDay + '"]');
    if (el) el.classList.add('selected');
  }

  function showDayInfo(day) {
    selectedDay = day;
    markSelected();
    var lines = [];
    state.persons.forEach(function (p) {
      var hol = W.personHoliday(day, p);
      var vac = M.hasVacation(p, day);
      var parts = [];
      if (hol) parts.push('Feiertag (' + H.STATES[p.state] + '): ' + esc(hol));
      if (vac) {
        var reason = W.freeReason(day, p);
        parts.push(reason ? '<b>Urlaub</b> (zählt nicht – ' + esc(reason) + ')' : '<b>Urlaub</b> (zählt)');
      } else if (!hol && W.isPersonalFreeDay(day, p) && !D.isWeekend(day)) {
        parts.push('arbeitsfrei (' + esc(W.freeReason(day, p)) + ')');
      }
      if (parts.length) {
        lines.push('<li><span class="dot" style="--pc:' + p.color + '"></span><b>' + esc(p.name) + ':</b> ' + parts.join(' · ') + '</li>');
      }
    });
    var both = state.persons.every(function (p) { return M.hasVacation(p, day); });
    if (both) lines.push('<li>👥 Beide haben Urlaub</li>');
    var school = schoolIndex.map.get(day);
    if (school) lines.push('<li><span class="lg lg-school mini"></span>Schulferien: ' + esc(school) + '</li>');
    var k = kitaMap.get(day);
    if (k) lines.push('<li><span class="lg lg-kita mini"></span>KiTa: ' + esc(k.label || 'geschlossen') + '</li>');
    if (!lines.length) lines.push('<li>' + (D.isWeekend(day) ? 'Wochenende' : 'Normaler Arbeitstag') + '</li>');
    $('dayinfoBody').innerHTML = '<div class="di-date">' + D.formatDE(day, true) + '</div><ul>' + lines.join('') + '</ul>';
    $('dayinfo').hidden = false;
  }

  $('dayinfoClose').addEventListener('click', function () {
    $('dayinfo').hidden = true;
    selectedDay = null;
    var prev = document.querySelector('.day.selected');
    if (prev) prev.classList.remove('selected');
  });

  // ---------- Toast ----------
  var toastTimer = null;
  function toast(text) {
    var el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  // ---------- Meldungsdialog ----------
  function message(title, html, opts) {
    opts = opts || {};
    var dlg = $('msgDialog');
    $('msgTitle').textContent = title;
    $('msgBody').innerHTML = html;
    $('msgCancel').hidden = !opts.confirm;
    $('msgOk').textContent = opts.okLabel || 'OK';
    $('msgOk').classList.toggle('danger', !!opts.danger);
    return new Promise(function (resolve) {
      dlg.addEventListener('close', function onClose() {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok');
      });
      dlg.returnValue = '';
      dlg.showModal();
    });
  }

  // Dialoge: Schließen-Knöpfe und Klick auf den Hintergrund
  Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (dlg) {
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
      else if (e.target.closest('[data-close]')) dlg.close();
    });
  });

  // ---------- Einstellungen ----------
  function renderSettings() {
    $('settingsBody').innerHTML = state.persons.map(function (p, i) {
      var stateOptions = Object.keys(H.STATES).map(function (k) {
        return '<option value="' + k + '"' + (p.state === k ? ' selected' : '') + '>' + H.STATES[k] + '</option>';
      }).join('');
      return '<fieldset class="person-settings" data-i="' + i + '" style="--pc:' + p.color + '">' +
        '<legend><span class="dot"></span>Person ' + (i + 1) + '</legend>' +
        '<label>Name <input type="text" data-f="name" maxlength="40" value="' + esc(p.name) + '"></label>' +
        '<label class="color-label">Farbe <input type="color" data-f="color" value="' + p.color + '"></label>' +
        '<label>Bundesland <select data-f="state">' + stateOptions + '</select></label>' +
        '<div class="free-days" role="group" aria-label="Arbeitsfreie Wochentage"><span>Regelmäßig arbeitsfrei (z. B. Teilzeit)</span><div>' +
        [1, 2, 3, 4, 5].map(function (w) {
          return '<label class="day-chip"><input type="checkbox" data-f="freeWeekday" data-w="' + w + '"' +
            (p.freeWeekdays.indexOf(w) >= 0 ? ' checked' : '') + '><span>' + D.WEEKDAYS_SHORT[w] + '</span></label>';
        }).join('') + '</div></div>' +
        '<label>Urlaubsanspruch pro Jahr (Tage) <input type="number" inputmode="numeric" min="0" max="366" step="1" data-f="entitlement" value="' + p.entitlement + '"></label>' +
        '<label class="chk"' + (p.state === 'BY' ? '' : ' hidden') + '><input type="checkbox" data-f="assumptionDay"' +
        (p.assumptionDay ? ' checked' : '') + '> Mariä Himmelfahrt (15.08.) ist Feiertag</label>' +
        '<p class="error" data-err hidden></p>' +
        '</fieldset>';
    }).join('');
  }

  function onSettingsInput(e) {
    var field = e.target.getAttribute('data-f');
    var fs = e.target.closest('fieldset');
    if (!field || !fs) return;
    var p = state.persons[+fs.getAttribute('data-i')];
    var err = fs.querySelector('[data-err]');
    err.hidden = true;
    var v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (field === 'name') {
      if (!v.trim()) { err.textContent = 'Bitte einen Namen eingeben.'; err.hidden = false; return; }
      p.name = v.trim();
    } else if (field === 'color') {
      p.color = v.toLowerCase();
      fs.style.setProperty('--pc', p.color);
    } else if (field === 'state') {
      p.state = v;
      fs.querySelector('[data-f="assumptionDay"]').closest('label').hidden = v !== 'BY';
    } else if (field === 'entitlement') {
      var n = Number(v);
      if (v === '' || !Number.isInteger(n) || n < 0 || n > 366) {
        err.textContent = 'Bitte eine ganze Zahl von 0 bis 366 eingeben.';
        err.hidden = false;
        return;
      }
      p.entitlement = n;
    } else if (field === 'assumptionDay') {
      p.assumptionDay = !!v;
    } else if (field === 'freeWeekday') {
      if (e.type !== 'change') return;
      var w = +e.target.getAttribute('data-w');
      var free = p.freeWeekdays.filter(function (x) { return x !== w; });
      if (v) free.push(w);
      p.freeWeekdays = free.sort();
    }
    commit();
    if (selectedDay) showDayInfo(selectedDay);
  }

  $('settingsBody').addEventListener('input', onSettingsInput);
  $('settingsBody').addEventListener('change', onSettingsInput);
  $('openSettings').addEventListener('click', function () {
    renderSettings();
    $('settingsDialog').showModal();
  });

  // ---------- KiTa ----------
  function renderKitaList() {
    var list = state.kitaClosures;
    $('kitaList').innerHTML = list.length ? list.map(function (k) {
      var days = D.diffDays(k.start, k.end) + 1;
      return '<li><div class="k-main"><b>' + esc(k.label || 'KiTa geschlossen') + '</b>' +
        '<span>' + D.formatDE(k.start, true) + ' – ' + D.formatDE(k.end, true) + ' (' + days + (days === 1 ? ' Tag' : ' Tage') + ')</span></div>' +
        '<div class="k-actions"><button type="button" class="btn small" data-edit="' + esc(k.id) + '">Bearbeiten</button>' +
        '<button type="button" class="btn small danger" data-del="' + esc(k.id) + '">Löschen</button></div></li>';
    }).join('') : '<li class="empty">Noch keine KiTa-Zeiträume eingetragen.</li>';
  }

  function fillKitaForm(entry) {
    $('kitaId').value = entry && entry.id || '';
    $('kitaLabel').value = entry && entry.label || '';
    $('kitaStart').value = entry && entry.start || '';
    $('kitaEnd').value = entry && entry.end || '';
    $('kitaError').hidden = true;
    var editing = !!(entry && entry.id);
    $('kitaSave').textContent = editing ? 'Änderung speichern' : 'Hinzufügen';
    $('kitaCancel').hidden = !editing;
  }

  function openKita(entry) {
    renderKitaList();
    fillKitaForm(entry || null);
    var dlg = $('kitaDialog');
    if (!dlg.open) dlg.showModal();
    if (entry && !entry.id) $('kitaLabel').focus();
  }

  $('openKita').addEventListener('click', function () { openKita(null); });
  $('kitaCancel').addEventListener('click', function () { fillKitaForm(null); });
  $('kitaForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var start = $('kitaStart').value, end = $('kitaEnd').value;
    if (start && !end) end = start;
    try {
      M.upsertKita(state, { id: $('kitaId').value || null, start: start, end: end, label: $('kitaLabel').value });
    } catch (err) {
      $('kitaError').textContent = err.message;
      $('kitaError').hidden = false;
      return;
    }
    commit();
    renderKitaList();
    fillKitaForm(null);
    toast('KiTa-Zeitraum gespeichert');
  });
  $('kitaList').addEventListener('click', function (e) {
    var edit = e.target.getAttribute('data-edit');
    var del = e.target.getAttribute('data-del');
    if (edit) {
      fillKitaForm(state.kitaClosures.filter(function (k) { return k.id === edit; })[0]);
      $('kitaLabel').focus();
    }
    if (del) {
      var k = state.kitaClosures.filter(function (x) { return x.id === del; })[0];
      if (!k) return;
      if (root.confirm('„' + (k.label || 'KiTa geschlossen') + '“ (' + D.formatDE(k.start) + ' – ' + D.formatDE(k.end) + ') löschen?')) {
        M.removeKita(state, del);
        if ($('kitaId').value === del) fillKitaForm(null);
        commit();
        renderKitaList();
      }
    }
  });

  // ---------- Export / Import ----------
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function stamp() {
    return D.today();
  }

  function exportJson() {
    download('urlaubsplanung-' + stamp() + '.json', IO.stateToJson(state), 'application/json;charset=utf-8');
    S.setLastExport(new Date().toISOString());
    renderExportReminder();
    renderDataDialog();
    toast('Planungsstand als JSON exportiert');
  }

  function renderDataDialog() {
    var last = S.getLastExport();
    var text = last
      ? 'Letzter JSON-Export in diesem Browser: ' + D.formatDE(last.slice(0, 10)) + '.'
      : 'In diesem Browser wurde noch nie ein JSON-Export erstellt.';
    $('lastExportInfo').textContent = text;
    $('lastExportFooter').textContent = text;
    $('csvButtons').innerHTML = state.persons.map(function (p, i) {
      return '<button type="button" class="btn" data-csv="' + i + '" style="--pc:' + p.color + '"><span class="dot"></span>CSV ' + esc(p.name) + '</button>';
    }).join('');
  }

  $('openData').addEventListener('click', function () {
    renderDataDialog();
    $('dataDialog').showModal();
  });
  $('exportJson').addEventListener('click', exportJson);
  $('bannerExport').addEventListener('click', exportJson);
  $('csvButtons').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-csv]');
    if (!btn) return;
    var p = state.persons[+btn.getAttribute('data-csv')];
    download('urlaub-' + IO.safeFileName(p.name) + '-' + stamp() + '.csv', IO.personCsv(state, p), 'text/csv;charset=utf-8');
  });

  $('importJson').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    var reader = new FileReader();
    reader.onerror = function () {
      message('Import fehlgeschlagen', '<p>Die Datei konnte nicht gelesen werden.</p>');
    };
    reader.onload = function () {
      var res = IO.parseStateJson(String(reader.result));
      if (!res.ok) {
        message('Import nicht möglich',
          '<p>Die Datei „' + esc(file.name) + '“ enthält Fehler. Es wurde nichts verändert.</p><ul class="errors">' +
          res.errors.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>');
        return;
      }
      var ask = M.hasUserData(state)
        ? message('Vorhandene Daten überschreiben?',
          '<p>Die aktuelle Planung in diesem Browser wird vollständig durch den Inhalt von „' + esc(file.name) +
          '“ ersetzt. Tipp: Vorher den aktuellen Stand exportieren.</p>',
          { confirm: true, okLabel: 'Überschreiben', danger: true })
        : Promise.resolve(true);
      ask.then(function (yes) {
        if (!yes) return;
        state = res.state;
        loaded.warning = null;
        commit();
        renderDataDialog();
        toast('Import erfolgreich');
      });
    };
    reader.readAsText(file, 'utf-8');
  });

  // ---------- Export-Erinnerung ----------
  function renderExportReminder() {
    var last = S.getLastExport();
    var dismissed = false;
    try { dismissed = root.sessionStorage.getItem('urlaubsplaner.reminderDismissed') === '1'; } catch (e) { /* egal */ }
    var age = last ? (Date.now() - Date.parse(last)) / 86400000 : Infinity;
    var show = !dismissed && M.hasUserData(state) && age > EXPORT_REMINDER_DAYS;
    $('exportBanner').hidden = !show;
    if (show) {
      $('exportBannerText').textContent = (last
        ? 'Letzte Sicherung vor ' + Math.floor(age) + ' Tagen.'
        : 'Deine Planung wurde noch nie gesichert.') +
        ' Der Browser-Speicher kann gelöscht werden – bitte regelmäßig als JSON exportieren.';
    }
    var lastText = last ? 'Letzter Export: ' + D.formatDE(last.slice(0, 10)) + '.' : 'Noch kein Export.';
    $('lastExportFooter').textContent = lastText;
  }

  $('bannerDismiss').addEventListener('click', function () {
    try { root.sessionStorage.setItem('urlaubsplaner.reminderDismissed', '1'); } catch (e) { /* egal */ }
    $('exportBanner').hidden = true;
  });

  // ---------- Bedienelemente ----------
  function onModeClick(e) {
    var btn = e.target.closest('[data-mode]');
    if (btn) setMode(btn.getAttribute('data-mode'));
  }
  $('counters').addEventListener('click', onModeClick);
  $('modeButtons').addEventListener('click', onModeClick);

  function changeYear(delta) {
    var y = state.ui.year + delta;
    if (y < 1900 || y > 2200) return;
    state.ui.year = y;
    commit();
  }
  $('prevYear').addEventListener('click', function () { changeYear(-1); });
  $('nextYear').addEventListener('click', function () { changeYear(1); });

  ['showHolidays', 'showSchool', 'showKita', 'showYearTurn'].forEach(function (k) {
    $(k).addEventListener('change', function (e) {
      state.ui[k] = e.target.checked;
      commit();
    });
  });

  $('toggleLegend').addEventListener('click', function () {
    var lg = $('legend');
    lg.hidden = !lg.hidden;
    this.setAttribute('aria-expanded', String(!lg.hidden));
  });

  // Hinweis bei fehlenden Schulferien-Daten in der Werkzeugleiste
  var missingEl = document.createElement('span');
  missingEl.id = 'schoolMissing';
  missingEl.className = 'pill warn';
  missingEl.hidden = true;
  document.querySelector('.toolbar').appendChild(missingEl);

  // Kopfzeilenhöhe für die Tagesinfo/Scroll-Abstände
  function syncTopbar() {
    document.documentElement.style.setProperty('--topbar-h', $('topbar').offsetHeight + 'px');
  }
  root.addEventListener('resize', syncTopbar);

  // ---------- Start ----------
  if (loaded.warning) {
    $('storageBanner').textContent = loaded.warning;
    $('storageBanner').hidden = false;
  }
  if (!root.UP_SCHULFERIEN_BY) {
    schoolIndex.errors.push('Datei data/schulferien-by.js wurde nicht geladen.');
  }
  renderAll();
  syncTopbar();
})(window);

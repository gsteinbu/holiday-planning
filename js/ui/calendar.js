/*
 * Jahreskalender: Darstellung und Bedienung (Tippen, Ziehen).
 *
 * Maus/Stift: klicken = Tag, gedrückt ziehen = Zeitraum.
 * Touch: tippen = Tag, lange drücken und ziehen = Zeitraum (normales
 * Wischen scrollt weiterhin die Seite).
 */
(function (root) {
  'use strict';
  var UP = (root.UP = root.UP || {});
  var D = UP.dates, W = UP.workdays, M = UP.model;

  var LONG_PRESS_MS = 350;
  var MOVE_TOLERANCE = 10;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Liste der anzuzeigenden Monate [{y, m}] */
  function monthsFor(ui) {
    var list = [];
    if (ui.showYearTurn) list.push({ y: ui.year - 1, m: 12, other: true });
    for (var m = 1; m <= 12; m++) list.push({ y: ui.year, m: m });
    if (ui.showYearTurn) list.push({ y: ui.year + 1, m: 1, other: true });
    return list;
  }

  /**
   * ctx: {
   *   getState(), getSchoolMap(), getKitaMap(),
   *   previewKind(anchorDay) -> 'add' | 'del' | 'kita' | null (kein Ziehen),
   *   onTap(day), onRange(anchor, end)
   * }
   */
  function create(container, ctx) {
    var cellMap = new Map();
    var previewed = [];
    var drag = null;   // { anchor, current, kind, touch }
    var touch = null;  // { day, x, y, timer }

    function render() {
      var state = ctx.getState();
      var ui = state.ui;
      var school = ctx.getSchoolMap();
      var kita = ctx.getKitaMap();
      var todayIso = D.today();
      var p1 = state.persons[0], p2 = state.persons[1];

      var html = monthsFor(ui).map(function (mo) {
        var first = D.iso(mo.y, mo.m, 1);
        var offset = (D.weekday(first) + 6) % 7; // Montag = 0
        var cells = [];
        D.WEEKDAYS_SHORT.slice(1).concat('So').forEach(function (w) {
          cells.push('<div class="wd">' + w + '</div>');
        });
        for (var i = 0; i < offset; i++) cells.push('<div class="day empty"></div>');
        var n = D.daysInMonth(mo.y, mo.m);
        for (var d = 1; d <= n; d++) {
          cells.push(dayCell(D.iso(mo.y, mo.m, d), state, p1, p2, school, kita, todayIso));
        }
        return '<section class="month' + (mo.other ? ' other-year' : '') + '">' +
          '<h3>' + D.MONTHS[mo.m - 1] + ' <span>' + mo.y + '</span></h3>' +
          '<div class="grid">' + cells.join('') + '</div></section>';
      }).join('');

      container.innerHTML = html;
      cellMap.clear();
      previewed = [];
      Array.prototype.forEach.call(container.querySelectorAll('.day[data-d]'), function (el) {
        cellMap.set(el.getAttribute('data-d'), el);
      });
    }

    function vacColor(p, day) {
      return W.isWorkday(day, p) ? p.color : p.color + '59'; // zählt nicht -> transparent
    }

    function dayCell(day, state, p1, p2, school, kita, todayIso) {
      var ui = state.ui;
      var cls = ['day'];
      if (D.isWeekend(day)) cls.push('we');
      if (day === todayIso) cls.push('today');

      var tag = '';
      if (ui.showHolidays) {
        var h1 = W.personHoliday(day, p1), h2 = W.personHoliday(day, p2);
        if (h1 && h2) cls.push('hol');
        else if (h1 || h2) {
          cls.push('hol-part');
          tag = '<span class="tag">' + (h1 ? p1.state : p2.state) + '</span>';
        }
      }
      if (ui.showSchool && school.has(day)) cls.push('school');
      if (ui.showKita && kita.has(day)) cls.push('kita');

      var v1 = M.hasVacation(p1, day), v2 = M.hasVacation(p2, day);
      var vac = '';
      if (v1 || v2) {
        var bg;
        if (v1 && v2) {
          bg = 'linear-gradient(135deg,' + vacColor(p1, day) + ' 50%,' + vacColor(p2, day) + ' 50%)';
          cls.push('both');
        } else {
          var p = v1 ? p1 : p2;
          bg = vacColor(p, day);
          if (!W.isWorkday(day, p)) cls.push('vac-free');
        }
        cls.push('has-vac');
        vac = '<span class="vac" style="background:' + bg + '"></span>';
      }
      return '<div class="' + cls.join(' ') + '" data-d="' + day + '">' + vac +
        '<span class="num">' + (+day.slice(8)) + '</span>' + tag + '</div>';
    }

    // ---------- Vorschau beim Ziehen ----------
    function clearPreview() {
      previewed.forEach(function (el) { el.classList.remove('pv-add', 'pv-del', 'pv-kita'); });
      previewed = [];
    }

    function showPreview() {
      clearPreview();
      D.range(drag.anchor, drag.current).forEach(function (d) {
        var el = cellMap.get(d);
        if (el) { el.classList.add('pv-' + drag.kind); previewed.push(el); }
      });
    }

    function startDrag(day, isTouch) {
      var kind = ctx.previewKind(day);
      if (!kind) return false;
      drag = { anchor: day, current: day, kind: kind, touch: isTouch };
      container.classList.add('dragging');
      showPreview();
      return true;
    }

    function moveDrag(day) {
      if (!drag || !day || day === drag.current) return;
      drag.current = day;
      showPreview();
    }

    function endDrag(commit) {
      if (!drag) return;
      var d = drag;
      drag = null;
      clearPreview();
      container.classList.remove('dragging');
      if (!commit) return;
      if (d.anchor === d.current) ctx.onTap(d.anchor);
      else ctx.onRange(d.anchor, d.current);
    }

    function dayAt(x, y) {
      var el = document.elementFromPoint(x, y);
      var cell = el && el.closest ? el.closest('.day[data-d]') : null;
      return cell ? cell.getAttribute('data-d') : null;
    }

    function dayOf(target) {
      var cell = target && target.closest ? target.closest('.day[data-d]') : null;
      return cell ? cell.getAttribute('data-d') : null;
    }

    // ---------- Maus / Stift ----------
    container.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      var day = dayOf(e.target);
      if (!day) return;
      e.preventDefault();
      if (!startDrag(day, false)) ctx.onTap(day);
    });
    document.addEventListener('pointermove', function (e) {
      if (drag && !drag.touch) moveDrag(dayAt(e.clientX, e.clientY));
    });
    document.addEventListener('pointerup', function () {
      if (drag && !drag.touch) endDrag(true);
    });
    document.addEventListener('pointercancel', function () {
      if (drag && !drag.touch) endDrag(false);
    });

    // ---------- Touch ----------
    function cancelTouch() {
      if (touch) { clearTimeout(touch.timer); touch = null; }
    }

    container.addEventListener('touchstart', function (e) {
      cancelTouch();
      if (drag) endDrag(false);
      if (e.touches.length !== 1) return;
      var day = dayOf(e.target);
      if (!day) return;
      var t = e.touches[0];
      touch = { day: day, x: t.clientX, y: t.clientY, timer: null };
      touch.timer = setTimeout(function () {
        if (!touch) return;
        if (startDrag(touch.day, true) && navigator.vibrate) {
          try { navigator.vibrate(15); } catch (err) { /* egal */ }
        }
      }, LONG_PRESS_MS);
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (drag && drag.touch) {
        e.preventDefault(); // Seite nicht scrollen, solange ein Zeitraum gezogen wird
        moveDrag(dayAt(t.clientX, t.clientY));
        return;
      }
      if (touch && (Math.abs(t.clientX - touch.x) > MOVE_TOLERANCE || Math.abs(t.clientY - touch.y) > MOVE_TOLERANCE)) {
        cancelTouch(); // Nutzer scrollt
      }
    }, { passive: false });

    container.addEventListener('touchend', function (e) {
      if (drag && drag.touch) {
        e.preventDefault();
        cancelTouch();
        endDrag(true);
        return;
      }
      if (touch) {
        var day = touch.day;
        cancelTouch();
        e.preventDefault(); // keine zusätzlichen Maus-Events / Doppeltipp-Zoom
        ctx.onTap(day);
      }
    }, { passive: false });

    container.addEventListener('touchcancel', function () {
      cancelTouch();
      endDrag(false);
    });

    container.addEventListener('contextmenu', function (e) {
      if (dayOf(e.target)) e.preventDefault();
    });

    return { render: render, isDragging: function () { return !!drag; } };
  }

  UP.calendar = { create: create, esc: esc };
})(typeof window !== 'undefined' ? window : globalThis);

/* Auto servis Hunter, Niš
   Bez biblioteka. Sve funkcije rade i kada JavaScript zakaže: sadržaj je u HTML-u. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     PODEŠAVANJA (jedino mesto koje treba menjati ako se promene podaci)
     Dani: 0 = nedelja, 1 = ponedeljak ... 6 = subota
     ------------------------------------------------------------------ */
  var CONFIG = {
    timeZone: 'Europe/Belgrade',
    hours: {
      0: null,
      1: ['09:00', '16:30'],
      2: ['09:00', '16:30'],
      3: ['09:00', '16:30'],
      4: ['09:00', '16:30'],
      5: ['09:00', '16:30'],
      6: ['09:00', '14:30']
    }
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------
     Godina u footeru
     ------------------------------------------------------------------ */
  var yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Mobilni meni
     ------------------------------------------------------------------ */
  var toggle = $('.nav-toggle');
  var nav = $('#nav');
  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 961px)').addEventListener('change', function () { setNav(false); });
  }

  /* ------------------------------------------------------------------
     Radno vreme: "Otvoreno sada" + isticanje današnjeg dana
     ------------------------------------------------------------------ */
  var DAY_ACC = ['u nedelju', 'u ponedeljak', 'u utorak', 'u sredu', 'u četvrtak', 'u petak', 'u subotu'];
  var WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function belgradeNow() {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: CONFIG.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return {
      day: WEEKDAY_INDEX[out.weekday],
      minutes: (parseInt(out.hour, 10) % 24) * 60 + parseInt(out.minute, 10)
    };
  }
  function toMinutes(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function updateOpenStatus() {
    var now;
    try { now = belgradeNow(); } catch (err) { return; }

    var today = CONFIG.hours[now.day];
    var state, text;

    if (today && now.minutes >= toMinutes(today[0]) && now.minutes < toMinutes(today[1])) {
      state = 'open';
      text = 'Otvoreno do ' + today[1];
    } else if (today && now.minutes < toMinutes(today[0])) {
      state = 'closed';
      text = 'Zatvoreno, otvaramo danas u ' + today[0];
    } else {
      state = 'closed';
      for (var i = 1; i <= 7; i++) {
        var d = (now.day + i) % 7;
        if (CONFIG.hours[d]) {
          text = 'Zatvoreno, otvaramo ' + (i === 1 ? 'sutra' : DAY_ACC[d]) + ' u ' + CONFIG.hours[d][0];
          break;
        }
      }
    }

    var status = $('[data-open-status]');
    var label = $('[data-open-status-text]');
    if (status && label && text) {
      status.setAttribute('data-state', state);
      label.textContent = text;
    }

    $$('.hours tr[data-day]').forEach(function (row) {
      row.setAttribute('data-today', String(parseInt(row.getAttribute('data-day'), 10) === now.day));
    });
  }
  updateOpenStatus();
  setInterval(updateOpenStatus, 60 * 1000);

  /* ------------------------------------------------------------------
     Galerija: filter po marki vozila
     ------------------------------------------------------------------ */
  var chips = $$('.chip[data-filter]');
  var figures = $$('[data-gallery] figure');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
      figures.forEach(function (fig) {
        fig.hidden = !(f === 'all' || fig.getAttribute('data-car') === f);
      });
    });
  });

  /* ------------------------------------------------------------------
     Interaktivni prikaz reglaže (nagib i konvergencija)
     ------------------------------------------------------------------ */
  var demo = $('[data-demo]');
  if (demo) {
    var MODES = {
      camber: { label: 'Nagib točka (camber)', min: -4, max: 4, step: 0.1, tol: 0.5, k: 4, dp: 1, bad: -2.6 },
      toe:    { label: 'Konvergencija (toe)',  min: -1.5, max: 1.5, step: 0.05, tol: 0.15, k: 8, dp: 2, bad: 0.9 }
    };
    var state = { mode: 'camber', camber: MODES.camber.bad, toe: MODES.toe.bad };

    var tabs = $$('[role="tab"]', demo);
    var panel = $('#demo-panel');
    var range = $('#demo-range');
    var valueEl = $('#demo-value');
    var labelEl = $('#demo-label');
    var statusEl = $('#demo-status');
    var actionBtn = $('#demo-action');
    var viewCamber = $('#view-camber');
    var viewToe = $('#view-toe');
    var wheel = $('#camber-wheel');
    var toeL = $('#toe-l');
    var toeR = $('#toe-r');

    var fmt = function (v, dp) {
      var s = Math.abs(v).toFixed(dp).replace('.', ',');
      if (Math.abs(v) < Math.pow(10, -dp) / 2) return s + '°';
      return (v < 0 ? '\u2212' : '+') + s + '°';
    };
    var inTol = function (mode) { return Math.abs(state[mode]) <= MODES[mode].tol + 1e-9; };

    function render() {
      var m = state.mode, cfg = MODES[m], v = state[m];
      if (m === 'camber') {
        wheel.setAttribute('transform', 'rotate(' + (v * cfg.k).toFixed(2) + ' 210 270)');
      } else {
        toeL.setAttribute('transform', 'rotate(' + (v * cfg.k).toFixed(2) + ' 126 90)');
        toeR.setAttribute('transform', 'rotate(' + (-v * cfg.k).toFixed(2) + ' 294 90)');
      }
      valueEl.textContent = fmt(v, cfg.dp);
      var ok = inTol(m);
      statusEl.setAttribute('data-state', ok ? 'ok' : 'bad');
      var statusText = ok ? 'U tolerancije' : 'Van tolerancije';
      if (statusEl.textContent !== statusText) statusEl.textContent = statusText;
      actionBtn.setAttribute('data-state', ok ? 'hit' : 'fix');
      if (parseFloat(range.value) !== v) range.value = v;
    }

    function setMode(mode, focusTab) {
      state.mode = mode;
      var cfg = MODES[mode];
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-mode') === mode;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) {
          panel.setAttribute('aria-labelledby', t.id);
          if (focusTab) t.focus();
        }
      });
      viewCamber.setAttribute('display', mode === 'camber' ? 'inline' : 'none');
      viewToe.setAttribute('display', mode === 'toe' ? 'inline' : 'none');
      labelEl.textContent = cfg.label;
      range.min = cfg.min; range.max = cfg.max; range.step = cfg.step;
      range.value = state[mode];
      render();
    }

    var raf = null;
    function animateTo(target, ms) {
      var m = state.mode, from = state[m];
      if (raf) cancelAnimationFrame(raf);
      if (reduceMotion || ms <= 0) { state[m] = target; render(); return; }
      var t0 = performance.now();
      (function step(now) {
        var t = Math.min(1, (now - t0) / ms);
        var e = 1 - Math.pow(1 - t, 3);
        state[m] = from + (target - from) * e;
        if (t === 1) state[m] = target;
        render();
        if (t < 1) raf = requestAnimationFrame(step); else raf = null;
      })(t0);
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setMode(t.getAttribute('data-mode'), false); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
          setMode(next.getAttribute('data-mode'), true);
        }
      });
    });

    range.addEventListener('input', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      state[state.mode] = parseFloat(range.value);
      render();
    });

    actionBtn.addEventListener('click', function () {
      var m = state.mode;
      animateTo(inTol(m) ? MODES[m].bad : 0, 900);
    });

    setMode('camber', false);

    // Jedan orkestriran trenutak: kada se prikaz prvi put pojavi, točak se sam poravna.
    if ('IntersectionObserver' in window && !reduceMotion) {
      var played = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !played) {
            played = true;
            io.disconnect();
            setTimeout(function () { if (!inTol(state.mode)) animateTo(0, 1800); }, 500);
          }
        });
      }, { threshold: 0.6 });
      io.observe(demo);
    }
  }
})();

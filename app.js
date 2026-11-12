// ▸ zu js/grundlagen.js, Abschnitt „Mitarbeit in vier Stufen (BUGS AH52)“
fillIcons(document);
tuneTextFields(document);
new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) tuneTextFields(n); })))
  .observe(document.body, { childList: true, subtree: true });
// ▸ zu js/grundlagen.js, Abschnitt „State“
let db = loadDB();
// ▸ zu js/grundlagen.js, Abschnitt „DB“
window.addEventListener('storage', onStorageChanged);
// ▸ zu js/grundlagen.js, Abschnitt „Navigation“
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
// ▸ zu js/stundenplan.js, Abschnitt „Tagesansicht (Handy, BUGS H2)“
// Ansicht Woche · Tag · Klasse (AD4): nur auf diesem Gerät gemerkt (Bequemlichkeit, kein db)
let timetableMode = (() => { try { const m = localStorage.getItem('tt_mode'); return ['week', 'day', 'class'].includes(m) ? m : 'week'; } catch (e) { return 'week'; } })();
// ▸ zu js/stundenplan.js, Abschnitt „Stundenplan drucken / PDF“
setInterval(refreshTimetableClock, 20000);
document.addEventListener('visibilitychange', refreshTimetableClock);
(function initTimetableGestures() {
  const wrapper = document.querySelector('.timetable-grid-wrapper');
  if (!wrapper) return;
  let start = null;
  wrapper.addEventListener('touchstart', e => {
    start = e.touches && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  wrapper.addEventListener('touchend', e => {
    const t = e.changedTouches && e.changedTouches[0];
    if (start && t) handleTimetableSwipe(t.clientX - start.x, t.clientY - start.y);
    start = null;
  });
  // Größe/Drehung geändert: neu zeichnen (Kachelgröße, Wechsel Tag ↔ Woche)
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const view = document.getElementById('view-timetable');
      if (view && view.classList.contains('active')) renderTimetable();
    }, 150);
  });
})();
// ▸ zu js/klassen.js, Abschnitt „„auffällig“ ruhig, rot nur Neues (AH24 f)“
// Tippen daneben (Druck auch daneben begonnen, Regel 27) oder Escape schließt
document.addEventListener('click', e => {
  const p = document.getElementById('watch-pop');
  if (!p || p.contains(e.target) || pressStartedIn(p)) return;
  if (watchPop && watchPop.btn.contains(e.target)) return;
  closeWatchPop();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('watch-pop')) closeWatchPop(); });
// ▸ zu js/noten.js, Abschnitt „Halbjahre (Y7)“
if (window.matchMedia) {
  const mq = window.matchMedia('(max-width: 600px)');
  if (mq.addEventListener) mq.addEventListener('change', updatePeriodSelect);
}
// ▸ zu js/noten.js, Abschnitt „Beamer-Schutz in der Klassenansicht (AH24 c, Regel 16/67)“
// Fenster gedreht, Seitenleiste eingeklappt, Split View: Spalten neu einpassen
if (typeof ResizeObserver === 'function') new ResizeObserver(fitOverviewColumns).observe(document.getElementById('overview-content'));
document.getElementById('overview-content').addEventListener('pointerdown', e => {
  if (e.target.closest('input, button')) overviewFocusTarget = overviewCellPos(e.target);
}, true);
// ▸ zu js/noten.js, Abschnitt „Inline Updates“
// Tippen daneben (Druck auch daneben begonnen, Regel 27) oder Escape schließt ohne Änderung
document.addEventListener('click', e => {
  const p = document.getElementById('ov-part-pop');
  if (!p || p.contains(e.target) || pressStartedIn(p)) return;
  if (ovPartPicker && ovPartPicker.btn.contains(e.target)) return;   // der Tipp, der sie gerade geöffnet hat
  closeParticipationPicker();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('ov-part-pop')) closeParticipationPicker(); });
// Am Laptop: auf einem Feld F/E/Z (Fehlzeiten) bzw. X (HA) tippen setzt direkt, Entf/Rücktaste/„-“ entfernt
document.getElementById('overview-content').addEventListener('keydown', e => {
  const b = e.target.closest && e.target.closest('.ov-cycle-btn');
  if (!b) return;
  const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const del = k === 'Delete' || k === 'Backspace' || k === '-';
  const { sid, date } = b.dataset;
  if (b.dataset.kind === 'att' && (['F', 'E', 'Z'].includes(k) || del)) {
    e.preventDefault();
    overviewFocusTarget = overviewCellPos(b);
    if (del) setAttendanceWithUndo(sid, date, ''); else updateInlineAttendance(sid, date, k);
  } else if (b.dataset.kind === 'hw' && (k === 'X' || del)) {
    e.preventDefault();
    overviewFocusTarget = overviewCellPos(b);
    const has = (db.students[currentOverviewGroupId]?.find(x => x.id === sid)?.homework || []).some(h => h.date === date && (h.note || '') === (b.dataset.label || ''));
    if (k === 'X' ? !has : has) cycleInlineHomework(sid, date, b.dataset.label || '');
  }
});

// Enter/Return in den Tabellen: Eingabe übernehmen und eine Zeile tiefer in dieselbe Spalte,
// Shift+Enter eine Zeile höher. So trägt man eine Klassenarbeit für die ganze Klasse ein (BUGS L6).
// Das onchange zeichnet die Tabelle neu; die Position wird deshalb vorher gemerkt.
document.getElementById('overview-content').addEventListener('keydown', e => {
  const input = e.target;
  if (e.key === 'Tab' && input.tagName === 'INPUT') {
    // Nächste/vorige Eingabezelle selbst ansteuern: Die Tabelle wird beim Übernehmen neu gezeichnet (BUGS Q3)
    const inputs = [...document.querySelectorAll('#overview-content tbody input')];
    const target = inputs[inputs.indexOf(input) + (e.shiftKey ? -1 : 1)];
    if (!target) return; // am Rand: normales Tab verlässt die Tabelle
    e.preventDefault();
    overviewFocusTarget = overviewCellPos(target);
    if (input.value !== input.defaultValue) { overviewCommittedInput = input; input.dispatchEvent(new Event('change', { bubbles: true })); }
    if (overviewFocusTarget) { overviewFocusTarget = null; target.focus(); target.select(); } // nichts neu gezeichnet
    return;
  }
  if (e.key !== 'Enter' || input.tagName !== 'INPUT') return;
  const row = input.closest('tr'), cell = input.closest('td');
  const rows = [...document.querySelectorAll('#overview-content tbody tr')];
  const r = rows.indexOf(row), c = [...row.children].indexOf(cell);
  if (r === -1 || c === -1) return;
  e.preventDefault();
  if (input.value !== input.defaultValue) { overviewCommittedInput = input; input.dispatchEvent(new Event('change', { bubbles: true })); }
  const targetRow = document.querySelectorAll('#overview-content tbody tr')[r + (e.shiftKey ? -1 : 1)];
  const target = targetRow && targetRow.children[c] && targetRow.children[c].querySelector('input');
  if (target) { target.focus(); target.select(); }
  else if (document.activeElement === input) input.blur();
});
// ▸ zu js/klassen.js, Abschnitt „Zähler-Erklärung in der Schülerliste (BUGS H11)“

// Tippen woanders, Scrollen oder Escape schließt die Erklärung
document.addEventListener('click', hideCounterHint);
document.addEventListener('scroll', hideCounterHint, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCounterHint(); });
document.querySelector('#student-hints-veil button')?.addEventListener('click', () => setStudentHintsVeiled(false));
// ▸ zu js/grundlagen.js, Abschnitt „Leiste anordnen und Schnellzugriff (AH48)“
applyInitialSidebar();

let currentThemeAccent = savedThemeAccent();
// Standard-Design: hell, Hintergrund Eisblau, Akzent Tinte (02.11.2026). „Standard“ wird nie gespeichert
// (themeBg fehlt), damit alle, die nie selbst gewählt haben, einen neuen Standard bekommen (BUGS S6, AE4).
const DEFAULT_THEME = { bg: '#bfdbfe', card: '#dbeafe', mode: 'light' };
// „Automatisch (wie Gerät)“ (X6): Eisblau, bei dunkel eingestelltem Gerät Tiefsee. Gespeichert als themeAuto (ohne themeBg),
// damit ältere App-Versionen einfach den Standard zeigen. Im Formular steht dafür currentThemeBg = 'auto'.
const AUTO_DARK_THEME = { bg: '#0f172a', card: '#1e293b', mode: 'dark' };
function systemPrefersDark() {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
let currentThemeBg = savedThemeAuto() ? 'auto' : savedThemeBg();   // '' = Standard
let currentThemeMode = savedThemeMode();
let currentThemeCard = currentThemeBg && currentThemeBg !== 'auto' ? (db.settings.themeCard || '') : '';

function selectThemeAccent(el, color) {
  document.querySelectorAll('.settings-swatch-accent').forEach(s => s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  currentThemeAccent = color;
  applyThemePreview();
}

function selectThemeBg(el, bg, mode, card) {
  document.querySelectorAll('.settings-swatch-bg').forEach(s => s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  currentThemeBg = bg;
  currentThemeMode = mode;
  currentThemeCard = card;
  applyThemePreview();
}

// ─── Settings ─────────────────────────────────────────────────────────────
function openSettings() {
  fillSettingsForm();
  showSettingsPane('general');
  openModal('modal-settings');
}
// Einstellungen in Bereichen (AH38): Das Fenster behält seine Größe, nur der Inhalt rechts wechselt
function showSettingsPane(name) {
  document.querySelectorAll('#modal-settings .set-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === name));
  document.querySelectorAll('#modal-settings .set-rail button').forEach(b => {
    const on = b.dataset.pane === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'true' : 'false');
    if (on) b.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });   // Handy: Menüleiste scrollt mit
  });
  const body = document.querySelector('#modal-settings .set-body');
  if (body) body.scrollTop = 0;
}
document.querySelectorAll('#modal-settings .set-rail button').forEach(b => b.addEventListener('click', () => showSettingsPane(b.dataset.pane)));
// Felder und Blöcke-Entwurf aus db füllen – beim Öffnen und nach einer Cloud-Übernahme (BUGS P2)
function fillSettingsForm() {
  renderPlanTemplatesSetting();   // Vorlagen der Planung (Y6)
  refreshMergeRestoreButton();   // AH4
  document.getElementById('settings-teacher-name').value = db.settings.teacherName||'';
  document.getElementById('settings-school').value       = db.settings.school||'';
  document.getElementById('settings-seating-buffer').value = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
  document.getElementById('settings-seating-start').checked = db.settings.seatingStartInLesson !== false;
  document.getElementById('settings-half-year').value = isDateStr(db.settings.halfYearEnd) ? db.settings.halfYearEnd : '';
  document.getElementById('settings-year-end').value = isDateStr(db.settings.schoolYearEnd) ? db.settings.schoolYearEnd : '';
  document.getElementById('settings-seating-autoswitch').checked = db.settings.seatingAutoSwitch !== false;
  document.getElementById('settings-class-grades-protect').checked = db.settings.classGradesProtect !== false;
  document.getElementById('settings-warn-absences').value = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  document.getElementById('settings-warn-homework').value = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  document.getElementById('settings-warn-grade').value = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  document.getElementById('settings-warn-points').value = db.settings.warnPoints !== undefined ? db.settings.warnPoints : 5;
  document.getElementById('settings-studentapp-on').checked = studentAppOn();   // AJ1
  document.getElementById('settings-studentapp-name').value = (db.settings.studentApp && db.settings.studentApp.name) || '';
  document.getElementById('settings-studentapp-name').placeholder = db.settings.teacherName || 'z. B. Frau Müller';
  renderSettingsStudentApps();
  
  loadThemeSelection();
  document.getElementById('settings-sort-order').value = db.settings.studentSortOrder || 'firstName';
  const v = appVersion();
  document.getElementById('app-version-label').textContent = v ? `Version ${v}` : '';
  blocksDraft = getBlocks().map(b => ({ ...b }));
  renderBlocksEditor();
  holidaysDraft = (Array.isArray(db.settings.holidays) ? db.settings.holidays : []).filter(h => h && typeof h === 'object').map(h => ({ ...h }));
  renderHolidaysEditor();
  fillNavEditor();   // Leiste (AH48)
  document.getElementById('settings-federal-state').value = FEDERAL_STATES[db.settings.federalState] ? db.settings.federalState : '';
  settingsSnapshot = settingsFormState(); // Vergleich für „Änderungen verwerfen?“ (BUGS S7)
}

// Datenschutzhinweise (BUGS Y1): nur Text, liegt über den Einstellungen
function openCloudHelp() { openModal('modal-cloud-help'); }   // Z5
function openPrivacyNotice() {
  openModal('modal-privacy');
}

// Versionsnummer aus index.html (app.js?v=N, gesetzt von npm run bump), für Rückfragen bei Problemen (BUGS I22)
function appVersion() {
  const src = [...document.querySelectorAll('script[src]')].map(e => e.getAttribute('src')).find(x => /(^|\/)(app|start)\.js\?v=/.test(x));   // seit Y12: js/start.js
  const m = src && src.match(/v=(\d+)/);
  return m ? m[1] : '';
}

// Eigene Akzentfarbe (W5): Schrift darauf nach Helligkeit (weiß oder dunkel), Akzent als Schrift so weit abgedunkelt
// (hell) bzw. aufgehellt (dunkel), bis er auf Karte und Hintergrund 4,5:1 erreicht, Nebenfarben aus dem Akzent.
// Muss zum Kopf-Skript in index.html passen (tests/akzentfarbe.test.js vergleicht beide).
const ACCENT_VARS = ['--accent', '--accent-hover', '--accent-glow', '--accent-soft', '--on-accent', '--text-accent', '--border-active'];
function accentThemeVars(accent, mode, surfaces) {
  const rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); return m ? [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)) : null; };
  const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (c, t, f) => c.map((x, i) => Math.round(x + (t[i] - x) * f));
  const hex = c => '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
  const a = rgb(accent);
  if (!a) return null;
  const dark = mode === 'dark';
  const ink = [20, 23, 31], white = [255, 255, 255], toward = dark ? white : [0, 0, 0];
  const bgs = (surfaces || []).map(rgb).filter(Boolean);
  if (!bgs.length) bgs.push(dark ? [33, 30, 25] : [255, 253, 248]);
  let text = a;
  for (let f = 0.05; f <= 1 && bgs.some(b => ratio(text, b) < 4.5); f += 0.05) text = mix(a, toward, f);
  const alpha = x => 'rgba(' + a.join(',') + ',' + x + ')';
  return {
    '--accent': hex(a),
    '--accent-hover': hex(mix(a, dark ? white : [0, 0, 0], 0.15)),
    '--accent-glow': alpha(dark ? 0.30 : 0.18),
    '--accent-soft': alpha(dark ? 0.15 : 0.09),
    '--on-accent': ratio(white, a) >= ratio(ink, a) ? '#ffffff' : hex(ink),
    '--text-accent': hex(text),
    '--border-active': alpha(dark ? 0.5 : 0.4),
  };
}
function applyThemePreview() {
  const radEl = document.getElementById('settings-radius');

  const accent = document.querySelector('.settings-swatch-accent.selected') ? currentThemeAccent : savedThemeAccent();
  const picked = !!document.querySelector('.settings-swatch-bg.selected');
  const chosen = picked ? currentThemeBg : (savedThemeAuto() ? 'auto' : savedThemeBg());   // '' = Standard (Eisblau)
  const auto = chosen === 'auto' ? (systemPrefersDark() ? AUTO_DARK_THEME : DEFAULT_THEME) : null;
  const chosenBg = auto ? '' : chosen;
  const bg = auto ? auto.bg : (chosenBg || DEFAULT_THEME.bg);
  const card = auto ? auto.card : chosenBg ? (picked ? currentThemeCard : (db.settings.themeCard || null)) : DEFAULT_THEME.card;
  document.documentElement.setAttribute('data-theme', auto ? auto.mode : picked ? currentThemeMode : savedThemeMode());
  let rad = radEl ? parseInt(radEl.value) : db.settings.themeRadius;
  if (rad > 12) rad = 12; // Clamp max radius to 12

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta && bg) themeMeta.setAttribute('content', bg);   // Statusleiste der installierten App
  if (bg) { 
    document.documentElement.style.setProperty('--bg-primary', bg); 
    document.documentElement.style.setProperty('--sidebar-bg', bg);
    document.documentElement.style.setProperty('--bg-secondary', bg);
  }
  else { 
    document.documentElement.style.removeProperty('--bg-primary'); 
    document.documentElement.style.removeProperty('--sidebar-bg');
    document.documentElement.style.removeProperty('--bg-secondary');
  }
  
  if (card) { 
    document.documentElement.style.setProperty('--bg-card', card); 
    document.documentElement.style.setProperty('--bg-elevated', card);
  }
  else { 
    document.documentElement.style.removeProperty('--bg-card'); 
    document.documentElement.style.removeProperty('--bg-elevated');
  }
  
  const mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const accentVars = accent ? accentThemeVars(accent, mode, [bg, card]) : null;
  ACCENT_VARS.forEach(v => { if (accentVars) document.documentElement.style.setProperty(v, accentVars[v]); else document.documentElement.style.removeProperty(v); });

  if (rad !== undefined && rad !== null && !isNaN(rad)) {
    document.documentElement.style.setProperty('--radius-sm', Math.max(0, rad - 2) + 'px');
    document.documentElement.style.setProperty('--radius-md', rad + 'px');
    document.documentElement.style.setProperty('--radius-lg', (rad + 4) + 'px');
    document.documentElement.style.setProperty('--radius-xl', (rad + 10) + 'px');
  } else {
    document.documentElement.style.removeProperty('--radius-sm');
    document.documentElement.style.removeProperty('--radius-md');
    document.documentElement.style.removeProperty('--radius-lg');
    document.documentElement.style.removeProperty('--radius-xl');
  }

  // Safari SVG currentColor repaint hack
  setTimeout(() => {
    document.querySelectorAll('svg').forEach(svg => {
      const old = svg.style.display;
      svg.style.display = 'none';
      svg.offsetHeight; // force reflow
      svg.style.display = old;
    });
  }, 10);
}

// Arbeitskopie der Blöcke im Einstellungsfenster; erst „Speichern“ übernimmt sie in db
let blocksDraft = [];

// ─── Ferien & freie Tage (BUGS Y8): Arbeitskopie wie bei den Blöcken, gilt erst mit „Speichern“ ─────
let holidaysDraft = [];
function renderHolidaysEditor() {
  const editor = document.getElementById('holidays-editor');
  editor.innerHTML = holidaysDraft.length ? '' : '<div class="holiday-empty">Noch keine Ferien eingetragen.</div>';
  holidaysDraft.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'holiday-row';
    row.innerHTML = `
      <input class="holiday-name-input form-input" type="text" value="${escHtml(h.label || '')}" placeholder="z. B. Herbstferien" aria-label="Name" data-hidx="${i}" data-field="label" />
      <input class="holiday-from-input block-time-input" type="date" value="${escHtml(h.from || '')}" aria-label="von" data-hidx="${i}" data-field="from" />
      <span class="block-sep">–</span>
      <input class="holiday-until-input block-time-input" type="date" value="${escHtml(h.until || '')}" aria-label="bis" data-hidx="${i}" data-field="until" />
      <button class="block-delete-btn" aria-label="Zeitraum löschen">✕</button>`;
    row.querySelector('.block-delete-btn').onclick = () => deleteHolidayRow(i);
    // „bis“ leer: auf „von“ setzen (einzelner Feiertag), sonst steht das Feld leer im Fehlerhinweis
    row.querySelector('.holiday-from-input').addEventListener('change', e => {
      const until = row.querySelector('.holiday-until-input');
      if (!until.value || until.value < e.target.value) until.value = e.target.value;
    });
    editor.appendChild(row);
  });
}
function readHolidaysEditor() {
  document.querySelectorAll('#holidays-editor [data-hidx]').forEach(input => {
    const h = holidaysDraft[parseInt(input.dataset.hidx, 10)];
    if (!h) return;
    // Geladenen Eintrag selbst geändert: gilt ab jetzt als eigener, „Ferien laden“ ersetzt ihn nicht mehr (Y8c)
    if (h.source && (h[input.dataset.field] || '') !== input.value) delete h.source;
    h[input.dataset.field] = input.value;
  });
}
function addHolidayRow() {
  readHolidaysEditor();
  holidaysDraft.push({ id: uid(), label: '', from: '', until: '' });
  renderHolidaysEditor();
  const inputs = document.querySelectorAll('#holidays-editor .holiday-name-input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}
function deleteHolidayRow(idx) {
  readHolidaysEditor();
  holidaysDraft.splice(idx, 1);
  renderHolidaysEditor();
}
// ─── Ferien laden (Y8c): OpenHolidays API, nur auf Knopfdruck ───────────────
// Kein Hintergrund-Abruf: offline nutzbar, Ferien stehen Jahre vorher fest, und der Anbieter erfährt IP + Bundesland
// nur, wenn man es will (Datenschutzhinweise). Ergebnis landet in der Arbeitskopie, gilt erst mit „Speichern“.
const HOLIDAY_API = 'https://openholidaysapi.org';
const FEDERAL_STATES = {
  'DE-BW': 'Baden-Württemberg', 'DE-BY': 'Bayern', 'DE-BE': 'Berlin', 'DE-BB': 'Brandenburg', 'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg', 'DE-HE': 'Hessen', 'DE-MV': 'Mecklenburg-Vorpommern', 'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen', 'DE-RP': 'Rheinland-Pfalz', 'DE-SL': 'Saarland', 'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt', 'DE-SH': 'Schleswig-Holstein', 'DE-TH': 'Thüringen',
};
async function fetchHolidayList(path, query) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${HOLIDAY_API}/${path}?${query}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Unerwartetes Format');
    return data;
  } finally {
    clearTimeout(timer);
  }
}
// Einträge der API → { label, from, until }; nur fürs ganze Land (örtliche wie das Augsburger Friedensfest nicht)
function holidaysFromApi(list, state) {
  const isDate = v => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v);
  return list.filter(x => x && isDate(x.startDate) && isDate(x.endDate) && x.endDate >= x.startDate
      && (x.nationwide || (Array.isArray(x.subdivisions) && x.subdivisions.some(sd => sd && sd.code === state))))
    .map(x => {
      const names = Array.isArray(x.name) ? x.name : [];
      const name = (names.find(n => n && n.language === 'DE') || names[0] || {}).text;
      return { label: String(name || 'Ferien').trim().slice(0, 60) || 'Ferien', from: x.startDate, until: x.endDate };
    });
}
async function loadHolidaysFromApi() {
  const state = document.getElementById('settings-federal-state').value;
  if (!FEDERAL_STATES[state]) { showToast('Bitte zuerst das Bundesland wählen', 'error'); return; }
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // Schuljahr beginnt im August
  const query = `countryIsoCode=DE&subdivisionCode=${encodeURIComponent(state)}&languageIsoCode=DE&validFrom=${y}-08-01&validTo=${y + 2}-07-31`;
  const btn = document.getElementById('btn-load-holidays');
  btn.disabled = true;
  let school, pub;
  try {
    [school, pub] = await Promise.all([fetchHolidayList('SchoolHolidays', query), fetchHolidayList('PublicHolidays', query)]);
  } catch (e) {
    showToast('Ferien konnten nicht geladen werden (keine Verbindung?). Du kannst sie weiter von Hand eintragen.', 'error');
    return;
  } finally {
    btn.disabled = false;
  }
  const settingsOpen = () => !document.getElementById('modal-settings').classList.contains('hidden');
  if (!settingsOpen()) return;
  readHolidaysEditor();
  const schoolEntries = holidaysFromApi(school, state);
  const covered = (c, list) => list.some(h => h.from && h.until && h.from <= c.from && c.until <= h.until);
  // Feiertage: nur an Schultagen und nicht schon in Ferien (Weihnachten liegt in den Weihnachtsferien)
  const publicEntries = holidaysFromApi(pub, state).filter(c => {
    const wd = parseDate(c.from).getDay();
    return wd !== 0 && wd !== 6 && !covered(c, schoolEntries);
  });
  // Das ganze laufende Schuljahr (ab 1. August), auch schon vergangene Ferien: Sie zählen für frühere Wochen,
  // die Klassen-Ansicht und die Stundenzahlen (Rückmeldung 02.11.: Herbstferien fehlten nach dem Laden im November).
  const schoolYearStart = `${y}-08-01`;
  // Früher geladene Einträge (Herkunft `source`) dieses Schuljahrs werden ersetzt – auch nach einem Bundesland-Wechsel.
  // Ältere Schuljahre bleiben stehen. Eigene Einträge nie still.
  const imported = holidaysDraft.filter(h => h.source && h.until >= schoolYearStart);
  const manual = holidaysDraft.filter(h => !h.source);
  // Von eigenen Einträgen abgedeckte nicht doppelt
  const fresh = [...schoolEntries, ...publicEntries].filter(c => c.until >= schoolYearStart && !covered(c, manual))
    .sort((a, b) => a.from.localeCompare(b.from));
  const same = (a, b) => a.from === b.from && a.until === b.until && a.label === b.label;
  const unchanged = fresh.length === imported.length && fresh.every(c => imported.some(h => same(h, c)));
  if (!fresh.length || unchanged) { showToast(`Alle Ferien für ${FEDERAL_STATES[state]} sind schon eingetragen`); return; }
  const overlapping = manual.filter(m => m.from && m.until && fresh.some(c => c.from <= m.until && m.from <= c.until));
  const range = c => c.from === c.until ? formatDateLong(c.from) : `${formatDateLong(c.from)} – ${formatDateLong(c.until)}`;
  const sources = [...new Set(imported.map(h => FEDERAL_STATES[h.source] || h.source))].join(', ');
  const n = fresh.length, word = n === 1 ? 'Eintrag' : 'Einträge';
  const choice = await askChoice(`Ferien für ${FEDERAL_STATES[state]}`,
    `Gefunden für dieses und nächstes Schuljahr:\n${fresh.map(c => `• ${c.label}: ${range(c)}`).join('\n')}\n\n`
    + (imported.length ? `Das ersetzt ${imported.length} früher geladene ${imported.length === 1 ? 'Eintrag' : 'Einträge'} (${sources}).\n\n` : '')
    + (overlapping.length ? `Überschneidet sich mit deinen eigenen Einträgen:\n${overlapping.map(m => `• ${(m.label || '').trim() || 'Ferien'}: ${range(m)}`).join('\n')}\n\n` : '')
    + 'Bewegliche Ferientage deiner Schule kennt die Quelle nicht. Die bitte selbst ergänzen.',
    overlapping.length
      ? [{ label: `Übernehmen und meine ersetzen`, value: 'replace', primary: true }, { label: 'Übernehmen, meine behalten', value: 'keep' }]
      : [{ label: `${n} ${word} übernehmen`, value: 'take', primary: true }]);
  if (!['take', 'replace', 'keep'].includes(choice) || !settingsOpen()) return;
  readHolidaysEditor();
  const drop = new Set([...imported, ...(choice === 'replace' ? overlapping : [])]);
  holidaysDraft = holidaysDraft.filter(h => !drop.has(h));
  fresh.forEach(c => holidaysDraft.push({ id: uid(), ...c, source: state }));
  holidaysDraft.sort((a, b) => (a.from || '9999').localeCompare(b.from || '9999'));
  renderHolidaysEditor();
  showToast(`${n} ${word} eingetragen. Mit „Speichern“ übernehmen`);
}

// HA/Tests ab heute, deren Termin in die Ferien fällt: wären nirgends fällig (Regel 52). Erste Stunde danach anbieten.
async function offerMoveHolidayItems() {
  const dbAtStart = db;
  const today = formatDate(new Date());
  const moves = [];
  Object.entries(db.lessonData).forEach(([key, data]) => {
    const slotId = key.slice(0, key.lastIndexOf('_'));
    if (!db.lessonSlots.some(s => s.id === slotId)) return;
    [['hwItems', data.hwEnabled], ['testItems', data.testEnabled]].forEach(([list, enabled]) => {
      if (!enabled) return;
      (data[list] || []).forEach(item => {
        if (!item.targetDate || item.targetDate < today || !holidayAt(item.targetDate)) return;
        // Liegt dort eine einmalige Stunde der Klasse, ist der Eintrag dort richtig fällig (R6)
        const slot = db.lessonSlots.find(s => s.id === slotId);
        const ids = new Set(relatedSlots(slot).map(s => s.id));
        if (lessonsOnDate(item.targetDate).some(l => ids.has(l.slot.id) && !l.ausfall)) return;
        const next = findUpcomingLessonDates(slotId, item.targetDate, 1)[0];
        moves.push({ item, next });
      });
    });
  });
  if (!moves.length) return;
  const lines = moves.map(({ item, next }) => `• ${item.text} (fällig ${formatDateLong(item.targetDate)}) → `
    + (next ? formatDateLong(next.dateStr) : 'keine Stunde gefunden'));
  const choice = await askChoice('Hausaufgaben und Tests in den Ferien',
    `Diese Einträge wären in den Ferien fällig:\n${lines.join('\n')}\n\nAuf die erste Stunde nach den Ferien verschieben?`,
    [{ label: 'Verschieben', value: 'move', primary: true }, { label: 'So lassen', value: 'keep' }]);
  if (choice !== 'move' || db !== dbAtStart) return; // inzwischen andere Daten (Regel 32)
  moves.forEach(({ item, next }) => { if (next) item.targetDate = next.dateStr; });
  saveDB();
  renderScheduleViews();
}

function renderBlocksEditor() {
  const editor = document.getElementById('blocks-editor');
  editor.innerHTML = '';
  blocksDraft.forEach((b, i) => {
    const row = document.createElement('div');
    row.className = 'block-row';
    row.innerHTML = `
      <input class="block-name-input" type="text" value="${escHtml(b.label)}" placeholder="Name" data-bidx="${i}" data-field="label" />
      <input class="block-time-input" type="time" value="${escHtml(b.start)}" data-bidx="${i}" data-field="start" />
      <span class="block-sep">–</span>
      <input class="block-time-input" type="time" value="${escHtml(b.end)}" data-bidx="${i}" data-field="end" />
      <button class="block-delete-btn" aria-label="Block löschen" onclick="deleteBlockRow(${i})">✕</button>
    `;
    editor.appendChild(row);
  });
}

// Eingetippte Namen/Zeiten in die Arbeitskopie übernehmen (vor dem Neuzeichnen und beim Speichern)
function readBlocksEditor() {
  document.querySelectorAll('#blocks-editor .block-name-input, #blocks-editor .block-time-input').forEach(input => {
    const idx   = parseInt(input.dataset.bidx);
    const field = input.dataset.field;
    if (!isNaN(idx) && field && blocksDraft[idx]) blocksDraft[idx][field] = input.value;
  });
}

function addBlockRow() {
  readBlocksEditor();
  const num = Math.max(0, ...blocksDraft.map(b => b.num)) + 1; // freie Kennung, bestehende bleiben unverändert
  // Neuer Block nach dem letzten: 15 min Pause, gleiche Länge (vorher immer 08:00–09:30, BUGS O5)
  const toMin = t => { const [h, m] = (t || '').split(':').map(Number); return h * 60 + m; };
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const last = [...blocksDraft].sort((a, b) => toMin(a.end) - toMin(b.end)).pop();
  let start = 8 * 60, len = 90;
  if (last && !isNaN(toMin(last.end))) {
    len = toMin(last.end) - toMin(last.start) > 0 ? toMin(last.end) - toMin(last.start) : 90;
    start = toMin(last.end) + 15;
  }
  if (start + len > 23 * 60 + 59) { start = 8 * 60; len = 90; }
  blocksDraft.push({ num, label: `${blocksDraft.length + 1}. Block`, start: fmt(start), end: fmt(start + len) });
  renderBlocksEditor();
}

// Vorlage für die Stundenzeiten (BUGS AA2): vorher musste man jede Zeile einzeln anlegen, voreingestellt sind
// Doppelstunden. Füllt nur die Arbeitskopie – gilt erst mit „Speichern“, und Kennungen bleiben (Regel 12, 53):
// Die bisherigen Blöcke werden der Reihe nach neu belegt, überzählige mit Stunden bleiben, leere fallen weg.
const BLOCK_TEMPLATES = {
  single: { count: 8, len: 45, label: n => `${n}. Stunde`, pause: n => (n === 2 || n === 4 ? 20 : 5) },
  double: { count: 4, len: 90, label: n => `${n}. Block`, pause: () => 20 },
};
async function chooseBlockTemplate() {
  // Halbe Stunden (Doppelstunden-Zeit) passen nicht 1:1 in Einzelstunden – vorher sagen (R5)
  const halves = db.lessonSlots.filter(s => s.part === 'first' || s.part === 'second').length;
  const choice = await askChoice('Vorlage für die Stundenzeiten',
    'Füllt die Liste neu, ab dem bisherigen Beginn. Danach kannst du jede Zeit noch anpassen.\n\n'
    + 'Deine Stunden bleiben in ihrer Reihe (1., 2., …), nur Zeiten und Namen ändern sich. Übernommen wird erst mit „Speichern“.'
    + (halves ? `\n\n⚠️ Du hast ${halves === 1 ? '1 halbe Stunde' : halves + ' halbe Stunden'} (1./2. Hälfte). Bei Einzelstunden stehen sie danach in derselben Zeile. Bitte im Stundenplan prüfen und ggf. auf eine eigene Stunde legen.` : ''),
    [{ label: 'Einzelstunden (8 × 45 min)', value: 'single', primary: true },
     { label: 'Doppelstunden (4 × 90 min)', value: 'double' }]);
  if (choice && !document.getElementById('modal-settings').classList.contains('hidden')) applyBlockTemplate(choice);
}
function applyBlockTemplate(kind) {
  const t = BLOCK_TEMPLATES[kind];
  if (!t) return;
  readBlocksEditor();
  const toMin = x => { const m = timeToMins(x); return m === null ? Infinity : m; };
  const fmt = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const old = [...blocksDraft].sort((a, b) => toMin(a.start) - toMin(b.start));
  let start = old.length && toMin(old[0].start) !== Infinity ? toMin(old[0].start) : 7 * 60 + 45;
  let nextNum = Math.max(0, ...blocksDraft.map(b => b.num)) + 1;
  const rows = [];
  for (let i = 0; i < t.count; i++) {
    const num = old[i] ? old[i].num : nextNum++;
    rows.push({ num, label: t.label(i + 1), start: fmt(start), end: fmt(start + t.len) });
    start += t.len + t.pause(i + 1);
  }
  const kept = old.slice(t.count).filter(b => db.lessonSlots.some(sl => sl.block === b.num));
  blocksDraft = [...rows, ...kept];
  renderBlocksEditor();
  if (kept.length) showToast(`${kept.map(b => b.label || 'Block').join(', ')} enthält noch Stunden und bleibt`, 'error');
}

function deleteBlockRow(idx) {
  readBlocksEditor();
  const block = blocksDraft[idx];
  if (!block) return;
  if (blocksDraft.length <= 1) { showToast('Mindestens ein Block nötig', 'error'); return; }
  const used = db.lessonSlots.filter(s => s.block === block.num).length;
  if (used) {
    showToast(`${block.label || 'Block'} enthält noch ${used} Stunde${used === 1 ? '' : 'n'}. Bitte zuerst verschieben oder löschen`, 'error');
    return;
  }
  blocksDraft.splice(idx, 1);
  renderBlocksEditor();
}

// Warnschwelle aus einem Einstellungsfeld: leer/ungültig → Standard, 0 = Warnung aus
function parseWarnThreshold(inputId, fallback) {
  const v = parseFloat(document.getElementById(inputId).value.replace(',', '.'));
  return isNaN(v) || v < 0 ? fallback : v;
}

function saveSettings() {
  // Blockzeiten zuerst prüfen: nichts speichern, solange ein Block unmöglich ist (BUGS O5)
  readBlocksEditor();
  const badBlock = blocksDraft.find(b => !/^\d\d:\d\d$/.test(b.start || '') || !/^\d\d:\d\d$/.test(b.end || '') || b.end <= b.start);
  if (badBlock) {
    showToast(`${badBlock.label || 'Block'}: Ende muss nach dem Beginn liegen`, 'error');
    return;
  }
  // Ferien (Y8): beide Daten nötig, „bis“ nicht vor „von“
  readHolidaysEditor();
  const isDate = v => /^\d{4}-\d\d-\d\d$/.test(v || '');
  const badHoliday = holidaysDraft.find(h => !isDate(h.from) || !isDate(h.until) || h.until < h.from);
  if (badHoliday) {
    const name = (badHoliday.label || '').trim() || 'Ferien';
    showToast(!isDate(badHoliday.from) || !isDate(badHoliday.until) ? `${name}: bitte „von“ und „bis“ eintragen` : `${name}: „bis“ liegt vor „von“`, 'error');
    return;
  }
  // Tippfehler im Jahr („bis 2205“) ließen alle Stunden für Jahrzehnte verschwinden: ungewöhnlich lange Zeiträume
  // (> 10 Wochen, Sommerferien haben höchstens ~7) bestätigen lassen (R8)
  const tooLong = holidaysDraft.filter(h => (parseDate(h.until) - parseDate(h.from)) / 86400000 > 70);
  if (tooLong.length && !confirm(`Dieser Zeitraum ist ungewöhnlich lang:\n${tooLong.map(h => `• ${(h.label || '').trim() || 'Ferien'}: ${formatDateLong(h.from)} – ${formatDateLong(h.until)}`).join('\n')}\n\n`
      + 'In dieser Zeit fallen alle regelmäßigen Stunden aus. Vielleicht ein Tippfehler im Jahr?\n\nTrotzdem speichern?')) return;
  const newHolidays = holidaysDraft.map(h => ({ id: h.id || uid(), label: (h.label || '').trim() || 'Ferien', from: h.from, until: h.until,
      ...(FEDERAL_STATES[h.source] ? { source: h.source } : {}) }))
    .sort((a, b) => a.from.localeCompare(b.from));
  // Notizen/Einträge in Stunden, die durch neue Ferien wegfallen: bleiben gespeichert, sind aber nicht mehr zu sehen
  const inNew = d => newHolidays.some(h => h.from <= d && d <= h.until);
  const hiddenEntries = Object.keys(db.lessonData).filter(key => {
    const slot = db.lessonSlots.find(s => s.id === key.slice(0, key.lastIndexOf('_')));
    const d = key.slice(key.lastIndexOf('_') + 1);
    return slot && !isOneOffSlot(slot) && inNew(d) && !holidayAt(d) && slotOccursOn(slot, d);
  });
  if (hiddenEntries.length && !confirm(`In ${hiddenEntries.length === 1 ? 'einer Stunde' : hiddenEntries.length + ' Stunden'} in den neuen Ferien gibt es schon Notizen oder Hausaufgaben. `
      + 'Sie bleiben gespeichert, sind aber nicht mehr zu sehen, solange dort Ferien eingetragen sind.\n\nFerien trotzdem speichern?')) return;
  db.settings.teacherName = document.getElementById('settings-teacher-name').value.trim();
  db.settings.school      = document.getElementById('settings-school').value.trim();
  // Leer/ungültig → Standard 5 min (vorher still 0, BUGS O5)
  const buffer = parseInt(document.getElementById('settings-seating-buffer').value, 10);
  db.settings.seatingBufferMins = Number.isFinite(buffer) && buffer >= 0 ? buffer : 5;
  // Standard „an“ wird nicht gespeichert (fehlt = an), nur das Ausschalten
  if (document.getElementById('settings-seating-start').checked) delete db.settings.seatingStartInLesson; else db.settings.seatingStartInLesson = false;
  const hy = document.getElementById('settings-half-year').value, ye = document.getElementById('settings-year-end').value;
  if (isDateStr(hy)) db.settings.halfYearEnd = hy; else delete db.settings.halfYearEnd;
  if (isDateStr(ye)) db.settings.schoolYearEnd = ye; else delete db.settings.schoolYearEnd;
  if (!halfYearSplit()) periodChoice = null;   // ohne Halbjahre gibt es nichts umzuschalten (Y7)
  if (document.getElementById('settings-seating-autoswitch').checked) delete db.settings.seatingAutoSwitch; else db.settings.seatingAutoSwitch = false;
  const protectBefore = classGradesProtected();
  if (document.getElementById('settings-class-grades-protect').checked) delete db.settings.classGradesProtect; else db.settings.classGradesProtect = false;
  if (protectBefore !== classGradesProtected()) { hideClassGrades(); rerenderClassTab(); }   // gilt sofort (AH24 c)
  db.settings.warnAbsences = parseWarnThreshold('settings-warn-absences', 3);
  db.settings.warnHomework = parseWarnThreshold('settings-warn-homework', 3);
  db.settings.warnGrade    = parseWarnThreshold('settings-warn-grade', 4.5);
  db.settings.warnPoints   = parseWarnThreshold('settings-warn-points', 5);
  db.settings.theme       = currentThemeMode;
  // Nur eine wirklich gewählte Farbe speichern; Standard = nichts gespeichert (BUGS S6)
  if (currentThemeBg && currentThemeBg !== 'auto') { db.settings.themeBg = currentThemeBg; db.settings.themeCard = currentThemeCard; }
  else { delete db.settings.themeBg; delete db.settings.themeCard; }
  if (currentThemeBg === 'auto') db.settings.themeAuto = true; else delete db.settings.themeAuto;   // X6
  if (currentThemeAccent) db.settings.themeAccent = currentThemeAccent; else delete db.settings.themeAccent; // Standard = nichts gespeichert
  db.settings.themeRadius = parseInt(document.getElementById('settings-radius').value);
  db.settings.studentSortOrder = document.getElementById('settings-sort-order').value;

  readBlocksEditor();
  if (blocksDraft.length) db.settings.blocks = blocksDraft.map(b => ({ ...b }));
  const holidaysChanged = JSON.stringify(newHolidays.map(h => [h.from, h.until]))
    !== JSON.stringify((Array.isArray(db.settings.holidays) ? db.settings.holidays : []).map(h => [h.from, h.until]));
  if (newHolidays.length) db.settings.holidays = newHolidays;
  else delete db.settings.holidays;
  const state = document.getElementById('settings-federal-state').value;
  if (FEDERAL_STATES[state]) db.settings.federalState = state; else delete db.settings.federalState;
  saveNavSettings();
  // Schülerapp (AJ1): nur anlegen, wenn jemand sie benutzt (bei allen anderen bleibt die DB unverändert)
  const saOn = document.getElementById('settings-studentapp-on').checked;
  const saName = document.getElementById('settings-studentapp-name').value.trim().slice(0, 60);
  if (saOn || saName || db.settings.studentApp) db.settings.studentApp = saName ? { on: saOn, name: saName } : { on: saOn };

  saveDB();
  closeModal('modal-settings');
  renderNav();
  updateStudentAppTabVisibility();
  updatePeriodSelect();   // Halbjahresende geändert: Umschalter ein-/ausblenden (Y7)
  // Offene Ansicht mit den neuen Einstellungen zeichnen (Warnschwellen, Sortierung, Namensformat; BUGS M1/O4)
  renderScheduleViews();
  if (document.getElementById('view-students')?.classList.contains('active') && currentGroupId) refreshStudentViews(currentGroupId);
  showToast('Einstellungen gespeichert ✓');
  if (holidaysChanged) offerMoveHolidayItems(); // HA/Tests, die jetzt in die Ferien fallen (Y8); nur nach Änderung (R6)
}

// CSV-Feld in Anführungszeichen; Anführungszeichen im Wert werden verdoppelt (BUGS L11)
function csvCell(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }

async function exportGradesCSV() {
  const gid = currentGroupId;
  if (!gid || !db.groups.some(x => x.id === gid)) return;
  if (!(await confirmUnencryptedFile('Der Notenexport'))) return;
  if (currentGroupId !== gid) return;
  exportGradesCSVFile();
}
function exportGradesCSVFile() {
  if (!currentGroupId) return;
  const g = db.groups.find(x => x.id === currentGroupId);
  if (!g) return;
  
  const students = db.students[g.id] || [];
  const points = gradeScale(g).higherIsBetter;
  const header = points ? 'Klassenarbeiten (Punkte);Sonstige (Punkte);Gesamt (Punkte)' : 'Klassenarbeiten;Sonstige;Gesamtnote';
  let csvContent = `\uFEFFNachname;Vorname;${header}\n`; // \uFEFF is BOM for Excel to read UTF-8 correctly
  const fmt = v => v !== null ? v.toFixed(points ? 1 : 2).replace('.', ',') : '';
  
  const range = viewPeriod();   // Zeitraum wie in der Klassenansicht (Y7)
  // Nachname steht vorne: danach sortieren (AR21)
  students.filter(Boolean).slice().sort((a, b) => `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(`${b.lastName || ''} ${b.firstName || ''}`, 'de')).forEach(s => {
    // Spalten wie die Gewichtung der Klasse (gradeCategory), damit sich die Gesamtnote daraus ergibt
    const parts = calculateGradeCategoryAverages(s, range);
    const total = calculateStudentAverage(s, g.id, range);
    csvContent += [s.lastName, s.firstName, fmt(parts.schularbeit), fmt(parts.sonstige), fmt(total)].map(csvCell).join(';') + '\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Noten_${g.className}_${g.subject}_${range ? PERIOD_NAMES[range.key].replace(/\W+/g, '') + '_' : ''}${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Noten als CSV exportiert ✓');
}

function downloadBackupFile(data, suffix = '') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
  a.download = `Unterrichtsplaner_Backup${suffix}_${dateStr}_${timeStr}.json`;
  a.click();
}
function exportData() {
  downloadBackupFile(db);
  
  db.settings.lastBackupTimestamp = Date.now();
  persistDB(); // keine Datenänderung: sonst Upload und evtl. Konflikt auf anderen Geräten (BUGS K13)
  
  showToast('Sicherung gespeichert ✓');
}
function importDataClick() { document.getElementById('import-file-input').click(); }
function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && parsed.lessonSlots && parsed.groups && parsed.students) importBackup(parsed);
      else showToast('Ungültiges Format','error');
    } catch { showToast('Fehler beim Importieren','error'); }
  };
  reader.readAsText(file); event.target.value='';
}
// Sicherung übernehmen: vorher fragen (ersetzt alles!). Der Sync-Stand dieses Geräts bleibt, der aus der
// Sicherung ist veraltet und würde sofort einen Konflikt melden. Der Import zählt als Änderung und geht
// damit auch in die Cloud (BUGS K9).
async function importBackup(parsed) {
  const nGroups = parsed.groups.length;
  const nStudents = Object.values(parsed.students || {}).reduce((n, list) => n + ((list && list.length) || 0), 0);
  const what = `${nGroups} ${nGroups === 1 ? 'Klasse' : 'Klassen'}, ${nStudents} ${nStudents === 1 ? 'Schüler' : 'Schüler'}`;
  const lm = parsed.settings && Number(parsed.settings.lastModified);
  const when = lm > 0 ? `, Stand ${new Date(lm).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : '';
  const cloud = SyncManager.currentUser ? '\n\nDer Cloud-Sync ist aktiv: Die Sicherung ersetzt danach auch den Stand in der Cloud und auf deinen anderen Geräten.' : '';
  if (!confirm(`Sicherung laden (${what}${when})?\n\nAlle Daten auf diesem Gerät werden durch die Sicherung ersetzt. Der jetzige Stand bleibt unter Einstellungen → „Früheren Stand zurückholen“.${cloud}`)) return;
  // Sicherheitsnetz wie bei „Früheren Stand zurückholen“: falsche Datei gewählt, nichts verloren (AP4)
  const dbAtStart = db;
  try { const now = JSON.stringify(db); await keepMergeBackup(now, now, 'restore'); }
  catch (e) {
    console.warn('Sicherheitsnetz nicht gespeichert:', e.message);
    if (!confirm('Der jetzige Stand konnte nicht zur Sicherheit abgelegt werden. Trotzdem laden?\n\nVorher am besten „Exportieren“.')) return;
  }
  if (db !== dbAtStart) { showToast('Nicht geladen: Die Daten haben sich gerade geändert. Bitte noch einmal.', 'error'); return; }
  const syncSettings = db.syncSettings;
  delete parsed.syncSettings;
  const before = db;
  db = migrateDB(parsed);
  if (syncSettings) db.syncSettings = syncSettings;
  keepLiveShareAccess(before, db);   // Schülerapp-Links gehören zum jetzigen Stand (AT6)
  saveDB();
  replaceDB(db);   // Darstellung, Leiste, Auswahl aus der Sicherung (AP18)
  closeModal('modal-settings');
  showToast('Importiert ✓');
}
function clearAllData() {
  const cloudHint = SyncManager.currentUser
    ? '\n\nDie Daten in der Cloud bleiben erhalten und werden beim nächsten Sync wieder geladen. Um auch sie zu löschen: „Alles löschen, auch in der Cloud“.'
    : '\n\nFalls Cloud-Sync aktiv ist, bleiben die Daten in der Cloud erhalten und werden beim nächsten Sync wieder geladen.';
  if (!confirm('ACHTUNG: Wirklich alle Daten auf diesem Gerät löschen?' + cloudHint)) return;
  wipeLocalData();
  closeModal('modal-settings');
  showToast('Lokale Daten gelöscht.');
}

// Kurzbeschreibung eines Datenstands für Rückfragen („3 Klassen, 75 Schüler“)
function dataSummary(data) {
  const nGroups = (data.groups || []).length;
  const nStudents = Object.values(data.students || {}).reduce((n, list) => n + ((list && list.length) || 0), 0);
  return `${nGroups} ${nGroups === 1 ? 'Klasse' : 'Klassen'}, ${nStudents} Schüler`;
}

// „Alles löschen“ leert nur das Gerät, und das holt beim nächsten Sync alles zurück (ein leeres Gerät lädt nie hoch).
// Hier wird ein leerer Stand als neueste Cloud-Version hochgeladen – das Dokument bleibt. Andere Geräte übernehmen
// ihn wie jede Änderung; wer dort noch nicht übertragene Eingaben hat, bekommt das Fenster mit dem ganzen Stand (mergeDB, BUGS Z1).
async function clearAllDataEverywhere() {
  if (!SyncManager.currentUser) return;
  if (!SyncManager.masterPassword) { alert('Bitte zuerst das Master-Passwort eingeben.'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    alert('Dafür braucht es eine Internetverbindung. Es wurde nichts gelöscht.');
    return;
  }
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  syncRunning = true;
  try {
    // Passwort-Probe: Die Cloud wird nur überschrieben, wenn dieses Gerät sie lesen kann
    const cloud = await SyncManager.readCloud();
    let cloudData = null;
    try { cloudData = cloud ? JSON.parse(cloud.data) : null; } catch (e) { /* dann ohne Angabe */ }
    const localEmpty = isLocalDBEmpty();
    const lines = [];
    if (cloudData) lines.push('In der Cloud: ' + dataSummary(cloudData));
    if (!localEmpty) lines.push('Auf diesem Gerät: ' + dataSummary(db));
    const answer = await askChoice('Alles löschen, auch in der Cloud',
      'Alle Klassen, Schüler, Noten, Stunden und Einstellungen werden gelöscht: auf diesem Gerät, in der Cloud und auf '
      + 'allen deinen anderen Geräten, sobald sie sich abgleichen.\n\n' + (lines.length ? lines.join('\n') + '\n\n' : '')
      + 'Das lässt sich nicht rückgängig machen. Eine Sicherung ist danach die einzige Kopie.',
      [{ label: 'Sicherung speichern, dann alles löschen', value: 'backup', primary: true },
       { label: 'Ohne Sicherung alles löschen', value: 'delete', danger: true }]);
    if (!answer) return;
    if (answer === 'delete' && !confirm('Wirklich ohne Sicherung alles löschen, auch in der Cloud?\n\nDas lässt sich nicht rückgängig machen.')) return;
    if (answer === 'backup') {
      if (!localEmpty) exportData();
      // Steht in der Cloud etwas anderes (Änderungen anderer Geräte), das auch sichern
      if (cloudData && (localEmpty || !cloudMatchesLocal(cloud.data, JSON.stringify(db)))) downloadBackupFile(cloudData, '_Cloud');
    }

    const empty = emptyDB();
    empty.settings.lastModified = Date.now();
    // Kein pendingUpload (T4): Käme die Antwort nicht an, würde der nächste Sync sonst die Daten dieses Geräts
    // als „eigenen Stand“ wieder hochladen. So gibt es schlimmstenfalls den Konflikt-Dialog.
    const emptyText = JSON.stringify(empty);
    const newTimestamp = cloud ? await SyncManager.saveToCloud(emptyText, cloud.cloudTimestamp) : null;
    const sharesLeft = !(await deleteAllStudentShares());   // Klassenseiten der Schülerapp mit weg (AJ1); Rest bleibt vorgemerkt (AT5)
    let versionsLeft = false;   // Z4: auch die Tages-Sicherungen
    try { await SyncManager.deleteCloudVersions(); } catch (e) { versionsLeft = true; console.warn('Cloud-Sicherungen nicht gelöscht:', e.message); }

    // Gerät leeren. Mit Sync-Stand der leeren Cloud: Das Gerät gilt dann nicht als neu, sondern als abgeglichen.
    wipeLocalData();
    if (newTimestamp !== null) {
      db.settings.lastModified = empty.settings.lastModified;
      markSynced(newTimestamp, empty.settings.lastModified);
      saveSyncBase(newTimestamp, emptyText);   // gemeinsamer Stand passt zur neuen Cloud-Version (AP11, Regel 83)
    }
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    SyncManager.updateStatus('synced');
    closeModal('modal-settings');
    updateSyncUI();
    const left = versionsLeft || sharesLeft;
    showToast(left ? `Alles gelöscht. ${versionsLeft ? 'Die Cloud-Sicherungen der letzten Tage' : 'Einige Seiten der Schülerapp'} ließen sich gerade nicht löschen: bitte mit Internet noch einmal „Alles löschen, auch in der Cloud“` : 'Alles gelöscht, auf diesem Gerät und in der Cloud.', left ? 'error' : undefined);
  } catch (e) {
    if (e.name === 'WrongPasswordError') {
      rejectMasterPassword();
      alert('❌ Das Master-Passwort passt nicht zu den Daten in der Cloud. Es wurde nichts gelöscht.');
    } else if (e.name === 'CloudChangedError') {
      alert('Gerade hat ein anderes Gerät hochgeladen. Es wurde nichts gelöscht. Bitte noch einmal versuchen.');
    } else if (e.name === 'AccountDeletedError') {
      handleAccountDeleted();
    } else {
      alert('Fehler: ' + e.message + '\n\nEs wurde nichts gelöscht.');
    }
  } finally {
    syncRunning = false;
    if (syncQueued) { syncQueued = false; triggerSyncInternal(); }
  }
}
// Alle Daten dieses Geräts löschen („Alle Daten löschen“, Abmelden auf einem geteilten Gerät)
function wipeLocalData() {
  if (window.syncTimeout) { clearTimeout(window.syncTimeout); window.syncTimeout = null; }
  localStorage.removeItem(DB_KEY);
  markDBWritten(); // andere Fenster sollen den gelöschten Stand übernehmen, nicht ihren alten zurückschreiben
  // Auch Rettungskopien unlesbarer Stände (G12) enthalten Schülerdaten (BUGS K15)
  rescueCopyKeys().forEach(k => localStorage.removeItem(k));
  // Gemeinsamer Stand und Stände vor dem Zusammenführen enthalten ebenfalls Schülerdaten (AH4)
  syncBaseSaved = null;
  try { Promise.resolve(syncStore.clear()).catch(() => {}); } catch (e) { /* kein Speicher: nichts zu löschen */ }
  replaceDB(loadDB());
}
// ▸ zu js/sitzplan.js, Abschnitt „Seating Plan“
setInterval(refreshSeatingDateIfStale, 60000);
document.addEventListener('visibilitychange', refreshSeatingDateIfStale);
setInterval(refreshSeatingStudentDayIfVisible, 60000);
document.addEventListener('visibilitychange', refreshSeatingStudentDayIfVisible);

// Close dropdown on click outside
document.addEventListener('click', () => {
  const menu = document.getElementById('seating-group-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
});
// ▸ zu js/sitzplan.js, Abschnitt „Fenster „Thema der Stunde“ aus der Sitzplan-Leiste (AI2)“
document.getElementById('lt-topic')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); commitLessonTopic('lt-topic', lessonTopicShown, refreshLessonTopicRow); }
});
document.addEventListener('pointerdown', noteSeatingTouch, true);
document.addEventListener('keydown', noteSeatingTouch, true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { appHiddenAt = Date.now(); return; }
  const away = appHiddenAt !== null && Date.now() - appHiddenAt >= SEATING_RESUME_MINS * 60000;
  appHiddenAt = null;
  // Offener Sitzplan: nach dem Entsperren sofort die richtige Restzeit, nicht erst beim nächsten Takt (AH3)
  if (document.getElementById('view-seating')?.classList.contains('active')) { refreshSeatingCockpit(); return; }
  if (!away || document.querySelector('.modal-overlay:not(.hidden)') || timetableEditMode || seatingEditMode) return;
  if (shouldStartInSeating()) switchView('seating');
});
setInterval(() => { if (!document.hidden) refreshSeatingCockpit(); }, 5000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && seatingWakeWanted && !seatingWakeLock) setSeatingWakeLock(true);
});
document.getElementById('seating-student-note-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addSeatingStudentNote(); }
});
document.querySelector('#modal-seating-student .seating-note-add')?.addEventListener('click', () => addSeatingStudentNote());

// ─── Merkzettel (AH18) ──────────────────────────────────────────────────────
// db.todos = [{ id, text, created, groupId?, due?, done?, doneAt? }]. Fehlt bei Altdaten; angelegt wird es erst beim
// ersten Eintrag (keine Migration). Kaputte Einträge (Import, neuere App) werden übersprungen, nie gelöscht.
// Nie im Sitzplan (Beamer). Bearbeitet wird per Objekt-Referenz (Regel 8), gelöscht per indexOf (Regel 9).
let todoEdit = null;        // Punkt, der gerade im Feld bearbeitet wird
let todoDoneOpen = false;   // „Erledigt“ aufgeklappt (Ansichtszustand, Regel 19)
const todosOf = () => (Array.isArray(db.todos) ? db.todos : []).filter(t => t && typeof t === 'object' && typeof t.text === 'string' && t.text.trim());
const todoGroup = t => t.groupId ? db.groups.find(g => g.id === t.groupId) : null;
// Offen: Fristen zuerst nach Datum (überfällig oben), dann ohne Frist, neueste zuerst
function sortOpenTodos(list) {
  const all = Array.isArray(db.todos) ? db.todos : [];
  return [...list].sort((a, b) => {
    const da = isDateStr(a.due) ? a.due : '9999', dbb = isDateStr(b.due) ? b.due : '9999';
    if (da !== dbb) return da.localeCompare(dbb);
    return (b.created || '').localeCompare(a.created || '') || all.indexOf(b) - all.indexOf(a);
  });
}
function todoDueHTML(t, todayStr) {
  if (!isDateStr(t.due)) return '';
  const tomorrow = formatDate(addDays(parseDate(todayStr), 1));
  if (t.due < todayStr && !t.done) return `<span class="todo-due is-late">überfällig seit ${escHtml(formatWeekdayShort(t.due))}</span>`;
  const txt = t.due === todayStr ? 'heute' : t.due === tomorrow ? 'morgen' : `bis ${escHtml(formatWeekdayShort(t.due))}`;
  return `<span class="todo-due${t.due === todayStr && !t.done ? ' is-today' : ''}">${txt}</span>`;
}
// Eine Zeile; edit = Stift (nur im Merkzettel), Erledigtes bekommt den Papierkorb
function todoRow(t, { edit = false } = {}) {
  const todayStr = formatDate(new Date());
  const g = todoGroup(t);
  const row = document.createElement('div');
  row.className = 'todo-row' + (t.done ? ' is-done' : '');
  row.innerHTML = `<button type="button" class="todo-check" aria-pressed="${t.done ? 'true' : 'false'}" aria-label="${escHtml((t.done ? 'Wieder offen: ' : 'Erledigt: ') + t.text.trim())}">${icon('check')}</button>
    <div class="todo-body"><span class="todo-text">${escHtml(t.text.trim())}</span>${g || isDateStr(t.due)
      ? `<span class="todo-meta">${g ? `<span class="todo-class" style="--card-color:${escHtml(safeColor(g.color))}">${escHtml(g.className)}</span>` : ''}${todoDueHTML(t, todayStr)}</span>` : ''}</div>
    ${edit && !t.done ? `<button type="button" class="btn-icon todo-edit" aria-label="${escHtml('Bearbeiten: ' + t.text.trim())}">${icon('edit')}</button>` : ''}
    ${t.done ? `<button type="button" class="btn-icon todo-del" aria-label="${escHtml('Löschen: ' + t.text.trim())}">${icon('trash')}</button>` : ''}`;
  row.querySelector('.todo-check').addEventListener('click', () => toggleTodo(t));
  row.querySelector('.todo-edit')?.addEventListener('click', () => editTodo(t));
  row.querySelector('.todo-del')?.addEventListener('click', () => deleteTodo(t));
  return row;
}
function fillTodoGroupSelect(sel) {
  const keep = sel.value;
  sel.innerHTML = '<option value="">Ohne Klasse</option>' + [...db.groups].sort(compareClassNames)
    .map(g => `<option value="${escHtml(g.id)}">${escHtml([g.className, g.subject].filter(Boolean).join(' '))}</option>`).join('');
  sel.value = db.groups.some(g => g.id === keep) ? keep : '';
}
function renderTodos() {
  const open = document.getElementById('todo-open'), done = document.getElementById('todo-done');
  if (!open || !done) return;
  fillTodoGroupSelect(document.getElementById('todo-group'));   // Eingetipptes bleibt stehen (Feld wird nicht ersetzt)
  const all = todosOf();
  const openList = sortOpenTodos(all.filter(t => !t.done));
  const doneList = all.filter(t => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  open.innerHTML = openList.length ? '' : '<p class="todo-empty">Nichts offen. Oben eintippen, was du nicht vergessen willst.</p>';
  openList.forEach(t => open.appendChild(todoRow(t, { edit: true })));
  const wrap = document.getElementById('todo-done-wrap');
  wrap.classList.toggle('hidden', !doneList.length);
  wrap.open = todoDoneOpen;
  wrap.querySelector('summary').textContent = `Erledigt (${doneList.length})`;
  done.innerHTML = '';
  doneList.forEach(t => done.appendChild(todoRow(t)));
  setTodoFormMode();
}
function setTodoFormMode() {
  const btn = document.getElementById('btn-todo-add');
  btn.textContent = todoEdit ? 'Speichern' : 'Merken';
  btn.setAttribute('aria-label', todoEdit ? 'Speichern' : 'Merken');
  document.getElementById('btn-todo-cancel').classList.toggle('hidden', !todoEdit);
}
function resetTodoForm() {
  todoEdit = null;
  ['todo-input', 'todo-group', 'todo-due'].forEach(id => document.getElementById(id).value = '');
  setTodoFormMode();
}
function submitTodo() {
  const text = document.getElementById('todo-input').value.trim();
  if (!text) return;
  const groupId = document.getElementById('todo-group').value;
  const due = document.getElementById('todo-due').value;
  let t = todoEdit;
  if (t) {
    // Ein Abgleich ersetzt alle Objekte (replaceDB): per Kennung wiederfinden, sonst ginge die Änderung verloren (AP5)
    if (!(db.todos || []).includes(t)) t = todoEdit = todosOf().find(x => x.id === t.id) || null;
    if (!t) { showToast('Diesen Punkt gibt es nicht mehr (z. B. durch Sync). Dein Text steht noch im Feld.', 'error'); todoEdit = null; setTodoFormMode(); renderTodos(); return; }
  } else {
    if (!Array.isArray(db.todos)) db.todos = [];
    t = { id: uid(), text, created: formatDate(new Date()) };
    db.todos.push(t);
  }
  t.text = text;
  if (db.groups.some(g => g.id === groupId)) t.groupId = groupId; else delete t.groupId;
  if (isDateStr(due)) t.due = due; else delete t.due;
  saveDB();
  resetTodoForm();
  refreshTodoViews();
  document.getElementById('todo-input').focus();
}
function editTodo(t) {
  todoEdit = t;
  document.getElementById('todo-input').value = t.text;
  document.getElementById('todo-group').value = db.groups.some(g => g.id === t.groupId) ? t.groupId : '';
  document.getElementById('todo-due').value = isDateStr(t.due) ? t.due : '';
  setTodoFormMode();
  document.getElementById('todo-input').focus();
}
function toggleTodo(t) {
  if (!(db.todos || []).includes(t)) { refreshTodoViews(); return; }   // inzwischen weg (Sync)
  if (t.done) { delete t.done; delete t.doneAt; saveDB(); refreshTodoViews(); return; }
  t.done = true; t.doneAt = formatDate(new Date());
  if (todoEdit === t) resetTodoForm();
  saveDB();
  refreshTodoViews();
  showUndoToast('Erledigt', () => {
    const cur = (db.todos || []).includes(t) ? t : todosOf().find(x => x.id === t.id);   // nach einem Abgleich per Kennung (AP5)
    if (!cur || !cur.done) return;
    delete cur.done; delete cur.doneAt; saveDB(); refreshTodoViews();
  });
}
function deleteTodo(t) {
  const idx = (db.todos || []).indexOf(t);
  if (idx === -1) { refreshTodoViews(); return; }
  db.todos.splice(idx, 1);
  saveDB();
  refreshTodoViews();
  showUndoToast('Gelöscht', () => {
    if (!Array.isArray(db.todos)) db.todos = [];
    if (db.todos.includes(t)) return;
    db.todos.splice(Math.min(idx, db.todos.length), 0, t); saveDB(); refreshTodoViews();
  });
}
// Dashboard: offene Punkte (höchstens 5) über den Warnungen; ohne offene Punkte kein Abschnitt
function fillDashboardTodos(slot) {
  if (!slot) return;
  const open = sortOpenTodos(todosOf().filter(t => !t.done));
  if (!open.length) { slot.innerHTML = ''; return; }
  slot.innerHTML = `<section class="dash-section dash-todos"><div class="dash-todos-head"><h2 class="dash-heading">Merkzettel <span class="dash-heading-sub">${open.length}</span></h2>
    <button type="button" class="btn-secondary dash-todos-all">Alle ansehen</button></div><div class="todo-list"></div></section>`;
  const list = slot.querySelector('.todo-list');
  open.slice(0, 5).forEach(t => list.appendChild(todoRow(t)));
  slot.querySelector('.dash-todos-all').addEventListener('click', () => switchView('todos'));
}
// Stunden-Fenster: offene Punkte dieser Klasse
function renderLessonTodos(slot) { fillLessonTodos(slot); layoutLessonCards(); }
function fillLessonTodos(slot) {
  const box = document.getElementById('lesson-todos');
  if (!box) return;
  const open = slot && slot.groupId ? sortOpenTodos(todosOf().filter(t => !t.done && t.groupId === slot.groupId)) : [];
  box.classList.toggle('hidden', !open.length);
  const head = `<div class="notes-section-header"><span class="notes-section-icon">${icon('todo')}</span><span class="notes-section-label">Merkzettel</span></div>`;
  if (open.length && lessonPrivateVeiled) {   // aus dem Sitzplan: am Beamer verborgen (AS7)
    box.innerHTML = head + lessonVeilHTML(open.length, 'Punkt', 'Punkte');
    box.querySelector('.lc-veil-btn').addEventListener('click', showLessonPrivate);
    return;
  }
  box.innerHTML = open.length ? `${head}<div class="todo-list"></div>` : '';
  open.forEach(t => box.querySelector('.todo-list').appendChild(todoRow(t)));
}
function refreshTodoViews() {
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (active('view-todos')) renderTodos();
  if (active('view-dashboard')) renderDashboard();
  const slot = activeLessonId && db.lessonSlots.find(s => s.id === activeLessonId);
  if (!document.getElementById('modal-lesson').classList.contains('hidden')) renderLessonTodos(slot);
}
document.getElementById('todo-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitTodo(); } });
document.getElementById('btn-todo-add')?.addEventListener('click', () => submitTodo());
document.getElementById('btn-todo-cancel')?.addEventListener('click', () => { resetTodoForm(); renderTodos(); });
document.getElementById('todo-done-wrap')?.addEventListener('toggle', e => { todoDoneOpen = e.target.open; });

// ─── Schnellsuche (AH19) ────────────────────────────────────────────────────
// Findet Klassen, Schüler, offene Merkzettel-Punkte, gültige Klassennotizen und offene Planungsthemen.
// Nie Noten, Hinweise (notes/importantNote) oder Schülernotizen: Die Suche kann am Beamer offen sein (Regel 67).
// Treffer merken sich nur Kennungen; geöffnet wird mit frisch gesuchten Objekten (Sync kann dazwischen liegen).
const SEARCH_RECENT_KEY = 'search_recent';   // nur dieses Gerät, nur Kennungen
let searchItems = [];
let searchActive = 0;
const searchNorm = s => String(s ?? '').toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '');
const searchWords = s => searchNorm(s).split(/[^0-9a-zß]+/).filter(Boolean);

// 0 = ganzes erstes Wort, 1 = Anfang des ersten Worts, 2 = Anfang eines anderen Worts, 3 = irgendwo; null = passt nicht
function searchScore(text, token) {
  const words = searchWords(text);
  if (words[0] === token) return 0;
  if (words[0] && words[0].startsWith(token)) return 1;
  if (words.some(w => w.startsWith(token))) return 2;
  return searchNorm(text).includes(token) ? 3 : null;
}
// Alle Wörter der Suche müssen vorkommen (im Namen oder im Zusatz, z. B. der Klasse), mindestens eins im Namen
function searchMatch(name, extra, tokens) {
  const all = searchNorm(name + ' ' + extra);
  if (!tokens.every(t => all.includes(t))) return null;
  const scores = tokens.map(t => searchScore(name, t)).filter(s => s !== null);
  return scores.length ? Math.min(...scores) : null;
}
const groupLabel = g => `${g.className || ''} ${g.subject || ''}`.trim();

function searchResults(query) {
  const tokens = searchWords(query);
  if (!tokens.length) return [];
  const ranked = list => list.filter(x => x.score !== null).sort((a, b) => a.score - b.score || a.sort.localeCompare(b.sort, 'de'));
  const groups = ranked(db.groups.map(g => ({ kind: 'group', groupId: g.id, score: searchMatch(groupLabel(g), '', tokens), sort: groupLabel(g) }))).slice(0, 5);
  const students = ranked(db.groups.flatMap(g => (db.students[g.id] || []).map(s => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.trim();
    return { kind: 'student', groupId: g.id, studentId: s.id, score: searchMatch(name, groupLabel(g), tokens), sort: name };
  }))).slice(0, 6);
  const todayStr = formatDate(new Date());
  const groupOf = id => db.groups.find(g => g.id === id);
  const other = ranked([
    ...todosOf().filter(t => !t.done).map(t => ({ kind: 'todo', todoId: t.id, score: searchMatch(t.text, groupOf(t.groupId) ? groupLabel(groupOf(t.groupId)) : '', tokens), sort: t.text })),
    ...db.groups.flatMap(g => activeClassNotes(g, todayStr).map(n => ({ kind: 'classNote', groupId: g.id, noteId: n.id, score: searchMatch(n.text, groupLabel(g), tokens), sort: n.text }))),
    ...db.groups.flatMap(g => (Array.isArray(g.plan) ? g.plan : []).filter(p => p && !p.done && typeof p.title === 'string')
      .map(p => ({ kind: 'plan', groupId: g.id, topicId: p.id, score: searchMatch(p.title, groupLabel(g), tokens), sort: p.title }))),
  ]).slice(0, 6);
  return [['Klassen', groups], ['Schüler', students], ['Merkzettel, Notizen, Planung', other]].filter(([, items]) => items.length);
}

function readSearchRecent() {
  try { const v = JSON.parse(localStorage.getItem(SEARCH_RECENT_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function rememberSearchRecent(item) {
  try {
    const key = it => it.kind + ':' + it.groupId + ':' + (it.studentId || '');
    const list = [{ kind: item.kind, groupId: item.groupId, ...(item.studentId ? { studentId: item.studentId } : {}) },
      ...readSearchRecent().filter(it => it && key(it) !== key(item))].slice(0, 6);
    localStorage.setItem(SEARCH_RECENT_KEY, JSON.stringify(list));
  } catch (e) { /* Speicher gesperrt: dann eben ohne „Zuletzt“ */ }
}
// Was es noch gibt, höchstens 4
function searchRecentItems() {
  return readSearchRecent().filter(it => it && (it.kind === 'group' ? db.groups.some(g => g.id === it.groupId)
    : it.kind === 'student' && (db.students[it.groupId] || []).some(s => s.id === it.studentId))).slice(0, 4);
}
function searchJumpItems(now) {
  const items = [{ kind: 'jump', target: 'today' }];
  const gid = getSuggestedSeatingGroupId(now);
  if (gid && db.groups.some(g => g.id === gid)) items.push({ kind: 'jump', target: 'seating', groupId: gid });
  items.push({ kind: 'jump', target: 'todos' });
  return items;
}

// Anzeige eines Treffers (null = gibt es nicht mehr)
function searchItemView(it, tokens, now) {
  const g = it.groupId ? db.groups.find(x => x.id === it.groupId) : null;
  const color = g ? g.color : '';
  if (it.kind === 'group') {
    if (!g) return null;
    const l = currentOrNextLessonOfGroup(g.id, now);
    const when = l ? lessonWhenParts(l, now) : null;
    return { badge: escHtml(g.className || '?'), color, title: groupLabel(g),
      sub: when ? (when.now ? 'Jetzt: ' : 'Als Nächstes: ') + when.html : 'Keine Stunde geplant', subIsHTML: true, acts: true };
  }
  if (it.kind === 'student') {
    const s = g && (db.students[g.id] || []).find(x => x.id === it.studentId);
    if (!s) return null;
    return { badge: escHtml(((s.firstName || ' ')[0] + (s.lastName || ' ')[0]).trim().toUpperCase()), color,
      title: `${s.firstName || ''} ${s.lastName || ''}`.trim(), sub: groupLabel(g), go: 'Profil öffnen' };
  }
  if (it.kind === 'todo') {
    const t = todosOf().find(x => x.id === it.todoId);
    if (!t) return null;
    const tg = db.groups.find(x => x.id === t.groupId);
    return { badge: icon('todo'), color: tg ? tg.color : '', title: t.text, sub: 'Merkzettel' + (tg ? ' · ' + tg.className : ''), go: 'Merkzettel' };
  }
  if (it.kind === 'classNote') {
    const n = g && classNotesOf(g).find(x => x.id === it.noteId);
    if (!n) return null;
    return { badge: icon('pin'), color, title: n.text, sub: 'Klassennotiz · ' + groupLabel(g), go: 'Notizen' };
  }
  if (it.kind === 'plan') {
    const p = g && (g.plan || []).find(x => x && x.id === it.topicId);
    if (!p) return null;
    return { badge: icon('list'), color, title: p.title, sub: 'Planung · ' + groupLabel(g), go: 'Planung' };
  }
  if (it.target === 'today') return { badge: icon('calendar'), title: 'Heute im Stundenplan', sub: formatWeekdayShort(formatDate(todaySchoolDay())), go: '' };
  if (it.target === 'todos') { const n = todosOf().filter(t => !t.done).length; return { badge: icon('todo'), title: 'Merkzettel', sub: n ? `${n} offen` : 'nichts offen', go: '' }; }
  if (it.target === 'seating') return g ? { badge: icon('seating'), color, title: 'Sitzplan ' + (g.className || ''), sub: 'Klasse dieser Stunde', go: '' } : null;
  return null;
}
// Treffer-Text mit markierten Stellen; Rohtext wird escaped, nur <mark> kommt dazu
function searchMarked(text, tokens) {
  const raw = String(text), norm = searchNorm(raw);
  if (!tokens.length || norm.length !== raw.length) return escHtml(raw);
  const on = new Array(raw.length).fill(false);
  tokens.forEach(t => { let i = norm.indexOf(t); while (i >= 0) { for (let k = i; k < i + t.length; k++) on[k] = true; i = norm.indexOf(t, i + t.length); } });
  let out = '', i = 0;
  while (i < raw.length) { let j = i; while (j < raw.length && on[j] === on[i]) j++; out += on[i] ? `<mark>${escHtml(raw.slice(i, j))}</mark>` : escHtml(raw.slice(i, j)); i = j; }
  return out;
}

function renderSearchResults() {
  const box = document.getElementById('search-results');
  if (!box) return;
  const query = document.getElementById('search-input').value;
  const tokens = searchWords(query), now = new Date();
  const sectionsList = tokens.length ? searchResults(query)
    : [['Zuletzt geöffnet', searchRecentItems()], ['Springen zu', searchJumpItems(now)]].filter(([, items]) => items.length);
  searchItems = [];
  let html = '';
  sectionsList.forEach(([name, items]) => {
    const rows = items.map(it => {
      const v = searchItemView(it, tokens, now);
      if (!v) return '';
      const i = searchItems.push(it) - 1;
      return `<div class="search-row">
        <button type="button" class="search-main" id="search-opt-${i}" data-i="${i}">
          <span class="search-badge"${v.color ? ` style="--c:${escHtml(safeColor(v.color))}"` : ''}>${v.badge}</span>
          <span class="search-txt"><span class="search-title">${searchMarked(v.title, tokens)}</span><span class="search-sub">${v.subIsHTML ? v.sub : escHtml(v.sub)}</span></span>
          ${v.go ? `<span class="search-go">${escHtml(v.go)}</span>` : ''}
        </button>
        ${v.acts ? `<span class="search-acts"><button type="button" data-i="${i}" data-act="seating">Sitzplan</button><button type="button" data-i="${i}" data-act="grades">Noten</button><button type="button" data-i="${i}" data-act="note">+ Notiz</button></span>` : ''}
      </div>`;
    }).join('');
    if (rows) html += `<div class="search-sec">${escHtml(name)}</div>${rows}`;
  });
  if (!searchItems.length) html = tokens.length
    ? `<p class="search-empty">Nichts gefunden für „${escHtml(query.trim())}“.<br><small>Gesucht wird in Klassen, Schülernamen, Merkzettel, Klassennotizen und Planung. Noten und Hinweise werden nie durchsucht.</small></p>`
    : '';
  box.innerHTML = html;
  box.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => runSearchItem(searchItems[+b.dataset.i], b.dataset.act || 'open')));
  setSearchActive(0);
}
function setSearchActive(i) {
  const rows = [...document.querySelectorAll('#search-results .search-main')];
  searchActive = rows.length ? Math.max(0, Math.min(i, rows.length - 1)) : 0;
  rows.forEach((r, k) => r.classList.toggle('is-active', k === searchActive));
  const inp = document.getElementById('search-input');
  if (rows[searchActive]) { inp.setAttribute('aria-activedescendant', rows[searchActive].id); rows[searchActive].scrollIntoView?.({ block: 'nearest' }); }
  else inp.removeAttribute('aria-activedescendant');
}

function openSearch() {
  if (document.querySelector('.modal-overlay:not(.hidden):not(#modal-search)')) return;   // nie über ein anderes Fenster
  const inp = document.getElementById('search-input');
  inp.value = '';
  renderSearchResults();
  openModal('modal-search');
  inp.focus({ preventScroll: true });
  fitSearchToKeyboard();
}
// Bildschirmtastatur (iPad/Handy) verdeckt sonst die unteren Treffer: Höhe nach dem sichtbaren Bereich richten
function fitSearchToKeyboard() {
  const m = document.getElementById('modal-search');
  if (!m || m.classList.contains('hidden') || !window.visualViewport) return;
  m.style.setProperty('--search-vh', Math.round(window.visualViewport.height) + 'px');
}
window.visualViewport?.addEventListener('resize', fitSearchToKeyboard);

function runSearchItem(it, act = 'open') {
  if (!it) return;
  const g = it.groupId ? db.groups.find(x => x.id === it.groupId) : null;
  const gone = () => { showToast('Das gibt es nicht mehr (inzwischen geändert).', 'error'); renderSearchResults(); };
  if (it.kind !== 'jump' && !searchItemView(it, [], new Date())) return gone();
  closeModal('modal-search');
  if (it.kind === 'group') {
    if (act === 'seating') return openSeatingForGroup(g.id);
    if (act === 'note') return openClassNotes(g.id);
    return openGroupStudents(g.id, act === 'grades' ? 'grades' : 'students');
  }
  if (it.kind === 'student') { openGroupStudents(g.id); return openStudentDetail(it.studentId, 'attendance'); }   // nicht auf „Noten“ (Beamer, AH24 c)
  if (it.kind === 'todo') return switchView('todos');
  if (it.kind === 'classNote') return openClassNotes(g.id);
  if (it.kind === 'plan') return openGroupStudents(g.id, 'plan');
  if (it.target === 'today') { switchView('timetable'); return jumpToDate(formatDate(new Date())); }
  if (it.target === 'todos') return switchView('todos');
  if (it.target === 'seating' && g) return openSeatingForGroup(g.id);
}

document.getElementById('search-input')?.addEventListener('input', renderSearchResults);
document.getElementById('search-input')?.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { e.preventDefault(); setSearchActive(searchActive + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchActive(searchActive - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); runSearchItem(searchItems[searchActive]); }
});
// ⌘K / Strg+K (Laptop, iPad mit Tastatur)
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openSearch(); }
});
// ▸ zu js/sitzplan.js, Abschnitt „Notenrunde im Sitzplan (AH28)“
// Tippen daneben (Druck auch daneben begonnen, Regel 27) und Escape schließen die Tafel
document.addEventListener('click', e => {
  const p = document.getElementById('grade-round-pop');
  if (!p || p.contains(e.target) || pressStartedIn(p)) return;
  closeGradeRoundPad();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('grade-round-pop')) closeGradeRoundPad(); });

document.addEventListener('click', (e) => {
  const popup = document.getElementById('seating-settings-popup');
  if (popup && !popup.classList.contains('hidden') && !e.target.closest('#seating-settings-popup') && !e.target.closest('button[title="Raster-Größe einstellen"]')
      && !pressStartedIn(popup)) { // Text im Feld markiert und außerhalb losgelassen: offen lassen
    popup.classList.add('hidden');
  }
});
// ▸ zu js/schueler-fenster.js, Abschnitt „Note schnell geben (AH28)“
// Knöpfe im Schüler-Fenster per Listener (das Markup wird neu gesetzt; Inline-onclick läuft im Test nicht, Regel 18/19).
// Am inneren Fenster, nicht am Overlay: .modal stoppt das Hochblubbern (event.stopPropagation).
document.querySelector('#modal-seating-student .modal')?.addEventListener('click', e => {
  const menu = document.getElementById('sw-menu');
  const item = e.target.closest('#sw-menu [data-menu]');
  if (e.target.closest('#sw-menu-btn')) { toggleSeatingMenu(); return; }
  if (item) { closeSeatingMenu(); seatingMenuAction(item.dataset.menu); return; }
  if (menu && !menu.hidden) closeSeatingMenu();   // Tippen woanders im Fenster schließt das Menü
  if (e.target.closest('#sw-grade-btn')) { if (document.getElementById('sw-grade-pad')) closeSeatingGradePad(); else openSeatingGradePad(); }
  else if (e.target.closest('#sw-more-btn')) toggleSeatingStudentMore();
  else if (e.target.closest('#sw-reveal')) revealSeatingStudent();
  else if (e.target.closest('#sw-grade-form-btn')) openGradeFormForCurrentStudentDetailed();
});
// ▸ zu js/grundlagen.js, Abschnitt „Helpers“
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const open = [...document.querySelectorAll('.modal-overlay:not(.hidden)')];
  const top = open[open.length - 1];
  const dialog = top && top.querySelector('.modal');
  if (!dialog) return;
  const list = focusablesIn(dialog);
  if (!list.length) return;
  const first = list[0], last = list[list.length - 1], cur = document.activeElement;
  if (e.shiftKey && (cur === first || !dialog.contains(cur))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (cur === last || !dialog.contains(cur))) { e.preventDefault(); first.focus(); }
});
labelModals();

// Kein Zoomen mit zwei Fingern (AH11): Die App ist für die Bildschirmgröße gebaut, versehentliches Vergrößern
// am Pult ließ sich kaum zurückholen. iOS ignoriert „user-scalable=no“ und meldet das Zusammenziehen als gesture…
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

// Nach dem Drucken den Druckbereich leeren: Sonst druckt ein späteres Strg+P/„Teilen → Drucken“ wieder alle Noten
// bzw. persönlichen Codes (AU15)
window.addEventListener('afterprint', () => { const a = document.getElementById('print-area'); if (a) a.innerHTML = ''; });

// „Passwort anzeigen“ (Auge) an den Master-Passwort-Feldern (`data-reveal`). Nie gespeichert: Schließen der
// Einstellungen und Verlassen der App verbergen es wieder – am Pult soll es niemand sehen.
function setPasswordVisible(input, show) {
  input.type = show ? 'text' : 'password';
  // Als Textfeld schaltet iOS sonst Großbuchstabe, Autokorrektur und Rechtschreibprüfung ein (AU9, Lücke in AO1)
  input.setAttribute('autocapitalize', 'none');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  const btn = input.parentElement.querySelector('.password-reveal');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(show));
  btn.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
  btn.title = btn.getAttribute('aria-label');
  btn.innerHTML = icon(show ? 'eye-off' : 'eye');
}
function hideAllPasswords() {
  document.querySelectorAll('input[data-reveal]').forEach(input => { if (input.type !== 'password') setPasswordVisible(input, false); });
}
function setupPasswordReveal() {
  document.querySelectorAll('input[data-reveal]').forEach(input => {
    if (input.parentElement.classList.contains('password-field')) return;
    const wrap = document.createElement('div');
    wrap.className = 'password-field';
    if (input.style.marginTop) { wrap.style.marginTop = input.style.marginTop; input.style.marginTop = ''; }
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-reveal';
    // Fokus bleibt im Feld: sonst löste das Antippen `change` aus und übernähme das Passwort vorzeitig
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => setPasswordVisible(input, input.type === 'password'));
    wrap.appendChild(btn);
    setPasswordVisible(input, false);
  });
}
setupPasswordReveal();
['pointerdown', 'mousedown'].forEach(type => document.addEventListener(type, e => { overlayPressTarget = e.target; lastPressTarget = e.target; }, true));
// ▸ zu js/grundlagen.js, Abschnitt „Keyboard“

// Elemente mit role="button", die kein <button> sind (Sitzplan-Karten, Farbfelder, Namen in Tabellen):
// Enter und Leertaste lösen sie aus wie ein Tipp (BUGS S12)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  if (!el || !el.getAttribute || el.getAttribute('role') !== 'button' || el.tagName === 'BUTTON') return;
  e.preventDefault();
  el.click();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeTopModal();
  if (e.key === 'Enter' && !e.shiftKey) {
    if (document.activeElement.id === 'new-hw-text')   addHWItem();
    if (document.activeElement.id === 'new-test-text') addTestItem();
    if (document.activeElement.id === 'new-att-note')  addAttendanceEntry();
    if (document.activeElement.id === 'new-student-note-text') addStudentNote();
  }
});
document.addEventListener('focusin', e => {
  if (e.target.type === 'date' && !e.target.value && TODAY_DATE_FIELDS.has(e.target.id)) e.target.value = formatDate(new Date());
});

// Fix for iOS Safari keyboard scroll bug in fixed modals
document.addEventListener('focusout', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 50);
  }
});
// ▸ zu js/stunde.js, Abschnitt „Karten im Stunden-Fenster (AH37)“
document.getElementById('lc-reset')?.addEventListener('click', () => {
  setLessonCards(LESSON_CARDS.map(c => c.key), []);
  renderLessonCardTiles();
  showToast('Standard wiederhergestellt');
});

// ─── Klassen-Bericht als PDF und Excel (AD1) ──────────────────────────────
// Sicherung zum Ausdrucken bzw. Weiterbearbeiten: je Klasse Noten (alle Einzelnoten + Schnitte), Fehlzeiten,
// Mitarbeit, fehlende HA. Keine Hinweise/Inhalte (Entscheidung 02.11.). Die Dateien sind unverschlüsselt.
function classReportData(g, range = viewPeriod()) {   // Zeitraum wie in der Klassenansicht (Y7)
  // „Nachname, Vorname“ → nach Nachname sortiert, sonst wirkt die Liste ungeordnet (AR21)
  const key = s => `${s.lastName || ''} ${s.firstName || ''}`.trim();
  const students = (db.students[g.id] || []).filter(Boolean).slice().sort((a, b) => key(a).localeCompare(key(b), 'de'));
  const cols = gradeColumns(g, students).filter(c => inPeriod(c.date, range));
  const count = (list, pred) => periodList(list, range).filter(pred).length;
  return {
    g, cols, scale: gradeScale(g), weight: getSchularbeitWeight(g), groupAvg: calculateGroupAverage(g.id, range),
    period: range ? PERIOD_NAMES[range.key] : '',
    rows: students.map(s => {
      const parts = calculateGradeCategoryAverages(s, range);
      return {
        name: [s.lastName, s.firstName].filter(Boolean).join(', '),
        grades: cols.map(c => { const gr = findColumnGrade(s, c); return gr ? gr.value : null; }),
        ka: parts.schularbeit, so: parts.sonstige, avg: calculateStudentAverage(s, g.id, range),
        f: count(s.attendance, a => a.type === 'abwesend'), e: count(s.attendance, a => a.type === 'entschuldigt'),
        z: count(s.attendance, a => a.type === 'zuspät'),
        part: partCounts(periodList(s.participation, range)), ha: periodList(s.homework, range).length,   // Mitarbeit je Stufe wie PART_LEVELS (AH52)
      };
    }),
  };
}
const reportColTitle = c => [formatDateDE(parseDate(c.date)), c.label, gradeTypeShort(c.type)].filter(Boolean);
// Schuljahr des Berichts aus den Daten (AR16): Im August gehören die Einträge noch zum alten Jahr
function reportSchoolYear(g, todayStr = formatDate(new Date())) {
  let latest = '';
  (db.students[g.id] || []).forEach(st => YEAR_LISTS.forEach(f => (Array.isArray(st && st[f]) ? st[f] : []).forEach(x => {
    if (x && isDateStr(x.date) && x.date <= todayStr && x.date > latest) latest = x.date;
  })));
  return schoolYearLabel(parseDate(latest || todayStr));
}

// ── Fenster ──
let classReportGroupIds = null;  // null = alle wählbar (Einstellungen), sonst feste Klasse (Klassenansicht)
function openClassReport(groupId = null) {
  if (!db.groups.length) { showToast('Noch keine Klassen', 'error'); return; }
  classReportGroupIds = groupId ? [groupId] : null;
  const list = document.getElementById('class-report-list');
  const groups = groupId ? db.groups.filter(g => g.id === groupId)
    : db.groups.slice().sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || (a.className || '').localeCompare(b.className || '', undefined, { numeric: true }));
  list.innerHTML = groups.map(g => `<label class="print-check"><input type="checkbox" value="${escHtml(g.id)}" checked${groupId ? ' disabled' : ''} />
    ${escHtml(g.className)} ${escHtml(g.subject || '')} <small>· ${(db.students[g.id] || []).length} Schüler</small></label>`).join('');
  document.getElementById('class-report-all').classList.toggle('hidden', !!groupId);
  openModal('modal-class-report');
}
function classReportSelection() {
  const ids = [...document.querySelectorAll('#class-report-list input:checked')].map(i => i.value);
  return db.groups.filter(g => ids.includes(g.id));
}
function toggleClassReportAll() {
  const boxes = [...document.querySelectorAll('#class-report-list input')];
  const on = !boxes.every(b => b.checked);
  boxes.forEach(b => { b.checked = on; });
}
function reportFileStem(groups) {
  const part = groups.length === 1 ? `${groups[0].className}_${groups[0].subject || ''}` : 'alle_Klassen';
  const range = viewPeriod();   // Zeitraum im Dateinamen (Y7)
  return `Klassenbericht_${part}_${range ? PERIOD_NAMES[range.key] + '_' : ''}${formatDate(new Date())}`.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_');
}

// ── PDF (Druckansicht) ──
const REPORT_GRADE_COLS = 12; // mehr Notenspalten → weitere Tabelle darunter, damit nichts abgeschnitten wird
function buildClassReportPrint(groups) {
  const fmt = v => formatGradeAverage(v, 2);
  const teacher = db.settings.teacherName || '', school = db.settings.school || '';
  const pages = groups.map(g => {
    const d = classReportData(g);
    const pts = d.scale.higherIsBetter;
    const head = `<div class="rp-head"><div><div class="rp-title">${escHtml(g.className)} <span>${escHtml(g.subject || '')}</span></div>
      <div class="rp-sub">Klassen-Bericht · Schuljahr ${escHtml(reportSchoolYear(g))}${d.period ? ' · ' + escHtml(d.period) : ''}${g.year ? ' · ' + escHtml(g.year) : ''} · Klassenarbeiten zählen ${d.weight} %</div></div>
      <div class="rp-meta">${school ? `<strong>${escHtml(school)}</strong><br>` : ''}${teacher ? escHtml(teacher) + '<br>' : ''}Stand ${escHtml(formatDateLong(formatDate(new Date())))}</div></div>`;
    if (!d.rows.length) return `<section class="rp-page">${head}<p class="rp-empty">Keine Schüler.</p></section>`;
    const overview = `<table class="rp-table"><thead><tr><th class="rp-name">Name</th><th>Ø Klassen&shy;arbeiten</th><th>Ø Sonstige</th><th>Ø Gesamt${pts ? ' (Pkt.)' : ''}</th>
        <th>Fehlt unentsch.</th><th>Fehlt entsch.</th><th>Zu spät</th><th>Mitarbeit ${PART_LEVELS.map(l => l.sign).join(' / ')}</th><th>HA fehlt</th></tr></thead><tbody>`
      + d.rows.map(r => `<tr><td class="rp-name">${escHtml(r.name)}</td><td>${fmt(r.ka)}</td><td>${fmt(r.so)}</td><td class="rp-avg">${fmt(r.avg)}</td>
        <td>${r.f}</td><td>${r.e}</td><td>${r.z}</td><td>${r.part.join(' / ')}</td><td>${r.ha}</td></tr>`).join('')
      + `<tr class="rp-sum"><td class="rp-name">Klassenschnitt</td><td></td><td></td><td class="rp-avg">${fmt(d.groupAvg)}</td><td colspan="5"></td></tr></tbody></table>`;
    let grades = '';
    for (let i = 0; i < d.cols.length; i += REPORT_GRADE_COLS) {
      const part = d.cols.slice(i, i + REPORT_GRADE_COLS);
      grades += `<table class="rp-table rp-grades"><thead><tr><th class="rp-name">Name</th>${part.map(c => `<th>${reportColTitle(c).map(escHtml).join('<br>')}</th>`).join('')}</tr></thead><tbody>`
        + d.rows.map(r => `<tr><td class="rp-name">${escHtml(r.name)}</td>${part.map((c, k) => `<td>${r.grades[i + k] === null ? '' : escHtml(gradeText(r.grades[i + k]))}</td>`).join('')}</tr>`).join('')
        + '</tbody></table>';
    }
    const cls = escHtml(`${g.className} ${g.subject || ''}`.trim());   // auch auf Folgeseiten erkennbar
    return `<section class="rp-page">${head}<h3 class="rp-h">Überblick · ${cls}</h3>${overview}${d.cols.length ? `<h3 class="rp-h">Einzelnoten · ${cls}</h3>${grades}` : '<p class="rp-empty">Noch keine Noten.</p>'}</section>`;
  });
  document.getElementById('print-area').innerHTML = `<div class="rp">${pages.join('')}</div>`;
}
function printClassReport() {
  const groups = classReportSelection();
  if (!groups.length) { showToast('Bitte mindestens eine Klasse wählen', 'error'); return; }
  buildClassReportPrint(groups);
  closeModal('modal-class-report');
  const prev = document.title;
  document.title = reportFileStem(groups);   // Vorschlag als Dateiname beim „Als PDF sichern“
  window.print();
  document.title = prev;
}

// ── Excel (.xlsx, selbst erzeugt: Zip ohne Kompression + SpreadsheetML) ──
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  all.forEach(p => { out.set(p, pos); pos += p.length; });
  return out;
}
const xmlEsc = v => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colLetter = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
// Zelle: Zahl als Zahl (rechnet in Excel weiter), sonst Text; style 1 = fett, 2 = zwei Nachkommastellen
function xlsxCell(ref, v, style = 0) {
  if (v === null || v === undefined || v === '') return '';
  const st = style ? ` s="${style}"` : '';
  if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${Math.round(v * 100) / 100}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
}
function gradeCellValue(v) { return typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? parseFloat(v) : v; } // „2.5“ → 2,5; „2-“, „+“ bleiben Text
function classReportSheetXML(g) {
  const d = classReportData(g);
  const pts = d.scale.higherIsBetter;
  const header = ['Name', 'Ø Klassenarbeiten', 'Ø Sonstige', `Ø Gesamt${pts ? ' (Punkte)' : ''}`, 'Fehlt unentschuldigt', 'Fehlt entschuldigt', 'Zu spät',
    ...PART_LEVELS.map(l => `Mitarbeit ${l.word}`), 'HA fehlt', ...d.cols.map(c => reportColTitle(c).join(' '))];
  const rows = [
    [[`Klassen-Bericht ${g.className} ${g.subject || ''} · Schuljahr ${reportSchoolYear(g)}${d.period ? ' · ' + d.period : ''}`, 1]],
    [[`Stand ${formatDateLong(formatDate(new Date()))}${db.settings.teacherName ? ' · ' + db.settings.teacherName : ''}${db.settings.school ? ' · ' + db.settings.school : ''} · Klassenarbeiten zählen ${d.weight} %`, 0]],
    [],
    header.map(h => [h, 1]),
    ...d.rows.map(r => [[r.name, 0], [r.ka, 2], [r.so, 2], [r.avg, 2], [r.f, 0], [r.e, 0], [r.z, 0], ...r.part.map(n => [n, 0]), [r.ha, 0],
      ...r.grades.map(v => [gradeCellValue(v), 0])]),
    [['Klassenschnitt', 1], [null], [null], [d.groupAvg, 2]],
  ];
  const sheetRows = rows.map((cells, i) => `<row r="${i + 1}">${cells.map(([v, st], k) => xlsxCell(colLetter(k) + (i + 1), v, st)).join('')}</row>`).join('');
  const cols = `<cols><col min="1" max="1" width="26" customWidth="1"/><col min="2" max="${header.length}" width="13" customWidth="1"/></cols>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="4" topLeftCell="B5" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
    + `${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;
}
function buildClassReportXLSX(groups) {
  const used = new Set();
  const sheetName = g => {
    let base = `${g.className} ${g.subject || ''}`.replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) || 'Klasse';
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${base} ${n++}`;
    used.add(name.toLowerCase());
    return name;
  };
  const names = groups.map(sheetName);
  const ns = 'http://schemas.openxmlformats.org/';
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${groups.map((g, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${ns}package/2006/relationships">${groups.map((g, i) => `<Relationship Id="rId${i + 1}" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${groups.length + 1}" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${ns}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    ...groups.map((g, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: classReportSheetXML(g) })),
  ];
  return zipStore(files);
}
function downloadClassReportXLSX() {
  const groups = classReportSelection();
  if (!groups.length) { showToast('Bitte mindestens eine Klasse wählen', 'error'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildClassReportXLSX(groups)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = reportFileStem(groups) + '.xlsx';
  a.click();
  closeModal('modal-class-report');
  showToast('Excel-Datei gespeichert ✓');
}
// ▸ zu js/grundlagen.js, Abschnitt „Init“

if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  updateAppliedThemeFromDB();
  renderTimetable();
  renderSubjectGroups();
  renderNav();   // Reihenfolge und Schnellzugriff (AH48)
  initAllCustomDropdowns();
  if (shouldStartInSeating()) switchView('seating'); // im Unterricht gleich der Sitzplan der laufenden Klasse
  setTimeout(() => showWhatsNewIfDue(), 800); // nach dem ersten Zeichnen, damit die App dahinter schon steht
  if (!isLocalDBEmpty()) requestPersistentStorage();   // Y5
}
// ▸ zu js/sitzplan.js, Abschnitt „Resize Observer for Smart Fit“
const mainContentObserver = new ResizeObserver(() => {
  const viewSeating = document.getElementById('view-seating');
  if (viewSeating && viewSeating.classList.contains('active')) {
    clearTimeout(seatingResizeTimeout);
    seatingResizeTimeout = setTimeout(() => {
      renderSeatingPlan();
    }, 150);
  }
});
const mainContentNode = document.getElementById('main-content');
if (mainContentNode) mainContentObserver.observe(mainContentNode);

// ─── Dashboard „Heute“ & Warnungen ─────────────────────────────────────
// Offene Warn-Gruppen (Klassen-IDs). Nur für diese Sitzung, wird nie gespeichert.
const dashboardOpenGroups = new Set();

// ─── Daten schützen (Y4, Y5) ─────────────────────────────────────────────────
// Ohne Cloud liegen die Daten nur auf diesem Gerät. Höchstens ein leiser Hinweis im Dashboard, nie ein Dialog
// (andere Lehrkräfte bekommen Updates ohne Anleitung). Was weggedrückt wurde, merkt sich nur das Gerät, nie db.
const BACKUP_REMIND_DAYS = 30;
const BACKUP_SNOOZE_KEY = 'backup_hint_snoozed', HOME_HINT_KEY = 'home_hint_dismissed';
function deviceHint(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function setDeviceHint(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* gesperrt: dann eben wieder */ } }
// Auch vor der fertigen Anmeldung: Das Master-Passwort liegt dauerhaft auf dem Gerät, sonst blitzt der Hinweis beim Start auf
function cloudConfigured() {
  return !!((typeof SyncManager !== 'undefined' && SyncManager.currentUser) || deviceHint(MASTER_PASSWORD_KEY));
}
function backupNoteInfo(now = Date.now()) {
  if (cloudConfigured() || !Object.values(db.students || {}).some(l => l && l.length)) return null;
  const snoozed = Number(deviceHint(BACKUP_SNOOZE_KEY));
  if (snoozed && now - snoozed < BACKUP_REMIND_DAYS * 86400000) return null;
  const last = db.settings.lastBackupTimestamp;
  if (!last) return { days: null };
  const days = Math.floor((now - last) / 86400000);
  return days >= BACKUP_REMIND_DAYS ? { days } : null;
}
function isIOSBrowserTab() {
  const ua = navigator.userAgent || '';
  const ios = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return ios && !standalone;
}
function homeNoteDue() {
  return isIOSBrowserTab() && !cloudConfigured() && !deviceHint(HOME_HINT_KEY)
    && Object.values(db.students || {}).some(l => l && l.length);
}
function safetyNoteHTML() {
  const backup = backupNoteInfo();
  if (backup) {
    const when = backup.days === null ? 'Noch keine Sicherung.' : `Letzte Sicherung vor ${backup.days} Tagen.`;
    return `<div id="dash-safety-note" class="dash-safety" role="status">${icon('save')}<span>${when} Ohne Cloud liegen deine Daten nur auf diesem Gerät. Die Sicherungsdatei ist unverschlüsselt.</span>
      <button type="button" class="btn-secondary dash-safety-do">Jetzt sichern</button><button type="button" class="btn-secondary dash-safety-later" data-hint="backup">Später</button></div>`;
  }
  if (newYearNoteDue()) {   // Y6
    return `<div id="dash-safety-note" class="dash-safety" role="status">${icon('calendar')}<span>Neues Schuljahr? Klassen übernehmen, das alte Jahr sichern und aufräumen.</span>
      <button type="button" class="btn-secondary dash-safety-newyear">Neues Schuljahr beginnen</button><button type="button" class="btn-secondary dash-safety-later" data-hint="newyear">Später</button></div>`;
  }
  if (homeNoteDue()) {
    return `<div id="dash-safety-note" class="dash-safety" role="status">${icon('info')}<span>Tipp: Lege die App auf den Home-Bildschirm (Teilen → Zum Home-Bildschirm). Sonst kann Safari die Daten nach 7 Tagen ohne Nutzung löschen.</span>
      <button type="button" class="btn-secondary dash-safety-later" data-hint="home">Verstanden</button></div>`;
  }
  return '';
}
function wireSafetyNote(container) {
  container.querySelector('.dash-safety-do')?.addEventListener('click', () => { exportData(); renderDashboard(); });
  container.querySelector('.dash-safety-newyear')?.addEventListener('click', () => openNewYear());
  container.querySelector('.dash-safety-later')?.addEventListener('click', e => {
    if (e.currentTarget.dataset.hint === 'backup') setDeviceHint(BACKUP_SNOOZE_KEY, String(Date.now()));
    else if (e.currentTarget.dataset.hint === 'newyear') setDeviceHint(NEWYEAR_HINT_KEY, formatDate(new Date()).slice(0, 4));   // bis zum nächsten Jahr
    else setDeviceHint(HOME_HINT_KEY, '1');
    renderDashboard();
  });
}
// Browser bitten, die Daten nicht von selbst zu löschen (Y5). Chrome und Safari antworten still; Firefox zeigt dafür
// einen eigenen Dialog, und Updates sollen keine unerwarteten Dialoge bringen: dort nicht fragen.
async function requestPersistentStorage() {
  try {
    const st = navigator.storage;
    if (!st || !st.persist || !st.persisted || /Firefox/i.test(navigator.userAgent || '')) return false;
    if (await st.persisted()) return true;
    return await st.persist();
  } catch (e) { return false; }
}

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  // Zwei Spalten (AH41): links der Tag und „Auffällig“, rechts „Als Nächstes“ und Merkzettel
  const coming = renderDashboardNext();
  container.innerHTML = safetyNoteHTML()
    + `<div class="dash-grid"><div class="dash-col dash-col-left">${renderDashboardToday()}${renderDashboardWarnings()}</div>`
    + `<div class="dash-col dash-col-right">${coming}<div id="dash-todos-slot"></div></div></div>`;
  wireSafetyNote(container);
  const todosSlot = document.getElementById('dash-todos-slot');
  fillDashboardTodos(todosSlot);   // Merkzettel (AH18)
  container.querySelector('.dash-grid').classList.toggle('dash-grid-single', !coming && !todosSlot.children.length);   // keine leere Hälfte
  container.querySelectorAll('details.dash-warn-group').forEach(el => {
    el.addEventListener('toggle', () => {
      if (el.open) {
        dashboardOpenGroups.add(el.dataset.group);
        markWarningsSeen(collectWarnings().filter(w => w.group.id === el.dataset.group));   // „neu“ gesehen (AH24 f)
      } else dashboardOpenGroups.delete(el.dataset.group);
    });
  });
}

function renderDashboardToday() {
  const now = new Date();
  const todayStr = formatDate(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const dayDate = nextSchoolDay(parseDate(todayStr));
  const dayStr = formatDate(dayDate);
  const isTodayShown = dayStr === todayStr;
  const lessons = lessonsOnDate(dayStr);
  const next = findNextLesson(now);
  const dayLabel = dayDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });

  let html = `<section class="dash-section dash-today">
    <h2 class="dash-heading">${isTodayShown ? 'Heute' : 'Nächster Schultag'} <span class="dash-heading-sub">${escHtml(dayLabel)}</span></h2>`;
  // Ferien zwischen heute und dem gezeigten Schultag (Y8)
  const hol = !isTodayShown && (Array.isArray(db.settings.holidays) ? db.settings.holidays : []).find(h => h && typeof h.from === 'string' && typeof h.until === 'string'
    && h.until >= todayStr && h.from < dayStr);
  if (hol) {
    const range = hol.from === hol.until ? formatDateLong(hol.from) : `${formatDateLong(hol.from)} – ${formatDateLong(hol.until)}`;
    html += `<div class="dash-holiday">${escHtml(hol.label || 'Ferien')}: ${escHtml(range)}</div>`;
  }
  html += dashboardBirthdaysHTML(dayStr);

  // Aufsichten zeitlich zwischen die Stunden sortiert (AA4)
  const sups = supervisionsOn(dayStr);
  let supIdx = 0;
  const supRows = upTo => {
    let h = '';
    while (supIdx < sups.length && (upTo === null || (timeToMins(sups[supIdx].start) ?? 0) < upTo)) {
      h += supervisionDashRow(sups[supIdx++], isTodayShown, nowMins);
    }
    return h;
  };
  if (!lessons.length && !sups.length) {
    html += `<div class="dash-empty">${isTodayShown ? 'Heute kein Unterricht.' : 'Kein Unterricht eingetragen.'}</div>`;
  } else {
    html += `<div class="dash-lessons">`;
    lessons.forEach(l => {
      html += supRows(l.range ? l.range.start : 0);
      const t = lessonTitle(l.slot);
      const due = dueItemsFor(l.slot.id, dayStr);
      const data = db.lessonData[l.slot.id + '_' + dayStr] || {};
      const isNext = next && next.slot.id === l.slot.id && next.dateStr === dayStr;
      let state = '', status = '';
      if (l.ausfall) { state = 'ausfall'; status = 'Entfällt'; }
      else if (isTodayShown && l.range && l.range.end <= nowMins) { state = 'past'; status = 'vorbei'; }
      else if (isTodayShown && l.range && l.range.start <= nowMins) { state = 'running'; status = `läuft noch ${l.range.end - nowMins} min`; }
      else if (isNext) { state = 'next'; status = 'nächste Stunde'; }
      const badges = [];
      const kind = lessonKindLabel(l.slot);
      if (kind)             badges.push(`<span class="dash-badge ${l.slot.substitute ? 'sub' : 'once'}">${kind}</span>`);
      if (due.hw.length)    badges.push(`<span class="dash-badge hw">HA ${due.hw.length}</span>`);
      if (due.tests.length) badges.push(`<span class="dash-badge test">Test ${due.tests.length}</span>`);
      if (data.notes)       badges.push(`<span class="dash-badge note">Notiz</span>`);
      const cNotes = l.slot.groupId ? activeClassNotes(db.groups.find(g => g.id === l.slot.groupId), dayStr) : [];
      html += `<div class="dash-lesson ${state}" role="button" tabindex="0" aria-label="${escHtml([t.main, t.sub, l.block.label].filter(Boolean).join(', '))}" data-slot="${escHtml(l.slot.id)}" style="--lesson-color:${escHtml(safeColor(l.slot.color))}"
                    onclick="openLessonDetail(${jsArg(l.slot.id)},${jsArg(dayStr)})">
          <div class="dash-lesson-time">${l.range ? minsToTime(l.range.start) : ''}<small>${escHtml(l.block.label)}</small></div>
          <div class="dash-lesson-main">
            <div class="dash-lesson-title">${escHtml(t.main)}${t.sub ? ` <span>${escHtml(t.sub)}</span>` : ''}${l.slot.room ? ` <span>· ${escHtml(l.slot.room)}</span>` : ''}</div>
            ${cNotes.length ? classNotesInlineHTML(cNotes, 'dash-lesson-cnotes') : ''}
          </div>
          <div class="dash-lesson-badges">${badges.join('')}</div>
          ${status ? `<div class="dash-lesson-status">${status}</div>` : ''}
        </div>`;
    });
    html += supRows(null);
    html += `</div>`;
  }
  return html + `</section>`;
}

// „Als Nächstes“: die nächste Stunde mit Notizen und Fälligem (AH41); leer, wenn keine mehr kommt
function renderDashboardNext() {
  const now = new Date();
  const todayStr = formatDate(now);
  const next = findNextLesson(now);
  if (!next) return '';
  const t = lessonTitle(next.slot);
  const data = db.lessonData[next.slot.id + '_' + next.dateStr] || {};
  const due = dueItemsFor(next.slot.id, next.dateStr);
  const when = next.dateStr === todayStr
    ? minsToTime(next.range.start)
    : parseDate(next.dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) + (next.range ? ', ' + minsToTime(next.range.start) : '');
  const itemList = (label, cls, items) => items.length ? `<div class="dash-next-items ${cls}"><strong>${label}</strong><ul>${
    items.map(i => `<li>${escHtml(i.text)}</li>`).join('')}</ul></div>` : '';
  const nextNotes = next.slot.groupId ? activeClassNotes(db.groups.find(g => g.id === next.slot.groupId), next.dateStr) : [];
  const body = (nextNotes.length ? classNotesInlineHTML(nextNotes, 'dash-next-cnotes') : '')
    + (data.notes ? `<div class="dash-next-notes">${escHtml(data.notes)}</div>` : '')
    + itemList('Hausaufgaben fällig', 'hw', due.hw) + itemList('Test', 'test', due.tests);
  return `<section class="dash-section dash-coming">
    <h2 class="dash-heading">Als Nächstes</h2>
    <div class="dash-next" role="button" tabindex="0" aria-label="${escHtml(['Als Nächstes', t.main, t.sub, when, next.block.label].filter(Boolean).join(', '))}" data-slot="${escHtml(next.slot.id)}" style="--lesson-color:${escHtml(safeColor(next.slot.color))}" onclick="openLessonDetail(${jsArg(next.slot.id)},${jsArg(next.dateStr)})">
      <div class="dash-next-title">${escHtml(t.main)}${t.sub ? ` <span>${escHtml(t.sub)}</span>` : ''}${next.slot.room ? ` <span>· ${escHtml(next.slot.room)}</span>` : ''}</div>
      <div class="dash-next-label">${escHtml(when)} · ${escHtml(next.block.label)}</div>
      ${body || '<div class="dash-empty">Keine Notizen, nichts fällig.</div>'}
    </div>
  </section>`;
}

// Geburtstage am gezeigten Schultag (AD6); dieselbe Person in zwei Fächern derselben Klasse nur einmal
function dashboardBirthdaysHTML(dayStr) {
  const seen = new Set(), items = [];
  db.groups.forEach(g => (db.students[g.id] || []).forEach(s => {
    const b = birthdayInfo(s, dayStr);
    const key = studentName(s) + '|' + g.className;
    if (!b || seen.has(key)) return;
    seen.add(key);
    items.push(`<span class="dash-bday-item">${escHtml(studentName(s))} <small>${escHtml(g.className)}${b.age ? ` · ${b.age}` : ''}${b.when === 'past' ? ` · ${escHtml(formatWeekdayShort(b.date))}` : ''}</small></span>`);
  }));
  return items.length ? `<div class="dash-birthdays">${icon('cake')}<span><b>Geburtstag:</b> ${items.join(', ')}</span></div>` : '';
}

// Eine Aufsicht in der Liste „Heute“ (AA4)
function supervisionDashRow(x, isTodayShown, nowMins) {
  const start = timeToMins(x.start) ?? 0, end = timeToMins(x.end) ?? start;
  let state = '', status = '';
  if (isTodayShown && end <= nowMins) { state = 'past'; status = 'vorbei'; }
  else if (isTodayShown && start <= nowMins) { state = 'running'; status = `läuft noch ${end - nowMins} min`; }
  else if (isTodayShown && start - nowMins <= 60) { state = 'next'; status = `beginnt in ${start - nowMins} min`; }
  return `<div class="dash-lesson dash-supervision ${state}" role="button" tabindex="0" aria-label="${escHtml(['Aufsicht', x.place, `${x.start || ''}–${x.end || ''}`].filter(Boolean).join(', '))}" onclick="openSupervisionForm(${jsArg(x.id)})">
      <div class="dash-lesson-time">${escHtml(x.start || '')}<small>Pause</small></div>
      <div class="dash-lesson-main">
        <div class="dash-lesson-title">${x.place ? `${escHtml(x.place)} <span>Aufsicht</span>` : 'Aufsicht'}</div>
        <div class="dash-lesson-room">${escHtml(x.start || '')}–${escHtml(x.end || '')}</div>
      </div>
      <div class="dash-lesson-badges"></div>
      ${status ? `<div class="dash-lesson-status">${status}</div>` : ''}
    </div>`;
}

function renderDashboardWarnings() {
  const warnings = collectWarnings();
  let html = `<section class="dash-section dash-warnings"><h2 class="dash-heading">Auffällig${warnings.length ? ` <span class="dash-heading-sub">${warnings.length}</span>` : ''}</h2>`;
  if (!warnings.length) {
    return html + `<div class="dash-empty">Niemand auffällig.</div></section>`;
  }
  const icons = { absences: icon('absences'), grade: icon('trend-down'), homework: icon('homework') };
  const colors = { absences: 'var(--danger)', grade: 'var(--danger)', homework: 'var(--warning)' };
  const seen = warnSeenSet(warnings);   // „neu“ wie in der Klassenübersicht (AH24 f)
  html += '<div class="dash-warn-box">';
  db.groups.forEach(group => {
    const list = warnings.filter(w => w.group === group);
    if (!list.length) return;
    html += `<details class="dash-warn-group" data-group="${escHtml(group.id)}"${dashboardOpenGroups.has(group.id) ? ' open' : ''}>
      <summary><span class="dash-warn-class">${escHtml(group.className)}</span> <span class="dash-warn-subject">${escHtml(group.subject)}</span>
        <span class="dash-warn-count">${list.length}</span></summary>
      <div class="dash-warn-list">`;
    list.forEach(w => {
      html += `<div class="dash-warn" style="border-left-color:${colors[w.type]}">
          <div class="dash-warn-text" role="button" tabindex="0" aria-label="${escHtml(studentListName(w.student) + ': ' + w.title)}" onclick="openStudentDetailFromDashboard(${jsArg(w.student.id)}, ${jsArg(group.id)}, ${jsArg(w.type)})" title="Zum Schülerprofil springen">
            <div class="dash-warn-title">${icons[w.type]}${w.title}${warningIsNew(w, seen) ? '<span class="tag-neu">neu</span>' : ''}</div>
            <div class="dash-warn-desc">${w.desc}</div>
          </div>
          <button class="btn-secondary" onclick="acknowledgeWarning(${jsArg(w.student.id)}, ${jsArg(w.type)}, ${w.count})">Erledigt</button>
        </div>`;
    });
    html += `</div></details>`;
  });
  return html + `</div></section>`;
}

window.acknowledgeWarning = function(studentId, type, count) {
  if (!db.acknowledgedWarnings) db.acknowledgedWarnings = {};
  const range = runningHalf(), base = warningAckBase(studentId, type, range);   // laufendes Halbjahr (Y7)
  db.acknowledgedWarnings[base] = count; // Anzahl: lesen auch ältere App-Versionen
  db.acknowledgedWarnings[`${base}_at`] = formatDate(new Date());   // Quittung gilt nur in diesem Schuljahr (AR2)
  const s = Object.values(db.students).flat().find(x => x && x.id === studentId);
  if (s) db.acknowledgedWarnings[`${base}_sig`] = warningSignature(s, type, range);
  if (s && type === 'grade') {
    const groupId = Object.keys(db.students).find(g => (db.students[g] || []).includes(s));
    const avg = calculateStudentAverage(s, groupId, range);
    if (avg !== null) db.acknowledgedWarnings[`${base}_avg`] = avg;
  }
  saveDB();
  renderDashboard();
};

window.openStudentDetailFromDashboard = function(studentId, groupId, type) {
  closeModal('modal-settings');
  closeGradeForm();
  switchView('classes');
  openGroupStudents(groupId);
  openStudentDetail(studentId);
  if (type === 'absences') {
    switchStudentTab('attendance');
  } else if (type === 'grade') {
    switchStudentTab('grades');
  } else if (type === 'homework') {
    switchStudentTab('homework');
  }
};

// „Ganzes Profil“ gibt es nicht mehr als eigenes Fenster: „Mehr zu …“ im selben Fenster aufklappen (AH28)
window.jumpToStudentDetailFromSeating = function() {
  if (!window.currentSeatingStudent) return;
  setSeatingStudentMore(true);
};
// ▸ zu js/sitzplan.js, Abschnitt „Timer & Stopwatch“
document.addEventListener('click', e => {
  const open = document.querySelector('.tool-pop:not(.hidden)');
  if (!open || open.contains(e.target) || pressStartedIn(open)) return;
  if (e.target.closest && e.target.closest('#btn-tool-timer, #btn-tool-stopwatch')) return;
  closeToolPops();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('.tool-pop:not(.hidden)')) closeToolPops();
});

// App wieder im Vordergrund: sofort die richtige Zeit zeigen, nicht erst beim nächsten Tick
document.addEventListener('visibilitychange', () => { timerTick(); stopwatchTick(); });


// ─── Cloud Sync (E2EE) Implementation ──────────────────────────────────────

// Das Master-Passwort bleibt auf diesem Gerät gespeichert (localStorage). Früher nur im sessionStorage:
// dann fehlte es nach jedem Neustart, und der Sync lief still nicht (BUGS K7). Die Schülerdaten liegen
// auf dem Gerät ohnehin unverschlüsselt, das Passwort schützt nur die Kopie in der Cloud.
const MASTER_PASSWORD_KEY = 'sync_master_password';
function loadSavedMasterPassword() {
  try {
    let pwd = localStorage.getItem(MASTER_PASSWORD_KEY);
    if (!pwd) {
      pwd = sessionStorage.getItem(MASTER_PASSWORD_KEY); // aus einer älteren Version übernehmen
      if (pwd) storeMasterPassword(pwd);
    }
    return pwd || '';
  } catch (e) {
    return '';
  }
}
// Ein zweimal eingegebenes neues Master-Passwort gilt auch nach einem Neustart als bestätigt. Sonst wartete der
// erste Upload in die leere Cloud still auf eine Bestätigung, die längst gegeben war (BUGS T2).
const MASTER_PASSWORD_CONFIRMED_KEY = 'sync_master_password_confirmed';
function storeMasterPassword(pwd) {
  try {
    if (localStorage.getItem(MASTER_PASSWORD_KEY) !== pwd) localStorage.removeItem(MASTER_PASSWORD_CONFIRMED_KEY);
    sessionStorage.removeItem(MASTER_PASSWORD_KEY);
    if (pwd) localStorage.setItem(MASTER_PASSWORD_KEY, pwd);
    else localStorage.removeItem(MASTER_PASSWORD_KEY);
  } catch (e) { /* kein Speicher: gilt dann nur bis zum Neustart */ }
}

// Initialisiert die Synchronisierung beim Laden der App
function initSync() {
  // 1. Initialisiere den SyncManager mit der fest verbauten FIREBASE_CONFIG
  if (typeof FIREBASE_CONFIG !== 'undefined') {
    const success = SyncManager.init(FIREBASE_CONFIG);
    if (success) {
      // Gespeichertes Passwort wiederherstellen, auch nach einem Neustart der App
      const savedPassword = loadSavedMasterPassword();
      if (savedPassword) {
        SyncManager.setMasterPassword(savedPassword);
        const passInput = document.getElementById('sync-master-password');
        if (passInput) passInput.value = savedPassword;
      }
    }
  }

  // 2. Setze Callbacks im SyncManager
  SyncManager.callbacks.onAuthStateChanged = (user) => {
    updateSyncUI();
    if (user && SyncManager.masterPassword) {
      // Automatischer Hintergrund-Sync bei Login
      triggerSyncInternal();
    } else if (user) {
      // Angemeldet, aber (noch) kein Master-Passwort auf diesem Gerät: Bescheid geben (BUGS K7)
      showToast('Cloud-Sync pausiert: bitte Master-Passwort in den Einstellungen eingeben', 'error');
    }
  };

  // Zurück in der App bzw. wieder online: gleich abgleichen, nicht erst bei der nächsten Eingabe.
  // Sonst trägt man morgens auf dem iPad ein, was abends am Laptop geändert wurde → Konflikt (BUGS K6).
  // Beim Verlassen (iPad zuklappen, App wechseln) eine noch wartende Eingabe sofort übertragen: Im Hintergrund
  // läuft der 3-s-Timer nicht, und am nächsten Morgen gäbe es sonst einen Konflikt (BUGS P8).
  // (Das Verlassen selbst behandelt onAppHidden, auch ohne Cloud-Sync.)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) triggerSyncInternal(); });
  window.addEventListener('online', () => { updateSyncIndicator(); triggerSyncInternal(); });
  window.addEventListener('offline', () => updateSyncIndicator());

  SyncManager.callbacks.onSyncStatusChanged = (status) => {
    noteSyncStatus(status);   // kleine Anzeige in Leiste und Dashboard (AN1)
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;
    if (status === 'checking') {
      badge.textContent = 'Status: Prüfe …';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
    } else if (status === 'synced') {
      badge.textContent = 'Status: Synchronisiert';
      badge.style.background = 'var(--success-soft)';
      badge.style.color = 'var(--success)';
    } else if (status === 'conflict') {
      badge.textContent = 'Status: Konflikt';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else if (status === 'confirm_password') {
      badge.textContent = 'Status: Wartet auf Bestätigung des Master-Passworts';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
    } else if (status === 'error') {
      badge.textContent = 'Status: Fehler';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else {
      badge.textContent = 'Status: Bereit';
      badge.style.background = 'var(--bg-card)';
      badge.style.color = 'var(--text-primary)';
    }
  };

  // Konflikte meldet triggerSyncInternal selbst (showSyncConflict), erst nachdem es geprüft hat, dass die
  // DB während des Syncs nicht ersetzt wurde. Über den Rückruf des SyncManagers ging das Fenster auch für
  // eine inzwischen geleerte DB auf, und „Dieses Gerät hochladen“ leerte die Cloud (BUGS P4).
  SyncManager.callbacks.onConflictDetected = null;

  // 3. UI updaten
  updateSyncUI();
}

// Aktualisiert das UI basierend auf Firebase- und Auth-Status
function updateSyncUI() {
  const userStatus = document.getElementById('sync-user-status');
  const loginForm = document.getElementById('sync-login-form');
  const loggedInPanel = document.getElementById('sync-logged-in-panel');
  const cryptoSection = document.getElementById('sync-crypto-section');
  const lastTimeEl = document.getElementById('sync-last-time');

  if (!userStatus) return; // Falls DOM noch nicht bereit
  updateSyncAttention();
  updateSyncIndicator();

  // Benutzer angemeldet?
  const clearEverywhere = document.getElementById('btn-clear-everywhere');
  if (clearEverywhere) clearEverywhere.classList.toggle('hidden', !SyncManager.currentUser);
  if (!SyncManager.currentUser && accountDeleteChoice) cancelDeleteAccount();
  if (SyncManager.currentUser) {
    userStatus.textContent = `Angemeldet als: ${SyncManager.currentUser.email}`;
    loginForm.classList.add('hidden');
    loggedInPanel.classList.remove('hidden');
    cryptoSection.classList.remove('hidden');
    
    // Letzter Abgleich dieses Geräts. Die Versionskennung der Cloud ist die Uhrzeit des Geräts, das zuletzt
    // hochgeladen hat – nach einem Abgleich stand dort sonst z. B. „vor 10 Tagen“ (BUGS P10).
    const ss = db.syncSettings;
    if (ss && ss.lastSyncCheck) {
      lastTimeEl.textContent = `Zuletzt synchronisiert: ${new Date(ss.lastSyncCheck).toLocaleString('de-DE')}`;
    } else if (ss && ss.lastSyncedCloudTimestamp) {
      lastTimeEl.textContent = `Cloud-Stand vom ${new Date(ss.lastSyncedCloudTimestamp).toLocaleString('de-DE')}`;
    } else {
      lastTimeEl.textContent = 'Noch nie synchronisiert';
    }
  } else {
    userStatus.textContent = 'Nicht angemeldet';
    loginForm.classList.remove('hidden');
    loggedInPanel.classList.add('hidden');
    cryptoSection.classList.add('hidden');
  }
}

// E-Mail Login
function loginEmail() {
  const email = document.getElementById('sync-email').value.trim();
  const password = document.getElementById('sync-password').value.trim();
  if (!email || !password) return;

  SyncManager.loginWithEmail(email, password)
    .then(() => {
      showToast('Erfolgreich eingeloggt ✓');
      document.getElementById('sync-email').value = '';
      document.getElementById('sync-password').value = '';
    })
    .catch(err => {
      // Auch ein gelöschtes Konto (BUGS Z2) landet hier; Firebase unterscheidet das nicht immer von einem falschen Passwort
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err && err.code)) {
        alert('Anmeldung fehlgeschlagen: E-Mail oder Passwort stimmen nicht, oder das Konto wurde gelöscht.\n\nDie Daten auf diesem Gerät sind davon nicht betroffen.');
      } else {
        alert('Fehler beim Login: ' + err.message);
      }
    });
}

// E-Mail Registrierung
function registerEmail() {
  const email = document.getElementById('sync-email').value.trim();
  const password = document.getElementById('sync-password').value.trim();
  if (!email || !password) return;

  if (password.length < 6) {
    alert('Das Passwort muss mindestens 6 Zeichen lang sein.');
    return;
  }

  SyncManager.registerWithEmail(email, password)
    .then(() => {
      showToast('Konto angelegt, du bist angemeldet ✓');
      document.getElementById('sync-email').value = '';
      document.getElementById('sync-password').value = '';
    })
    .catch(err => {
      alert('Fehler bei der Registrierung: ' + err.message);
    });
}

// Google Login
function loginGoogle() {
  SyncManager.loginWithGoogle()
    .then(() => {
      showToast('Erfolgreich mit Google angemeldet ✓');
    })
    .catch(err => {
      alert('Fehler bei der Google-Anmeldung: ' + err.message);
    });
}

// Logout. Die Daten bleiben sonst auf dem Gerät; am geteilten PC landeten sie beim nächsten Konto (BUGS T6).
async function logoutSync() {
  let answer = 'keep';
  if (!isLocalDBEmpty()) {
    const unsynced = isLocalDBChanged();
    answer = await askChoice('Abmelden',
      'Sollen deine Daten (Klassen, Schüler, Noten) auf diesem Gerät bleiben?\n\n'
      + 'Eigenes Gerät: behalten. Geteiltes oder fremdes Gerät: löschen. In der Cloud bleiben sie erhalten.'
      + (unsynced ? '\n\n⚠️ Die letzten Änderungen sind noch nicht in der Cloud. Beim Löschen gehen sie verloren.' : ''),
      [{ label: 'Abmelden, Daten behalten', value: 'keep', primary: true },
       { label: 'Abmelden und Daten von diesem Gerät löschen', value: 'delete', danger: true }]);
    if (!answer) return;
    if (answer === 'delete' && unsynced && !confirm('Wirklich löschen? Die letzten Änderungen sind nicht in der Cloud und gehen verloren.\n\nTipp: Vorher „Jetzt synchronisieren“.')) return;
  }
  await SyncManager.logout();
  forgetCloudLogin();
  if (answer === 'delete') {
    wipeLocalData();
    showToast('Abgemeldet, Daten auf diesem Gerät gelöscht.');
  } else {
    showToast('Ausgeloggt.');
  }
}

// Nach dem Abmelden: Master-Passwort und Kontowahl dieses Geräts vergessen
function forgetCloudLogin() {
  storeMasterPassword('');
  SyncManager.setMasterPassword('');
  foreignAccountAccepted = '';
  updateSyncAttention();
  const passInput = document.getElementById('sync-master-password');
  if (passInput) passInput.value = '';
}

// ─── Cloud-Konto löschen (BUGS Z2) ────────────────────────────────────────
// Cloud-Daten und Anmelde-Konto löschen (Recht auf Löschung, Nutzer hört auf). Firebase verlangt dafür eine
// frische Anmeldung; die passiert vorher, damit nicht die Cloud leer ist, das Konto aber bleibt.
let accountDeleteChoice = null;   // 'keep' | 'delete': Daten auf diesem Gerät behalten oder löschen
let accountDeletePending = '';   // uid: Cloud-Daten schon gelöscht, Anmelde-Konto noch nicht (AP12)
let accountDeleting = false;      // eigene Löschung läuft: die Markierung in der Cloud ist kein fremdes Ereignis
async function startDeleteAccount() {
  if (!SyncManager.currentUser) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    alert('Dafür braucht es eine Internetverbindung. Es wurde nichts gelöscht.');
    return;
  }
  const hasData = !isLocalDBEmpty();
  const answer = await askChoice('Cloud-Konto löschen',
    `Deine Daten in der Cloud und dein Anmelde-Konto (${SyncManager.currentUser.email || 'Cloud-Konto'}) werden endgültig gelöscht. `
    + 'Deine anderen Geräte können danach nicht mehr synchronisieren; was dort gespeichert ist, bleibt dort.'
    + (hasData ? '\n\nSollen die Daten auf DIESEM Gerät bleiben? Tipp: Vorher exportieren.' : ''),
    hasData
      ? [{ label: 'Konto löschen, Daten auf diesem Gerät behalten', value: 'keep', primary: true },
         { label: 'Konto und Daten auf diesem Gerät löschen', value: 'delete', danger: true }]
      : [{ label: 'Konto löschen', value: 'keep', danger: true }]);
  if (!answer || !SyncManager.currentUser) return;
  accountDeleteChoice = answer;
  const pwGroup = document.getElementById('sync-delete-account-password-group');
  pwGroup.classList.toggle('hidden', !SyncManager.usesPasswordLogin());
  document.getElementById('sync-delete-account-group').classList.remove('hidden');
  if (SyncManager.usesPasswordLogin()) document.getElementById('sync-delete-account-password').focus();
}
function cancelDeleteAccount() {
  accountDeletePending = '';
  accountDeleteChoice = null;
  document.getElementById('sync-delete-account-group').classList.add('hidden');
  document.getElementById('sync-delete-account-password').value = '';
}
async function confirmDeleteAccount() {
  const choice = accountDeleteChoice;
  if (!choice || !SyncManager.currentUser) return;
  const password = document.getElementById('sync-delete-account-password').value;
  if (SyncManager.usesPasswordLogin() && !password) { showToast('Bitte das Anmelde-Passwort eingeben', 'error'); return; }
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  if (choice === 'delete' && isLocalDBChanged() && !isLocalDBEmpty()
      && !confirm('Die letzten Änderungen auf diesem Gerät sind nicht in der Cloud. Sie gehen beim Löschen verloren.\n\nTrotzdem löschen?')) return;
  syncRunning = true;
  accountDeleting = true;
  try {
    try {
      await SyncManager.reauthenticate(password);
    } catch (e) {
      const wrong = ['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e && e.code);
      const half = accountDeletePending === SyncManager.currentUser.uid;
      alert((wrong ? '❌ Das Anmelde-Passwort stimmt nicht.' : '❌ Anmeldung nicht bestätigt: ' + e.message)
        + (half ? '\n\nDeine Cloud-Daten sind schon gelöscht, nur das Anmelde-Konto noch nicht. Bitte noch einmal versuchen.' : '\n\nEs wurde nichts gelöscht.'));
      return;
    }
    try {
      // vorher: nach dem Löschen des Kontos darf niemand mehr ihre Dokumente löschen (AJ1, AT5)
      if (!(await deleteAllStudentShares())) throw new Error('Die Seiten der Schülerapp ließen sich nicht alle löschen (keine Verbindung?)');
      await SyncManager.deleteAccount();
    } catch (e) {
      if (e && e.name === 'AccountHalfDeletedError') {   // Markierung steht, Anmelde-Konto nicht gelöscht: Formular bleibt offen (AP12)
        accountDeletePending = SyncManager.currentUser ? SyncManager.currentUser.uid : '';
        alert('❌ Deine Cloud-Daten sind schon gelöscht, nur das Anmelde-Konto noch nicht.\n\n'
          + 'Bitte mit Internet noch einmal „Konto endgültig löschen“ tippen. Die Daten auf diesem Gerät sind unverändert.');
        return;
      }
      alert('❌ Das Konto konnte nicht gelöscht werden: ' + e.message
        + '\n\nBitte noch einmal versuchen. Die Daten auf diesem Gerät sind unverändert.');
      return;
    }
    accountDeletePending = '';
    cancelDeleteAccount();
    forgetCloudLogin();
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    if (choice === 'delete') {
      wipeLocalData();
    } else if (db.syncSettings) {
      // Kein Sync-Stand mehr: Mit einem neuen Konto zählen die Daten wie „nie synchronisiert“
      delete db.syncSettings;
      persistDB();
    }
    try { await SyncManager.logout(); } catch (e) { /* Konto ist ohnehin weg */ }
    SyncManager.updateStatus('idle');
    updateSyncUI();
    showToast(choice === 'delete' ? 'Cloud-Konto und Daten auf diesem Gerät gelöscht.' : 'Cloud-Konto gelöscht. Die Daten auf diesem Gerät bleiben.');
  } finally {
    syncRunning = false;
    accountDeleting = false;
    syncQueued = false; // ohne Konto gibt es nichts mehr abzugleichen
  }
}

// Das Konto wurde auf einem anderen Gerät gelöscht (Markierung in der Cloud) oder Firebase kennt es nicht mehr:
// abmelden, Daten bleiben – statt eines rätselhaften Sync-Fehlers nach jeder Eingabe (BUGS Z2).
async function handleAccountDeleted() {
  const user = SyncManager.currentUser;
  if (accountDeleting || !user || accountDeletePending === user.uid) return;   // eigene, noch nicht fertige Löschung (AP12)
  // Gibt es das Anmelde-Konto noch, ist eine Löschung nicht fertig geworden: anbieten, sie abzuschließen (AP12)
  let stillThere = false;
  if (typeof user.reload === 'function') { try { await user.reload(); stillThere = true; } catch (e) { stillThere = false; } }
  if (stillThere) {
    const answer = await askChoice('Konto löschen nicht fertig',
      'Deine Cloud-Daten sind gelöscht, das Anmelde-Konto gibt es aber noch. Das Löschen ist nicht fertig geworden.\n\nJetzt abschließen?',
      [{ label: 'Jetzt abschließen', value: 'finish', primary: true }]);
    if (answer === 'finish' && SyncManager.currentUser === user) { accountDeletePending = user.uid; startDeleteAccount(); return; }
  }
  if (SyncManager.currentUser !== user) return;
  try { await SyncManager.logout(); } catch (e) { /* ohnehin abgemeldet */ }
  forgetCloudLogin();
  if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
  SyncManager.updateStatus('idle');
  updateSyncUI();
  alert('Dein Cloud-Konto wurde gelöscht (z. B. auf einem anderen Gerät).\n\n'
    + 'Die Daten auf diesem Gerät bleiben erhalten, der Cloud-Sync ist aus und du bist abgemeldet.');
}
const ACCOUNT_GONE_CODES = ['auth/user-not-found', 'auth/user-token-expired', 'auth/user-disabled'];

// Master-Passwort übernehmen (onchange, nicht bei jedem Tastendruck).
// Direkt danach wird synchronisiert – dabei prüft der SyncManager, ob das Passwort
// die Cloud-Daten entschlüsseln kann, bevor irgendetwas hochgeladen wird.
function updateMasterPassword(pwd) {
  cancelNewCloudPassword();
  SyncManager.setMasterPassword(pwd);
  storeMasterPassword(pwd);
  updateSyncAttention();
  if (pwd && SyncManager.currentUser) triggerSyncInternal({ manual: true });
}

// Falsches Passwort wieder vergessen, damit kein weiterer Sync damit läuft.
function rejectMasterPassword() {
  SyncManager.setMasterPassword('');
  storeMasterPassword('');
  const passInput = document.getElementById('sync-master-password');
  if (passInput) passInput.value = '';
  updateSyncAttention();
}

// Erstes Master-Passwort (Cloud noch leer): erst hochladen, wenn es ein zweites Mal gleich eingegeben wurde.
// Sonst verschlüsselt ein Tippfehler die Cloud, und kein Gerät kommt mehr an die Daten (BUGS K8).
let confirmedNewCloudPassword = '';
function showNewPasswordConfirm() {
  const group = document.getElementById('sync-master-password-confirm-group');
  if (!group) return;
  group.classList.remove('hidden');
  updateSyncAttention();
  updateSyncIndicator();   // AP14
}
function cancelNewCloudPassword() {
  const group = document.getElementById('sync-master-password-confirm-group');
  if (!group) return;
  group.classList.add('hidden');
  document.getElementById('sync-master-password-confirm').value = '';
  updateSyncAttention();
  updateSyncIndicator();   // AP14
}
function confirmNewMasterPassword(pwd) {
  if (!pwd) return;
  cancelNewCloudPassword();
  if (pwd !== SyncManager.masterPassword) {
    rejectMasterPassword();
    alert('❌ Die beiden Passwörter stimmen nicht überein.\n\nEs wurde nichts hochgeladen. Bitte das Master-Passwort neu festlegen.');
    return;
  }
  rememberNewCloudPasswordConfirmed(pwd);
  triggerSyncInternal({ manual: true });
}
function rememberNewCloudPasswordConfirmed(pwd) {
  confirmedNewCloudPassword = pwd;
  try { if (localStorage.getItem(MASTER_PASSWORD_KEY) === pwd) localStorage.setItem(MASTER_PASSWORD_CONFIRMED_KEY, '1'); } catch (e) { /* gilt dann bis zum Neustart */ }
}
function newCloudPasswordConfirmed() {
  const pwd = SyncManager.masterPassword;
  if (!pwd) return false;
  if (confirmedNewCloudPassword === pwd) return true;
  try {
    return localStorage.getItem(MASTER_PASSWORD_CONFIRMED_KEY) === '1' && localStorage.getItem(MASTER_PASSWORD_KEY) === pwd;
  } catch (e) { return false; }
}

// ─── Master-Passwort vergessen oder ändern (BUGS P9) ──────────────────────
// Ohne diesen Weg war ein vergessenes Master-Passwort eine Sackgasse: jeder Sync meldete „falsches Passwort“.
// Die Cloud wird mit den Daten dieses Geräts und einem neuen, zweimal eingegebenen Passwort überschrieben.
async function startCloudPasswordReset() {
  if (!SyncManager.currentUser) return;
  if (isLocalDBEmpty()) {
    alert('Auf diesem Gerät sind keine Daten. Die Cloud damit zu überschreiben, würde alles löschen.\n\nBitte auf dem Gerät ausführen, auf dem deine Daten sind.');
    return;
  }
  // Daten eines anderen Kontos (T6) gingen sonst ohne Frage in diese Cloud (AP3)
  if (hasForeignAccountData() && !(await acceptForeignAccountData())) return;
  const answer = await askChoice('Master-Passwort neu festlegen',
    'Die Cloud wird mit den Daten DIESES Geräts und einem neuen Master-Passwort überschrieben.\n\n'
    + 'Was nur in der Cloud liegt (Änderungen anderer Geräte, die hier noch fehlen), geht dabei verloren. '
    + 'Kennst du das alte Passwort noch, vorher „Jetzt synchronisieren“.\n\nAndere Geräte fragen danach nach dem neuen Passwort.',
    [{ label: 'Neues Passwort festlegen', value: 'reset', danger: true }]);
  if (answer !== 'reset') return;
  document.getElementById('sync-reset-group').classList.remove('hidden');
  document.getElementById('sync-reset-password').focus();
}
function cancelCloudPasswordReset() {
  document.getElementById('sync-reset-group').classList.add('hidden');
  document.getElementById('sync-reset-password').value = '';
  document.getElementById('sync-reset-password-confirm').value = '';
}
async function confirmCloudPasswordReset() {
  const pwd = document.getElementById('sync-reset-password').value;
  const again = document.getElementById('sync-reset-password-confirm').value;
  if (!pwd) { showToast('Bitte ein neues Master-Passwort eingeben', 'error'); return; }
  if (pwd !== again) {
    alert('❌ Die beiden Passwörter stimmen nicht überein.\n\nEs wurde nichts geändert.');
    return;
  }
  if (isLocalDBEmpty()) { alert('Auf diesem Gerät sind keine Daten. Es wurde nichts geändert.'); return; }
  if (hasForeignAccountData()) { cancelCloudPasswordReset(); startCloudPasswordReset(); return; }   // AP3
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  syncRunning = true;
  const dbAtStart = db;
  const localModified = db.settings.lastModified;
  try {
    const written = JSON.stringify(db);
    const newTimestamp = await SyncManager.overwriteCloud(written, pwd);
    storeMasterPassword(pwd);
    rememberNewCloudPasswordConfirmed(pwd);
    cancelNewCloudPassword();
    const passInput = document.getElementById('sync-master-password');
    if (passInput) passInput.value = pwd;
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    if (db === dbAtStart) { markSynced(newTimestamp, localModified); saveSyncBase(newTimestamp, written); } // sonst: DB inzwischen ersetzt (Regel 32); Basis: AP11
    SyncManager.updateStatus('synced'); // sonst stand noch „Konflikt!“ da (BUGS T9)
    cancelCloudPasswordReset();
    updateSyncAttention();
    updateSyncUI();
    warnIfCloudNearlyFull();
    showToast('Cloud mit neuem Master-Passwort gespeichert ✓');
  } catch (e) {
    if (e.name === 'CloudChangedError') alert('Gerade hat ein anderes Gerät hochgeladen. Es wurde nichts geändert. Bitte noch einmal versuchen.');
    else if (e.name === 'CloudTooLargeError') showSyncProblem(e, true);
    else alert('Fehler: ' + e.message);
  } finally {
    syncRunning = false;
    if (syncQueued) { syncQueued = false; triggerSyncInternal(); }
  }
}

// Anmelde-Passwort (Firebase-Konto) vergessen: Mail zum Zurücksetzen
async function resetLoginPassword() {
  const email = document.getElementById('sync-email').value.trim();
  if (!email) { showToast('Bitte zuerst die E-Mail-Adresse eingeben', 'error'); return; }
  try {
    await SyncManager.sendLoginPasswordReset(email);
    alert('📧 Falls es zu ' + email + ' ein Konto gibt, kommt gleich eine E-Mail zum Zurücksetzen des Anmelde-Passworts.\n\nDas Master-Passwort ist davon nicht betroffen.');
  } catch (e) {
    alert('Fehler: ' + e.message);
  }
}

// Angemeldet, aber der Sync läuft nicht (kein Master-Passwort, oder es wartet auf Bestätigung):
// Punkt am Menüpunkt „Einstellungen“, sonst fällt das niemandem auf (BUGS K7).
function syncNeedsAttention() {
  if (!SyncManager.isInitialized || !SyncManager.currentUser) return false;
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  return !SyncManager.masterPassword || !!(confirmGroup && !confirmGroup.classList.contains('hidden'));
}
// ─── Sync-Stand klein und immer sichtbar (AN1) ─────────────────────────────
// iPad/Laptop: zweite Zeile unter „Einstellungen“ in der Leiste (eingeklappt nur ein Punkt bei Problemen), Handy: im
// Dashboard neben dem Zahnrad und ein Punkt am Dashboard-Menüpunkt bei Problemen. Ohne Cloud-Anmeldung nichts.
// Letzter erfolgreicher Kontakt nur auf dem Gerät (`sync_last_ok`, nie in db): Ein Abgleich ohne Änderungen schreibt
// lastSyncCheck nicht, das Gerät war trotzdem auf dem neuesten Stand.
let syncStatusNow = 'idle';
const SYNC_LAST_OK_KEY = 'sync_last_ok';
function noteSyncStatus(status) {
  syncStatusNow = status;
  if (status === 'synced') { try { localStorage.setItem(SYNC_LAST_OK_KEY, String(Date.now())); } catch (e) { /* privat: nur ohne Merken */ } }
  updateSyncIndicator();
}
function lastSyncOkTime() {
  let t = 0;
  try { t = Number(localStorage.getItem(SYNC_LAST_OK_KEY)) || 0; } catch (e) { t = 0; }
  const check = Number(db.syncSettings && db.syncSettings.lastSyncCheck) || 0;
  return Math.max(t, check) || null;
}
// „heute 10:42“, „gestern 18:05“, „Mo., 09.11.“
function syncWhenText(ts, now = new Date()) {
  if (!ts) return '';
  const d = new Date(ts), ds = formatDate(d), today = formatDate(now);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (ds === today) return `heute ${time}`;
  if (ds === formatDate(addDays(parseDate(today), -1))) return `gestern ${time}`;
  return formatWeekdayShort(ds);
}
// Zustand für die Anzeige: { kind: ok|busy|offline|wait|problem, icon, head, detail, short, long } oder null (ohne Cloud).
// Leiste zweizeilig (head / detail, sonst abgeschnitten), Handy kurz (short), Titel und VoiceOver ganz (long).
function syncStateInfo(now = new Date()) {
  if (typeof SyncManager === 'undefined' || !SyncManager.currentUser) return null;
  const when = syncWhenText(lastSyncOkTime(), now);
  const changed = isLocalDBChanged();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const st = (kind, icon, head, detail, short) => ({ kind, icon, head, detail, short, long: detail ? `${head} · ${detail}` : head });
  // Erst „wiederholen“, dann „fehlt“: Das offene Wiederholungsfeld zählt sonst als „Passwort fehlt“ (AP14)
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  if (SyncManager.masterPassword && confirmGroup && !confirmGroup.classList.contains('hidden')) return st('problem', 'alert', 'Sync wartet', 'Passwort wiederholen', 'Sync wartet');
  if (syncNeedsAttention()) return st('problem', 'alert', 'Sync pausiert', 'Passwort fehlt', 'Sync pausiert');
  if (hasForeignAccountData()) return st('problem', 'alert', 'Sync pausiert', 'anderes Konto', 'Sync pausiert');   // T6-Frage offen oder abgebrochen
  if (window.currentConflict || syncStatusNow === 'conflict') return st('problem', 'alert', 'Abgleich offen', 'wartet auf dich', 'Abgleich offen');
  if (syncStatusNow === 'confirm_password') return st('problem', 'alert', 'Sync wartet', 'Passwort wiederholen', 'Sync wartet');
  if (syncStatusNow === 'error') return changed ? st('problem', 'alert', 'Sync-Fehler', 'Änderungen nur hier', 'Sync-Fehler')
    : st('wait', 'alert', 'Sync-Fehler', `Stand ${when || 'unbekannt'}`, 'Sync-Fehler');
  if (offline) return changed ? st('wait', 'cloud-up', 'Offline', 'Änderungen warten', 'Offline · wartet')
    : st('offline', 'cloud', 'Offline', when ? `Stand ${when}` : '', 'Offline');
  if (syncStatusNow === 'checking' || changed) return st('busy', 'refresh', 'Abgleich …', '', 'Abgleich …');
  // „Abgeglichen“ statt „Synchronisiert“: In der 160 px schmalen Leiste wurde das lange Wort auf dem iPad abgeschnitten
  return st('ok', 'check', 'Abgeglichen', when, when ? when.replace(/^heute /, '') : 'Abgeglichen');
}
// „heute/gestern“ im Takt und beim Zurückkommen neu rechnen, auch offline (AP15)
setInterval(() => { if (!document.hidden) updateSyncIndicator(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateSyncIndicator(); });
function updateSyncIndicator() {
  const info = syncStateInfo();
  const kinds = ['ok', 'busy', 'offline', 'wait', 'problem'];
  const alertish = !!info && (info.kind === 'wait' || info.kind === 'problem');
  const fill = (id, html) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !info;
    kinds.forEach(k => el.classList.toggle('is-' + k, !!info && info.kind === k));
    el.innerHTML = info ? html : '';
    if (info) el.title = info.long; else el.removeAttribute('title');
  };
  if (info) {
    fill('nav-sync-state', `${icon(info.icon)}<span class="ss-head">${escHtml(info.head)}</span>${info.detail ? `<span class="ss-detail">${escHtml(info.detail)}</span>` : ''}`);
    fill('dash-sync-state', `${icon(info.icon)}<span>${escHtml(info.short)}</span>`);
  } else { fill('nav-sync-state', ''); fill('dash-sync-state', ''); }
  const nav = document.getElementById('nav-settings');
  if (nav) {
    nav.setAttribute('aria-label', info ? `Einstellungen, ${info.long}` : 'Einstellungen');
    kinds.forEach(k => nav.classList.toggle('sync-' + k, !!info && info.kind === k));
    nav.classList.toggle('has-sync', !!info);   // feste Höhe, sonst springt „Einstellungen“ bei jedem Zustand
  }
  // Handy: Punkt am Dashboard-Menüpunkt nur, wenn etwas nicht stimmt (offline mit Wartendem, Fehler)
  document.getElementById('nav-dashboard')?.classList.toggle('sync-alert', alertish);
}
// Einstellungen aus der Leiste: bei einem Sync-Problem gleich „Daten & Cloud“
function openSettingsFromNav() {
  openSettings();
  const info = syncStateInfo();
  if (info && (info.kind === 'wait' || info.kind === 'problem')) showSettingsPane('data');
}

function updateSyncAttention() {
  const needs = syncNeedsAttention();
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  const title = needs && SyncManager.masterPassword && confirmGroup && !confirmGroup.classList.contains('hidden')
    ? 'Cloud-Sync wartet: Master-Passwort in den Einstellungen bitte noch einmal eingeben'
    : needs ? 'Cloud-Sync pausiert: Master-Passwort in den Einstellungen eingeben' : '';
  // Menüpunkt (iPad/Laptop) und Zahnrad im Dashboard (Handy, AH21)
  document.querySelector('#modal-settings .set-rail [data-pane="data"]')?.classList.toggle('needs-attention', needs);
  ['nav-settings', 'btn-settings-dashboard'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('needs-attention', needs);
    if (title) btn.title = title; else btn.removeAttribute('title');
  });
}

// Triggert den Sync-Prozess
function triggerManualSync() {
  if (!SyncManager.masterPassword) {
    alert('Bitte gib zuerst dein Master-Passwort ein.');
    return;
  }
  if (window.currentConflict) {
    openModal('modal-sync-conflict');
    return;
  }
  triggerSyncInternal({ manual: true });
}

// Enthält dieses Gerät überhaupt Daten? (Neues Gerät oder nach „Alle Daten löschen“)
function isLocalDBEmpty() {
  const hasStudents = db.students && Object.values(db.students).some(list => list && list.length);
  // Aufsichten und Ferien sind auch Eingaben: Ein Gerät nur damit darf beim Anmelden nicht still überschrieben werden (R7)
  const hasOther = (Array.isArray(db.supervisions) && db.supervisions.length > 0)
    || (db.settings && Array.isArray(db.settings.holidays) && db.settings.holidays.length > 0)
    || todosOf().length > 0;   // Merkzettel (AH18)
  return !(db.groups && db.groups.length) && !(db.lessonSlots && db.lessonSlots.length) && !hasStudents && !hasOther;
}

// Letzter gemeinsamer Stand mit der Cloud DIESES Kontos, sonst null. Ein anderes Konto (Abmelden, mit
// zweitem Konto anmelden) zählt wie „nie synchronisiert“: Konflikt statt stillem Pull (BUGS P7).
// Alte Stände ohne `uid` gelten als zum angemeldeten Konto gehörig.
function syncBaseline() {
  const s = db.syncSettings;
  if (!s || s.lastSyncedCloudTimestamp === undefined || s.lastSyncedCloudTimestamp === null) return null;
  const user = SyncManager.currentUser;
  if (s.uid && user && s.uid !== user.uid) return null;
  return s;
}

// Leer UND nie synchronisiert: neues Gerät, „Alle Daten löschen“, unlesbarer Speicherstand. So ein Gerät
// lädt nie hoch, sonst wäre die Cloud leer (A2, K1). Wer dagegen alle Klassen einzeln gelöscht hat, hat einen
// Sync-Stand – diese Löschung soll in die Cloud, sonst kämen die Schülerdaten zurück (BUGS P6).
function isFreshEmptyDB() {
  return isLocalDBEmpty() && !syncBaseline();
}

// Hat der Nutzer seit dem letzten erfolgreichen Sync etwas geändert?
// Verglichen wird nur auf Gleichheit – die Uhrzeit anderer Geräte spielt keine Rolle.
function isLocalDBChanged() {
  const s = db.syncSettings || {};
  return !('syncedLocalModified' in s) || s.syncedLocalModified !== db.settings.lastModified;
}

// Merkt sich, welcher lokale und welcher Cloud-Stand zuletzt übereinstimmten.
function markSynced(cloudTimestamp, localModified) {
  if (!db.syncSettings) db.syncSettings = {};
  db.syncSettings.lastSyncedCloudTimestamp = cloudTimestamp;
  db.syncSettings.syncedLocalModified = localModified;
  db.syncSettings.lastSyncCheck = Date.now();
  if (SyncManager.currentUser) db.syncSettings.uid = SyncManager.currentUser.uid;
  delete db.syncSettings.pendingUpload;
  persistDB();
}

// Prüfsumme eines Datenstands (für den versuchten Upload, BUGS T4)
async function contentHash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Vergleichbarer Inhalt eines Stands: ohne Änderungszeitpunkt und Sync-Metadaten.
function comparableContent(data) {
  const copy = migrateDB(JSON.parse(JSON.stringify(data)));
  delete copy.syncSettings;
  if (copy.settings) delete copy.settings.lastModified;
  return JSON.stringify(copy);
}

// Stimmt der Cloud-Stand inhaltlich mit dem lokalen überein? Dann ist ein „Konflikt“ keiner.
function cloudMatchesLocal(cloudDataString, localDataString) {
  try {
    return comparableContent(JSON.parse(cloudDataString)) === comparableContent(JSON.parse(localDataString));
  } catch (e) {
    return false;
  }
}

// Warnt, wenn die Cloud-Sicherung sich dem Firestore-Limit nähert (höchstens einmal pro Sitzung).
let cloudSizeWarned = false;
function warnIfCloudNearlyFull() {
  const size = SyncManager.lastUploadSize;
  if (cloudSizeWarned || !size || size < CLOUD_WARN_BYTES) return;
  cloudSizeWarned = true;
  alert(`⚠️ Die Cloud-Sicherung ist zu ${Math.round(size / CLOUD_MAX_BYTES * 100)} % voll.\n\nAb 100 % werden Änderungen nicht mehr in die Cloud übertragen. Bitte bald eine Sicherung exportieren und nicht mehr benötigte Klassen löschen.`);
}

// Fehler, die der Nutzer selbst beheben muss (Cloud voll, App veraltet): als Hinweisfenster,
// beim automatischen Sync aber nur einmal pro Sitzung, sonst käme es nach jeder Eingabe.
let syncProblemShown = false;
function showSyncProblem(error, manual) {
  if (!manual && syncProblemShown) return;
  syncProblemShown = true;
  alert('❌ ' + error.message);
}

// Übernimmt einen entschlüsselten Cloud-Stand komplett als lokale Daten.
function applyCloudData(dataString, cloudTimestamp) {
  const parsed = JSON.parse(dataString);
  if (!parsed || !parsed.settings || !parsed.groups || !parsed.students) {
    throw new Error('Die Cloud-Daten haben ein unerwartetes Format und wurden nicht übernommen.');
  }
  const newDB = migrateDB(parsed);
  db = newDB;
  markSynced(cloudTimestamp, db.settings.lastModified);
  saveSyncBase(cloudTimestamp, dataString);
  replaceDB(newDB);
}

// Immer nur ein Sync gleichzeitig. Wird währenddessen ein weiterer angefordert,
// läuft er direkt im Anschluss.
let syncRunning = false;
let syncQueued = false;
let syncAfterModalClose = false; // Cloud-Stand wartet, bis alle Eingabefenster zu sind (BUGS P1)
let syncSlowNoticeMs = 30000;

// Dauert ein Sync ungewöhnlich lange, nur Bescheid geben – nicht abbrechen. Ein abgebrochener Sync schrieb
// trotzdem in die Cloud, ohne dass das Gerät es sich merkte → Konflikt mit den eigenen Daten, und die Sperre
// war frei für einen zweiten, parallelen Sync (BUGS P5).
function noticeSlowSync(promise) {
  const timer = setTimeout(() => showToast('Der Sync dauert ungewöhnlich lange. Bitte Internetverbindung prüfen.', 'error'), syncSlowNoticeMs);
  return promise.finally(() => clearTimeout(timer));
}

// Offene Fenster, deren Inhalt aus `db` stammt (Stunde, Klasse, Schüler, Note, Rückfrage …). Ein Cloud-Stand, der
// jetzt `db` ersetzt, passt nicht mehr zu ihren Feldern; beim Schließen würde z. B. das Stunden-Fenster die
// Notizen des anderen Geräts mit seinen leeren Feldern überschreiben (BUGS P1). Unveränderte Einstellungen werden
// nach dem Pull neu befüllt (replaceDB), der Konflikt-Dialog ist Teil des Syncs.
// Einstellungen zählen nur mit, wenn dort etwas eingetippt ist: Sonst ersetzte der Pull die Eingaben still (BUGS T5).
function inputModalOpen() {
  return [...document.querySelectorAll('.modal-overlay:not(.hidden)')]
    .some(m => m.id === 'modal-settings' ? settingsDirty() : m.id !== 'modal-sync-conflict' && m.id !== 'modal-whats-new' && m.id !== 'modal-seating-today' && m.id !== 'modal-search');   // Suche liest nur (AH19)
}
function syncAfterModalsClosed() {
  if (!syncAfterModalClose || inputModalOpen()) return;
  syncAfterModalClose = false;
  triggerSyncInternal();
}

// Eine Eingabe wartet noch auf den Autosave-Timer: sofort übertragen (App wird verlassen, BUGS P8)
function flushPendingSync() {
  if (!window.syncTimeout) return;
  clearTimeout(window.syncTimeout);
  window.syncTimeout = null;
  triggerSyncInternal();
}

// App wird verlassen (iPad zuklappen, App wechseln). Beendet iOS die App danach, wäre ein offenes Formular
// verloren: Eingetipptes im Stunden-Fenster deshalb schon jetzt übernehmen, das Fenster bleibt offen (BUGS T3).
function onAppHidden() {
  hideAllPasswords();
  if (classGradesShown) { hideClassGrades(); rerenderClassTab(); }
  dashboardOpenGroups.clear();   // „Auffällig“ nach der Pause wieder zugeklappt (AS8)   // Beamer-Schutz: nach der Pause wieder verborgen (AH24 c)
  // Sitzplan genauso: Noten/Verlauf und ein aufgedecktes Schüler-Fenster sind beim Zurückkommen wieder verborgen (AS1)
  if (seatingShowGrades || seatingShowTrend) {
    hideSeatingGrades();
    if (document.getElementById('view-seating')?.classList.contains('active')) renderSeatingPlan();
  }
  if (!document.getElementById('modal-lesson').classList.contains('hidden')) storeLessonForm();
  if (!document.getElementById('modal-seating-student').classList.contains('hidden')) {
    commitSeatingStudentForm();
    if (swShown) setSeatingStudentShown(false);
  }
  if (!document.getElementById('modal-lesson-topic').classList.contains('hidden')) storeLessonTopicForm();
  flushPendingSync();
  if (saPendingAt) sendStudentAppsNow();   // Schülerseiten: was noch wartet, jetzt (AK3) – über einen Abgleich (AT7)
}
document.addEventListener('visibilitychange', () => { if (document.hidden) onAppHidden(); });
window.addEventListener('pagehide', onAppHidden);

// Auf diesem Gerät liegen Daten, die mit einem anderen Konto synchronisiert wurden (BUGS T6). Vor dem ersten
// Abgleich fragen: Sonst landen z. B. am geteilten PC die Schüler von Lehrkraft A im Konto von Lehrkraft B.
let foreignAccountAccepted = '';   // uid, für die der Nutzer „übernehmen“ gewählt hat
let foreignAccountDeclined = '';   // uid, für die er abgebrochen hat: Autosync schweigt, „Jetzt synchronisieren“ fragt wieder
let foreignAccountAsking = false;
function hasForeignAccountData() {
  const s = db.syncSettings, user = SyncManager.currentUser;
  return !!(s && s.uid && user && s.uid !== user.uid && !isLocalDBEmpty() && foreignAccountAccepted !== user.uid);
}
async function askAboutForeignAccountData() {
  if (foreignAccountAsking) return;
  foreignAccountAsking = true;
  const user = SyncManager.currentUser;
  const answer = await askChoice('Daten eines anderen Kontos',
    `Die Daten auf diesem Gerät wurden bisher mit einem anderen Cloud-Konto abgeglichen, nicht mit ${user.email || 'diesem'}.\n\n`
    + '„In dieses Konto übernehmen“ nur, wenn es deine eigenen Daten sind (z. B. Kontowechsel).\n'
    + '„Vom Gerät löschen“: Die Daten verschwinden von diesem Gerät, im anderen Konto bleiben sie erhalten. '
    + 'Danach wird die Cloud dieses Kontos geladen.'
    + (isLocalDBChanged() ? '\n\n⚠️ Die letzten Änderungen auf diesem Gerät sind noch nicht in der anderen Cloud.' : ''),
    [{ label: 'In dieses Konto übernehmen', value: 'adopt' },
     { label: 'Vom Gerät löschen', value: 'discard', danger: true }]);
  foreignAccountAsking = false;
  if (SyncManager.currentUser !== user) return; // inzwischen abgemeldet
  if (answer === 'adopt') {
    foreignAccountAccepted = user.uid;
    triggerSyncInternal({ manual: true });
  } else if (answer === 'discard') {
    wipeLocalData();
    triggerSyncInternal({ manual: true });
  } else {
    foreignAccountDeclined = user.uid;
  }
}

// Vor dem absichtlichen Überschreiben der Cloud: Daten eines anderen Kontos nur nach Zustimmung (AP3).
// true = keine fremden Daten oder „übernehmen“ gewählt.
async function acceptForeignAccountData() {
  if (!hasForeignAccountData()) return true;
  const user = SyncManager.currentUser;
  const answer = await askChoice('Daten eines anderen Kontos',
    `Die Daten auf diesem Gerät wurden bisher mit einem anderen Cloud-Konto abgeglichen, nicht mit ${user.email || 'diesem'}.\n\n`
    + 'Mit dem neuen Passwort kämen sie in die Cloud dieses Kontos. Das nur, wenn es deine eigenen Daten sind (z. B. Kontowechsel).',
    [{ label: 'In dieses Konto übernehmen', value: 'adopt', danger: true }]);
  if (answer !== 'adopt' || SyncManager.currentUser !== user) return false;
  foreignAccountAccepted = user.uid;
  return true;
}

function showSyncConflict(conflictInfo) {
  // Bewusst kein „(aktueller)“: Die Uhren verschiedener Geräte sind nicht vergleichbar.
  const fmt = ts => ts ? new Date(ts).toLocaleString('de-DE') : 'Unbekannt';
  document.getElementById('conflict-local-time').textContent = 'geändert ' + fmt(db.settings.lastModified);
  document.getElementById('conflict-cloud-time').textContent = 'geändert ' + fmt(conflictInfo.cloudTimestamp);
  document.getElementById('conflict-title-text').textContent = 'Zwei Stände';
  document.getElementById('conflict-questions').classList.add('hidden');
  document.getElementById('conflict-whole').classList.remove('hidden');
  fillConflictDifferences(conflictInfo);
  // Solange der Konflikt offen ist, pausiert der automatische Sync (siehe triggerSyncInternal)
  window.currentConflict = conflictInfo;
  openModal('modal-sync-conflict');
}
// Was sich unterscheidet, ohne Namen und Werte (Y10). Klappt es nicht, bleibt das Fenster ohne Liste benutzbar.
function fillConflictDifferences(conflictInfo) {
  const box = document.getElementById('conflict-differences');
  let lines = [];
  try { lines = describeDifferences(db, migrateDB(JSON.parse(conflictInfo.cloudData))); } catch (e) { lines = []; }
  box.classList.toggle('hidden', !lines.length);
  box.innerHTML = lines.length ? `<strong>Das unterscheidet sich:</strong><ul>${lines.map(l => `<li>${escHtml(l)}</li>`).join('')}</ul>` : '';
}

// ─── Drei-Wege-Abgleich: Speicher und Ablauf (AH4) ───────────────────────────
// Der letzte gemeinsame Stand („Basis“) und die Stände vor einem Zusammenführen liegen in IndexedDB: nicht in db, nicht in
// der Cloud, und localStorage wäre dafür zu knapp. Fehlt etwas oder passt die Basis nicht zur Versionskennung, gibt es
// einfach das Fenster mit dem ganzen Stand; darum darf jeder Schritt hier scheitern, ohne Daten zu gefährden.
const IDB_TIMEOUT_MS = 10000;
function idbRequest(mode, run) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB fehlt')); return; }
    // Der Speicher kann hängen (ältere iPads). Ohne Zeitgrenze bliebe der ganze Sync bis zum Neuladen stehen.
    const timer = setTimeout(() => reject(new Error('Speicher antwortet nicht')), IDB_TIMEOUT_MS);
    const finish = (fn, value) => { clearTimeout(timer); fn(value); };
    try {
      const open = indexedDB.open('lehrerapp_sync', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => finish(reject, open.error);
      open.onsuccess = () => {
        try {
          const idb = open.result;
          const tx = idb.transaction('kv', mode);
          const req = run(tx.objectStore('kv'));
          tx.oncomplete = () => { idb.close(); finish(resolve, req && req.result); };
          tx.onerror = tx.onabort = () => { idb.close(); finish(reject, tx.error); };
        } catch (e) { finish(reject, e); }
      };
    } catch (e) { finish(reject, e); }
  });
}
let syncStore = {
  get: key => idbRequest('readonly', st => st.get(key)),
  put: (key, value) => idbRequest('readwrite', st => st.put(value, key)),
  clear: () => idbRequest('readwrite', st => st.clear()),
};
const MERGE_BACKUPS_KEY = 'merge_backups', MERGE_BACKUPS_MAX = 3;
let syncBaseSaved = null;   // zuletzt gespeicherte Kennung: Ein Abgleich ohne Änderung schreibt nicht jedes Mal Megabytes
async function saveSyncBase(cloudTimestamp, dataString) {
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  if (!uid || !dataString) return;
  const mark = `${uid}|${cloudTimestamp}`;
  if (syncBaseSaved === mark) return;
  try {
    await syncStore.put(`base_${uid}`, { cloudTimestamp, data: dataString });
    syncBaseSaved = mark;
  } catch (e) { syncBaseSaved = null; console.warn('Gemeinsamer Stand nicht gespeichert:', e.message); }
}
async function readSyncBase(cloudTimestamp) {
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  const rec = uid ? await syncStore.get(`base_${uid}`) : null;
  return rec && rec.cloudTimestamp === cloudTimestamp ? rec.data : null;
}
async function keepMergeBackup(localDataString, cloudDataString, kind = '') {
  const list = (await syncStore.get(MERGE_BACKUPS_KEY)) || [];
  // Dieselben Stände nur einmal, sonst schieben wiederholte offene Fragen ältere aus der Liste
  if (list[0] && list[0].local === localDataString && list[0].cloud === cloudDataString) return;
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  list.unshift({ time: Date.now(), uid, local: localDataString, cloud: cloudDataString, ...(kind ? { kind } : {}) });
  // Der Stand vor dem Schuljahreswechsel (Y6) bleibt, auch wenn danach mehrere Abgleiche kommen
  const kept = list.slice(0, MERGE_BACKUPS_MAX), year = list.find(x => x.kind === 'newYear');
  if (year && !kept.includes(year)) kept.push(year);
  await syncStore.put(MERGE_BACKUPS_KEY, kept);
}
// Nur Stände dieses Kontos anbieten (Abmelden und anderes Konto: Regel 15 gilt auch hier)
async function mergeBackupsOfAccount() {
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  let list = null;
  try { list = await syncStore.get(MERGE_BACKUPS_KEY); } catch (e) { list = null; }
  return (list || []).filter(x => !x.uid || x.uid === uid);
}
// Zusammenführen vorbereiten. Liefert { merged, conflicts } oder null = Fenster mit dem ganzen Stand.
async function prepareMerge(conflictInfo, localDataString, lastSynced) {
  // Auch für das Fenster mit dem ganzen Stand: Dort verwirft man eine Seite
  let backedUp = false;
  try { await keepMergeBackup(localDataString, conflictInfo.cloudData); backedUp = true; } catch (e) { console.warn('Sicherheitsnetz nicht gespeichert:', e.message); }
  if (!backedUp) return null;   // ohne Sicherheitsnetz kein Zusammenführen
  try {
    const baseString = await readSyncBase(lastSynced);
    if (!baseString) return null;
    const parse = str => {
      const d = JSON.parse(str);
      if (!d || !d.settings || !d.groups || !d.students) throw new Error('Unerwartetes Format');
      return migrateDB(d);
    };
    return mergeDB(parse(baseString), parse(localDataString), parse(conflictInfo.cloudData));
  } catch (e) {
    console.warn('Zusammenführen nicht möglich:', e.message);
    return null;
  }
}
// Ergebnis übernehmen: Es gilt als „auf dem Stand der Cloud, lokal geändert“. Der nächste Sync lädt es also auf dem normalen
// Weg hoch (Transaktion, verlorene Antwort); war die Cloud inzwischen weiter, wird von dort aus neu zusammengeführt.
// false: nicht gespeichert (Meldung kam von persistDB), der Stand bleibt wie er war.
async function applyMergedDB(out, conflictInfo) {
  const merged = out.merged;
  finishMerge(merged, out.blockPool);
  const fresh = migrateDB(merged);
  fresh.syncSettings = { ...(db.syncSettings || {}), lastSyncedCloudTimestamp: conflictInfo.cloudTimestamp };
  delete fresh.syncSettings.pendingUpload;
  if (SyncManager.currentUser) fresh.syncSettings.uid = SyncManager.currentUser.uid;
  fresh.settings.lastModified = Math.max(Date.now(), (db.settings.lastModified || 0) + 1);
  // Erst tauschen, dann auf den Speicher warten: Ein await davor ließe eine Lücke, in der Getipptes verloren ginge (Regel 32).
  // Geht das Speichern der Basis schief, passt sie nicht zur Kennung, und es bleibt beim Fenster mit dem ganzen Stand.
  const previous = db;
  db = fresh;
  if (!persistDB()) { db = previous; return false; }   // sonst käme hoch, was das Gerät selbst nicht gespeichert hat
  const saved = saveSyncBase(conflictInfo.cloudTimestamp, conflictInfo.cloudData);
  replaceDB(fresh);
  SyncManager.updateStatus('synced');
  await saved;
  return true;
}
const MERGE_DONE_TEXT = 'Änderungen von diesem Gerät und aus der Cloud zusammengeführt';
async function handleSyncConflict(conflictInfo, at) {
  const out = await prepareMerge(conflictInfo, at.localDataString, at.lastSynced);
  if (db !== at.dbAtStart || db.settings.lastModified !== at.localModified) { syncQueued = true; return; }   // Regel 32
  // Während des Wartens ging ein Eingabefenster auf: Es zeigt den alten Stand und schriebe ihn beim Schließen zurück (P1)
  if (inputModalOpen()) { syncAfterModalClose = true; return; }
  if (!out) { showSyncConflict(conflictInfo); return; }
  if (!out.conflicts.length) {
    if (!await applyMergedDB(out, conflictInfo)) return;
    syncQueued = true;
    showToast(MERGE_DONE_TEXT);
    return;
  }
  showMergeQuestions(conflictInfo, out, at);
}
// Einzelne Fragen statt eines ganzen Stands. Gelöscht gegen geändert steht auf „Behalten“, bis man anders entscheidet.
function showMergeQuestions(conflictInfo, out, at) {
  const answers = out.conflicts.map(q => (q.kind === 'delete' ? 'keep' : null));
  const list = document.getElementById('conflict-question-list');
  list.innerHTML = out.conflicts.map((q, i) => {
    const [a, b] = q.kind === 'delete' ? ['Behalten', 'Löschen'] : [`Dieses Gerät: ${q.localText}`, `Cloud: ${q.cloudText}`];
    const note = q.kind === 'delete' ? (q.deletedOn === 'cloud' ? 'In der Cloud gelöscht, auf diesem Gerät geändert' : 'Auf diesem Gerät gelöscht, in der Cloud geändert') : q.what;
    return `<div class="conflict-q" data-i="${i}"><div class="conflict-q-head"><b>${escHtml(q.title)}</b>${note ? `<span>${escHtml(note)}</span>` : ''}</div>
      <div class="conflict-q-choice" role="group" aria-label="${escHtml(q.title)}"><button type="button" class="btn-secondary" data-side="a" aria-pressed="false">${escHtml(a)}</button><button type="button" class="btn-secondary" data-side="b" aria-pressed="false">${escHtml(b)}</button></div></div>`;
  }).join('');
  const applyBtn = document.getElementById('conflict-apply');
  const show = () => {
    list.querySelectorAll('.conflict-q').forEach(row => {
      const i = Number(row.dataset.i), q = out.conflicts[i];
      const on = answers[i] === null ? null : (answers[i] === 'keep' || answers[i] === 'local') ? 'a' : 'b';
      row.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('is-chosen', btn.dataset.side === on);
        btn.setAttribute('aria-pressed', btn.dataset.side === on ? 'true' : 'false');
      });
      row.dataset.kind = q.kind;
    });
    applyBtn.disabled = answers.some(x => x === null);
  };
  list.querySelectorAll('.conflict-q').forEach(row => {
    const i = Number(row.dataset.i), del = out.conflicts[i].kind === 'delete';
    row.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      answers[i] = btn.dataset.side === 'a' ? (del ? 'keep' : 'local') : (del ? 'delete' : 'cloud');
      show();
    }));
  });
  // „Alle“ gilt nur für Werte. Löschen entscheidet man einzeln, es bleibt beim Behalten, bis man anders wählt.
  const setAll = side => { out.conflicts.forEach((q, i) => { if (q.kind === 'value') answers[i] = side; }); show(); };
  document.getElementById('conflict-all-local').onclick = () => setAll('local');
  document.getElementById('conflict-all-cloud').onclick = () => setAll('cloud');
  document.getElementById('conflict-whole-link').onclick = () => showSyncConflict(conflictInfo);
  applyBtn.onclick = () => confirmMergeAnswers(conflictInfo, out, answers, at);
  document.getElementById('conflict-title-text').textContent = out.conflicts.length === 1 ? 'Eine Frage zum Abgleich' : `${out.conflicts.length} Fragen zum Abgleich`;
  document.getElementById('conflict-whole').classList.add('hidden');
  document.getElementById('conflict-questions').classList.remove('hidden');
  show();
  window.currentConflict = conflictInfo;
  openModal('modal-sync-conflict');
}
async function confirmMergeAnswers(conflictInfo, out, answers, at) {
  if (window.currentConflict !== conflictInfo) return;
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  closeModal('modal-sync-conflict');
  window.currentConflict = null;
  // Inzwischen anderer Stand (anderes Fenster, ersetzte DB): Die Antworten gehören zum alten, also neu prüfen (Regel 32)
  if (inputModalOpen()) { syncAfterModalClose = true; return; }   // neu prüfen, sobald es zu ist (P1)
  if (db === at.dbAtStart && db.settings.lastModified === at.localModified) {
    out.conflicts.forEach((q, i) => q.apply(answers[i]));
    if (!await applyMergedDB(out, conflictInfo)) return;
    showToast(MERGE_DONE_TEXT);
  }
  triggerSyncInternal();
}
// Einstellungen: Stand vor dem letzten Zusammenführen zurückholen. Zählt wie das Laden einer Sicherung (BUGS K9).
async function refreshMergeRestoreButton() {
  const row = document.getElementById('merge-restore-row');
  if (!row) return;
  // Mit Cloud gibt es (ab dem zweiten Tag) auch Cloud-Sicherungen (Z4): dann immer anbieten
  const cloudOn = !!(SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword);
  row.classList.toggle('hidden', !cloudOn && !(await mergeBackupsOfAccount()).length);
  const hint = document.getElementById('cloud-versions-hint');
  if (hint) hint.classList.toggle('hidden', !(cloudOn && SyncManager.versionsProblem === 'rules'));
}
async function restoreMergeBackup() {
  const list = await mergeBackupsOfAccount();
  // Cloud-Sicherungen der letzten 14 Tage dazu (Z4); ohne Anmeldung oder Netz nur die Stände dieses Geräts
  let cloudList = [];
  if (SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword && typeof SyncManager.listCloudVersions === 'function') {
    try { cloudList = await SyncManager.listCloudVersions(); } catch (e) { cloudList = []; }
  }
  if (!list.length && !cloudList.length) { showToast('Es gibt keinen früheren Stand', 'error'); return; }
  const whenOf = x => new Date(x.time).toLocaleString('de-DE') + (x.kind === 'newYear' ? ' (vor dem neuen Schuljahr)' : x.kind === 'restore' ? ' (vor dem Zurückholen)' : '');
  const cloudWhen = v => new Date(v.savedAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  // Ein Fehler fällt oft erst nach dem nächsten Abgleich auf: darum auch die älteren Stände
  const options = [...list.map((x, i) => ({ label: 'Auf diesem Gerät: ' + whenOf(x), value: 'l' + i })),
    ...cloudList.map(v => ({ label: 'Cloud-Sicherung: ' + cloudWhen(v), value: 'c' + v.day }))];
  options[0].primary = true;
  const pick = options.length === 1 ? options[0].value : await askChoice('Früheren Stand zurückholen',
    'Welchen Zeitpunkt möchtest du zurückholen? Die Cloud sichert den Stand vom Beginn jedes Tages, 14 Tage lang.', options);
  if (!pick) return;
  let dataString = null;
  if (pick[0] === 'c') {
    const v = cloudList.find(x => x.day === pick.slice(1));
    if (!v) return;
    const ok = await askChoice('Cloud-Sicherung', `Stand vom ${cloudWhen(v)}. Er ersetzt alle Daten auf diesem Gerät und danach auch in der Cloud.`,
      [{ label: 'Wiederherstellen', value: 'yes', primary: true }]);
    if (!ok) return;
    const dbAtStart = db;
    try { dataString = await SyncManager.readCloudVersion(v.day); } catch (e) {
      showToast(e && e.name === 'WrongPasswordError' ? 'Diese Sicherung ist mit einem früheren Master-Passwort verschlüsselt' : 'Die Sicherung ließ sich gerade nicht laden. Bitte mit Internet noch einmal versuchen', 'error');
      return;
    }
    if (db !== dbAtStart) return;   // inzwischen ersetzt (Regel 32)
  } else {
    const last = list[Number(pick.slice(1))];
    if (!last) return;
    const single = last.kind === 'newYear' || last.kind === 'restore';   // dort gab es nur einen Stand
    const side = single
      ? await askChoice('Früheren Stand zurückholen', `Vom ${whenOf(last)}. Er ersetzt alle Daten auf diesem Gerät und danach auch in der Cloud.`,
        [{ label: 'Wiederherstellen', value: 'local', primary: true }])
      : await askChoice('Stand vor dem Zusammenführen', `Vom ${whenOf(last)}. Der gewählte Stand ersetzt alle Daten auf diesem Gerät und danach auch in der Cloud.`,
        [{ label: 'Stand dieses Geräts', value: 'local', primary: true }, { label: 'Stand aus der Cloud', value: 'cloud' }]);
    if (!side) return;
    dataString = last[side];
  }
  const parsed = JSON.parse(dataString);
  // Den jetzigen Stand vorher ins Sicherheitsnetz: falsch gewählt lässt sich so wieder zurückholen
  try { const nowString = JSON.stringify(db); await keepMergeBackup(nowString, nowString, 'restore'); } catch (e) { console.warn('Sicherheitsnetz nicht gespeichert:', e.message); }
  const syncSettings = db.syncSettings;
  delete parsed.syncSettings;
  const before = db;
  db = migrateDB(parsed);
  if (syncSettings) db.syncSettings = syncSettings;
  keepLiveShareAccess(before, db);   // AT6
  saveDB();
  replaceDB(db);
  closeModal('modal-settings');
  showToast('Früherer Stand wiederhergestellt ✓');
}

// Führt den eigentlichen Sync im Hintergrund durch
async function triggerSyncInternal({ manual = false } = {}) {
  if (!SyncManager.isInitialized || !SyncManager.currentUser || !SyncManager.masterPassword) return;
  // Offener Konflikt: Nutzer muss erst entscheiden, sonst würde das Modal ständig neu aufgehen.
  if (window.currentConflict) return;
  // Offene Frage „anderes Fenster“: Der Stand dieses Fensters ist nicht gespeichert und soll nicht in die Cloud (BUGS T1)
  if (foreignWriteAsking) return;
  if (syncRunning) { syncQueued = true; return; }
  if (hasForeignAccountData()) {
    if (manual || foreignAccountDeclined !== SyncManager.currentUser.uid) askAboutForeignAccountData();
    return;
  }
  syncRunning = true;

  try {
    // Schnappschuss des lokalen Stands zum Zeitpunkt des Syncs
    const dbAtStart = db;
    const localDataString = JSON.stringify(db);
    const localModified = db.settings.lastModified;
    const baseline = syncBaseline();
    const freshEmpty = isFreshEmptyDB();

    const result = await noticeSlowSync(SyncManager.sync(localDataString, {
      localChanged: !baseline || isLocalDBChanged(),
      localIsEmpty: freshEmpty,
      lastSyncedCloudTimestamp: baseline ? baseline.lastSyncedCloudTimestamp : undefined,
      sameAsLocal: cloudData => cloudMatchesLocal(cloudData, localDataString),
      canCreateCloud: newCloudPasswordConfirmed(),
      ownUpload: ownPendingUpload(localModified),
      onBeforeUpload: async () => {
        // Diesen Upload merken: Kommt er an, die Antwort aber nicht, erkennt der nächste Sync ihn wieder (BUGS T4)
        const hash = await contentHash(localDataString);
        if (db !== dbAtStart) return;
        if (!db.syncSettings) db.syncSettings = {};
        db.syncSettings.pendingUpload = { hash, localModified, uid: SyncManager.currentUser.uid };
        persistDB();
      },
    }));
    if (result.recovered && db === dbAtStart) {
      markSynced(result.recovered.cloudTimestamp, result.recovered.localModified);
      saveSyncBase(result.recovered.cloudTimestamp, result.recovered.data);
    }
    if (['uploaded', 'pulled', 'no_change'].includes(result.status)) syncErrorShown = false;
    // Schülerapp (AJ1): Klassenseiten nach jedem erfolgreichen Sync auffrischen (schreibt nur bei Änderung)
    if (['uploaded', 'pulled', 'no_change'].includes(result.status)) { const f = saForceAfterSync; saForceAfterSync = false; publishStudentApps(f); }

    if (db !== dbAtStart) {
      // Während des Syncs wurde die ganze DB ersetzt („Alle Daten löschen“, Import, Cloud-Übernahme).
      // Das Ergebnis gehört zum alten Stand; in die neue DB geschrieben, würde sie als „synchron“
      // gelten und beim nächsten Mal die Cloud überschreiben (BUGS K1). Auch keinen Konflikt melden:
      // „Dieses Gerät hochladen“ lüde die neue, evtl. leere DB hoch (BUGS P4). Einfach neu prüfen.
      syncQueued = true;
    } else if ((result.status === 'pulled' || result.status === 'conflict') && !freshEmpty && inputModalOpen()) {
      // Erst übernehmen bzw. fragen, wenn alle Eingabefenster zu sind (BUGS P1)
      syncAfterModalClose = true;
      if (manual) showToast('Neuer Stand in der Cloud. Wird übernommen, sobald das Fenster geschlossen ist.');
    } else if (result.status === 'conflict') {
      await handleSyncConflict(result, { dbAtStart, localDataString, localModified, lastSynced: baseline ? baseline.lastSyncedCloudTimestamp : undefined });
    } else if (result.status === 'pulled') {
      if (db.settings.lastModified !== localModified) {
        // Während des Downloads wurde lokal etwas eingetragen – nicht überschreiben!
        // Der nächste Durchlauf erkennt das als Konflikt und fragt nach.
        syncQueued = true;
      } else {
        applyCloudData(result.data, result.cloudTimestamp);
        showToast('Stand aus der Cloud übernommen ✓');
      }
    } else if (result.status === 'uploaded') {
      // Nur den hochgeladenen Stand als synchron markieren; Eingaben während des Uploads
      // bleiben „geändert“ und gehen mit dem nächsten Sync hoch.
      markSynced(result.cloudTimestamp, localModified);
      saveSyncBase(result.cloudTimestamp, localDataString);
      if (manual) showToast('In die Cloud hochgeladen ✓');
      warnIfCloudNearlyFull();
      updateSyncUI();
    } else if (result.status === 'no_change') {
      // Beide Seiten inhaltsgleich – auch wenn die Kennungen abweichen (siehe cloudMatchesLocal)
      if (db.settings.lastModified === localModified) {
        markSynced(result.cloudTimestamp, localModified);
        saveSyncBase(result.cloudTimestamp, localDataString);
      }
      if (manual) showToast('Daten bereits auf dem neuesten Stand.');
      updateSyncUI();
    } else if (result.status === 'offline') {
      if (manual) showToast('Offline. Sync folgt, sobald wieder Internet da ist.', 'error');
    } else if (result.status === 'confirm_password') {
      showNewPasswordConfirm();
      // Auch beim Autosave einmal sagen: Bis zur Bestätigung geht nichts in die Cloud (BUGS T2)
      if (manual || !confirmHintShown) showToast('Cloud-Sync wartet: Master-Passwort in den Einstellungen bitte noch einmal eingeben', 'error');
      confirmHintShown = true;
    }
  } catch (error) {
    console.error("Fehler beim Sync:", error);
    if (error.name === 'WrongPasswordError') {
      rejectMasterPassword();
      alert('❌ Falsches Master-Passwort.\n\nEs passt nicht zu den Daten in der Cloud. Es wurde nichts hochgeladen. Bitte gib das Passwort erneut ein.\n\n'
        + 'Wurde das Master-Passwort auf einem anderen Gerät geändert? Dann hier das neue eingeben.');
    } else if (error.name === 'CloudReadError') {
      // Gerade nicht lesbar, aber kein falsches Passwort: Passwort bleibt, kein Alarm, später neu versuchen (Regel 15)
      if (manual || !syncErrorShown) { syncErrorShown = true; showToast('❌ ' + error.message, 'error'); }
    } else if (error.name === 'CloudChangedError') {
      // Ein anderes Gerät war schneller – einfach neu prüfen.
      syncQueued = true;
    } else if (error.name === 'AccountDeletedError' || ACCOUNT_GONE_CODES.includes(error.code)) {
      handleAccountDeleted();
    } else if (error.name === 'CloudTooLargeError' || error.name === 'UnsupportedFormatError') {
      showSyncProblem(error, manual);
    } else if (manual || !syncErrorShown) {
      // Automatisch höchstens einmal, bis wieder ein Sync klappt – sonst kam nach jeder Eingabe ein roter Toast (BUGS T7)
      syncErrorShown = true;
      showToast(isConnectionError(error)
        ? '❌ Keine Verbindung zur Cloud. Deine Daten sind auf diesem Gerät gespeichert. Sync folgt später.'
        : '❌ Sync-Fehler: ' + error.message, 'error');
    }
  } finally {
    syncRunning = false;
    if (syncQueued) {
      syncQueued = false;
      triggerSyncInternal({ manual });
    }
  }
}

let syncErrorShown = false;
let confirmHintShown = false;
function isConnectionError(error) {
  return ['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(error && error.code)
    || /offline|network|failed to fetch|internet/i.test(String(error && error.message));
}

// Früherer Upload dieses Geräts, dessen Antwort nie ankam (BUGS T4)
function ownPendingUpload(localModified) {
  const p = db.syncSettings && db.syncSettings.pendingUpload;
  const user = SyncManager.currentUser;
  if (!p || !user || p.uid !== user.uid) return null;
  return {
    matches: async cloudData => (await contentHash(cloudData)) === p.hash,
    localChangedSince: localModified !== p.localModified,
    localModified: p.localModified,
  };
}

// Löst Konflikte
async function resolveConflict(decision) {
  const conflict = window.currentConflict;
  if (!conflict) return;
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }

  if (decision === 'push' && isFreshEmptyDB()) {
    // Z. B. „Alle Daten löschen“, während der Dialog offen war: Hochladen würde die Cloud leeren (BUGS P4)
    alert('Auf diesem Gerät sind keine Daten (mehr). Hochladen würde die Cloud für alle Geräte leeren.\n\nBitte „Cloud laden“ wählen.');
    return;
  }
  if (decision === 'pull') {
    if (!confirm("Bist du dir sicher, dass du die Version aus der Cloud laden willst?\n\n⚠️ Alle deine lokalen Änderungen, die du auf diesem Gerät offline gemacht hast, gehen dabei verloren!")) return;
  } else if (decision === 'push') {
    if (!confirm("Bist du dir sicher, dass du deine lokale Version hochladen willst?\n\n⚠️ Der Speicherstand in der Cloud wird komplett überschrieben. Änderungen von anderen Geräten gehen verloren!")) return;
  } else if (decision === 'backup') {
    if (!confirm("Möchtest du eine Sicherheitskopie deiner lokalen Daten auf deinem PC speichern und danach den Speicherstand aus der Cloud laden?")) return;
  }

  closeModal('modal-sync-conflict');
  window.currentConflict = null;

  try {
    if (decision === 'pull') {
      applyCloudData(conflict.cloudData, conflict.cloudTimestamp);
      SyncManager.updateStatus('synced'); // sonst stand noch „Konflikt!“ da (BUGS T9)
      showToast('Cloud-Version geladen und lokale Änderungen verworfen.');

    } else if (decision === 'push') {
      // Lokale Version erzwingen – aber nur über genau den Cloud-Stand, den der Nutzer gesehen hat.
      // Sync-Sperre: Ein paralleler Sync läse noch den alten Cloud-Stand und zeigte denselben Konflikt erneut (BUGS T8)
      syncRunning = true;
      try {
        const dbAtStart = db;
        const localModified = db.settings.lastModified;
        const uploaded = JSON.stringify(db);
        const newTimestamp = await SyncManager.saveToCloud(uploaded, conflict.cloudTimestamp);
        if (db === dbAtStart) {
          markSynced(newTimestamp, localModified); // sonst: DB inzwischen ersetzt (BUGS K1)
          saveSyncBase(newTimestamp, uploaded);
        }
      } finally {
        syncRunning = false;
      }
      SyncManager.updateStatus('synced');
      if (syncQueued) { syncQueued = false; triggerSyncInternal(); }
      showToast('Cloud mit dem Stand dieses Geräts überschrieben ✓');
      warnIfCloudNearlyFull();
      updateSyncUI();

    } else if (decision === 'backup') {
      exportData(); // Ruft den Standard-Export auf
      applyCloudData(conflict.cloudData, conflict.cloudTimestamp);
      SyncManager.updateStatus('synced');
      showToast('Backup gespeichert und Cloud-Version geladen.');
    }
  } catch (e) {
    if (e.name === 'CloudChangedError') {
      alert('In der Zwischenzeit hat ein anderes Gerät neue Daten hochgeladen. Es wird neu geprüft.');
      triggerSyncInternal({ manual: true });
    } else if (e.name === 'CloudTooLargeError') {
      showSyncProblem(e, true);
    } else {
      alert('Fehler bei der Konfliktlösung: ' + e.message);
    }
  }
}

// Gespeicherte Darstellung in Auswahl, Regler und Variablen laden (Einstellungen öffnen/verwerfen, Start).
// Der Radius kommt aus db, nicht vom Regler, der beim Start auf seinem HTML-Wert steht (BUGS O3).
function loadThemeSelection() {
  currentThemeAccent = savedThemeAccent();
  document.querySelectorAll('.settings-swatch-accent').forEach(s => s.classList.toggle('selected', s.dataset.color === currentThemeAccent));
  currentThemeBg   = savedThemeAuto() ? 'auto' : savedThemeBg();
  currentThemeMode = savedThemeMode();
  currentThemeCard = currentThemeBg && currentThemeBg !== 'auto' ? (db.settings.themeCard || '') : '';
  document.querySelectorAll('.settings-swatch-bg').forEach(s => s.classList.toggle('selected', s.dataset.color === currentThemeBg));
  let radVal = Number.isFinite(db.settings.themeRadius) ? db.settings.themeRadius : 8;
  if (radVal > 12) radVal = 12; // Clamp max radius to 12
  document.getElementById('settings-radius').value = radVal;
  document.getElementById('settings-radius-val').textContent = radVal + 'px';
}
// Gespeicherter Hintergrund, '' = Standard. '#0f1117' gibt es als Farbfeld nicht: Den hat früher jedes
// „Speichern“ ohne Farbwahl geschrieben (samt Karte '#1e2130'), er bedeutet also „Standard“ (BUGS S6).
// Gespeicherte Akzentfarbe, '' = Standard (Tinte, je Modus aus style.css). '#6366f1' (das frühere Indigo)
// hat jedes „Speichern“ ohne Farbwahl geschrieben – es bedeutet also „Standard“, wie beim Hintergrund (BUGS S6, AE4).
// Wer Indigo wirklich will, wählt das Farbfeld „Indigo“ (#6466f1).
function savedThemeAccent() {
  const a = db.settings.themeAccent || '';
  return a === '#6366f1' ? '' : a;
}
function savedThemeBg() {
  const bg = db.settings.themeBg || '';
  return bg === '#0f1117' || bg === DEFAULT_THEME.bg ? '' : bg;   // früheres Dunkel-Standard bzw. Eisblau = Standard
}
// „Automatisch (wie Gerät)“ gewählt (X6); eine gewählte Farbe geht vor
function savedThemeAuto() {
  return db.settings.themeAuto === true && !savedThemeBg();
}
// Hell/dunkel: beim Standard immer hell; automatisch wie das Gerät; sonst wie gespeichert (das Farbfeld legt den Modus fest)
function savedThemeMode() {
  if (savedThemeAuto()) return systemPrefersDark() ? 'dark' : 'light';
  return savedThemeBg() ? (db.settings.theme || 'dark') : DEFAULT_THEME.mode;
}
// Gerät wechselt hell/dunkel (z. B. abends automatisch): bei „Automatisch“ sofort mitgehen
if (window.matchMedia) {
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  const follow = () => { if (currentThemeBg === 'auto' || savedThemeAuto()) applyThemePreview(); };
  if (darkMq.addEventListener) darkMq.addEventListener('change', follow); else if (darkMq.addListener) darkMq.addListener(follow);
}
// Hilfsfunktion zum Aktualisieren des Themes aus den Einstellungen in der DB
function updateAppliedThemeFromDB() {
  if (db.settings) {
    loadThemeSelection();
    applyThemePreview();
  }
}
// Einstellungen schließen ohne Speichern: Farb-/Radius-Vorschau verwerfen (BUGS O2). Sind Felder geändert,
// vorher fragen – Escape oder ein Tipp daneben darf nichts still verwerfen (Regel 27, BUGS S7).
function cancelSettings() {
  if (settingsDirty() && !confirm('Deine Änderungen in den Einstellungen sind noch nicht gespeichert.\n\nVerwerfen?')) return;
  closeModal('modal-settings');
  updateAppliedThemeFromDB();
}
function settingsDirty() {
  return settingsSnapshot !== null && settingsFormState() !== settingsSnapshot;
}
function settingsFormState() {
  readBlocksEditor();
  readHolidaysEditor();
  const fields = [...document.querySelectorAll('#modal-settings input, #modal-settings select')]
    .filter(el => el.id && !el.id.startsWith('sync-') && el.type !== 'file')
    .map(el => el.id + '=' + (el.type === 'checkbox' ? el.checked : el.value));
  return JSON.stringify([fields, blocksDraft, holidaysDraft, currentThemeBg, currentThemeAccent, currentThemeMode, navDraft]);
}

// ─── Schülerapp (BUGS AJ1), Stufe 1: Klassenseite ohne Personendaten ───────────────────────────────────────
// Je Klasse ein Auszug (Inhaltsverzeichnis aus der Planung, Aufträge, Tests, nächste Stunden, Klassenziel), verschlüsselt mit dem
// Schlüssel der Freigabe und als eigenes Dokument `shares/<id>` in die Cloud gelegt (student-share.js, SyncManager.publishShare).
// Nie Namen, Noten, Fehlzeiten, Hinweise oder Notizen zu Schülern; das Klassenziel ist nur eine Summe.
// In `db` stehen nur Einstellungen und Zugang (settings.studentApp, group.studentApp). Was dieses Gerät veröffentlicht hat
// und was noch zu löschen ist, merkt sich das Gerät (localStorage, nie db): Veröffentlicht wird nach jedem Sync, nur bei Änderung.
const SA_SHOW_DEFAULT = { expedition: true, upcoming: false, hw: true, tests: true, next: true };
const SA_PUB_PREFIX = 'sa_pub_';            // + Kennung → { hash, at }: diesen Stand hat dieses Gerät veröffentlicht
const SA_DELETE_QUEUE = 'sa_delete_queue';  // Kennungen, deren Dokument noch gelöscht werden muss (auch ohne Netz vorgemerkt)
const SA_BASE_URL = 'https://unterrichtsplaner.github.io/schueler.html';
let saPublishing = false, saPublishAgain = false;
let studentAppProblem = null;   // null | 'rules' (Firestore-Regeln fehlen) | 'offline'

const studentAppOn = () => !!(db.settings.studentApp && db.settings.studentApp.on);
// Lesen mit Standardwerten, ohne zu schreiben (Regel 7: kaputte Werte nie still ersetzen, nur nicht benutzen)
function studentAppOf(g) {
  const sa = g && g.studentApp && typeof g.studentApp === 'object' ? g.studentApp : {};
  const goal = sa.goal && typeof sa.goal === 'object' && Number(sa.goal.target) > 0 ? sa.goal : null;
  return {
    on: sa.on === true,
    access: StudentShare.isAccess(sa.access) ? sa.access : null,
    show: { ...SA_SHOW_DEFAULT, ...(sa.show && typeof sa.show === 'object' ? sa.show : {}) },
    goal: goal ? { target: Math.round(Number(goal.target)), reward: String(goal.reward || ''), since: isDateStr(goal.since) ? goal.since : null } : null,
  };
}
function ensureStudentApp(g) {
  if (!g.studentApp || typeof g.studentApp !== 'object') g.studentApp = {};
  return g.studentApp;
}
function studentAppTeacherName() {
  const s = db.settings.studentApp;
  return String((s && s.name) || db.settings.teacherName || '').trim();
}
function studentAppLink(access) {
  let base = SA_BASE_URL;
  try {
    if (/^https?:$/.test(location.protocol)) base = new URL('schueler.html', location.href).href.split(/[?#]/)[0];
  } catch (e) { /* Standardadresse */ }
  return StudentShare.linkFor(access, base);
}
// Plusse der ganzen Klasse seit `since` (++ zählt doppelt, Minus gar nicht) – nur die Summe, keine Namen
function classGoalCount(g, since) {
  let n = 0;
  (db.students[g.id] || []).forEach(s => (s.participation || []).forEach(p => {
    if (!p || (since && String(p.date || '') < since)) return;
    if (p.value === 'excellent') n += 2;
    else if (p.value === 'positive') n += 1;
  }));
  return n;
}

// Stempelkarte des Klassenziels (AJ6 c): je vergangene Stunde seit dem Start die Plusse der ganzen Klasse an diesem Tag
// (++ zählt doppelt). Plusse an Tagen ohne Stunde bekommen einen eigenen Stempel. Nur Summen, keine Namen.
function classGoalStamps(g, since, todayStr, nowMins) {
  if (!isDateStr(since) || since > todayStr) return [];
  const per = new Map();
  groupLessons(g.id, since, todayStr).filter(l => !l.ausfall && (l.dateStr < todayStr || (l.range && l.range.start <= nowMins)))
    .forEach(l => per.set(l.dateStr, 0));
  (db.students[g.id] || []).forEach(s => (s.participation || []).forEach(p => {
    const d = p && String(p.date || '');
    if (!isDateStr(d) || d < since || d > todayStr) return;
    const n = p.value === 'excellent' ? 2 : p.value === 'positive' ? 1 : 0;
    if (n || per.has(d)) per.set(d, (per.get(d) || 0) + n);
  }));
  return [...per].sort((a, b) => a[0].localeCompare(b[0])).slice(-80).map(([date, n]) => ({ date, n }));
}

// Inhaltsverzeichnis der Schülerseite (AJ5): alle erledigten Themen des Schuljahrs mit ihren Stunden und dem ganzen Text
// aus „Was wurde behandelt“ (eigene Notizen stehen in den Stundennotizen und gehen nie mit), das laufende Thema,
// kommende nur wenn freigegeben. Erledigt heißt wie in der Planung: abgehakt (Regel 69). Stunden mit Text, aber ohne
// abgehaktes Thema stehen als eigene Einträge dazwischen (AJ3). Ohne Planung: jede Stunde mit Text.
function studentAppToc(g, sa, todayStr, nowMins) {
  const text = l => String((db.lessonData[lessonKeyOf(l)] || {}).done || '').trim().slice(0, 600);
  const past = groupLessons(g.id, schoolYearStart(todayStr), todayStr)
    .filter(l => !l.ausfall && (l.dateStr < todayStr || (l.range && l.range.start <= nowMins)));
  const plan = groupPlan(g);
  if (!plan.length) {
    return { items: past.map(l => ({ date: l.dateStr, text: text(l) })).filter(x => x.text)
      .map(x => ({ title: firstLine(x.text), state: 'done', lessons: [x] })), fromLessons: true };
  }
  const { firstDate } = planAssignments(g, todayStr);
  // Angefangene Themen zuerst, dann nach der ersten geplanten Stunde
  const open = plan.filter(t => !t.done && (topicDoneCount(t) || firstDate.get(t)))
    .map((t, i) => ({ t, i, d: firstDate.get(t) ? firstDate.get(t).dateStr : '9999' }))
    .sort((a, b) => (topicDoneCount(b.t) ? 1 : 0) - (topicDoneCount(a.t) ? 1 : 0) || a.d.localeCompare(b.d) || a.i - b.i);
  const byTopic = new Map(), loose = [];
  past.forEach(l => {
    const t = topicDoneIn(g, lessonKeyOf(l)), tx = text(l);
    if (t) { if (!byTopic.has(t)) byTopic.set(t, []); if (tx) byTopic.get(t).push({ date: l.dateStr, text: tx }); }
    else if (tx) loose.push({ date: l.dateStr, title: firstLine(tx), lessons: [{ date: l.dateStr, text: tx }] });
  });
  const lessonsOf = t => byTopic.get(t) || [];
  const done = plan.filter(t => t.done).map(t => {
    const last = topicDoneCount(t) ? t.doneLessons[t.doneLessons.length - 1].slice(-10) : '';
    return { date: last || (typeof t.done === 'string' ? t.done : t.doneAt) || '', title: String(t.title || ''), of: topicLength(t), lessons: lessonsOf(t), topic: true };
  });
  // Zeitlich ordnen; gleiche lose Einträge hintereinander (zweimal „Übung“) werden einer
  const merged = [];
  [...done, ...loose].sort((a, b) => String(a.date).localeCompare(String(b.date))).forEach(x => {
    const prev = merged[merged.length - 1];
    if (prev && !prev.topic && !x.topic && prev.title.toLowerCase() === x.title.toLowerCase()) prev.lessons.push(...x.lessons);
    else merged.push({ ...x, lessons: [...x.lessons] });
  });
  const items = merged.map(x => ({ title: x.title, state: 'done', ...(x.topic ? { of: x.of } : {}), lessons: x.lessons }));
  const from = t => (firstDate.get(t) ? firstDate.get(t).dateStr : '');
  const cur = open[0];
  if (cur) {
    items.push({ title: String(cur.t.title || ''), state: 'now', unit: Math.min(topicLength(cur.t), topicDoneCount(cur.t) + 1),
      of: topicLength(cur.t), from: from(cur.t), lessons: lessonsOf(cur.t) });
  }
  if (sa.show.upcoming) {
    open.slice(1).forEach(x => items.push({ title: String(x.t.title || ''), state: 'later', of: topicLength(x.t), from: from(x.t), lessons: lessonsOf(x.t) }));
  }
  return { items: items.filter(x => x.title.trim()), fromLessons: false };
}

// Der Auszug, den die Schülerseite zeigt. Ohne Zeitstempel, damit gleicher Inhalt gleich aussieht (nur dann wird geschrieben).
// Relative Angaben („morgen“, „noch 10 Tage“) und was schon vorbei ist, rechnet die Schülerseite selbst aus.
function studentAppSnapshot(g, now = new Date()) {
  const sa = studentAppOf(g);
  const todayStr = formatDate(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const ahead = groupLessons(g.id, todayStr, formatDate(addDays(parseDate(todayStr), 70))).filter(l => !l.ausfall);
  const snap = { v: 2, cls: g.className || '', subject: g.subject || '', teacher: studentAppTeacherName(), color: g.color || '',
    next: null, hw: null, tests: null, toc: null, goal: null };

  if (sa.show.next) {
    snap.next = ahead.filter(l => l.range).slice(0, 4)
      .map(l => ({ date: l.dateStr, start: minsToTime(l.range.start), end: minsToTime(l.range.end), room: String(l.slot.room || '') }));
  }
  if (sa.show.hw || sa.show.tests) {
    const seen = new Set(), hw = [], tests = [];
    const plan = groupPlan(g);
    const add = (list, item, dateStr) => {
      const text = String(item.text || '').trim();
      const k = (item.id || text) + '|' + dateStr;
      if (!text || seen.has(k)) return;
      seen.add(k);
      const entry = { date: dateStr, text };
      // Themen einer Arbeit (AJ6 b): von der Lehrkraft beim Test ausgewählt, als Titel in der Reihenfolge der Planung
      const ids = Array.isArray(item.topics) ? item.topics : [];
      const topics = plan.filter(t => ids.includes(t.id)).map(t => String(t.title || '').trim()).filter(Boolean);
      if (topics.length) entry.topics = topics;
      list.push(entry);
    };
    ahead.forEach(l => {   // Fälligkeit nur über dueItemsFor (Regel 52)
      const due = dueItemsFor(l.slot.id, l.dateStr);
      due.hw.forEach(i => add(hw, i, l.dateStr));
      due.tests.forEach(i => add(tests, i, l.dateStr));
    });
    if (sa.show.hw) snap.hw = hw.slice(0, 10);
    if (sa.show.tests) snap.tests = tests.slice(0, 10);
  }
  if (sa.show.expedition) snap.toc = studentAppToc(g, sa, todayStr, nowMins);
  if (sa.goal) {
    snap.goal = { target: sa.goal.target, reward: sa.goal.reward, count: classGoalCount(g, sa.goal.since), since: sa.goal.since,
      stamps: classGoalStamps(g, sa.goal.since, todayStr, nowMins) };
  }
  return snap;
}

const saRead = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? fallback : v; } catch (e) { return fallback; } };
const saWrite = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* voll: nächstes Mal neu */ } };
// Schülerapp-Links sind „lebender Zustand“ (AT6): Wer einen alten Stand lädt (Sicherung, früherer Stand), behält die
// jetzigen Links der Klassen und Schüler (per id). Links, die nur der alte Stand kennt, waren schon aufgegeben und
// bekommen einen neuen Zugang statt wiederbelebt zu werden; jetzige Links, die danach fehlen, werden abgeschaltet.
function keepLiveShareAccess(oldDB, newDB) {
  const accOf = x => (x && x.studentApp && typeof x.studentApp === 'object' && StudentShare.isAccess(x.studentApp.access) ? x.studentApp.access : null);
  const carry = (now, old) => {
    if (!now) return;
    if (accOf(old)) now.studentApp = { ...(now.studentApp && typeof now.studentApp === 'object' ? now.studentApp : {}), access: accOf(old) };
    else if (accOf(now)) now.studentApp.access = StudentShare.newAccess();
    if (accOf(now)) live.add(accOf(now).id);
  };
  const live = new Set();
  const oldGroups = new Map((oldDB.groups || []).filter(Boolean).map(g => [g.id, g]));
  const oldStudents = new Map();
  Object.values(oldDB.students || {}).forEach(list => (Array.isArray(list) ? list : []).forEach(st => { if (st) oldStudents.set(st.id, st); }));
  (newDB.groups || []).forEach(g => carry(g, g && oldGroups.get(g.id)));
  Object.values(newDB.students || {}).forEach(list => (Array.isArray(list) ? list : []).forEach(st => carry(st, st && oldStudents.get(st.id))));
  [...oldGroups.values(), ...oldStudents.values()].forEach(x => { const a = accOf(x); if (a && !live.has(a.id)) queueShareDeletion(a.id); });
}
function queueShareDeletion(id) {
  if (!id) return;
  const q = saRead(SA_DELETE_QUEUE, []);
  if (!q.includes(id)) saWrite(SA_DELETE_QUEUE, [...q, id]);
  saWrite(SA_PUB_PREFIX + id, null);
}
// Aufgegebene Kennungen: abschalten (leeres Dokument im eigenen Konto, AT2) oder bei „Cloud leeren“/„Konto löschen“
// wirklich löschen (`remove`). Jede Kennung einzeln: Ein Fehler hält die übrigen nicht auf (AT4). Gehört ein Dokument
// einem anderen Konto, lässt es sich nie ändern – dann fällt es aus der Liste. Liefert die Zahl der Fehlschläge.
async function processShareDeletions(remove = false) {
  let failed = 0, lastError = null;
  for (const id of saRead(SA_DELETE_QUEUE, [])) {
    try {
      if (remove) await SyncManager.deleteShare(id); else await SyncManager.closeShare(id);
    } catch (e) {
      if (!(e && e.code === 'permission-denied' && await SyncManager.shareTaken(id))) { failed++; lastError = e; continue; }
      console.warn('Schülerapp: Seite gehört einem anderen Konto', id);
    }
    saWrite(SA_DELETE_QUEUE, saRead(SA_DELETE_QUEUE, []).filter(x => x !== id));
  }
  if (lastError) saShareError(lastError);
  return failed;
}
// Fehler einer einzelnen Seite merken (AT4); der Durchlauf geht weiter. „Regeln fehlen“ nur, wenn nicht
// eine fremde Seite der Grund ist.
let saErrors = null;
function saShareError(e, taken = false) {
  if (!saErrors) return;
  saErrors.push(taken ? 'taken' : e && e.code === 'permission-denied' ? 'rules' : 'offline');
}
async function saTryPublish(id, write) {
  try { await write(); return true; } catch (e) {
    const taken = e && e.code === 'permission-denied' && await SyncManager.shareTaken(id);
    saShareError(e, taken);
    console.warn('Schülerapp: Seite nicht veröffentlicht', id, e);
    return false;
  }
}
// Nach jedem erfolgreichen Sync: vorgemerkte Löschungen, dann jede freigegebene Klasse, deren Auszug sich geändert hat.
// Seltener schreiben (AK3): eine geänderte Seite höchstens alle 10 Minuten neu; neue Seiten, Abschalten, „Jetzt senden“
// und Verlassen der App sofort. Was wartet, merkt sich `saPendingAt` (früheste Uhrzeit), ein Zeitgeber holt es nach.
const SA_REPUBLISH_MS = 10 * 60 * 1000;
let saPendingAt = null, saPublishTimer = null, saForceAgain = false;
function saPublishDue(mark, hash, force) {
  if (mark.hash === hash) return false;
  if (force || !mark.at || Date.now() - mark.at >= SA_REPUBLISH_MS) return true;
  const due = mark.at + SA_REPUBLISH_MS;
  if (!saPendingAt || due < saPendingAt) saPendingAt = due;
  return false;
}
async function publishStudentApps(force = false) {
  if (!SyncManager.isInitialized || !SyncManager.currentUser || typeof SyncManager.publishShare !== 'function') return;
  if (saPublishing) { saPublishAgain = true; saForceAgain = saForceAgain || force; return; }
  saPublishing = true;
  saPendingAt = null;
  saErrors = [];
  try {
    await processShareDeletions();
    const dbAtStart = db;
    for (const g of db.groups.slice()) {
      if (db !== dbAtStart) break;   // DB ersetzt (Import, Pull): der nächste Durchlauf rechnet neu (Regel 32)
      const sa = studentAppOf(g);
      if (!sa.access) continue;
      const markKey = SA_PUB_PREFIX + sa.access.id;
      if (studentAppOn() && sa.on) {
        const snap = studentAppSnapshot(g);
        const hash = await contentHash(JSON.stringify(snap));
        // Unveränderte Klassenseite nur überspringen, nicht die ganze Klasse: sonst kamen die persönlichen Seiten nie an (09.11.)
        if (saPublishDue(saRead(markKey, {}) || {}, hash, force)) {
          const enc = await StudentShare.encrypt({ ...snap, at: Date.now() }, sa.access.key);
          if (await saTryPublish(sa.access.id, () => SyncManager.publishShare(sa.access.id, enc))) saWrite(markKey, { hash, at: Date.now() });
        }
      } else if (saRead(markKey, null)) {
        if (await saTryPublish(sa.access.id, () => SyncManager.closeShare(sa.access.id))) saWrite(markKey, null);
      }
      await publishPersonalPages(g, personalActive(g), force);   // Stufe 2a (AJ2)
    }
    studentAppProblem = ['rules', 'offline', 'taken'].find(k => saErrors.includes(k)) || null;
  } catch (e) {
    studentAppProblem = e && e.code === 'permission-denied' ? 'rules' : 'offline';
    console.warn('Schülerapp: Veröffentlichen hat nicht geklappt', e);
  } finally {
    saErrors = null;
    saPublishing = false;
    clearTimeout(saPublishTimer); saPublishTimer = null;
    // Nachholen über einen Abgleich: Ein Gerät mit veraltetem Stand überschriebe sonst neuere Einträge (AT7)
    if (saPendingAt) saPublishTimer = setTimeout(() => { saPublishTimer = null; triggerSyncInternal(); }, Math.max(1000, saPendingAt - Date.now() + 500));
    refreshStudentAppViews();
    if (saPublishAgain) { const f = saForceAgain; saPublishAgain = false; saForceAgain = false; publishStudentApps(f); }
  }
}
// Cloud leeren / Konto löschen: alle Schülerseiten mit weg (sonst blieben verschlüsselte, aber verwaiste Dokumente stehen)
// Liefert true, wenn nichts mehr übrig ist (AT5: Konto löschen bricht sonst ab, die Seiten blieben für immer).
async function deleteAllStudentShares() {
  db.groups.forEach(g => { const sa = studentAppOf(g); if (sa.access) queueShareDeletion(sa.access.id); queueStudentShares(g); });
  if (!SyncManager.isInitialized || !SyncManager.currentUser || typeof SyncManager.deleteShare !== 'function') return !saRead(SA_DELETE_QUEUE, []).length;
  try { return (await processShareDeletions(true)) === 0; } catch (e) { console.warn('Schülerapp: Löschen hat nicht geklappt', e); return false; }
}

// ── Ändern (alles Nutzeränderungen → saveDB, Regel 2) ──
function setStudentAppOn(groupId, on) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  const sa = ensureStudentApp(g);
  if (on && !StudentShare.isAccess(sa.access)) sa.access = StudentShare.newAccess();
  sa.on = !!on;
  if (!on && StudentShare.isAccess(sa.access)) queueShareDeletion(sa.access.id);
  if (!on) queueStudentShares(g);   // persönliche Seiten hängen an der Klassenseite (AJ2)
  saveDB();
  refreshStudentAppViews();
}
function renewStudentAppAccess(groupId, confirmed = false) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  if (!confirmed && !confirm(`Neuen Link für die ${g.className} erzeugen?\n\nDer alte Link und der alte Code funktionieren dann nicht mehr. Die Klasse braucht den neuen Code.`)) return;
  const sa = ensureStudentApp(g);
  if (StudentShare.isAccess(sa.access)) queueShareDeletion(sa.access.id);
  sa.access = StudentShare.newAccess();
  saveDB();
  refreshStudentAppViews();
  if (!confirmed) showToast('Neuer Link erzeugt ✓');
}
function setStudentAppShow(groupId, key, value) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !(key in SA_SHOW_DEFAULT)) return;
  const sa = ensureStudentApp(g);
  sa.show = { ...studentAppOf(g).show, [key]: !!value };
  saveDB();
  refreshStudentAppPreview();
}
// Belohnung vor dem Ziel eingetippt: als Entwurf im Reiter halten, gespeichert wird sie mit dem Ziel (AT14). Nur Ansicht.
let saGoalDraft = null;   // { groupId, reward }
function setStudentAppGoal(groupId, changes) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  if (!studentAppOf(g).goal && !('target' in changes) && 'reward' in changes) {
    saGoalDraft = { groupId, reward: String(changes.reward || '') };
    return;   // kein Neuzeichnen: der Fokus bleibt im nächsten Feld
  }
  const draft = saGoalDraft && saGoalDraft.groupId === groupId ? saGoalDraft.reward : '';
  const cur = studentAppOf(g).goal || { target: 0, reward: draft, since: null };
  const next = { ...cur, ...changes };
  next.target = Math.max(0, Math.min(10000, Math.round(Number(next.target) || 0)));
  next.reward = String(next.reward || '').trim().slice(0, 120);
  if (!isDateStr(next.since)) next.since = halfYearStart();
  const sa = ensureStudentApp(g);
  if (next.target > 0) { sa.goal = next; saGoalDraft = null; } else delete sa.goal;
  saveDB();
  renderStudentAppTab();
}
function restartStudentAppGoal(groupId) {
  const g = db.groups.find(x => x.id === groupId);
  const goal = g && studentAppOf(g).goal;
  if (!goal) return;
  if (!confirm('Neues Klassenziel beginnen?\n\nGezählt wird dann ab heute wieder von vorn.')) return;
  setStudentAppGoal(groupId, { since: formatDate(new Date()) });
}
async function copyStudentAppLink(groupId) {
  const g = db.groups.find(x => x.id === groupId);
  const sa = g && studentAppOf(g);
  if (!sa || !sa.access) return;
  try { await navigator.clipboard.writeText(studentAppLink(sa.access)); showToast('Link kopiert ✓'); }
  catch (e) { showToast('Kopieren hat nicht geklappt. Zeig den Code am Beamer', 'error'); }
}

// ── Anzeigen ──
function studentAppQR(text, label) {
  if (typeof qrcode !== 'function') return '';
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: label });
}
function updateStudentAppTabVisibility() {
  const b = document.getElementById('overview-tab-studentapp');
  if (!b) return;
  b.classList.toggle('hidden', !studentAppOn());
  if (!studentAppOn() && currentClassDashboardTab === 'studentapp'
      && document.getElementById('view-students').classList.contains('active')) switchClassDashboardTab('students');
}
function wireSendNow(root) { const b = root.querySelector('#sa-send-now'); if (b) b.addEventListener('click', sendStudentAppsNow); }
// Schülerseiten nur aus einem Stand, der gerade mit der Cloud abgeglichen ist (AT7): erst Sync, danach alles Wartende
// sofort (`saForceAfterSync`). Ohne Netz oder bei Konflikt bleibt es vorgemerkt.
let saForceAfterSync = false;
function sendStudentAppsNow() {
  saForceAfterSync = true;
  triggerSyncInternal();
}
// „Jetzt senden“ nur, wenn etwas wartet (AK3)
const studentAppSendNowHTML = () => (saPendingAt ? `<button type="button" class="btn-secondary" id="sa-send-now">${icon('refresh')}Jetzt senden</button>` : '');
function studentAppStatusText(sa) {
  if (!sa.on) return 'Nicht freigegeben. Die Klasse sieht nichts.';
  if (studentAppProblem === 'rules') return 'Die Cloud lehnt die Freigabe ab: Die Firestore-Regeln für die Schülerapp fehlen noch.';
  if (studentAppProblem === 'taken') return 'Eine Schülerseite gehört inzwischen einem anderen Konto und lässt sich nicht mehr schreiben. Abhilfe: für die Klasse „Neuer Link“. Die übrigen Seiten sind aktuell.';
  const mark = sa.access && saRead(SA_PUB_PREFIX + sa.access.id, null);
  if (studentAppProblem === 'offline') return 'Gerade keine Verbindung zur Cloud. Die Seite wird beim nächsten Sync aktualisiert.';
  if (saPendingAt) { const d = new Date(saPendingAt); return `Freigegeben. Neue Einträge gehen spätestens um ${minsToTime(d.getHours() * 60 + d.getMinutes())} an die Schüler.`; }
  if (mark && mark.at) {
    const d = new Date(mark.at);
    const day = formatDate(d) === formatDate(new Date()) ? 'heute' : formatWeekdayShort(formatDate(d));
    return `Freigegeben. Aktualisiert sich nach Änderungen, höchstens alle 10 Minuten, zuletzt ${day} um ${minsToTime(d.getHours() * 60 + d.getMinutes())}.`;
  }
  return 'Freigegeben. Die Seite erscheint mit dem nächsten Sync.';
}
// AJ3h: Ältere Listen-Importe legten einen einzelnen Namen im Nachnamen ab; die Schülerseite zeigte dann „Ich“.
// Betroffen: kein Vorname, Nachname genau ein Wort. Umgestellt wird nur auf Knopfdruck, für alle Klassen, mit „Rückgängig“.
function singleLastNameStudents() {
  const out = [];
  db.groups.forEach(g => (Array.isArray(db.students[g.id]) ? db.students[g.id] : []).forEach(s => {
    if (s && !String(s.firstName || '').trim() && /^\S+$/.test(String(s.lastName || '').trim())) out.push({ gid: g.id, s });
  }));
  return out;
}
function fixNamesHTML() {
  const list = singleLastNameStudents();
  if (!list.length) return '';
  const classes = new Set(list.map(x => x.gid)).size;
  return `<section class="set-card sa-card" id="sa-fix-names"><h3 class="sa-subtitle">Namen prüfen</h3>
    <p class="sa-status">${list.length} Schüler${classes > 1 ? ` in ${classes} Klassen` : ''} haben nur einen Nachnamen, keinen Vornamen (so kamen einzelne Namen früher aus „Namen einfügen“). Auf ihrer persönlichen Seite steht dann „Ich“.</p>
    <div><button type="button" class="btn-secondary" id="sa-fix-names-btn">Als Vornamen übernehmen</button></div></section>`;
}
function moveSingleNamesToFirst() {
  const list = singleLastNameStudents();
  if (!list.length) return;
  const moved = list.map(({ gid, s }) => {
    const old = { firstName: s.firstName, lastName: s.lastName };
    s.firstName = String(s.lastName).trim();
    s.lastName = '';
    renameAbsenceNotes(gid, old, s);
    return { gid, s, old, name: s.firstName };
  });
  const refresh = () => { [...new Set(moved.map(x => x.gid))].forEach(refreshStudentViews); renderStudentAppTab(); };
  saveDB();
  refresh();
  showUndoToast(`${moved.length} Namen als Vornamen übernommen`, () => {
    let n = 0;
    moved.forEach(({ gid, s, old, name }) => {
      if (!(db.students[gid] || []).includes(s) || s.firstName !== name || s.lastName) return;   // inzwischen geändert: so lassen
      const now = { firstName: s.firstName, lastName: s.lastName };
      Object.assign(s, old);
      renameAbsenceNotes(gid, now, s);
      n++;
    });
    if (n) { saveDB(); refresh(); }
  });
}
function wireFixNames(content) {
  const b = content.querySelector('#sa-fix-names-btn');
  if (b) b.addEventListener('click', moveSingleNamesToFirst);
}
function renderStudentAppTab() {
  const content = document.getElementById('overview-content');
  const g = db.groups.find(x => x.id === currentOverviewGroupId);
  if (!content || !g || currentOverviewTab !== 'studentapp') return;
  const sa = studentAppOf(g);
  const cls = escHtml(g.className);
  if (!SyncManager.isInitialized || !SyncManager.currentUser) {
    content.innerHTML = `<div class="sa-wrap">${fixNamesHTML()}<section class="set-card sa-card"><h3 class="sa-title">Schülerapp für die ${cls}</h3>
      <p class="sa-status">Die Schülerapp braucht die Cloud: Die Seite der Klasse liegt verschlüsselt dort. Melde dich unter Einstellungen → Daten &amp; Cloud an.</p>
      <div><button type="button" class="btn-secondary" id="sa-open-cloud">${icon('cloud')}Zur Anmeldung</button></div></section></div>`;
    content.querySelector('#sa-open-cloud').addEventListener('click', () => { openSettings(); showSettingsPane('data'); });
    wireFixNames(content);
    return;
  }
  const goal = sa.goal;
  const count = goal ? classGoalCount(g, goal.since) : 0;
  const pct = goal ? Math.min(100, Math.round(count / goal.target * 100)) : 0;
  const checks = [
    ['expedition', 'Inhaltsverzeichnis', 'Themen mit ihren Stunden und dem Text aus „Was wurde behandelt“ (Stundennotizen nie)'],
    ['upcoming', 'Kommende Themen zeigen', 'sonst nur bis zum aktuellen Thema'],
    ['hw', 'Hausaufgaben als Aufträge', ''],
    ['tests', 'Tests und Klassenarbeiten', 'mit Countdown und „Das kommt dran“ (beim Test im Stunden-Fenster wählen)'],
    ['next', 'Nächste Stunde', 'Tag, Zeit, Raum'],
  ];
  content.innerHTML = `<div class="sa-wrap"><div class="sa-grid"><div class="sa-col">
    ${fixNamesHTML()}<section class="set-card sa-card">
      <div class="sa-head"><div><h3 class="sa-title">Schülerapp für die ${cls}</h3><p class="sa-status" id="sa-status">${escHtml(studentAppStatusText(sa))}</p><div id="sa-send-wrap">${studentAppSendNowHTML()}</div></div>
        <label class="toggle-switch" title="Für die Klasse freigeben"><input type="checkbox" id="sa-on" aria-label="Für die ${cls} freigeben"${sa.on ? ' checked' : ''}><span class="toggle-slider"></span></label></div>
    </section>
    ${sa.on && sa.access ? `<section class="set-card sa-card">
      <h3 class="sa-subtitle">Zugang für die Klasse</h3>
      <div class="sa-access"><div class="sa-qr">${studentAppQR(studentAppLink(sa.access), 'Code für die ' + g.className)}</div>
        <div class="sa-btns">
          <button type="button" class="btn-primary" id="sa-beamer">${icon('panel')}Am Beamer zeigen</button>
          <button type="button" class="btn-secondary" id="sa-copy">${icon('copy')}Link kopieren</button>
          <button type="button" class="btn-secondary" id="sa-renew">${icon('refresh')}Neuen Link erzeugen</button>
        </div></div>
      <p class="field-hint-muted">Ein Link für alle, ohne Namen und Noten. Ein neuer Link macht den alten sofort ungültig.</p>
    </section>
    <section class="set-card sa-card">
      <h3 class="sa-subtitle">Klassenziel</h3>
      <div class="sa-goal">
        <div class="form-group"><label for="sa-goal-target">Ziel in Plussen</label><input type="number" inputmode="numeric" min="0" max="10000" class="form-input" id="sa-goal-target" value="${goal ? goal.target : ''}" placeholder="z. B. 150"></div>
        <div class="form-group"><label for="sa-goal-reward">Belohnung, wenn es geschafft ist</label><input type="text" maxlength="120" class="form-input" id="sa-goal-reward" value="${goal ? escHtml(goal.reward) : saGoalDraft && saGoalDraft.groupId === g.id ? escHtml(saGoalDraft.reward) : ''}" placeholder="z. B. eine Stunde Rätsel"></div>
        ${goal ? `<div class="form-group"><label for="sa-goal-since">Zählt ab</label><input type="date" class="form-input" id="sa-goal-since" value="${escHtml(goal.since)}"></div>` : ''}
      </div>
      ${goal ? `<div class="sa-progress"><span>Gesammelt seit ${escHtml(formatDateDE(parseDate(goal.since)))}: <b>${count}</b></span><span>${count >= goal.target ? 'geschafft' : `noch ${goal.target - count}`}</span></div>
        <div class="sa-bar" role="img" aria-label="${count} von ${goal.target} Plussen"><i style="width:${pct}%"></i></div>
        <div><button type="button" class="btn-secondary" id="sa-goal-restart">Neues Ziel beginnen</button></div>`
        : '<p class="field-hint-muted">Plusse der ganzen Klasse seit Beginn des Halbjahrs, ++ zählt doppelt. Leer lassen: kein Klassenziel.</p>'}
    </section>
    <section class="set-card sa-card">
      <h3 class="sa-subtitle">Sichtbar für die Klasse</h3>
      <div class="sa-checks">${checks.map(([k, label, hint]) => `<label class="print-check sa-check"><input type="checkbox" data-show="${k}"${sa.show[k] ? ' checked' : ''}><span>${label}${hint ? `<small>${escHtml(hint)}</small>` : ''}</span></label>`).join('')}</div>
    </section>
    ${personalCardHTML(g)}` : ''}
  </div>
  ${sa.on && sa.access ? `<aside class="sa-preview"><h3 class="sa-subtitle">So sieht es die ${cls}</h3>
    <div class="sa-phone"><iframe id="sa-preview-frame" src="schueler.html?vorschau" title="Vorschau der Schülerapp"></iframe></div></aside>` : ''}
  </div></div>`;
  content.querySelector('#sa-on').addEventListener('change', e => setStudentAppOn(g.id, e.target.checked));
  wireSendNow(content);
  wireFixNames(content);
  if (!(sa.on && sa.access)) return;
  content.querySelector('#sa-beamer').addEventListener('click', () => showStudentAppBeamer(g.id));
  content.querySelector('#sa-copy').addEventListener('click', () => copyStudentAppLink(g.id));
  content.querySelector('#sa-renew').addEventListener('click', () => renewStudentAppAccess(g.id));
  content.querySelector('#sa-goal-target').addEventListener('change', e => setStudentAppGoal(g.id, { target: e.target.value }));
  content.querySelector('#sa-goal-reward').addEventListener('change', e => setStudentAppGoal(g.id, { reward: e.target.value }));
  const since = content.querySelector('#sa-goal-since');
  if (since) since.addEventListener('change', e => setStudentAppGoal(g.id, { since: e.target.value }));
  const restart = content.querySelector('#sa-goal-restart');
  if (restart) restart.addEventListener('click', () => restartStudentAppGoal(g.id));
  content.querySelectorAll('input[data-show]').forEach(el => el.addEventListener('change', () => setStudentAppShow(g.id, el.dataset.show, el.checked)));
  wirePersonalCard(content, g);   // Stufe 2a (AJ2)
  const frame = content.querySelector('#sa-preview-frame');
  frame.addEventListener('load', () => refreshStudentAppPreview());
}
// Vorschau: dieselbe Schülerseite im Rahmen, mit dem Auszug von hier statt aus der Cloud
function refreshStudentAppPreview() {
  const frame = document.getElementById('sa-preview-frame');
  const g = db.groups.find(x => x.id === currentOverviewGroupId);
  if (!frame || !g) return;
  try {
    const w = frame.contentWindow;
    if (w && typeof w.renderStudentPage === 'function') w.renderStudentPage({ ...studentAppSnapshot(g), at: Date.now() });
  } catch (e) { /* Rahmen noch nicht geladen */ }
}
function refreshStudentAppViews() {
  updateStudentAppTabVisibility();
  const view = document.getElementById('view-students');
  if (view && view.classList.contains('active') && currentOverviewTab === 'studentapp' && !document.getElementById('overview-content').classList.contains('hidden')) {
    // Nur den Status neu schreiben, wenn sich sonst nichts geändert hat: Neuzeichnen nähme den Fokus aus den Feldern
    const g = db.groups.find(x => x.id === currentOverviewGroupId);
    const status = document.getElementById('sa-status');
    const on = document.getElementById('sa-on');
    if (g && status && on && on.checked === studentAppOf(g).on && !!document.getElementById('sa-beamer') === !!(studentAppOf(g).on && studentAppOf(g).access)) {
      status.textContent = studentAppStatusText(studentAppOf(g));
      const wrap = document.getElementById('sa-send-wrap');
      if (wrap && wrap.innerHTML !== studentAppSendNowHTML()) { wrap.innerHTML = studentAppSendNowHTML(); wireSendNow(wrap); }
      refreshStudentAppPreview();
    } else {
      renderStudentAppTab();
    }
  }
  const list = document.getElementById('settings-studentapp-classes');
  if (list && !document.getElementById('modal-settings').classList.contains('hidden')) renderSettingsStudentApps();
}
function showStudentAppBeamer(groupId) {
  const g = db.groups.find(x => x.id === groupId);
  const sa = g && studentAppOf(g);
  if (!sa || !sa.access) return;
  document.getElementById('sa-beamer-title').textContent = [g.className, g.subject].filter(Boolean).join(' · ');
  document.getElementById('sa-beamer-qr').innerHTML = studentAppQR(studentAppLink(sa.access), 'Code für die ' + g.className);
  document.getElementById('sa-beamer-hint').textContent = 'Scannt den Code: Thema, Hausaufgaben und Tests findet ihr ab jetzt immer dort.';
  openModal('modal-studentapp-beamer');
}
// Einstellungen → Schülerapp: Klassenliste mit Stand und „Öffnen“
function renderSettingsStudentApps() {
  const el = document.getElementById('settings-studentapp-classes');
  if (!el) return;
  if (!db.groups.length) { el.innerHTML = '<p class="field-hint-muted">Noch keine Klassen.</p>'; return; }
  el.innerHTML = db.groups.map(g => {
    const sa = studentAppOf(g);
    const state = !sa.on ? 'nicht freigegeben' : sa.goal ? `freigegeben, ${classGoalCount(g, sa.goal.since)} von ${sa.goal.target} Plussen` : 'freigegeben';
    return `<div class="sa-class-row" data-id="${escHtml(g.id)}"><span class="sa-dot" style="--dot:${escHtml(safeColor(g.color))}"></span>
      <span class="sa-class-name">${escHtml(g.className)}<small>${escHtml(g.subject || '')}</small></span>
      <span class="sa-class-state">${escHtml(state)}</span>
      <button type="button" class="btn-secondary">Öffnen</button></div>`;
  }).join('');
  el.querySelectorAll('.sa-class-row').forEach(row => row.querySelector('button').addEventListener('click', () => {
    closeModalLikeButton('modal-settings');   // fragt bei ungespeicherten Änderungen (Regel 27)
    if (!document.getElementById('modal-settings').classList.contains('hidden')) return;
    if (!studentAppOn()) { showToast('Erst die Schülerapp einschalten und speichern', 'error'); return; }
    openGroupStudents(row.dataset.id, 'studentapp');
  }));
}

// ─── Schülerapp Stufe 2a: persönliche Seiten (AJ2) ───────────────────────────
// Je Schüler ein eigener Link (students[].studentApp.access, Dokument shares/<id> wie die Klassenseite). Seite „Ich“:
// Level und XP aus den Plussen des Schuljahrs (+ 10, ++ 20; berechnet, nie gespeichert, nie Abzug außer Korrektur),
// Rückmeldung der letzten Stunden mit allen vier Stufen, Serie, Rang (je Klasse benannt), Joker (alle 4 Level, höchstens
// 4 im Jahr; eingelöst wird im Schüler-Fenster, students[].jokersUsed). Nie Noten, Fehlzeiten, Hinweise, Notizen oder
// andere Schüler; nur der eigene Vorname. Dazu die Klassenseite als zweiter Reiter.
const SA_LEVELS = { easy: 14, normal: 12, hard: 11 };   // Ziel-Level der Mittleren am Schuljahresende (Punkte-Rechner 09.11.)
const SA_LEVEL_NAMES = { easy: 'entspannt', normal: 'normal', hard: 'sportlich' };
const SA_RANK_PRESETS = {
  heft: ['Bleistift', 'Buntstift', 'Fineliner', 'Füller', 'Goldfüller'],
  gaming: ['Neuling', 'Entdecker', 'Durchblicker', 'Taktiker', 'Legende'],
};
const SA_JOKERS_DEFAULT = ['Sitzplatz für eine Stunde aussuchen', 'Song zum Analysieren vorschlagen', 'Aufgabe aussuchen', 'Partner wählen', 'Rätsel der Stunde stellen'];
const SA_XP = { positive: 10, excellent: 20 };
const SA_FIRST_LEVEL_XP = 10;              // Level 2 mit dem ersten Plus
const SA_JOKER_EVERY = 4, SA_JOKER_MAX = 4;
const SA_MIDDLE_XP_PER_LESSON = 4.7;       // mittlere Schüler, gemessen im Punkte-Rechner (170 XP bei 36 Stunden)
// Sticker (AJ2b): von Hand mit Grund (Katalog je Klasse, XP einstellbar), automatisch nach Regeln (0 XP, sonst zählten
// die Plusse doppelt), Baustelle geschafft (XP einstellbar). Feste Kennungen der Startwerte, damit Vergebenes passt.
const SA_STICKERS_DEFAULT = [
  { id: 'd-erklaer', name: 'Erklärprofi', icon: 'bubble', color: 3, xp: 20 },
  { id: 'd-mutig', name: 'Mutig gefragt', icon: 'ask', color: 2, xp: 20 },
  { id: 'd-team', name: 'Teamplayer', icon: 'hands', color: 1, xp: 20 },
];
const SA_AUTO_DEFAULT = [
  { id: 'a-first', name: 'Erstes Plus', icon: 'plus', color: 0, kind: 'any', n: 1, mode: 'total' },
  { id: 'a-pp', name: 'Doppelplus', icon: 'star', color: 4, kind: 'excellent', n: 1, mode: 'total' },
  { id: 'a-streak', name: 'Dranbleiben', icon: 'flame', color: 2, kind: 'any', n: 3, mode: 'streak' },
];
const SA_AUTO_KINDS = { any: 'Plus', excellent: 'Doppelplus' };
const SA_AUTO_MODES = { streak: 'in Folge', total: 'insgesamt', half: 'im Halbjahr' };
const SA_ICON_NAMES = { star: 'Stern', bubble: 'Sprechblase', ask: 'Frage', hands: 'Hände', bulb: 'Glühbirne', rocket: 'Rakete', heart: 'Herz',
  flame: 'Flamme', medal: 'Medaille', puzzle: 'Puzzle', plus: 'Plus', check: 'Haken', crane: 'Baustelle' };
const SA_COLOR_NAMES = ['Orange', 'Grün', 'Pink', 'Blau', 'Türkis', 'Gelb'];
const SA_BAU_DEFAULT_XP = 20;
const SA_BAU_SUGGEST = ['Material fehlt oft', 'Hausaufgaben', 'Pünktlich sein', 'Öfter melden', 'Heftführung', 'Nicht reinrufen'];
const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const cleanSticker = x => x && x.id && String(x.name || '').trim()
  ? { id: String(x.id), name: String(x.name).trim().slice(0, 30), icon: SA_ICON_NAMES[x.icon] ? x.icon : 'star', color: clampInt(x.color, 0, 5, 0), xp: clampInt(x.xp, 0, 200, 20) } : null;
const cleanAuto = x => x && x.id && String(x.name || '').trim()
  ? { id: String(x.id), name: String(x.name).trim().slice(0, 30), icon: SA_ICON_NAMES[x.icon] ? x.icon : 'star', color: clampInt(x.color, 0, 5, 0),
    kind: SA_AUTO_KINDS[x.kind] ? x.kind : 'any', n: clampInt(x.n, 1, 99, 1), mode: SA_AUTO_MODES[x.mode] ? x.mode : 'total' } : null;

function personalOf(g) {
  const sa = g && g.studentApp && typeof g.studentApp === 'object' ? g.studentApp : {};
  const p = sa.personal && typeof sa.personal === 'object' ? sa.personal : {};
  const ranks = (Array.isArray(p.ranks) ? p.ranks : []).slice(0, 5).map(x => String(x || '').trim());
  while (ranks.length < 5) ranks.push('');
  return {
    on: p.on === true,
    level: SA_LEVELS[p.level] ? p.level : 'normal',
    step: Number(p.step) >= 5 ? Math.round(Number(p.step)) : null,
    ranks,
    jokers: Array.isArray(p.jokers) ? p.jokers.map(x => String(x || '').trim()).filter(Boolean).slice(0, 12) : SA_JOKERS_DEFAULT.slice(),
    stickers: (Array.isArray(p.stickers) ? p.stickers : SA_STICKERS_DEFAULT).map(cleanSticker).filter(Boolean).slice(0, 20),
    autoStickers: (Array.isArray(p.autoStickers) ? p.autoStickers : SA_AUTO_DEFAULT).map(cleanAuto).filter(Boolean).slice(0, 20),
    bauXP: clampInt(p.bauXP, 0, 200, SA_BAU_DEFAULT_XP),
  };
}
const personalActive = g => studentAppOn() && studentAppOf(g).on && !!studentAppOf(g).access && personalOf(g).on;
const studentAccessOf = s => (s && s.studentApp && StudentShare.isAccess(s.studentApp.access) ? s.studentApp.access : null);
function ensureStudentAccess(s) {
  if (studentAccessOf(s)) return false;
  s.studentApp = { ...(s.studentApp && typeof s.studentApp === 'object' ? s.studentApp : {}), access: StudentShare.newAccess() };
  return true;
}
// Stunden pro Woche aus dem Stundenplan (zweiwöchentlich zählt halb), mindestens 1
function weeklyLessons(g, todayStr = formatDate(new Date())) {
  const n = db.lessonSlots.filter(s => s.groupId === g.id && !isOneOffSlot(s) && (!s.validUntil || s.validUntil >= todayStr))
    .reduce((sum, s) => sum + (s.recurring === 'biweekly' ? 0.5 : 1), 0);
  return Math.max(1, n);
}
// XP je Level: Mittlere erreichen bis Schuljahresende das Ziel-Level; gleich große Schritte (bestehen alle Prüfungen)
function personalStepFor(g, level) {
  const yearXP = weeklyLessons(g) * 36 * SA_MIDDLE_XP_PER_LESSON;
  return Math.max(5, Math.round(yearXP / (SA_LEVELS[level] - 2) / 5) * 5);
}
const personalStep = g => personalOf(g).step || personalStepFor(g, personalOf(g).level);
function yearParticipation(s, todayStr) {
  const from = schoolYearStart(todayStr);
  return (s.participation || []).filter(p => p && isDateStr(p.date) && p.date >= from && p.date <= todayStr);
}
// Einträge eines Schülers aus diesem Schuljahr (Sticker von Hand, Baustellen nach Datum, geschaffte nach Erledigt-Datum)
const yearList = (list, todayStr, field = 'date') => {
  const from = schoolYearStart(todayStr);
  return (Array.isArray(list) ? list : []).filter(x => x && isDateStr(x[field]) && x[field] >= from && x[field] <= todayStr);
};
// XP: Plusse + Sticker von Hand + geschaffte Baustellen (je mit dem XP-Wert beim Vergeben). Ein gelöschter Eintrag (Verklicken) nimmt seine XP mit.
const studentXP = (s, todayStr = formatDate(new Date())) => yearParticipation(s, todayStr).reduce((n, p) => n + (SA_XP[p.value] || 0), 0)
  + yearList(s.stickersGiven, todayStr).reduce((n, x) => n + clampInt(x.xp, 0, 200, 0), 0)
  + yearList(s.baustellen, todayStr, 'done').reduce((n, x) => n + clampInt(x.xp, 0, 200, 0), 0);
// Automatische Sticker: Regel erfüllt? Gezählt in Stunden (Serie wie studentStreak: ein Fehltag unterbricht nicht)
function autoStickerEarned(rule, s, lessonDates, todayStr) {
  const fits = p => (rule.kind === 'excellent' ? p.value === 'excellent' : !!SA_XP[p.value]);
  const parts = yearParticipation(s, todayStr).filter(fits);
  if (rule.mode === 'total') return parts.length >= rule.n;
  if (rule.mode === 'half') {   // in einem der beiden Halbjahre geschafft: ein Sticker wird nie wieder weggenommen (AR18)
    const r = runningHalf(todayStr);
    if (!r) return parts.length >= rule.n;
    return ['h1', 'h2'].some(k => parts.filter(p => inPeriod(p.date, periodRange(k, todayStr))).length >= rule.n);
  }
  const hit = new Set(parts.map(p => p.date));
  const absent = new Set((s.attendance || []).filter(a => a && (a.type === 'abwesend' || a.type === 'entschuldigt')).map(a => a.date));
  let run = 0, best = 0;
  lessonDates.slice().reverse().forEach(d => { if (hit.has(d)) best = Math.max(best, ++run); else if (!absent.has(d)) run = 0; });
  return best >= rule.n;
}
const autoHint = r => `${r.n}× ${SA_AUTO_KINDS[r.kind]} ${SA_AUTO_MODES[r.mode]}`;
function levelInfo(xp, step) {
  if (xp < SA_FIRST_LEVEL_XP) return { level: 1, from: 0, next: SA_FIRST_LEVEL_XP };
  const k = Math.floor((xp - SA_FIRST_LEVEL_XP) / step);
  return { level: 2 + k, from: SA_FIRST_LEVEL_XP + k * step, next: SA_FIRST_LEVEL_XP + (k + 1) * step };
}
const rankIndex = level => Math.min(4, Math.floor((level - 1) / 2));   // alle 2 Level ein neuer Rang, der letzte (Diamant) ab Level 9
// Rangfarben (Wunsch 09.11.): ohne eigenen Namen heißt der Rang wie seine Farbe; gleiche Reihenfolge wie auf der Schülerseite
const SA_TIERS = [['bronze', 'Bronze'], ['silver', 'Silber'], ['gold', 'Gold'], ['platinum', 'Platin'], ['diamond', 'Diamant']];   // ohne Regenbogen (Wunsch 09.11.)
const rankName = (p, i) => p.ranks[i] || SA_TIERS[i][1];
function studentPersonalInfo(g, s, todayStr = formatDate(new Date())) {
  const p = personalOf(g), step = personalStep(g), xp = studentXP(s, todayStr), li = levelInfo(xp, step);
  const r = rankIndex(li.level);
  const nextRank = r < 4 ? { name: rankName(p, r + 1), level: 2 * (r + 1) + 1 } : null;
  const earned = Math.min(SA_JOKER_MAX, Math.floor(li.level / SA_JOKER_EVERY));
  const used = (Array.isArray(s.jokersUsed) ? s.jokersUsed : []).filter(j => j && isDateStr(j.date) && j.date >= schoolYearStart(todayStr)).length;
  return { xp, step, ...li, rank: rankName(p, r), tier: r, nextRank, jokers: { earned, used, open: Math.max(0, earned - used) } };
}
// Vergangene Stunden der Klasse im Schuljahr (neueste zuerst, je Tag einmal) – einmal je Klasse rechnen
function pastLessonDates(g, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  return [...new Set(groupLessons(g.id, schoolYearStart(todayStr), todayStr)
    .filter(l => !l.ausfall && (l.dateStr < todayStr || (l.range && l.range.start <= nowMins))).map(l => l.dateStr))].reverse();
}
// Stunden in Folge mit Plus; ein Fehltag und die heutige Stunde ohne Eintrag unterbrechen nicht
function studentStreak(s, lessonDates, todayStr) {
  const plus = new Set(yearParticipation(s, todayStr).filter(p => SA_XP[p.value]).map(p => p.date));
  const absent = new Set((s.attendance || []).filter(a => a && (a.type === 'abwesend' || a.type === 'entschuldigt')).map(a => a.date));
  let n = 0;
  for (const d of lessonDates) {
    if (plus.has(d)) n++;
    else if (d === todayStr || absent.has(d)) continue;
    else break;
  }
  return n;
}
// Gemeinsames für alle persönlichen Seiten einer Klasse: einmal je Klasse rechnen. Die Klassenseite selbst steckt nicht
// mehr im Auszug (AK3): nur Kennung und Schlüssel, die Schülerseite lädt sie dazu. Sonst änderte ein Plus (Klassenziel)
// alle persönlichen Seiten der Klasse. `klasse` bleibt im Kontext für den Rückblick (Themen).
function personalCtx(g, now = new Date()) {
  const sa = studentAppOf(g);
  return { lessons: pastLessonDates(g, now), klasse: studentAppSnapshot(g, now), start: classYearStart(g, formatDate(now)),
    klasseRef: studentAppOn() && sa.on && sa.access ? { id: sa.access.id, key: sa.access.key } : null };
}
// Auszug für die persönliche Seite. Ohne Zeitstempel (wie die Klassenseite): gleicher Inhalt → kein neues Schreiben.
function studentPersonalSnapshot(g, s, now = new Date(), ctx = null) {
  const todayStr = formatDate(now);
  ctx = ctx || personalCtx(g, now);
  const p = personalOf(g), info = studentPersonalInfo(g, s, todayStr);
  const feedback = yearParticipation(s, todayStr).filter(x => !x.label && partLevel(x.value))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-400).map(x => ({ date: x.date, v: x.value }));   // ganzes Schuljahr (AJ3g), Grenze nur gegen Ausreißer
  return {
    v: 1, kind: 'me', first: String(s.firstName || '').trim(),
    cls: g.className || '', subject: g.subject || '', teacher: studentAppTeacherName(), color: g.color || '',
    xp: info.xp, level: info.level, from: info.from, next: info.next, rank: info.rank, nextRank: info.nextRank,
    jokers: { ...info.jokers, max: SA_JOKER_MAX, every: SA_JOKER_EVERY, list: p.jokers },
    feedback, streak: studentStreak(s, ctx.lessons, todayStr), ...(ctx.klasseRef ? { klasseRef: ctx.klasseRef } : {}),
    ...(year => ({ year, yearBest: studentYearBest(s, year) }))(studentYearMap(s, ctx, todayStr)),
    ...studentStickerSnapshot(g, s, ctx, todayStr),
    ...studentReviewPart(g, s, ctx, todayStr),
  };
}
// Sticker und Baustelle für die Seite „Ich“ (AJ2b): Grund und Baustellen-Text sieht nur der Schüler selbst
function studentStickerSnapshot(g, s, ctx, todayStr) {
  const p = personalOf(g);
  const given = yearList(s.stickersGiven, todayStr).map(x => ({ name: String(x.name || ''), icon: x.icon, color: x.color, reason: String(x.reason || ''), date: x.date, xp: clampInt(x.xp, 0, 200, 0) }));
  const done = yearList(s.baustellen, todayStr, 'done').map(x => ({ name: 'Baustelle geschafft', icon: 'crane', color: 1, reason: String(x.text || ''), date: x.done, xp: clampInt(x.xp, 0, 200, 0) }));
  const gifts = [...given, ...done].sort((a, b) => b.date.localeCompare(a.date));
  const autos = p.autoStickers.map(r => ({ r, ok: autoStickerEarned(r, s, ctx.lessons, todayStr) }));
  const open = (Array.isArray(s.baustellen) ? s.baustellen : []).filter(x => x && !x.done && String(x.text || '').trim()).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  return {
    gifts: gifts.slice(0, 30),
    album: [...autos.filter(a => a.ok).map(a => ({ name: a.r.name, icon: a.r.icon, color: a.r.color, hint: autoHint(a.r) })),
      ...gifts.map(x => ({ name: x.name, icon: x.icon, color: x.color }))].slice(0, 60),
    locked: autos.filter(a => !a.ok).map(a => ({ name: a.r.name, icon: a.r.icon, hint: autoHint(a.r) })),
    bau: open ? { text: String(open.text).trim(), since: open.date } : null,
    bauXP: p.bauXP,
    giver: studentAppTeacherName(),   // nicht „from“: das sind die XP am Anfang des Levels
  };
}
// Jahreskarte (AJ2c): jede vergangene Stunde ab dem ersten Eintrag der Klasse im Schuljahr, mit der eigenen Mitarbeit
// (ohne Titel; mehrere am Tag: die beste), „a“ = gefehlt, null = nichts eingetragen. Nur eigene Daten.
const PART_RANK = { excellent: 4, positive: 3, neutral: 2, negative: 1 };
function studentYearMap(s, ctx, todayStr) {
  const best = new Map();
  yearParticipation(s, todayStr).filter(p => !p.label && PART_RANK[p.value]).forEach(p => {
    if (!best.has(p.date) || PART_RANK[p.value] > PART_RANK[best.get(p.date)]) best.set(p.date, p.value);
  });
  // Fehltage nie im Auszug (AT8, Regel 95): ein Fehltag ist ein leeres Feld wie „nichts eingetragen“
  return ctx.lessons.filter(d => d >= ctx.start).slice().reverse().slice(-160)
    .map(d => ({ date: d, v: best.get(d) || null }));
}
// Längste Plus-Serie der Jahreskarte; ein Fehltag unterbricht sie nicht (wie die Serie im Planer). Nur die Zahl geht raus.
function studentYearBest(s, cells) {
  const absent = new Set((s.attendance || []).filter(a => a && (a.type === 'abwesend' || a.type === 'entschuldigt')).map(a => a.date));
  let best = 0, run = 0;
  cells.forEach(c => {
    if (c.v === 'positive' || c.v === 'excellent') best = Math.max(best, ++run);
    else if (!(c.v === null && absent.has(c.date))) run = 0;
  });
  return best;
}
// Rückblick (AJ3k): nach dem Halbjahres-Stichtag aufs 1. Halbjahr (drei Wochen „frisch“, danach in der Sammlung),
// in den letzten zwei Wochen vor dem Schuljahresende aufs ganze Schuljahr. Ohne Stichtag nichts (wie vor AJ3k).
// Nur Feiern: Stunden, Plusse (ohne Titel), Serie, stärkster Monat, Level, Sticker, Themen. Nie Minusse, Fehltage,
// Noten oder andere Schüler (Regel 95); ein Fehltag erscheint als leeres Feld wie „nichts eingetragen“.
const SA_REVIEW_FRESH_HALF = 21, SA_REVIEW_FRESH_YEAR = 14;
function reviewRange(todayStr) {
  const start = schoolYearStart(todayStr);
  const ye = db.settings.schoolYearEnd;
  if (isDateStr(ye) && ye >= start && todayStr >= formatDate(addDays(parseDate(ye), -SA_REVIEW_FRESH_YEAR)))
    return { kind: 'year', label: 'Schuljahr', from: start, to: todayStr < ye ? todayStr : ye, fresh: true };
  const hy = halfYearSplit(todayStr);
  if (!hy || todayStr < hy) return null;
  return { kind: 'half', label: '1. Halbjahr', from: start, to: hy, fresh: todayStr <= formatDate(addDays(parseDate(hy), SA_REVIEW_FRESH_HALF)) };
}
function studentReviewPart(g, s, ctx, todayStr) {
  const r = reviewRange(todayStr);
  if (!r) return {};
  const inR = d => isDateStr(d) && d >= r.from && d <= r.to;
  const lessons = ctx.lessons.filter(inR).slice().reverse();   // älteste zuerst
  if (!lessons.length) return {};
  const parts = (s.participation || []).filter(x => x && inR(x.date));
  const plain = parts.filter(x => !x.label);
  const pp = plain.filter(x => x.value === 'excellent').length, pl = plain.filter(x => x.value === 'positive').length;
  // Ein Feld je Stunde: beste eigene Mitarbeit ohne Titel, sonst leer (auch bei Fehltag)
  const bestOf = new Map();
  plain.filter(x => SA_XP[x.value]).forEach(x => { if (bestOf.get(x.date) !== 'excellent') bestOf.set(x.date, x.value); });
  const cells = lessons.slice(-120).map(d => bestOf.get(d) === 'excellent' ? 'pp' : bestOf.get(d) ? 'p' : '');
  // Längste Serie wie studentStreak: Stunde mit Plus zählt, Fehltag unterbricht nicht, sonst Schluss
  const plus = new Set(parts.filter(x => SA_XP[x.value]).map(x => x.date));
  const absent = new Set((s.attendance || []).filter(a => a && (a.type === 'abwesend' || a.type === 'entschuldigt')).map(a => a.date));
  let run = null, best = null;
  lessons.forEach(d => {
    if (plus.has(d)) { run = run ? { ...run, n: run.n + 1, to: d } : { n: 1, from: d, to: d }; if (!best || run.n > best.n) best = { ...run }; }
    else if (!absent.has(d)) run = null;
  });
  // Plusse je Monat (ohne Titel), vom ersten bis zum letzten Monat mit Stunden
  const months = [];
  lessons.forEach(d => { const m = d.slice(0, 7); if (!months.length || months[months.length - 1].m !== m) months.push({ m, n: 0 }); });
  plain.filter(x => SA_XP[x.value]).forEach(x => { const mo = months.find(o => o.m === x.date.slice(0, 7)); if (mo) mo.n++; });
  const top = months.reduce((b, o) => (o.n > (b ? b.n : 0) ? o : b), null);
  const p = personalOf(g), step = personalStep(g);
  const levelTo = levelInfo(studentXP(s, r.to), step).level, tier = rankIndex(levelTo);
  const given = yearList(s.stickersGiven, r.to).filter(x => inR(x.date)).map(x => ({ name: String(x.name || ''), icon: x.icon, color: x.color, reason: String(x.reason || ''), date: x.date }));
  const done = yearList(s.baustellen, r.to, 'done').filter(x => inR(x.done)).map(x => ({ name: 'Baustelle geschafft', icon: 'crane', color: 1, reason: String(x.text || ''), date: x.done }));
  const toc = ctx.klasse && ctx.klasse.toc && !ctx.klasse.toc.fromLessons ? ctx.klasse.toc.items : [];
  const topics = (Array.isArray(toc) ? toc : []).filter(t => t && t.state === 'done')
    .map(t => ({ title: String(t.title || ''), n: (t.lessons || []).filter(l => l && inR(l.date)).length }))
    .filter(t => t.title && t.n > 0).slice(0, 8);
  return { review: {
    kind: r.kind, label: r.label, from: r.from, to: r.to, fresh: r.fresh,
    lessons: lessons.length, cells, pp, p: pl, xp: pp * SA_XP.excellent + pl * SA_XP.positive,
    best: best && best.n >= 2 ? best : null, months, top: top ? top.m : null,
    levelFrom: 1, levelTo, tier, rank: rankName(p, tier),   // beide Rückblicke beginnen am Schuljahresanfang: XP zählen je Schuljahr
    gifts: [...given, ...done].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4), topics,
  } };
}
// Erster Eintrag der Klasse im Schuljahr (Mitarbeit oder Fehlzeit irgendeines Schülers); vorher beginnt die Karte nicht
function classYearStart(g, todayStr) {
  const from = schoolYearStart(todayStr);
  let first = null;
  (db.students[g.id] || []).forEach(st => ['participation', 'attendance'].forEach(f => (st[f] || []).forEach(e => {
    if (e && isDateStr(e.date) && e.date >= from && e.date <= todayStr && (!first || e.date < first)) first = e.date;
  })));
  return first || todayStr;
}
// Veröffentlichen je Schüler (aus publishStudentApps); fehlt ein Zugang (neuer Schüler), wird er angelegt
async function publishPersonalPages(g, active, force = false) {
  const students = db.students[g.id] || [];
  let changed = active && students.map(ensureStudentAccess).includes(true);
  // Nach dem Schuljahreswechsel: Tempo fest, sobald die Klasse wieder Stunden hat (AR19)
  if (active && !(Number(personalOf(g).step) >= 5) && getGroupSlots(g.id).length) { ensurePersonal(g).step = personalStepFor(g, personalOf(g).level); changed = true; }
  if (changed) saveDB();
  const ctx = active ? personalCtx(g) : null;
  for (const st of students) {
    const acc = studentAccessOf(st);
    if (!acc) continue;
    const markKey = SA_PUB_PREFIX + acc.id;
    if (active) {
      const snap = studentPersonalSnapshot(g, st, new Date(), ctx);
      const hash = await contentHash(JSON.stringify(snap));
      if (!saPublishDue(saRead(markKey, {}) || {}, hash, force)) continue;
      const enc = await StudentShare.encrypt({ ...snap, at: Date.now() }, acc.key);
      if (await saTryPublish(acc.id, () => SyncManager.publishShare(acc.id, enc))) saWrite(markKey, { hash, at: Date.now() });
    } else if (saRead(markKey, null)) {
      if (await saTryPublish(acc.id, () => SyncManager.closeShare(acc.id))) saWrite(markKey, null);
    }
  }
}
const queueStudentShares = g => (db.students[g.id] || []).forEach(st => { const a = studentAccessOf(st); if (a) queueShareDeletion(a.id); });

// ── Ändern (Nutzeränderungen → saveDB) ──
function ensurePersonal(g) {
  const sa = ensureStudentApp(g);
  if (!sa.personal || typeof sa.personal !== 'object') sa.personal = {};
  return sa.personal;
}
async function setPersonalOn(groupId, on) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  if (on) {
    const ok = await askChoice('Persönliche Seiten einschalten?',
      'Jeder Schüler bekommt einen eigenen Link mit Vorname, Level, Rückmeldung zur Mitarbeit (auch − und −−), Rang und Jokern. Keine Noten, keine Fehlzeiten. '
      + 'Die Seiten liegen verschlüsselt in der Cloud, lesen kann sie nur, wer den Link hat. Es sind trotzdem Daten über einzelne Schüler: '
      + 'Kläre das vorher mit der Schulleitung bzw. der/dem Datenschutzbeauftragten und informiere die Eltern.',
      [{ label: 'Ist geklärt, einschalten', value: 'on', primary: true }]);   // „Abbrechen“ hängt askChoice selbst an (AT13)
    if (!ok || !db.groups.includes(g)) { renderStudentAppTab(); return; }   // Regel 43; Schalter zurück auf aus
  }
  const p = ensurePersonal(g);
  p.on = !!on;
  if (on) {
    if (!(Number(p.step) >= 5)) p.step = personalStepFor(g, personalOf(g).level);   // fest fürs Jahr, sonst sänken Level
    (db.students[g.id] || []).forEach(ensureStudentAccess);
  } else queueStudentShares(g);
  saveDB();
  renderStudentAppTab();   // Tempo, Ränge, Joker, Sticker erscheinen bzw. verschwinden sofort (AT13)
  refreshStudentAppViews();
}
function setPersonalLevel(groupId, level) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !SA_LEVELS[level]) return;
  const anyXP = (db.students[g.id] || []).some(st => studentXP(st) > 0);
  if (anyXP && !confirm('Das Tempo ändert, wie viele XP ein Level braucht. Die Level der Schüler ändern sich dadurch sofort (sie können auch sinken).\n\nTrotzdem ändern?')) { renderStudentAppTab(); return; }   // Auswahl zurück (AT13)
  const p = ensurePersonal(g);
  p.level = level;
  p.step = personalStepFor(g, level);
  saveDB();
  renderStudentAppTab();
  refreshStudentAppViews();
}
function setPersonalRanks(groupId, ranks) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  const list = (ranks || []).slice(0, 5).map(x => String(x || '').trim().slice(0, 24));
  const p = ensurePersonal(g);
  if (list.some(Boolean)) p.ranks = list; else delete p.ranks;
  saveDB();
}
function setPersonalJokers(groupId, text) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  ensurePersonal(g).jokers = String(text || '').split('\n').map(x => x.trim().slice(0, 80)).filter(Boolean).slice(0, 12);
  saveDB();
}
function findStudentIn(groupId, studentId) { return (db.students[groupId] || []).find(x => x.id === studentId) || null; }
async function redeemJoker(groupId, studentId) {
  const g = db.groups.find(x => x.id === groupId), s = findStudentIn(groupId, studentId);
  if (!g || !s) return;
  if (!studentPersonalInfo(g, s).jokers.open) { showToast('Gerade kein Joker frei', 'error'); return; }
  const list = personalOf(g).jokers;
  const text = await askChoice(`Joker für ${s.firstName}`, 'Was hat sich der Schüler ausgesucht?',
    [...list.map((t, i) => ({ label: t, value: t, primary: i === 0 })), { label: 'Ohne Angabe', value: '-' }]);
  if (!text || !findStudentIn(groupId, studentId)) return;
  const entry = { id: uid(), date: formatDate(new Date()), ...(text !== '-' ? { text } : {}) };
  (s.jokersUsed = Array.isArray(s.jokersUsed) ? s.jokersUsed : []).push(entry);
  saveDB();
  refreshOpenProfile(s);
  showUndoToast('Joker eingelöst', () => {
    const i = (s.jokersUsed || []).indexOf(entry);
    if (i === -1) return;
    s.jokersUsed.splice(i, 1);
    saveDB();
    refreshOpenProfile(s);
  });
}
function showStudentCode(groupId, studentId) {
  const g = db.groups.find(x => x.id === groupId), s = findStudentIn(groupId, studentId);
  if (!g || !s) return;
  if (ensureStudentAccess(s)) saveDB();
  document.getElementById('sa-beamer-title').textContent = `${s.firstName} ${s.lastName}`.trim();
  document.getElementById('sa-beamer-qr').innerHTML = studentAppQR(studentAppLink(studentAccessOf(s)), 'Persönlicher Code für ' + s.firstName);
  document.getElementById('sa-beamer-hint').textContent = 'Nur dem Schüler zeigen, nicht am Beamer: Mit diesem Code sieht man seine persönliche Seite.';
  openModal('modal-studentapp-beamer');
  // Von diesem Gerät noch nicht hochgeladen (z. B. eben erst eingeschaltet): gleich synchronisieren, dann veröffentlichen
  if (!saRead(SA_PUB_PREFIX + studentAccessOf(s).id, null) && typeof triggerSyncInternal === 'function') triggerSyncInternal();
}
function renewStudentAccess(groupId, studentId) {
  const s = findStudentIn(groupId, studentId);
  if (!s || !confirm(`Neuen Link für ${s.firstName}?\n\nDer alte Link (Kärtchen) funktioniert dann nicht mehr.`)) return;
  const old = studentAccessOf(s);
  if (old) queueShareDeletion(old.id);
  s.studentApp = { ...(s.studentApp || {}), access: StudentShare.newAccess() };
  saveDB();
  refreshOpenProfile(s);
  showToast('Neuer Link erzeugt. Er gilt nach dem nächsten Sync.');
}
// Kärtchen zum Ausschneiden: je Schüler Name, Klasse, Code
function printStudentCards(groupId) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  const students = sortStudents(db.students[groupId] || []);
  if (!students.length) { showToast('Keine Schüler in dieser Klasse', 'error'); return; }
  if (students.map(ensureStudentAccess).includes(true)) saveDB();
  document.getElementById('print-area').innerHTML = `<div class="sa-cards">${students.map(st => `<div class="sa-card-print">
      <div class="sa-cp-qr">${studentAppQR(studentAppLink(studentAccessOf(st)), 'Code für ' + st.firstName)}</div>
      <div class="sa-cp-text"><b>${escHtml(`${st.firstName} ${st.lastName}`.trim())}</b><span>${escHtml([g.className, g.subject].filter(Boolean).join(' · '))}</span>
        <small>Mit der Handy-Kamera scannen. Deine Seite gehört nur dir: Gib den Code nicht weiter.</small></div></div>`).join('')}</div>`;
  const prev = document.title;
  document.title = `Schülerapp_Kaertchen_${g.className}`.replace(/[\\/:*?"<>|\s]+/g, '_');
  window.print();
  document.title = prev;
}

// ── Sticker geben, Baustelle geben (ein Fenster, AJ2b) ──
let giveState = null;   // { mode: 'sticker'|'bau', groupId, studentId, choice } – nur Ansicht, nie in db
function openGive(mode, groupId, studentId) {
  const g = db.groups.find(x => x.id === groupId), s = findStudentIn(groupId, studentId);
  if (!g || !s) return;
  const p = personalOf(g);
  if (mode === 'sticker' && !p.stickers.length) { showToast('Noch keine Sticker angelegt (Reiter „Schülerapp“)', 'error'); return; }
  giveState = { mode, groupId, studentId, choice: mode === 'sticker' ? p.stickers[0].id : '' };
  document.getElementById('gs-title').textContent = `${mode === 'sticker' ? 'Sticker' : 'Baustelle'} für ${s.firstName}`;
  document.getElementById('gs-reason-label').textContent = mode === 'sticker' ? 'Wofür?' : 'Was soll besser werden?';
  const input = document.getElementById('gs-reason');
  input.value = '';
  input.placeholder = mode === 'sticker' ? 'z. B. hat die Umformung super erklärt' : 'kurzer Satz';
  document.getElementById('gs-hint').textContent = mode === 'sticker'
    ? `Das sieht ${s.firstName} mit Datum in der App.`
    : `Nur ${s.firstName} sieht das in der App. Geschafft gibt es den Sticker „Baustelle geschafft“ und ${p.bauXP} XP.`;
  document.getElementById('gs-save').textContent = mode === 'sticker' ? 'Geben' : 'Baustelle geben';
  renderGiveChoices();
  openModal('modal-give-sticker');
}
function renderGiveChoices() {
  const st = giveState, box = document.getElementById('gs-choices');
  if (!st || !box) return;
  const g = db.groups.find(x => x.id === st.groupId);
  if (st.mode === 'sticker') {
    box.innerHTML = personalOf(g).stickers.map(x => `<button type="button" class="gs-stk${st.choice === x.id ? ' on' : ''}" data-id="${escHtml(x.id)}" aria-pressed="${st.choice === x.id}">
      <span class="gs-tile" style="--stk:${escHtml(StudentShare.stickerColor(x.color))}">${StudentShare.stickerSvg(x.icon)}</span><b>${escHtml(x.name)}</b><small>${x.xp} XP</small></button>`).join('');
    box.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => { st.choice = b.dataset.id; renderGiveChoices(); }));
  } else {
    box.innerHTML = `<div class="sw-chips">${SA_BAU_SUGGEST.map(t => `<button type="button" data-text="${escHtml(t)}">${escHtml(t)}</button>`).join('')}</div>`;
    box.querySelectorAll('[data-text]').forEach(b => b.addEventListener('click', () => { document.getElementById('gs-reason').value = b.dataset.text; }));
  }
}
function saveGive() {
  const st = giveState;
  if (!st) return;
  const g = db.groups.find(x => x.id === st.groupId), s = findStudentIn(st.groupId, st.studentId);
  if (!g || !s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  const text = document.getElementById('gs-reason').value.trim().slice(0, 120);
  const today = formatDate(new Date());
  let entry, list, label;
  if (st.mode === 'sticker') {
    const k = personalOf(g).stickers.find(x => x.id === st.choice);
    if (!k) { showToast('Bitte einen Sticker wählen', 'error'); return; }
    entry = { id: uid(), date: today, name: k.name, icon: k.icon, color: k.color, xp: k.xp, ...(text ? { reason: text } : {}) };
    list = s.stickersGiven = Array.isArray(s.stickersGiven) ? s.stickersGiven : [];
    label = `Sticker „${k.name}“ gegeben`;
  } else {
    if (!text) { showToast('Bitte kurz schreiben, was besser werden soll', 'error'); return; }
    entry = { id: uid(), date: today, text };
    list = s.baustellen = Array.isArray(s.baustellen) ? s.baustellen : [];
    label = 'Baustelle eingetragen';
  }
  list.push(entry);
  giveState = null;
  saveDB();
  closeModal('modal-give-sticker');
  refreshOpenProfile(s);
  showUndoToast(label, () => { const i = list.indexOf(entry); if (i === -1) return; list.splice(i, 1); saveDB(); refreshOpenProfile(s); });
}
function closeGive() {
  const typed = document.getElementById('gs-reason').value.trim();
  if (typed && !confirm('Eingetipptes verwerfen?')) return;
  giveState = null;
  closeModal('modal-give-sticker');
}
// Baustelle geschafft (Sticker + XP) bzw. Eintrag entfernen (Verklicken: XP gehen mit), beides mit „Rückgängig“
function finishBaustelle(groupId, studentId, b) {
  const g = db.groups.find(x => x.id === groupId), s = findStudentIn(groupId, studentId);
  if (!g || !s || !(s.baustellen || []).includes(b)) return;
  b.done = formatDate(new Date());
  b.xp = personalOf(g).bauXP;
  saveDB();
  refreshOpenProfile(s);
  showUndoToast('Baustelle geschafft', () => { if (!(s.baustellen || []).includes(b)) return; delete b.done; delete b.xp; saveDB(); refreshOpenProfile(s); });
}
function removeStudentAppEntry(groupId, studentId, field, entry, label) {
  const s = findStudentIn(groupId, studentId);
  const list = s && s[field];
  const i = Array.isArray(list) ? list.indexOf(entry) : -1;
  if (i === -1) return;   // inzwischen weg (Sync): nichts löschen (Regel 9)
  list.splice(i, 1);
  saveDB();
  refreshOpenProfile(s);
  showUndoToast(label, () => { if (list.includes(entry)) return; list.splice(Math.min(i, list.length), 0, entry); saveDB(); refreshOpenProfile(s); });
}

// Sticker-Katalog und Regeln im Reiter „Schülerapp“
function setPersonalList(groupId, field, list) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  ensurePersonal(g)[field] = list;
  saveDB();
}
function setPersonalBauXP(groupId, v) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  ensurePersonal(g).bauXP = clampInt(v, 0, 200, SA_BAU_DEFAULT_XP);
  saveDB();
}
const stickerTile = (icon, color) => `<span class="gs-tile" style="--stk:${escHtml(StudentShare.stickerColor(color))}">${StudentShare.stickerSvg(icon)}</span>`;
const optionList = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${escHtml(k)}"${k === cur ? ' selected' : ''}>${escHtml(v)}</option>`).join('');
const colorOptions = cur => SA_COLOR_NAMES.map((n, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${n}</option>`).join('');
function stickerEditorHTML(p) {
  return `<div class="form-group"><span class="group-label">Sticker von dir</span>
      <div class="sa-stk-list" id="sa-stk-list">${p.stickers.map(x => `<div class="sa-stk-row" data-id="${escHtml(x.id)}">${stickerTile(x.icon, x.color)}
        <input type="text" class="form-input" data-f="name" maxlength="30" value="${escHtml(x.name)}" aria-label="Name des Stickers">
        <button type="button" class="btn-icon" data-del aria-label="Sticker ${escHtml(x.name)} entfernen">✕</button>
        <div class="sa-stk-opts"><select class="form-input" data-f="icon" aria-label="Symbol">${optionList(SA_ICON_NAMES, x.icon)}</select>
          <select class="form-input" data-f="color" aria-label="Farbe">${colorOptions(x.color)}</select>
          <label class="sa-xp"><input type="number" class="form-input" data-f="xp" min="0" max="200" value="${x.xp}" aria-label="XP"> XP</label></div></div>`).join('')}</div>
      <div class="sa-row-btns"><button type="button" class="btn-secondary" id="sa-stk-add">+ Sticker</button></div>
      <p class="field-hint-muted">Vergibst du im Schüler-Fenster (Mehr → Schülerapp → Sticker geben), mit Grund. Schon vergebene bleiben, wie sie waren.</p></div>
    <div class="form-group"><span class="group-label">Sticker, die von selbst kommen</span>
      <div class="sa-stk-list" id="sa-auto-list">${p.autoStickers.map(x => `<div class="sa-stk-row is-auto" data-id="${escHtml(x.id)}">${stickerTile(x.icon, x.color)}
        <input type="text" class="form-input" data-f="name" maxlength="30" value="${escHtml(x.name)}" aria-label="Name des Stickers">
        <button type="button" class="btn-icon" data-del aria-label="Regel ${escHtml(x.name)} entfernen">✕</button>
        <div class="sa-stk-opts"><span class="sa-rule">Wenn <input type="number" class="form-input" data-f="n" min="1" max="99" value="${x.n}" aria-label="Anzahl">×
          <select class="form-input" data-f="kind" aria-label="Was zählt">${optionList(SA_AUTO_KINDS, x.kind)}</select>
          <select class="form-input" data-f="mode" aria-label="Wie gezählt">${optionList(SA_AUTO_MODES, x.mode)}</select></span>
          <select class="form-input" data-f="icon" aria-label="Symbol">${optionList(SA_ICON_NAMES, x.icon)}</select>
          <select class="form-input" data-f="color" aria-label="Farbe">${colorOptions(x.color)}</select></div></div>`).join('')}</div>
      <div class="sa-row-btns"><button type="button" class="btn-secondary" id="sa-auto-add">+ Regel</button></div>
      <p class="field-hint-muted">Gezählt wird in Stunden der Klasse; ein Fehltag unterbricht keine Serie. Diese Sticker geben keine XP (die Plusse zählen schon).</p></div>
    <div class="form-group sa-bau-xp"><label for="sa-bau-xp">Baustelle geschafft bringt</label><input type="number" id="sa-bau-xp" class="form-input" min="0" max="200" value="${p.bauXP}"> XP</div>`;
}
function wireStickerEditor(content, g) {
  const read = (box, auto) => [...content.querySelectorAll(`#${box} .sa-stk-row`)].map(row => {
    const f = k => row.querySelector(`[data-f="${k}"]`).value;
    return auto ? cleanAuto({ id: row.dataset.id, name: f('name'), icon: f('icon'), color: f('color'), kind: f('kind'), n: f('n'), mode: f('mode') })
      : cleanSticker({ id: row.dataset.id, name: f('name'), icon: f('icon'), color: f('color'), xp: f('xp') });
  }).filter(Boolean);
  [['sa-stk-list', 'stickers', false], ['sa-auto-list', 'autoStickers', true]].forEach(([box, field, auto]) => {
    const el = content.querySelector('#' + box);
    if (!el) return;
    el.addEventListener('change', e => {
      setPersonalList(g.id, field, read(box, auto));
      if (e.target.matches('[data-f="icon"], [data-f="color"]')) renderStudentAppTab();   // Vorschau des Stickers
    });
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      b.closest('.sa-stk-row').remove();
      setPersonalList(g.id, field, read(box, auto));
      renderStudentAppTab();
    }));
  });
  content.querySelector('#sa-stk-add')?.addEventListener('click', () => {
    setPersonalList(g.id, 'stickers', [...personalOf(g).stickers, { id: uid(), name: 'Neuer Sticker', icon: 'star', color: 5, xp: 20 }]);
    renderStudentAppTab();
  });
  content.querySelector('#sa-auto-add')?.addEventListener('click', () => {
    setPersonalList(g.id, 'autoStickers', [...personalOf(g).autoStickers, { id: uid(), name: 'Neue Regel', icon: 'medal', color: 3, kind: 'any', n: 5, mode: 'total' }]);
    renderStudentAppTab();
  });
  content.querySelector('#sa-bau-xp')?.addEventListener('change', e => setPersonalBauXP(g.id, e.target.value));
}

// ── Anzeigen ──
function personalCardHTML(g) {
  const p = personalOf(g), n = (db.students[g.id] || []).length, cls = escHtml(g.className);
  const step = personalStep(g);
  const rankPh = i => i < 4 ? `Level ${2 * i + 1}–${2 * i + 2}` : 'ab Level 9';
  return `<section class="set-card sa-card" id="sa-personal">
    <div class="sa-head"><div><h3 class="sa-subtitle">Persönliche Seiten</h3>
      <p class="sa-status">Jeder Schüler bekommt einen eigenen Link: Level, Rückmeldung zur Mitarbeit, Rang und Joker. Keine Noten, keine Fehlzeiten.</p></div>
      <label class="toggle-switch" title="Persönliche Seiten"><input type="checkbox" id="sa-personal-on" aria-label="Persönliche Seiten für die ${cls}"${p.on ? ' checked' : ''}><span class="toggle-slider"></span></label></div>
    <p class="sa-privacy">Datenschutz: Das sind Daten über einzelne Schüler (verschlüsselt in der Cloud, lesbar nur mit dem Link). Vorher mit Schulleitung bzw. Datenschutzbeauftragten klären und die Eltern informieren.</p>
    ${p.on ? `<div class="form-group"><label for="sa-level">Tempo der Level</label>
        <select id="sa-level" class="form-input">${Object.keys(SA_LEVELS).map(k => `<option value="${k}"${k === p.level ? ' selected' : ''}>${SA_LEVEL_NAMES[k]}</option>`).join('')}</select>
        <p class="field-hint-muted">Mittlere Schüler erreichen bis zum Schuljahresende etwa Level ${SA_LEVELS[p.level]}. Ein Level braucht ${step} XP; + gibt 10, ++ gibt 20. Abgezogen wird nie etwas.</p></div>
      <div class="form-group"><span class="group-label">Ränge (alle 2 Level ein neuer)</span>
        <div class="sa-ranks">${p.ranks.map((r, i) => `<label class="sa-rank"><span class="rank-chip t-${SA_TIERS[i][0]}" title="${SA_TIERS[i][1]}"></span>
          <input type="text" class="form-input" data-rank="${i}" maxlength="24" value="${escHtml(r)}" placeholder="${SA_TIERS[i][1]} (${rankPh(i)})" aria-label="Rang ${SA_TIERS[i][1]}, ${rankPh(i)}"></label>`).join('')}</div>
        <div class="sa-row-btns"><button type="button" class="btn-secondary" data-preset="heft">Vorlage Heft</button><button type="button" class="btn-secondary" data-preset="gaming">Vorlage Gaming</button><button type="button" class="btn-secondary" data-preset="">Leeren</button></div>
        <p class="field-hint-muted">Jeder Rang hat seine Farbe (Bronze, Silber, Gold, Platin, Diamant). Leer lassen heißt: der Rang heißt wie seine Farbe. Alle in der Klasse sehen dieselben Namen.</p></div>
      <div class="form-group"><label for="sa-jokers">Joker, einer pro Zeile</label>
        <textarea id="sa-jokers" class="form-input sa-jokers" rows="5">${escHtml(p.jokers.join('\n'))}</textarea>
        <p class="field-hint-muted">Alle ${SA_JOKER_EVERY} Level gibt es einen Joker, höchstens ${SA_JOKER_MAX} im Schuljahr. Der Schüler sucht beim Einlösen aus, du hakst ihn im Schüler-Fenster ab.</p></div>
      ${stickerEditorHTML(p)}
      <div class="sa-row-btns"><button type="button" class="btn-secondary" id="sa-cards">${icon('printer')}Kärtchen drucken (${n})</button></div>
      <p class="field-hint-muted">Einzeln zum Scannen: Schüler-Fenster → Mehr → Schülerapp → „Code zeigen“.</p>` : ''}
  </section>`;
}
function wirePersonalCard(content, g) {
  content.querySelector('#sa-personal-on')?.addEventListener('change', e => setPersonalOn(g.id, e.target.checked));
  content.querySelector('#sa-level')?.addEventListener('change', e => setPersonalLevel(g.id, e.target.value));
  const rankInputs = [...content.querySelectorAll('[data-rank]')];
  rankInputs.forEach(el => el.addEventListener('change', () => setPersonalRanks(g.id, rankInputs.map(x => x.value))));
  content.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    setPersonalRanks(g.id, SA_RANK_PRESETS[b.dataset.preset] || []);
    renderStudentAppTab();
  }));
  content.querySelector('#sa-jokers')?.addEventListener('change', e => setPersonalJokers(g.id, e.target.value));
  content.querySelector('#sa-cards')?.addEventListener('click', () => printStudentCards(g.id));
  wireStickerEditor(content, g);   // AJ2b
}
// Schüler-Fenster, Abschnitt „Schülerapp“: Geben offen (im Unterricht ohne „Anzeigen“), Level, Joker, Baustellen-Text
// und vergebene Sticker erst nach „Anzeigen“ (data-private, Regel 16/80)
function renderStudentAppSection(s) {
  const sec = document.getElementById('sw-sec-studentapp'), box = document.getElementById('sw-studentapp');
  if (!sec || !box) return;
  const g = db.groups.find(x => x.id === profileGroupId);
  const on = !!(g && personalActive(g));
  sec.hidden = !on;
  if (!on) { box.innerHTML = ''; return; }
  const today = formatDate(new Date());
  const info = studentPersonalInfo(g, s, today);
  const used = yearList(s.jokersUsed, today);
  const openBau = (s.baustellen || []).filter(b => b && !b.done && String(b.text || '').trim());
  const given = yearList(s.stickersGiven, today).slice().sort((a, b) => b.date.localeCompare(a.date));
  const doneBau = yearList(s.baustellen, today, 'done');
  box.innerHTML = `<div class="sa-row-btns"><button type="button" class="btn-primary" id="sw-sa-sticker">${icon('star')}Sticker geben</button>
      <button type="button" class="btn-secondary" id="sw-sa-bau">Baustelle geben</button>
      <button type="button" class="btn-secondary" id="sw-sa-code">${icon('qr')}Code zeigen</button></div>
    ${openBau.length ? `<p class="sw-sa-count">${openBau.length === 1 ? '1 Baustelle offen' : `${openBau.length} Baustellen offen`}</p>` : ''}
    <div class="sw-sa-private" data-private>
      <div class="sw-sa-line"><b>Level ${info.level}</b>${info.rank ? ` · ${escHtml(info.rank)}` : ''} · ${info.xp} XP <small>(noch ${info.next - info.xp} bis Level ${info.level + 1})</small></div>
      <div class="sw-sa-line">Joker: <b>${info.jokers.open} frei</b> <small>(${info.jokers.earned} verdient, ${info.jokers.used} eingelöst)</small></div>
      ${used.length ? `<div class="sw-sa-used">${used.slice().reverse().map(j => `<span>${escHtml(formatDateShort(j.date))}${j.text ? ': ' + escHtml(j.text) : ''}</span>`).join('')}</div>` : ''}
      ${openBau.map((b, i) => `<div class="sw-sa-bau"><span>Baustelle seit ${escHtml(formatDateShort(b.date))}: <b>${escHtml(b.text)}</b></span>
        <button type="button" class="btn-secondary" data-bau-done="${i}">Geschafft</button><button type="button" class="entry-item-delete" data-bau-del="${i}" aria-label="Baustelle entfernen">✕</button></div>`).join('')}
      ${given.length || doneBau.length ? `<div class="entry-list sw-sa-given">${given.map((x, i) => `<div class="entry-item">${stickerTile(x.icon, x.color)}
          <span class="entry-item-text"><b>${escHtml(x.name)}</b>${x.reason ? ` · ${escHtml(x.reason)}` : ''}</span><span class="entry-item-date">${escHtml(formatDateShort(x.date))}</span>
          <button class="entry-item-delete" data-stk-del="${i}" aria-label="Sticker ${escHtml(x.name)} entfernen">✕</button></div>`).join('')}
        ${doneBau.map(b => `<div class="entry-item">${stickerTile('crane', 1)}<span class="entry-item-text"><b>Baustelle geschafft</b> · ${escHtml(b.text)}</span><span class="entry-item-date">${escHtml(formatDateShort(b.done))}</span></div>`).join('')}</div>` : ''}
      <div class="sa-row-btns">${info.jokers.open ? '<button type="button" class="btn-secondary" id="sw-sa-joker">Joker einlösen</button>' : ''}
        <button type="button" class="btn-secondary" id="sw-sa-renew">${icon('refresh')}Neuer Link</button></div>
    </div>`;
  box.querySelector('#sw-sa-sticker').addEventListener('click', () => openGive('sticker', g.id, s.id));
  box.querySelector('#sw-sa-bau').addEventListener('click', () => openGive('bau', g.id, s.id));
  box.querySelector('#sw-sa-code').addEventListener('click', () => showStudentCode(g.id, s.id));
  box.querySelector('#sw-sa-joker')?.addEventListener('click', () => redeemJoker(g.id, s.id));
  box.querySelector('#sw-sa-renew').addEventListener('click', () => renewStudentAccess(g.id, s.id));
  box.querySelectorAll('[data-bau-done]').forEach(b => b.addEventListener('click', () => finishBaustelle(g.id, s.id, openBau[Number(b.dataset.bauDone)])));
  box.querySelectorAll('[data-bau-del]').forEach(b => b.addEventListener('click', () => removeStudentAppEntry(g.id, s.id, 'baustellen', openBau[Number(b.dataset.bauDel)], 'Baustelle entfernt')));
  box.querySelectorAll('[data-stk-del]').forEach(b => b.addEventListener('click', () => removeStudentAppEntry(g.id, s.id, 'stickersGiven', given[Number(b.dataset.stkDel)], 'Sticker entfernt')));
}

// ─── Schuljahreswechsel (Y6) ─────────────────────────────────────────────────
// Einstellungen → Daten & Cloud → „Neues Schuljahr beginnen“: 1. sichern, 2. je Klasse übernehmen (neuer Name, Schüler
// bleiben mit Hinweisen, Geburtstag und Sitzplatz) oder löschen, Planung auf Wunsch als Vorlage, 3. Zusammenfassung.
// Danach sind alle Einträge des Jahres weg (Noten, Fehlzeiten, Mitarbeit, HA, Schülernotizen, Klassennotizen,
// Stundenplan mit Stundendaten, Aufsichten), Halbjahres-/Schuljahresende und vergangene Ferien zurückgesetzt,
// Schülerapp-Links neu. Vorher liegt der alte Stand im Sicherheitsnetz (Einstellungen → „Früheren Stand zurückholen“).
const NEWYEAR_HINT_KEY = 'newyear_hint_dismissed';
let newYearState = null;   // { step, backedUp, choices: [{ id, action: 'keep'|'delete', name, template }] } – nie in db
function planTemplatesOf() {
  return (Array.isArray(db.planTemplates) ? db.planTemplates : []).filter(t => t && t.id && Array.isArray(t.topics));
}
// „7b“ → „8b“, „Q11“ → „Q12“; ohne Zahl bleibt der Name (änderbar)
const nextClassName = name => String(name || '').replace(/\d+/, n => String(Number(n) + 1));
function nextYearLabel(y) {
  const m = /^(\d{4})\/(\d{2})$/.exec(String(y || '').trim());
  return m ? `${Number(m[1]) + 1}/${String((Number(m[2]) + 1) % 100).padStart(2, '0')}` : y;
}
const YEAR_LISTS = ['grades', 'attendance', 'participation', 'homework', 'studentNotes', 'jokersUsed', 'stickersGiven', 'baustellen'];
function hasYearData() {
  return Object.values(db.students || {}).some(l => (l || []).some(s => s && YEAR_LISTS.some(f => (s[f] || []).length)))
    || Object.keys(db.lessonData || {}).length > 0;
}
// Die eigentliche Umstellung. Ändert db, speichert nicht. Klassen ohne Wahl (z. B. per Sync dazugekommen) bleiben unter
// ihrem Namen (Regel 7: nie still löschen). Liefert eine kleine Zusammenfassung.
const hasEntries = g => (db.students[g.id] || []).some(st => YEAR_LISTS.some(f => Array.isArray(st && st[f]) && st[f].length));
function applyNewSchoolYear(choices, todayStr = formatDate(new Date())) {
  const byId = new Map((choices || []).map(c => [c.id, c]));
  const yearOfOld = schoolYearLabel(addDays(parseDate(todayStr), -60));   // der Wechsel läuft meist in den Sommerferien
  const out = { kept: 0, deleted: 0, templates: 0 };
  db.groups.forEach(g => {
    const c = byId.get(g.id);
    const topics = groupPlan(g).filter(t => String(t.title || '').trim());
    if (!c || !c.template || !topics.length) return;
    (db.planTemplates = Array.isArray(db.planTemplates) ? db.planTemplates : []).push({
      id: uid(), name: [g.subject, g.className].filter(Boolean).join(' '), year: hasEntries(g) ? reportSchoolYear(g, todayStr) : yearOfOld, created: todayStr,
      topics: topics.map(t => {
        const x = { id: uid(), title: String(t.title).trim() };
        if (topicLength(t) > 1) x.lessons = topicLength(t);
        if (t.note) x.note = t.note;
        return x;
      }),
    });
    out.templates++;
  });
  (choices || []).filter(c => c.action === 'delete' && db.groups.some(g => g.id === c.id)).forEach(c => { removeGroupData(c.id); out.deleted++; });
  db.groups.forEach(g => {
    const c = byId.get(g.id);
    const name = c && String(c.name || '').trim();
    if (name) g.className = name;
    if (g.year) g.year = nextYearLabel(g.year);
    ['gradeEvents', 'attendanceEvents', 'participationEvents', 'homeworkEvents', 'plan', 'classNotes'].forEach(f => { if (Array.isArray(g[f])) g[f] = []; });
    const sa = g.studentApp;
    if (sa && typeof sa === 'object') {   // neuer Link: Ehemalige sehen die Klasse nicht mehr (Regel 95)
      if (sa.access && sa.access.id) { queueShareDeletion(sa.access.id); sa.access = StudentShare.newAccess(); }
      delete sa.goal;
      // Level-Tempo passt zum alten Stundenplan: neu festlegen, sobald der neue steht (AR19, publishPersonalPages)
      if (sa.personal && typeof sa.personal === 'object') delete sa.personal.step;
    }
    (db.students[g.id] || []).forEach(st => {
      if (!st) return;
      YEAR_LISTS.forEach(f => { st[f] = []; });   // Hinweise, Geburtstag, Sitzplatz bleiben
      const acc = studentAccessOf(st);            // persönliche Seite: neuer Link wie die Klasse (AJ2)
      if (acc) { queueShareDeletion(acc.id); st.studentApp = { ...st.studentApp, access: StudentShare.newAccess() }; }
    });
    out.kept++;
  });
  db.lessonSlots = [];
  db.lessonData = {};
  db.supervisions = [];
  db.acknowledgedWarnings = {};
  delete db.settings.halfYearEnd;
  delete db.settings.schoolYearEnd;
  if (Array.isArray(db.settings.holidays)) db.settings.holidays = db.settings.holidays.filter(h => h && isDateStr(h.until) && h.until >= todayStr);
  periodChoice = null;
  return out;
}

function openNewYear() {
  if (!db.groups.length) { showToast('Noch keine Klassen', 'error'); return; }
  // Einstellungen wie mit ihrem Schließen-Knopf verlassen (Rückfrage, Farbvorschau zurück); bleiben sie offen, abbrechen (AU5)
  const settings = document.getElementById('modal-settings');
  if (!settings.classList.contains('hidden')) {
    closeModalLikeButton('modal-settings');
    if (!settings.classList.contains('hidden')) return;
  }
  newYearState = {
    step: 1, backedUp: false,
    choices: db.groups.slice().sort((a, b) => (a.className || '').localeCompare(b.className || '', undefined, { numeric: true }))
      .map(g => ({ id: g.id, action: 'keep', name: nextClassName(g.className), template: groupPlan(g).length > 0 })),
  };
  closeModal('modal-settings');
  renderNewYear();
  openModal('modal-new-year');
}
function newYearGroup(c) { return db.groups.find(g => g.id === c.id); }
function renderNewYear() {
  const st = newYearState, body = document.getElementById('ny-body'), foot = document.getElementById('ny-footer');
  if (!st || !body || !foot) return;
  const stepLine = `<p class="ny-step">Schritt ${st.step} von 3 · ${['Sichern', 'Klassen', 'Zusammenfassung'][st.step - 1]}</p>`;
  if (st.step === 1) {
    body.innerHTML = stepLine + `<p class="ny-lead">Danach sind alle Noten, Fehlzeiten, Mitarbeit, Hausaufgaben, Notizen und der Stundenplan des alten Jahres gelöscht. Sichere sie vorher.</p>
      <div class="ny-actions"><button type="button" class="btn-secondary" id="ny-backup">${icon('download')}Sicherung herunterladen</button>
        <button type="button" class="btn-secondary" id="ny-report">${icon('printer')}Klassen-Bericht (PDF/Excel)</button></div>
      <p class="field-hint-muted">${st.backedUp ? 'Sicherung heruntergeladen.' : 'Weiter geht es, sobald die Sicherung heruntergeladen ist.'} Die Dateien enthalten Schülerdaten unverschlüsselt.</p>`;
    body.querySelector('#ny-backup').addEventListener('click', () => { exportData(); st.backedUp = true; renderNewYear(); });
    body.querySelector('#ny-report').addEventListener('click', () => openClassReport());
  } else if (st.step === 2) {
    body.innerHTML = stepLine + `<p class="ny-lead">Übernommene Klassen behalten ihre Schüler mit Hinweisen, Geburtstagen und Sitzplan. Alles andere aus dem Jahr fällt weg.</p>`
      + st.choices.map((c, i) => {
        const g = newYearGroup(c);
        if (!g) return '';
        const n = (db.students[g.id] || []).length, topics = groupPlan(g).length;
        return `<div class="ny-row" data-i="${i}">
          <div class="ny-cls"><b>${escHtml(g.className)}</b> ${escHtml(g.subject || '')}<small>${n} ${n === 1 ? 'Schüler' : 'Schüler'}</small></div>
          <div class="sw-chips ny-act" role="group" aria-label="${escHtml(g.className)}: übernehmen oder löschen">
            <button type="button" data-act="keep" class="${c.action === 'keep' ? 'on' : ''}" aria-pressed="${c.action === 'keep'}">Übernehmen</button>
            <button type="button" data-act="delete" class="${c.action === 'delete' ? 'on' : ''}" aria-pressed="${c.action === 'delete'}">Löschen</button></div>
          ${c.action === 'keep' ? `<label class="ny-name">Neuer Name<input type="text" class="form-input" maxlength="40" value="${escHtml(c.name)}"></label>` : ''}
          ${topics ? `<label class="print-check ny-tpl"><input type="checkbox"${c.template ? ' checked' : ''}> Planung als Vorlage behalten (${topics} ${topics === 1 ? 'Thema' : 'Themen'})</label>` : ''}
        </div>`;
      }).join('');
    body.querySelectorAll('.ny-row').forEach(row => {
      const c = st.choices[Number(row.dataset.i)];
      row.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => { c.action = b.dataset.act; renderNewYear(); }));
      row.querySelector('.ny-name input')?.addEventListener('input', e => { c.name = e.target.value; });
      row.querySelector('.ny-tpl input')?.addEventListener('change', e => { c.template = e.target.checked; });
    });
  } else {
    const live = st.choices.filter(c => newYearGroup(c));
    const keep = live.filter(c => c.action === 'keep'), del = live.filter(c => c.action === 'delete'), tpl = live.filter(c => c.template && groupPlan(newYearGroup(c)).length);
    const names = list => list.map(c => {
      const g = newYearGroup(c);
      return c.action === 'keep' && c.name.trim() && c.name.trim() !== g.className ? `${g.className} → ${c.name.trim()}` : g.className;
    }).map(escHtml).join(', ');
    body.innerHTML = stepLine + `<ul class="ny-sum">
        ${keep.length ? `<li><b>Übernommen:</b> ${names(keep)}</li>` : ''}
        ${del.length ? `<li><b>Gelöscht:</b> ${names(del)}</li>` : ''}
        ${tpl.length ? `<li><b>Vorlagen:</b> ${tpl.length} ${tpl.length === 1 ? 'Planung' : 'Planungen'} (unter Planung → „Von Klasse oder Vorlage übernehmen“)</li>` : ''}
        <li>Noten, Fehlzeiten, Mitarbeit, Hausaufgaben, Schüler- und Klassennotizen werden gelöscht.</li>
        <li>Stundenplan und Aufsichten werden geleert, Halbjahres- und Schuljahresende sowie vergangene Ferien zurückgesetzt.</li>
        ${live.some(c => c.action === 'keep' && studentAppOf(newYearGroup(c)).access) ? '<li>Freigegebene Klassen bekommen einen neuen Schülerapp-Link.</li>' : ''}
      </ul>
      <p class="field-hint-muted">Der alte Stand bleibt in deiner Sicherungsdatei und auf diesem Gerät (Einstellungen → Daten & Cloud → „Früheren Stand zurückholen“).</p>`;
  }
  foot.innerHTML = (st.step > 1 ? '<button type="button" class="btn-secondary" id="ny-back">Zurück</button>' : '')
    + (st.step < 3 ? `<button type="button" class="btn-primary" id="ny-next"${st.step === 1 && !st.backedUp ? ' disabled' : ''}>Weiter</button>`
      : '<button type="button" class="btn-primary" id="ny-go">Neues Schuljahr beginnen</button>');
  foot.querySelector('#ny-back')?.addEventListener('click', () => { st.step--; renderNewYear(); });
  foot.querySelector('#ny-next')?.addEventListener('click', () => { if (st.step === 1 && !st.backedUp) return; st.step++; renderNewYear(); });
  foot.querySelector('#ny-go')?.addEventListener('click', () => finishNewYear());
}
function closeNewYear() {
  if (newYearState && newYearState.step > 1 && !confirm('Schuljahreswechsel abbrechen?\n\nEs wurde noch nichts geändert.')) return;
  newYearState = null;
  closeModal('modal-new-year');
}
async function finishNewYear() {
  const st = newYearState;
  if (!st) return;
  const dbAtStart = db;   // Regel 32: über das await hinweg
  const before = JSON.stringify(db);
  let kept = false;
  try { await keepMergeBackup(before, before, 'newYear'); kept = true; } catch (e) { console.warn('Sicherheitsnetz nicht gespeichert:', e.message); }
  if (!kept && !confirm('Das Sicherheitsnetz auf diesem Gerät ließ sich nicht anlegen. Deine Sicherungsdatei hast du heruntergeladen.\n\nTrotzdem fortfahren?')) return;
  if (db !== dbAtStart || newYearState !== st) { showToast('Die Daten haben sich inzwischen geändert (z. B. durch Sync). Bitte noch einmal starten', 'error'); closeModal('modal-new-year'); return; }
  const sum = applyNewSchoolYear(st.choices);
  newYearState = null;
  saveDB();
  closeModal('modal-new-year');
  replaceDB(db);   // alles neu zeichnen, Auswahl zurücksetzen (Regel 32)
  renderDashboard();
  showToast(`Neues Schuljahr: ${sum.kept} ${sum.kept === 1 ? 'Klasse' : 'Klassen'} übernommen${sum.deleted ? `, ${sum.deleted} gelöscht` : ''}`);
  const next = await askChoice('Neues Schuljahr eingerichtet', 'Als Nächstes: Ferien laden, Halbjahres- und Schuljahresende eintragen und den neuen Stundenplan anlegen.',
    [{ label: 'Später', value: null }, { label: 'Zum Stundenplan', value: 'timetable' }, { label: 'Ferien und Termine', value: 'holidays', primary: true }]);
  if (next === 'timetable') switchView('timetable');
  if (next === 'holidays') { openSettings(); showSettingsPane('holidays'); }
}

// Vorlagen der Planung in den Einstellungen: ansehen und löschen (mit „Rückgängig“, Regel 45)
function renderPlanTemplatesSetting() {
  const box = document.getElementById('plan-templates-list');
  if (!box) return;
  const list = planTemplatesOf();
  box.closest('.set-card')?.querySelector('.ny-tpl-head')?.classList.toggle('hidden', !list.length);
  box.innerHTML = list.map(t => `<div class="entry-item" data-id="${escHtml(t.id)}"><span class="entry-item-text">${escHtml(t.name)}${t.year ? ` <small>${escHtml(t.year)}</small>` : ''}</span>
    <span class="entry-item-date">${t.topics.length} ${t.topics.length === 1 ? 'Thema' : 'Themen'}</span><button class="entry-item-delete" aria-label="Vorlage ${escHtml(t.name)} löschen">✕</button></div>`).join('');
  box.querySelectorAll('.entry-item').forEach(el => {
    const t = list.find(x => x.id === el.dataset.id);
    el.querySelector('.entry-item-delete').addEventListener('click', () => deletePlanTemplate(t));
  });
}
function deletePlanTemplate(t) {
  const arr = Array.isArray(db.planTemplates) ? db.planTemplates : [];
  const i = arr.indexOf(t);
  if (i === -1) { renderPlanTemplatesSetting(); return; }   // inzwischen weg (Sync): nichts löschen (Regel 9)
  arr.splice(i, 1);
  saveDB();
  renderPlanTemplatesSetting();
  showUndoToast(`Vorlage „${t.name}“ gelöscht`, () => {
    db.planTemplates = Array.isArray(db.planTemplates) ? db.planTemplates : [];
    if (db.planTemplates.some(x => x.id === t.id)) return;
    db.planTemplates.splice(Math.min(i, db.planTemplates.length), 0, t);
    saveDB();
    renderPlanTemplatesSetting();
  });
}
// Leiser Hinweis im Dashboard ab den Sommerferien bzw. nach dem Schuljahresende (Regel 82: höchstens einer, nie ein Dialog)
// Nur, wenn es noch Einträge aus dem alten Jahr gibt (AR17): von vor den laufenden Sommerferien bzw. vor dem
// Schuljahresende, und das Ende liegt höchstens 8 Wochen zurück (sonst erschiene der Hinweis mitten im Schuljahr).
function yearDataBefore(cutoff) {
  return Object.values(db.students || {}).some(l => (l || []).some(s => s && YEAR_LISTS.some(f => (Array.isArray(s[f]) ? s[f] : []).some(x => x && isDateStr(x.date) && x.date < cutoff))))
    || Object.keys(db.lessonData || {}).some(k => k.slice(k.lastIndexOf('_') + 1) < cutoff);
}
function newYearNoteDue(todayStr = formatDate(new Date())) {
  if (!hasYearData()) return false;
  const h = holidayAt(todayStr);
  const summer = !!(h && /sommer/i.test(h.label || '')) && yearDataBefore(h.from);
  const ye = db.settings.schoolYearEnd;
  const after = isDateStr(ye) && todayStr > ye && todayStr <= formatDate(addDays(parseDate(ye), 56)) && yearDataBefore(formatDate(addDays(parseDate(ye), 1)));
  return (summer || after) && deviceHint(NEWYEAR_HINT_KEY) !== todayStr.slice(0, 4);
}

// Starte Sync-Initialisierung beim Laden
initSync();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateStudentAverage,
    get db() { return db; },
    set db(v) { db = v; }
  };
}

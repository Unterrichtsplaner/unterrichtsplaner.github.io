// ▸ Einstellungen: Darstellung, Ferien, Stundenzeiten, Export/Import, Schuljahreswechsel
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.

// Standard-Design: hell, Hintergrund Eisblau, Akzent Tinte (02.11.2026). „Standard“ wird nie gespeichert
// (themeBg fehlt), damit alle, die nie selbst gewählt haben, einen neuen Standard bekommen (BUGS S6, AE4).
const DEFAULT_THEME = { bg: '#bfdbfe', card: '#dbeafe', mode: 'light' };
// „Automatisch (wie Gerät)“ (X6): Eisblau, bei dunkel eingestelltem Gerät Tiefsee. Gespeichert als themeAuto (ohne themeBg),
// damit ältere App-Versionen einfach den Standard zeigen. Im Formular steht dafür currentThemeBg = 'auto'.
const AUTO_DARK_THEME = { bg: '#0f172a', card: '#1e293b', mode: 'dark' };
function systemPrefersDark() {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

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

/* ═══ app.js – LehrerApp v3 ═══ */

// ─── Default blocks ──────────────────────────────────────────────────────
const DEFAULT_BLOCKS = [
  { num: 1, label: '1. Block', start: '07:45', end: '09:15' },
  { num: 2, label: '2. Block', start: '09:45', end: '11:15' },
  { num: 3, label: '3. Block', start: '11:45', end: '13:15' },
  { num: 4, label: '4. Block', start: '13:45', end: '15:15' }
];

const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
const DAY_SHORT = ['Mo','Di','Mi','Do','Fr'];

const APP_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e',
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16',
  '#22c55e','#14b8a6','#06b6d4','#3b82f6',
  '#64748b'
];
const AVATAR_COLORS = [
  ['#6366f1','#312e81'],['#ec4899','#831843'],
  ['#f59e0b','#78350f'],['#22c55e','#14532d'],['#06b6d4','#164e63'],
  ['#3b82f6','#1e3a8a'],['#f97316','#7c2d12'],
];

// ─── Icons ───────────────────────────────────────────────────────────────
// Linien-Icons wie im Menü, keine Emojis in Knöpfen/Reitern (Ausnahme: 😊😐☹️ bei der Mitarbeit).
// index.html setzt Platzhalter <i data-icon="name"></i>, fillIcons() ersetzt sie beim Start.
const ICONS = {
  student:      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'student-add':'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  classes:      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  grades:       '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  overview:     '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  participation:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  attendance:   '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>',
  absences:     '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
  content:      '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  homework:     '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  test:         '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/>',
  notes:        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  seating:      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  'x-circle':   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  'check-circle':'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  late:         '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  plus:         '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  list:         '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  download:     '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload:       '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  cloud:        '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  'cloud-down': '<polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>',
  'cloud-up':   '<polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
  save:         '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
  trash:        '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>',
  refresh:      '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  mail:         '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  copy:         '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  code:         '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  dice:         '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/>',
  alert:        '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'trend-down': '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
};
function icon(name) {
  if (!ICONS[name]) throw new Error('Unbekanntes Icon: ' + name);
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
function fillIcons(root) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });
}
fillIcons(document);

// ─── State ───────────────────────────────────────────────────────────────
// Gespeicherte Daten, die sich nicht lesen ließen (G12): Rohtext bleibt erhalten, statt beim nächsten Speichern überschrieben zu werden.
let dbLoadFailure = null; // { raw, key /*Kopie in localStorage, null = Kopie gescheitert*/, error }
let db = loadDB();
let currentWeekOffset = 0;
let activeLessonId    = null;
let activeLessonDate  = null;
let isStudentEditMode = false;
let nextLessonDate    = null; // computed when opening lesson detail
let editingSlotId     = null;
let currentGroupId    = null;
let currentStudentId  = null;
let editingStudentId  = null;
let editingGroupId    = null;
let selectedLessonColor = APP_COLORS[0];
let selectedGroupColor  = APP_COLORS[0];

// ─── DB ──────────────────────────────────────────────────────────────────
function loadDB() {
  let raw = null;
  try {
    raw = localStorage.getItem('lehrerapp_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Keine gültige Datenbank');
      return migrateDB(parsed);
    }
  } catch(e) {
    if (raw) rescueUnreadableDB(raw, e);
  }
  return emptyDB();
}
function emptyDB() {
  return {
    settings: { teacherName:'', school:'', blocks: null },
    lessonSlots: [],
    lessonData: {}, // key: slotId_YYYY-MM-DD
    groups: [],
    students: {},
  };
}
// Unlesbaren Speicherstand unter eigenem Schlüssel sichern. Klappt das nicht (Speicher voll),
// wird der alte Schlüssel nicht mehr überschrieben, bis der Nutzer die Datei heruntergeladen hat.
function rescueUnreadableDB(raw, error) {
  let key = 'lehrerapp_v3_defekt_' + Date.now();
  try { localStorage.setItem(key, raw); } catch(e) { key = null; }
  dbLoadFailure = { raw, key, error: String(error && error.message || error) };
  setTimeout(showDBLoadFailure, 0);
}
function showDBLoadFailure() {
  if (!dbLoadFailure) return;
  const where = dbLoadFailure.key
    ? 'Eine Kopie liegt weiterhin auf diesem Gerät.'
    : 'Der Speicher ist voll, deshalb konnte keine Kopie angelegt werden. Bis du die Datei heruntergeladen hast, wird auf diesem Gerät nichts gespeichert.';
  if (confirm('⚠️ Die gespeicherten Daten auf diesem Gerät konnten nicht gelesen werden.\n\n'
    + 'Die App startet deshalb leer. Deine alten Daten wurden NICHT gelöscht. ' + where + '\n\n'
    + 'Falls Cloud-Sync aktiv ist, kommen deine Daten beim nächsten Sync aus der Cloud zurück. Sonst: Sicherung importieren.\n\n'
    + 'Die unlesbaren Daten jetzt als Datei herunterladen (zur Rettung)?')) {
    downloadUnreadableDB();
  }
}
function downloadUnreadableDB() {
  if (!dbLoadFailure) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([dbLoadFailure.raw], { type: 'text/plain;charset=utf-8;' }));
  a.download = `Unterrichtsplaner_unlesbar_${formatDate(new Date())}.txt`;
  a.click();
  if (!dbLoadFailure.key) dbLoadFailure = null; // gerettet → Speichern wieder erlaubt
}
// Altdaten angleichen. Muss beliebig oft laufen dürfen; gespeichert wird beim nächsten persistDB/saveDB.
function migrateDB(data) {
  // Noten: Bemerkung hieß früher teils `label`, heute immer `note`
  Object.values(data.students || {}).forEach(list => (list || []).forEach(st => (st.grades || []).forEach(gr => {
    if (!('label' in gr)) return;
    if (gr.note === undefined) gr.note = gr.label;
    delete gr.label;
  })));
  (data.lessonSlots || []).forEach(slot => {
    // Zweiwöchig: früher nur KW gespeichert (`startWeek`), deren Parität ab 2027 kippt (KW 53).
    // Die KW stammt aus dem Schuljahr 2026 (bis 2026 lief die Parität seit 2021 durch) → Montag dieser KW 2026.
    if (slot.recurring === 'biweekly' && !slot.startDate && slot.startWeek) {
      slot.startDate = formatDate(addDays(parseDate('2025-12-29'), (slot.startWeek - 1) * 7)); // 29.12.2025 = Mo KW 1/2026
    }
    // Einmalige Stunde mit Datum auf falschem Wochentag (alter Fehler D2) → gleicher Woche, richtiger Tag
    if (isOneOffSlot(slot) && slot.specificDate && typeof slot.day === 'number') {
      const fixed = formatDate(addDays(mondayOf(parseDate(slot.specificDate)), slot.day));
      if (fixed !== slot.specificDate) slot.specificDate = fixed;
    }
  });
  // Alte Standard-Blöcke (5 Stück ab 08:00) durch die heutigen ersetzen – nur, wenn der 5. Block leer ist
  const b = data.settings && data.settings.blocks;
  if (b && b.length === 5 && b[0].start === '08:00' && b[1].start === '09:45'
      && !(data.lessonSlots || []).some(slot => slot.block === 5)) {
    data.settings.blocks = DEFAULT_BLOCKS.map(x => ({ ...x }));
  }
  // Sync-Stand alter App-Versionen (ohne `syncedLocalModified`): gilt als synchron, wenn der Stand direkt
  // aus der Cloud kam (gleiche Kennung) oder das alte `saveDB(true)` ihn kurz nach dem Upload neu gestempelt hat.
  // Sonst bleibt er „lokal geändert“ – das ist der sichere Fall.
  const ss = data.syncSettings;
  if (ss && !('syncedLocalModified' in ss) && typeof ss.lastSyncedCloudTimestamp === 'number'
      && data.settings && typeof data.settings.lastModified === 'number') {
    const diff = data.settings.lastModified - ss.lastSyncedCloudTimestamp;
    if (diff >= 0 && diff < 10000) ss.syncedLocalModified = data.settings.lastModified;
  }
  return data;
}
// Für jede Änderung durch den Nutzer: markiert die Daten als geändert und stößt den Cloud-Sync an.
function saveDB() {
  if (!db.settings) db.settings = {};
  db.settings.lastModified = Date.now();
  persistDB();

  // Automatischer Cloud-Hintergrundsync (Autosave)
  if (typeof SyncManager !== 'undefined' && SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword) {
    if (window.syncTimeout) clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
      triggerSyncInternal();
    }, 3000); // 3 Sekunden Verzögerung nach der letzten Eingabe
  }
}
// Nur speichern, ohne die Daten als „geändert“ zu markieren (z. B. Sync-Metadaten).
function persistDB() {
  if (dbLoadFailure && !dbLoadFailure.key) {
    showToast('Nicht gespeichert: alte Daten zuerst herunterladen', 'error');
    return;
  }
  localStorage.setItem('lehrerapp_v3', JSON.stringify(db));
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function sortStudents(studentsArr) {
  const order = (db.settings && db.settings.studentSortOrder) || 'firstName';
  return [...studentsArr].sort((a, b) => {
    if (order === 'firstName') {
      const c = (a.firstName||'').localeCompare(b.firstName||'');
      return c !== 0 ? c : (a.lastName||'').localeCompare(b.lastName||'');
    } else {
      const c = (a.lastName||'').localeCompare(b.lastName||'');
      return c !== 0 ? c : (a.firstName||'').localeCompare(b.firstName||'');
    }
  });
}

// Blöcke des Stundenplans. `num` ist die feste Kennung, auf die Stunden verweisen (nie umnummerieren).
function getBlocks() {
  const b = db.settings && db.settings.blocks;
  if (b && b.length) return b;
  return DEFAULT_BLOCKS.map(x => ({ ...x })); // Kopie: die Konstante darf nie verändert werden
}

// ─── Navigation ──────────────────────────────────────────────────────────
function switchView(name) {
  if (name !== 'seating' && typeof seatingEditMode !== 'undefined' && seatingEditMode) {
    toggleSeatingEditMode();
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  const navEl = document.getElementById('nav-' + name);
  if (viewEl) viewEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  if (name === 'dashboard') renderDashboard();
  if (name === 'seating') initSeatingPlan();
  if (name === 'classes') renderSubjectGroups();
  if (name === 'timetable') renderTimetable();
}
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Gezielt geöffnet (Klasse/Stunde): diese Klasse zeigen, nicht die laufende Stunde vorschlagen (BUGS E1)
function openSeatingForGroup(groupId, dateStr) {
  closeModal('modal-lesson');
  seatingRequest = { groupId, dateStr };
  switchView('seating');
}

function openSeatingForActiveLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (slot && slot.groupId) {
    openSeatingForGroup(slot.groupId, activeLessonDate);
  }
}

// ─── Week helpers ────────────────────────────────────────────────────────
function getWeekDates(offset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat

  // On weekends, automatically show the upcoming school week
  const adjustedNow = new Date(now);
  if (dayOfWeek === 6) adjustedNow.setDate(now.getDate() + 2); // Sa → Mo
  if (dayOfWeek === 0) adjustedNow.setDate(now.getDate() + 1); // So → Mo

  const day = adjustedNow.getDay() || 7; // make Sun=7 for Mon-based calc
  const monday = new Date(adjustedNow);
  monday.setDate(adjustedNow.getDate() - day + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({length: 5}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function formatDate(d) {
  // Use LOCAL date components to avoid UTC-offset day-shift bug
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// 'YYYY-MM-DD' als lokales Datum (mittags, damit Zeitzone/Sommerzeit den Tag nie verschieben)
function parseDate(dateStr) { return new Date(dateStr + 'T12:00:00'); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
// Schultage = Mo–Fr. Sa/So → folgender Montag
function isSchoolDay(d) { return d.getDay() !== 0 && d.getDay() !== 6; }
function nextSchoolDay(d) { let r = new Date(d); while (!isSchoolDay(r)) r = addDays(r, 1); return r; }
// n Schultage weiter (n < 0: zurück), Wochenenden werden übersprungen
function addSchoolDays(d, n) {
  let r = new Date(d);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0;) { r = addDays(r, step); if (isSchoolDay(r)) left--; }
  return r;
}
// Fortlaufende Wochennummer seit dem Referenz-Montag 29.12.1969 – ohne Sprung am Jahreswechsel (KW 53)
function weekIndex(dateStr) {
  const d = parseDate(dateStr);
  const dayNo = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); // Tage seit 01.01.1970 (Do)
  return Math.floor((dayNo + 3) / 7);
}
function sameWeekParity(dateStrA, dateStrB) { return (weekIndex(dateStrA) - weekIndex(dateStrB)) % 2 === 0; }

// ─── Wann findet eine Stunde statt? ──────────────────────────────────────
function isOneOffSlot(slot) { return slot.recurring === false || slot.recurring === 'none'; }
// Zweiwöchig ohne Startdatum (Altdaten ohne KW) wurde schon immer jede Woche angezeigt
function isABSlot(slot) { return slot.recurring === 'biweekly' && !!slot.startDate; }
function slotOccursOn(slot, dateStr) {
  if (slot.day !== (parseDate(dateStr).getDay() + 6) % 7) return false;
  if (isOneOffSlot(slot)) return slot.specificDate === dateStr;
  if (isABSlot(slot)) return sameWeekParity(dateStr, slot.startDate);
  return true;
}
function partsOverlap(p, q) {
  p = p || 'full'; q = q || 'full';
  return p === 'full' || q === 'full' || p === q;
}
// Können zwei Stunden je am selben Tag im selben Block liegen?
function slotsShareDate(a, b) {
  if (a.day !== b.day || a.block !== b.block) return false;
  if (isOneOffSlot(a)) return slotOccursOn(b, a.specificDate);
  if (isOneOffSlot(b)) return slotOccursOn(a, b.specificDate);
  if (isABSlot(a) && isABSlot(b)) return sameWeekParity(a.startDate, b.startDate);
  return true;
}
// Stunden an einem Datum in einem Block. Eine einmalige Stunde (Vertretung) ersetzt an ihrem Tag
// die regelmäßige Stunde im selben Platz.
function lessonsAt(dateStr, blockNum) {
  const lessons = db.lessonSlots.filter(s => s.block === blockNum && slotOccursOn(s, dateStr));
  const oneOffs = lessons.filter(isOneOffSlot);
  if (!oneOffs.length) return lessons;
  return lessons.filter(s => isOneOffSlot(s) || !oneOffs.some(o => partsOverlap(o.part, s.part)));
}

function formatDateDE(d) { return d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'}); }
function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-AT',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
}
function isToday(d) {
  const t = new Date();
  return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();
}
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum = date.getUTCDay()||7;
  date.setUTCDate(date.getUTCDate()+4-dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date-yearStart)/86400000)+1)/7);
}
// ─── Tagesansicht (Handy, BUGS H2) ──────────────────────────────────────
// Schmaler als DAY_VIEW_MAX_WIDTH zeigt der Stundenplan einen Tag statt der Woche.
// timetableDay: angezeigter Tag ('YYYY-MM-DD'); null = folgt currentWeekOffset (aktuelle Woche → heute).
const DAY_VIEW_MAX_WIDTH = 700;
let timetableDay = null;
function isTimetableDayView() { return window.innerWidth < DAY_VIEW_MAX_WIDTH; }
function todaySchoolDay() { return nextSchoolDay(parseDate(formatDate(new Date()))); }
function timetableDayDate() {
  if (timetableDay) return parseDate(timetableDay);
  return currentWeekOffset === 0 ? todaySchoolDay() : parseDate(formatDate(getWeekDates(currentWeekOffset)[0]));
}
// Tag anzeigen; die Woche läuft mit, damit die Wochenansicht (z. B. nach Drehen) dieselbe Woche zeigt
function setTimetableDay(d) {
  const day = nextSchoolDay(d);
  timetableDay = formatDate(day);
  currentWeekOffset = Math.round((mondayOf(day) - getWeekDates(0)[0]) / 86400000 / 7);
}

function navigateWeek(dir) {
  if (isTimetableDayView()) setTimetableDay(addSchoolDays(timetableDayDate(), dir));
  else { currentWeekOffset += dir; timetableDay = null; }
  renderTimetable();
}
function goToCurrentWeek()  { currentWeekOffset = 0; timetableDay = null; renderTimetable(); }
function jumpToDate(dateStr) {
  if (!dateStr) return;
  const targetDate = parseDate(dateStr);
  if (isNaN(targetDate.getTime())) return;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const adjustedNow = new Date(now);
  if (dayOfWeek === 6) adjustedNow.setDate(now.getDate() + 2);
  if (dayOfWeek === 0) adjustedNow.setDate(now.getDate() + 1);
  
  const mondayNow = new Date(adjustedNow);
  mondayNow.setDate(mondayNow.getDate() - ((mondayNow.getDay() + 6) % 7));
  mondayNow.setHours(0,0,0,0);

  const mondayTarget = new Date(targetDate);
  mondayTarget.setDate(mondayTarget.getDate() - ((mondayTarget.getDay() + 6) % 7));
  mondayTarget.setHours(0,0,0,0);
  currentWeekOffset = Math.round((mondayTarget - mondayNow) / 86400000 / 7);
  if (isSchoolDay(targetDate)) timetableDay = formatDate(targetDate);
  else timetableDay = null;
  renderTimetable();
}

// ─── Timetable Render ────────────────────────────────────────────────────
function renderTimetable() {
  const grid  = document.getElementById('timetable-grid');
  const dayView = isTimetableDayView();
  grid.classList.toggle('day-view', dayView);
  const prevBtn = document.querySelector('button[onclick="navigateWeek(-1)"]');
  const nextBtn = document.querySelector('button[onclick="navigateWeek(1)"]');
  if (prevBtn) prevBtn.title = dayView ? 'Vorheriger Tag' : 'Vorherige Woche';
  if (nextBtn) nextBtn.title = dayView ? 'Nächster Tag' : 'Nächste Woche';
  if (dayView) renderTimetableDay(grid);
  else renderTimetableWeek(grid);
}

function renderTimetableWeek(grid) {
  const dates = getWeekDates(currentWeekOffset);
  const blocks = getBlocks();

  const weekNo = getWeekNumber(dates[0]);
  document.getElementById('week-label').textContent =
    `KW ${weekNo}  ·  ${formatDateDE(dates[0])} – ${formatDateDE(dates[4])} ${dates[0].getFullYear()}`;

  // "Heute" button + week-label only glow on the current week
  const heuteBtn = document.querySelector('button[onclick="goToCurrentWeek()"]');
  const weekLabel = document.getElementById('week-label');
  const isCurrentWeek = currentWeekOffset === 0;
  if (heuteBtn) heuteBtn.classList.toggle('active', isCurrentWeek);
  if (weekLabel) weekLabel.classList.toggle('active', isCurrentWeek);

  grid.innerHTML = '';
  // Kacheln teilen sich Breite und Höhe (BUGS H4); zu viele Blöcke oder zu schmal: scrollen statt quetschen
  const wrapper = grid.parentElement;
  wrapper.style.overflow = 'auto';
  grid.style.margin = '0';
  grid.style.justifyContent = 'stretch';
  grid.style.gridTemplateColumns = '64px repeat(5, minmax(84px, 1fr))';
  grid.style.gridTemplateRows = `auto repeat(${blocks.length}, minmax(88px, 1fr))`;
  grid.style.rowGap = '10px';
  grid.style.columnGap = '10px';
  const clock = timetableClock();

  // Header row
  const corner = document.createElement('div');
  corner.className = 'tt-corner';
  corner.style.gridColumn = '1';
  grid.appendChild(corner);

  dates.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'tt-day-header' + (isToday(d) ? ' today' : '');
    el.innerHTML = `<div>${DAY_SHORT[i]}</div><div style="font-size:10px;font-weight:400;margin-top:1px">${formatDateDE(d)}</div>`;
    el.style.gridColumn = String(2 + i);
    grid.appendChild(el);
  });

  // Block rows
  blocks.forEach(block => {
    grid.appendChild(buildTimeLabel(block));
    dates.forEach((d, dayIdx) => {
      const cell = buildTimetableCell(d, dayIdx, block, clock);
      cell.style.gridColumn = String(2 + dayIdx);
      grid.appendChild(cell);
    });
  });
}

function renderTimetableDay(grid) {
  const d = timetableDayDate();
  const dayIdx = (d.getDay() + 6) % 7;
  const blocks = getBlocks();
  const today = formatDate(d) === formatDate(todaySchoolDay());

  const weekLabel = document.getElementById('week-label');
  weekLabel.textContent = `${DAY_SHORT[dayIdx]} ${formatDateDE(d)}  ·  KW ${getWeekNumber(d)}`;
  weekLabel.classList.toggle('active', today);
  const heuteBtn = document.querySelector('button[onclick="goToCurrentWeek()"]');
  if (heuteBtn) heuteBtn.classList.toggle('active', today);

  grid.innerHTML = '';
  grid.parentElement.style.overflow = 'auto';
  grid.style.margin = '0';
  grid.style.justifyContent = 'stretch';
  grid.style.gridTemplateColumns = '64px minmax(0, 1fr)';
  grid.style.gridTemplateRows = `auto repeat(${blocks.length}, minmax(96px, auto))`;
  grid.style.rowGap = '10px';
  grid.style.columnGap = '10px';

  const header = document.createElement('div');
  header.className = 'tt-day-header' + (isToday(d) ? ' today' : '');
  header.style.gridColumn = '1 / span 2';
  header.textContent = `${DAYS[dayIdx]}, ${formatDateDE(d)}`;
  grid.appendChild(header);

  const clock = timetableClock();
  blocks.forEach(block => {
    grid.appendChild(buildTimeLabel(block));
    const cell = buildTimetableCell(d, dayIdx, block, clock);
    cell.style.gridColumn = '2';
    grid.appendChild(cell);
  });
}

function buildTimeLabel(block) {
  const timeEl = document.createElement('div');
  timeEl.className = 'tt-time-label';
  timeEl.innerHTML = `<div class="tt-time-block-name">${escHtml(block.label)}</div>
    <div class="tt-time-block-range">${escHtml(block.start)}<br>${escHtml(block.end)}</div>`;
  timeEl.style.gridColumn = '1';
  return timeEl;
}

// Uhrzeit für die Hervorhebung im Stundenplan: laufende Stunde + nächste Stunde (BUGS H4)
function timetableClock(now = new Date()) {
  return { todayStr: formatDate(now), nowMins: now.getHours() * 60 + now.getMinutes(), next: findNextLesson(now) };
}
// Läuft gerade eine Stunde bzw. ändert sich die „nächste“: jede Minute neu zeichnen
let timetableClockMinute = null;
function refreshTimetableClock() {
  const view = document.getElementById('view-timetable');
  if (!view || !view.classList.contains('active') || document.hidden) return;
  const now = new Date();
  const minute = formatDate(now) + ' ' + now.getHours() + ':' + now.getMinutes();
  if (minute === timetableClockMinute) return;
  timetableClockMinute = minute;
  renderTimetable();
}
setInterval(refreshTimetableClock, 20000);
document.addEventListener('visibilitychange', refreshTimetableClock);

// Linien-Icons für die Status-Symbole einer Stunde
const TT_STATUS_ICONS = { inhalt: ICONS.content, hw: ICONS.homework, test: ICONS.test, notiz: ICONS.notes };
const TT_STATUS_TITLES = { inhalt: 'Inhalt', hw: 'Hausaufgabe', test: 'Test angekündigt', notiz: 'Notiz' };
function ttStatusIcon(kind) {
  return `<span class="tt-status tt-status-${kind}" data-kind="${kind}" title="${TT_STATUS_TITLES[kind]}">` +
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TT_STATUS_ICONS[kind]}</svg></span>`;
}

// Eine Zelle (Tag × Block) mit ihren Stunden bzw. „+“ zum Anlegen
function buildTimetableCell(d, dayIdx, block, clock = timetableClock()) {
  const dateStr = formatDate(d);
  const cell = document.createElement('div');
  cell.className = 'tt-cell';

  const lessons = lessonsAt(dateStr, block.num);

  const renderLessonHTML = (lesson) => {
    const key  = lesson.id + '_' + dateStr;
    const data = db.lessonData[key] || {};
    const isAusfall = !!data.ausfall;
    const incoming = getIncomingItems(lesson.id, dateStr);
    const activeHW   = (data.hwItems||[]).filter(i => !i.targetDate || i.targetDate === dateStr);
    const hasHW      = (data.hwEnabled && activeHW.length > 0) || incoming.hw.length > 0;
    const activeTest = (data.testItems||[]).filter(i => !i.targetDate || i.targetDate === dateStr);
    const hasTest    = (data.testEnabled && activeTest.length > 0) || incoming.tests.length > 0;

    const status = [];
    if (data.done && data.done.trim()) status.push('inhalt');
    if (hasHW)   status.push('hw');
    if (hasTest) status.push('test');
    if (data.notes && data.notes.trim()) status.push('notiz');

    // Klasse groß, Fach (+ Raum) klein; ohne Klasse ist das Fach der Titel
    const t = lessonTitle(lesson);
    const sub = [t.sub, lesson.room].filter(Boolean).map(escHtml).join(' · ');

    const range = lessonTimeRange(block, lesson.part);
    const running = !isAusfall && dateStr === clock.todayStr && range &&
      range.start <= clock.nowMins && clock.nowMins < range.end;
    const isNext = !running && clock.next && clock.next.slot.id === lesson.id && clock.next.dateStr === dateStr;
    const badge = running ? `<span class="tt-lesson-badge">läuft noch ${range.end - clock.nowMins} min</span>`
                : isNext ? `<span class="tt-lesson-badge">als Nächstes</span>` : '';

    return `<div class="tt-lesson${isAusfall?' ausfall-lesson':''}${running?' running':''}${isNext?' next':''}"
           style="background:${hexToRgba(lesson.color,0.15)};color:${escHtml(lesson.color)};--lesson-color:${escHtml(lesson.color)}"
           onclick="openLessonDetail(${jsArg(lesson.id)},${jsArg(dateStr)})">
        <div class="tt-lesson-head">
          <div class="tt-lesson-class">${escHtml(t.main)}</div>
          ${sub ? `<div class="tt-lesson-subject">${sub}</div>` : ''}
        </div>
        ${badge || status.length ? `<div class="tt-lesson-foot">${badge}<span class="tt-status-row">${status.map(ttStatusIcon).join('')}</span></div>` : ''}
      </div>`;
  };

  const renderEmptyHTML = (part) => {
    return `<div class="tt-empty-cell" title="${DAYS[dayIdx]}, ${escHtml(block.label)} – Klicken zum Hinzufügen"
                 onclick="openAddLessonSlot(${dayIdx}, ${block.num}, ${jsArg(dateStr)}, ${jsArg(part)})">
              <span class="tt-add-icon">+</span>
            </div>`;
  };

  if (lessons.length === 0) {
    cell.innerHTML = renderEmptyHTML('full');
  } else if (lessons.length === 1 && (!lessons[0].part || lessons[0].part === 'full')) {
    cell.innerHTML = renderLessonHTML(lessons[0]);
  } else {
    // Split block
    const first = lessons.find(l => l.part === 'first');
    const second = lessons.find(l => l.part === 'second');
    cell.innerHTML = `<div class="tt-split-container">
      <div class="tt-split-half">${first ? renderLessonHTML(first) : renderEmptyHTML('first')}</div>
      <div class="tt-split-half">${second ? renderLessonHTML(second) : renderEmptyHTML('second')}</div>
    </div>`;
  }
  return cell;
}

// Wischen in der Tagesansicht: nach links = nächster Tag, nach rechts = vorheriger
function handleTimetableSwipe(dx, dy) {
  if (!isTimetableDayView() || Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return;
  navigateWeek(dx < 0 ? 1 : -1);
}
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

function hexToRgba(hex, alpha) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Get all recurring slots linked to a group ────────────────────────
function getGroupSlots(groupId) {
  return db.lessonSlots.filter(s => s.groupId === groupId);
}

// ─── Incoming items (HW / Tests assigned FROM other sessions TO this date) ──
function getIncomingItems(slotId, targetDateStr) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  const result = { hw: [], tests: [] };

  // Determine which slot IDs count as "same class"
  let siblingIds;
  if (currentSlot && currentSlot.groupId) {
    // All slots sharing the same group (covers Mon + Wed of the same class)
    siblingIds = new Set(getGroupSlots(currentSlot.groupId).map(s => s.id));
  } else {
    // No group link – only look at this exact slot
    siblingIds = new Set([slotId]);
  }

  Object.entries(db.lessonData).forEach(([key, data]) => {
    const [keySlotId, fromDate] = key.split('_'); // UIDs have no underscores; date is YYYY-MM-DD
    if (!siblingIds.has(keySlotId)) return;
    if (fromDate === targetDateStr) return; // skip self
    (data.hwItems || []).forEach(item => {
      if (item.targetDate === targetDateStr) result.hw.push({ ...item, from: fromDate });
    });
    (data.testItems || []).forEach(item => {
      if (item.targetDate === targetDateStr) result.tests.push({ ...item, from: fromDate });
    });
  });
  return result;
}

// ─── Fill block selector ──────────────────────────────────────────────────
function fillBlockSelector() {
  const sel = document.getElementById('new-lesson-block');
  sel.innerHTML = '';
  getBlocks().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.num;
    opt.textContent = `${b.label}  (${b.start} – ${b.end})`;
    sel.appendChild(opt);
  });
}

// ─── Fill group selector in lesson modal ──────────────────────────────────
function fillGroupSelector(selectedGroupId = '') {
  const sel = document.getElementById('new-lesson-group');
  sel.innerHTML = '<option value="">— Freie Eingabe (keine Verknüpfung) —</option>';
  db.groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.className} – ${g.subject}${g.year ? ' (' + g.year + ')' : ''}`;
    if (g.id === selectedGroupId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.value = selectedGroupId; // Force reset to avoid browser state retention
}

function onLessonGroupChange() {
  const groupId = document.getElementById('new-lesson-group').value;
  const preview     = document.getElementById('lesson-group-preview');
  const subjectField = document.getElementById('lesson-subject-field');

  if (!groupId) {
    // No group selected: show free text field, hide preview
    preview.classList.add('hidden');
    subjectField.classList.remove('hidden');
    return;
  }

  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;

  // Show preview, hide free text field
  document.getElementById('lesson-preview-class').textContent   = g.className;
  document.getElementById('lesson-preview-subject').textContent = g.subject;
  preview.classList.remove('hidden');
  subjectField.classList.add('hidden');

  // Keep subject field value in sync for saveLessonSlot fallback
  document.getElementById('new-lesson-subject').value = `${g.subject} ${g.className}`;

  // Inherit group color
  if (g.color) {
    selectedLessonColor = g.color;
    renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });
  }
}

let currentSpecificDate = null;

// ─── Add / Edit lesson slot ───────────────────────────────────────────────
function openAddLessonSlot(preDay = null, preBlock = null, specificDateStr = null, part = 'full') {
  const radios = document.getElementsByName('new-lesson-part');
  for(let r of radios) {
    r.disabled = false;
    r.parentElement.style.opacity = '1';
    r.parentElement.title = '';
    
    if (r.value === part) r.checked = true;
    
    if (part !== 'full' && r.value !== part) {
      r.disabled = true;
      r.parentElement.style.opacity = '0.4';
      r.parentElement.title = 'Diese Hälfte ist bereits belegt';
    }
  }
  currentSpecificDate = specificDateStr;
  editingSlotId = null;
  document.getElementById('add-lesson-title').textContent = 'Stunde hinzufügen';
  document.getElementById('btn-delete-lesson').classList.add('hidden');
  document.getElementById('new-lesson-subject').value = '';
  document.getElementById('new-lesson-day').value = preDay !== null ? preDay : '0';
  
  fillGroupSelector('');
  
  // Reset preview: show free text, hide preview
  const preview = document.getElementById('lesson-group-preview');
  const subjectField = document.getElementById('lesson-subject-field');
  if (preview) preview.classList.add('hidden');
  if (subjectField) subjectField.classList.remove('hidden');

  fillBlockSelector();
  if (preBlock !== null) document.getElementById('new-lesson-block').value = preBlock;
  document.getElementById('new-lesson-room').value = '';
  document.getElementById('new-lesson-recurring').value = 'weekly';
  selectedLessonColor = APP_COLORS[0];
  renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });
  openModal('modal-add-lesson');
  setTimeout(() => document.getElementById('new-lesson-subject').focus(), 80);
}

function openEditLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot) return;
  // Datum der angeklickten Stunde: bestimmt Woche für „einmalig“ und A/B-Woche beim Umstellen
  currentSpecificDate = activeLessonDate || slot.specificDate || null;
  closeModal('modal-lesson');
  editingSlotId = slot.id;
  document.getElementById('add-lesson-title').textContent = 'Stunde bearbeiten';
  document.getElementById('btn-delete-lesson').classList.remove('hidden');
  document.getElementById('new-lesson-subject').value = slot.subject;
  document.getElementById('new-lesson-day').value = slot.day;
  fillGroupSelector(slot.groupId || '');
  fillBlockSelector();
  document.getElementById('new-lesson-block').value = slot.block;
  document.getElementById('new-lesson-room').value = slot.room || '';
  if (slot.recurring === 'biweekly') document.getElementById('new-lesson-recurring').value = 'biweekly';
  else if (slot.recurring === false || slot.recurring === 'none') document.getElementById('new-lesson-recurring').value = 'none';
  else document.getElementById('new-lesson-recurring').value = 'weekly';
  selectedLessonColor = slot.color || APP_COLORS[0];
  renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });

  const radios = document.getElementsByName('new-lesson-part');
  const partner = db.lessonSlots.find(s => s.id !== slot.id && slotsShareDate(s, slot) && s.part && s.part !== 'full');
  
  for(let r of radios) {
    r.disabled = false;
    r.parentElement.style.opacity = '1';
    r.parentElement.title = '';
    
    if(r.value === (slot.part || 'full')) r.checked = true;
    
    if (partner) {
      if (r.value === 'full' || r.value === partner.part) {
         r.disabled = true;
         r.parentElement.style.opacity = '0.4';
         r.parentElement.title = 'Dieser Platz ist bereits belegt';
      }
    }
  }

  // Sync preview state
  if (slot.groupId) {
    const g = db.groups.find(x => x.id === slot.groupId);
    if (g) {
      document.getElementById('lesson-preview-class').textContent   = g.className;
      document.getElementById('lesson-preview-subject').textContent = g.subject;
      document.getElementById('lesson-group-preview').classList.remove('hidden');
      document.getElementById('lesson-subject-field').classList.add('hidden');
    }
  } else {
    document.getElementById('lesson-group-preview').classList.add('hidden');
    document.getElementById('lesson-subject-field').classList.remove('hidden');
  }

  openModal('modal-add-lesson');
}

function saveLessonSlot() {
  let subject     = document.getElementById('new-lesson-subject').value.trim();
  const day       = parseInt(document.getElementById('new-lesson-day').value);
  const block     = parseInt(document.getElementById('new-lesson-block').value);
  const room      = document.getElementById('new-lesson-room').value.trim();
  const recurringVal = document.getElementById('new-lesson-recurring').value;
  const groupId   = document.getElementById('new-lesson-group').value || null;
  let part = 'full';
  const radios = document.getElementsByName('new-lesson-part');
  for(let r of radios) if(r.checked) part = r.value;

  if (groupId) {
    const g = db.groups.find(x => x.id === groupId);
    if (g) subject = g.subject;
  }
  if (!subject) { showToast('Bitte Fach/Klasse eingeben', 'error'); return; }

  // Datum am gewählten Wochentag in der Woche der angeklickten Stunde (bzw. der angezeigten Woche)
  const refDate = currentSpecificDate ? parseDate(currentSpecificDate) : getWeekDates(currentWeekOffset)[0];
  const targetDateStr = formatDate(addDays(mondayOf(refDate), day));

  let recurring = false, startDate = null, startWeek = null, specificDate = null;
  if (recurringVal === 'weekly') {
    recurring = 'weekly';
  } else if (recurringVal === 'biweekly') {
    recurring = 'biweekly';
    startDate = targetDateStr;                          // A-Woche = Woche dieses Datums
    startWeek = getWeekNumber(parseDate(targetDateStr)); // nur für Geräte mit alter App-Version
  } else {
    recurring = false;
    specificDate = targetDateStr;
  }

  // --- Überschneidung: nur Stunden, die wirklich am selben Tag im selben Platz liegen ---
  const candidate = { day, block, recurring, startDate, specificDate, part };
  const today = formatDate(new Date());
  const conflicting = db.lessonSlots.find(s => {
    if (editingSlotId && s.id === editingSlotId) return false;
    if (!slotsShareDate(candidate, s) || !partsOverlap(part, s.part)) return false;
    // Vergangene Vertretung sperrt den Platz nicht für neue regelmäßige Stunden (an ihrem Tag gilt sie weiter)
    if (isOneOffSlot(s) && !isOneOffSlot(candidate) && s.specificDate < today) return false;
    return true;
  });
  if (conflicting) {
    showToast(part === 'full' ? 'Block ist bereits belegt! Ganzer Block nicht möglich.' : 'Dieser Platz ist im Block bereits belegt!', 'error');
    return;
  }

  if (editingSlotId) {
    const slot = db.lessonSlots.find(s => s.id === editingSlotId);
    if (slot) {
      if (day !== slot.day) moveLessonData(slot.id, day - slot.day);
      Object.assign(slot, { subject, day, block, room, recurring, startDate, startWeek, specificDate, color: selectedLessonColor, groupId, part });
    }
    showToast('Stunde gespeichert ✓');
  } else {
    db.lessonSlots.push({ id: uid(), day, block, subject, room, color: selectedLessonColor, recurring, startDate, startWeek, specificDate, groupId, part });
    showToast('Stunde hinzugefügt ✓');
  }
  saveDB();
  closeModal('modal-add-lesson');
  renderTimetable();
  editingSlotId = null;
}

// Stunde auf anderen Wochentag verschoben: Notizen/HA (`lessonData[slotId_Datum]`) wandern um
// dieselbe Anzahl Tage mit. Alle Einträge der Stunde verschieben sich gemeinsam → keine Kollision möglich.
function moveLessonData(slotId, dayShift) {
  const prefix = slotId + '_';
  const entries = Object.keys(db.lessonData).filter(k => k.startsWith(prefix)).map(k => [k, db.lessonData[k]]);
  entries.forEach(([k]) => delete db.lessonData[k]);
  entries.forEach(([k, data]) => {
    db.lessonData[prefix + formatDate(addDays(parseDate(k.slice(prefix.length)), dayShift))] = data;
  });
}

function deleteLessonSlotFromEdit() {
  if (!editingSlotId) return;
  if (!confirm('Diese Unterrichtsstunde komplett löschen?')) return;
  db.lessonSlots = db.lessonSlots.filter(s => s.id !== editingSlotId);
  Object.keys(db.lessonData).forEach(k => {
    if (k.startsWith(editingSlotId + '_')) delete db.lessonData[k];
  });
  saveDB();
  editingSlotId = null;
  closeModal('modal-add-lesson');
  renderTimetable();
  showToast('Stunde gelöscht');
}

// ─── Find all upcoming lesson dates for this subject ─────────────────────
// If the slot is group-linked, searches ALL slots of that group (correct multi-day support).
// Otherwise falls back to subject name matching.
function findUpcomingLessonDates(slotId, fromDateStr, maxCount = 4) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  if (!currentSlot) return [];

  let relatedSlots;
  if (currentSlot.groupId) {
    relatedSlots = getGroupSlots(currentSlot.groupId);
  } else {
    relatedSlots = db.lessonSlots.filter(s =>
      s.subject.trim().toLowerCase() === currentSlot.subject.trim().toLowerCase()
    );
  }
  if (!relatedSlots.length) return [];

  const from = new Date(fromDateStr + 'T12:00:00');
  const results = [];
  const seenDates = new Set();

  for (let i = 1; i <= 60 && results.length < maxCount; i++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + i);
    const dateStr = formatDate(candidate);
    for (const slot of relatedSlots) {
      if (slotOccursOn(slot, dateStr) && !seenDates.has(dateStr)) {
        seenDates.add(dateStr);
        results.push({ dateStr, slotId: slot.id });
      }
    }
  }
  return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

// ─── Lesson Detail ───────────────────────────────────────────────────────
let currentLessonDataKey = null;

function openLessonDetail(slotId, dateStr) {
  const slot = db.lessonSlots.find(s => s.id === slotId);
  if (!slot) return;

  activeLessonId   = slotId;
  activeLessonDate = dateStr;
  currentLessonDataKey = slotId + '_' + dateStr;

  // ── ALWAYS reset form fields to avoid bleed from previous lesson ──
  document.getElementById('lesson-done-text').value  = '';
  document.getElementById('lesson-notes-text').value = '';
  document.getElementById('new-hw-text').value   = '';
  document.getElementById('new-hw-date').value   = '';
  document.getElementById('new-test-text').value = '';
  document.getElementById('new-test-date').value = '';
  document.getElementById('hw-date-chips').innerHTML   = '';
  document.getElementById('test-date-chips').innerHTML = '';

  // ── Show Absent Students ──
  const absentContainer = document.getElementById('lesson-absent-container');
  const absentList = document.getElementById('lesson-absent-list');
  absentContainer.classList.add('hidden');
  absentList.innerHTML = '';
  if (slot.groupId && db.students[slot.groupId]) {
    const absent = db.students[slot.groupId].filter(s => 
      (s.attendance || []).some(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'))
    );
    if (absent.length > 0) {
      absentList.innerHTML = absent.map(s => `• ${escHtml(s.firstName)} ${escHtml(s.lastName)}`).join('<br>');
      absentContainer.classList.remove('hidden');
    }
  }

  // ── Find upcoming lesson dates (all slots with same subject) ──
  _upcomingDates = findUpcomingLessonDates(slotId, dateStr);
  populateDateChips('hw-date-chips',   _upcomingDates, 'hw');
  populateDateChips('test-date-chips', _upcomingDates, 'test');
  // Pre-fill date inputs with the nearest upcoming date
  if (_upcomingDates.length) {
    document.getElementById('new-hw-date').value   = _upcomingDates[0].dateStr;
    document.getElementById('new-test-date').value = _upcomingDates[0].dateStr;
  }

  // ── Load stored data for this specific lesson+date ──
  const data     = db.lessonData[currentLessonDataKey] || {};
  const incoming = getIncomingItems(slotId, dateStr);

  // ── Header ──
  const blocks = getBlocks();
  const block  = blocks.find(b => b.num === slot.block) || blocks[0];
  const d = new Date(dateStr + 'T12:00:00');
  document.getElementById('lesson-color-dot').style.background = slot.color || '#6366f1';
  const group = slot.groupId && db.groups.find(g => g.id === slot.groupId);
  document.getElementById('lesson-modal-title').textContent = group ? `${group.subject} ${group.className}` : slot.subject;
  document.getElementById('lesson-modal-subtitle').textContent =
    `${DAYS[slot.day]}  ·  ${block ? block.label + ' (' + block.start + '–' + block.end + ')' : ''}  ·  ${d.toLocaleDateString('de-AT',{day:'2-digit',month:'long',year:'numeric'})}${slot.room ? '  ·  ' + slot.room : ''}`;

  if (slot.groupId) {
    document.getElementById('lesson-seating-link-container').classList.remove('hidden');
  } else {
    document.getElementById('lesson-seating-link-container').classList.add('hidden');
  }

  // Next lesson banner (first upcoming)
  if (_upcomingDates.length) {
    document.getElementById('next-lesson-banner').classList.remove('hidden');
    const labels = _upcomingDates.slice(0,2).map(u => formatDateLong(u.dateStr)).join(' · ');
    document.getElementById('next-lesson-text').textContent = `Nächste Stunden: ${labels}`;
  } else {
    document.getElementById('next-lesson-banner').classList.add('hidden');
  }

  // ── Fill in data ──
  document.getElementById('lesson-done-text').value  = data.done  || '';
  document.getElementById('lesson-notes-text').value = data.notes || '';

  // HW
  const hwEnabled = !!(data.hwEnabled && (data.hwItems||[]).length) || incoming.hw.length > 0;
  setToggle('hw-toggle', 'hw-section-body', hwEnabled);
  renderHWItems(data.hwItems || [], incoming.hw);

  // Test
  const testEnabled = !!(data.testEnabled && (data.testItems||[]).length) || incoming.tests.length > 0;
  setToggle('test-toggle', 'test-section-body', testEnabled);
  renderTestItems(data.testItems || [], incoming.tests);

  // Ausfall
  updateAusfallDisplay(!!data.ausfall);

  openModal('modal-lesson');
}

function setToggle(checkboxId, bodyId, value) {
  document.getElementById(checkboxId).checked = value;
  document.getElementById(bodyId).classList.toggle('hidden', !value);
}

function toggleSection(type) {
  const cb   = document.getElementById(type + '-toggle');
  const body = document.getElementById(type + '-section-body');
  body.classList.toggle('hidden', !cb.checked);
}

// ─── Populate date chips (next upcoming lessons) ───────────────────────────
let _upcomingDates = []; // module-level cache for current detail

function populateDateChips(containerId, upcoming, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!upcoming.length) return;

  const label = document.createElement('div');
  label.style.cssText = 'font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px';
  label.textContent = 'Nächste Stunden – Datum auswählen:';
  container.appendChild(label);

  const chipRow = document.createElement('div');
  chipRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  container.appendChild(chipRow);

  upcoming.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'next-lesson-chip' + (idx === 0 ? ' chip-active' : '');
    btn.textContent = formatDateLong(item.dateStr);
    btn.onclick = () => {
      document.getElementById('new-' + type + '-date').value = item.dateStr;
      chipRow.querySelectorAll('.next-lesson-chip').forEach(b => b.classList.remove('chip-active'));
      btn.classList.add('chip-active');
    };
    chipRow.appendChild(btn);
  });
}

// ─── HW & Test Item Rendering ─────────────────────────────────────────────
function renderHWItems(items, incoming) {
  renderItemList('hw-items-list', items, 'hw', incoming, 'hw-incoming-list');
}

function renderTestItems(items, incoming) {
  renderItemList('test-items-list', items, 'test', incoming, 'test-incoming-list');
}

function renderItemList(listId, items, type, incoming, incomingId) {
  const list = document.getElementById(listId);
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:4px 0">Noch keine Einträge.</div>`;
  } else {
    items.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'entry-item';
      const targetLabel = item.targetDate ? `<span class="entry-item-target">${formatDateLong(item.targetDate)}</span>` : '';
      el.innerHTML = `
        <span class="entry-item-text">${escHtml(item.text)}</span>
        ${targetLabel}
        <button class="entry-item-delete" aria-label="Löschen" onclick="removeItem(${jsArg(type)}, ${i})">✕</button>
      `;
      list.appendChild(el);
    });
  }

  // Incoming items
  const incomingEl = document.getElementById(incomingId);
  if (incoming && incoming.length) {
    incomingEl.classList.remove('hidden');
    incomingEl.innerHTML = `<div class="incoming-title">Fällig heute (von früheren Stunden)</div>`;
    incoming.forEach(item => {
      const div = document.createElement('div');
      div.className = 'incoming-item';
      div.textContent = item.text + (item.from ? ` (von ${formatDateLong(item.from)})` : '');
      incomingEl.appendChild(div);
    });
  } else {
    incomingEl.classList.add('hidden');
    incomingEl.innerHTML = '';
  }
}

function addHWItem() {
  const text       = document.getElementById('new-hw-text').value.trim();
  const targetDate = document.getElementById('new-hw-date').value;
  if (!text) return;
  const data = ensureLessonData();
  if (!data.hwItems) data.hwItems = [];
  data.hwItems.push({ id: uid(), text, targetDate });
  data.hwEnabled = true;
  saveDB();
  // Reset ONLY the text field, keep the date for quick follow-up entries
  document.getElementById('new-hw-text').value = '';
  renderHWItems(data.hwItems, getIncomingItems(activeLessonId, activeLessonDate).hw);
  renderTimetable();
}

function addTestItem() {
  const text       = document.getElementById('new-test-text').value.trim();
  const targetDate = document.getElementById('new-test-date').value;
  if (!text) return;
  const data = ensureLessonData();
  if (!data.testItems) data.testItems = [];
  data.testItems.push({ id: uid(), text, targetDate });
  data.testEnabled = true;
  saveDB();
  // Reset ONLY the text field, keep the date for quick follow-up entries
  document.getElementById('new-test-text').value = '';
  renderTestItems(data.testItems, getIncomingItems(activeLessonId, activeLessonDate).tests);
  renderTimetable();
}

function removeItem(type, idx) {
  const data = ensureLessonData();
  const key  = type + 'Items';
  if (data[key]) { data[key].splice(idx, 1); saveDB(); }
  const incoming = getIncomingItems(activeLessonId, activeLessonDate);
  if (type === 'hw')   renderHWItems(data.hwItems || [], incoming.hw);
  if (type === 'test') renderTestItems(data.testItems || [], incoming.tests);
  renderTimetable();
}

function ensureLessonData() {
  if (!db.lessonData[currentLessonDataKey])
    db.lessonData[currentLessonDataKey] = {};
  return db.lessonData[currentLessonDataKey];
}

function saveLessonDataAndClose() {
  // Eingetippte, aber nicht per „+“ übernommene HA/Tests nicht verwerfen
  if (document.getElementById('hw-toggle').checked) addHWItem();
  if (document.getElementById('test-toggle').checked) addTestItem();
  const data = ensureLessonData();
  data.done      = document.getElementById('lesson-done-text').value;
  data.notes     = document.getElementById('lesson-notes-text').value;
  data.hwEnabled = document.getElementById('hw-toggle').checked;
  data.testEnabled = document.getElementById('test-toggle').checked;
  saveDB();
  renderTimetable();
  closeModal('modal-lesson');
  showToast('Gespeichert ✓');
}

// ─── Ausfall ──────────────────────────────────────────────────────────────
function toggleAusfall() {
  const data = ensureLessonData();
  data.ausfall = !data.ausfall;
  saveDB();
  updateAusfallDisplay(data.ausfall);
  renderTimetable();
}

function updateAusfallDisplay(isAusfall) {
  document.getElementById('lesson-ausfall-badge').classList.toggle('hidden', !isAusfall);
  document.getElementById('lesson-ausfall-overlay').classList.toggle('hidden', !isAusfall);
  const form = document.getElementById('lesson-notes-form');
  form.style.opacity        = isAusfall ? '0.32' : '1';
  form.style.pointerEvents  = isAusfall ? 'none' : '';
  const btn = document.getElementById('btn-ausfall-bottom');
  if (btn) {
    if (isAusfall) {
      btn.style.background = 'var(--danger-soft)';
      btn.style.color = 'var(--danger)';
      btn.style.borderColor = 'rgba(239,68,68,.35)';
      btn.textContent = 'Stunde wiederherstellen';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--danger)';
      btn.style.borderColor = 'var(--danger-soft)';
      btn.textContent = 'Stunde entfällt';
    }
  }
}

// ─── Color Picker (fixed: stores hex on dataset, no rgb comparison) ───────
function renderColorPicker(containerId, colors, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const currentColor = containerId === 'lesson-color-picker' ? selectedLessonColor : selectedGroupColor;
  colors.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (color === currentColor ? ' selected' : '');
    sw.style.background = color;
    sw.style.setProperty('--swatch-color', color);
    sw.dataset.color = color;
    sw.onclick = () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      onSelect(color);
    };
    container.appendChild(sw);
  });
}

// ─── Subject Groups ───────────────────────────────────────────────────────
function renderSubjectGroups() {
  const container = document.getElementById('subject-groups-container');
  if (!db.groups.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">${icon('classes')}</div>
        <div class="empty-state-title">Noch keine Klassen</div>
        <div class="empty-state-desc">Klicke auf "+ Fach/Klasse" um deine erste Klasse hinzuzufügen.</div>
      </div>`;
    return;
  }
  container.innerHTML = '';

  // Group by Subject
  const groupsBySubject = {};
  db.groups.forEach(g => {
    const subj = g.subject || 'Ohne Fach';
    if (!groupsBySubject[subj]) groupsBySubject[subj] = [];
    groupsBySubject[subj].push(g);
  });

  // Sort subjects alphabetically
  const subjects = Object.keys(groupsBySubject).sort((a, b) => a.localeCompare(b));

  subjects.forEach(subj => {
    // Create Section Container
    const section = document.createElement('div');
    section.className = 'subject-section';
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.gap = '12px';

    // Add Subject Header
    const header = document.createElement('div');
    header.style.paddingBottom = '8px';
    header.style.borderBottom = '2px solid var(--border)';
    header.style.fontSize = '18px';
    header.style.fontWeight = '700';
    header.style.color = 'var(--text-primary)';
    header.style.marginTop = '16px';
    header.textContent = subj;
    section.appendChild(header);

    // Create Grid for cards
    const grid = document.createElement('div');
    grid.className = 'subject-groups-grid';

    // Sort groups within subject chronologically by grade
    const sortedGroups = groupsBySubject[subj].sort((a, b) => {
      const numA = parseInt(a.className) || 999;
      const numB = parseInt(b.className) || 999;
      if (numA !== numB) return numA - numB;
      return (a.className || '').localeCompare(b.className || '');
    });

    sortedGroups.forEach(g => {
      const students = db.students[g.id] || [];
      const gradeCount = students.flatMap(s => s.grades||[]).filter(gr => !isNaN(gradeNumber(gr.value))).length;
      const groupAvg = calculateGroupAverage(g.id);
      const avg = formatGradeAverage(groupAvg);
      const scale = gradeScale(g);

      // Linked timetable slots → show which days this class meets
      const linkedSlots = db.lessonSlots.filter(s => s.groupId === g.id && s.recurring);
      const scheduledDays = [...new Set(linkedSlots.map(s => s.day))].sort();
      const dayBadges = scheduledDays.map(d =>
        `<span class="sgc-day-badge">${DAY_SHORT[d]}</span>`
      ).join('');

      const card = document.createElement('div');
      card.className = 'subject-group-card';
      card.style.setProperty('--card-color', g.color || 'var(--accent)');
      card.innerHTML = `
        <button class="sgc-permanent-edit-btn" title="Bearbeiten" onclick="event.stopPropagation();openEditGroup(${jsArg(g.id)})">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin:auto;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <div class="sgc-class">${escHtml(g.className)}</div>
        <div class="sgc-subject">${escHtml(g.subject)}</div>
        ${g.year ? `<div class="sgc-year">${escHtml(g.year)}</div>` : ''}
        <div class="sgc-days">${dayBadges || '<span class="sgc-no-schedule">Kein Stundenplan verknüpft</span>'}</div>
        <div class="sgc-stats">
          <div class="sgc-stat"><div class="sgc-stat-value">${students.length}</div><div class="sgc-stat-label">Schüler</div></div>
          <div class="sgc-stat"><div class="sgc-stat-value" style="color:${gradeColor(groupAvg, scale)}">${avg}</div><div class="sgc-stat-label">${scale.higherIsBetter ? 'Ø Punkte' : 'Ø Note'}</div></div>
          <div class="sgc-stat"><div class="sgc-stat-value">${gradeCount}</div><div class="sgc-stat-label">Noten</div></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button class="btn-primary" style="flex:1; justify-content:center;" onclick="event.stopPropagation();openSeatingForGroup(${jsArg(g.id)})">${icon('seating')}Sitzplan</button>
        </div>`;
      card.addEventListener('click', () => openGroupStudents(g.id));
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function openAddSubjectGroup() {
  editingGroupId = null;
  document.getElementById('group-modal-title').textContent = 'Klasse + Fach hinzufügen';
  ['new-group-class','new-group-subject','new-group-year'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('weight-schularbeit').value = '50';
  document.getElementById('new-group-scale').value = '1-6';
  selectedGroupColor = APP_COLORS[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  document.getElementById('btn-delete-group').style.display = 'none';

  openModal('modal-add-group');
  setTimeout(() => document.getElementById('new-group-class').focus(), 80);
}

function openEditGroup(id) {
  editingGroupId = id;
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  document.getElementById('group-modal-title').textContent = 'Klasse bearbeiten';
  document.getElementById('new-group-class').value = g.className;
  document.getElementById('new-group-subject').value = g.subject;
  document.getElementById('new-group-year').value = g.year || '';
  
  document.getElementById('weight-schularbeit').value = g.schularbeitWeight !== undefined ? g.schularbeitWeight : 50;
  document.getElementById('new-group-scale').value = gradeScale(g).id;
  
  selectedGroupColor = g.color || APP_COLORS[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  const btnDelete = document.getElementById('btn-delete-group');
  btnDelete.style.display = 'block';
  btnDelete.onclick = () => {
    closeModal('modal-add-group');
    deleteGroup(id);
  };

  openModal('modal-add-group');
}

function editCurrentGroup() { if (currentGroupId) openEditGroup(currentGroupId); }

function saveSubjectGroup() {
  const className = document.getElementById('new-group-class').value.trim();
  const subject   = document.getElementById('new-group-subject').value.trim();
  const year      = document.getElementById('new-group-year').value.trim();
  
  const weightInput = document.getElementById('weight-schularbeit').value.trim();
  const finalSchularbeitWeight = weightInput === '' ? 50 : Number(weightInput.replace(',', '.'));
  
  if (!className || !subject) { showToast('Bitte Klasse und Fach eingeben', 'error'); return; }
  if (isNaN(finalSchularbeitWeight) || finalSchularbeitWeight < 0 || finalSchularbeitWeight > 100) {
    showToast('Gewichtung muss zwischen 0 und 100 % liegen', 'error'); return;
  }
  const gradeScaleId = gradeScale({ gradeScale: document.getElementById('new-group-scale').value }).id;
  if (editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      // Skalenwechsel: vorhandene Noten bleiben, wie sie sind (keine Umrechnung) – nur nach Rückfrage
      const hasGrades = (db.students[g.id] || []).some(st => (st.grades || []).length > 0);
      if (gradeScaleId !== gradeScale(g).id && hasGrades &&
          !confirm(`Notenskala auf „${GRADE_SCALES[gradeScaleId].label}“ umstellen?\n\nDie vorhandenen Noten werden nicht umgerechnet. Schnitte und Warnungen dieser Klasse stimmen erst wieder, wenn du die Noten selbst anpasst.`)) {
        return;
      }
      Object.assign(g, { className, subject, year, color: selectedGroupColor, schularbeitWeight: finalSchularbeitWeight });
      if (gradeScaleId !== gradeScale(g).id) g.gradeScale = gradeScaleId;
      // Farbe und Fach auf alle verknüpften Stunden übertragen
      db.lessonSlots.filter(s => s.groupId === g.id).forEach(s => {
        s.color = selectedGroupColor;
        s.subject = subject;
      });
    }
  } else {
    const id = uid();
    db.groups.push({ id, className, subject, year, color: selectedGroupColor, schularbeitWeight: finalSchularbeitWeight, gradeScale: gradeScaleId });
    db.students[id] = [];
  }
  saveDB();
  closeModal('modal-add-group');
  renderSubjectGroups();
  renderTimetable(); // Ensure timetable updates if colors changed
  if (editingGroupId && currentGroupId === editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      document.getElementById('student-view-title').textContent = g.subject;
      document.getElementById('student-view-subtitle').textContent = `Klasse ${g.className}${g.year?' · '+g.year:''}`;
      renderStudents(); // Schnitte/Farben nach Gewichtung oder Skala
    }
  }
  showToast(editingGroupId ? 'Geändert ✓' : 'Klasse hinzugefügt ✓');
  editingGroupId = null;
}

// Teil-Durchschnitte nach Gewichtungs-Kategorie (siehe gradeCategory), jeweils null wenn keine Noten.
function calculateGradeCategoryAverages(student) {
  const sums = { schularbeit: 0, sonstige: 0 }, counts = { schularbeit: 0, sonstige: 0 };
  ((student && student.grades) || []).forEach(gr => {
    const v = gradeNumber(gr.value);
    if (isNaN(v)) return;
    const cat = gradeCategory(gr.type);
    sums[cat] += v;
    counts[cat]++;
  });
  return {
    schularbeit: counts.schularbeit ? sums.schularbeit / counts.schularbeit : null,
    sonstige: counts.sonstige ? sums.sonstige / counts.sonstige : null,
  };
}

// Anteil der Schularbeiten in Prozent (0–100), Standard 50
function getSchularbeitWeight(group) {
  const w = parseFloat(group && group.schularbeitWeight);
  return isNaN(w) ? 50 : Math.min(100, Math.max(0, w));
}

function calculateStudentAverage(student, groupId) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !student || !student.grades || student.grades.length === 0) return null;

  const wSchularbeit = getSchularbeitWeight(g);
  const wSonstige = 100 - wSchularbeit;
  const { schularbeit: avgSchularbeit, sonstige: avgSonstige } = calculateGradeCategoryAverages(student);

  if (avgSchularbeit !== null && avgSonstige !== null) {
    return (avgSchularbeit * wSchularbeit + avgSonstige * wSonstige) / 100;
  } else if (avgSchularbeit !== null) {
    return avgSchularbeit;
  } else if (avgSonstige !== null) {
    return avgSonstige;
  }
  return null;
}

// Klassenschnitt = Mittel der Schülerschnitte (Schüler ohne Noten zählen nicht)
function calculateGroupAverage(groupId) {
  const avgs = (db.students[groupId] || []).map(s => calculateStudentAverage(s, groupId)).filter(a => a !== null);
  return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
}

function deleteGroup(id) {
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  const studentCount = (db.students[id] || []).length;
  const slotIds = new Set(getGroupSlots(id).map(s => s.id));
  if (!confirm(`Klasse ${g.className} (${g.subject}) mit ${studentCount} Schüler(n), allen Noten/Einträgen und ${slotIds.size} Stunde(n) im Stundenplan löschen?`)) return;
  db.groups = db.groups.filter(x => x.id !== id);
  delete db.students[id];
  // Stunden der Klasse samt ihren Stundendaten (Schlüssel '<slotId>_<Datum>') entfernen
  db.lessonSlots = db.lessonSlots.filter(s => !slotIds.has(s.id));
  Object.keys(db.lessonData || {}).forEach(key => {
    if (slotIds.has(key.slice(0, key.lastIndexOf('_')))) delete db.lessonData[key];
  });
  saveDB();
  if (currentSeatingGroupId === id) currentSeatingGroupId = '';
  if (currentGroupId === id || currentOverviewGroupId === id) {
    currentOverviewGroupId = null;
    goBackToSubjects();
  } else {
    renderSubjectGroups();
  }
  renderTimetable();
  showToast('Klasse gelöscht');
}

// ─── Class Overview (Tabelle) ─────────────────────────────────────────────
let currentOverviewGroupId = null;
let currentOverviewTab = 'grades';

function openClassOverview(groupId) {
  openGroupStudents(groupId, 'grades');
}

let currentClassDashboardTab = 'students';

function switchClassDashboardTab(tabName) {
  currentClassDashboardTab = tabName;
  document.querySelectorAll('#view-students .tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('overview-tab-' + tabName);
  if (activeBtn) activeBtn.classList.add('active');
  
  const studentsContainer = document.getElementById('students-container');
  const overviewContent = document.getElementById('overview-content');
  const addColBtn = document.getElementById('btn-add-overview-col');
  const actionBtn = document.getElementById('btn-student-actions');
  
  if (tabName === 'students') {
    studentsContainer.classList.remove('hidden');
    overviewContent.classList.add('hidden');
    if (addColBtn) addColBtn.classList.add('hidden');
    if (actionBtn) actionBtn.classList.remove('hidden');
    renderStudents();
  } else {
    studentsContainer.classList.add('hidden');
    overviewContent.classList.remove('hidden');
    if (addColBtn) addColBtn.classList.remove('hidden');
    if (actionBtn) actionBtn.classList.add('hidden');
    
    if (isStudentEditMode) {
      toggleStudentEditMode(); // Turn it off safely
    }
    const massDeleteBar = document.getElementById('mass-delete-bar');
    if (massDeleteBar) massDeleteBar.classList.add('hidden');
    
    currentOverviewTab = tabName;
    currentOverviewGroupId = currentGroupId;
    renderOverviewTable();
  }
}

function switchOverviewTab(tabName) {
  switchClassDashboardTab(tabName);
}
function renderOverviewTable() {
  if (!currentOverviewGroupId) return;
  const content = document.getElementById('overview-content');
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];
  
  if (!students.length) {
    content.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
    return;
  }

  const sortedStudents = sortStudents(students);
  let html = '<div class="overview-table-wrapper"><table class="overview-table"><thead><tr><th style="position:sticky;left:0;background:var(--bg-elevated);z-index:2;min-width:140px;">Schüler</th>';

  if (currentOverviewTab === 'grades') {
    const gradeEventsMap = new Map();
    (group.gradeEvents || []).forEach(ev => gradeEventsMap.set(`${ev.date}_${ev.label}`, { date: ev.date, label: ev.label, type: ev.type }));
    sortedStudents.forEach(s => {
      (s.grades || []).forEach((g, idx) => {
        const key = `${g.date}_${g.note ?? gradeTypeLabel(g.type)}`;
        if (!gradeEventsMap.has(key)) gradeEventsMap.set(key, { date: g.date, label: g.note ?? gradeTypeLabel(g.type), type: g.type });
      });
    });
    const gradeEvents = Array.from(gradeEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Ø</th>';
    const weight = getSchularbeitWeight(group);
    gradeEvents.forEach(ev => {
      const type = ev.type || 'test';
      const weighted = gradeCategory(type) === 'schularbeit';
      const typeTitle = weighted ? `${gradeTypeLabel(type)}: zählt ${weight} % der Note` : `${gradeTypeLabel(type)}: Sonstige, zählt ${100 - weight} % der Note`;
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)}, ${jsArg(type)})">`
        + `<div class="col-type${weighted ? ' weighted' : ''}" title="${escHtml(typeTitle)}">${escHtml(gradeTypeShort(type))}</div>`
        + `<div>${formatDateShort(ev.date)}</div><div class="col-title">${escHtml(ev.label || gradeTypeLabel(type))}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    const scale = gradeScale(currentOverviewGroupId);
    sortedStudents.forEach(s => {
      const rawAvg = calculateStudentAverage(s, currentOverviewGroupId);
      const avg = formatGradeAverage(rawAvg);
      
      const nameDisplay = (db.settings.studentSortOrder==='lastName') ? escHtml(s.lastName)+', '+escHtml(s.firstName) : escHtml(s.firstName)+' '+escHtml(s.lastName);
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal(${jsArg(s.id)}, ${jsArg(currentOverviewGroupId)}, ${jsArg(formatDate(new Date()))})">${nameDisplay}</td>`;
      html += `<td style="font-weight:700;color:${gradeColor(rawAvg, scale)};text-align:center;">${avg}</td>`;
      
      gradeEvents.forEach(ev => {
        const matchingGradeIdx = (s.grades||[]).findIndex(g => g.date === ev.date && (g.note ?? gradeTypeLabel(g.type)) === ev.label);
        const val = matchingGradeIdx !== -1 ? s.grades[matchingGradeIdx].value : '';
        const evType = ev.type || 'test';
        html += `<td style="padding:4px;"><input type="text" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:600; color:${val ? gradeColor(gradeNumber(val), scale) : 'inherit'}" value="${escHtml(val)}" placeholder="-" onchange="updateInlineGrade(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label)}, this.value, ${jsArg(evType)})" /></td>`;
      });
      html += `</tr>`;
    });
    
    // Bottom average row
    html += '<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:700;">Durchschnitt</td>';
    const groupAvg = calculateGroupAverage(currentOverviewGroupId);
    html += `<td style="font-weight:700;color:${gradeColor(groupAvg, scale)};text-align:center;">${formatGradeAverage(groupAvg)}</td>`;

    gradeEvents.forEach(ev => {
      let sum = 0, count = 0;
      sortedStudents.forEach(s => {
        const matchingGradeIdx = (s.grades||[]).findIndex(g => g.date === ev.date && (g.note ?? gradeTypeLabel(g.type)) === ev.label);
        if (matchingGradeIdx !== -1) {
          const val = gradeNumber(s.grades[matchingGradeIdx].value);
          if (!isNaN(val)) { sum += val; count++; }
        }
      });
      const colAvg = count > 0 ? sum / count : null;
      html += `<td style="font-weight:700;color:${gradeColor(colAvg, scale)};text-align:center;">${formatGradeAverage(colAvg)}</td>`;
    });
    html += `</tr>`;
    
  } else if (currentOverviewTab === 'participation') {
    const partEventsMap = new Map();
    (group.participationEvents || []).forEach(ev => partEventsMap.set(`${ev.date}_${ev.label}`, { date: ev.date, label: ev.label }));
    sortedStudents.forEach(s => {
      (s.participation || []).forEach(p => {
        if (!p.label) p.label = '';
        partEventsMap.set(`${p.date}_${p.label}`, { date: p.date, label: p.label });
      });
    });
    const partDates = Array.from(partEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Bilanz</th>';
    partDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal(${jsArg(s.id)}, ${jsArg(currentOverviewGroupId)}, ${jsArg(formatDate(new Date()))})">${escHtml(s.lastName)}, ${escHtml(s.firstName)}</td>`;
      
      let pos = 0, neu = 0, neg = 0;
      partDates.forEach(ev => {
        const pIdx = (s.participation||[]).findIndex(x => x.date === ev.date && (x.label||'') === (ev.label||''));
        const val = pIdx !== -1 ? s.participation[pIdx].value : '';
        if (val === 'positive') pos++;
        else if (val === 'neutral') neu++;
        else if (val === 'negative') neg++;
      });
      html += `<td style="text-align:center; font-size:12px; font-weight:600; white-space:nowrap;">
        <span style="color:var(--success)">${pos}</span> : <span style="color:var(--warning)">${neu}</span> : <span style="color:var(--danger)">${neg}</span>
      </td>`;

      partDates.forEach(ev => {
        const pIdx = (s.participation||[]).findIndex(x => x.date === ev.date && (x.label||'') === (ev.label||''));
        const val = pIdx !== -1 ? s.participation[pIdx].value : '';
        // Inline Cycler
        let emoji = '➖';
        if (val === 'positive') emoji = '😊';
        else if (val === 'neutral') emoji = '😐';
        else if (val === 'negative') emoji = '☹️';
        html += `<td style="text-align:center; padding:4px;">
          <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="cycleInlineParticipation(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')})">${emoji}</button>
        </td>`;
      });
      html += `</tr>`;
    });

  } else if (currentOverviewTab === 'attendance') {
    const attEventsMap = new Map();
    (group.attendanceEvents || []).forEach(ev => attEventsMap.set(`${ev.date}_${ev.label}`, { date: ev.date, label: ev.label }));
    sortedStudents.forEach(s => {
      (s.attendance || []).forEach(a => attEventsMap.set(`${a.date}_`, { date: a.date, label: '' }));
    });
    const attDates = Array.from(attEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Summe</th>';
    attDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal(${jsArg(s.id)}, ${jsArg(currentOverviewGroupId)}, ${jsArg(formatDate(new Date()))})">${escHtml(s.lastName)}, ${escHtml(s.firstName)}</td>`;
      const totalMissed = (s.attendance||[]).filter(a => a.type === 'abwesend' || a.type === 'entschuldigt').length;
      html += `<td style="text-align:center;font-weight:600;">${totalMissed}</td>`;

      attDates.forEach(ev => {
        const aIdx = (s.attendance||[]).findIndex(x => x.date === ev.date);
        const status = aIdx !== -1 ? s.attendance[aIdx].type : ''; // 'abwesend', 'entschuldigt', 'zuspät'
        const displayVal = ATTENDANCE_SHORT[status] || '';

        html += `<td style="padding:4px;"><input type="text" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:600; color:${status==='abwesend' ? 'var(--danger)' : 'inherit'}" value="${displayVal}" placeholder="-" onchange="updateInlineAttendance(${jsArg(s.id)}, ${jsArg(ev.date)}, this.value)" /></td>`;
      });
      html += `</tr>`;
    });
  } else if (currentOverviewTab === 'homework') {
    const hwEventsMap = new Map();
    (group.homeworkEvents || []).forEach(ev => hwEventsMap.set(`${ev.date}_${ev.label||''}`, { date: ev.date, label: ev.label||'' }));
    sortedStudents.forEach(s => {
      (s.homework || []).forEach(h => hwEventsMap.set(`${h.date}_${h.note||''}`, { date: h.date, label: h.note||'' }));
    });
    const hwDates = Array.from(hwEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Summe</th>';
    hwDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal(${jsArg(s.id)}, ${jsArg(currentOverviewGroupId)}, ${jsArg(formatDate(new Date()))})">${escHtml(s.lastName)}, ${escHtml(s.firstName)}</td>`;
      const totalMissed = (s.homework||[]).length;
      html += `<td style="text-align:center;font-weight:600;color:var(--danger);">${totalMissed}</td>`;

      hwDates.forEach(ev => {
        const hIdx = (s.homework||[]).findIndex(x => x.date === ev.date && (x.note||'') === (ev.label||''));
        const hasMissed = hIdx !== -1;
        html += `<td style="padding:4px;"><input type="text" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:800; color:var(--danger);" value="${hasMissed ? 'X' : ''}" placeholder="-" onchange="updateInlineHomework(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')}, this.value)" /></td>`;
      });
      html += `</tr>`;
    });
  }

  html += '</tbody></table></div>';
  content.innerHTML = html;
}

// ─── Inline Updates ────────────────────────────────────────────────────────
// Kürzel in der Anwesenheits-Tabelle (Eingabe und Anzeige)
const ATTENDANCE_SHORT = { abwesend: 'F', entschuldigt: 'E', 'zuspät': 'Z' };

function updateInlineGrade(studentId, date, label, value, type = 'test') {
  value = value.trim();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.grades) s.grades = [];

  const idx = s.grades.findIndex(g => g.date === date && (g.note ?? gradeTypeLabel(g.type)) === label);
  
  if (!value) {
    if (idx !== -1) s.grades.splice(idx, 1);
  } else {
    const scale = gradeScale(currentOverviewGroupId);
    const parsed = parseGradeInput(value, scale);
    if (!parsed || parsed.number === null) {
      showToast(scale.inputError, 'error');
      renderOverviewTable(); // Reset input
      return;
    }
    const finalValue = parsed.value;
    if (idx !== -1) {
      s.grades[idx].value = finalValue;
      if (type) s.grades[idx].type = type; // Update type if it was changed
    } else {
      s.grades.push({ type: type, value: finalValue, date: date, note: label });
    }
  }
  saveDB();
  renderOverviewTable(); // Rerender to update averages and colors
}

function cycleInlineParticipation(studentId, date, label) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.participation) s.participation = [];

  const idx = s.participation.findIndex(p => p.date === date && (p.label||'') === (label||''));
  const currentVal = idx !== -1 ? s.participation[idx].value : null;

  let nextVal;
  if (!currentVal) nextVal = 'positive';
  else if (currentVal === 'positive') nextVal = 'neutral';
  else if (currentVal === 'neutral') nextVal = 'negative';
  else nextVal = null; // reset

  if (nextVal) {
    if (idx !== -1) s.participation[idx].value = nextVal;
    else s.participation.push({ date, label, value: nextVal });
  } else {
    if (idx !== -1) s.participation.splice(idx, 1);
  }
  saveDB();
  renderOverviewTable(); // Render to update Ratio instantly
}

function updateInlineAttendance(studentId, date, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];

  const idx = s.attendance.findIndex(a => a.date === date);
  
  const status = Object.keys(ATTENDANCE_SHORT).find(t => ATTENDANCE_SHORT[t] === value) || null;

  if (!status) {
    if (idx !== -1) s.attendance.splice(idx, 1);
  } else {
    if (idx !== -1) {
      s.attendance[idx].type = status;
    } else {
      s.attendance.push({ date, type: status, note: '' });
    }
  }
  saveDB();
  renderOverviewTable();
}

function updateInlineHomework(studentId, date, label, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];

  const idx = s.homework.findIndex(h => h.date === date && (h.note||'') === (label||''));
  if (value === 'X' || value === 'HA') {
    if (idx === -1) s.homework.push({ date: date, id: uid(), note: label||'' });
  } else {
    if (idx !== -1) s.homework.splice(idx, 1);
  }
  saveDB();
  renderOverviewTable();
}

// ─── Column Management ───────────────────────────────────────────────────
let editingColumnCtx = null;

function openAddColumnModal() {
  editingColumnCtx = null;
  document.getElementById('column-modal-title').textContent = 'Neue Spalte';
  document.getElementById('new-col-date').value = formatDate(new Date());
  document.getElementById('new-col-label').value = '';
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    document.getElementById('new-col-type').value = 'test';
  } else {
    document.getElementById('new-col-type-group').style.display = 'none';
  }
  
  openModal('modal-add-column');
  setTimeout(() => document.getElementById('new-col-label').focus(), 80);
}

function openEditColumnModal(oldDate, oldLabel, oldType) {
  editingColumnCtx = { oldDate, oldLabel };
  document.getElementById('column-modal-title').textContent = 'Spalte bearbeiten';
  document.getElementById('new-col-date').value = oldDate;
  document.getElementById('new-col-label').value = oldLabel;
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    document.getElementById('new-col-type').value = oldType || 'test';
  } else {
    document.getElementById('new-col-type-group').style.display = 'none';
  }
  
  openModal('modal-add-column');
}

function saveOverviewColumn() {
  const newDate = document.getElementById('new-col-date').value;
  if (!newDate) { showToast('Bitte Datum wählen', 'error'); return; }
  const newLabel = document.getElementById('new-col-label').value.trim();
  const type = document.getElementById('new-col-type').value;

  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];

  if (!editingColumnCtx) {
    // Add logic
    if (currentOverviewTab === 'grades') {
      if (!group.gradeEvents) group.gradeEvents = [];
      group.gradeEvents.push({ date: newDate, label: newLabel, type: type });
    } else if (currentOverviewTab === 'participation') {
      if (!group.participationEvents) group.participationEvents = [];
      group.participationEvents.push({ date: newDate, label: newLabel });
    } else if (currentOverviewTab === 'attendance') {
      if (!group.attendanceEvents) group.attendanceEvents = [];
      group.attendanceEvents.push({ date: newDate, label: newLabel });
    } else if (currentOverviewTab === 'homework') {
      if (!group.homeworkEvents) group.homeworkEvents = [];
      group.homeworkEvents.push({ date: newDate, label: newLabel });
    }
  } else {
    // Edit logic
    const { oldDate, oldLabel } = editingColumnCtx;
    let events = [];
    if (currentOverviewTab === 'grades') events = group.gradeEvents || [];
    if (currentOverviewTab === 'participation') events = group.participationEvents || [];
    if (currentOverviewTab === 'attendance') events = group.attendanceEvents || [];
    if (currentOverviewTab === 'homework') events = group.homeworkEvents || [];
    
    const evIdx = events.findIndex(e => e.date === oldDate && e.label === oldLabel);
    if (evIdx !== -1) {
      events[evIdx].date = newDate;
      events[evIdx].label = newLabel;
      if (currentOverviewTab === 'grades') events[evIdx].type = type;
    } else {
      const newEv = { date: newDate, label: newLabel };
      if (currentOverviewTab === 'grades') newEv.type = type;
      events.push(newEv);
      if (currentOverviewTab === 'grades') group.gradeEvents = events;
      if (currentOverviewTab === 'participation') group.participationEvents = events;
      if (currentOverviewTab === 'attendance') group.attendanceEvents = events;
      if (currentOverviewTab === 'homework') group.homeworkEvents = events;
    }

    students.forEach(s => {
      if (currentOverviewTab === 'grades') {
        const gIdx = (s.grades||[]).findIndex(g => g.date === oldDate && (g.note ?? gradeTypeLabel(g.type)) === oldLabel);
        if (gIdx !== -1) { s.grades[gIdx].date = newDate; s.grades[gIdx].note = newLabel; s.grades[gIdx].type = type; }
      } else if (currentOverviewTab === 'participation') {
        const pIdx = (s.participation||[]).findIndex(p => p.date === oldDate && (p.label||'') === (oldLabel||''));
        if (pIdx !== -1) { s.participation[pIdx].date = newDate; s.participation[pIdx].label = newLabel; }
      } else if (currentOverviewTab === 'attendance') {
        const aIdx = (s.attendance||[]).findIndex(a => a.date === oldDate);
        if (aIdx !== -1) { s.attendance[aIdx].date = newDate; }
      } else if (currentOverviewTab === 'homework') {
        const hIdx = (s.homework||[]).findIndex(h => h.date === oldDate && (h.note||'') === (oldLabel||''));
        if (hIdx !== -1) { s.homework[hIdx].date = newDate; s.homework[hIdx].note = newLabel; }
      }
    });
  }

  saveDB();
  closeModal('modal-add-column');
  renderOverviewTable();
}

function editOverviewColumns() {
  if (confirm("Möchtest du alle explizit angelegten Spalten für diesen Bereich entfernen? (Bereits eingetragene Daten bei Schülern bleiben erhalten!)")) {
    const group = db.groups.find(g => g.id === currentOverviewGroupId);
    if (currentOverviewTab === 'grades') group.gradeEvents = [];
    if (currentOverviewTab === 'participation') group.participationEvents = [];
    if (currentOverviewTab === 'attendance') group.attendanceEvents = [];
    if (currentOverviewTab === 'homework') group.homeworkEvents = [];
    saveDB();
    renderOverviewTable();
  }
}

// ─── Students ─────────────────────────────────────────────────────────────
function openGroupStudents(groupId, initialTab = 'students') {
  currentGroupId = groupId;
  currentOverviewGroupId = groupId;
  if (isStudentEditMode) {
    toggleStudentEditMode(); // safely turn off
  }
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  document.getElementById('student-view-title').textContent = g.subject;
  document.getElementById('student-view-subtitle').textContent = `Klasse ${g.className}${g.year?' · '+g.year:''}`;
  switchView('students');
  switchClassDashboardTab(initialTab);
}

function goBackToSubjects() {
  currentGroupId = null;
  switchView('classes');
  renderSubjectGroups();
}

function renderStudents() {
  hideCounterHint();  // ihr Zähler wird gleich neu gezeichnet
  const container = document.getElementById('students-container');
  const students  = db.students[currentGroupId] || [];
  if (!students.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">${icon('student')}</div>
      <div class="empty-state-title">Noch keine Schüler</div>
      <div class="empty-state-desc">Klicke auf "+ Schüler" um Schüler hinzuzufügen.</div>
    </div>`;
    return;
  }
  container.innerHTML = '';
  const scale = gradeScale(currentGroupId);
  sortStudents(students).forEach(s => {
    const avg = calculateStudentAverage(s, currentGroupId);
    const first = s.firstName || '', last = s.lastName || '';
    const initials = (first[0]||'') + (last[0]||'');
    // Schüler können nur einen Namen haben (Import „Max“) → leere Teile zählen als 0
    const avatarIdx = ((first.charCodeAt(0)||0) + (last.charCodeAt(0)||0)) % AVATAR_COLORS.length;
    const [fg,bg] = AVATAR_COLORS[avatarIdx];
    const attUnexcused = (s.attendance||[]).filter(a => a.type==='abwesend').length;
    const attExcused = (s.attendance||[]).filter(a => a.type==='entschuldigt').length;
    const partPos = (s.participation||[]).filter(p => p.value==='positive').length;
    const partNeutral = (s.participation||[]).filter(p => p.value==='neutral').length;
    const partNeg = (s.participation||[]).filter(p => p.value==='negative').length;
    const hints = {
      participation: { title: 'Mitarbeit', lines: [[partPos, 'positiv', 'success'], [partNeutral, 'neutral', 'warning'], [partNeg, 'negativ', 'danger']] },
      attendance: { title: 'Fehltage', lines: [[attUnexcused, 'unentschuldigt', 'danger'], [attExcused, 'entschuldigt', 'success']] },
    };
    const hintText = kind => `${hints[kind].title}: ` + hints[kind].lines.map(([n, label]) => `${n} ${label}`).join(', ');

    const grades = s.grades || [];
    const row = document.createElement('div');
    row.className = 'student-row';
    row.innerHTML = `
      ${isStudentEditMode ? `<input type="checkbox" class="student-select-cb" data-id="${escHtml(s.id)}" onclick="event.stopPropagation(); updateMassDeleteBar()" style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">` : ''}
      <div class="student-avatar" style="background:${bg};color:${fg}">${escHtml(initials.toUpperCase())}</div>
      <div class="student-info">
        <div class="student-name">${(db.settings.studentSortOrder==='lastName') ? escHtml(s.lastName)+', '+escHtml(s.firstName) : escHtml(s.firstName)+' '+escHtml(s.lastName)}</div>
        <div class="student-quick-notes">${s.notes ? escHtml(s.notes) : grades.length+' Note'+(grades.length!==1?'n':'')}</div>
      </div>
      <div class="student-counters">
        <div class="student-counter" data-kind="participation" role="button" tabindex="0" title="${hintText('participation')}" aria-label="${hintText('participation')}">
          <span class="student-counter-label">Mitarbeit</span>
          <span style="color:var(--success); font-weight:700;">${partPos}</span>
          <span style="opacity:0.5">:</span>
          <span style="color:var(--warning); font-weight:700;">${partNeutral}</span>
          <span style="opacity:0.5">:</span>
          <span style="color:var(--danger); font-weight:700;">${partNeg}</span>
        </div>
        <div class="student-counter" data-kind="attendance" role="button" tabindex="0" title="${hintText('attendance')}" aria-label="${hintText('attendance')}">
          <span class="student-counter-label">Fehlt</span>
          <span style="color:var(--danger); font-weight:700;">${attUnexcused}</span>
          <span style="opacity:0.5">/</span>
          <span style="color:var(--success); font-weight:700;">${attExcused}</span>
        </div>
      </div>
      ${avg!==null
        ? `<div class="student-grade-badge" style="background:${hexToRgba(gradeColor(avg, scale),0.15)};color:${gradeColor(avg, scale)}">${avg.toFixed(1)}</div>`
        : `<div class="student-grade-badge" style="background:var(--bg-elevated);color:var(--text-muted)">–</div>`}
    `;
    row.addEventListener('click', () => openStudentDetail(s.id));
    row.querySelectorAll('.student-counter').forEach(el => {
      el.addEventListener('click', e => { e.stopPropagation(); onStudentCounterTap(el, s.id, hints); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openStudentDetail(s.id, el.dataset.kind); }
      });
    });
    container.appendChild(row);
  });
  updateMassDeleteBar();
}

// ─── Zähler-Erklärung in der Schülerliste (BUGS H11) ─────────────────────
// Mit Maus steht die Erklärung schon im Tooltip (title) → Klick öffnet direkt die Schülerakte.
// Auf dem iPad gibt es kein Darüberfahren → erstes Antippen zeigt eine kleine Erklärung mit Weiter-Knopf.
let counterHintAnchor = null;

function canHover() {
  return !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
}

function onStudentCounterTap(el, studentId, hints) {
  const kind = el.dataset.kind;
  if (canHover()) { hideCounterHint(); openStudentDetail(studentId, kind); return; }
  if (counterHintAnchor === el) { hideCounterHint(); return; }
  showCounterHint(el, hints[kind], () => { hideCounterHint(); openStudentDetail(studentId, kind); });
}

function showCounterHint(anchor, { title, lines }, onOpen) {
  let hint = document.getElementById('counter-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'counter-hint';
    hint.className = 'counter-hint hidden';
    hint.setAttribute('role', 'tooltip');
    hint.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(hint);
  }
  // Gleiche Farben wie im Zähler, damit man die Zuordnung sieht
  hint.innerHTML = `<div class="counter-hint-title">${escHtml(title)}</div>
    <div class="counter-hint-text">${lines.map(([n, label, color]) =>
      `<div><b style="color:var(--${color})">${n}</b> ${escHtml(label)}</div>`).join('')}</div>
    <button class="btn-secondary counter-hint-open">Einträge ansehen</button>`;
  hint.querySelector('button').onclick = onOpen;
  hint.classList.remove('hidden');
  counterHintAnchor = anchor;
  // Unter dem Zähler, aber im Fenster bleiben
  const r = anchor.getBoundingClientRect();
  const w = hint.offsetWidth || 200, h = hint.offsetHeight || 100;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
  const top = (r.bottom + 6 + h > window.innerHeight) ? Math.max(8, r.top - h - 6) : r.bottom + 6;
  hint.style.left = left + 'px';
  hint.style.top = top + 'px';
}

function hideCounterHint() {
  counterHintAnchor = null;
  const hint = document.getElementById('counter-hint');
  if (hint) hint.classList.add('hidden');
}

// Tippen woanders, Scrollen oder Escape schließt die Erklärung
document.addEventListener('click', hideCounterHint);
document.addEventListener('scroll', hideCounterHint, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCounterHint(); });

function openStudentActionsModal() {
  openModal('modal-student-actions');
}

function toggleStudentEditMode() {
  isStudentEditMode = !isStudentEditMode;
  
  const btn = document.getElementById('btn-student-actions');
  if (btn) {
    if (isStudentEditMode) {
      btn.innerHTML = `<span style="font-size:12px; font-weight:600; font-family:inherit; padding:0 4px;">Fertig</span>`;
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-icon');
      btn.style.width = 'auto';
      btn.title = 'Bearbeiten beenden';
      // Change onclick so it directly exits edit mode instead of opening modal
      btn.onclick = toggleStudentEditMode;
    } else {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-icon');
      btn.style.width = '';
      btn.title = 'Aktionen';
      btn.onclick = openStudentActionsModal;
    }
  }
  
  renderStudents();
}

function updateMassDeleteBar() {
  const checkboxes = document.querySelectorAll('.student-select-cb:checked');
  const count = checkboxes.length;
  const bar = document.getElementById('mass-delete-bar');
  if (!bar) return;
  if (count > 0) {
    bar.classList.remove('hidden');
    document.getElementById('mass-delete-count').textContent = count;
  } else {
    bar.classList.add('hidden');
  }
}

function deleteSelectedStudents() {
  const checkboxes = document.querySelectorAll('.student-select-cb:checked');
  if (checkboxes.length === 0) return;
  if (!confirm(`Möchtest du wirklich ${checkboxes.length} Schüler endgültig löschen? Alle Noten und Einträge dieser Schüler werden unwiderruflich entfernt.`)) return;
  
  const idsToDelete = new Set(Array.from(checkboxes).map(cb => cb.getAttribute('data-id')));
  db.students[currentGroupId] = db.students[currentGroupId].filter(s => !idsToDelete.has(s.id));
  
  // Also clean up any seating plan layout data for these students
  if (db.groups) {
    const group = db.groups.find(g => g.id === currentGroupId);
    if (group && group.seatingPlan) {
      group.seatingPlan = group.seatingPlan.filter(item => !idsToDelete.has(item.studentId));
    }
  }
  
  saveDB();
  renderStudents();
  showToast(`${checkboxes.length} Schüler gelöscht ✓`);
}

function openImportStudentsModal() {
  const select = document.getElementById('import-from-group');
  select.innerHTML = '<option value="">-- Bitte wählen --</option>';
  db.groups.forEach(g => {
    if (g.id !== currentGroupId) {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.subject + ' (' + g.className + ')';
      select.appendChild(opt);
    }
  });
  document.getElementById('import-text').value = '';
  openModal('modal-import-students');
}

function importStudentsFromGroup() {
  const fromId = document.getElementById('import-from-group').value;
  if (!fromId) {
    showToast('Bitte wähle eine Klasse aus', 'error');
    return;
  }
  const skipDupsCheckbox = document.getElementById('import-skip-duplicates');
  const skipDups = skipDupsCheckbox ? skipDupsCheckbox.checked : false;
  const fromStudents = db.students[fromId] || [];
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  
  let count = 0;
  fromStudents.forEach(s => {
    if (skipDups) {
      const exists = db.students[currentGroupId].some(existing => 
        existing.firstName === s.firstName && existing.lastName === s.lastName
      );
      if (exists) return;
    }
    db.students[currentGroupId].push({
      id: uid(), firstName: s.firstName, lastName: s.lastName, notes: s.notes, grades: [], studentNotes: [], attendance: []
    });
    count++;
  });
  saveDB();
  closeModal('modal-import-students');
  renderStudents();
  showToast(count + ' Schüler importiert ✓');
}

function importStudentsFromText() {
  const text = document.getElementById('import-text').value.trim();
  if (!text) {
    showToast('Bitte gib mindestens einen Namen ein', 'error');
    return;
  }
  const skipDupsCheckbox = document.getElementById('import-skip-duplicates');
  const skipDups = skipDupsCheckbox ? skipDupsCheckbox.checked : false;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  
  let count = 0;
  lines.forEach(line => {
    // Aus Excel kopiert: Spalten sind durch Tabs getrennt (Vorname | Nachname), sonst letztes Wort = Nachname
    let firstName, lastName;
    if (line.includes('\t')) {
      const cols = line.split('\t').map(c => c.trim()).filter(c => c);
      lastName = cols.pop();
      firstName = cols.join(' ');
    } else {
      const parts = line.split(/\s+/);
      lastName = parts.pop();
      firstName = parts.join(' ');
    }
    if (lastName) {
      if (skipDups) {
        const exists = db.students[currentGroupId].some(existing => 
          existing.firstName === (firstName || '') && existing.lastName === lastName
        );
        if (exists) return;
      }
      db.students[currentGroupId].push({
        id: uid(), firstName: firstName || '', lastName: lastName, notes: '', grades: [], studentNotes: [], attendance: []
      });
      count++;
    }
  });
  saveDB();
  closeModal('modal-import-students');
  renderStudents();
  showToast(count + ' Schüler importiert ✓');
}

function openAddStudent() {
  editingStudentId = null;
  document.getElementById('student-modal-title').textContent = 'Schüler hinzufügen';
  ['new-student-first','new-student-last','new-student-notes'].forEach(id => document.getElementById(id).value = '');
  openModal('modal-add-student');
}

function saveStudent() {
  const firstName = document.getElementById('new-student-first').value.trim();
  const lastName  = document.getElementById('new-student-last').value.trim();
  const notes     = document.getElementById('new-student-notes').value.trim();
  if (!firstName || !lastName) { showToast('Bitte Vor- und Nachname eingeben', 'error'); return; }
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  if (editingStudentId) {
    const s = db.students[currentGroupId].find(x => x.id === editingStudentId);
    if (s) Object.assign(s, { firstName, lastName, notes });
  } else {
    db.students[currentGroupId].push({ id:uid(), firstName, lastName, notes, grades:[], studentNotes:[], attendance:[] });
  }
  saveDB();
  closeModal('modal-add-student');
  renderStudents();
  showToast(editingStudentId ? 'Schüler geändert ✓' : 'Schüler hinzugefügt ✓');
  editingStudentId = null;
}

// ─── Student Detail ───────────────────────────────────────────────────────
function openStudentDetail(studentId, initialTab = 'grades') {
  const s = (db.students[currentGroupId]||[]).find(x => x.id === studentId);
  if (!s) return;
  currentStudentId = studentId;
  const group = db.groups.find(g => g.id === currentGroupId);
  document.getElementById('sdetail-name').textContent = s.lastName + ', ' + s.firstName;
  document.getElementById('sdetail-group').textContent = group ? `${group.subject} · Klasse ${group.className}` : '';
  renderGradesList(s);
  renderStudentNotesList(s);
  renderAttendanceList(s);
  renderStudentParticipationList(s);
  renderStudentHomeworkList(s);
  switchStudentTab(initialTab);
  openModal('modal-student-detail');
}

function switchStudentTab(tab) {
  document.querySelectorAll('#modal-student-detail .tab-btn').forEach((b,i) => {
    b.classList.toggle('active', ['grades','participation','attendance','homework','notes'][i] === tab);
  });
  ['grades','participation','attendance','homework','notes'].forEach(t => {
    const el = document.getElementById('student-tab-'+t);
    if (el) {
      el.classList.toggle('active', t===tab);
      el.classList.toggle('hidden', t!==tab);
    }
  });
}

function openGradeFormForCurrentStudentDetailed() {
  const s = getCurrentStudent();
  if (!s) return;
  openGradeForm(s.id, currentGroupId, -1);
}

function getCurrentStudent() { return (db.students[currentGroupId]||[]).find(x => x.id === currentStudentId); }

function renderGradesList(s) {
  const grades = s.grades||[];
  const scale = gradeScale(currentGroupId);
  const summary = document.getElementById('grades-summary');
  if (!grades.length) {
    summary.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Noch keine Noten.</span>';
  } else {
    const byType = {};
    grades.forEach(g => {
      const v = gradeNumber(g.value);
      if (isNaN(v)) return;
      if (!byType[g.type]) byType[g.type]=[];
      byType[g.type].push(v);
    });
    const rawAvg = calculateStudentAverage(s, currentGroupId);
    summary.innerHTML = `
      <div class="grade-summary-item" style="margin-right:16px">
        <div class="grade-avg-display" style="color:${gradeColor(rawAvg, scale)}">${formatGradeAverage(rawAvg)}</div>
        <div class="grade-avg-label">${scale.higherIsBetter ? 'Ø Punkte' : 'Ø Gesamt'}</div>
      </div>
      ${Object.entries(byType).map(([type,vals]) => {
        const ta = vals.reduce((a,b)=>a+b,0)/vals.length;
        return `<div class="grade-summary-item">
          <div style="font-size:15px;font-weight:700;color:${gradeColor(ta, scale)}">${formatGradeAverage(ta)}</div>
          <div class="grade-avg-label">${gradeTypeLabel(type)} (${vals.length})</div>
        </div>`;
      }).join('')}`;
  }
  const list = document.getElementById('grades-list');
  list.innerHTML = '';
  if (!grades.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Noten erscheinen hier.</div>'; return; }
  [...grades].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach((g,i) => {
    const originalIdx = s.grades.indexOf(g);
    const color = gradeColor(gradeNumber(g.value), scale);
    const el = document.createElement('div');
    el.className = 'grade-item';
    el.style.cursor = 'pointer';
    el.title = 'Klicken zum Bearbeiten';
    el.onclick = () => openGradeForm(s.id, currentGroupId, originalIdx);
    el.innerHTML = `
      <div class="grade-value" style="color:${color}">${escHtml(g.value)}</div>
      <div class="grade-type-badge">${gradeTypeLabel(g.type)}</div>
      <div class="grade-label">${escHtml(g.note||'')}</div>
      <div class="grade-date">${g.date ? formatDateShort(g.date) : ''}</div>
      <div style="color:var(--text-muted); font-size:16px;">✎</div>`;
    list.appendChild(el);
  });
}


function renderStudentNotesList(s) {
  const notes = s.studentNotes||[];
  const list  = document.getElementById('student-notes-list');
  list.innerHTML = '';
  if (!notes.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Noch keine Anmerkungen.</div>'; return; }
  [...notes].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(n => {
    list.appendChild(createEntryItem(n.text, n.date, () => deleteStudentNote(n)));
  });
}

// Löscht per Objekt-Referenz (die Anzeige ist sortiert, das Original nicht). Nach einem Sync ist die
// Referenz nicht mehr in der Liste → es wird nichts gelöscht.
function deleteStudentNote(note) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.studentNotes||[]).indexOf(note);
  if (idx === -1) { renderStudentNotesList(s); return; }
  s.studentNotes.splice(idx,1); saveDB(); renderStudentNotesList(s);
}

function addStudentNote() {
  const text = document.getElementById('new-student-note-text').value.trim();
  const date = document.getElementById('new-student-note-date').value;
  if (!text) return;
  const s = getCurrentStudent(); if (!s) return;
  if (!s.studentNotes) s.studentNotes=[];
  s.studentNotes.push({ text, date: date||formatDate(new Date()) });
  saveDB(); renderStudentNotesList(s); renderStudents();
  document.getElementById('new-student-note-text').value='';
  document.getElementById('new-student-note-date').value='';
}

function renderAttendanceList(s) {
  const att  = s.attendance||[];
  const list = document.getElementById('attendance-list');
  list.innerHTML='';
  if (!att.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Keine Einträge.</div>'; return; }
  const typeColors = { abwesend:'var(--danger)', entschuldigt:'var(--warning)', 'zuspät':'var(--text-secondary)' };
  [...att].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(a => {
    const el = document.createElement('div');
    el.className='entry-item';
    el.innerHTML=`
      <span style="color:${typeColors[a.type]||'inherit'};font-weight:600;min-width:86px;font-size:12px">${escHtml(a.type.charAt(0).toUpperCase()+a.type.slice(1))}</span>
      <span class="entry-item-text">${escHtml(a.note||'')}</span>
      <span class="entry-item-date">${a.date?formatDateShort(a.date):''}</span>
      <button class="entry-item-delete" aria-label="Löschen">✕</button>`;
    el.querySelector('.entry-item-delete').onclick = () => deleteAttendance(a);
    list.appendChild(el);
  });
}

function addAttendanceEntry() {
  const date = document.getElementById('new-att-date').value;
  const type = document.getElementById('new-att-type').value;
  const note = document.getElementById('new-att-note').value.trim();
  if (!date) { showToast('Bitte Datum wählen', 'error'); return; }
  const s = getCurrentStudent(); if (!s) return;
  if (!s.attendance) s.attendance=[];
  s.attendance.push({ date, type, note });
  saveDB(); renderAttendanceList(s); renderStudents();
  document.getElementById('new-att-date').value='';
  document.getElementById('new-att-note').value='';
}

function deleteAttendance(a) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.attendance||[]).indexOf(a);
  if (idx === -1) { renderAttendanceList(s); return; }
  // Schülerdetail gehört zu currentGroupId (getCurrentStudent), nicht zur Klassenübersicht
  if (a.type === 'abwesend') removeAbsenceNote(currentGroupId, a.date, s);
  s.attendance.splice(idx,1); saveDB(); renderAttendanceList(s); renderStudents();
}

function renderStudentParticipationList(s) {
  const pList = s.participation || [];
  const list = document.getElementById('participation-list');
  if (!list) return;
  list.innerHTML = '';
  if (!pList.length) { list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Keine Einträge.</div>'; return; }
  const valColors = { 'positive':'var(--success)', 'neutral':'var(--warning)', 'negative':'var(--danger)' };
  const valLabels = { 'positive':'+', 'neutral':'=', 'negative':'-' };
  const textLabels = { 'positive':'Hervorragende Mitarbeit', 'neutral':'Moderate Mitarbeit', 'negative':'Schlechte Mitarbeit' };
  [...pList].sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach(p => {
    const el = document.createElement('div');
    el.className = 'entry-item';
    const desc = p.label || textLabels[p.value] || 'Mitarbeit';
    el.innerHTML = `
      <span style="color:${valColors[p.value]||'inherit'};font-weight:800;font-size:16px;min-width:30px;text-align:center;">${escHtml(valLabels[p.value]||p.value)}</span>
      <span class="entry-item-text">${escHtml(desc)}</span>
      <span class="entry-item-date">${p.date ? formatDateShort(p.date) : ''}</span>
      <button class="entry-item-delete" aria-label="Löschen">×</button>`;
    el.querySelector('.entry-item-delete').onclick = () => deleteParticipation(p);
    list.appendChild(el);
  });
}

function deleteParticipation(p) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.participation||[]).indexOf(p);
  if (idx === -1) { renderStudentParticipationList(s); return; }
  s.participation.splice(idx, 1); saveDB(); renderStudentParticipationList(s); renderStudents();
}

function renderStudentHomeworkList(s) {
  const list = document.getElementById('student-homework-list');
  if (!list) return;
  const hw = s.homework || [];
  if (!hw.length) {
    list.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Keine Hausaufgaben vergessen.</span>';
    return;
  }
  const sorted = [...hw].sort((a,b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.map((h) => {
    return `<div class="entry-item">
      <div class="entry-date-badge">${formatDateLong(h.date)}</div>
      <div style="flex:1; margin-left:12px;">
        <div style="font-weight:600; color:var(--warning); font-size:14px;">Hausaufgabe vergessen</div>
        ${h.note ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${escHtml(h.note)}</div>` : ''}
      </div>
      <button class="btn-icon btn-danger-icon" aria-label="Löschen" onclick="deleteStudentHomework(${jsArg(h.id)})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;
  }).join('');
}

function addStudentHomework() {
  const date = document.getElementById('new-hw-student-date').value;
  const note = document.getElementById('new-hw-student-note').value.trim();
  if (!date) { showToast('Bitte Datum wählen', 'error'); return; }
  const s = getCurrentStudent(); if (!s) return;
  if (!s.homework) s.homework = [];
  s.homework.push({ id: uid(), date: date, note: note });
  saveDB();
  renderStudentHomeworkList(s);
  if (typeof renderOverviewTable === 'function') renderOverviewTable();
  document.getElementById('new-hw-student-date').value = '';
  document.getElementById('new-hw-student-note').value = '';
}

function deleteStudentHomework(id) {
  const s = getCurrentStudent(); if (!s) return;
  if (!s.homework) return;
  s.homework = s.homework.filter(h => h.id !== id);
  saveDB();
  renderStudentHomeworkList(s);
  if (typeof renderOverviewTable === 'function') renderOverviewTable();
}

function deleteCurrentStudent() {
  if (!confirm('Schüler wirklich löschen?')) return;
  db.students[currentGroupId]=(db.students[currentGroupId]||[]).filter(s=>s.id!==currentStudentId);
  saveDB(); closeModal('modal-student-detail'); renderStudents(); renderSubjectGroups();
  showToast('Schüler gelöscht');
}

function openEditStudent() {
  const s = getCurrentStudent(); if (!s) return;
  editingStudentId = s.id;
  document.getElementById('student-modal-title').textContent = 'Schüler bearbeiten';
  document.getElementById('new-student-first').value = s.firstName;
  document.getElementById('new-student-last').value  = s.lastName;
  document.getElementById('new-student-notes').value = s.notes||'';
  closeModal('modal-student-detail');
  openModal('modal-add-student');
}

function exportCurrentStudent() {
  const s = getCurrentStudent();
  if (!s) return;
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const subjName = group ? (group.subject + ' ' + group.className) : 'Unbekannte Klasse';
  
  let txt = `SCHÜLERAKTE: ${s.firstName} ${s.lastName}\n`;
  txt += `Klasse/Fach: ${subjName}\n`;
  txt += `Exportiert am: ${new Date().toLocaleDateString('de-DE')}\n`;
  txt += `=================================================\n\n`;
  
  if (s.notes) {
    txt += `=== ALLGEMEINE NOTIZEN ===\n${s.notes}\n\n`;
  }
  
  // Einträge ohne Datum (Altdaten) dürfen den Export nicht abbrechen
  const byDate = (a,b) => (a.date||'').localeCompare(b.date||'');
  const dateStr = d => d ? formatDateLong(d) : 'ohne Datum';

  const avg = calculateStudentAverage(s, currentOverviewGroupId);
  const avgText = avg === null ? '-' : gradeScale(group).higherIsBetter ? avg.toFixed(1) + ' Punkte' : avg.toFixed(2);
  txt += `=== NOTEN (Aktueller Schnitt: ${avgText}) ===\n`;
  if (s.grades && s.grades.length > 0) {
    const sortedGrades = [...s.grades].sort(byDate);
    sortedGrades.forEach(g => {
      txt += `${dateStr(g.date)} | ${g.note || gradeTypeLabel(g.type)} | ${gradeCategory(g.type) === 'schularbeit' ? 'Klassenarbeit' : 'Sonstige Leistung'} | Note: ${g.value}\n`;
    });
  } else {
    txt += `Keine Noten eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== MITARBEIT ===\n`;
  if (s.participation && s.participation.length > 0) {
    const textLabels = { 'positive':'Hervorragende Mitarbeit', 'neutral':'Moderate Mitarbeit', 'negative':'Schlechte Mitarbeit' };
    const sortedPart = [...s.participation].sort(byDate);
    sortedPart.forEach(p => {
      let valStr = p.value === 'positive' ? '(+)' : (p.value === 'negative' ? '(-)' : '(o)');
      let desc = p.label || textLabels[p.value] || 'Mitarbeit';
      txt += `${dateStr(p.date)} | ${desc} | ${valStr}\n`;
    });
  } else {
    txt += `Keine Mitarbeit eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== ANWESENHEIT ===\n`;
  if (s.attendance && s.attendance.length > 0) {
    const attLabels = { abwesend: 'Unentschuldigt', entschuldigt: 'Entschuldigt', 'zuspät': 'Zu spät' };
    const sortedAtt = [...s.attendance].sort(byDate);
    sortedAtt.forEach(a => {
      const valStr = attLabels[a.type] || a.type || '';
      txt += `${dateStr(a.date)} | ${valStr}${a.note ? ' | ' + a.note : ''}\n`;
    });
  } else {
    txt += `Keine Fehltage eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== VERHALTENSNOTIZEN ===\n`;
  if (s.studentNotes && s.studentNotes.length > 0) {
    const sortedNotes = [...s.studentNotes].sort(byDate);
    sortedNotes.forEach(n => {
      txt += `${dateStr(n.date)}:\n${n.text || ''}\n---\n`;
    });
  } else {
    txt += `Keine Verhaltensnotizen eingetragen.\n`;
  }
  
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Akte_${s.firstName}_${s.lastName}_${subjName.replace(/\s+/g,'_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Schülerakte wurde heruntergeladen ✓');
}

function toggleSidebar(e) {
  if (e) e.stopPropagation();
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

function collapseSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('collapsed')) {
    sidebar.classList.add('collapsed');
  }
}

let currentThemeAccent = db.settings.themeAccent || '#6366f1';
let currentThemeBg = db.settings.themeBg || '#0f1117';
let currentThemeMode = db.settings.theme || 'dark'; // db.settings.theme stores the mode
let currentThemeCard = db.settings.themeCard || '#1e2130';

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
  document.getElementById('settings-teacher-name').value = db.settings.teacherName||'';
  document.getElementById('settings-school').value       = db.settings.school||'';
  document.getElementById('settings-seating-buffer').value = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
  document.getElementById('settings-warn-absences').value = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  document.getElementById('settings-warn-homework').value = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  document.getElementById('settings-warn-grade').value = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  document.getElementById('settings-warn-points').value = db.settings.warnPoints !== undefined ? db.settings.warnPoints : 5;
  
  currentThemeAccent = db.settings.themeAccent || '#6366f1';
  document.querySelectorAll('.settings-swatch-accent').forEach(s => {
    s.classList.remove('selected');
    if (s.dataset.color === currentThemeAccent) s.classList.add('selected');
  });

  currentThemeBg = db.settings.themeBg || '#0f1117';
  currentThemeMode = db.settings.theme || 'dark';
  currentThemeCard = db.settings.themeCard || '#1e2130';
  document.querySelectorAll('.settings-swatch-bg').forEach(s => {
    s.classList.remove('selected');
    if (s.dataset.color === currentThemeBg) s.classList.add('selected');
  });

  let radVal = db.settings.themeRadius !== undefined ? db.settings.themeRadius : 8;
  if (radVal > 12) radVal = 12; // Clamp max radius to 12
  document.getElementById('settings-radius').value       = radVal;
  document.getElementById('settings-radius-val').textContent = radVal + 'px';
  document.getElementById('settings-sort-order').value = db.settings.studentSortOrder || 'firstName';
  blocksDraft = getBlocks().map(b => ({ ...b }));
  renderBlocksEditor();
  openModal('modal-settings');
}

function applyThemePreview() {
  const radEl = document.getElementById('settings-radius');
  document.documentElement.setAttribute('data-theme', currentThemeMode);

  const accent = document.querySelector('.settings-swatch-accent.selected') ? currentThemeAccent : (db.settings.themeAccent || '#6366f1');
  const bg = document.querySelector('.settings-swatch-bg.selected') ? currentThemeBg : (db.settings.themeBg || null);
  const card = document.querySelector('.settings-swatch-bg.selected') ? currentThemeCard : (db.settings.themeCard || null);
  let rad = radEl ? parseInt(radEl.value) : db.settings.themeRadius;
  if (rad > 12) rad = 12; // Clamp max radius to 12

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
  
  if (accent) { document.documentElement.style.setProperty('--accent', accent); document.documentElement.style.setProperty('--text-accent', accent); }
  else { document.documentElement.style.removeProperty('--accent'); document.documentElement.style.removeProperty('--text-accent'); }

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
  blocksDraft.push({ num, label: `${blocksDraft.length + 1}. Block`, start: '08:00', end: '09:30' });
  renderBlocksEditor();
}

function deleteBlockRow(idx) {
  readBlocksEditor();
  const block = blocksDraft[idx];
  if (!block) return;
  if (blocksDraft.length <= 1) { showToast('Mindestens ein Block nötig', 'error'); return; }
  const used = db.lessonSlots.filter(s => s.block === block.num).length;
  if (used) {
    showToast(`${block.label || 'Block'} enthält noch ${used} Stunde${used === 1 ? '' : 'n'} – bitte zuerst verschieben oder löschen`, 'error');
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
  db.settings.teacherName = document.getElementById('settings-teacher-name').value.trim();
  db.settings.school      = document.getElementById('settings-school').value.trim();
  db.settings.seatingBufferMins = parseInt(document.getElementById('settings-seating-buffer').value) || 0;
  db.settings.warnAbsences = parseWarnThreshold('settings-warn-absences', 3);
  db.settings.warnHomework = parseWarnThreshold('settings-warn-homework', 3);
  db.settings.warnGrade    = parseWarnThreshold('settings-warn-grade', 4.5);
  db.settings.warnPoints   = parseWarnThreshold('settings-warn-points', 5);
  db.settings.theme       = currentThemeMode;
  db.settings.themeBg     = currentThemeBg;
  db.settings.themeCard   = currentThemeCard;
  db.settings.themeAccent = currentThemeAccent;
  db.settings.themeRadius = parseInt(document.getElementById('settings-radius').value);
  db.settings.studentSortOrder = document.getElementById('settings-sort-order').value;

  readBlocksEditor();
  if (blocksDraft.length) db.settings.blocks = blocksDraft.map(b => ({ ...b }));

  saveDB();
  closeModal('modal-settings');
  renderTimetable();
  showToast('Einstellungen gespeichert ✓');
}

function exportGradesCSV() {
  if (!currentGroupId) return;
  const g = db.groups.find(x => x.id === currentGroupId);
  if (!g) return;
  
  const students = db.students[g.id] || [];
  const points = gradeScale(g).higherIsBetter;
  const header = points ? 'Klassenarbeiten (Punkte);Sonstige (Punkte);Gesamt (Punkte)' : 'Klassenarbeiten;Sonstige;Gesamtnote';
  let csvContent = `\uFEFFNachname;Vorname;${header}\n`; // \uFEFF is BOM for Excel to read UTF-8 correctly
  const fmt = v => v !== null ? v.toFixed(points ? 1 : 2).replace('.', ',') : '';
  
  sortStudents(students).forEach(s => {
    // Spalten wie die Gewichtung der Klasse (gradeCategory), damit sich die Gesamtnote daraus ergibt
    const parts = calculateGradeCategoryAverages(s);
    const total = calculateStudentAverage(s, g.id);
    csvContent += `"${s.lastName || ''}";"${s.firstName || ''}";"${fmt(parts.schularbeit)}";"${fmt(parts.sonstige)}";"${fmt(total)}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Noten_${g.className}_${g.subject}_${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Noten als CSV exportiert ✓');
}

function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));
  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
  a.download = `Unterrichtsplaner_Backup_${dateStr}_${timeStr}.json`; 
  a.click();
  
  db.settings.lastBackupTimestamp = Date.now();
  saveDB();
  
  showToast('Daten erfolgreich gesichert! ✓');
}
function importDataClick() { document.getElementById('import-file-input').click(); }
function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.lessonSlots && parsed.groups && parsed.students) {
        db = migrateDB(parsed); saveDB(); renderTimetable(); renderSubjectGroups(); closeModal('modal-settings');
        showToast('Importiert ✓');
      } else { showToast('Ungültiges Format','error'); }
    } catch { showToast('Fehler beim Importieren','error'); }
  };
  reader.readAsText(file); event.target.value='';
}
function clearAllData() {
  if (!confirm('ACHTUNG: Wirklich alle Daten auf diesem Gerät löschen?\n\nFalls Cloud-Sync aktiv ist, bleiben die Daten in der Cloud erhalten und werden beim nächsten Sync wieder geladen.')) return;
  localStorage.removeItem('lehrerapp_v3'); db = loadDB();
  renderTimetable(); renderSubjectGroups(); closeModal('modal-settings');
  showToast('Lokale Daten gelöscht.');
}

// ─── Seating Plan ─────────────────────────────────────────────────────────
let currentSeatingGroupId = '';
let currentSeatingDateStr = '';
let activeSeatingGroups = null;
let lastSeatingGroupId = '';
let lastSeatingDateStr = '';
let seatingRequest = null;      // { groupId, dateStr } aus openSeatingForGroup, gilt nur für das nächste Öffnen
let seatingDateChosenOn = '';   // an welchem Tag currentSeatingDateStr gesetzt wurde (BUGS E2)

function setSeatingDate(dateStr, now = new Date()) {
  currentSeatingDateStr = dateStr;
  seatingDateChosenOn = formatDate(now);
}
// Ein Datum gilt nur für den Tag, an dem es gewählt wurde. Bleibt die App über Nacht offen,
// springt es auf heute, sonst landen Einträge am Vortag. true = Datum wurde geändert.
function refreshSeatingDate(now = new Date()) {
  if (currentSeatingDateStr && seatingDateChosenOn === formatDate(now)) return false;
  setSeatingDate(formatDate(nextSchoolDay(now)), now);
  return true;
}
function refreshSeatingDateIfStale() {
  const view = document.getElementById('view-seating');
  if (!view || !view.classList.contains('active') || document.hidden) return;
  if (refreshSeatingDate()) { renderSeatingDateStrip(); renderSeatingPlan(); }
}
setInterval(refreshSeatingDateIfStale, 60000);
document.addEventListener('visibilitychange', refreshSeatingDateIfStale);

function getSuggestedSeatingGroupId() {
  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7; // Mon=0, Sun=6
  if (dayIdx > 4) return null; // Weekend
  
  const h = now.getHours();
  const m = now.getMinutes();
  const currentTotalMins = h * 60 + m;
  
  const blocks = getBlocks();
  const dateStr = formatDate(now);
  
  let activeBlockNum = null;
  for (let b of blocks) {
    if (!b.start || !b.end) continue;
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    const buffer = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
    
    // Check if current time is within [startMins - buffer, endMins]
    if (currentTotalMins >= startMins - buffer && currentTotalMins <= endMins) {
      activeBlockNum = b.num;
      break;
    }
  }
  
  if (activeBlockNum === null) return null;
  
  const activeSlot = lessonsAt(dateStr, activeBlockNum)[0];
  
  if (activeSlot && activeSlot.groupId) {
    return activeSlot.groupId;
  }
  return null;
}

function initSeatingPlan() {
  const request = seatingRequest;
  seatingRequest = null;
  if (request && request.dateStr) setSeatingDate(formatDate(nextSchoolDay(parseDate(request.dateStr))));
  else refreshSeatingDate();
  // Datenschutz (BUGS H1): Noten bei jedem Öffnen wieder verborgen, Zustand wird nicht gespeichert
  seatingShowGrades = false;
  updateSeatingGradesButton();
  
  const suggestedGroupId = request ? request.groupId : getSuggestedSeatingGroupId();
  if (suggestedGroupId) {
    currentSeatingGroupId = suggestedGroupId;
  }
  
  renderSeatingGroupSelect();
  renderSeatingDateStrip();
  renderSeatingPlan();
}

function renderSeatingGroupSelect() {
  const menu = document.getElementById('seating-group-menu');
  const label = document.getElementById('seating-group-current-label');
  if (!menu || !label) return;
  menu.innerHTML = '';
  
  if (!currentSeatingGroupId && db.groups.length > 0) {
    currentSeatingGroupId = db.groups[0].id;
  }
  
  const activeGroup = db.groups.find(g => g.id === currentSeatingGroupId);
  if (activeGroup) {
    label.textContent = activeGroup.className;
  } else {
    label.textContent = 'Klasse';
  }
  
  const grouped = {};
  db.groups.forEach(g => {
    const subject = g.subject || 'Ohne Fach';
    if (!grouped[subject]) grouped[subject] = [];
    grouped[subject].push(g);
  });
  
  const sortedSubjects = Object.keys(grouped).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  
  sortedSubjects.forEach(subject => {
    const header = document.createElement('div');
    header.style.fontSize = '10px';
    header.style.fontWeight = '700';
    header.style.color = 'var(--text-muted)';
    header.style.textTransform = 'uppercase';
    header.style.padding = '6px 10px 2px';
    header.style.textAlign = 'center';
    header.style.letterSpacing = '0.5px';
    header.textContent = subject;
    menu.appendChild(header);
    
    const classes = grouped[subject].sort((a,b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
    
    classes.forEach(g => {
      const item = document.createElement('div');
      item.style.padding = '6px 12px';
      item.style.fontSize = '13px';
      item.style.fontWeight = '600';
      item.style.borderRadius = '8px';
      item.style.cursor = 'pointer';
      item.style.textAlign = 'center';
      item.style.transition = 'all var(--transition)';
      item.style.color = g.id === currentSeatingGroupId ? 'var(--text-accent)' : 'var(--text-primary)';
      item.style.background = g.id === currentSeatingGroupId ? 'var(--accent-soft)' : 'transparent';
      item.textContent = `Klasse ${g.className}`;
      
      item.onmouseover = () => {
        if (g.id !== currentSeatingGroupId) item.style.background = 'var(--bg-card-hover)';
      };
      item.onmouseout = () => {
        if (g.id !== currentSeatingGroupId) item.style.background = 'transparent';
      };
      
      item.onclick = (e) => {
        e.stopPropagation();
        currentSeatingGroupId = g.id;
        menu.classList.add('hidden');
        renderSeatingGroupSelect();
        renderSeatingPlan();
      };
      
      menu.appendChild(item);
    });
  });
}

function toggleCustomGroupDropdown(event) {
  event.stopPropagation();
  const menu = document.getElementById('seating-group-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Close dropdown on click outside
document.addEventListener('click', () => {
  const menu = document.getElementById('seating-group-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
});

function renderSeatingDateStrip() {
  const container = document.getElementById('seating-date-strip');
  if (!container) return;
  container.innerHTML = '';
  
  const baseDate = nextSchoolDay(currentSeatingDateStr ? parseDate(currentSeatingDateStr) : new Date());
  
  const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  for(let i = -2; i <= 2; i++) {
    const d = addSchoolDays(baseDate, i);
    const dStr = formatDate(d);
    
    const chip = document.createElement('div');
    chip.className = 'date-chip';
    if (dStr === currentSeatingDateStr) chip.classList.add('active');
    
    const dayLabel = days[d.getDay()];
    const dateNum = d.getDate();
    
    chip.innerHTML = `<span class="date-chip-day">${dayLabel}</span><span class="date-chip-date">${dateNum}</span>`;
    chip.onclick = () => {
      setSeatingDate(dStr);
      renderSeatingDateStrip();
      renderSeatingPlan();
    };
    container.appendChild(chip);
  }
}

function onHiddenDateChange(val) {
  if (val) {
    setSeatingDate(formatDate(nextSchoolDay(parseDate(val))));
    renderSeatingDateStrip();
    renderSeatingPlan();
  }
}

// BUGS H1: Notenschnitt auf den Karten nur auf Knopfdruck (Tablet am Pult / Beamer)
let seatingShowGrades = false;
function toggleSeatingGrades() {
  seatingShowGrades = !seatingShowGrades;
  updateSeatingGradesButton();
  renderSeatingPlan();
}
function updateSeatingGradesButton() {
  const btn = document.getElementById('btn-seating-grades');
  if (!btn) return;
  btn.classList.toggle('active', seatingShowGrades);
  btn.title = seatingShowGrades ? 'Noten verbergen' : 'Noten anzeigen';
  btn.setAttribute('aria-pressed', seatingShowGrades ? 'true' : 'false');
  btn.querySelector('.eye-open').style.display = seatingShowGrades ? '' : 'none';
  btn.querySelector('.eye-closed').style.display = seatingShowGrades ? 'none' : '';
}

let seatingEditMode = false;
function toggleSeatingEditMode() {
  seatingEditMode = !seatingEditMode;
  const btn = document.getElementById('btn-seating-edit');
  if (seatingEditMode) {
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    btn.style.background = 'var(--success, #10b981)';
    btn.style.color = 'white';
    btn.style.border = 'none';
  } else {
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.border = '';
  }
  renderSeatingPlan();
}

function toggleSeatingSettings(e) {
  if (e) e.stopPropagation();
  const popup = document.getElementById('seating-settings-popup');
  if (popup) popup.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  const popup = document.getElementById('seating-settings-popup');
  if (popup && !popup.classList.contains('hidden') && !e.target.closest('#seating-settings-popup') && !e.target.closest('button[title="Raster-Größe einstellen"]')) {
    popup.classList.add('hidden');
  }
});

function saveSeatingGrid() {
  const groupId = currentSeatingGroupId;
  if (!groupId) return;
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  g.seatingCols = parseInt(document.getElementById('seating-cols').value) || 10;
  let rows = parseInt(document.getElementById('seating-rows').value) || 5;
  if (rows > 6) rows = 6;
  g.seatingRows = rows;
  saveDB();
  renderSeatingPlan();
}

function renderSeatingPlan() {
  const groupId = currentSeatingGroupId;
  const dateStr = currentSeatingDateStr;
  const canvas = document.getElementById('seating-canvas');
  const emptyState = document.getElementById('seating-empty');

  if (canvas) {
    if (seatingEditMode) {
      canvas.classList.add('edit-mode');
    } else {
      canvas.classList.remove('edit-mode');
    }
    const showGridAlways = !!db.settings.showSeatingGridAlways;
    canvas.classList.toggle('show-grid-always', showGridAlways);
    const showGridChk = document.getElementById('seating-show-grid-always');
    if (showGridChk) showGridChk.checked = showGridAlways;
  }

  if (lastSeatingGroupId !== groupId || lastSeatingDateStr !== dateStr) {
    activeSeatingGroups = null;
    lastSeatingGroupId = groupId;
    lastSeatingDateStr = dateStr;
  }

  // clear old elements
  canvas.querySelectorAll('.seating-card').forEach(c => c.remove());
  canvas.querySelectorAll('.seating-grid-cell').forEach(c => c.remove());
  canvas.querySelectorAll('.teacher-desk').forEach(c => c.remove());

  if (!groupId) {
    emptyState.classList.remove('hidden');
    return;
  }

  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;

  const cols = g.seatingCols || 10;
  const rows = g.seatingRows || 5;
  document.getElementById('seating-cols').value = cols;
  document.getElementById('seating-rows').value = rows;

  const students = db.students[groupId] || [];
  if (!students.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Reset canvas size temporarily to get an accurate width without old scrollbars
  canvas.style.minWidth = '0px';
  canvas.style.minHeight = '0px';
  
  const wrapper = document.getElementById('seating-canvas-wrapper');
  const containerWidth = (wrapper ? wrapper.clientWidth : canvas.parentElement.clientWidth) - 40;
  const containerHeight = (wrapper ? wrapper.clientHeight : canvas.parentElement.clientHeight) - 40;
  
  // Square cells: use the smaller of the two to keep cells perfectly square
  const maxCellW = containerWidth / cols;
  const maxCellH = containerHeight / rows;
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH));
  const cellWidth = cellSize;
  const cellHeight = cellSize;

  const isCompact = cellSize < 100;
  const isTiny = cellSize < 64;   // Handy: Namen kürzen statt mitten im Wort trennen (BUGS H13)
  const gridWidth = cols * cellWidth;
  const gridHeight = rows * cellHeight;

  // Canvas wraps the grid exactly - no padding gap
  const offsetX = 0;
  const offsetY = 0;

  canvas.style.minWidth = gridWidth + 'px';
  canvas.style.maxWidth = gridWidth + 'px';
  canvas.style.minHeight = gridHeight + 'px';
  canvas.style.maxHeight = gridHeight + 'px';
  canvas.parentElement.style.overflow = 'hidden';

  // Draw Grid Cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'seating-grid-cell' + (c % 2 === 1 ? ' thick-border' : '');
      cell.style.left = (offsetX + c * cellWidth) + 'px';
      cell.style.top = (offsetY + r * cellHeight) + 'px';
      cell.style.width = cellWidth + 'px';
      cell.style.height = cellHeight + 'px';
      canvas.appendChild(cell);
    }
  }

  // Occupied matrix to find next free spot if a student has no coords
  const occupied = Array(rows).fill(null).map(() => Array(cols).fill(false));
  students.forEach(s => {
    if (s.gridX !== undefined && s.gridX < cols && s.gridY !== undefined && s.gridY < rows) {
      occupied[s.gridY][s.gridX] = true;
    }
  });

  const scale = gradeScale(groupId);
  students.forEach((s) => {
    const rawAvg = calculateStudentAverage(s, groupId);
    const avg = formatGradeAverage(rawAvg);
    
    // check absence, hw and participation
    const absence = (s.attendance||[]).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    const late = (s.attendance||[]).some(a => a.date === dateStr && a.type === 'zuspät');
    const forgotHw = (s.homework||[]).some(h => h.date === dateStr);
    const participation = (s.participation||[]).find(p => p.date === dateStr);

    const card = document.createElement('div');
    card.className = 'seating-card';
    if (absence) {
      card.classList.add(absence.type === 'abwesend' ? 'is-absent-unexcused' : 'is-absent-excused');
    }
    if (forgotHw) {
      card.classList.add('forgot-hw');
    }
    card.dataset.id = s.id;
    
    // Position
    let gx = s.gridX;
    let gy = s.gridY;
    
    // Assign next free slot if out of bounds or not set
    if (gx === undefined || gy === undefined || gx >= cols || gy >= rows) {
      let found = false;
      for (let r = 0; r < rows && !found; r++) {
        for (let c = 0; c < cols && !found; c++) {
          if (!occupied[r][c]) {
            gx = c; gy = r;
            occupied[r][c] = true;
            found = true;
          }
        }
      }
      if (!found) { gx = 0; gy = 0; } // Fallback overlapping
    }
    
    s.gridX = gx;
    s.gridY = gy;

    // Set dataset for grid pos
    card.dataset.gridX = gx;
    card.dataset.gridY = gy;
    
    const maxCardSize = Math.min(cellWidth, cellHeight);
    const padding = Math.min(10, maxCardSize * 0.1);
    const cardSize = maxCardSize - (padding * 2);

    const centerX = offsetX + gx * cellWidth + (cellWidth - cardSize) / 2;
    const centerY = offsetY + gy * cellHeight + (cellHeight - cardSize) / 2;

    card.style.left = centerX + 'px';
    card.style.top = centerY + 'px';
    card.style.width = cardSize + 'px';
    card.style.height = cardSize + 'px';

    if (isCompact) card.classList.add('compact');
    if (isTiny) card.classList.add('tiny');

    let partHtml = '';
    if (participation) {
      const valLabels = { 'positive':'<span style="color:var(--success)">+</span>', 'neutral':'<span style="color:var(--warning)">=</span>', 'negative':'<span style="color:var(--danger)">-</span>' };
      partHtml = `<div style="position:absolute; top:-6px; right:-6px; font-size:16px; font-weight:800; background:var(--bg-elevated); padding:0 6px; border-radius:8px; border:2px solid var(--border); box-shadow:0 2px 6px rgba(0,0,0,0.3); line-height:1.2; z-index:10;">${escHtml(valLabels[participation.value] || participation.value)}</div>`;
    }

    card.innerHTML = `
      <div class="sc-name" title="${escHtml(s.firstName)}">${escHtml(s.firstName)}</div>
      ${seatingShowGrades ? `<div class="sc-gpa" style="color:${gradeColor(rawAvg, scale)}">${avg}</div>` : ''}
      ${late ? '<div class="sc-late-note">Zu spät</div>' : ''}
      ${forgotHw ? '<div class="sc-hw-note">Keine HA</div>' : ''}
      ${partHtml}
    `;

    if (seatingEditMode) {
      makeDraggable(card, s.id, groupId, cellWidth, cellHeight, cols, rows, offsetX);
      card.classList.add('draggable-mode');
    } else {
      card.addEventListener('click', (e) => {
        // Seit dem Zeichnen kann ein neuer Tag begonnen haben (App über Nacht offen, BUGS E2)
        if (refreshSeatingDate()) { renderSeatingDateStrip(); renderSeatingPlan(); }
        openSeatingStudentModal(s.id, groupId, currentSeatingDateStr);
      });
    }

    // Re-apply active groups if any
    if (activeSeatingGroups && activeSeatingGroups[s.id]) {
      const gInfo = activeSeatingGroups[s.id];
      card.classList.add('grouped');
      card.style.borderColor = gInfo.color;
      card.style.boxShadow = `0 0 10px ${gInfo.color}80, inset 0 0 5px ${gInfo.color}30`;
      
      const badge = document.createElement('div');
      badge.className = 'seating-group-badge';
      badge.textContent = gInfo.groupName;
      badge.style.backgroundColor = gInfo.color;
      card.appendChild(badge);
    }

    canvas.appendChild(card);
  });

  // Render Teacher Desk
  if (g) {
    const tdX = g.teacherDeskX !== undefined ? g.teacherDeskX : Math.floor(cols/2) - 1;
    const tdY = g.teacherDeskY !== undefined ? g.teacherDeskY : rows - 1;

    const tDesk = document.createElement('div');
    tDesk.className = 'teacher-desk';
    const maxCardSize = Math.min(cellWidth, cellHeight);
    const padding = Math.min(10, maxCardSize * 0.1);
    const cardSize = maxCardSize - (padding * 2);

    const centerX = offsetX + tdX * cellWidth + (cellWidth * 2 - (cardSize * 2 + padding * 2)) / 2;
    const centerY = offsetY + tdY * cellHeight + (cellHeight - cardSize) / 2;

    tDesk.style.left = centerX + 'px';
    tDesk.style.top = centerY + 'px';
    tDesk.style.width = (cardSize * 2 + padding * 2) + 'px';
    tDesk.style.height = cardSize + 'px';
    tDesk.innerHTML = 'Lehrerpult';

    if (seatingEditMode) {
      makeDraggable(tDesk, 'teacherDesk', groupId, cellWidth, cellHeight, cols, rows, offsetX, 2);
      tDesk.classList.add('draggable-mode');
    }
    
    canvas.appendChild(tDesk);
  }
}

// ─── Seating Plan Live Features: Randomizer & Groups ──────────────────────
let lastSelectedRandomStudentId = null;
const groupColors = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4',
  '#ec4899', '#eab308', '#6366f1', '#14b8a6', '#84cc16', '#a855f7'
];

let seatingRandomizerRunning = false; // Doppelklick startet sonst zwei Animationen (BUGS E6)
function startSeatingRandomizer() {
  if (seatingRandomizerRunning) return;
  if (refreshSeatingDate()) { renderSeatingDateStrip(); renderSeatingPlan(); }
  const groupId = currentSeatingGroupId;
  const dateStr = currentSeatingDateStr;
  if (!groupId) {
    showToast('Keine Klasse ausgewählt', 'error');
    return;
  }
  
  const students = db.students[groupId] || [];
  const presentStudents = students.filter(s => {
    const absence = (s.attendance || []).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    return !absence;
  });

  if (presentStudents.length === 0) {
    showToast('Keine anwesenden Schüler in dieser Klasse!', 'error');
    return;
  }

  const modal = document.getElementById('modal-seating-randomizer');
  const nameEl = document.getElementById('random-student-name');
  
  nameEl.textContent = 'Auswahl läuft...';
  modal.classList.remove('hidden');
  seatingRandomizerRunning = true;

  document.querySelectorAll('.seating-card').forEach(card => {
    card.classList.remove('random-highlight', 'random-winner');
  });

  let duration = 2000;
  let start = Date.now();
  let delay = 50;
  
  function tick() {
    const elapsed = Date.now() - start;
    const index = Math.floor(Math.random() * presentStudents.length);
    const candidate = presentStudents[index];
    
    document.querySelectorAll('.seating-card').forEach(card => {
      card.classList.toggle('random-highlight', card.dataset.id === candidate.id);
    });

    if (elapsed < duration) {
      delay = 50 + Math.pow(elapsed / duration, 2) * 300;
      setTimeout(tick, delay);
    } else {
      let finalStudent = candidate;
      if (presentStudents.length > 1 && candidate.id === lastSelectedRandomStudentId) {
        const otherStudents = presentStudents.filter(s => s.id !== lastSelectedRandomStudentId);
        finalStudent = otherStudents[Math.floor(Math.random() * otherStudents.length)];
      }
      
      seatingRandomizerRunning = false;
      lastSelectedRandomStudentId = finalStudent.id;
      window.currentRandomStudent = { studentId: finalStudent.id, groupId, dateStr };

      document.querySelectorAll('.seating-card').forEach(card => {
        card.classList.remove('random-highlight');
        if (card.dataset.id === finalStudent.id) {
          card.classList.add('random-winner');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      nameEl.textContent = finalStudent.firstName + ' ' + finalStudent.lastName;
    }
  }

  tick();
}

function openSeatingGroupModal() {
  if (!currentSeatingGroupId) {
    showToast('Keine Klasse ausgewählt', 'error');
    return;
  }
  openModal('modal-seating-groups');
}

// Gruppengrößen für n Schüler bei Wunschgröße size: nie größer als size, Unterschied höchstens 1,
// niemand allein (dann lieber eine Gruppe mehr Personen) (BUGS E6)
function seatingGroupSizes(n, size) {
  if (n <= 0) return [];
  let count = Math.ceil(n / Math.max(1, size));
  if (count > 1 && Math.floor(n / count) < 2) count--;
  const sizes = [];
  for (let i = 0; i < count; i++) sizes.push(Math.floor(n / count) + (i < n % count ? 1 : 0));
  return sizes;
}
function shuffled(list) { // Fisher-Yates: jede Reihenfolge gleich wahrscheinlich
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSeatingGroups() {
  if (refreshSeatingDate()) { renderSeatingDateStrip(); renderSeatingPlan(); }
  const groupId = currentSeatingGroupId;
  const dateStr = currentSeatingDateStr;
  
  const size = parseInt(document.getElementById('seating-group-size').value) || 3;
  const method = document.getElementById('seating-group-method').value;

  const students = db.students[groupId] || [];
  const presentStudents = students.filter(s => {
    const absence = (s.attendance || []).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    return !absence;
  });

  if (presentStudents.length === 0) {
    showToast('Keine anwesenden Schüler zum Einteilen!', 'error');
    return;
  }

  clearSeatingGroups(false);

  const sizes = seatingGroupSizes(presentStudents.length, size);
  let groups = [];
  if (method === 'random') {
    const order = shuffled(presentStudents);
    sizes.forEach(n => groups.push(order.splice(0, n)));
  } else if (method === 'proximity') {
    const ungrouped = [...presentStudents];
    
    sizes.forEach(targetSize => {
      const current = ungrouped.shift();
      const currentGroup = [current];
      
      while (currentGroup.length < targetSize && ungrouped.length > 0) {
        let bestIndex = -1;
        let minDist = Infinity;
        
        for (let i = 0; i < ungrouped.length; i++) {
          const candidate = ungrouped[i];
          const dist = Math.sqrt(
            Math.pow((current.gridX || 0) - (candidate.gridX || 0), 2) +
            Math.pow((current.gridY || 0) - (candidate.gridY || 0), 2)
          );
          if (dist < minDist) {
            minDist = dist;
            bestIndex = i;
          }
        }
        
        if (bestIndex !== -1) {
          currentGroup.push(ungrouped.splice(bestIndex, 1)[0]);
        }
      }
      
      groups.push(currentGroup);
    });
  }

  activeSeatingGroups = {};
  groups.forEach((group, groupIndex) => {
    const color = groupColors[groupIndex % groupColors.length];
    const groupName = `G${groupIndex + 1}`;
    group.forEach(student => {
      activeSeatingGroups[student.id] = { color, groupName };
    });
  });

  renderSeatingPlan();
  closeModal('modal-seating-groups');
  showToast(`${groups.length} Gruppen gebildet!`);
}

function clearSeatingGroups(showMsg = true) {
  activeSeatingGroups = null;
  document.querySelectorAll('.seating-card.grouped').forEach(card => {
    card.classList.remove('grouped');
    card.style.borderColor = '';
    card.style.boxShadow = '';
    card.querySelectorAll('.seating-group-badge').forEach(b => b.remove());
  });
  if (showMsg) {
    closeModal('modal-seating-groups');
    showToast('Gruppen aufgehoben');
  }
}

function onToggleShowGridAlways(checked) {
  if (!db.settings) db.settings = {};
  db.settings.showSeatingGridAlways = checked;
  saveDB();
  renderSeatingPlan();
}

// ─── Hinweis „hat letzte Stunde unentschuldigt gefehlt“ in der nächsten Stunde (BUGS E4) ─────
function absenceNoteText(s) { return `${s.firstName} ${s.lastName} hat letzte Stunde unentschuldigt gefehlt`; }
// Nächste Stunde der Klasse nach dateStr, die wirklich stattfindet (A/B-Woche, Vertretung, Ausfall)
function nextLessonOfGroup(groupId, dateStr) {
  let d = parseDate(dateStr);
  for (let i = 0; i < 28; i++) {
    d = addDays(d, 1);
    if (!isSchoolDay(d)) continue;
    const hit = lessonsOnDate(formatDate(d)).find(l => l.slot.groupId === groupId && !l.ausfall);
    if (hit) return { slotId: hit.slot.id, dateStr: hit.dateStr };
  }
  return null;
}
function addAbsenceNote(groupId, dateStr, s) {
  const next = nextLessonOfGroup(groupId, dateStr);
  if (!next) return;
  const key = next.slotId + '_' + next.dateStr;
  if (!db.lessonData[key]) db.lessonData[key] = {};
  const note = absenceNoteText(s);
  const lines = (db.lessonData[key].notes || '').split('\n');
  if (!lines.includes(note)) db.lessonData[key].notes = [...lines.filter(l => l.trim()), note].join('\n');
}
// Entfernt den Hinweis aus allen Stunden der Klasse in den 4 Wochen danach – so wird er auch gefunden,
// wenn sich der Stundenplan seit dem Eintragen geändert hat (Ausfall, Vertretung).
function removeAbsenceNote(groupId, dateStr, s) {
  const notes = [absenceNoteText(s)];
  // Ältere Versionen schrieben nur den Vornamen – den nur entfernen, wenn er in der Klasse eindeutig ist
  if ((db.students[groupId] || []).filter(x => x.firstName === s.firstName).length === 1) {
    notes.push(`${s.firstName} hat letzte Stunde unentschuldigt gefehlt`);
  }
  const slotIds = new Set(db.lessonSlots.filter(slot => slot.groupId === groupId).map(slot => slot.id));
  const until = formatDate(addDays(parseDate(dateStr), 28));
  Object.keys(db.lessonData).forEach(key => {
    const sep = key.lastIndexOf('_');
    const slotId = key.slice(0, sep), keyDate = key.slice(sep + 1);
    if (!slotIds.has(slotId) || keyDate <= dateStr || keyDate > until) return;
    const entry = db.lessonData[key];
    if (!entry || !entry.notes) return;
    const lines = entry.notes.split('\n');
    const kept = lines.filter(l => !notes.includes(l.trim()));
    if (kept.length !== lines.length) entry.notes = kept.join('\n').trim();
  });
}

function setSeatingAbsence(type) {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];
  
  const existingIdx = s.attendance.findIndex(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
  if (existingIdx !== -1 && s.attendance[existingIdx].type === type) {
    if (type === 'abwesend') {
      removeAbsenceNote(groupId, dateStr, s);
    }
    s.attendance.splice(existingIdx, 1);
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Eintrag entfernt');
    return;
  }
  
  // Remove existing
  const wasAbwesend = s.attendance.some(a => a.date === dateStr && a.type === 'abwesend');
  if (wasAbwesend && type !== 'abwesend') {
    removeAbsenceNote(groupId, dateStr, s);
  }
  // Fehlen und „zu spät“ schließen sich am selben Tag aus
  s.attendance = s.attendance.filter(a => a.date !== dateStr || (a.type !== 'abwesend' && a.type !== 'entschuldigt' && a.type !== 'zuspät'));
  
  // Add new
  s.attendance.push({ id: uid(), date: dateStr, type: type, note: '' });

  // If unexcused, add note to next lesson
  if (type === 'abwesend') addAbsenceNote(groupId, dateStr, s);

  saveDB();
  renderSeatingPlan();
  closeModal('modal-seating-student');
  showToast(type === 'abwesend' ? 'Unentschuldigt eingetragen' : 'Entschuldigt eingetragen');
}

// BUGS H8: „zu spät“ direkt aus der Schnellbewertung; zweiter Klick nimmt es zurück
function setSeatingLate() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];

  const existing = s.attendance.find(a => a.date === dateStr && a.type === 'zuspät');
  if (existing) {
    s.attendance.splice(s.attendance.indexOf(existing), 1);
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Eintrag entfernt');
    return;
  }

  // Wer zu spät kommt, fehlt nicht: ein Fehlen am selben Tag wird ersetzt
  if (s.attendance.some(a => a.date === dateStr && a.type === 'abwesend')) {
    removeAbsenceNote(groupId, dateStr, s);
  }
  s.attendance = s.attendance.filter(a => a.date !== dateStr || (a.type !== 'abwesend' && a.type !== 'entschuldigt'));
  s.attendance.push({ id: uid(), date: dateStr, type: 'zuspät', note: '' });
  saveDB();
  renderSeatingPlan();
  closeModal('modal-seating-student');
  showToast('Zu spät eingetragen', 'warning');
}

function setSeatingHomework() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];
  
  const existingIdx = s.homework.findIndex(h => h.date === dateStr);
  if (existingIdx === -1) {
    s.homework.push({ id: uid(), date: dateStr, note: '' });
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Hausaufgabe vergessen eingetragen', 'warning');
  } else {
    s.homework.splice(existingIdx, 1);
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Eintrag entfernt');
  }
}

function makeDraggable(el, studentId, groupId, cellWidth, cellHeight, maxCols, maxRows, offsetX = 0, widthCells = 1) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  function dragStart(e) {
    if (e.target.closest('.sc-absent-toggle')) return;
    isDragging = true;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startX = clientX;
    startY = clientY;
    initialLeft = parseFloat(el.style.left) || 0;
    initialTop = parseFloat(el.style.top) || 0;
    el.classList.add('dragging');

    document.addEventListener('mousemove', drag, {passive: false});
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', drag, {passive: false});
    document.addEventListener('touchend', dragEnd);
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) {
      el.dataset.dragged = 'true';
    }

    const currentX = initialLeft + (clientX - startX);
    const currentY = initialTop + (clientY - startY);
    el.style.left = currentX + 'px';
    el.style.top = currentY + 'px';
  }

  function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', dragEnd);
    
    if (el.dataset.dragged) {
      // Calculate closest grid snap relative to centered grid
      const centerX = parseFloat(el.style.left) + (el.offsetWidth / 2);
      const centerY = parseFloat(el.style.top) + (el.offsetHeight / 2);
      
      // Ein Element über mehrere Zellen (Lehrerpult: 2) hat seine Mitte auf der Grenze zwischen
      // seinen Zellen – daher halbe Überbreite abziehen, sonst springt es eine Spalte nach rechts (BUGS E3)
      let gridX = Math.floor((centerX - offsetX) / cellWidth - (widthCells - 1) / 2);
      let gridY = Math.floor(centerY / cellHeight);
      
      // Clamp bounds
      if (gridX < 0) gridX = 0; if (gridX + widthCells > maxCols) gridX = maxCols - widthCells;
      if (gridY < 0) gridY = 0; if (gridY >= maxRows) gridY = maxRows - 1;

      if (studentId === 'teacherDesk') {
        const g = db.groups.find(x => x.id === groupId);
        if (g) {
          g.teacherDeskX = gridX;
          g.teacherDeskY = gridY;
          saveDB();
          renderSeatingPlan();
        }
      } else {
        const s = db.students[groupId].find(x => x.id === studentId);
        if (s) {
          const otherStudent = db.students[groupId].find(x => x.id !== studentId && x.gridX === gridX && x.gridY === gridY);
          if (otherStudent) {
            otherStudent.gridX = s.gridX;
            otherStudent.gridY = s.gridY;
          }
          s.gridX = gridX;
          s.gridY = gridY;
          saveDB();
          renderSeatingPlan();
        }
      }
    }
  }

  el.addEventListener('mousedown', dragStart);
  el.addEventListener('touchstart', dragStart, {passive: false});
}


function openSeatingStudentModal(studentId, groupId, dateStr) {
  const s = db.students[groupId].find(x => x.id === studentId);
  if (!s) return;
  document.getElementById('seating-student-title').textContent = `${s.firstName} ${s.lastName}`;
  document.getElementById('seating-student-date-label').textContent = `Mitarbeit am ${formatDateDE(new Date(dateStr+'T12:00:00'))}`;
  
  // Save context for smiley buttons
  window.currentSeatingStudent = { studentId, groupId, dateStr };

  // Render participation summary
  const partPos = (s.participation||[]).filter(p => p.value==='positive').length;
  const partNeutral = (s.participation||[]).filter(p => p.value==='neutral').length;
  const partNeg = (s.participation||[]).filter(p => p.value==='negative').length;
  document.getElementById('seating-student-participation-summary').innerHTML = `
    <span style="color:var(--success)">${partPos}</span> : 
    <span style="color:var(--warning)">${partNeutral}</span> : 
    <span style="color:var(--danger)">${partNeg}</span>
  `;

  renderSeatingStudentGrades(seatingShowGrades);

  openModal('modal-seating-student');
}

// Notenliste im Schüler-Fenster des Sitzplans. Datenschutz (BUGS H1): Solange die Noten im Sitzplan
// verborgen sind, erst nach „Anzeigen“ – und dann nur für diesen einen Schüler.
function revealSeatingStudentGrades() { renderSeatingStudentGrades(true); }

function renderSeatingStudentGrades(show) {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId } = window.currentSeatingStudent;
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  const gradesContainer = document.getElementById('seating-student-grades');
  if (!s || !gradesContainer) return;
  gradesContainer.innerHTML = '';
  if (!s.grades || !s.grades.length) {
    gradesContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px;">Keine Noten vorhanden</div>';
    return;
  }
  if (!show) {
    gradesContainer.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-muted); padding:8px 12px; background:var(--bg-secondary); border-radius:8px;">
        <span>${s.grades.length} Note(n) – verborgen</span>
        <button class="btn-secondary" style="padding:4px 10px; font-size:12px;" onclick="revealSeatingStudentGrades()">Anzeigen</button>
      </div>`;
    return;
  }
  // Sort chronologically (descending)
  const sortedGrades = s.grades.map((g, idx) => ({...g, _origIdx: idx})).sort((a,b) => (b.date||'').localeCompare(a.date||''));
  sortedGrades.forEach(g => {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:8px 12px; border-radius:8px; font-size:13px;';
    const valColor = gradeColor(gradeNumber(g.value), gradeScale(groupId));
    el.innerHTML = `
      <div style="display:flex; flex-direction:column; flex:1;">
        <span style="font-weight:600; color:var(--text-primary)">${escHtml(g.note || gradeTypeLabel(g.type))}</span>
        <span style="font-size:11px; color:var(--text-muted)">${g.date ? formatDateShort(g.date) : ''}</span>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="font-weight:800; font-size:15px; color:${valColor}">${escHtml(g.value)}</div>
        <button class="btn-icon" style="padding:4px;" onclick="openGradeForm(${jsArg(studentId)}, ${jsArg(groupId)}, ${g._origIdx})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
    `;
    gradesContainer.appendChild(el);
  });
}

function openGradeFormForCurrentStudent() {
  const { studentId, groupId } = window.currentSeatingStudent;
  if (studentId && groupId) {
    openGradeForm(studentId, groupId, -1);
  }
}

// ─── Global Grade Form ────────────────────────────────────────────────────
let currentGradeFormCtx = null; // { studentId, groupId, grade } – grade = Objekt-Referenz (null = neue Note)

function openGradeForm(studentId, groupId, gradeIdx, defaultDateStr = '', defaultLabel = '') {
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  // Referenz statt Index merken: der Index kann sich verschieben, solange das Formular offen ist
  currentGradeFormCtx = { studentId, groupId, grade: (gradeIdx >= 0 && s.grades && s.grades[gradeIdx]) || null };

  // Hide the quick student modal if it's open, so they don't overlap awkwardly
  const seatingModal = document.getElementById('modal-seating-student');
  if (!seatingModal.classList.contains('hidden')) {
    seatingModal.classList.add('hidden');
    currentGradeFormCtx.wasSeatingModalOpen = true;
  }

  // Also hide the detailed student modal from the classes view
  const detailModal = document.getElementById('modal-student-detail');
  if (detailModal && !detailModal.classList.contains('hidden')) {
    detailModal.classList.add('hidden');
    currentGradeFormCtx.wasDetailModalOpen = true;
  }

  const scale = gradeScale(groupId);
  document.getElementById('gf-value-label').textContent = scale.inputLabel;
  document.getElementById('gf-value').placeholder = scale.placeholder;

  const btnDelete = document.getElementById('gf-btn-delete');
  if (currentGradeFormCtx.grade) {
    const g = currentGradeFormCtx.grade;
    document.getElementById('grade-form-title').textContent = 'Note bearbeiten';
    document.getElementById('gf-type').value = g.type || 'test';
    document.getElementById('gf-value').value = g.value || '';
    document.getElementById('gf-date').value = g.date || formatDate(new Date());
    document.getElementById('gf-label').value = g.note || '';
    btnDelete.style.display = 'block';
  } else {
    document.getElementById('grade-form-title').textContent = 'Neue Note';
    document.getElementById('gf-type').value = 'test';
    document.getElementById('gf-value').value = '';
    document.getElementById('gf-date').value = defaultDateStr || formatDate(new Date());
    document.getElementById('gf-label').value = defaultLabel || '';
    btnDelete.style.display = 'none';
  }
  openModal('modal-grade-form');
}

function closeGradeForm() {
  closeModal('modal-grade-form');
  // Kontext sofort vergessen: closeGradeForm wird auch aufgerufen, wenn das Formular gar nicht offen ist
  // (z. B. aus dem Dashboard) – sonst öffnet sich später ein altes Schüler-Fenster erneut (BUGS E5)
  const ctx = currentGradeFormCtx;
  currentGradeFormCtx = null;
  if (ctx) {
    if (ctx.wasSeatingModalOpen && window.currentSeatingStudent) {
      const { studentId, groupId } = ctx;
      // Re-open underlying modal
      openSeatingStudentModal(studentId, groupId, window.currentSeatingStudent.dateStr);
    }
    if (ctx.wasDetailModalOpen) {
      const detailModal = document.getElementById('modal-student-detail');
      if (detailModal) detailModal.classList.remove('hidden');
    }
  }
}

// Notenformular: Note der offenen Form im aktuellen db-Stand suchen (per Referenz, nie per Index)
function findGradeFormTarget() {
  if (!currentGradeFormCtx) return null;
  const { studentId, groupId, grade } = currentGradeFormCtx;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return null;
  const idx = grade ? (s.grades || []).indexOf(grade) : -1;
  return { s, groupId, idx, isEdit: !!grade };
}

function saveGradeFromForm() {
  const target = findGradeFormTarget();
  if (!target) { showToast('Schüler nicht gefunden – Note wurde nicht gespeichert', 'error'); return; }
  const { s, groupId, idx, isEdit } = target;
  if (isEdit && idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync) – bitte neu öffnen', 'error'); return; }

  const type = document.getElementById('gf-type').value;
  const value = document.getElementById('gf-value').value.trim();
  const dateStr = document.getElementById('gf-date').value;
  const label = document.getElementById('gf-label').value.trim();

  if (!value) { showToast('Bitte einen Wert eingeben', 'error'); return; }
  const scale = gradeScale(groupId);
  const parsed = parseGradeInput(value, scale);
  if (!parsed) { showToast(scale.inputError, 'error'); return; }

  if (!s.grades) s.grades = [];
  const entry = { type, value: parsed.value, date: dateStr, note: label };
  if (isEdit) {
    s.grades[idx] = entry;
    showToast('Note aktualisiert');
  } else {
    s.grades.push(entry);
    showToast('Note hinzugefügt');
  }

  saveDB();
  closeGradeForm();
  refreshGradeViews(s, groupId);
}

function deleteGradeFromForm() {
  const target = findGradeFormTarget();
  if (!target || !target.isEdit) return;
  const { s, groupId, idx } = target;
  if (idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync) – bitte neu öffnen', 'error'); return; }

  s.grades.splice(idx, 1);
  saveDB();
  showToast('Note gelöscht');
  closeGradeForm();
  refreshGradeViews(s, groupId);
}

// Nach Änderungen im Notenformular alles neu zeichnen, was gerade sichtbar ist und Noten zeigt
function refreshGradeViews(s, groupId) {
  const overview = document.getElementById('overview-content');
  if (overview && !overview.classList.contains('hidden') && currentOverviewGroupId === groupId) {
    renderOverviewTable();
  }
  const detailModal = document.getElementById('modal-student-detail');
  if (detailModal && !detailModal.classList.contains('hidden') && currentGroupId === groupId) {
    renderGradesList(s);
    renderStudents();
  }
  if (document.getElementById('view-seating')?.classList.contains('active') && currentSeatingGroupId === groupId) {
    renderSeatingPlan();
  }
  if (document.getElementById('view-dashboard')?.classList.contains('active')) renderDashboard();
}

// ─── Lesson Quick Access ──────────────────────────────────────────────────
function openClassOverviewFromLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !slot.groupId) return;
  closeModal('modal-lesson');
  openClassOverview(slot.groupId);
}

function openQuickStudentListFromLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !slot.groupId) return;
  
  const students = db.students[slot.groupId] || [];
  const listContainer = document.getElementById('lesson-students-list');
  listContainer.innerHTML = '';
  
  if (!students.length) {
    listContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
  } else {
    const sorted = sortStudents(students);
    sorted.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:12px 16px; border-bottom:1px solid var(--border); cursor:pointer; font-weight:500;';
      row.textContent = `${s.lastName}, ${s.firstName}`;
      row.onclick = () => {
        closeModal('modal-lesson-students');
        openSeatingStudentModal(s.id, slot.groupId, activeLessonDate);
      };
      listContainer.appendChild(row);
    });
  }
  openModal('modal-lesson-students');
}

function addParticipationSmiley(type) {
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId].find(x => x.id === studentId);
  if (!s) return;
  
  if (!s.participation) s.participation = [];
  
  // check if a smiley already exists for this date, if so, override it, else push new
  const existingIdx = s.participation.findIndex(p => p.date === dateStr);
  if (existingIdx !== -1) {
    if (s.participation[existingIdx].value === type) {
      s.participation.splice(existingIdx, 1);
      saveDB();
      renderSeatingPlan();
      showToast('Eintrag entfernt');
      closeModal('modal-seating-student');
      return;
    } else {
      s.participation[existingIdx].value = type;
    }
  } else {
    s.participation.push({ id: uid(), date: dateStr, value: type });
  }
  
  saveDB();
  renderSeatingPlan();
  showToast('Mitarbeit gespeichert');
  closeModal('modal-seating-student');
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function createEntryItem(text, date, onDelete) {
  const el = document.createElement('div');
  el.className = 'entry-item';
  el.innerHTML = `
    <span class="entry-item-text">${escHtml(text)}</span>
    <span class="entry-item-date">${date ? formatDateShort(date) : ''}</span>
    <button class="entry-item-delete" aria-label="Löschen">✕</button>`;
  el.querySelector('.entry-item-delete').onclick = onDelete;
  return el;
}

function openModal(id)  { const m = document.getElementById(id); if(m) m.classList.remove('hidden'); }
function closeModal(id) { const m = document.getElementById(id); if(m) m.classList.add('hidden'); }
// Tippen neben ein Fenster: wie sein Schließen-Knopf, also z. B. Stunden-Notizen speichern (BUGS G13)
function closeModalOnOverlay(event, id) { if (event.target === document.getElementById(id)) closeModalLikeButton(id); }

function showToast(msg, type='success') {
  const t = Object.assign(document.createElement('div'), { className:`toast ${type}`, textContent: msg });
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.cssText='opacity:0;transition:opacity .3s'; setTimeout(()=>t.remove(),300); }, 2500);
}

// Für Text und Attributwerte in innerHTML. Auch ' und ", damit value="…"/title="…" dicht bleiben.
function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}
// Argument für einen Inline-Handler: onclick="f(${jsArg(x)})". Liefert ein fertiges JS-Literal samt
// Anführungszeichen. escHtml allein reicht dort nicht: der Browser dekodiert &#39; vor dem Ausführen wieder zu '.
function jsArg(v) {
  return escHtml(JSON.stringify(v ?? null));
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr+'T00:00:00').toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
}

// ─── Notenskala pro Klasse (BUGS H7) ─────────────────────────────────────
// group.gradeScale: fehlt/unbekannt = '1-6' (auch alle bestehenden Klassen), '0-15' = Punkte (Oberstufe).
// Bei Punkten gilt „höher = besser“. Alles, was Noten prüft, färbt oder bewertet, fragt die Skala der Klasse.
const GRADE_SCALES = {
  '1-6':  { id: '1-6',  min: 1, max: 6,  higherIsBetter: false, integer: false, unit: '',       label: 'Noten 1–6',
            inputLabel: 'Note / Wert (z.B. 1, 2.5, 2-, +)', placeholder: 'z.B. 1 oder +',
            inputError: 'Bitte eine Note zwischen 1 und 6 eingeben (z. B. 2, 2,5 oder 2-)' },
  '0-15': { id: '0-15', min: 0, max: 15, higherIsBetter: true,  integer: true,  unit: 'Punkte', label: 'Punkte 0–15 (Oberstufe)',
            inputLabel: 'Punkte (0–15) oder Text wie +', placeholder: 'z.B. 11',
            inputError: 'Bitte ganze Punkte zwischen 0 und 15 eingeben (z. B. 11)' },
};
// Skala zu einer Klasse (Objekt oder ID)
function gradeScale(groupOrId) {
  const g = typeof groupOrId === 'string' ? db.groups.find(x => x.id === groupOrId) : groupOrId;
  return GRADE_SCALES[g && g.gradeScale] || GRADE_SCALES['1-6'];
}
// Schnitt zur Anzeige ('–' ohne Noten); Punkte und Noten mit 1 Nachkomma
function formatGradeAverage(avg, digits = 1) {
  return avg === null || avg === undefined || isNaN(avg) ? '–' : avg.toFixed(digits);
}

function gradeColor(val, scale = GRADE_SCALES['1-6']) {
  if (val === null || val === undefined || isNaN(val)) return 'var(--text-muted)';
  if (scale.higherIsBetter) {
    // 15–13 = sehr gut … unter 5 Punkten = Unterkurs
    if (val>=12.5) return 'var(--grade-1)'; if (val>=9.5) return 'var(--grade-2)';
    if (val>=6.5) return 'var(--grade-3)'; if (val>=5) return 'var(--grade-4)';
    return 'var(--grade-5)';
  }
  if (val<=1.5) return 'var(--grade-1)'; if (val<=2.5) return 'var(--grade-2)';
  if (val<=3.5) return 'var(--grade-3)'; if (val<=4.5) return 'var(--grade-4)';
  return 'var(--grade-5)';
}

function gradeTypeLabel(type) {
  return {schularbeit:'Klassenarbeit',klausur:'Klausur',test:'Test',muendlich:'Mündlich',mitarbeit:'Mitarbeit',
          projekt:'Projekt',hausaufgabe:'HA',sonstig:'Sonstiges'}[type] || type;
}

// Kürzel für den Spaltenkopf der Notentabelle
function gradeTypeShort(type) {
  return {schularbeit:'KA',klausur:'KL',test:'Test',muendlich:'Mdl',mitarbeit:'MA',
          projekt:'Proj',hausaufgabe:'HA',sonstig:'Sonst'}[type] || type;
}

// Zentrale Zuordnung für die Gewichtung (Klasse → schularbeitWeight): diese Typen zählen als
// „Schularbeit“, alle anderen als „Sonstige“. 'klausur' kommt nur in Altdaten vor.
const SCHULARBEIT_GRADE_TYPES = ['schularbeit', 'klausur'];
function gradeCategory(type) {
  return SCHULARBEIT_GRADE_TYPES.includes(type) ? 'schularbeit' : 'sonstige';
}

// Zahlenwert einer gespeicherten Note, z. B. '2.0' → 2, '2-' → 2 (Tendenz zählt nicht), '+' → NaN
const GRADE_INPUT_RE = /^(\d+(?:[.,]\d+)?)\s*([+-]?)$/;
function gradeNumber(value) {
  const m = String(value ?? '').trim().match(GRADE_INPUT_RE);
  return m ? parseFloat(m[1].replace(',', '.')) : NaN;
}

// Nutzereingabe → { value (zu speichern), number (zählt im Schnitt, sonst null) } oder null = ungültig.
// 1–6: '2,5' → '2.5'; '2-'/'2+' bleiben als Tendenz stehen und zählen als 2; Text wie '+' zählt nicht.
// Punkte: nur ganze Zahlen 0–15, keine Tendenzen.
function parseGradeInput(input, scale = GRADE_SCALES['1-6']) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  const m = s.match(GRADE_INPUT_RE);
  if (!m) return /\d/.test(s) ? null : { value: s, number: null };
  const number = parseFloat(m[1].replace(',', '.'));
  if (number < scale.min || number > scale.max) return null;
  if (scale.integer) return (m[2] || !Number.isInteger(number)) ? null : { value: String(number), number };
  const tendency = m[2];
  const value = tendency ? String(Math.round(number * 10) / 10) + tendency : number.toFixed(1);
  return { value, number };
}

// ─── Keyboard ─────────────────────────────────────────────────────────────
// Escape und Tippen daneben schließen ein Fenster so wie sein eigener Schließen-Knopf (BUGS G7, G13).
const MODAL_CLOSE_ACTIONS = {
  'modal-lesson': () => saveLessonDataAndClose(),   // wie „Schließen“: Notizen nicht verwerfen
  'modal-grade-form': () => closeGradeForm(),
  'modal-sync-conflict': null,                       // Entscheidung nötig, nicht wegdrückbar
};
function closeModalLikeButton(id) {
  const action = id in MODAL_CLOSE_ACTIONS ? MODAL_CLOSE_ACTIONS[id] : () => closeModal(id);
  if (action) action();
}

// Escape: nur das oberste Fenster. Alle liegen auf derselben Ebene, also ist das letzte offene im Markup das oberste.
function closeTopModal() {
  const open = [...document.querySelectorAll('.modal-overlay:not(.hidden)')];
  const top = open[open.length - 1];
  if (top) closeModalLikeButton(top.id);
}

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
  if (e.target.type === 'date' && !e.target.value) e.target.value = formatDate(new Date());
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

// ─── Custom Form Dropdowns ────────────────────────────────────────────────
function makeCustomFormDropdown(selectEl) {
  if (selectEl.dataset.customDropdownInitialized) return;
  selectEl.dataset.customDropdownInitialized = 'true';
  selectEl.style.display = 'none';

  const container = document.createElement('div');
  container.className = 'custom-form-dropdown';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-form-dropdown-trigger';
  
  const label = document.createElement('span');
  label.style.flex = '1';
  label.style.textAlign = 'left';
  label.style.overflow = 'hidden';
  label.style.textOverflow = 'ellipsis';
  label.style.whiteSpace = 'nowrap';

  const svg = document.createElement('div');
  svg.style.flexShrink = '0';
  svg.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6; margin-left: 8px;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  trigger.appendChild(label);
  trigger.appendChild(svg);

  const menu = document.createElement('div');
  menu.className = 'custom-form-dropdown-menu';

  container.appendChild(trigger);
  container.appendChild(menu);

  selectEl.parentNode.insertBefore(container, selectEl.nextSibling);

  function renderMenu() {
    menu.innerHTML = '';
    let selectedText = '...';
    
    const renderOption = (opt) => {
      const item = document.createElement('div');
      item.className = 'custom-form-dropdown-item';
      item.textContent = opt.textContent;
      item.dataset.value = opt.value;
      if (selectEl.value === opt.value) {
        item.classList.add('selected');
        selectedText = opt.textContent;
      }
      item.onclick = (e) => {
        e.stopPropagation();
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        menu.classList.remove('show');
        renderMenu(); // Re-render to update selected state
        
        // Execute inline onchange if present
        if (typeof selectEl.onchange === 'function') {
           selectEl.onchange();
        }
      };
      return item;
    };

    Array.from(selectEl.children).forEach(child => {
      if (child.tagName === 'OPTGROUP') {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'custom-form-dropdown-optgroup';
        groupLabel.textContent = child.label;
        menu.appendChild(groupLabel);
        Array.from(child.children).forEach(opt => {
          menu.appendChild(renderOption(opt));
        });
      } else if (child.tagName === 'OPTION') {
        menu.appendChild(renderOption(child));
      }
    });

    label.textContent = selectedText;
  }

  // Initial render
  renderMenu();

  trigger.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isShowing = menu.classList.contains('show');
    document.querySelectorAll('.custom-form-dropdown-menu.show').forEach(m => m.classList.remove('show'));
    const seatingMenu = document.getElementById('seating-group-menu');
    if (seatingMenu) seatingMenu.classList.add('hidden'); // Close seating menu
    if (!isShowing) menu.classList.add('show');
  };

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      menu.classList.remove('show');
    }
  });

  // Watch for DOM changes (e.g. innerHTML updates)
  const observer = new MutationObserver(() => {
    renderMenu();
  });
  observer.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });

  // Override value setter to update UI programmatically
  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  if (originalDescriptor && !selectEl.dataset.valueOverridden) {
    Object.defineProperty(selectEl, 'value', {
      get: function() { return originalDescriptor.get.call(this); },
      set: function(val) {
        originalDescriptor.set.call(this, val);
        renderMenu();
      }
    });
    selectEl.dataset.valueOverridden = 'true';
  }
}

function initAllCustomDropdowns() {
  document.querySelectorAll('select.form-input').forEach(makeCustomFormDropdown);
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  applyThemePreview();
  renderTimetable();
  renderSubjectGroups();
  initAllCustomDropdowns();
}



// ─── PWA Update Logic ───────────────────────────────────────────────────
async function forceAppUpdate() {
  if ('serviceWorker' in navigator) {
    showToast('App wird aktualisiert...', 'success');
    // Erst alles wirklich entfernen, dann neu laden (sonst kommt u. U. wieder der alte Cache)
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
  }
  window.location.reload();
}
// ─── Resize Observer for Smart Fit ────────────────────────────────────────
let seatingResizeTimeout;
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

function timeToMins(t) {
  const [h, m] = String(t || '').split(':').map(Number);
  return isNaN(h) ? null : h * 60 + (m || 0);
}
// Beginn/Ende einer Stunde in Minuten; halbe Blöcke teilen den Block in der Mitte
function lessonTimeRange(block, part) {
  const start = timeToMins(block.start), end = timeToMins(block.end);
  if (start === null || end === null) return null;
  const mid = Math.round((start + end) / 2);
  if (part === 'first')  return { start, end: mid };
  if (part === 'second') return { start: mid, end };
  return { start, end };
}
function minsToTime(m) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

// Alle Stunden eines Tages in zeitlicher Reihenfolge: [{ slot, block, dateStr, range, ausfall }]
function lessonsOnDate(dateStr) {
  const partOrder = { first: 0, full: 0, second: 1 };
  const result = [];
  getBlocks().forEach(block => {
    lessonsAt(dateStr, block.num)
      .sort((a, b) => partOrder[a.part || 'full'] - partOrder[b.part || 'full'])
      .forEach(slot => result.push({
        slot, block, dateStr,
        range: lessonTimeRange(block, slot.part),
        ausfall: !!(db.lessonData[slot.id + '_' + dateStr] || {}).ausfall,
      }));
  });
  return result;
}

// Hausaufgaben/Tests, die zu dieser Stunde fällig sind (aus anderen Stunden der Klasse oder dieser selbst)
function dueItemsFor(slotId, dateStr) {
  const incoming = getIncomingItems(slotId, dateStr);
  const own = db.lessonData[slotId + '_' + dateStr] || {};
  const onDate = items => (items || []).filter(i => i.targetDate === dateStr);
  return { hw: [...incoming.hw, ...onDate(own.hwItems)], tests: [...incoming.tests, ...onDate(own.testItems)] };
}

// Nächste Stunde, die noch nicht begonnen hat und nicht ausfällt (bis zu 3 Wochen voraus)
function findNextLesson(now) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todayStr = formatDate(now);
  let d = parseDate(todayStr);
  for (let i = 0; i < 21; i++, d = addDays(d, 1)) {
    if (!isSchoolDay(d)) continue;
    const dateStr = formatDate(d);
    const hit = lessonsOnDate(dateStr).find(l =>
      !l.ausfall && (dateStr !== todayStr || (l.range && l.range.start > nowMins)));
    if (hit) return hit;
  }
  return null;
}

function lessonTitle(slot) {
  const group = slot.groupId && db.groups.find(g => g.id === slot.groupId);
  return group ? { main: group.className, sub: group.subject } : { main: slot.subject || '', sub: '' };
}

function collectWarnings() {
  const ack = db.acknowledgedWarnings || {};
  const warnAbsences = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  const warnHomework = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  const warnGrade    = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  const warnPoints   = db.settings.warnPoints !== undefined ? db.settings.warnPoints : 5; // Oberstufe: unter x Punkten
  const warnings = [];

  db.groups.forEach(group => {
    (db.students[group.id] || []).forEach(s => {
      const name = `${escHtml(s.firstName)} ${escHtml(s.lastName)}`;
      const unexcused = (s.attendance || []).filter(a => a.type === 'abwesend').length;
      if (warnAbsences > 0 && unexcused >= warnAbsences && unexcused > (ack[`${s.id}_absences`] || 0)) {
        warnings.push({ student: s, group, type: 'absences', count: unexcused,
          title: 'Zu viele unentschuldigte Fehlzeiten', desc: `${name} hat ${unexcused} unentschuldigte Fehlzeiten.` });
      }
      const hwCount = (s.homework || []).length;
      if (warnHomework > 0 && hwCount >= warnHomework && hwCount > (ack[`${s.id}_homework`] || 0)) {
        warnings.push({ student: s, group, type: 'homework', count: hwCount,
          title: 'Oft Hausaufgaben vergessen', desc: `${name} hat ${hwCount}-mal die Hausaufgaben vergessen.` });
      }
      const grades = s.grades || [];
      if (grades.length > 0) {
        const avg = calculateStudentAverage(s, group.id);
        const points = gradeScale(group).higherIsBetter;
        const critical = avg !== null && (points ? warnPoints > 0 && avg < warnPoints : warnGrade > 0 && avg >= warnGrade);
        if (critical && grades.length > (ack[`${s.id}_grade`] || 0)) {
          warnings.push({ student: s, group, type: 'grade', count: grades.length,
            title: 'Kritischer Notenstand',
            desc: `${name} steht aktuell auf ${points ? avg.toFixed(1) + ' Punkte' : avg.toFixed(2)}.` });
        }
      }
    });
  });
  return warnings;
}

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;
  container.innerHTML = renderDashboardToday() + renderDashboardWarnings();
  container.querySelectorAll('details.dash-warn-group').forEach(el => {
    el.addEventListener('toggle', () => {
      if (el.open) dashboardOpenGroups.add(el.dataset.group);
      else dashboardOpenGroups.delete(el.dataset.group);
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

  let html = `<section class="dash-section">
    <h2 class="dash-heading">${isTodayShown ? 'Heute' : 'Nächster Schultag'} <span class="dash-heading-sub">${escHtml(dayLabel)}</span></h2>`;

  if (!lessons.length) {
    html += `<div class="dash-empty">${isTodayShown ? 'Heute kein Unterricht.' : 'Kein Unterricht eingetragen.'}</div>`;
  } else {
    html += `<div class="dash-lessons">`;
    lessons.forEach(l => {
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
      if (due.hw.length)    badges.push(`<span class="dash-badge hw">HA ${due.hw.length}</span>`);
      if (due.tests.length) badges.push(`<span class="dash-badge test">Test ${due.tests.length}</span>`);
      if (data.notes)       badges.push(`<span class="dash-badge note">Notiz</span>`);
      html += `<div class="dash-lesson ${state}" data-slot="${escHtml(l.slot.id)}" style="--lesson-color:${escHtml(l.slot.color || '#6366f1')}"
                    onclick="openLessonDetail(${jsArg(l.slot.id)},${jsArg(dayStr)})">
          <div class="dash-lesson-time">${l.range ? minsToTime(l.range.start) : ''}<small>${escHtml(l.block.label)}</small></div>
          <div class="dash-lesson-main">
            <div class="dash-lesson-title">${escHtml(t.main)}${t.sub ? ` <span>${escHtml(t.sub)}</span>` : ''}</div>
            ${l.slot.room ? `<div class="dash-lesson-room">${escHtml(l.slot.room)}</div>` : ''}
          </div>
          <div class="dash-lesson-badges">${badges.join('')}</div>
          ${status ? `<div class="dash-lesson-status">${status}</div>` : ''}
        </div>`;
    });
    html += `</div>`;
  }
  html += `</section>`;

  if (next) {
    const t = lessonTitle(next.slot);
    const data = db.lessonData[next.slot.id + '_' + next.dateStr] || {};
    const due = dueItemsFor(next.slot.id, next.dateStr);
    const when = next.dateStr === todayStr
      ? minsToTime(next.range.start)
      : parseDate(next.dateStr).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) + (next.range ? ', ' + minsToTime(next.range.start) : '');
    const itemList = (label, cls, items) => items.length ? `<div class="dash-next-items ${cls}"><strong>${label}</strong><ul>${
      items.map(i => `<li>${escHtml(i.text)}</li>`).join('')}</ul></div>` : '';
    const body = (data.notes ? `<div class="dash-next-notes">${escHtml(data.notes)}</div>` : '')
      + itemList('Hausaufgaben fällig', 'hw', due.hw) + itemList('Test', 'test', due.tests);
    html += `<section class="dash-section">
      <div class="dash-next" style="--lesson-color:${escHtml(next.slot.color || '#6366f1')}" onclick="openLessonDetail(${jsArg(next.slot.id)},${jsArg(next.dateStr)})">
        <div class="dash-next-label">Nächste Stunde · ${escHtml(when)} · ${escHtml(next.block.label)}</div>
        <div class="dash-next-title">${escHtml(t.main)}${t.sub ? ` <span>${escHtml(t.sub)}</span>` : ''}${next.slot.room ? ` <span>· ${escHtml(next.slot.room)}</span>` : ''}</div>
        ${body || '<div class="dash-empty">Keine Notizen, nichts fällig.</div>'}
      </div>
    </section>`;
  }
  return html;
}

function renderDashboardWarnings() {
  const warnings = collectWarnings();
  let html = `<section class="dash-section"><h2 class="dash-heading">Warnungen${warnings.length ? ` <span class="dash-heading-sub">${warnings.length}</span>` : ''}</h2>`;
  if (!warnings.length) {
    return html + `<div class="dash-empty">Keine offenen Warnungen – alles im grünen Bereich.</div></section>`;
  }
  const icons = { absences: icon('absences'), grade: icon('trend-down'), homework: icon('homework') };
  const colors = { absences: 'var(--danger)', grade: 'var(--danger)', homework: 'var(--warning)' };
  db.groups.forEach(group => {
    const list = warnings.filter(w => w.group === group);
    if (!list.length) return;
    html += `<details class="dash-warn-group" data-group="${escHtml(group.id)}"${dashboardOpenGroups.has(group.id) ? ' open' : ''}>
      <summary><span class="dash-warn-class">${escHtml(group.className)}</span> <span class="dash-warn-subject">${escHtml(group.subject)}</span>
        <span class="dash-warn-count">${list.length}</span></summary>
      <div class="dash-warn-list">`;
    list.forEach(w => {
      html += `<div class="dash-warn" style="border-left-color:${colors[w.type]}">
          <div class="dash-warn-text" onclick="openStudentDetailFromDashboard(${jsArg(w.student.id)}, ${jsArg(group.id)}, ${jsArg(w.type)})" title="Zum Schülerprofil springen">
            <div class="dash-warn-title">${icons[w.type]}${w.title}</div>
            <div class="dash-warn-desc">${w.desc}</div>
          </div>
          <button class="btn-secondary" onclick="acknowledgeWarning(${jsArg(w.student.id)}, ${jsArg(w.type)}, ${w.count})">Erledigt</button>
        </div>`;
    });
    html += `</div></details>`;
  });
  return html + `</section>`;
}

window.acknowledgeWarning = function(studentId, type, count) {
  if (!db.acknowledgedWarnings) db.acknowledgedWarnings = {};
  db.acknowledgedWarnings[`${studentId}_${type}`] = count;
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

window.jumpToStudentDetailFromSeating = function() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId } = window.currentSeatingStudent;
  closeModal('modal-seating-student');
  switchView('classes');
  openGroupStudents(groupId);
  openStudentDetail(studentId);
};


// ─── Timer & Stopwatch ───────────────────────────────────────────────────
// Beide rechnen mit der Uhrzeit (Date.now), nicht mit gezählten Ticks: War das iPad gesperrt
// oder die App im Hintergrund, feuern Intervalle nicht, die Zeit läuft aber weiter (BUGS G6).
const PLAY_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
const PAUSE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';

function setPlayButton(id, running, name) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.innerHTML = running ? PAUSE_SVG : PLAY_SVG;
  btn.setAttribute('aria-label', `${name} ${running ? 'anhalten' : 'starten'}`);
}

let timerInterval = null;
let timerSeconds = 300; // 5 mins default; läuft der Timer, ist das die zuletzt angezeigte Restzeit
let timerIsRunning = false;
let timerEndsAt = 0;    // Date.now()-Zeitpunkt, an dem der laufende Timer abläuft

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  el.textContent = m + ':' + s;
}

function adjustTimer(mins) {
  if (timerIsRunning) return;
  timerSeconds += mins * 60;
  if (timerSeconds < 0) timerSeconds = 0;
  updateTimerDisplay();
}

function timerTick() {
  if (!timerIsRunning) return;
  timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
  updateTimerDisplay();
  if (timerSeconds <= 0) {
    clearInterval(timerInterval);
    timerIsRunning = false;
    setPlayButton('btn-timer-toggle', false, 'Timer');
    showToast('Timer abgelaufen!');
  }
}

function toggleTimer() {
  if (timerIsRunning) {
    timerTick();
    clearInterval(timerInterval);
    timerIsRunning = false;
    setPlayButton('btn-timer-toggle', false, 'Timer');
  } else {
    if (timerSeconds <= 0) return;
    timerIsRunning = true;
    timerEndsAt = Date.now() + timerSeconds * 1000;
    setPlayButton('btn-timer-toggle', true, 'Timer');
    timerInterval = setInterval(timerTick, 250);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerIsRunning = false;
  timerSeconds = 300;
  setPlayButton('btn-timer-toggle', false, 'Timer');
  updateTimerDisplay();
}

let stopwatchInterval = null;
let stopwatchMs = 0;
let stopwatchIsRunning = false;
let stopwatchLastTick = 0;

function updateStopwatchDisplay() {
  const el = document.getElementById('stopwatch-display');
  if (!el) return;
  const totalSeconds = Math.floor(stopwatchMs / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((stopwatchMs % 1000) / 100).toString();
  el.textContent = m + ':' + s + '.' + ms;
}

function stopwatchTick() {
  if (!stopwatchIsRunning) return;
  const now = Date.now();
  stopwatchMs += (now - stopwatchLastTick);
  stopwatchLastTick = now;
  updateStopwatchDisplay();
}

function toggleStopwatch() {
  if (stopwatchIsRunning) {
    stopwatchTick();
    clearInterval(stopwatchInterval);
    stopwatchIsRunning = false;
    setPlayButton('btn-stopwatch-toggle', false, 'Stoppuhr');
  } else {
    stopwatchIsRunning = true;
    setPlayButton('btn-stopwatch-toggle', true, 'Stoppuhr');
    stopwatchLastTick = Date.now();
    stopwatchInterval = setInterval(stopwatchTick, 100);
  }
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchIsRunning = false;
  stopwatchMs = 0;
  setPlayButton('btn-stopwatch-toggle', false, 'Stoppuhr');
  updateStopwatchDisplay();
}

// App wieder im Vordergrund: sofort die richtige Zeit zeigen, nicht erst beim nächsten Tick
document.addEventListener('visibilitychange', () => { timerTick(); stopwatchTick(); });


// ─── Cloud Sync (E2EE) Implementation ──────────────────────────────────────

// Initialisiert die Synchronisierung beim Laden der App
function initSync() {
  // 1. Initialisiere den SyncManager mit der fest verbauten FIREBASE_CONFIG
  if (typeof FIREBASE_CONFIG !== 'undefined') {
    const success = SyncManager.init(FIREBASE_CONFIG);
    if (success) {
      // Wenn das Passwort im sessionStorage liegt (z.B. nach Page Reload), wiederherstellen
      const savedPassword = sessionStorage.getItem('sync_master_password');
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
    }
  };

  SyncManager.callbacks.onSyncStatusChanged = (status) => {
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;
    if (status === 'checking') {
      badge.textContent = 'Status: Prüfe...';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
    } else if (status === 'synced') {
      badge.textContent = 'Status: Synchronisiert';
      badge.style.background = 'var(--success-soft)';
      badge.style.color = 'var(--success)';
    } else if (status === 'conflict') {
      badge.textContent = 'Status: Konflikt!';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else if (status === 'error') {
      badge.textContent = 'Status: Fehler!';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else {
      badge.textContent = 'Status: Bereit';
      badge.style.background = 'var(--bg-card)';
      badge.style.color = 'var(--text-primary)';
    }
  };

  SyncManager.callbacks.onConflictDetected = (conflictInfo) => {
    // Öffne das Konflikt-Modal und fülle die Zeiten aus.
    // Bewusst kein „(aktueller)“: Die Uhren verschiedener Geräte sind nicht vergleichbar.
    const fmt = ts => ts ? new Date(ts).toLocaleString('de-DE') : 'Unbekannt';
    document.getElementById('conflict-local-time').textContent = 'geändert ' + fmt(db.settings.lastModified);
    document.getElementById('conflict-cloud-time').textContent = 'geändert ' + fmt(conflictInfo.cloudTimestamp);

    // Solange der Konflikt offen ist, pausiert der automatische Sync (siehe triggerSyncInternal)
    window.currentConflict = conflictInfo;

    openModal('modal-sync-conflict');
  };

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

  // Benutzer angemeldet?
  if (SyncManager.currentUser) {
    userStatus.textContent = `Angemeldet als: ${SyncManager.currentUser.email}`;
    loginForm.classList.add('hidden');
    loggedInPanel.classList.remove('hidden');
    cryptoSection.classList.remove('hidden');
    
    // Letzter Sync-Zeitpunkt anzeigen
    if (db.syncSettings && db.syncSettings.lastSyncedCloudTimestamp) {
      const d = new Date(db.syncSettings.lastSyncedCloudTimestamp);
      lastTimeEl.textContent = `Zuletzt synchronisiert: ${d.toLocaleString('de-DE')}`;
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
      alert('Fehler beim Login: ' + err.message);
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
      showToast('Registrierung erfolgreich! Angemeldet ✓');
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

// Logout
function logoutSync() {
  SyncManager.logout()
    .then(() => {
      sessionStorage.removeItem('sync_master_password');
      const passInput = document.getElementById('sync-master-password');
      if (passInput) passInput.value = '';
      showToast('Ausgeloggt.');
    });
}

// Master-Passwort übernehmen (onchange, nicht bei jedem Tastendruck).
// Direkt danach wird synchronisiert – dabei prüft der SyncManager, ob das Passwort
// die Cloud-Daten entschlüsseln kann, bevor irgendetwas hochgeladen wird.
function updateMasterPassword(pwd) {
  SyncManager.setMasterPassword(pwd);
  if (pwd) sessionStorage.setItem('sync_master_password', pwd);
  else sessionStorage.removeItem('sync_master_password');
  if (pwd && SyncManager.currentUser) triggerSyncInternal({ manual: true });
}

// Falsches Passwort wieder vergessen, damit kein weiterer Sync damit läuft.
function rejectMasterPassword() {
  SyncManager.setMasterPassword('');
  sessionStorage.removeItem('sync_master_password');
  const passInput = document.getElementById('sync-master-password');
  if (passInput) passInput.value = '';
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
  return !(db.groups && db.groups.length) && !(db.lessonSlots && db.lessonSlots.length) && !hasStudents;
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
  persistDB();
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
  db = migrateDB(parsed);
  markSynced(cloudTimestamp, db.settings.lastModified);
  updateAppliedThemeFromDB();
  renderTimetable();
  renderSubjectGroups();
  updateSyncUI();
}

// Immer nur ein Sync gleichzeitig. Wird währenddessen ein weiterer angefordert,
// läuft er direkt im Anschluss.
let syncRunning = false;
let syncQueued = false;
const SYNC_TIMEOUT_MS = 30000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Zeitüberschreitung – bitte Internetverbindung prüfen.')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Führt den eigentlichen Sync im Hintergrund durch
async function triggerSyncInternal({ manual = false } = {}) {
  if (!SyncManager.isInitialized || !SyncManager.currentUser || !SyncManager.masterPassword) return;
  // Offener Konflikt: Nutzer muss erst entscheiden, sonst würde das Modal ständig neu aufgehen.
  if (window.currentConflict) return;
  if (syncRunning) { syncQueued = true; return; }
  syncRunning = true;

  try {
    // Schnappschuss des lokalen Stands zum Zeitpunkt des Syncs
    const localDataString = JSON.stringify(db);
    const localModified = db.settings.lastModified;

    const result = await withTimeout(SyncManager.sync(localDataString, {
      localChanged: isLocalDBChanged(),
      localIsEmpty: isLocalDBEmpty(),
      lastSyncedCloudTimestamp: db.syncSettings ? db.syncSettings.lastSyncedCloudTimestamp : undefined,
      sameAsLocal: cloudData => cloudMatchesLocal(cloudData, localDataString),
    }), SYNC_TIMEOUT_MS);

    if (result.status === 'pulled') {
      if (db.settings.lastModified !== localModified) {
        // Während des Downloads wurde lokal etwas eingetragen – nicht überschreiben!
        // Der nächste Durchlauf erkennt das als Konflikt und fragt nach.
        syncQueued = true;
      } else {
        applyCloudData(result.data, result.cloudTimestamp);
        showToast('Daten erfolgreich aus der Cloud synchronisiert! ✓');
      }
    } else if (result.status === 'uploaded') {
      // Nur den hochgeladenen Stand als synchron markieren; Eingaben während des Uploads
      // bleiben „geändert“ und gehen mit dem nächsten Sync hoch.
      markSynced(result.cloudTimestamp, localModified);
      if (manual) showToast('Daten erfolgreich in die Cloud geladen! ✓');
      warnIfCloudNearlyFull();
      updateSyncUI();
    } else if (result.status === 'no_change') {
      // Beide Seiten inhaltsgleich – auch wenn die Kennungen abweichen (siehe cloudMatchesLocal)
      if (db.settings.lastModified === localModified) markSynced(result.cloudTimestamp, localModified);
      if (manual) showToast('Daten bereits auf dem neuesten Stand.');
      updateSyncUI();
    } else if (result.status === 'offline') {
      if (manual) showToast('Offline – Sync folgt, sobald wieder Internet da ist.', 'error');
    }
  } catch (error) {
    console.error("Fehler beim Sync:", error);
    if (error.name === 'WrongPasswordError') {
      rejectMasterPassword();
      alert('❌ Falsches Master-Passwort.\n\nEs passt nicht zu den Daten in der Cloud. Es wurde nichts hochgeladen. Bitte gib das Passwort erneut ein.');
    } else if (error.name === 'CloudChangedError') {
      // Ein anderes Gerät war schneller – einfach neu prüfen.
      syncQueued = true;
    } else if (error.name === 'CloudTooLargeError' || error.name === 'UnsupportedFormatError') {
      showSyncProblem(error, manual);
    } else {
      showToast('❌ Sync-Fehler: ' + error.message, 'error');
    }
  } finally {
    syncRunning = false;
    if (syncQueued) {
      syncQueued = false;
      triggerSyncInternal({ manual });
    }
  }
}

// Löst Konflikte
async function resolveConflict(decision) {
  const conflict = window.currentConflict;
  if (!conflict) return;

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
      showToast('Cloud-Version geladen und lokale Änderungen verworfen.');

    } else if (decision === 'push') {
      // Lokale Version erzwingen – aber nur über genau den Cloud-Stand, den der Nutzer gesehen hat.
      const localModified = db.settings.lastModified;
      const newTimestamp = await SyncManager.saveToCloud(JSON.stringify(db), conflict.cloudTimestamp);
      markSynced(newTimestamp, localModified);
      showToast('Cloud-Version erfolgreich mit lokalem Stand überschrieben.');
      warnIfCloudNearlyFull();
      updateSyncUI();

    } else if (decision === 'backup') {
      exportData(); // Ruft den Standard-Export auf
      applyCloudData(conflict.cloudData, conflict.cloudTimestamp);
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

// Hilfsfunktion zum Aktualisieren des Themes aus den Einstellungen in der DB
function updateAppliedThemeFromDB() {
  if (db.settings) {
    currentThemeAccent = db.settings.themeAccent || '#6366f1';
    currentThemeBg     = db.settings.themeBg || '#0f1117';
    currentThemeMode   = db.settings.theme || 'dark';
    currentThemeCard   = db.settings.themeCard || '#1e2130';
    applyThemePreview();
  }
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

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
  // Rose/Gelb waren kaum von Rot/Bernstein zu unterscheiden (BUGS S15). Alte Stunden behalten ihre Farbe.
  '#6366f1','#8b5cf6','#ec4899','#d946ef',
  '#ef4444','#f97316','#f59e0b','#a16207','#84cc16',
  '#22c55e','#14b8a6','#06b6d4','#3b82f6',
  '#64748b',
  // Helle Töne dazu (BUGS AA6): Eine Musiklehrkraft hat schnell 26 Klassen. Gewählt nach Abstand zu allen anderen
  // (≥ 49, S15) und Lesbarkeit als Schrift auf der Kachel (dunkel und hell); dunkle Töne wären im dunklen Modus unlesbar.
  '#f87171','#fb923c','#fdba74','#fde047','#d9f99d','#bef264','#a3e635',
  '#bbf7d0','#4ade80','#6ee7b7','#a5f3fc','#67e8f9','#38bdf8','#a5b4fc',
  '#818cf8','#c084fc','#f0abfc','#f472b6','#fda4af','#fecdd3','#a8a29e'
];
// Grundfarbe je Avatar; helle/dunkle Töne mit genug Kontrast mischt style.css (.student-avatar, BUGS L12)
const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#f97316'];

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
  lock:         '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye:          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  undo:         '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  edit:         '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  printer:      '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  'eye-off':    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  calendar:     '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
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
let lastRescueOffer = 0;   // wann persistDB zuletzt angeboten hat, die unlesbaren Daten herunterzuladen
// Mehrere Fenster/Tabs derselben App teilen sich den Speicher. Jedes Speichern setzt eine neue Kennung;
// stimmt sie vor dem Schreiben nicht mehr mit der gemerkten überein, hat ein anderes Fenster gespeichert,
// und dessen Stand würde sonst still mit dem veralteten dieses Fensters überschrieben (BUGS T1).
const DB_KEY = 'lehrerapp_v3';
const DB_REV_KEY = 'lehrerapp_v3_rev';
let dbRev = null;
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
// Formularstand beim Öffnen, für „Änderungen verwerfen?“ (BUGS S7); null = nicht gemerkt
let settingsSnapshot = null;
let gradeFormSnapshot = null;

// ─── DB ──────────────────────────────────────────────────────────────────
function loadDB() {
  let raw = null;
  dbRev = storedDBRev();
  try {
    raw = localStorage.getItem(DB_KEY);
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
  // Gleicher Inhalt liegt schon als Kopie da (voriger Start): keine weitere anlegen, sonst läuft der Speicher voll (BUGS P11)
  let key = rescueCopyKeys().find(k => { try { return localStorage.getItem(k) === raw; } catch (e) { return false; } });
  if (!key) {
    key = 'lehrerapp_v3_defekt_' + Date.now();
    for (let n = 2; localStorage.getItem(key) !== null; n++) key = 'lehrerapp_v3_defekt_' + Date.now() + '_' + n;
    try { localStorage.setItem(key, raw); } catch(e) { key = null; }
  }
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
  // Pausenaufsichten (BUGS AA4): fehlt bei Altdaten. Nur ergänzen, nie einen vorhandenen Wert ersetzen (Regel 48).
  if (data.supervisions === undefined) data.supervisions = [];
  // Noten: Bemerkung hieß früher teils `label`, heute immer `note`
  Object.values(data.students || {}).forEach(list => (list || []).forEach(st => (st.grades || []).forEach(gr => {
    if (!('label' in gr)) return;
    if (gr.note === undefined) gr.note = gr.label;
    delete gr.label;
  })));
  // Angelegte Notenspalten ohne Typ: Typ ihrer Noten übernehmen. Der Typ gehört seit BUGS K4 zur Spalte;
  // ohne ihn stünde neben der Spalte eine zweite mit denselben Noten.
  (data.groups || []).forEach(group => (group.gradeEvents || []).forEach(ev => {
    if (ev.type) return;
    const match = ((data.students || {})[group.id] || []).flatMap(st => st.grades || [])
      .find(gr => gr.date === ev.date && (gr.note ?? gradeTypeLabel(gr.type)) === ev.label);
    ev.type = (match && match.type) || 'test';
  }));
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
  // Hier stand früher eine Migration „alte Standard-Blöcke (5 ab 08:00) → heutige“. Sie traf auch selbst
  // eingestellte Zeiten und lief bei jedem Laden (BUGS P3); Geräte mit den uralten Blöcken hat schon die
  // App-Version vom Juni 2026 umgestellt. Blöcke werden deshalb nie mehr automatisch verändert.
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
  // Immer eine neue Kennung, auch bei zwei Eingaben in derselben Millisekunde: Der Sync prüft nur auf Gleichheit
  // und hielte die zweite sonst für schon hochgeladen. (Uhrzeit ist hier nur Kennung, nie Vergleich zwischen Geräten.)
  const prev = Number(db.settings.lastModified) || 0, now = Date.now();
  db.settings.lastModified = now > prev ? now : prev + 1;
  persistDB();

  // Automatischer Cloud-Hintergrundsync (Autosave)
  if (typeof SyncManager !== 'undefined' && SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword) {
    if (window.syncTimeout) clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
      window.syncTimeout = null;
      triggerSyncInternal();
    }, 3000); // 3 Sekunden Verzögerung nach der letzten Eingabe
  }
}
// Nur speichern, ohne die Daten als „geändert“ zu markieren (z. B. Sync-Metadaten).
function persistDB() {
  if (dbLoadFailure && !dbLoadFailure.key) {
    showToast('Nicht gespeichert: alte Daten zuerst herunterladen', 'error');
    // Auch in der laufenden Sitzung einen Weg zum Herunterladen anbieten, höchstens einmal pro Minute (BUGS P11)
    if (Date.now() - lastRescueOffer > 60000) {
      lastRescueOffer = Date.now();
      if (confirm('Deine Eingabe wurde nicht gespeichert: Auf diesem Gerät liegen noch unlesbare alte Daten, und der Speicher ist voll.\n\nDie alten Daten jetzt herunterladen? Danach wird wieder gespeichert.')) {
        downloadUnreadableDB();
        if (!dbLoadFailure) return persistDB();
      }
    }
    return false;
  }
  if (storedDBRev() !== dbRev) {
    askAboutForeignWrite();
    return false;
  }
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    markDBWritten();
  } catch (e) {
    reportSaveFailure(e);
    return false;
  }
  return true;
}
function storedDBRev() {
  try { return localStorage.getItem(DB_REV_KEY); } catch (e) { return null; }
}
// Neue Kennung nach jedem Schreiben (auch Löschen) des gespeicherten Stands
function markDBWritten() {
  const rev = uid();
  try { localStorage.setItem(DB_REV_KEY, rev); } catch (e) { return; }
  dbRev = rev;
}

// Ein anderes Fenster hat gespeichert, seit dieses Fenster seinen Stand geladen hat (BUGS T1). Welcher gilt,
// kann nur der Nutzer entscheiden: Zusammenführen geht nicht, und still überschreiben verliert Daten.
let foreignWriteAsking = false;
async function askAboutForeignWrite() {
  if (foreignWriteAsking) return;
  foreignWriteAsking = true;
  const answer = await askChoice('App in einem anderen Fenster offen',
    'Die App ist noch in einem anderen Fenster oder Tab geöffnet, und dort wurde inzwischen gespeichert. '
    + 'Deine letzte Eingabe hier ist deshalb noch NICHT gespeichert.\n\n'
    + '„Anderes Fenster laden“: Deine letzte Eingabe hier geht verloren.\n'
    + '„Dieses Fenster speichern“: Was im anderen Fenster eingetragen wurde, geht verloren.\n\n'
    + 'Am besten danach das andere Fenster schließen.',
    [{ label: 'Anderes Fenster laden', value: 'load', primary: true },
     { label: 'Dieses Fenster speichern', value: 'keep', danger: true }]);
  foreignWriteAsking = false;
  if (answer === 'load') {
    adoptStoredDB();
    showToast('Stand des anderen Fensters geladen');
  } else if (answer === 'keep') {
    dbRev = storedDBRev();
    if (persistDB()) showToast('Gespeichert ✓');
  }
  // Abbrechen: nichts gespeichert; das nächste Speichern fragt wieder
  if (answer) triggerSyncInternal();
}

// Gespeicherten Stand (vom anderen Fenster) als eigenen übernehmen
function adoptStoredDB() {
  replaceDB(loadDB());
}

// Ganze DB austauschen und alles, was an ihr hängt, neu zeichnen (Cloud-Übernahme, anderes Fenster, Löschen)
function replaceDB(newDB) {
  db = newDB;
  updateAppliedThemeFromDB();
  // Offene Einstellungen zeigen sonst den alten Stand, und „Speichern“ schriebe ihn samt alter Blöcke zurück (BUGS P2).
  // Nur, wenn dort nichts eingetippt ist – dann wartet der neue Stand ohnehin bis zum Schließen (BUGS T5).
  if (!document.getElementById('modal-settings').classList.contains('hidden') && !settingsDirty()) fillSettingsForm();
  renderTimetable();
  renderSubjectGroups();
  resetViewSelection();
  if (typeof updateSyncUI === 'function') updateSyncUI();
}

// Anderes Fenster hat gespeichert: gleich übernehmen, außer ein Eingabefenster ist offen – dessen Felder
// gehören zum alten Stand. Dann nach dem Schließen, bzw. beim Speichern fragt persistDB nach.
let storageChangedWhileModal = false;
function onStorageChanged(e) {
  if (e.key !== null && e.key !== DB_KEY && e.key !== DB_REV_KEY) return;
  if (storedDBRev() === dbRev) return;
  if (inputModalOpen()) { storageChangedWhileModal = true; return; }
  adoptStoredDB();
}
function storageAfterModalsClosed() {
  if (!storageChangedWhileModal || inputModalOpen()) return;
  storageChangedWhileModal = false;
  if (storedDBRev() !== dbRev) adoptStoredDB();
}
window.addEventListener('storage', onStorageChanged);
// Speichern ging schief (meist: Speicher des Browsers voll). Nie still weitermachen – nach einem
// Neustart wäre die Eingabe weg (BUGS K10). Das Fenster kommt einmal pro Sitzung, danach nur Toasts.
let saveFailureShown = false;
function reportSaveFailure(error) {
  console.error('Speichern fehlgeschlagen:', error);
  showToast('Nicht gespeichert – Speicher voll. Bitte Daten exportieren.', 'error');
  if (saveFailureShown) return;
  saveFailureShown = true;
  const copies = rescueCopyKeys().length;
  alert('❌ Deine letzte Eingabe konnte auf diesem Gerät nicht gespeichert werden – der Speicher des Browsers ist voll.\n\n'
    + 'Bitte sofort unter Einstellungen → „Exportieren“ eine Sicherung speichern. Solange die App offen bleibt, sind die Daten noch da'
    + (SyncManager.currentUser && SyncManager.masterPassword ? ' und werden weiter in die Cloud übertragen.' : '.')
    + (copies ? `\n\nPlatz belegen auch ${copies} alte Rettungskopie(n) unlesbarer Daten („lehrerapp_v3_defekt_…“).` : ''));
}
function rescueCopyKeys() {
  const keys = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lehrerapp_v3_defekt_')) keys.push(k);
    }
  } catch (e) { /* kein Zugriff: nichts zu melden */ }
  return keys;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// Name in Listen und Tabellen, passend zur Sortierung in den Einstellungen (BUGS I12). Unescaped.
// Überschriften (Profil, Schnellbewertung) zeigen immer „Vorname Nachname“.
function studentListName(s) {
  const first = s.firstName || '', last = s.lastName || '';
  if (!last || !first) return first || last;
  return (db.settings && db.settings.studentSortOrder) === 'lastName' ? `${last}, ${first}` : `${first} ${last}`;
}

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
// Immer nach Beginn sortiert (Kopie der Liste): Ein später angelegter früher Block („0. Stunde“) steht sonst
// am Ende, und „Nächste Stunde“ übersähe ihn (BUGS R5). Die Kennungen bleiben, wie sie sind (Regel 12).
function getBlocks() {
  const b = db.settings && db.settings.blocks;
  const list = b && b.length ? [...b] : DEFAULT_BLOCKS.map(x => ({ ...x })); // Kopie: die Konstante darf nie verändert werden
  const start = x => { const m = timeToMins(x.start); return m === null ? Infinity : m; };
  return list.sort((x, y) => start(x) - start(y));
}

// ─── Navigation ──────────────────────────────────────────────────────────
function switchView(name) {
  if (name !== 'seating' && typeof seatingEditMode !== 'undefined' && seatingEditMode) {
    toggleSeatingEditMode();
  }
  if (name !== 'timetable' && timetableEditMode) setTimetableEditUI(false); // AC2
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  // Die Klassenansicht gehört zu „Klassen“ (BUGS I11: sonst war kein Menüpunkt markiert)
  const navEl = document.getElementById('nav-' + (name === 'students' ? 'classes' : name));
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
  leaveLessonModal();
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
// Ferien und freie Tage (BUGS Y8): db.settings.holidays = [{ id, label, from, until }] (YYYY-MM-DD, einschließlich).
// Fehlt bei Altdaten; kaputte Einträge werden übergangen, nie „repariert“ (Regel 48).
function holidayAt(dateStr) {
  const list = typeof db !== 'undefined' && db && db.settings && Array.isArray(db.settings.holidays) ? db.settings.holidays : [];
  return list.find(h => h && typeof h.from === 'string' && typeof h.until === 'string' && h.from <= dateStr && dateStr <= h.until) || null;
}
// Ferientag mit einer einmaligen Stunde (Nachschreiben, Vertretung) zählt als Schultag: Sitzplan, Tagesansicht und
// Dashboard müssen ihn zeigen, sonst landeten Einträge Wochen später (Review vor dem Live-Gang, R2/R4).
function isSchoolDay(d) {
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  const dateStr = formatDate(d);
  return !holidayAt(dateStr) || db.lessonSlots.some(s => isOneOffSlot(s) && s.specificDate === dateStr);
}
// Höchstens ein gutes Jahr weiter suchen: Ein Tippfehler wie „bis 9999“ ließ die Schleife sonst Millionen Tage laufen (R8)
function nextSchoolDay(d) {
  let r = new Date(d);
  for (let i = 0; i < 400 && !isSchoolDay(r); i++) r = addDays(r, 1);
  return r;
}
// n Schultage weiter (n < 0: zurück), Wochenenden werden übersprungen
function addSchoolDays(d, n) {
  let r = new Date(d);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n), guard = 0; left > 0 && guard < 400; guard++) { r = addDays(r, step); if (isSchoolDay(r)) left--; }
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
// Kennzeichen auf Kachel, Dashboard und im Stunden-Fenster (BUGS AA3). `substitute` setzt nur „Vertretung (einmalig)“;
// alte App-Versionen kennen es nicht und sehen eine normale einmalige Stunde.
function lessonKindLabel(slot) {
  if (!slot || !isOneOffSlot(slot)) return '';
  if (slot.movedFrom) { // „nur diese Woche“ verschoben oder am selben Platz geändert (z. B. anderer Raum)
    const orig = db.lessonSlots.find(s => s.id === slot.movedFrom.slotId);
    const samePlace = orig && slot.movedFrom.date === slot.specificDate && orig.block === slot.block;
    return samePlace ? 'geändert' : 'verlegt';
  }
  return slot.substitute ? 'Vertretung' : 'einmalig';
}
// Zweiwöchig ohne Startdatum (Altdaten ohne KW) wurde schon immer jede Woche angezeigt
function isABSlot(slot) { return slot.recurring === 'biweekly' && !!slot.startDate; }
// Gültigkeitszeitraum (BUGS M7): Stundenplanwechsel „ab dieser Woche“ beendet die alte Stunde (validUntil)
// und legt eine neue an (validFrom), damit frühere Wochen samt Notizen bleiben, wie sie waren.
// Beides fehlt bei den meisten Stunden = unbegrenzt. Ältere App-Versionen kennen die Felder nicht.
function slotValidOn(slot, dateStr) {
  return (!slot.validFrom || dateStr >= slot.validFrom) && (!slot.validUntil || dateStr <= slot.validUntil);
}
function slotRangesOverlap(a, b) {
  if (a.validUntil && b.validFrom && a.validUntil < b.validFrom) return false;
  if (b.validUntil && a.validFrom && b.validUntil < a.validFrom) return false;
  return true;
}
function slotOccursOn(slot, dateStr) {
  if (slot.day !== (parseDate(dateStr).getDay() + 6) % 7) return false;
  if (!slotValidOn(slot, dateStr)) return false;
  if (isOneOffSlot(slot)) return slot.specificDate === dateStr;   // einmalige Stunden auch in den Ferien
  if (holidayAt(dateStr)) return false;                           // regelmäßige fallen in den Ferien aus (Y8)
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
  if (!slotRangesOverlap(a, b)) return false;
  if (isOneOffSlot(a)) return slotOccursOn(b, a.specificDate);
  if (isOneOffSlot(b)) return slotOccursOn(a, b.specificDate);
  if (isABSlot(a) && isABSlot(b)) return sameWeekParity(a.startDate, b.startDate);
  return true;
}
// ─── Pausenaufsicht (BUGS AA4) ────────────────────────────────────────────
// db.supervisions = [{ id, day, start, end, place, recurring: 'weekly'|'biweekly'|'none', startDate?, specificDate? }]
// Aufbau wie eine Stunde, damit dieselbe Regel gilt, ob sie stattfindet (slotOccursOn: A/B-Woche, einmalig, Ferien).
function supervisionList() { return Array.isArray(db.supervisions) ? db.supervisions.filter(x => x && typeof x === 'object') : []; }
function supervisionsOn(dateStr) {
  return supervisionList().filter(x => typeof x.day === 'number' && slotOccursOn(x, dateStr))
    .sort((a, b) => (timeToMins(a.start) ?? 0) - (timeToMins(b.start) ?? 0));
}
// Nach welchem Block liegt die Aufsicht? 0 = vor dem ersten, blocks.length = nach dem letzten
function supervisionGap(sup, blocks) {
  const start = timeToMins(sup.start) ?? 0;
  return blocks.filter(b => (timeToMins(b.start) ?? Infinity) < start).length;
}
function supervisionChip(sup) {
  const chip = document.createElement('div');
  chip.className = 'tt-supervision';
  chip.setAttribute('role', 'button');
  chip.tabIndex = 0;
  chip.setAttribute('aria-label', `Aufsicht ${sup.place || ''}, ${sup.start}–${sup.end}`.replace(' ,', ','));
  chip.innerHTML = `<span class="tt-sup-title">Aufsicht${sup.place ? ` · ${escHtml(sup.place)}` : ''}</span><span class="tt-sup-time">${escHtml(sup.start || '')}–${escHtml(sup.end || '')}</span>`;
  chip.addEventListener('click', () => openSupervisionForm(sup.id));
  return chip;
}
// Pausenzeilen für das Raster: { gap → true }, nur wo an einem der Tage eine Aufsicht liegt
function supervisionGapsFor(dates, blocks) {
  const gaps = new Set();
  dates.forEach(d => supervisionsOn(formatDate(d)).forEach(x => gaps.add(supervisionGap(x, blocks))));
  return gaps;
}
function buildBreakLabel(gap, blocks) {
  const el = document.createElement('div');
  el.className = 'tt-time-label tt-break-label';
  const from = gap > 0 ? blocks[gap - 1].end : '', to = gap < blocks.length ? blocks[gap].start : '';
  el.innerHTML = `<div class="tt-time-block-name">Pause</div>${from && to ? `<div class="tt-time-block-range">${escHtml(from)}<br>${escHtml(to)}</div>` : ''}`;
  el.style.gridColumn = '1';
  return el;
}
function buildBreakCell(d, gap, blocks) {
  const cell = document.createElement('div');
  cell.className = 'tt-break-cell';
  supervisionsOn(formatDate(d)).filter(x => supervisionGap(x, blocks) === gap).forEach(x => cell.appendChild(supervisionChip(x)));
  return cell;
}

// Stunden an einem Datum in einem Block. Eine einmalige Stunde (Vertretung) ersetzt an ihrem Tag
// die regelmäßige Stunde im selben Platz.
function lessonsAt(dateStr, blockNum) {
  const lessons = db.lessonSlots.filter(s => s.block === blockNum && slotOccursOn(s, dateStr));
  const oneOffs = lessons.filter(isOneOffSlot);
  if (!oneOffs.length) return lessons;
  return lessons.filter(s => isOneOffSlot(s) || !oneOffs.some(o => partsOverlap(o.part, s.part)));
}

function formatDateDE(d) { return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}); }
function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
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
// Stift-Modus (AC2): Stunden per Ziehen verschieben. Nur Ansichtszustand, nie gespeichert (Regel 19).
let timetableEditMode = false;
// Tag, an dem Woche/Tag gewählt wurden. Am nächsten Tag zeigt der Stundenplan wieder „heute“: Der Wochen-Versatz
// gilt relativ zu jetzt und sprang sonst über Nacht (Fr „nächste Woche“ → Sa übernächste; BUGS R6, Regel 24).
let timetableChosenOn = '';
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
  timetableChosenOn = formatDate(new Date());
  currentWeekOffset = Math.round((mondayOf(day) - getWeekDates(0)[0]) / 86400000 / 7);
}

function navigateWeek(dir) {
  if (isTimetableDayView()) setTimetableDay(addSchoolDays(timetableDayDate(), dir));
  else { currentWeekOffset += dir; timetableDay = null; timetableChosenOn = formatDate(new Date()); }
  renderTimetable();
}
function goToCurrentWeek()  { currentWeekOffset = 0; timetableDay = null; timetableChosenOn = ''; renderTimetable(); }
function jumpToDate(dateStr) {
  if (!dateStr) return;
  const targetDate = parseDate(dateStr);
  if (isNaN(targetDate.getTime())) return;
  // Wochenende → nächster Montag, wie überall (BUGS M11); die Woche läuft mit
  setTimetableDay(targetDate);
  renderTimetable();
}

// ─── Timetable Render ────────────────────────────────────────────────────
function renderTimetable() {
  if (timetableChosenOn && timetableChosenOn !== formatDate(new Date())) {
    currentWeekOffset = 0; timetableDay = null; timetableChosenOn = '';
  }
  const grid  = document.getElementById('timetable-grid');
  const dayView = isTimetableDayView();
  grid.classList.toggle('day-view', dayView);
  const prevBtn = document.querySelector('button[onclick="navigateWeek(-1)"]');
  const nextBtn = document.querySelector('button[onclick="navigateWeek(1)"]');
  if (prevBtn) prevBtn.title = dayView ? 'Vorheriger Tag' : 'Vorherige Woche';
  if (nextBtn) nextBtn.title = dayView ? 'Nächster Tag' : 'Nächste Woche';
  if (dayView) renderTimetableDay(grid);
  else renderTimetableWeek(grid);
  grid.classList.toggle('tt-edit', timetableEditMode);
  setupTimetableDrag(grid);
  // Datumsauswahl auf das Angezeigte stellen, sonst löst dasselbe Datum ein zweites Mal kein change aus (BUGS M14)
  const picker = document.getElementById('week-date-picker');
  if (picker) picker.value = formatDate(dayView ? timetableDayDate() : getWeekDates(currentWeekOffset)[0]);
}

function renderTimetableWeek(grid) {
  const dates = getWeekDates(currentWeekOffset);
  const blocks = getBlocks();

  const weekNo = getWeekNumber(dates[0]);
  // Woche über Neujahr: beide Jahre nennen (BUGS M12)
  const y0 = dates[0].getFullYear(), y4 = dates[4].getFullYear();
  document.getElementById('week-label').textContent = y0 === y4
    ? `KW ${weekNo}  ·  ${formatDateDE(dates[0])} – ${formatDateDE(dates[4])} ${y4}`
    : `KW ${weekNo}  ·  ${formatDateDE(dates[0])}${y0} – ${formatDateDE(dates[4])}${y4}`;

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
  // Pausenzeilen nur, wo Aufsichten liegen (AA4)
  const gaps = supervisionGapsFor(dates, blocks);
  const rowSizes = ['auto'];
  if (gaps.has(0)) rowSizes.push('auto');
  const allShort = allShortBlocks(blocks);
  blocks.forEach((b, i) => { rowSizes.push(blockRowSize(b, false, allShort)); if (gaps.has(i + 1)) rowSizes.push('auto'); });
  grid.style.gridTemplateRows = rowSizes.join(' ');
  grid.style.flex = allShort ? '0 0 auto' : '';
  // Nur Einzelstunden: Drumherum kompakt (Kopf, Pausenzeilen, Abstände), damit 8 Stunden + Pausen ohne Scrollen passen
  grid.classList.toggle('tt-compact', allShort);
  grid.parentElement.classList.toggle('tt-compact-wrap', allShort);
  grid.style.rowGap = grid.classList.contains('tt-compact') ? '6px' : '10px';
  grid.style.columnGap = '10px';
  grid.style.alignContent = 'start'; // kompakte Zeilen (Einzelstunden): übriger Platz unten, nicht in den Kacheln
  const clock = timetableClock();

  // Header row
  const corner = document.createElement('div');
  corner.className = 'tt-corner';
  corner.style.gridColumn = '1';
  corner.innerHTML = '<button class="tt-add-supervision" type="button" title="Pausenaufsicht eintragen">+ Aufsicht</button>';
  corner.querySelector('button').addEventListener('click', () => openSupervisionForm());
  grid.appendChild(corner);

  dates.forEach((d, i) => {
    const el = document.createElement('div');
    const hol = holidayAt(formatDate(d));
    el.className = 'tt-day-header' + (isToday(d) ? ' today' : '') + (hol ? ' holiday' : '');
    el.innerHTML = `<div>${DAY_SHORT[i]}</div><div style="font-size:10px;font-weight:400;margin-top:1px">${formatDateDE(d)}</div>`
      + (hol ? `<div class="tt-holiday-label" title="${escHtml(hol.label || 'Ferien')}">${escHtml(hol.label || 'Ferien')}</div>` : '');
    el.style.gridColumn = String(2 + i);
    grid.appendChild(el);
  });

  const breakRow = gap => {
    grid.appendChild(buildBreakLabel(gap, blocks));
    dates.forEach((d, dayIdx) => {
      const cell = buildBreakCell(d, gap, blocks);
      cell.style.gridColumn = String(2 + dayIdx);
      grid.appendChild(cell);
    });
  };
  if (gaps.has(0)) breakRow(0);
  // Block rows
  blocks.forEach((block, i) => {
    grid.appendChild(buildTimeLabel(block));
    dates.forEach((d, dayIdx) => {
      const cell = buildTimetableCell(d, dayIdx, block, clock);
      cell.style.gridColumn = String(2 + dayIdx);
      grid.appendChild(cell);
    });
    if (gaps.has(i + 1)) breakRow(i + 1);
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
  const gaps = supervisionGapsFor([d], blocks); // Pausenzeilen (AA4)
  const rowSizes = ['auto'];
  if (gaps.has(0)) rowSizes.push('auto');
  const allShort = allShortBlocks(blocks);
  blocks.forEach((b, i) => { rowSizes.push(blockRowSize(b, true, allShort)); if (gaps.has(i + 1)) rowSizes.push('auto'); });
  grid.style.gridTemplateRows = rowSizes.join(' ');
  grid.style.flex = allShort ? '0 0 auto' : '';
  // Nur Einzelstunden: Drumherum kompakt (Kopf, Pausenzeilen, Abstände), damit 8 Stunden + Pausen ohne Scrollen passen
  grid.classList.toggle('tt-compact', allShort);
  grid.parentElement.classList.toggle('tt-compact-wrap', allShort);
  grid.style.rowGap = grid.classList.contains('tt-compact') ? '6px' : '10px';
  grid.style.columnGap = '10px';

  const header = document.createElement('div');
  const hol = holidayAt(formatDate(d));
  header.className = 'tt-day-header' + (isToday(d) ? ' today' : '') + (hol ? ' holiday' : '');
  header.style.gridColumn = '1 / span 2';
  header.textContent = `${DAYS[dayIdx]}, ${formatDateDE(d)}`;
  if (hol) header.insertAdjacentHTML('beforeend', ` <span class="tt-holiday-label">${escHtml(hol.label || 'Ferien')}</span>`); // Y8
  grid.appendChild(header);

  const addSup = document.createElement('button');
  addSup.className = 'tt-add-supervision';
  addSup.type = 'button';
  addSup.textContent = '+ Aufsicht';
  addSup.title = 'Pausenaufsicht eintragen';
  addSup.addEventListener('click', () => openSupervisionForm());
  header.appendChild(addSup);

  const clock = timetableClock();
  const breakRow = gap => {
    grid.appendChild(buildBreakLabel(gap, blocks));
    const cell = buildBreakCell(d, gap, blocks);
    cell.style.gridColumn = '2';
    grid.appendChild(cell);
  };
  if (gaps.has(0)) breakRow(0);
  blocks.forEach((block, i) => {
    grid.appendChild(buildTimeLabel(block));
    const cell = buildTimetableCell(d, dayIdx, block, clock);
    cell.style.gridColumn = '2';
    grid.appendChild(cell);
    if (gaps.has(i + 1)) breakRow(i + 1);
  });
}

// ─── Stundenplan per Ziehen bearbeiten (AC2) ─────────────────────────────
function setTimetableEditUI(on) {
  if (!on || !timetableEditMode) { ttUndoStack = []; } // Verlauf gilt nur für diesen Stift-Modus
  timetableEditMode = on;
  const btn = document.getElementById('btn-tt-edit');
  if (btn) btn.setAttribute('aria-pressed', String(on));
  document.getElementById('tt-edit-bar').classList.toggle('hidden', !on);
  updateTimetableUndoButton();
}
function toggleTimetableEditMode(on = !timetableEditMode) {
  setTimetableEditUI(on);
  renderTimetable();
}
let ttSuppressClick = false;
// Stift-Modus: Antippen öffnet gleich „Stunde bearbeiten“
function openEditLessonFor(slotId, dateStr) {
  if (ttSuppressClick) return; // war ein Ziehen
  activeLessonId = slotId;
  activeLessonDate = dateStr;
  openEditLesson();
}
function lessonInputFrom(s, day, block, part) {
  return { subject: s.subject || '', day, block, room: s.room || '', groupId: s.groupId || null, part, color: s.color,
    recurringVal: isOneOffSlot(s) ? (s.substitute ? 'substitute' : 'none') : (s.recurring === 'biweekly' ? 'biweekly' : 'weekly') };
}
// Hat das Formular etwas an der Stunde geändert? (sonst keine Rückfrage)
function lessonInputChanged(slot, input) {
  const rec = slot.recurring === 'biweekly' ? 'biweekly' : 'weekly';
  return input.day !== slot.day || input.block !== slot.block || input.part !== (slot.part || 'full') || input.recurringVal !== rec
    || (input.room || '') !== (slot.room || '') || (input.groupId || null) !== (slot.groupId || null)
    || (!input.groupId && input.subject !== (slot.subject || '')) || input.color !== slot.color;
}

// EINE Rückfrage pro Änderung einer regelmäßigen Stunde (Rückmeldung zu AC2: vorher „Tauschen?“ + „ab wann?“ je Stunde):
// „Nur am …“ (einmalige Stunde, Ursprung „verlegt“) · „Für immer“ (ab jetzt; frühere Wochen bleiben) · ggf. „auch frühere“.
// Liefert 'once' | 'from' | 'all' | null.
async function askMoveScope(slot, dateStr, { other = null, allowOnce = true } = {}) {
  const weekStart = formatDate(mondayOf(parseDate(dateStr)));
  const earlier = s => s && !isOneOffSlot(s) && lessonEntryDates(s.id).some(d => d < splitDateFor(s, weekStart));
  const hasEarlier = earlier(slot) || earlier(other);
  const from = splitDateFor(slot, weekStart);
  const blockOf = s => (getBlocks().find(b => b.num === s.block) || {}).label || '';
  const text = (other
      ? `${DAYS[other.day]}, ${blockOf(other)}: Dort liegt schon ${lessonTitle(other).main}. ${lessonTitle(slot).main} und ${lessonTitle(other).main} tauschen die Plätze.\n\n`
      : '')
    + (hasEarlier ? 'Für diese Stunde gibt es Notizen oder Hausaufgaben aus früheren Stunden – die bleiben, wie sie waren.\n\n' : '')
    + 'Nur an diesem Tag oder dauerhaft?';
  const choices = [];
  if (allowOnce) choices.push({ label: `Nur am ${formatDateLong(dateStr)}`, value: 'once' });
  choices.push({ label: hasEarlier ? `Für immer – ${fromPhrase(from)}` : 'Für immer', value: 'from', primary: true });
  if (hasEarlier) choices.push({ label: 'Alle Stunden ändern, auch frühere', value: 'all' });
  return askChoice(other ? 'Stunden tauschen' : 'Stunde ändern', text, choices);
}

// „Nur diese Woche“: einmalige Stunde mit den neuen Angaben am Zieltag; der Ursprung fällt an diesem Tag aus
// („verlegt“, mit Verweis), seine Einträge wandern mit, fällige HA/Tests zeigen auf den neuen Termin.
// Liegt das Ziel am selben Platz (nur Raum o. Ä. geändert), ersetzt die einmalige Stunde die regelmäßige (lessonsAt).
function moveOccurrenceOnce(slot, fromDate, target, overrides = {}) {
  const once = { id: uid(), subject: slot.subject || '', groupId: slot.groupId || null, room: slot.room || '', color: slot.color,
    part: target.part || slot.part || 'full', ...overrides,
    day: target.day, block: target.block, recurring: false, startDate: null, startWeek: null, specificDate: target.dateStr,
    movedFrom: { slotId: slot.id, date: fromDate } };
  if (!target.part && overrides.part) once.part = overrides.part;
  db.lessonSlots.push(once);
  const fromKey = `${slot.id}_${fromDate}`;
  const moved = db.lessonData[fromKey];
  delete db.lessonData[fromKey];
  if (moved) { delete moved.ausfall; delete moved.movedTo; db.lessonData[`${once.id}_${target.dateStr}`] = moved; }
  const samePlace = target.dateStr === fromDate && target.block === slot.block && partsOverlap(once.part, slot.part);
  if (!samePlace) db.lessonData[fromKey] = { ausfall: true, movedTo: { slotId: once.id, date: target.dateStr } };
  retargetMovedItems(slot, fromDate, target.dateStr);
  return once;
}
// HA/Tests der Klasse, die am alten Termin fällig waren: neuer Termin, wenn dort sonst keine Stunde der Klasse liegt
function retargetMovedItems(slot, fromDate, toDate) {
  if (fromDate === toDate || toDate < formatDate(new Date())) return;
  const ids = new Set(relatedSlots(slot).map(s => s.id));
  if (lessonsOnDate(fromDate).some(l => ids.has(l.slot.id) && !l.ausfall)) return; // dort ist sie weiter fällig
  Object.entries(db.lessonData).forEach(([key, data]) => {
    if (!ids.has(key.slice(0, key.lastIndexOf('_')))) return;
    const given = key.slice(key.lastIndexOf('_') + 1);
    [...(data.hwItems || []), ...(data.testItems || [])].forEach(item => {
      if (item.targetDate === fromDate && toDate > given) item.targetDate = toDate;
    });
  });
}
// Verlegung zurücknehmen (Stunden-Fenster am alten Platz, oder die verlegte Stunde löschen): Einträge zurück
function revertMovedLesson(onceId) {
  const once = db.lessonSlots.find(s => s.id === onceId && s.movedFrom);
  if (!once) return false;
  const origin = `${once.movedFrom.slotId}_${once.movedFrom.date}`, mine = `${once.id}_${once.specificDate}`;
  const od = db.lessonData[origin];
  if (od && od.movedTo && od.movedTo.slotId === once.id) delete db.lessonData[origin];
  if (db.lessonData[mine]) { db.lessonData[origin] = db.lessonData[mine]; delete db.lessonData[mine]; }
  db.lessonSlots = db.lessonSlots.filter(s => s !== once);
  // Fällige HA/Tests wieder auf den alten Termin
  const originSlot = db.lessonSlots.find(s => s.id === once.movedFrom.slotId);
  if (originSlot) {
    const ids = new Set(relatedSlots(originSlot).map(s => s.id));
    Object.entries(db.lessonData).forEach(([key, data]) => {
      if (!ids.has(key.slice(0, key.lastIndexOf('_')))) return;
      [...(data.hwItems || []), ...(data.testItems || [])].forEach(item => {
        if (item.targetDate === once.specificDate && !lessonsOnDate(once.specificDate).some(l => ids.has(l.slot.id) && !l.ausfall)) item.targetDate = once.movedFrom.date;
      });
    });
  }
  return true;
}
// Formular: „nur am …“
function saveLessonOnce(slot, dateStr, input) {
  const target = { day: input.day, block: input.block, part: input.part, dateStr: lessonTargetDate(input.day) };
  const clash = lessonsAt(target.dateStr, target.block).filter(s => s !== slot && partsOverlap(input.part, s.part) && !(isOneOffSlot(s) === false && s === slot));
  if (clash.some(s => isOneOffSlot(s) || !(target.dateStr === dateStr && target.block === slot.block))) {
    if (clash.length) { showToast(`Dort liegt am ${formatDateLong(target.dateStr)} schon ${lessonTitle(clash[0]).main}`, 'error'); return false; }
  }
  let subject = input.subject;
  if (input.groupId) { const g = db.groups.find(x => x.id === input.groupId); if (g) subject = g.subject; }
  moveOccurrenceOnce(slot, dateStr, target, { subject, groupId: input.groupId, room: input.room, color: input.color, part: input.part });
  saveDB();
  editingSlotId = null;
  closeModal('modal-add-lesson');
  renderScheduleViews();
  showToast(`Nur am ${formatDateLong(dateStr)} geändert ✓`);
  return true;
}

// Rückgängig in der Bearbeiten-Leiste: Verlauf der Verschiebungen in diesem Stift-Modus. Ein Schritt gilt nur,
// solange die Stundendaten seitdem unverändert sind (sonst überschriebe er neuere Eingaben).
let ttUndoStack = [];
const scheduleState = () => JSON.stringify({ s: db.lessonSlots, d: db.lessonData });
function updateTimetableUndoButton() {
  const btn = document.getElementById('btn-tt-undo');
  if (btn) btn.disabled = !ttUndoStack.length;
}
function undoTimetableChange(entry = ttUndoStack[ttUndoStack.length - 1]) {
  if (!entry || ttUndoStack[ttUndoStack.length - 1] !== entry) { showToast('Nicht mehr möglich – danach wurde schon etwas anderes verschoben', 'error'); return; }
  if (db !== entry.db || scheduleState() !== entry.after) {
    ttUndoStack = [];
    updateTimetableUndoButton();
    showToast('Nicht mehr möglich – inzwischen wurde etwas geändert', 'error');
    return;
  }
  ttUndoStack.pop();
  const before = JSON.parse(entry.before);
  db.lessonSlots = before.s;
  db.lessonData = before.d;
  saveDB();
  renderScheduleViews();
  updateTimetableUndoButton();
  showToast('Rückgängig gemacht');
}

// Ablegen. Regelmäßige Stunde (oder Tausch mit einer): EINE Rückfrage (askMoveScope). „Nur diese Woche“ →
// einmalige Stunden (moveOccurrenceOnce); „für immer“ → dieselbe Speicherlogik wie das Formular (commitLessonSlot)
// ohne zweite Frage. Einmalige Stunden wandern direkt. Scheitert ein Teil, wird der Stand davor wiederhergestellt.
async function moveLessonByDrag(slotId, sourceDate, target) {
  const slot = db.lessonSlots.find(s => s.id === slotId);
  if (!slot || !target || !Number.isFinite(target.day) || !Number.isFinite(target.block)) return false;
  const part = target.part || slot.part || 'full';
  if (target.day === slot.day && target.block === slot.block && part === (slot.part || 'full') && target.dateStr === sourceDate) return false;
  const occupants = lessonsAt(target.dateStr, target.block).filter(s => s !== slot && partsOverlap(part, s.part));
  if (occupants.length > 1) { showToast('Dort liegen schon zwei Stunden – bitte zuerst eine davon verschieben', 'error'); return false; }
  const other = occupants[0] || null;
  const isRegular = s => s && !isOneOffSlot(s);
  let scope = 'once';
  if (isRegular(slot) || isRegular(other)) {
    scope = await askMoveScope(isRegular(slot) ? slot : other, isRegular(slot) ? sourceDate : target.dateStr, { other: isRegular(slot) ? other : slot });
  } else if (other) {
    scope = await askChoice('Stunden tauschen', `Dort liegt schon ${lessonTitle(other).main}. Plätze tauschen?`, [{ label: 'Tauschen', value: 'once', primary: true }]);
  }
  if (!scope || !db.lessonSlots.includes(slot) || (other && !db.lessonSlots.includes(other))) return false;
  const dbAtStart = db;
  const before = scheduleState();
  const back = { day: slot.day, block: slot.block, part: slot.part || 'full', dateStr: sourceDate };
  const restore = () => { const b = JSON.parse(before); db.lessonSlots = b.s; db.lessonData = b.d; saveDB(); renderScheduleViews(); };
  // Einmalige Stunde direkt umsetzen (Datum wandert mit dem Tag, Einträge mit dem Datum)
  const moveOneOff = (s, to) => {
    const oldKey = `${s.id}_${s.specificDate}`, newKey = `${s.id}_${to.dateStr}`;
    if (oldKey !== newKey && db.lessonData[oldKey]) { db.lessonData[newKey] = db.lessonData[oldKey]; delete db.lessonData[oldKey]; }
    Object.assign(s, { day: to.day, block: to.block, part: to.part || s.part || 'full', specificDate: to.dateStr });
    return true;
  };
  const prevSpecific = currentSpecificDate;
  let ok = true;
  try {
    const place = async (s, from, to, ignore) => {
      if (isOneOffSlot(s)) return moveOneOff(s, to);
      if (scope === 'once') { moveOccurrenceOnce(s, from, to); return true; }
      currentSpecificDate = from;
      return commitLessonSlot(lessonInputFrom(s, to.day, to.block, to.part || s.part || 'full'), s, { ignoreConflictWith: ignore, scope });
    };
    ok = await place(slot, sourceDate, { ...target, part }, other);
    if (ok && other) ok = await place(other, target.dateStr, { ...back, part: other.part || 'full' }, slot);
  } finally {
    currentSpecificDate = prevSpecific;
  }
  if (db !== dbAtStart) return false;
  if (!ok) {
    if (scheduleState() !== before) { restore(); showToast('Nicht verschoben – alles wie vorher', 'error'); }
    return false;
  }
  saveDB();
  renderScheduleViews();
  const entry = { db, before, after: scheduleState() };
  ttUndoStack.push(entry);
  if (ttUndoStack.length > 30) ttUndoStack.shift();
  updateTimetableUndoButton();
  const label = (other ? 'Stunden getauscht' : 'Stunde verschoben') + (scope === 'once' ? ' (nur diese Woche)' : '');
  showUndoToast(label, () => undoTimetableChange(entry));
  return true;
}

// Ziehen mit Maus/Finger (Pointer-Events). Erst ab 6 px Bewegung, damit Antippen weiter „bearbeiten“ öffnet.
let ttDrag = null;
function setupTimetableDrag(grid) {
  if (!timetableEditMode) return;
  grid.querySelectorAll('.tt-lesson[data-slot]').forEach(tile => tile.addEventListener('pointerdown', e => startTimetableDrag(e, tile)));
}
function startTimetableDrag(e, tile) {
  if (e.button !== undefined && e.button !== 0) return;
  ttDrag = { tile, slotId: tile.dataset.slot, date: tile.dataset.date, x0: e.clientX, y0: e.clientY, ghost: null, target: null, targetEl: null };
  document.addEventListener('pointermove', onTimetableDragMove, { passive: false });
  document.addEventListener('pointerup', onTimetableDragEnd);
  document.addEventListener('pointercancel', endTimetableDrag);
}
function timetableDropAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest('#timetable-grid .tt-cell');
  if (!cell) return null;
  const half = el.closest('[data-part]');
  const inCell = half && cell.contains(half);
  return { el: inCell ? half : cell,
    target: { day: Number(cell.dataset.day), block: Number(cell.dataset.block), dateStr: cell.dataset.date, part: inCell ? half.dataset.part : null } };
}
function onTimetableDragMove(e) {
  if (!ttDrag) return;
  if (!ttDrag.ghost) {
    if (Math.hypot(e.clientX - ttDrag.x0, e.clientY - ttDrag.y0) < 6) return;
    const r = ttDrag.tile.getBoundingClientRect();
    const ghost = ttDrag.tile.cloneNode(true);
    ghost.classList.add('tt-drag-ghost');
    ghost.removeAttribute('onclick');
    ghost.style.width = r.width + 'px';
    ghost.style.height = r.height + 'px';
    ttDrag.dx = ttDrag.x0 - r.left;
    ttDrag.dy = ttDrag.y0 - r.top;
    document.body.appendChild(ghost);
    ttDrag.ghost = ghost;
    ttDrag.tile.classList.add('tt-drag-source');
  }
  if (e.cancelable) e.preventDefault();
  ttDrag.ghost.style.left = (e.clientX - ttDrag.dx) + 'px';
  ttDrag.ghost.style.top = (e.clientY - ttDrag.dy) + 'px';
  const hit = timetableDropAt(e.clientX, e.clientY);
  const el = hit ? hit.el : null;
  if (ttDrag.targetEl !== el) {
    if (ttDrag.targetEl) ttDrag.targetEl.classList.remove('tt-drop-target');
    if (el) el.classList.add('tt-drop-target');
    ttDrag.targetEl = el;
  }
  ttDrag.target = hit ? hit.target : null;
}
function endTimetableDrag() {
  document.removeEventListener('pointermove', onTimetableDragMove);
  document.removeEventListener('pointerup', onTimetableDragEnd);
  document.removeEventListener('pointercancel', endTimetableDrag);
  const d = ttDrag;
  ttDrag = null;
  if (!d) return null;
  if (d.ghost) d.ghost.remove();
  if (d.targetEl) d.targetEl.classList.remove('tt-drop-target');
  d.tile.classList.remove('tt-drag-source');
  return d;
}
function onTimetableDragEnd() {
  const d = endTimetableDrag();
  if (!d || !d.ghost) return; // nur angetippt
  ttSuppressClick = true;
  setTimeout(() => { ttSuppressClick = false; }, 300);
  if (d.target) moveLessonByDrag(d.slotId, d.date, d.target);
  else renderTimetable();
}

// Zeilenhöhe nach Dauer (AA2): Eine 45-min-Stunde bekam sonst dieselbe Höhe wie ein 90-min-Block – zwei Einzelstunden
// waren doppelt so hoch wie früher ein Block, der Plan passte nicht mehr auf den Bildschirm. Platz (fr) ∝ Dauer.
function blockDuration(block) {
  const a = timeToMins(block.start), e = timeToMins(block.end);
  return a !== null && e !== null && e > a ? e - a : 90;
}
// allShort: nur Einzelstunden – dann alle Zeilen gleich hoch (1fr in einem Raster ohne feste Höhe = so hoch wie
// die größte Kachel) statt einzelner Ausreißer; das Raster füllt den Bildschirm nicht (allShortGrid).
function blockRowSize(block, dayView, allShort = false) {
  const dur = blockDuration(block);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
  // Feste Höhe aus Messungen (iPhone SE … 24″): 8 Einzelstunden + 2 Pausen passen überall ohne Scrollen, wenn eine
  // Zeile 48 px hat (Tag: 46 px, dort steht alles in einer Zeile). Braucht eine Kachel mehr, wachsen alle gleich mit.
  if (dur <= 50 && allShort) return dayView ? 'minmax(46px, 1fr)' : 'minmax(48px, 1fr)';
  if (dayView) return `minmax(${clamp(96 * dur / 90, 60, 96)}px, auto)`;
  // Einzelstunden wachsen nicht mit: sonst stand in jeder Kachel oben und unten leere Fläche (Rückmeldung zu AA2)
  return dur <= 50 ? 'minmax(52px, auto)' : `minmax(${clamp(88 * dur / 90, 52, 88)}px, ${dur}fr)`;
}
function allShortBlocks(blocks) { return blocks.length > 0 && blocks.every(b => blockDuration(b) <= 50); }

function buildTimeLabel(block) {
  const timeEl = document.createElement('div');
  // Einzelstunde: Name auf einer Zeile (voller Text im title), Zeiten enger – die Spalte bestimmte sonst die Zeilenhöhe
  const short = blockDuration(block) <= 50;
  timeEl.className = 'tt-time-label' + (short ? ' short' : '');
  if (short) {
    timeEl.title = `${block.label}, ${block.start}–${block.end}`;
    timeEl.setAttribute('aria-label', `${block.label}, ${block.start} bis ${block.end}`);
  }
  // „1. Stunde“ / „1. Std.“ / „1. Block“: bei Einzelstunden nur die Zahl – „Stunde“ weiß jeder, die Uhrzeiten zählen.
  // Eigene Namen („Mittag“) bleiben ausgeschrieben.
  const num = short && String(block.label || '').match(/^\s*(\d+)\s*\.?\s*(stunde|std\.?|block)?\s*$/i);
  const range = `<div class="tt-time-block-range">${escHtml(block.start)}<br>${escHtml(block.end)}</div>`;
  timeEl.innerHTML = num ? `<div class="tt-time-num">${escHtml(num[1])}</div>${range}`
    : `<div class="tt-time-block-name">${escHtml(block.label)}</div>${range}`;
  if (num) timeEl.classList.add('numbered');
  timeEl.style.gridColumn = '1';
  return timeEl;
}

// ─── Stundenplan drucken / PDF ───────────────────────────────────────────
// Wie die Stundenpläne aus der Schule: A4 quer, Std. + Zeiten links, Mo–Fr, Zelle = Klasse groß, Fach · Raum klein.
// Gedruckt wird der REGELMÄSSIGE Plan einer Woche und der folgenden (A/B), ohne einmalige Stunden/Vertretungen;
// Ferien zählen nicht (sonst wäre ein Plan, der in den Ferien gedruckt wird, leer). Über die Druckfunktion des
// Browsers („Als PDF sichern“) – offline, ohne Bibliothek, gestochen scharfer Text.
function slotInRegularPlan(slot, dateStr) {
  if (isOneOffSlot(slot)) return false;
  if (slot.day !== (parseDate(dateStr).getDay() + 6) % 7 || !slotValidOn(slot, dateStr)) return false;
  return isABSlot(slot) ? sameWeekParity(dateStr, slot.startDate) : true;
}
function openPrintTimetable() {
  document.getElementById('print-name').value = db.settings.teacherName || '';
  document.getElementById('print-from').value = formatDate(getWeekDates(currentWeekOffset)[0]);
  document.getElementById('print-color').checked = true;
  openModal('modal-print');
}
function printTimetable() {
  const from = document.getElementById('print-from').value;
  if (!/^\d{4}-\d\d-\d\d$/.test(from)) { showToast('Bitte ein Datum wählen', 'error'); return; }
  buildPrintTimetable({ from, name: document.getElementById('print-name').value.trim(), color: document.getElementById('print-color').checked });
  closeModal('modal-print');
  window.print(); // Druck-CSS zeigt nur #print-area – offene Fenster erscheinen nicht im Druck
}
function buildPrintTimetable({ from, name = '', color = true }) {
  const monday = mondayOf(parseDate(from));
  const weekA = [0, 1, 2, 3, 4].map(i => formatDate(addDays(monday, i)));
  const weekB = weekA.map(d => formatDate(addDays(parseDate(d), 7)));
  const blocks = getBlocks();
  const slots = db.lessonSlots;
  const sups = supervisionList().filter(x => typeof x.day === 'number');
  let usesAB = false;
  const tagged = (inA, inB) => { if (inA && inB) return ''; usesAB = true; return inA ? 'A' : 'B'; };
  const partName = { first: '1. Hälfte', second: '2. Hälfte' };
  const partOrder = { first: 0, full: 1, second: 2 };
  const entryHTML = (slot, tag) => {
    const t = lessonTitle(slot);
    const sub = [t.sub, partName[slot.part]].filter(Boolean).map(escHtml).join(' · ');
    return `<div class="pt-entry" style="--c:${escHtml(safeColor(slot.color))}">`
      + `<div class="pt-line"><b>${escHtml(t.main)}</b>${slot.room ? `<em class="pt-room">${escHtml(slot.room)}</em>` : ''}${tag ? `<i class="pt-tag">${tag}</i>` : ''}</div>`
      + (sub ? `<span>${sub}</span>` : '') + '</div>';
  };
  const cellHTML = dayIdx => block => {
    const list = slots.filter(sl => sl.block === block.num)
      .map(sl => ({ sl, inA: slotInRegularPlan(sl, weekA[dayIdx]), inB: slotInRegularPlan(sl, weekB[dayIdx]) }))
      .filter(x => x.inA || x.inB)
      .sort((x, y) => (partOrder[x.sl.part || 'full'] - partOrder[y.sl.part || 'full']) || (Number(y.inA) - Number(x.inA)));
    if (!list.length) return '';
    return `<div class="pt-cell${list.length > 1 ? ' pt-multi' : ''}">${list.map(x => entryHTML(x.sl, tagged(x.inA, x.inB))).join('')}</div>`;
  };
  // Pausenzeilen nur, wo eine regelmäßige Aufsicht liegt (wie im Stundenplan)
  const supCell = (dayIdx, gap) => sups.filter(x => supervisionGap(x, blocks) === gap)
    .map(x => ({ x, inA: slotInRegularPlan(x, weekA[dayIdx]), inB: slotInRegularPlan(x, weekB[dayIdx]) }))
    .filter(e => e.inA || e.inB)
    .map(e => { const tag = tagged(e.inA, e.inB); return `<div class="pt-sup">${tag ? `<i class="pt-tag">${tag}</i>` : ''}Aufsicht${e.x.place ? ' ' + escHtml(e.x.place) : ''} <span>${escHtml(e.x.start || '')}–${escHtml(e.x.end || '')}</span></div>`; }).join('');
  const pauseRow = gap => {
    const cells = [0, 1, 2, 3, 4].map(i => supCell(i, gap));
    if (!cells.some(Boolean)) return '';
    pauseRows++;
    return `<tr class="pt-pause"><th>Pause</th>${cells.map(c => `<td><div class="pt-pcell">${c}</div></td>`).join('')}</tr>`;
  };
  const timeCell = block => {
    const num = String(block.label || '').match(/^\s*(\d+)\s*\.?\s*(stunde|std\.?|block)?\s*$/i);
    return `<th class="pt-time">${num ? `<b>${escHtml(num[1])}</b>` : `<b style="font-size:9pt">${escHtml(block.label || '')}</b>`}${escHtml(block.start || '')}<br>${escHtml(block.end || '')}</th>`;
  };
  let pauseRows = 0;
  let body = pauseRow(0);
  blocks.forEach((block, i) => {
    body += `<tr class="pt-block">${timeCell(block)}${[0, 1, 2, 3, 4].map(d => `<td>${cellHTML(d)(block)}</td>`).join('')}</tr>`;
    body += pauseRow(i + 1);
  });
  // Zeilenhöhe so, dass der Plan die Seite füllt und nie auf eine zweite rutscht (A4 quer: 194 mm Druckhöhe;
  // passt damit auch hochkant, falls ein Browser das Querformat nicht übernimmt). Zellen haben eine feste Höhe
  // und schneiden zu langen Text ab, statt die Zeile wachsen zu lassen.
  const fixedMM = 17 + 8 + 7 + pauseRows * 5.4 + (blocks.length + pauseRows + 1) * 0.3; // Kopf, Tagezeile, Fuß, Pausen, Linien
  const rowFor = usable => Math.max(7, Math.min(40, Math.floor((usable - fixedMM) / Math.max(1, blocks.length) * 10) / 10));
  const fontFor = row => Math.max(7.5, Math.min(14, Math.round(row * 0.7 * 10) / 10));
  const row = rowFor(184);
  const vars = `--row:${row}mm;--fs:${fontFor(row)}pt`;
  const y = monday.getMonth() >= 7 ? monday.getFullYear() : monday.getFullYear() - 1; // Schuljahr ab August
  const school = db.settings.school || '';
  const legend = usesAB ? `A = Woche ab ${formatDateLong(weekA[0])}, B = Woche ab ${formatDateLong(weekB[0])} (dann immer abwechselnd)` : '';
  const area = document.getElementById('print-area');
  area.setAttribute('style', vars);
  area.innerHTML = `
    <div class="pt-head">
      <div><div class="pt-title">Stundenplan</div>${name ? `<div class="pt-name">${escHtml(name)}</div>` : ''}</div>
      <div class="pt-meta">${school ? `<strong>${escHtml(school)}</strong><br>` : ''}Schuljahr ${y}/${String(y + 1).slice(-2)} · gültig ab ${formatDateLong(weekA[0])}</div>
    </div>
    <table class="pt-table${color ? '' : ' pt-bw'}">
      <thead><tr><th>Std.</th>${DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="pt-foot"><span>${escHtml(legend)}</span><span>Stand ${formatDateDE(new Date())}${new Date().getFullYear()} · Unterrichtsplaner</span></div>`;
}

// Uhrzeit für die Hervorhebung im Stundenplan: laufende Stunde + nächste Stunde (BUGS H4)
function timetableClock(now = new Date()) {
  return { todayStr: formatDate(now), nowMins: now.getHours() * 60 + now.getMinutes(), next: findNextLesson(now) };
}
// Läuft gerade eine Stunde bzw. ändert sich die „nächste“: jede Minute neu zeichnen.
// Gilt für Stundenplan und Dashboard („läuft noch …“, über Nacht „Heute“, BUGS M1).
let timetableClockMinute = null;
function refreshTimetableClock() {
  if (document.hidden || ttDrag) return; // nicht unter dem Finger neu zeichnen (AC2)
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (!active('view-timetable') && !active('view-dashboard')) return;
  const now = new Date();
  const minute = formatDate(now) + ' ' + now.getHours() + ':' + now.getMinutes();
  if (minute === timetableClockMinute) return;
  timetableClockMinute = minute;
  renderScheduleViews();
}
// Nach Änderungen an Stunden/Stundendaten: Stundenplan und, falls offen, Dashboard neu zeichnen (BUGS M1)
function renderScheduleViews() {
  renderTimetable();
  if (document.getElementById('view-dashboard')?.classList.contains('active')) renderDashboard();
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
  // Wohin eine gezogene Stunde fällt (AC2)
  cell.dataset.day = dayIdx;
  cell.dataset.block = block.num;
  cell.dataset.date = dateStr;
  // Einzelstunde (≤ 50 min): kompakte Kachel, sonst wäre sie so hoch wie ein Doppelblock (AA2)
  if (blockDuration(block) <= 50) cell.classList.add('tt-short');

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

    const kind = data.movedTo ? 'verlegt' : lessonKindLabel(lesson); // fester Text, keine Daten
    const status = [];
    if (data.done && data.done.trim()) status.push('inhalt');
    if (hasHW)   status.push('hw');
    if (hasTest) status.push('test');
    if (data.notes && data.notes.trim()) status.push('notiz');

    // Klasse groß, Fach (+ Raum) klein; ohne Klasse ist das Fach der Titel.
    // Raum als eigener Teil: in ganzen Stunden eigene Zeile, in halben mit „·“ dahinter (BUGS I6)
    const t = lessonTitle(lesson);
    const sub = (t.sub ? `<span>${escHtml(t.sub)}</span>` : '') +
                (lesson.room ? `<span class="tt-lesson-room">${escHtml(lesson.room)}</span>` : '');

    const range = lessonTimeRange(block, lesson.part);
    const running = !isAusfall && dateStr === clock.todayStr && range &&
      range.start <= clock.nowMins && clock.nowMins < range.end;
    const isNext = !running && clock.next && clock.next.slot.id === lesson.id && clock.next.dateStr === dateStr;
    const badge = running ? `<span class="tt-lesson-badge" title="läuft noch ${range.end - clock.nowMins} min">noch ${range.end - clock.nowMins} min</span>`
                : isNext ? `<span class="tt-lesson-badge">als Nächstes</span>` : '';

    return `<div class="tt-lesson${isAusfall?' ausfall-lesson':''}${running?' running':''}${isNext?' next':''}"
           style="background:${hexToRgba(lesson.color,0.15)};--lesson-color:${escHtml(safeColor(lesson.color))}"
           data-slot="${escHtml(lesson.id)}" data-date="${escHtml(dateStr)}"
           onclick="${timetableEditMode ? 'openEditLessonFor' : 'openLessonDetail'}(${jsArg(lesson.id)},${jsArg(dateStr)})">
        <div class="tt-lesson-head">
          <div class="tt-lesson-class">${escHtml(t.main)}</div>
          ${sub ? `<div class="tt-lesson-subject">${sub}</div>` : ''}
          ${kind ? `<div class="tt-lesson-kind${lesson.substitute ? ' sub' : ''}">${kind}</div>` : ''}
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

  if (lessons.length === 0 && holidayAt(dateStr)) {
    cell.classList.add('tt-holiday');   // Ferien: kein „+“ (Y8)
  } else if (lessons.length === 0) {
    cell.innerHTML = renderEmptyHTML('full');
  } else if (lessons.length === 1 && (!lessons[0].part || lessons[0].part === 'full' || blockDuration(block) <= 50)) {
    // Einzelstunde: eine einzelne „Hälfte“ (z. B. aus der Zeit mit Doppelstunden) wie eine ganze zeigen (AA2)
    cell.innerHTML = renderLessonHTML(lessons[0]);
  } else {
    // Split block
    const first = lessons.find(l => l.part === 'first');
    const second = lessons.find(l => l.part === 'second');
    if (lessons.some(l => l !== first && l !== second)) {
      // Keine sauberen Hälften (z. B. zwei ganze Stunden aus einem alten Stand): alle zeigen, nie „+“ darüber (BUGS V1)
      cell.innerHTML = `<div class="tt-split-container">${lessons.map(l => `<div class="tt-split-half">${renderLessonHTML(l)}</div>`).join('')}</div>`;
      return cell;
    }
    cell.innerHTML = `<div class="tt-split-container">
      <div class="tt-split-half" data-part="first">${first ? renderLessonHTML(first) : renderEmptyHTML('first')}</div>
      <div class="tt-split-half" data-part="second">${second ? renderLessonHTML(second) : renderEmptyHTML('second')}</div>
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

// Fehlt die Farbe oder ist sie kaputt (Alt-/Fremddaten), Standardfarbe statt Absturz (BUGS M13)
const DEFAULT_LESSON_COLOR = '#6366f1';
function safeColor(hex) { return /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : DEFAULT_LESSON_COLOR; }
// Helle Farbe: Weiß darauf hätte zu wenig Kontrast (< 3:1), z. B. das Häkchen der gewählten Farbe (BUGS AA6)
function isLightColor(hex) {
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(safeColor(hex).slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3;
}
function hexToRgba(hex, alpha) {
  hex = safeColor(hex);
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Get all recurring slots linked to a group ────────────────────────
function getGroupSlots(groupId) {
  return db.lessonSlots.filter(s => s.groupId === groupId);
}

// ─── Incoming items (HW / Tests assigned FROM other sessions TO this date) ──
// Welche Stunden gehören zur selben Klasse? Mit Klasse: alle Stunden der Klasse; ohne Klasse (freie
// Eingabe): alle freien Stunden mit demselben Fachnamen. Dieselbe Regel für Datumsvorschläge und
// Fälligkeit, sonst landet eine HA in einer Stunde, die sie nie anzeigt (BUGS M3).
function relatedSlots(slot) {
  if (!slot) return [];
  if (slot.groupId) return getGroupSlots(slot.groupId);
  const name = (slot.subject || '').trim().toLowerCase();
  return db.lessonSlots.filter(s => !s.groupId && (s.subject || '').trim().toLowerCase() === name);
}

function getIncomingItems(slotId, targetDateStr) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  const result = { hw: [], tests: [] };
  const siblingIds = new Set(currentSlot ? relatedSlots(currentSlot).map(s => s.id) : [slotId]);
  // Hat die Klasse an dem Tag mehrere Stunden, ist die HA nur in der ersten fällig, die stattfindet – sonst
  // zählte das Dashboard sie doppelt (BUGS R11). Fällt die erste aus, rückt die nächste nach.
  const first = lessonsOnDate(targetDateStr).find(l => siblingIds.has(l.slot.id) && !l.ausfall);
  if (first && first.slot.id !== slotId) return result;

  Object.entries(db.lessonData).forEach(([key, data]) => {
    const sep = key.lastIndexOf('_');
    const keySlotId = key.slice(0, sep), fromDate = key.slice(sep + 1);
    if (!siblingIds.has(keySlotId)) return;
    if (fromDate === targetDateStr) return; // skip self
    // Ausgeschalteter HA-/Test-Schalter: dort unsichtbar, also auch hier nicht fällig (BUGS M5)
    if (data.hwEnabled) (data.hwItems || []).forEach(item => {
      if (item.targetDate === targetDateStr) result.hw.push({ ...item, from: fromDate, slotKey: key });
    });
    if (data.testEnabled) (data.testItems || []).forEach(item => {
      if (item.targetDate === targetDateStr) result.tests.push({ ...item, from: fromDate, slotKey: key });
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
// Datum am gewählten Wochentag in der Woche der angeklickten Stunde (bzw. der angezeigten Woche)
function lessonTargetDate(day) {
  const refDate = currentSpecificDate ? parseDate(currentSpecificDate) : getWeekDates(currentWeekOffset)[0];
  return formatDate(addDays(mondayOf(refDate), day));
}
// Unter „Wiederholung“: an welchem Tag eine einmalige Stunde liegt bzw. wann die A-Woche beginnt (BUGS R13)
// „Gilt: nur am … / für immer“ – nur beim Bearbeiten einer regelmäßigen Stunde und solange der Rhythmus bleibt
function updateLessonScopeChoice() {
  const group = document.getElementById('lesson-scope-group');
  if (!group) return;
  const slot = editingSlotId && db.lessonSlots.find(s => s.id === editingSlotId);
  const rec = document.getElementById('new-lesson-recurring').value;
  const show = !!(slot && !isOneOffSlot(slot) && currentSpecificDate && rec === (slot.recurring === 'biweekly' ? 'biweekly' : 'weekly'));
  group.classList.toggle('hidden', !show);
  if (show) document.getElementById('lesson-scope-once-label').textContent = `Nur am ${formatDateLong(currentSpecificDate)}`;
  if (!show) document.querySelector('input[name="lesson-scope"][value="forever"]').checked = true;
}
function updateLessonDateHint() {
  const el = document.getElementById('lesson-date-hint');
  if (!el) return;
  const rec = document.getElementById('new-lesson-recurring').value;
  const date = lessonTargetDate(parseInt(document.getElementById('new-lesson-day').value, 10) || 0);
  // Beim Bearbeiten läuft die Stunde schon: „erstmals am …“ wäre falsch (BUGS V9)
  el.textContent = rec === 'none' || rec === 'substitute' ? `Findet statt am ${formatDateLong(date)}.`
    : rec === 'biweekly' ? (editingSlotId ? `Alle zwei Wochen, u. a. am ${formatDateLong(date)} (A-Woche).`
                                          : `Alle zwei Wochen, erstmals am ${formatDateLong(date)} (A-Woche).`) : '';
  el.classList.toggle('hidden', !el.textContent);
  refreshLessonPartOptions();
  updateLessonScopeChoice();
}
// „Stunde hinzufügen“: Hälften, die am gewählten Tag im gewählten Block schon belegt sind, sperren – neu bei
// jedem Wechsel von Tag oder Block, nicht nur für die angetippte Kachel (BUGS V8). Beim Bearbeiten: openEditLesson.
function refreshLessonPartOptions() {
  if (editingSlotId) return;
  const day = parseInt(document.getElementById('new-lesson-day').value, 10) || 0;
  const block = parseInt(document.getElementById('new-lesson-block').value, 10);
  // Eine einmalige Stunde (Vertretung) ersetzt an ihrem Tag die regelmäßige (lessonsAt): deren Hälften sind frei,
  // nur andere einmalige Stunden belegen den Platz (BUGS Y13)
  const oneOff = ['none', 'substitute'].includes(document.getElementById('new-lesson-recurring').value);
  const halves = lessonsAt(lessonTargetDate(day), block).filter(s => !oneOff || isOneOffSlot(s))
    .map(s => s.part || 'full').filter(p => p !== 'full');
  const radios = [...document.getElementsByName('new-lesson-part')];
  radios.forEach(r => {
    const off = halves.length > 0 && (r.value === 'full' || halves.includes(r.value));
    r.disabled = off;
    r.parentElement.style.opacity = off ? '0.4' : '1';
    r.parentElement.title = off ? 'Diese Hälfte ist bereits belegt' : '';
  });
  const checked = radios.find(r => r.checked);
  // Ausgeblendet (Einzelstunden): nicht unsichtbar auf eine Hälfte umschalten – dann meldet Speichern „belegt“ (R5)
  const hidden = document.getElementById('lesson-part-group').classList.contains('hidden');
  if (!hidden && (!checked || checked.disabled)) {
    const free = radios.find(r => !r.disabled);
    if (free) free.checked = true;
  }
}

// Nur Einzelstunden (alle Blöcke ≤ 50 min): „1./2. Hälfte“ ergibt keinen Sinn und wird ausgeblendet, außer eine
// Hälfte ist schon gewählt (vorhandene halbe Stunde, angetippte Hälfte) (BUGS AA2)
function blocksAreSingleLessons() {
  return getBlocks().every(b => { const a = timeToMins(b.start), e = timeToMins(b.end); return a !== null && e !== null && e - a <= 50; });
}
function updateLessonPartVisibility(part) {
  document.getElementById('lesson-part-group').classList.toggle('hidden', blocksAreSingleLessons() && (part || 'full') === 'full');
}

// ─── Add / Edit lesson slot ───────────────────────────────────────────────
function openAddLessonSlot(preDay = null, preBlock = null, specificDateStr = null, part = 'full') {
  // Gesperrte Hälften setzt updateLessonDateHint → refreshLessonPartOptions (unten)
  for (const r of document.getElementsByName('new-lesson-part')) r.checked = r.value === part;
  updateLessonPartVisibility(part);
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
  updateLessonDateHint();
  openModal('modal-add-lesson');
  setTimeout(() => document.getElementById('new-lesson-subject').focus(), 80);
}

// Stunden-Fenster → „Vertretung“: einmalige Stunde im selben Platz am selben Tag, ersetzt dort diese (BUGS AA3)
function openSubstituteForLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !activeLessonDate) return;
  const dateStr = activeLessonDate;
  leaveLessonModal();
  openAddLessonSlot(slot.day, slot.block, dateStr, slot.part || 'full');
  document.getElementById('add-lesson-title').textContent = 'Vertretung eintragen';
  document.getElementById('new-lesson-recurring').value = 'substitute';
  updateLessonDateHint();
}

function openEditLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot) return;
  // Datum der angeklickten Stunde: bestimmt Woche für „einmalig“ und A/B-Woche beim Umstellen
  currentSpecificDate = activeLessonDate || slot.specificDate || null;
  leaveLessonModal();
  editingSlotId = slot.id;
  document.querySelector('input[name="lesson-scope"][value="forever"]').checked = true;
  document.getElementById('add-lesson-title').textContent = 'Stunde bearbeiten';
  document.getElementById('btn-delete-lesson').classList.remove('hidden');
  document.getElementById('new-lesson-subject').value = slot.subject;
  document.getElementById('new-lesson-day').value = slot.day;
  fillGroupSelector(slot.groupId || '');
  fillBlockSelector();
  document.getElementById('new-lesson-block').value = slot.block;
  document.getElementById('new-lesson-room').value = slot.room || '';
  if (slot.recurring === 'biweekly') document.getElementById('new-lesson-recurring').value = 'biweekly';
  else if (slot.recurring === false || slot.recurring === 'none') document.getElementById('new-lesson-recurring').value = slot.substitute ? 'substitute' : 'none';
  else document.getElementById('new-lesson-recurring').value = 'weekly';
  selectedLessonColor = slot.color || APP_COLORS[0];
  renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });

  updateLessonPartVisibility(slot.part); // BUGS AA2
  const radios = document.getElementsByName('new-lesson-part');
  // Eine Vertretung ersetzt die regelmäßige Stunde nur an ihrem Tag (lessonsAt) und sperrt deren Hälften nicht (BUGS R9)
  // Eine vor der Woche der geöffneten Stunde beendete Hälfte gibt den Platz frei, wie in saveLessonSlot (BUGS V5)
  const openedWeek = formatDate(mondayOf(parseDate(currentSpecificDate || formatDate(new Date()))));
  const partner = db.lessonSlots.find(s => s.id !== slot.id && slotsShareDate(s, slot) && s.part && s.part !== 'full'
    && !(isOneOffSlot(s) && !isOneOffSlot(slot)) && !(s.validUntil && s.validUntil < openedWeek));
  
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

  updateLessonDateHint();
  openModal('modal-add-lesson');
}

async function saveLessonSlot() {
  let part = 'full';
  for (const r of document.getElementsByName('new-lesson-part')) if (r.checked) part = r.value;
  const slot = editingSlotId ? db.lessonSlots.find(s => s.id === editingSlotId) : null;
  const input = {
    subject: document.getElementById('new-lesson-subject').value.trim(),
    day: parseInt(document.getElementById('new-lesson-day').value),
    block: parseInt(document.getElementById('new-lesson-block').value),
    room: document.getElementById('new-lesson-room').value.trim(),
    recurringVal: document.getElementById('new-lesson-recurring').value,
    groupId: document.getElementById('new-lesson-group').value || null,
    part, color: selectedLessonColor,
  };
  // Auswahl im Formular „Gilt: nur am … / für immer“ (Rückmeldung zu AC2) – keine zusätzliche Rückfrage.
  // „Für immer“ (Standard) verhält sich wie bisher.
  const once = document.querySelector('input[name="lesson-scope"][value="once"]');
  if (slot && !isOneOffSlot(slot) && currentSpecificDate && once && once.checked
      && !document.getElementById('lesson-scope-group').classList.contains('hidden') && lessonInputChanged(slot, input)) {
    return saveLessonOnce(slot, currentSpecificDate, input);
  }
  return commitLessonSlot({
    subject: document.getElementById('new-lesson-subject').value.trim(),
    day: parseInt(document.getElementById('new-lesson-day').value),
    block: parseInt(document.getElementById('new-lesson-block').value),
    room: document.getElementById('new-lesson-room').value.trim(),
    recurringVal: document.getElementById('new-lesson-recurring').value,
    groupId: document.getElementById('new-lesson-group').value || null,
    part, color: selectedLessonColor,
  }, slot);
}

// Kern von „Stunde speichern“ – auch für das Verschieben per Ziehen (AC2), damit dieselben Regeln gelten:
// Überschneidung, „ab wann ändern?“, Notizen/HA wandern mit, weggefallene Termine. `slot` = bearbeitete Stunde
// (null = neu). Datum/Woche aus currentSpecificDate bzw. der angezeigten Woche (lessonTargetDate).
// ignoreConflictWith: diese Stunde gilt nicht als Überschneidung (Tauschen). Liefert true, wenn gespeichert.
async function commitLessonSlot(input, slot, { ignoreConflictWith = null, scope = null } = {}) {
  let { subject } = input;
  const { day, block, room, recurringVal, groupId, part } = input;

  if (groupId) {
    const g = db.groups.find(x => x.id === groupId);
    if (g) subject = g.subject;
  }
  if (!subject) { showToast('Bitte Fach/Klasse eingeben', 'error'); return false; }

  // Datum am gewählten Wochentag in der Woche der angeklickten Stunde (bzw. der angezeigten Woche)
  const targetDateStr = lessonTargetDate(day);
  const weekStart = formatDate(mondayOf(parseDate(targetDateStr)));

  let recurring = false, startDate = null, startWeek = null, specificDate = null;
  if (recurringVal === 'weekly') {
    recurring = 'weekly';
  } else if (recurringVal === 'biweekly') {
    recurring = 'biweekly';
    startDate = targetDateStr;                          // A-Woche = Woche dieses Datums
    startWeek = getWeekNumber(parseDate(targetDateStr)); // nur für Geräte mit alter App-Version
  } else {
    recurring = false;                 // 'none' und 'substitute' (Vertretung) sind einmalig
    specificDate = targetDateStr;
  }
  const fields = { subject, day, block, room, recurring, startDate, startWeek, specificDate, color: input.color, groupId, part };
  if (recurringVal === 'substitute') fields.substitute = true; // BUGS AA3

  // Stundenplanwechsel mit Einträgen aus früheren Stunden: nur ab jetzt ändern oder alle? (BUGS M7)
  // „Ab jetzt“ heißt ab der Woche der geöffneten Stunde, aber nie vor heute und nie über eine Stunde mit
  // Einträgen hinweg, die schon stattgefunden hat (BUGS R1).
  let splitFrom = null;
  const from = slot ? splitDateFor(slot, weekStart) : weekStart;
  const changesSchedule = slot && !isOneOffSlot(slot) && scheduleChanged(slot, fields);
  if (changesSchedule && lessonEntryDates(slot.id).some(d => d < from)) {
    // Schon vorher gefragt (askMoveScope: „für immer“ = ab jetzt, „alle“) – dann nicht ein zweites Mal
    const choice = scope || await askChoice('Stunde ändern',
      `Für diese Stunde gibt es Notizen oder Hausaufgaben aus früheren Stunden.\n\nSoll die Änderung erst ${fromPhrase(from)} gelten? Frühere Stunden bleiben dann, wie sie waren.`,
      [{ label: `${capitalize(fromPhrase(from))} ändern`, value: 'from', primary: true },
       { label: 'Alle Stunden ändern, auch frühere', value: 'all' }]);
    if (!choice) return false;
    if (!db.lessonSlots.includes(slot)) { showToast('Diese Stunde gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
    if (choice === 'from') splitFrom = from;
  }
  // Einträge, die nach der Änderung auf keinen Termin der Stunde mehr fallen (z. B. B-Woche), wären unsichtbar (BUGS R10)
  if (changesSchedule) {
    const lost = orphanedEntryDates(slot, fields, splitFrom);
    if (lost.length && !confirm(`Nach der Änderung findet die Stunde an ${lost.length === 1 ? 'diesem Tag' : 'diesen Tagen'} nicht mehr statt: ${lost.map(d => formatDateDE(parseDate(d))).join(', ')}.\n\nNotizen und Hausaufgaben dort wären dann nicht mehr zu sehen. Trotzdem ändern?`)) return false;
  }

  // --- Überschneidung: nur Stunden, die wirklich am selben Tag im selben Platz liegen ---
  // Beim Bearbeiten ohne Teilen behält die Stunde ihren Zeitraum; sonst kollidierte eine nach einem Wechsel
  // beendete Stunde mit ihrer Nachfolgerin (BUGS R3)
  const candidate = { day, block, recurring, startDate, specificDate, part,
    validFrom: splitFrom || (slot && slot.validFrom) || undefined,
    validUntil: (!splitFrom && slot && slot.validUntil) || undefined };
  const endedBefore = s => s.validUntil && s.validUntil < weekStart;
  const conflicting = db.lessonSlots.find(s => {
    if (slot && s.id === slot.id) return false;
    if (ignoreConflictWith && s === ignoreConflictWith) return false; // Tauschen (AC2)
    if (!slotsShareDate(candidate, s) || !partsOverlap(part, s.part)) return false;
    // Eine Vertretung sperrt den Platz nicht für regelmäßige Stunden: an ihrem Tag ersetzt sie sie (lessonsAt, BUGS R8)
    if (isOneOffSlot(s) && !isOneOffSlot(candidate)) return false;
    // Eine Vertretung darf eine regelmäßige Stunde an ihrem Tag ersetzen (lessonsAt, BUGS M6)
    if (isOneOffSlot(candidate) && !isOneOffSlot(s)) return false;
    // Eine vor dieser Woche beendete Stunde gibt ihren Platz frei; die neue gilt dann ab dieser Woche
    if (!isOneOffSlot(candidate) && endedBefore(s)) return false;
    return true;
  });
  if (conflicting) {
    showToast(part === 'full' ? 'Block ist bereits belegt! Ganzer Block nicht möglich.' : 'Dieser Platz ist im Block bereits belegt!', 'error');
    return false;
  }
  const replaced = isOneOffSlot(candidate) && db.lessonSlots.find(s => s !== slot && !isOneOffSlot(s)
    && s.block === block && slotOccursOn(s, specificDate) && partsOverlap(part, s.part));
  // Vertretung über schon vorbereiteten Notizen: die wären bis zum Löschen der Vertretung unsichtbar (BUGS V6)
  if (replaced && lessonEntryDates(replaced.id).includes(specificDate)
      && !confirm(`Für ${lessonTitle(replaced).main} am ${formatDateLong(specificDate)} gibt es schon Notizen oder Hausaufgaben. `
        + 'Solange die Vertretung dort liegt, sind sie nicht zu sehen (sie bleiben aber gespeichert).\n\nVertretung trotzdem anlegen?')) return false;
  // Mit dem eigenen Beginn der Stunde: Eine Nachfolgerin, die erst nach der beendeten beginnt, überschneidet
  // sich nie mit ihr und darf weiter bearbeitet werden (Nachtrag BUGS V1)
  const endedHere = !isOneOffSlot(candidate) && !splitFrom && db.lessonSlots.find(s => s !== slot && endedBefore(s)
      && slotsShareDate(candidate, s) && partsOverlap(part, s.part));
  if (endedHere) {
    // Eine bestehende Stunde mit früheren Einträgen läge in früheren Wochen auf dem Platz der beendeten: dort
    // zeigte der Stundenplan beide nicht mehr (BUGS V1). Dann nur „ab …“ ändern.
    if (slot && lessonEntryDates(slot.id).some(d => d < weekStart)) {
      showToast(`In früheren Wochen liegt hier ${lessonTitle(endedHere).main}. Bitte „${capitalize(fromPhrase(from))} ändern“ wählen.`, 'error');
      return false;
    }
    candidate.validFrom = weekStart; // sonst überschnitte sie sich rückwirkend mit der beendeten
  }
  // HA/Tests, die auf Termine dieser Stunde zeigen – fallen welche weg, wird danach gefragt (BUGS V3)
  const dueBefore = changesSchedule ? dueItemsOnSlot(slot) : [];

  if (slot && splitFrom) {
    retargetDueItems(slot, fields, splitFrom);
    splitSlotFrom(slot, splitFrom, fields);
    showToast(`Stunde ${fromPhrase(splitFrom)} geändert ✓`);
  } else if (slot) {
    if (day !== slot.day) {
      retargetDueItems(slot, fields, null);
      moveLessonData(slot.id, day - slot.day);
    }
    Object.assign(slot, fields);
    if (!fields.substitute) delete slot.substitute; // auf „Nur einmalig“/regelmäßig umgestellt
    if (candidate.validFrom && !slot.validFrom) slot.validFrom = candidate.validFrom; // BUGS V1
    showToast('Stunde gespeichert ✓');
  } else {
    const newSlot = { id: uid(), ...fields };
    if (candidate.validFrom) newSlot.validFrom = candidate.validFrom;
    db.lessonSlots.push(newSlot);
    const added = fields.substitute ? 'Vertretung eingetragen ✓' : 'Stunde hinzugefügt ✓';
    showToast(replaced ? `${added} – ersetzt ${lessonTitle(replaced).main} an diesem Tag` : added);
  }
  saveDB();
  if (replaced) await offerMoveDueItems(replaced.id, specificDate, `${lessonTitle(replaced).main} fällt aus`); // BUGS R4
  closeModal('modal-add-lesson');
  renderScheduleViews();
  editingSlotId = null;
  if (dueBefore.length) await offerRetargetHanging(dueBefore, slot);
  return true;
}

// HA/Tests der Klasse, die ab heute auf einen Termin dieser Stunde zeigen (vor einer Änderung merken, BUGS V3)
function dueItemsOnSlot(slot) {
  const today = formatDate(new Date());
  const ids = new Set(relatedSlots(slot).map(s => s.id));
  const result = [];
  Object.entries(db.lessonData).forEach(([key, data]) => {
    if (!ids.has(key.slice(0, key.lastIndexOf('_')))) return;
    [['hwItems', data.hwEnabled], ['testItems', data.testEnabled]].forEach(([list, enabled]) => {
      if (!enabled) return;
      (data[list] || []).forEach(item => {
        if (item.targetDate && item.targetDate >= today && slotOccursOn(slot, item.targetDate)) result.push({ item, key, list });
      });
    });
  });
  return result;
}
// Nach Löschen/Beenden/Umstellen einer Stunde: Einträge, an deren Termin keine Stunde der Klasse mehr liegt,
// wären nirgends fällig. Anbieten, sie auf die jeweils nächste Stunde zu verschieben (BUGS V3).
async function offerRetargetHanging(candidates, slot) {
  const ids = new Set(relatedSlots(slot).map(s => s.id));
  const hanging = candidates.filter(c => {
    const list = (db.lessonData[c.key] || {})[c.list] || [];
    return list.includes(c.item) && !lessonsOnDate(c.item.targetDate).some(l => ids.has(l.slot.id) && !l.ausfall);
  });
  if (!hanging.length) return;
  const anyId = [...ids][0];
  const moves = hanging.map(c => ({ c, next: anyId ? findUpcomingLessonDates(anyId, formatDate(addDays(parseDate(c.item.targetDate), -1)), 1)[0] : null }));
  const lines = moves.map(({ c, next }) => `• ${c.item.text} (fällig ${formatDateLong(c.item.targetDate)}) → `
    + (next ? formatDateLong(next.dateStr) : 'keine weitere Stunde'));
  const choice = await askChoice('Hausaufgaben und Tests',
    `An diesen Terminen findet jetzt keine Stunde der Klasse mehr statt:\n${lines.join('\n')}\n\nAuf die jeweils nächste Stunde verschieben?`,
    [{ label: 'Auf die nächste Stunde verschieben', value: 'move', primary: true }, { label: 'So lassen', value: 'keep' }]);
  if (choice !== 'move') return;
  moves.forEach(({ c, next }) => { if (next) c.item.targetDate = next.dateStr; });
  saveDB();
  renderScheduleViews();
}

// Hat sich an Tag, Block, Hälfte oder Rhythmus etwas geändert? (Raum, Farbe usw. zählen nicht)
function scheduleChanged(slot, f) {
  const rec = s => isOneOffSlot(s) ? 'none' : s.recurring;
  return slot.day !== f.day || slot.block !== f.block || (slot.part || 'full') !== f.part || rec(slot) !== rec(f)
    || (f.recurring === 'biweekly' && !!slot.startDate && !sameWeekParity(slot.startDate, f.startDate));
}

// Daten der Stunden mit Einträgen (Notizen, Inhalt, HA, Tests, Ausfall) dieser Stunde
function lessonEntryDates(slotId) {
  const prefix = slotId + '_';
  return Object.keys(db.lessonData).filter(k => k.startsWith(prefix))
    .filter(k => { const d = db.lessonData[k]; return d && Object.values(d).some(v => Array.isArray(v) ? v.length : !!v); })
    .map(k => k.slice(prefix.length));
}

// Ab wann eine Änderung „ab jetzt“ gilt: ab der Woche der geöffneten Stunde, nie vor heute, und nie vor oder an
// einem Tag bis heute, an dem die Stunde schon Einträge hat (die Stunde hat stattgefunden; BUGS R1).
function splitDateFor(slot, weekStart) {
  const today = formatDate(new Date());
  let from = weekStart > today ? weekStart : today;
  const held = lessonEntryDates(slot.id).filter(d => d >= from && d <= today).sort();
  if (held.length) from = formatDate(addDays(parseDate(held[held.length - 1]), 1));
  return formatDate(nextSchoolDay(parseDate(from)));
}
// „ab der Woche vom 28.09.“ (Montag) bzw. „ab Do, 24.09.“
function fromPhrase(dateStr) {
  const d = parseDate(dateStr);
  return d.getDay() === 1 ? `ab der Woche vom ${formatDateDE(d)}` : `ab ${DAY_SHORT[(d.getDay() + 6) % 7]}, ${formatDateDE(d)}`;
}
function capitalize(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
// Neues Datum eines Eintrags, wenn die Stunde um `shift` Tage wandert. Beim Teilen ab `from` nie davor:
// Fr → Mo ab Mittwoch heißt nächster Montag, nicht der vergangene.
function shiftedEntryDate(dateStr, shift, from) {
  let d = addDays(parseDate(dateStr), shift);
  while (from && formatDate(d) < from) d = addDays(d, 7);
  return formatDate(d);
}
// Tage mit Einträgen, die nach der Änderung auf keinen Termin der Stunde mehr fallen (BUGS R10)
function orphanedEntryDates(slot, fields, splitFrom) {
  const shift = fields.day - slot.day;
  const after = { ...slot, ...fields, validFrom: splitFrom || slot.validFrom, validUntil: splitFrom ? undefined : slot.validUntil };
  return lessonEntryDates(slot.id).filter(d => !splitFrom || d >= splitFrom)
    .map(d => shiftedEntryDate(d, shift, splitFrom))
    .filter(d => !slotOccursOn(after, d) && !holidayAt(d)).sort(); // Ferientage sind ohnehin frei (Y8)
}
// Hausaufgaben/Tests der Klasse, die auf einen Termin dieser Stunde zeigen, wandern mit, wenn die Stunde den
// Tag wechselt – sonst sind sie nirgends mehr fällig (BUGS R2, Regel 13). Nicht, wenn an dem Tag noch eine andere
// Stunde der Klasse liegt (dann ist die HA dort weiter fällig).
function retargetDueItems(slot, fields, splitFrom) {
  const shift = fields.day - slot.day;
  if (!shift) return;
  const others = relatedSlots(slot).filter(s => s.id !== slot.id);
  const ids = new Set(relatedSlots(slot).map(s => s.id));
  const today = formatDate(new Date());
  Object.entries(db.lessonData).forEach(([key, data]) => {
    const sep = key.lastIndexOf('_');
    if (!ids.has(key.slice(0, sep))) return;
    // Nie vor den Tag nach der Stunde, in der die HA gestellt wurde, und nie vor heute: Fr → Mo hieße sonst
    // „fällig am Montag davor“ (BUGS V4). Schon vergangene Termine wandern einfach mit.
    const givenAfter = formatDate(addDays(parseDate(key.slice(sep + 1)), 1));
    [...(data.hwItems || []), ...(data.testItems || [])].forEach(item => {
      const t = item.targetDate;
      if (!t || (splitFrom && t < splitFrom) || !slotOccursOn(slot, t)) return;
      if (others.some(o => slotOccursOn(o, t))) return;
      const notBefore = splitFrom || (t >= today ? (givenAfter > today ? givenAfter : today) : null);
      item.targetDate = shiftedEntryDate(t, shift, notBefore);
    });
  });
}

// Stunde ab einem Tag ändern: alte endet davor, neue beginnt dort; Einträge ab dann ziehen um (BUGS M7, R1)
function splitSlotFrom(slot, fromDateStr, fields) {
  const newSlot = { ...slot, ...fields, id: uid(), validFrom: fromDateStr };
  slot.validUntil = formatDate(addDays(parseDate(fromDateStr), -1));
  const shift = fields.day - slot.day;
  const prefix = slot.id + '_';
  Object.keys(db.lessonData).filter(k => k.startsWith(prefix) && k.slice(prefix.length) >= fromDateStr).forEach(k => {
    const newDate = shiftedEntryDate(k.slice(prefix.length), shift, fromDateStr);
    db.lessonData[newSlot.id + '_' + newDate] = db.lessonData[k];
    delete db.lessonData[k];
  });
  db.lessonSlots.push(newSlot);
  return newSlot;
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

async function deleteLessonSlotFromEdit() {
  const slot = editingSlotId && db.lessonSlots.find(s => s.id === editingSlotId);
  if (!slot) return;
  const refDate = currentSpecificDate ? parseDate(currentSpecificDate) : getWeekDates(currentWeekOffset)[0];
  const weekStart = splitDateFor(slot, formatDate(mondayOf(refDate)));
  const dates = lessonEntryDates(slot.id);
  const n = dates.length, before = dates.filter(d => d < weekStart).length, lost = n - before;
  const withNotes = n === 1 ? '1 Stunde mit Notizen oder Hausaufgaben' : `${n} Stunden mit Notizen oder Hausaufgaben`;
  const lostText = lost === 0 ? 'Dabei geht nichts verloren.'
    : `Dabei ${lost === 1 ? 'wird 1 Stunde mit Einträgen' : `werden ${lost} Stunden mit Einträgen`} ${fromPhrase(weekStart)} gelöscht.`;

  let choice;
  if (slot.movedFrom) {
    // „nur diese Woche“ verlegt: löschen = Verlegung aufheben, Notizen wandern zurück (nicht gelöscht)
    if (!confirm(`Verlegung aufheben?\n\nDie Stunde findet dann wieder am ${formatDateLong(slot.movedFrom.date)} statt; Notizen und Hausaufgaben wandern zurück.`)) return;
    if (!db.lessonSlots.includes(slot)) return;
    revertMovedLesson(slot.id);
    saveDB();
    editingSlotId = null;
    closeModal('modal-add-lesson');
    renderScheduleViews();
    showToast('Verlegung aufgehoben');
    return;
  }
  if (!isOneOffSlot(slot) && before > 0) {
    // Stunde fällt z. B. zum Halbjahr weg: beenden statt löschen, frühere Notizen bleiben (BUGS M7).
    // Nie vor heute und nie über eine schon gehaltene Stunde hinweg (BUGS R1).
    choice = await askChoice('Stunde löschen',
      `Zu dieser Stunde gibt es ${withNotes}, davon ${before} aus früheren Stunden.\n\nSoll die Stunde nur ${fromPhrase(weekStart)} wegfallen? ${lostText}`,
      [{ label: `${capitalize(fromPhrase(weekStart))} beenden`, value: 'from', primary: true },
       { label: `Komplett löschen (mit allen ${n} Stunden mit Einträgen)`, value: 'all', danger: true }]);
  } else {
    choice = confirm(n ? `Diese Unterrichtsstunde komplett löschen?\n\nDamit werden auch ${withNotes} gelöscht.` : 'Diese Unterrichtsstunde komplett löschen?') ? 'all' : null;
  }
  if (!choice || !db.lessonSlots.includes(slot)) return;

  const dueBefore = dueItemsOnSlot(slot); // BUGS V3
  const prefix = slot.id + '_';
  if (choice === 'from') {
    slot.validUntil = formatDate(addDays(parseDate(weekStart), -1));
    Object.keys(db.lessonData).forEach(k => { if (k.startsWith(prefix) && k.slice(prefix.length) >= weekStart) delete db.lessonData[k]; });
  } else {
    db.lessonSlots = db.lessonSlots.filter(s => s !== slot);
    Object.keys(db.lessonData).forEach(k => { if (k.startsWith(prefix)) delete db.lessonData[k]; });
  }
  saveDB();
  editingSlotId = null;
  closeModal('modal-add-lesson');
  renderScheduleViews();
  showToast(choice === 'from' ? 'Stunde beendet' : 'Stunde gelöscht');
  await offerRetargetHanging(dueBefore, slot);
}

// Auswahl zwischen mehreren Wegen, z. B. „ab dieser Woche“ / „alle“. Liefert den Wert des Knopfs
// oder null (Abbrechen, Escape, daneben tippen).
let choiceResolve = null;
function askChoice(title, text, choices) {
  if (choiceResolve) answerChoice(null);
  document.getElementById('modal-choice-title').textContent = title;
  document.getElementById('modal-choice-text').textContent = text;
  const box = document.getElementById('modal-choice-buttons');
  box.innerHTML = '';
  [...choices, { label: 'Abbrechen', value: null }].forEach(c => {
    const btn = document.createElement('button');
    btn.className = c.primary ? 'btn-primary' : c.danger ? 'btn-danger-outline' : 'btn-secondary';
    btn.style.width = '100%';
    btn.textContent = c.label;
    btn.onclick = () => answerChoice(c.value);
    box.appendChild(btn);
  });
  openModal('modal-choice');
  return new Promise(resolve => { choiceResolve = resolve; });
}
function answerChoice(value) {
  closeModal('modal-choice');
  const resolve = choiceResolve;
  choiceResolve = null;
  if (resolve) resolve(value);
}

// ─── Find all upcoming lesson dates for this subject ─────────────────────
// If the slot is group-linked, searches ALL slots of that group (correct multi-day support).
// Otherwise falls back to subject name matching.
// Nur Stunden, die wirklich stattfinden: kein Ausfall, nicht von einer Vertretung ersetzt (BUGS M4)
function findUpcomingLessonDates(slotId, fromDateStr, maxCount = 4) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  if (!currentSlot) return [];
  const ids = new Set(relatedSlots(currentSlot).map(s => s.id));

  const results = [];
  let d = parseDate(fromDateStr);
  for (let i = 1; i <= 70 && results.length < maxCount; i++) {   // über die Sommerferien (Y8)
    d = addDays(d, 1);
    if (!isSchoolDay(d)) continue;
    const dateStr = formatDate(d);
    const hit = lessonsOnDate(dateStr).find(l => ids.has(l.slot.id) && !l.ausfall);
    if (hit) results.push({ dateStr, slotId: hit.slot.id });
  }
  return results;
}

// ─── Lesson Detail ───────────────────────────────────────────────────────
let currentLessonDataKey = null;
let lessonTogglesShown = { hwEnabled: false, testEnabled: false }; // Schalterstand beim Öffnen (BUGS R7)

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

  renderLessonAbsent(slot, dateStr);

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
  // Klasse als Titel, Fach vorn in der Unterzeile (BUGS I13); ohne Klasse ist das Fach der Titel
  const t = lessonTitle(slot);
  document.getElementById('lesson-modal-title').textContent = t.main;
  document.getElementById('lesson-modal-subtitle').textContent = [t.sub, DAYS[slot.day],
    block ? block.label + ' (' + block.start + '–' + block.end + ')' : '',
    d.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}), slot.room].filter(Boolean).join(' · ');

  // Ohne Klasse gibt es weder Sitzplan noch Noten oder Schüler (BUGS M8)
  ['lesson-seating-link-container', 'lesson-btn-overview', 'lesson-btn-students'].forEach(id =>
    document.getElementById(id).classList.toggle('hidden', !slot.groupId));
  // Vertretung / einmalig kennzeichnen; „Vertretung“ nur für reguläre Stunden anbieten (BUGS AA3)
  const kind = lessonKindLabel(slot);
  const kindBadge = document.getElementById('lesson-kind-badge');
  kindBadge.textContent = kind;
  kindBadge.classList.toggle('hidden', !kind);
  kindBadge.classList.toggle('sub', !!slot.substitute);
  document.getElementById('btn-lesson-substitute').classList.toggle('hidden', isOneOffSlot(slot));

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

  // Angezeigt wird der Schalter auch wegen einer fälligen HA eingeschaltet; nur wer ihn umlegt, ändert etwas
  lessonTogglesShown = { hwEnabled, testEnabled };
  openModal('modal-lesson');
}

// „Heute fehlen“ im Stunden-Fenster; auch nach Einträgen über „Schüler bewerten“ neu (BUGS M10)
function renderLessonAbsent(slot, dateStr) {
  const absentContainer = document.getElementById('lesson-absent-container');
  const absentList = document.getElementById('lesson-absent-list');
  absentContainer.classList.add('hidden');
  absentList.innerHTML = '';
  if (!slot.groupId || !db.students[slot.groupId]) return;
  const absent = db.students[slot.groupId].filter(s =>
    (s.attendance || []).some(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'))
  );
  if (!absent.length) return;
  const today = formatDate(new Date());
  document.querySelector('#lesson-absent-container .notes-section-label').textContent = dateStr === today ? 'Heute fehlen'
    : `${dateStr < today ? 'Gefehlt' : 'Fehlen'} am ${formatDateDE(parseDate(dateStr))}`; // BUGS V7
  absentList.innerHTML = absent.map(s => {
    const excused = (s.attendance || []).some(a => a.date === dateStr && a.type === 'entschuldigt');
    return `<li><span>${escHtml([s.firstName, s.lastName].filter(Boolean).join(' '))}</span>` +
      `<span class="absent-type ${excused ? 'excused' : 'unexcused'}">${excused ? 'entschuldigt' : 'unentschuldigt'}</span></li>`;
  }).join('');
  absentContainer.classList.remove('hidden');
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
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'entry-item';
      const targetLabel = item.targetDate ? `<span class="entry-item-target">${formatDateLong(item.targetDate)}</span>` : '';
      el.innerHTML = `
        <span class="entry-item-text">${escHtml(item.text)}</span>
        ${targetLabel}
        <button class="entry-item-delete" aria-label="Löschen">✕</button>
      `;
      el.querySelector('.entry-item-delete').onclick = () => removeItem(type, item); // per Referenz (Regel 9, BUGS M15)
      list.appendChild(el);
    });
  }

  // Incoming items
  const incomingEl = document.getElementById(incomingId);
  if (incoming && incoming.length) {
    incomingEl.classList.remove('hidden');
    // „heute“ nur bei der Stunde von heute (BUGS V7)
    const when = activeLessonDate === formatDate(new Date()) ? 'Fällig heute' : 'Fällig in dieser Stunde';
    incomingEl.innerHTML = `<div class="incoming-title">${when} (von früheren Stunden)</div>`;
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

// Liegt an diesem Datum eine Stunde der Klasse? Sonst wäre eine HA/ein Test nirgends fällig (BUGS R13).
// Beim Schließen des Fensters (fromClose) wird nicht gefragt: Eingetipptes darf dabei nie verloren gehen (Regel 27).
function confirmTargetHasLesson(targetDate, fromClose) {
  if (!targetDate || fromClose) return true;
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  const ids = new Set(relatedSlots(slot).map(x => x.id));
  // Eine ausfallende Stunde zählt nicht: dort hinge der Eintrag fest (BUGS V9)
  if (lessonsOnDate(targetDate).some(l => ids.has(l.slot.id) && !l.ausfall)) return true;
  return confirm(`Am ${formatDateLong(targetDate)} hat die Klasse keine Stunde (oder sie fällt aus) – dort würde der Eintrag nirgends als fällig angezeigt.\n\nTrotzdem eintragen?`);
}

function addHWItem(fromClose = false) {
  const text       = document.getElementById('new-hw-text').value.trim();
  const targetDate = document.getElementById('new-hw-date').value;
  if (!text) return;
  if (!confirmTargetHasLesson(targetDate, fromClose)) return;
  const data = ensureLessonData();
  if (!data.hwItems) data.hwItems = [];
  data.hwItems.push({ id: uid(), text, targetDate });
  data.hwEnabled = true;
  saveDB();
  // Reset ONLY the text field, keep the date for quick follow-up entries
  document.getElementById('new-hw-text').value = '';
  renderHWItems(data.hwItems, getIncomingItems(activeLessonId, activeLessonDate).hw);
  renderScheduleViews();
}

function addTestItem(fromClose = false) {
  const text       = document.getElementById('new-test-text').value.trim();
  const targetDate = document.getElementById('new-test-date').value;
  if (!text) return;
  if (!confirmTargetHasLesson(targetDate, fromClose)) return;
  const data = ensureLessonData();
  if (!data.testItems) data.testItems = [];
  data.testItems.push({ id: uid(), text, targetDate });
  data.testEnabled = true;
  saveDB();
  // Reset ONLY the text field, keep the date for quick follow-up entries
  document.getElementById('new-test-text').value = '';
  renderTestItems(data.testItems, getIncomingItems(activeLessonId, activeLessonDate).tests);
  renderScheduleViews();
}

function removeItem(type, item) {
  const data = ensureLessonData();
  const key  = type + 'Items';
  const idx = (data[key] || []).indexOf(item);
  if (idx !== -1) { data[key].splice(idx, 1); saveDB(); } // -1: inzwischen weg (Sync) → nichts löschen
  const incoming = getIncomingItems(activeLessonId, activeLessonDate);
  if (type === 'hw')   renderHWItems(data.hwItems || [], incoming.hw);
  if (type === 'test') renderTestItems(data.testItems || [], incoming.tests);
  renderScheduleViews();
}

function ensureLessonData() {
  if (!db.lessonData[currentLessonDataKey])
    db.lessonData[currentLessonDataKey] = {};
  return db.lessonData[currentLessonDataKey];
}

// Eingaben des Stunden-Fensters übernehmen. Gespeichert (= „geändert“) wird nur, wenn sich etwas geändert hat.
function storeLessonForm() {
  // Eingetippte, aber nicht per „+“ übernommene HA/Tests nicht verwerfen
  if (document.getElementById('hw-toggle').checked) addHWItem(true);
  if (document.getElementById('test-toggle').checked) addTestItem(true);
  const form = {
    done:        document.getElementById('lesson-done-text').value,
    notes:       document.getElementById('lesson-notes-text').value,
    hwEnabled:   document.getElementById('hw-toggle').checked,
    testEnabled: document.getElementById('test-toggle').checked,
  };
  const old = db.lessonData[currentLessonDataKey] || {};
  const changed = (form.done !== (old.done || '')) || (form.notes !== (old.notes || ''))
    || (form.hwEnabled !== lessonTogglesShown.hwEnabled) || (form.testEnabled !== lessonTogglesShown.testEnabled);
  if (!changed) return;
  // Schalter nur speichern, wenn er umgelegt wurde: Angezeigt wird er auch wegen einer fälligen HA eingeschaltet,
  // und das schaltete sonst eine zurückgenommene eigene HA wieder ein (BUGS V2)
  const update = { done: form.done, notes: form.notes };
  if (form.hwEnabled !== lessonTogglesShown.hwEnabled) update.hwEnabled = form.hwEnabled;
  if (form.testEnabled !== lessonTogglesShown.testEnabled) update.testEnabled = form.testEnabled;
  Object.assign(ensureLessonData(), update);
  // Gespeicherter Stand = neuer Vergleichsstand: Das Fenster kann offen bleiben (Verlassen der App, BUGS T3)
  lessonTogglesShown = { hwEnabled: form.hwEnabled, testEnabled: form.testEnabled };
  saveDB();
  renderScheduleViews();
}

function saveLessonDataAndClose() {
  storeLessonForm();
  renderScheduleViews(); // auch ohne Formular-Änderung: HA per „+“, Ausfall …
  closeModal('modal-lesson');
  showToast('Gespeichert ✓');
}

// Stunden-Fenster für einen anderen Weg verlassen (Bearbeiten, Sitzplan, Notenübersicht):
// Eingetipptes vorher übernehmen, wie beim „Schließen“ (BUGS K2, Regel 27).
function leaveLessonModal() {
  if (!document.getElementById('modal-lesson').classList.contains('hidden')) storeLessonForm();
  closeModal('modal-lesson');
}

// ─── Ausfall ──────────────────────────────────────────────────────────────
function toggleAusfall() {
  const key = currentLessonDataKey;
  // Verlegt („nur diese Woche“): Verlegung aufheben statt Ausfall umschalten
  const moved = (db.lessonData[key] || {}).movedTo;
  if (moved) {
    if (revertMovedLesson(moved.slotId)) { saveDB(); renderScheduleViews(); showToast('Verlegung aufgehoben'); openLessonDetail(activeLessonId, activeLessonDate); }
    return;
  }
  // Fällige HA/Tests hingen sonst in der ausgefallenen Stunde (BUGS R4). Ohne Frage bleibt alles synchron.
  if (!(db.lessonData[key] || {}).ausfall && dueItemsToMove(activeLessonId, activeLessonDate)) {
    return offerMoveDueItems(activeLessonId, activeLessonDate, 'Stunde entfällt').then(ok => {
      if (ok && key === currentLessonDataKey) applyAusfallToggle(); // sonst: abgebrochen bzw. andere Stunde offen
    });
  }
  applyAusfallToggle();
}
function applyAusfallToggle() {
  const data = ensureLessonData();
  data.ausfall = !data.ausfall;
  saveDB();
  updateAusfallDisplay(data.ausfall);
  renderScheduleViews();
}

// In einer Stunde fällige HA/Tests anderer Stunden: auf die nächste Stunde der Klasse verschieben?
// Liefert false bei „Abbrechen“. Ohne fällige Einträge oder ohne nächste Stunde wird nicht gefragt.
// Was verschoben werden könnte: { items, next } oder null (nichts fällig, keine nächste Stunde, oder eine
// andere Stunde der Klasse am selben Tag übernimmt die Einträge ohnehin, BUGS R11)
function dueItemsToMove(slotId, dateStr) {
  const incoming = getIncomingItems(slotId, dateStr);
  const items = [...incoming.hw.map(i => ['hwItems', i]), ...incoming.tests.map(i => ['testItems', i])];
  if (!items.length) return null;
  const slot = db.lessonSlots.find(x => x.id === slotId);
  const ids = new Set(relatedSlots(slot).map(x => x.id));
  if (lessonsOnDate(dateStr).some(l => ids.has(l.slot.id) && l.slot.id !== slotId && !l.ausfall)) return null;
  const next = findUpcomingLessonDates(slotId, dateStr, 1)[0];
  return next ? { items, next } : null;
}
async function offerMoveDueItems(slotId, dateStr, title) {
  const due = dueItemsToMove(slotId, dateStr);
  if (!due) return true;
  const { items, next } = due;
  const when = formatDateLong(next.dateStr);
  const list = items.map(([, i]) => '• ' + i.text).join('\n');
  const choice = await askChoice(title, `In dieser Stunde ist fällig:\n${list}\n\nAuf die nächste Stunde (${when}) verschieben?`,
    [{ label: `Auf ${when} verschieben`, value: 'move', primary: true }, { label: 'Bei dieser Stunde lassen', value: 'keep' }]);
  if (!choice) return false;
  if (choice === 'move') {
    items.forEach(([listKey, copy]) => {
      const source = (db.lessonData[copy.slotKey] || {})[listKey] || [];
      const item = source.find(x => x.id === copy.id && x.targetDate === dateStr);
      if (item) item.targetDate = next.dateStr;
    });
    saveDB();
  }
  return true;
}

function updateAusfallDisplay(isAusfall) {
  document.getElementById('lesson-ausfall-badge').classList.toggle('hidden', !isAusfall);
  document.getElementById('lesson-ausfall-overlay').classList.toggle('hidden', !isAusfall);
  const form = document.getElementById('lesson-notes-form');
  form.style.opacity        = isAusfall ? '0.32' : '1';
  form.style.pointerEvents  = isAusfall ? 'none' : '';
  const btn = document.getElementById('btn-ausfall-bottom');
  // Verlegt: anderer Text, Knopf hebt die Verlegung auf
  const moved = (db.lessonData[currentLessonDataKey] || {}).movedTo;
  const movedSlot = moved && db.lessonSlots.find(s => s.id === moved.slotId);
  const blockLabel = movedSlot ? ((getBlocks().find(b => b.num === movedSlot.block) || {}).label || '') : '';
  document.querySelector('#lesson-ausfall-overlay .ausfall-text').textContent = moved
    ? `Verlegt auf ${formatDateLong(moved.date)}${blockLabel ? ', ' + blockLabel : ''}` : 'Diese Stunde fällt aus';
  document.querySelector('#lesson-ausfall-overlay button').textContent = moved ? 'Verlegung aufheben' : 'Ausfall aufheben';
  if (btn && moved) {
    btn.textContent = 'Verlegung aufheben';
    return;
  }
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
    sw.className = 'color-swatch' + (color === currentColor ? ' selected' : '') + (isLightColor(color) ? ' swatch-light' : '');
    sw.style.background = color;
    sw.style.setProperty('--swatch-color', color);
    sw.dataset.color = color;
    sw.setAttribute('role', 'button');
    sw.tabIndex = 0;
    sw.setAttribute('aria-label', 'Farbe ' + color);
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
      const todayStr = formatDate(new Date());
      // Vertretungen (L9) und beendete Stunden (M7) nicht
      const linkedSlots = db.lessonSlots.filter(s => s.groupId === g.id && !isOneOffSlot(s) && (!s.validUntil || s.validUntil >= todayStr));
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
  // Meist kommt die nächste Klasse mit demselben Fach im selben Schuljahr: beides von der zuletzt angelegten (BUGS AA1).
  // Skala und Gewichtung bewusst nicht: Nach einem Oberstufenkurs hätte die 7. Klasse sonst unbemerkt Punkte.
  const last = db.groups[db.groups.length - 1];
  document.getElementById('new-group-class').value = '';
  document.getElementById('new-group-subject').value = last ? last.subject || '' : '';
  document.getElementById('new-group-year').value = last ? last.year || '' : '';
  document.getElementById('weight-schularbeit').value = '50';
  document.getElementById('new-group-scale').value = '1-6';
  selectedGroupColor = nextGroupColors(1)[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  document.getElementById('btn-delete-group').style.display = 'none';
  updateGroupClassPreview();

  openModal('modal-add-group');
  setTimeout(() => document.getElementById('new-group-class').focus(), 80);
}

// Feld „Klasse“: mehrere auf einmal, getrennt durch Komma/Semikolon/Zeile, Buchstaben-Bereiche „7a-d“ / „7a-7d“
// (BUGS AA1). Alles andere bleibt ein Name, wie er ist („Q1 Leistungskurs“, „E-Phase“).
const CLASS_RANGE_MAX = 15;
function parseClassNames(text) {
  const names = [];
  String(text || '').split(/[,;\n]+/).map(t => t.trim()).filter(Boolean).forEach(token => {
    // Nur reine Klassenbezeichnungen („7a-d“, „10A–C“) aufklappen; „Ethik 7a-d“ ist ein Kursname (R1)
    const m = token.match(/^(\d{1,2})\s*([a-z])\s*[-–—]\s*(?:\1)?\s*([a-z])$/i);
    const from = m && m[2].toLowerCase().charCodeAt(0), to = m && m[3].toLowerCase().charCodeAt(0);
    if (m && to > from && to - from < CLASS_RANGE_MAX) {
      const upper = m[2] === m[2].toUpperCase();
      for (let c = from; c <= to; c++) {
        const letter = String.fromCharCode(c);
        names.push(m[1] + (upper ? letter.toUpperCase() : letter));
      }
    } else {
      names.push(token);
    }
  });
  return [...new Set(names)];
}
// Farben für neue Klassen: zuerst die gewählte, dann noch unbenutzte, damit man sie im Stundenplan unterscheidet
function nextGroupColors(n, first = null) {
  const used = new Set(db.groups.map(g => g.color));
  const start = Math.max(0, APP_COLORS.indexOf(first));
  const ordered = APP_COLORS.map((_, i) => APP_COLORS[(start + i) % APP_COLORS.length]);
  const pool = [...(first ? [first] : []), ...ordered.filter(c => c !== first && !used.has(c)), ...ordered.filter(c => c !== first && used.has(c))];
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}
// Vorschau unter dem Feld und Text des Knopfs, sobald mehr als eine Klasse entsteht
function updateGroupClassPreview() {
  const names = editingGroupId ? [] : parseClassNames(document.getElementById('new-group-class').value);
  const preview = document.getElementById('group-class-preview');
  const multi = names.length > 1;
  preview.textContent = multi ? `Legt ${names.length} Klassen an: ${names.join(', ')}` : '';
  preview.classList.toggle('hidden', !multi);
  document.getElementById('btn-save-group').textContent = multi ? `${names.length} Klassen anlegen` : 'Speichern';
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
  updateGroupClassPreview();

  openModal('modal-add-group');
}

function editCurrentGroup() { if (currentGroupId) openEditGroup(currentGroupId); }

function saveSubjectGroup() {
  const className = document.getElementById('new-group-class').value.trim();
  // Beim Bearbeiten nie aufteilen: „Ethik 7a-d“ ist ein Name (R1)
  const classNames = editingGroupId ? [className] : parseClassNames(className);
  const subject   = document.getElementById('new-group-subject').value.trim();
  const year      = document.getElementById('new-group-year').value.trim();
  
  const weightInput = document.getElementById('weight-schularbeit').value.trim();
  const finalSchularbeitWeight = weightInput === '' ? 50 : Number(weightInput.replace(',', '.'));
  
  if (!className || !subject) { showToast('Bitte Klasse und Fach eingeben', 'error'); return; }
  if (isNaN(finalSchularbeitWeight) || finalSchularbeitWeight < 0 || finalSchularbeitWeight > 100) {
    showToast('Gewichtung muss zwischen 0 und 100 % liegen', 'error'); return;
  }
  const gradeScaleId = gradeScale({ gradeScale: document.getElementById('new-group-scale').value }).id;
  let addedGroupsMessage = '';
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
    // Mehrere auf einmal (BUGS AA1). Klasse + Fach, die es schon gibt, nicht doppelt anlegen.
    const key = (c, f) => c.trim().toLowerCase() + '|' + f.trim().toLowerCase();
    const existing = new Set(db.groups.map(g => key(g.className || '', g.subject || '')));
    const fresh = classNames.filter(c => !existing.has(key(c, subject)));
    const skipped = classNames.filter(c => existing.has(key(c, subject)));
    if (!fresh.length) {
      showToast(`${skipped.join(', ')} ${subject} gibt es schon`, 'error');
      return;
    }
    const colors = nextGroupColors(fresh.length, selectedGroupColor);
    fresh.forEach((c, i) => {
      const id = uid();
      db.groups.push({ id, className: c, subject, year, color: colors[i], schularbeitWeight: finalSchularbeitWeight, gradeScale: gradeScaleId });
      db.students[id] = [];
    });
    addedGroupsMessage = (fresh.length > 1 ? `${fresh.length} Klassen hinzugefügt ✓` : 'Klasse hinzugefügt ✓')
      + (skipped.length ? ` – ${skipped.join(', ')} gab es schon` : '');
  }
  saveDB();
  closeModal('modal-add-group');
  renderSubjectGroups();
  renderTimetable(); // Ensure timetable updates if colors changed
  if (editingGroupId && currentGroupId === editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      setClassViewHeader(g);
      refreshStudentViews(g.id); // Schnitte/Farben nach Gewichtung oder Skala, auch in der offenen Tabelle (BUGS Q4)
    }
  }
  showToast(editingGroupId ? 'Geändert ✓' : addedGroupsMessage);
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
  // Hat ein Feld der alten Tabelle noch den Fokus, entfernte das Ersetzen es, und der Browser feuerte dabei sein
  // change mitten im Ersetzen (NotFoundError). Deshalb vorher den Fokus nehmen: Eine laufende Eingabe wird dabei
  // übernommen (change zeichnet selbst neu, danach zeichnen wir mit dem neuen Stand). Ein Feld, das Enter/Tab
  // schon per change übernommen hat, verliert vorher seinen Handler, sonst käme es doppelt.
  const focused = document.activeElement;
  if (focused && focused.tagName === 'INPUT' && content.contains(focused)) {
    if (focused === overviewCommittedInput) focused.onchange = null;
    overviewCommittedInput = null;
    focused.blur();
  }
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];
  
  if (!students.length) {
    content.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
    return;
  }

  const sortedStudents = sortStudents(students);
  let html = '<div class="overview-table-wrapper"><table class="overview-table"><thead><tr><th class="ov-name-col">Schüler</th>';

  if (currentOverviewTab === 'grades') {
    const gradeEvents = gradeColumns(group, sortedStudents);

    html += '<th>Ø</th>';
    const weight = getSchularbeitWeight(group);
    gradeEvents.forEach(ev => {
      const type = ev.type || 'test';
      const weighted = gradeCategory(type) === 'schularbeit';
      const typeTitle = weighted ? `${gradeTypeName(type)}: zählt ${weight} % der Note` : `${gradeTypeName(type)}: Sonstige, zählt ${100 - weight} % der Note`;
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)}, ${jsArg(type)}, ${ev.nth})">`
        + `<div class="col-type${weighted ? ' weighted' : ''}" title="${escHtml(typeTitle)}">${escHtml(gradeTypeShort(type))}</div>`
        + `<div>${formatDateShort(ev.date)}</div><div class="col-title">${escHtml(ev.label || gradeTypeName(type))}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    const scale = gradeScale(currentOverviewGroupId);
    sortedStudents.forEach(s => {
      const rawAvg = calculateStudentAverage(s, currentOverviewGroupId);
      const avg = formatGradeAverage(rawAvg);
      
      const nameDisplay = escHtml(studentListName(s));
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${nameDisplay}">${nameDisplay}</span></td>`;
      html += `<td style="font-weight:700;color:${gradeColor(rawAvg, scale)};text-align:center;">${avg}</td>`;
      
      gradeEvents.forEach(ev => {
        const grade = findColumnGrade(s, ev);
        const val = grade ? grade.value : '';
        html += `<td style="padding:4px;"><input type="text" enterkeyhint="next" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:600; color:${val ? gradeColor(gradeNumber(val), scale) : 'inherit'}" value="${escHtml(gradeText(val))}" placeholder="-" onchange="updateInlineGrade(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label)}, this.value, ${jsArg(ev.type)}, ${ev.nth})" /></td>`;
      });
      html += `</tr>`;
    });
    
    // Bottom average row
    html += '<tr><td class="ov-name-col" style="font-weight:700;">Durchschnitt</td>';
    const groupAvg = calculateGroupAverage(currentOverviewGroupId);
    html += `<td style="font-weight:700;color:${gradeColor(groupAvg, scale)};text-align:center;">${formatGradeAverage(groupAvg)}</td>`;

    gradeEvents.forEach(ev => {
      let sum = 0, count = 0;
      sortedStudents.forEach(s => {
        const grade = findColumnGrade(s, ev);
        if (grade) {
          const val = gradeNumber(grade.value);
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
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      
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
    // Eine Spalte pro Tag; die Bezeichnung einer angelegten Spalte steht dabei (BUGS L2)
    const attEventsMap = new Map();
    (group.attendanceEvents || []).forEach(ev => {
      const col = attEventsMap.get(ev.date);
      if (!col) attEventsMap.set(ev.date, { date: ev.date, label: ev.label || '' });
      else if (!col.label) col.label = ev.label || '';
    });
    sortedStudents.forEach(s => {
      (s.attendance || []).forEach(a => { if (!attEventsMap.has(a.date)) attEventsMap.set(a.date, { date: a.date, label: '' }); });
    });
    const attDates = Array.from(attEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th title="Unentschuldigt (F) + entschuldigt (E), ohne zu spät (Z)">Fehltage</th>';
    attDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      const totalMissed = (s.attendance||[]).filter(a => a.type === 'abwesend' || a.type === 'entschuldigt').length;
      html += `<td style="text-align:center;font-weight:600;${totalMissed ? '' : 'color:var(--text-muted);'}">${totalMissed}</td>`;

      attDates.forEach(ev => {
        const aIdx = (s.attendance||[]).findIndex(x => x.date === ev.date);
        const status = aIdx !== -1 ? s.attendance[aIdx].type : ''; // 'abwesend', 'entschuldigt', 'zuspät'
        const displayVal = ATTENDANCE_SHORT[status] || '';

        html += `<td style="padding:4px;"><input type="text" enterkeyhint="next" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:600; color:${status==='abwesend' ? 'var(--danger)' : status==='entschuldigt' ? 'var(--success)' : 'inherit'}" value="${displayVal}" placeholder="-" onchange="updateInlineAttendance(${jsArg(s.id)}, ${jsArg(ev.date)}, this.value)" /></td>`;
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
    
    html += '<th title="Wie oft die Hausaufgaben gefehlt haben">Vergessen</th>';
    hwDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      const totalMissed = (s.homework||[]).length;
      html += `<td style="text-align:center;font-weight:600;color:${totalMissed ? 'var(--danger)' : 'var(--text-muted)'};">${totalMissed}</td>`;

      hwDates.forEach(ev => {
        const hIdx = (s.homework||[]).findIndex(x => x.date === ev.date && (x.note||'') === (ev.label||''));
        const hasMissed = hIdx !== -1;
        html += `<td style="padding:4px;"><input type="text" enterkeyhint="next" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:800; color:var(--danger);" value="${hasMissed ? 'X' : ''}" placeholder="-" onchange="updateInlineHomework(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')}, this.value)" /></td>`;
      });
      html += `</tr>`;
    });
  }

  html += '</tbody></table></div>';
  content.innerHTML = html;
  restoreOverviewFocus(content);
}

// Neu zeichnen nimmt der Zelle, in die man gerade tippt/tabbt, den Fokus (auf dem iPad geht die Tastatur zu).
// Deshalb merken wir uns beim Antippen bzw. bei Tab, wohin der Fokus soll, und setzen ihn nach dem Zeichnen
// wieder an dieselbe Stelle (BUGS Q3). Enter hat seine eigene Behandlung (L6).
let overviewFocusTarget = null; // { row, col, at }
let overviewCommittedInput = null; // Feld, dessen Eingabe Enter/Tab gerade per change übernimmt
function overviewCellPos(el) {
  const cell = el && el.closest('#overview-content td');
  if (!cell) return null;
  const rows = [...document.querySelectorAll('#overview-content tbody tr')];
  const row = rows.indexOf(cell.parentElement);
  return row === -1 ? null : { row, col: [...cell.parentElement.children].indexOf(cell), at: Date.now() };
}
function restoreOverviewFocus(content) {
  const t = overviewFocusTarget;
  overviewFocusTarget = null;
  if (!t || Date.now() - t.at > 1000) return;
  const row = content.querySelectorAll('tbody tr')[t.row];
  const el = row && row.children[t.col] && row.children[t.col].querySelector('input, button');
  if (!el) return;
  el.focus();
  if (el.select) el.select();
}
document.getElementById('overview-content').addEventListener('pointerdown', e => {
  if (e.target.closest('input, button')) overviewFocusTarget = overviewCellPos(e.target);
}, true);

// Schnellbewertung aus der Tabelle: Datum erst beim Tippen bestimmen – die Tabelle kann über Nacht offen
// gewesen sein (Regel 24); am Wochenende der nächste Schultag (Regel 17, BUGS S4)
function openQuickRatingFromTable(studentId) {
  // Heute bzw. letzter Schultag (Wochenende, Ferien) – nie ein Tag in der Zukunft (Regel 58, R3)
  openSeatingStudentModal(studentId, currentOverviewGroupId, profileDefaultDate());
}

// ─── Inline Updates ────────────────────────────────────────────────────────
// Kürzel in der Anwesenheits-Tabelle (Eingabe und Anzeige)
const ATTENDANCE_SHORT = { abwesend: 'F', entschuldigt: 'E', 'zuspät': 'Z' };
// Pro Schüler und Tag höchstens einer dieser Einträge
const DAY_ATTENDANCE_TYPES = ['abwesend', 'entschuldigt', 'zuspät'];

function updateInlineGrade(studentId, date, label, value, type = 'test', nth = 0) {
  value = value.trim();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.grades) s.grades = [];

  const grade = findColumnGrade(s, { date, label, type, nth });
  // Weitere Spalte gleichen Namens (nth > 0), aber in den vorigen fehlt noch etwas: Die Note landete nach dem
  // Neuzeichnen in der ersten Spalte (BUGS U7)
  if (!grade && value && nth > 0 && !findColumnGrade(s, { date, label, type, nth: nth - 1 })) {
    showToast('Bitte zuerst die erste Spalte „' + label + '“ ausfüllen – gleichnamige Spalten füllen sich von links', 'error');
    renderOverviewTable();
    return;
  }

  if (!value) {
    if (grade) s.grades.splice(s.grades.indexOf(grade), 1);
  } else {
    const scale = gradeScale(currentOverviewGroupId);
    // Wie im Notenformular: Text ohne Ziffern („+“, „n. b.“) bleibt stehen und zählt nicht (BUGS B, Q13)
    const parsed = parseGradeInput(value, scale);
    if (!parsed) {
      showToast(scale.inputError, 'error');
      renderOverviewTable(); // Reset input
      return;
    }
    if (parsed.number === null) showToast(`„${parsed.value}“ gespeichert – zählt nicht im Schnitt`);
    const finalValue = parsed.value;
    if (grade) {
      grade.value = finalValue; // Typ gehört zur Spalte und bleibt (BUGS K4)
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

  // Nur ein leeres Feld löscht. Ein Tippfehler („U“ statt „E“) darf den Eintrag samt Grund nicht still entfernen (BUGS K5).
  if (value && !status) {
    showToast('Bitte F, E oder Z eingeben (leer = Eintrag löschen)', 'error');
    renderOverviewTable(); // Eingabe zurücksetzen
    return;
  }
  const wasUnexcused = idx !== -1 && s.attendance[idx].type === 'abwesend';
  if (!status) {
    if (idx !== -1) s.attendance.splice(idx, 1);
  } else {
    if (idx !== -1) {
      s.attendance[idx].type = status;
    } else {
      s.attendance.push({ id: uid(), date, type: status, note: '' });
    }
  }
  // Hinweis „… hat letzte Stunde unentschuldigt gefehlt“ wie im Sitzplan pflegen (BUGS L3, Regel 25)
  if (wasUnexcused && status !== 'abwesend') removeAbsenceNote(currentOverviewGroupId, date, s);
  if (!wasUnexcused && status === 'abwesend') addAbsenceNote(currentOverviewGroupId, date, s);
  saveDB();
  renderOverviewTable();
}

function updateInlineHomework(studentId, date, label, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];

  const idx = s.homework.findIndex(h => h.date === date && (h.note||'') === (label||''));
  // Nur ein leeres Feld löscht (Regel 36, BUGS Q9)
  if (value && value !== 'X' && value !== 'HA') {
    showToast('Bitte X eingeben (leer = Eintrag löschen)', 'error');
    renderOverviewTable(); // Eingabe zurücksetzen
    return;
  }
  if (value) {
    if (idx === -1) s.homework.push({ date: date, id: uid(), note: label||'' });
  } else {
    if (idx !== -1) s.homework.splice(idx, 1);
  }
  saveDB();
  renderOverviewTable();
}

// Notentyp in einer Auswahlliste setzen. Fehlt er dort (Spalten-Dialog kennt nur Test/KA, Altdaten „klausur“),
// wird er vorübergehend ergänzt – sonst liest das Feld '' und das Speichern löscht den Typ (BUGS K3).
function setGradeTypeSelect(select, type) {
  select.querySelectorAll('option[data-extra]').forEach(o => o.remove());
  if (![...select.options].some(o => o.value === type)) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = gradeTypeName(type);
    opt.dataset.extra = '1';
    select.appendChild(opt);
  }
  select.value = type;
}

// Spalten der Notentabelle: Datum + Titel + Typ (BUGS K4). Noten ohne Titel heißen wie ihr Typ.
// Hat ein Schüler mehrere Noten in derselben Spalte, bekommt jede weitere eine eigene (nth = 1, 2, …),
// statt unsichtbar mitzuzählen.
function gradeColumnLabel(g) { return g.note ?? gradeTypeLabel(g.type); }
function gradeColumnType(type) { return type || 'test'; }
function gradeInColumn(g, col) {
  return g.date === col.date && gradeColumnLabel(g) === col.label && gradeColumnType(g.type) === gradeColumnType(col.type);
}
function findColumnGrade(s, col) {
  let n = col.nth || 0;
  return (s.grades || []).find(g => gradeInColumn(g, col) && n-- === 0) || null;
}
function gradeColumns(group, students) {
  const cols = new Map();
  const keyOf = (date, label, type, nth) => JSON.stringify([date, label, gradeColumnType(type), nth]);
  (group.gradeEvents || []).forEach(ev => {
    cols.set(keyOf(ev.date, ev.label, ev.type, 0), { date: ev.date, label: ev.label, type: gradeColumnType(ev.type), nth: 0 });
  });
  students.forEach(s => {
    const seen = {};
    (s.grades || []).forEach(g => {
      const label = gradeColumnLabel(g);
      const base = keyOf(g.date, label, g.type, 0);
      const nth = seen[base] = base in seen ? seen[base] + 1 : 0;
      const key = keyOf(g.date, label, g.type, nth);
      if (!cols.has(key)) cols.set(key, { date: g.date, label, type: gradeColumnType(g.type), nth });
    });
  });
  return [...cols.values()].sort((a, b) => a.date.localeCompare(b.date));
}

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

// ─── Column Management ───────────────────────────────────────────────────
let editingColumnCtx = null;

function openAddColumnModal() {
  editingColumnCtx = null;
  document.getElementById('column-modal-title').textContent = 'Neue Spalte';
  document.getElementById('btn-delete-column').classList.add('hidden');
  document.getElementById('new-col-date').value = formatDate(new Date());
  document.getElementById('new-col-label').value = '';
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    setGradeTypeSelect(document.getElementById('new-col-type'), 'test');
  } else {
    document.getElementById('new-col-type-group').style.display = 'none';
  }
  
  openModal('modal-add-column');
  setTimeout(() => document.getElementById('new-col-label').focus(), 80);
}

function openEditColumnModal(oldDate, oldLabel, oldType, nth = 0) {
  editingColumnCtx = { oldDate, oldLabel, oldType: gradeColumnType(oldType), nth };
  document.getElementById('column-modal-title').textContent = 'Spalte bearbeiten';
  document.getElementById('btn-delete-column').classList.remove('hidden');
  document.getElementById('new-col-date').value = oldDate;
  document.getElementById('new-col-label').value = oldLabel;
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    setGradeTypeSelect(document.getElementById('new-col-type'), oldType || 'test');
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

  // Zwei Notenspalten mit gleichem Datum, Titel und Typ würden verschmelzen (BUGS K4)
  if (currentOverviewTab === 'grades') {
    const ctx = editingColumnCtx;
    const same = (c, d, l, t) => c.date === d && c.label === l && c.type === gradeColumnType(t);
    const clash = gradeColumns(group, students).some(c => c.nth === 0 && same(c, newDate, newLabel, type)
      && !(ctx && same(c, ctx.oldDate, ctx.oldLabel, ctx.oldType)));
    if (clash) { showToast('Diese Spalte gibt es schon (gleiches Datum, gleicher Titel und Typ)', 'error'); return; }
  } else {
    // Mitarbeit/HA: Spalte = Datum + Titel, Anwesenheit: Datum. Eine zweite Spalte gleichen Schlüssels ließe
    // Einträge verschmelzen (doppelt zählen, nur einer löschbar; BUGS Q6)
    const keyOf = (d, l) => currentOverviewTab === 'attendance' ? d : `${d}_${l || ''}`;
    const newKey = keyOf(newDate, newLabel);
    const ctx = editingColumnCtx;
    if (!ctx || keyOf(ctx.oldDate, ctx.oldLabel) !== newKey) {
      if (overviewColumnKeys(group, students).has(newKey)) {
        showToast('Diese Spalte gibt es schon (gleiches Datum' + (currentOverviewTab === 'attendance' ? ')' : ' und gleicher Titel)'), 'error');
        return;
      }
    }
  }

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
    const { oldDate, oldLabel, oldType, nth } = editingColumnCtx;
    let events = [];
    if (currentOverviewTab === 'grades') events = group.gradeEvents || [];
    if (currentOverviewTab === 'participation') events = group.participationEvents || [];
    if (currentOverviewTab === 'attendance') events = group.attendanceEvents || [];
    if (currentOverviewTab === 'homework') events = group.homeworkEvents || [];
    
    const evIdx = events.findIndex(e => e.date === oldDate && e.label === oldLabel
      && (currentOverviewTab !== 'grades' || gradeColumnType(e.type) === oldType));
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
        const grade = findColumnGrade(s, { date: oldDate, label: oldLabel, type: oldType, nth });
        if (grade) { grade.date = newDate; grade.note = newLabel; grade.type = type; }
      } else if (currentOverviewTab === 'participation') {
        const pIdx = (s.participation||[]).findIndex(p => p.date === oldDate && (p.label||'') === (oldLabel||''));
        if (pIdx !== -1) { s.participation[pIdx].date = newDate; s.participation[pIdx].label = newLabel; }
      } else if (currentOverviewTab === 'attendance') {
        const aIdx = (s.attendance||[]).findIndex(a => a.date === oldDate);
        if (aIdx !== -1) {
          const a = s.attendance[aIdx];
          // Fehl-Hinweis wandert mit in die Stunde nach dem neuen Datum (Regel 25, BUGS U5)
          if (a.type === 'abwesend' && newDate !== oldDate) removeAbsenceNote(currentOverviewGroupId, oldDate, s);
          a.date = newDate;
          if (a.type === 'abwesend' && newDate !== oldDate) addAbsenceNote(currentOverviewGroupId, newDate, s);
        }
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

// Schlüssel der vorhandenen Spalten im aktuellen Reiter (außer Noten): angelegte Spalten und Einträge
function overviewColumnKeys(group, students) {
  const keys = new Set();
  const tab = currentOverviewTab;
  if (tab === 'attendance') {
    (group.attendanceEvents || []).forEach(e => keys.add(e.date));
    students.forEach(st => (st.attendance || []).forEach(a => keys.add(a.date)));
  } else if (tab === 'participation') {
    (group.participationEvents || []).forEach(e => keys.add(`${e.date}_${e.label || ''}`));
    students.forEach(st => (st.participation || []).forEach(p => keys.add(`${p.date}_${p.label || ''}`)));
  } else if (tab === 'homework') {
    (group.homeworkEvents || []).forEach(e => keys.add(`${e.date}_${e.label || ''}`));
    students.forEach(st => (st.homework || []).forEach(h => keys.add(`${h.date}_${h.note || ''}`)));
  }
  return keys;
}

// Spalte samt ihren Einträgen löschen, nach Rückfrage mit Anzahl (BUGS L5). Gelöscht wird per Referenz.
function deleteOverviewColumn() {
  const ctx = editingColumnCtx;
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  if (!ctx || !group) return;
  const tab = currentOverviewTab;
  const students = db.students[currentOverviewGroupId] || [];
  const { oldDate: date, oldLabel: label, oldType, nth } = ctx;
  const sameLabel = (a, b) => (a || '') === (b || '');
  const COLUMN_KINDS = {
    grades: {
      list: 'grades', events: 'gradeEvents', nouns: ['Note', 'Noten'],
      entries: s => { const g = findColumnGrade(s, { date, label, type: oldType, nth }); return g ? [g] : []; },
      isEvent: e => e.date === date && e.label === label && gradeColumnType(e.type) === oldType,
    },
    attendance: {
      list: 'attendance', events: 'attendanceEvents', nouns: ['Fehlzeit', 'Fehlzeiten'],
      entries: s => (s.attendance || []).filter(a => a.date === date),
      isEvent: e => e.date === date,
    },
    participation: {
      list: 'participation', events: 'participationEvents', nouns: ['Mitarbeit-Eintrag', 'Mitarbeit-Einträge'],
      entries: s => (s.participation || []).filter(p => p.date === date && sameLabel(p.label, label)),
      isEvent: e => e.date === date && sameLabel(e.label, label),
    },
    homework: {
      list: 'homework', events: 'homeworkEvents', nouns: ['Eintrag', 'Einträge'],
      entries: s => (s.homework || []).filter(h => h.date === date && sameLabel(h.note, label)),
      isEvent: e => e.date === date && sameLabel(e.label, label),
    },
  };
  const kind = COLUMN_KINDS[tab];
  if (!kind) return;
  const found = students.map(s => [s, kind.entries(s)]);
  const n = found.reduce((sum, [, list]) => sum + list.length, 0);
  const title = formatDateShort(date) + (label ? ` „${label}“` : '');
  const msg = n
    ? `Spalte ${title} löschen?\n\nDamit werden ${n} ${n === 1 ? kind.nouns[0] : kind.nouns[1]} gelöscht. Das lässt sich nicht rückgängig machen.`
    : `Leere Spalte ${title} löschen?`;
  if (!confirm(msg)) return;

  found.forEach(([s, list]) => list.forEach(entry => {
    const arr = s[kind.list];
    const idx = arr.indexOf(entry);
    if (idx === -1) return;
    arr.splice(idx, 1);
    if (tab === 'attendance' && entry.type === 'abwesend') removeAbsenceNote(currentOverviewGroupId, entry.date, s);
  }));
  if (group[kind.events]) group[kind.events] = group[kind.events].filter(e => !kind.isEvent(e));
  saveDB();
  editingColumnCtx = null;
  closeModal('modal-add-column');
  renderOverviewTable();
  showToast('Spalte gelöscht');
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
  setClassViewHeader(g);
  switchView('students');
  switchClassDashboardTab(initialTab);
}

// Klasse groß, Fach klein wie in Stundenplan und Klassenkarten (BUGS I13); auch nach dem Bearbeiten (L7)
function setClassViewHeader(g) {
  document.getElementById('student-view-title').textContent = g.className;
  document.getElementById('student-view-subtitle').textContent = `${g.subject}${g.year ? ' · ' + g.year : ''}`;
}

// Nach dem Austausch der ganzen DB (Import, „Alle Daten löschen“, Cloud-Übernahme): gemerkte Klassen
// prüfen und die offene Ansicht mit den neuen Daten zeichnen (Regel 10).
function resetViewSelection() {
  const exists = id => !!id && (db.groups || []).some(g => g.id === id);
  if (!exists(currentSeatingGroupId)) currentSeatingGroupId = '';
  if (!exists(lastSeatingGroupId)) lastSeatingGroupId = '';
  if (!exists(currentOverviewGroupId)) currentOverviewGroupId = null;
  const active = document.querySelector('.view.active');
  const name = active ? active.id.replace('view-', '') : '';
  if (name === 'students') {
    if (exists(currentGroupId)) openGroupStudents(currentGroupId, currentClassDashboardTab);
    else goBackToSubjects();
  } else if (name === 'seating' && exists(currentSeatingGroupId)) {
    // Nur neu zeichnen: initSeatingPlan schlüge wieder die Klasse der laufenden Stunde vor (BUGS S2, E1)
    renderSeatingGroupSelect(); renderSeatingDateStrip(); renderSeatingPlan();
  } else if (name) {
    switchView(name);
  }
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
      <div class="empty-state-desc">Einzeln anlegen oder eine Namensliste einfügen (z. B. aus Excel).</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px">
        <button class="btn-primary" onclick="openAddStudent()">Schüler hinzufügen</button>
        <button class="btn-secondary" onclick="openImportStudentsModal()">Liste einfügen</button>
      </div>
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
    const avatarColor = AVATAR_COLORS[avatarIdx];
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
      <div class="student-avatar" style="--avatar:${avatarColor}">${escHtml(initials.toUpperCase())}</div>
      <div class="student-info">
        <div class="student-name">${escHtml(studentListName(s))}</div>
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
        ? `<div class="student-grade-badge" style="color:${gradeColor(avg, scale)}">${formatGradeAverage(avg)}</div>`
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
      btn.setAttribute('aria-label', 'Bearbeiten beenden');
      // Change onclick so it directly exits edit mode instead of opening modal
      btn.onclick = toggleStudentEditMode;
    } else {
      // Wieder wie in index.html: Listen-Symbol (der Stift sah aus wie „Klasse bearbeiten“, BUGS U9)
      btn.innerHTML = icon('list');
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-icon');
      btn.style.width = '';
      btn.title = 'Schüler hinzufügen, importieren …';
      btn.setAttribute('aria-label', 'Schüler hinzufügen, importieren und mehr');
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
  const removed = db.students[currentGroupId].filter(s => idsToDelete.has(s.id));
  db.students[currentGroupId] = db.students[currentGroupId].filter(s => !idsToDelete.has(s.id));
  cleanUpDeletedStudents(currentGroupId, removed); // auch Sitzplätze (BUGS Q10)
  
  
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
  
  // Nur gegen Schüler prüfen, die schon vorher in der Klasse waren: zwei „Lukas Meier“ sind zwei Kinder (BUGS U4)
  const before = [...db.students[currentGroupId]];
  let count = 0;
  fromStudents.forEach(s => {
    if (skipDups) {
      const exists = before.some(existing => 
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
  
  // Doppelte nur gegen Schüler prüfen, die schon vorher in der Klasse waren: zwei „Lukas Meier“ in derselben
  // Liste sind zwei Kinder (BUGS Q14)
  const before = [...db.students[currentGroupId]];
  let count = 0;
  lines.forEach(line => {
    // Aus Excel kopiert: Spalten sind durch Tabs getrennt (Vorname | Nachname), sonst letztes Wort = Nachname.
    // „Nachname, Vorname“ (übliches Format in Schullisten): vor dem Komma steht der Nachname (BUGS Q7).
    let firstName, lastName;
    if (!line.includes('\t') && line.includes(',')) {
      const [last, ...rest] = line.split(',');
      lastName = last.trim();
      firstName = rest.join(' ').trim().replace(/\s+/g, ' ');
    } else if (line.includes('\t')) {
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
        const exists = before.some(existing => 
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
  // Ein Name genügt: der Import erlaubt Schüler mit nur einem Namen, die müssen bearbeitbar bleiben (BUGS L8)
  if (!firstName && !lastName) { showToast('Bitte einen Namen eingeben', 'error'); return; }
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  if (editingStudentId) {
    const s = db.students[currentGroupId].find(x => x.id === editingStudentId);
    if (s) {
      const oldStudent = { firstName: s.firstName, lastName: s.lastName };
      Object.assign(s, { firstName, lastName, notes });
      renameAbsenceNotes(currentGroupId, oldStudent, s);
    }
  } else {
    db.students[currentGroupId].push({ id:uid(), firstName, lastName, notes, grades:[], studentNotes:[], attendance:[] });
  }
  saveDB();
  closeModal('modal-add-student');
  refreshStudentViews(currentGroupId); // auch eine offene Tabelle (BUGS Q4)
  showToast(editingStudentId ? 'Schüler geändert ✓' : 'Schüler hinzugefügt ✓');
  editingStudentId = null;
}

// ─── Student Detail ───────────────────────────────────────────────────────
function openStudentDetail(studentId, initialTab = 'grades') {
  const s = (db.students[currentGroupId]||[]).find(x => x.id === studentId);
  if (!s) return;
  currentStudentId = studentId;
  const group = db.groups.find(g => g.id === currentGroupId);
  document.getElementById('sdetail-name').textContent = `${s.firstName || ''} ${s.lastName || ''}`.trim();
  document.getElementById('sdetail-group').textContent = group ? `${group.subject} · Klasse ${group.className}` : '';
  renderStudentDetailLists(s);
  resetProfileDates();
  switchStudentTab(initialTab);
  openModal('modal-student-detail');
}
// Alle Listen im offenen Schülerprofil neu zeichnen (z. B. nach „Rückgängig“)
function renderStudentDetailLists(s) {
  renderGradesList(s);
  renderStudentNotesList(s);
  renderAttendanceList(s);
  renderStudentParticipationList(s);
  renderStudentHomeworkList(s);
}
function refreshOpenProfile(s) {
  if (document.getElementById('modal-student-detail').classList.contains('hidden')) return;
  const cur = getCurrentStudent();
  if (cur && cur === s) renderStudentDetailLists(s);
}
// Datumsfelder im Profil: heute, am Wochenende der letzte Schultag – meist trägt man für den Tag selbst ein
function profileDefaultDate(now = new Date()) {
  return formatDate(isSchoolDay(now) ? now : addSchoolDays(now, -1));
}
function resetProfileDates() {
  const d = profileDefaultDate();
  ['new-att-date', 'new-hw-student-date', 'new-student-note-date'].forEach(id => { document.getElementById(id).value = d; });
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
          <div class="grade-avg-label">${escHtml(gradeTypeName(type))} (${vals.length})</div>
        </div>`;
      }).join('')}`;
  }
  const list = document.getElementById('grades-list');
  list.innerHTML = '';
  if (!grades.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Noten erscheinen hier.</div>'; return; }
  [...grades].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach((g,i) => {
    const color = gradeColor(gradeNumber(g.value), scale);
    const el = document.createElement('div');
    el.className = 'grade-item';
    el.style.cursor = 'pointer';
    el.title = 'Klicken zum Bearbeiten';
    // Beim Antippen per Referenz im aktuellen Stand suchen: Ist die DB inzwischen ersetzt (Import, Cloud), stimmt ein
    // beim Zeichnen gemerkter Index nicht mehr und öffnete eine andere Note (BUGS Q5, Regel 9)
    el.onclick = () => {
      const cur = getCurrentStudent();
      const idx = cur && cur.id === s.id ? (cur.grades || []).indexOf(g) : -1;
      if (idx === -1) {
        showToast('Die Liste war veraltet und wurde neu geladen – bitte noch einmal tippen', 'error');
        if (cur) renderGradesList(cur);
        return;
      }
      openGradeForm(s.id, currentGroupId, idx);
    };
    el.innerHTML = `
      <div class="grade-value" style="color:${color}">${escHtml(gradeText(g.value))}</div>
      <div class="grade-type-badge">${escHtml(gradeTypeName(g.type))}</div>
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
  offerProfileUndo('Anmerkung gelöscht', s, 'studentNotes', note);
}
// Ein Tipp aufs ✕ löscht sofort – deshalb „Rückgängig“ wie im Sitzplan (BUGS U3, Regel 45)
function offerProfileUndo(msg, s, list, entry, after) {
  const groupId = currentGroupId;
  showUndoToast(msg, () => restoreSeatingEntry(groupId, s, list, entry, after));
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
  document.getElementById('new-student-note-date').value=profileDefaultDate();
}

function renderAttendanceList(s) {
  const att  = s.attendance||[];
  const list = document.getElementById('attendance-list');
  list.innerHTML='';
  if (!att.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Keine Einträge.</div>'; return; }
  // Wie in Tabelle und Auswahl: „Unentschuldigt“, „Entschuldigt“ grün, „Zu spät“ (BUGS U10)
  const typeColors = { abwesend:'var(--danger)', entschuldigt:'var(--success)', 'zuspät':'var(--warning)' };
  const typeNames = { abwesend:'Unentschuldigt', entschuldigt:'Entschuldigt', 'zuspät':'Zu spät' };
  [...att].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(a => {
    const el = document.createElement('div');
    el.className='entry-item';
    el.innerHTML=`
      <span style="color:${typeColors[a.type]||'inherit'};font-weight:600;min-width:86px;font-size:12px">${escHtml(typeNames[a.type] || a.type)}</span>
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
  // Fehlen, entschuldigt und „zu spät“ schließen sich am selben Tag aus. Ein nachgetragener Grund („Attest“)
  // ersetzt das „Unentschuldigt“ aus dem Sitzplan, statt einen zweiten Eintrag anzulegen (BUGS Q2).
  const existing = s.attendance.find(a => a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  const wasUnexcused = !!existing && existing.type === 'abwesend';
  if (existing) {
    existing.type = type;
    if (note) existing.note = note;
  } else {
    s.attendance.push({ id: uid(), date, type, note });
  }
  if (wasUnexcused && type !== 'abwesend') removeAbsenceNote(currentGroupId, date, s);
  if (!wasUnexcused && type === 'abwesend') addAbsenceNote(currentGroupId, date, s); // wie im Sitzplan (BUGS L3, Regel 25)
  saveDB(); renderAttendanceList(s); refreshStudentViews(currentGroupId);
  if (existing) showToast('Eintrag vom ' + formatDateShort(date) + ' geändert');
  document.getElementById('new-att-date').value=profileDefaultDate();
  document.getElementById('new-att-note').value='';
}

function deleteAttendance(a) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.attendance||[]).indexOf(a);
  if (idx === -1) { renderAttendanceList(s); return; }
  // Schülerdetail gehört zu currentGroupId (getCurrentStudent), nicht zur Klassenübersicht
  const groupId = currentGroupId;
  if (a.type === 'abwesend') removeAbsenceNote(groupId, a.date, s);
  s.attendance.splice(idx,1); saveDB(); renderAttendanceList(s); refreshStudentViews(groupId);
  offerProfileUndo('Fehlzeit gelöscht', s, 'attendance', a, a.type === 'abwesend' ? () => addAbsenceNote(groupId, a.date, s) : null);
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
  s.participation.splice(idx, 1); saveDB(); renderStudentParticipationList(s); refreshStudentViews(currentGroupId);
  offerProfileUndo('Mitarbeit gelöscht', s, 'participation', p);
}

function renderStudentHomeworkList(s) {
  const list = document.getElementById('student-homework-list');
  if (!list) return;
  // Die Bemerkung ist der Spaltentitel in der HA-Tabelle: vorhandene Titel vorschlagen (BUGS Q15)
  const titles = document.getElementById('hw-column-titles');
  if (titles) {
    const group = db.groups.find(g => g.id === currentGroupId);
    const labels = new Set([...(group && group.homeworkEvents || []).map(e => e.label || ''),
      ...(db.students[currentGroupId] || []).flatMap(st => (st.homework || []).map(h => h.note || ''))]);
    labels.delete('');
    titles.innerHTML = [...labels].sort().map(l => `<option value="${escHtml(l)}"></option>`).join('');
  }
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
      <button class="btn-icon btn-danger-icon" aria-label="Löschen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;
  }).join('');
  // Per Closure mit dem Eintrag, nicht per Inline-Handler (Regel 9)
  list.querySelectorAll('.btn-danger-icon').forEach((btn, i) => { btn.onclick = () => deleteStudentHomework(sorted[i].id); });
}

function addStudentHomework() {
  const date = document.getElementById('new-hw-student-date').value;
  const note = document.getElementById('new-hw-student-note').value.trim();
  if (!date) { showToast('Bitte Datum wählen', 'error'); return; }
  const s = getCurrentStudent(); if (!s) return;
  if (!s.homework) s.homework = [];
  // Gleicher Tag + gleiche Spalte gibt es schon (z. B. im Sitzplan eingetragen): sonst zählte er doppelt (BUGS U1)
  if (s.homework.some(h => h.date === date && (h.note || '') === note)) {
    showToast('Für den ' + formatDateShort(date) + ' ist das schon eingetragen', 'error');
    return;
  }
  s.homework.push({ id: uid(), date: date, note: note });
  saveDB();
  renderStudentHomeworkList(s);
  refreshStudentViews(currentGroupId);
  document.getElementById('new-hw-student-date').value = profileDefaultDate();
  document.getElementById('new-hw-student-note').value = '';
}

function deleteStudentHomework(id) {
  const s = getCurrentStudent(); if (!s) return;
  const entry = (s.homework || []).find(h => h.id === id);
  if (!entry) { renderStudentHomeworkList(s); return; }
  s.homework.splice(s.homework.indexOf(entry), 1);
  saveDB();
  renderStudentHomeworkList(s);
  refreshStudentViews(currentGroupId);
  offerProfileUndo('Eintrag gelöscht', s, 'homework', entry);
}

function deleteCurrentStudent() {
  if (!confirm('Schüler wirklich löschen?')) return;
  const removed = (db.students[currentGroupId]||[]).filter(s=>s.id===currentStudentId);
  db.students[currentGroupId]=(db.students[currentGroupId]||[]).filter(s=>s.id!==currentStudentId);
  cleanUpDeletedStudents(currentGroupId, removed);
  saveDB(); closeModal('modal-student-detail'); refreshStudentViews(currentGroupId); renderSubjectGroups();
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
  // Das Profil gehört zu currentGroupId (getCurrentStudent), nicht zur zuletzt geöffneten Tabelle
  const group = db.groups.find(g => g.id === currentGroupId);
  const subjName = group ? (group.subject + ' ' + group.className) : 'Unbekannte Klasse';
  const points = gradeScale(group).higherIsBetter;
  
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

  const avg = calculateStudentAverage(s, currentGroupId);
  const avgText = avg === null ? '-' : points ? formatGradeAverage(avg) + ' Punkte' : formatGradeAverage(avg, 2);
  txt += `=== NOTEN (Aktueller Schnitt: ${avgText}) ===\n`;
  if (s.grades && s.grades.length > 0) {
    const sortedGrades = [...s.grades].sort(byDate);
    sortedGrades.forEach(g => {
      txt += `${dateStr(g.date)} | ${g.note || gradeTypeName(g.type)} | ${gradeCategory(g.type) === 'schularbeit' ? 'Klassenarbeit' : 'Sonstige Leistung'} | ${points ? 'Punkte' : 'Note'}: ${gradeText(g.value)}\n`;
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
  
  txt += `=== HAUSAUFGABEN VERGESSEN ===\n`;
  if (s.homework && s.homework.length > 0) {
    [...s.homework].sort(byDate).forEach(h => { txt += `${dateStr(h.date)}${h.note ? ' | ' + h.note : ''}\n`; });
  } else {
    txt += `Keine vergessenen Hausaufgaben eingetragen.\n`;
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

// Die Leiste wird nur über ☰ umgeschaltet (BUGS I3: früher klappte jeder Klick in den Inhalt sie zu,
// und der Inhalt sprang unter dem Finger nach links). Auf schmalen Bildschirmen (iPad hochkant) startet
// sie zugeklappt; unter 601 px ist sie ohnehin eine Leiste oben.
function applyInitialSidebar() {
  const w = window.innerWidth;
  document.getElementById('sidebar').classList.toggle('collapsed', w > 600 && w < 1024);
}
applyInitialSidebar();

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
  fillSettingsForm();
  openModal('modal-settings');
}
// Felder und Blöcke-Entwurf aus db füllen – beim Öffnen und nach einer Cloud-Übernahme (BUGS P2)
function fillSettingsForm() {
  document.getElementById('settings-teacher-name').value = db.settings.teacherName||'';
  document.getElementById('settings-school').value       = db.settings.school||'';
  document.getElementById('settings-seating-buffer').value = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
  document.getElementById('settings-warn-absences').value = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  document.getElementById('settings-warn-homework').value = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  document.getElementById('settings-warn-grade').value = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  document.getElementById('settings-warn-points').value = db.settings.warnPoints !== undefined ? db.settings.warnPoints : 5;
  
  loadThemeSelection();
  document.getElementById('settings-sort-order').value = db.settings.studentSortOrder || 'firstName';
  const v = appVersion();
  document.getElementById('app-version-label').textContent = v ? `Version ${v}` : '';
  blocksDraft = getBlocks().map(b => ({ ...b }));
  renderBlocksEditor();
  holidaysDraft = (Array.isArray(db.settings.holidays) ? db.settings.holidays : []).filter(h => h && typeof h === 'object').map(h => ({ ...h }));
  renderHolidaysEditor();
  document.getElementById('settings-federal-state').value = FEDERAL_STATES[db.settings.federalState] ? db.settings.federalState : '';
  settingsSnapshot = settingsFormState(); // Vergleich für „Änderungen verwerfen?“ (BUGS S7)
}

// Datenschutzhinweise (BUGS Y1): nur Text, liegt über den Einstellungen
function openPrivacyNotice() {
  openModal('modal-privacy');
}

// Versionsnummer aus index.html (app.js?v=N, gesetzt von npm run bump), für Rückfragen bei Problemen (BUGS I22)
function appVersion() {
  const src = [...document.querySelectorAll('script[src]')].map(e => e.getAttribute('src')).find(x => /(^|\/)app\.js\?v=/.test(x));
  const m = src && src.match(/v=(\d+)/);
  return m ? m[1] : '';
}

function applyThemePreview() {
  const radEl = document.getElementById('settings-radius');
  document.documentElement.setAttribute('data-theme', currentThemeMode);

  const accent = document.querySelector('.settings-swatch-accent.selected') ? currentThemeAccent : (db.settings.themeAccent || '#6366f1');
  const bg = document.querySelector('.settings-swatch-bg.selected') ? currentThemeBg : savedThemeBg();
  const card = bg ? (document.querySelector('.settings-swatch-bg.selected') ? currentThemeCard : (db.settings.themeCard || null)) : null;
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
  const today = formatDate(now);
  // Früher geladene Einträge (Herkunft `source`) werden ersetzt – auch nach einem Bundesland-Wechsel. Eigene nie still.
  const imported = holidaysDraft.filter(h => h.source && h.until >= today);
  const manual = holidaysDraft.filter(h => !h.source);
  // Schon vergangene (z. B. die Sommerferien, wenn man im Oktober lädt) und von eigenen Einträgen abgedeckte nicht
  const fresh = [...schoolEntries, ...publicEntries].filter(c => c.until >= today && !covered(c, manual))
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
    + 'Bewegliche Ferientage deiner Schule kennt die Quelle nicht – die bitte selbst ergänzen.',
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
  showToast(`${n} ${word} eingetragen – mit „Speichern“ übernehmen`);
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
    + (halves ? `\n\n⚠️ Du hast ${halves === 1 ? '1 halbe Stunde' : halves + ' halbe Stunden'} (1./2. Hälfte). Bei Einzelstunden stehen sie danach in derselben Zeile – bitte im Stundenplan prüfen und ggf. auf eine eigene Stunde legen.` : ''),
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
  db.settings.warnAbsences = parseWarnThreshold('settings-warn-absences', 3);
  db.settings.warnHomework = parseWarnThreshold('settings-warn-homework', 3);
  db.settings.warnGrade    = parseWarnThreshold('settings-warn-grade', 4.5);
  db.settings.warnPoints   = parseWarnThreshold('settings-warn-points', 5);
  db.settings.theme       = currentThemeMode;
  // Nur eine wirklich gewählte Farbe speichern; Standard = nichts gespeichert (BUGS S6)
  if (currentThemeBg) { db.settings.themeBg = currentThemeBg; db.settings.themeCard = currentThemeCard; }
  else { delete db.settings.themeBg; delete db.settings.themeCard; }
  db.settings.themeAccent = currentThemeAccent;
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

  saveDB();
  closeModal('modal-settings');
  // Offene Ansicht mit den neuen Einstellungen zeichnen (Warnschwellen, Sortierung, Namensformat; BUGS M1/O4)
  renderScheduleViews();
  if (document.getElementById('view-students')?.classList.contains('active') && currentGroupId) refreshStudentViews(currentGroupId);
  showToast('Einstellungen gespeichert ✓');
  if (holidaysChanged) offerMoveHolidayItems(); // HA/Tests, die jetzt in die Ferien fallen (Y8); nur nach Änderung (R6)
}

// CSV-Feld in Anführungszeichen; Anführungszeichen im Wert werden verdoppelt (BUGS L11)
function csvCell(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }

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
    csvContent += [s.lastName, s.firstName, fmt(parts.schularbeit), fmt(parts.sonstige), fmt(total)].map(csvCell).join(';') + '\n';
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
  
  showToast('Daten erfolgreich gesichert! ✓');
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
function importBackup(parsed) {
  const nGroups = parsed.groups.length;
  const nStudents = Object.values(parsed.students || {}).reduce((n, list) => n + ((list && list.length) || 0), 0);
  const what = `${nGroups} ${nGroups === 1 ? 'Klasse' : 'Klassen'}, ${nStudents} ${nStudents === 1 ? 'Schüler' : 'Schüler'}`;
  const cloud = SyncManager.currentUser ? '\n\nDer Cloud-Sync ist aktiv: Die Sicherung ersetzt danach auch den Stand in der Cloud und auf deinen anderen Geräten.' : '';
  if (!confirm(`Sicherung laden (${what})?\n\nAlle Daten auf diesem Gerät werden durch die Sicherung ersetzt.${cloud}`)) return;
  const syncSettings = db.syncSettings;
  delete parsed.syncSettings;
  db = migrateDB(parsed);
  if (syncSettings) db.syncSettings = syncSettings;
  saveDB();
  updateAppliedThemeFromDB(); // Darstellung aus der Sicherung
  resetViewSelection();
  renderTimetable(); renderSubjectGroups(); closeModal('modal-settings');
  showToast('Importiert ✓');
}
function clearAllData() {
  const cloudHint = SyncManager.currentUser
    ? '\n\nDie Daten in der Cloud bleiben erhalten und werden beim nächsten Sync wieder geladen. Um auch sie zu löschen: „Alles löschen – auch in der Cloud“.'
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
// ihn wie jede Änderung; wer dort noch nicht übertragene Eingaben hat, bekommt den Konflikt-Dialog (BUGS Z1).
async function clearAllDataEverywhere() {
  if (!SyncManager.currentUser) return;
  if (!SyncManager.masterPassword) { alert('Bitte zuerst das Master-Passwort eingeben.'); return; }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    alert('Dafür braucht es eine Internetverbindung. Es wurde nichts gelöscht.');
    return;
  }
  if (syncRunning) { showToast('Gerade läuft ein Sync – bitte gleich noch einmal versuchen', 'error'); return; }
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
    const answer = await askChoice('Alles löschen – auch in der Cloud',
      'Alle Klassen, Schüler, Noten, Stunden und Einstellungen werden gelöscht: auf diesem Gerät, in der Cloud und auf '
      + 'allen deinen anderen Geräten, sobald sie sich abgleichen.\n\n' + (lines.length ? lines.join('\n') + '\n\n' : '')
      + 'Das lässt sich nicht rückgängig machen. Eine Sicherung ist danach die einzige Kopie.',
      [{ label: 'Sicherung speichern, dann alles löschen', value: 'backup', primary: true },
       { label: 'Ohne Sicherung alles löschen', value: 'delete', danger: true }]);
    if (!answer) return;
    if (answer === 'delete' && !confirm('Wirklich ohne Sicherung alles löschen – auch in der Cloud?\n\nDas lässt sich nicht rückgängig machen.')) return;
    if (answer === 'backup') {
      if (!localEmpty) exportData();
      // Steht in der Cloud etwas anderes (Änderungen anderer Geräte), das auch sichern
      if (cloudData && (localEmpty || !cloudMatchesLocal(cloud.data, JSON.stringify(db)))) downloadBackupFile(cloudData, '_Cloud');
    }

    const empty = emptyDB();
    empty.settings.lastModified = Date.now();
    // Kein pendingUpload (T4): Käme die Antwort nicht an, würde der nächste Sync sonst die Daten dieses Geräts
    // als „eigenen Stand“ wieder hochladen. So gibt es schlimmstenfalls den Konflikt-Dialog.
    const newTimestamp = cloud ? await SyncManager.saveToCloud(JSON.stringify(empty), cloud.cloudTimestamp) : null;

    // Gerät leeren. Mit Sync-Stand der leeren Cloud: Das Gerät gilt dann nicht als neu, sondern als abgeglichen.
    wipeLocalData();
    if (newTimestamp !== null) {
      db.settings.lastModified = empty.settings.lastModified;
      markSynced(newTimestamp, empty.settings.lastModified);
    }
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    SyncManager.updateStatus('synced');
    closeModal('modal-settings');
    updateSyncUI();
    showToast('Alles gelöscht – auf diesem Gerät und in der Cloud.');
  } catch (e) {
    if (e.name === 'WrongPasswordError') {
      rejectMasterPassword();
      alert('❌ Das Master-Passwort passt nicht zu den Daten in der Cloud. Es wurde nichts gelöscht.');
    } else if (e.name === 'CloudChangedError') {
      alert('Gerade hat ein anderes Gerät hochgeladen. Es wurde nichts gelöscht – bitte noch einmal versuchen.');
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
  replaceDB(loadDB());
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
  if (dateStr !== currentSeatingDateStr) hideSeatingGrades(); // anderer Tag: Noten wieder verbergen (BUGS S1)
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

// Klasse der laufenden (bzw. gleich beginnenden) Stunde. Über lessonsOnDate, damit halbe Blöcke ihre eigene Zeit
// haben und ausfallende Stunden nicht vorgeschlagen werden (BUGS S3).
function getSuggestedSeatingGroupId() {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const buffer = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
  const candidates = lessonsOnDate(formatDate(now)).filter(l => l.slot.groupId && !l.ausfall && l.range
    && nowMins >= l.range.start - buffer && nowMins <= l.range.end);
  const running = candidates.find(l => l.range.start <= nowMins && nowMins < l.range.end);
  // Läuft gerade eine und beginnt gleich die nächste (Vorlauf), gewinnt die nächste – wie bisher bei Blöcken
  const upcoming = candidates.find(l => l.range.start > nowMins);
  const hit = upcoming || running;
  return hit ? hit.slot.groupId : null;
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
    // Gibt es die Klasse in mehreren Fächern, steht das Fach dabei (BUGS N9)
    const twin = db.groups.some(g => g !== activeGroup && g.className === activeGroup.className);
    label.textContent = twin ? `${activeGroup.className} ${activeGroup.subject}` : activeGroup.className;
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
      const item = document.createElement('button'); // Knopf: per Tastatur/Screenreader erreichbar (BUGS N11)
      item.type = 'button';
      item.className = 'seating-group-item';
      item.style.border = 'none';
      item.style.fontFamily = 'inherit';
      item.style.minHeight = '36px';
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
        // Andere Klasse: deren Noten nicht gleich auf dem Beamer zeigen (Regel 16, BUGS S1)
        if (g.id !== currentSeatingGroupId) hideSeatingGrades();
        currentSeatingGroupId = g.id;
        menu.classList.add('hidden');
        renderSeatingGroupSelect();
        renderSeatingDateStrip(); // Unterrichtstage gehören zur Klasse
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
  const picker = document.getElementById('seating-date-hidden');
  if (picker) picker.value = formatDate(baseDate); // wie beim Stundenplan (BUGS M14)
  
  const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  for(let i = -2; i <= 2; i++) {
    const d = addSchoolDays(baseDate, i);
    const dStr = formatDate(d);
    
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'date-chip';
    if (dStr === currentSeatingDateStr) chip.classList.add('active');
    // Tage mit Unterricht dieser Klasse markieren (BUGS N10)
    const hasLesson = !!currentSeatingGroupId && lessonsOnDate(dStr).some(l => l.slot.groupId === currentSeatingGroupId && !l.ausfall);
    chip.classList.toggle('has-lesson', hasLesson);
    chip.setAttribute('aria-label', d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' }) + (hasLesson ? ', Unterricht' : ''));
    if (dStr === currentSeatingDateStr) chip.setAttribute('aria-current', 'date');

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
function hideSeatingGrades() {
  if (!seatingShowGrades) return;
  seatingShowGrades = false;
  updateSeatingGradesButton();
}
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
    btn.setAttribute('aria-pressed', 'true');
    btn.style.background = 'var(--success, #10b981)';
    btn.style.color = 'white';
    btn.style.border = 'none';
  } else {
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    btn.setAttribute('aria-pressed', 'false');
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
  if (popup && !popup.classList.contains('hidden') && !e.target.closest('#seating-settings-popup') && !e.target.closest('button[title="Raster-Größe einstellen"]')
      && !pressStartedIn(popup)) { // Text im Feld markiert und außerhalb losgelassen: offen lassen
    popup.classList.add('hidden');
  }
});

const SEATING_MIN = 2, SEATING_MAX_COLS = 20, SEATING_MAX_ROWS = 6; // Pult ist 2 Zellen breit

// Rastergröße einer Klasse; ungültige gespeicherte Werte (Altdaten, Sync) fallen auf den Standard
function seatingGridSize(g) {
  const ok = (v, max) => Number.isInteger(v) && v >= SEATING_MIN && v <= max;
  return { cols: ok(g.seatingCols, SEATING_MAX_COLS) ? g.seatingCols : 10, rows: ok(g.seatingRows, SEATING_MAX_ROWS) ? g.seatingRows : 5 };
}
// Lehrerpult (2 Zellen breit), immer ganz im Raster (BUGS N3)
function seatingDesk(g, cols, rows) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const x = Number.isInteger(g.teacherDeskX) ? g.teacherDeskX : Math.floor(cols / 2) - 1;
  const y = Number.isInteger(g.teacherDeskY) ? g.teacherDeskY : rows - 1;
  return { x: clamp(x, 0, cols - 2), y: clamp(y, 0, rows - 1) };
}
// Plätze für die Anzeige (BUGS N1): Ein gespeicherter Platz im Raster und nicht auf dem Pult bleibt;
// wer keinen gültigen hat, bekommt für die Anzeige den nächsten freien. In die Daten wird nichts
// geschrieben – so kommt nach Verkleinern und Vergrößern jeder wieder auf seinen Platz.
function seatingLayout(students, cols, rows, desk) {
  const key = (x, y) => x + ',' + y;
  const taken = new Set([key(desk.x, desk.y), key(desk.x + 1, desk.y)]);
  const seats = new Map(), unplaced = [], overflow = [];
  students.forEach(s => {
    const ok = Number.isInteger(s.gridX) && Number.isInteger(s.gridY) && s.gridX >= 0 && s.gridY >= 0
      && s.gridX < cols && s.gridY < rows && !taken.has(key(s.gridX, s.gridY));
    if (ok) { taken.add(key(s.gridX, s.gridY)); seats.set(s.id, { x: s.gridX, y: s.gridY }); }
    else unplaced.push(s);
  });
  unplaced.forEach(s => {
    let spot = null;
    for (let r = 0; r < rows && !spot; r++) for (let c = 0; c < cols && !spot; c++) if (!taken.has(key(c, r))) spot = { x: c, y: r };
    if (spot) { taken.add(key(spot.x, spot.y)); seats.set(s.id, spot); } else overflow.push(s);
  });
  return { seats, overflow, desk, cols, rows };
}
let lastSeatingLayout = null;
// Angezeigter Platz eines Schülers (für Gruppen nach Sitznähe)
function seatOf(s) {
  const seat = lastSeatingLayout && lastSeatingLayout.seats.get(s.id);
  return seat || { x: s.gridX || 0, y: s.gridY || 0 };
}
// Der Nutzer ordnet gerade um: den angezeigten Plan so übernehmen, wie er ihn sieht
function materializeSeatingLayout(groupId, layout) {
  (db.students[groupId] || []).forEach(s => {
    const seat = layout.seats.get(s.id);
    if (seat) { s.gridX = seat.x; s.gridY = seat.y; }
  });
}

function saveSeatingGrid() {
  const groupId = currentSeatingGroupId;
  if (!groupId) return;
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  // Nur ganze Zahlen im erlaubten Bereich; alles andere wird abgelehnt statt still ersetzt (BUGS N2)
  const read = (id, max) => {
    const v = document.getElementById(id).value.trim();
    return /^\d+$/.test(v) && +v >= SEATING_MIN && +v <= max ? +v : null;
  };
  const cols = read('seating-cols', SEATING_MAX_COLS), rows = read('seating-rows', SEATING_MAX_ROWS);
  if (cols === null || rows === null) {
    showToast(cols === null ? `Spalten: bitte eine Zahl von ${SEATING_MIN} bis ${SEATING_MAX_COLS}` : `Reihen: bitte eine Zahl von ${SEATING_MIN} bis ${SEATING_MAX_ROWS}`, 'error');
    renderSeatingPlan(); // Felder auf die gespeicherten Werte zurücksetzen
    return;
  }
  g.seatingCols = cols;
  g.seatingRows = rows;
  saveDB();
  renderSeatingPlan();
}

// Raster-Menü → „Reihen versetzt“: nur Darstellung, Plätze (gridX/gridY) bleiben (Regel 44, BUGS AA5)
function onToggleSeatingStagger(on) {
  const g = db.groups.find(x => x.id === currentSeatingGroupId);
  if (!g) return;
  if (on) g.seatingStagger = true; else delete g.seatingStagger;
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

  const { cols, rows } = seatingGridSize(g);
  document.getElementById('seating-cols').value = cols;
  document.getElementById('seating-rows').value = rows;

  const overflowHint = document.getElementById('seating-overflow-hint');
  overflowHint.classList.add('hidden');
  const students = db.students[groupId] || [];
  if (!students.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  const desk = seatingDesk(g, cols, rows);
  const layout = seatingLayout(students, cols, rows, desk);
  lastSeatingLayout = layout;
  if (layout.overflow.length) {
    const n = layout.overflow.length;
    overflowHint.textContent = `Raster zu klein: ${n} Schüler ${n === 1 ? 'hat' : 'haben'} keinen Platz (${layout.overflow.map(s => s.firstName || s.lastName).join(', ')}). Bitte das Raster vergrößern.`;
    overflowHint.classList.remove('hidden');
  }

  // Reset canvas size temporarily to get an accurate width without old scrollbars
  canvas.style.minWidth = '0px';
  canvas.style.minHeight = '0px';
  
  const wrapper = document.getElementById('seating-canvas-wrapper');
  const containerWidth = (wrapper ? wrapper.clientWidth : canvas.parentElement.clientWidth) - 40;
  const containerHeight = (wrapper ? wrapper.clientHeight : canvas.parentElement.clientHeight) - 40;
  
  // Versetzte Reihen (BUGS AA5): jede zweite Reihe einen halben Platz nach rechts, das Raster wird ein halbes Feld breiter
  const stagger = !!g.seatingStagger && rows > 1;
  const staggerChk = document.getElementById('seating-stagger');
  if (staggerChk) staggerChk.checked = !!g.seatingStagger;
  // Square cells: use the smaller of the two to keep cells perfectly square
  const maxCellW = containerWidth / (cols + (stagger ? 0.5 : 0));
  const maxCellH = containerHeight / rows;
  let cellSize = Math.floor(Math.min(maxCellW, maxCellH));
  // Handy hochkant: 10 Spalten ergaben ~34 px, Namen nur „A…“. Mindestens 60 px, dann seitlich scrollen (BUGS S16)
  const SEATING_MIN_CELL = 60;
  if (cellSize < SEATING_MIN_CELL && maxCellH >= SEATING_MIN_CELL) cellSize = SEATING_MIN_CELL;
  const cellWidth = cellSize;
  const cellHeight = cellSize;

  const isCompact = cellSize < 100;
  const isTiny = cellSize < 64;   // Handy: Namen kürzen statt mitten im Wort trennen (BUGS H13)
  // Abstand Karte ↔ Zellrand; auf dem Handy fast keiner, jeder Pixel Breite geht an den Namen (BUGS I20)
  const cardGap = isTiny ? 2 : Math.min(10, cellSize * 0.1);
  const rowShift = y => (stagger && y % 2 === 1 ? cellWidth / 2 : 0);
  const gridWidth = cols * cellWidth + (stagger ? cellWidth / 2 : 0);
  const gridHeight = rows * cellHeight;

  // Canvas wraps the grid exactly - no padding gap
  const offsetX = 0;
  const offsetY = 0;

  canvas.style.minWidth = gridWidth + 'px';
  canvas.style.maxWidth = gridWidth + 'px';
  canvas.style.minHeight = gridHeight + 'px';
  canvas.style.maxHeight = gridHeight + 'px';
  canvas.parentElement.style.overflow = gridWidth > containerWidth ? 'auto' : 'hidden';

  // Draw Grid Cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'seating-grid-cell' + (c % 2 === 1 ? ' thick-border' : '');
      cell.style.left = (offsetX + c * cellWidth + rowShift(r)) + 'px';
      cell.style.top = (offsetY + r * cellHeight) + 'px';
      cell.style.width = cellWidth + 'px';
      cell.style.height = cellHeight + 'px';
      canvas.appendChild(cell);
    }
  }

  const scale = gradeScale(groupId);
  // Gleiche Vornamen: Anfangsbuchstabe des Nachnamens dazu (BUGS N8)
  const firstCount = {};
  students.forEach(s => { firstCount[s.firstName] = (firstCount[s.firstName] || 0) + 1; });
  students.forEach((s) => {
    const seat = layout.seats.get(s.id);
    if (!seat) return; // kein Platz im Raster: steht im Hinweis darüber
    const rawAvg = calculateStudentAverage(s, groupId);
    const avg = formatGradeAverage(rawAvg);
    
    // check absence, hw and participation
    const absence = (s.attendance||[]).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    const late = (s.attendance||[]).some(a => a.date === dateStr && a.type === 'zuspät');
    const forgotHw = (s.homework||[]).some(h => h.date === dateStr);
    const participation = (s.participation||[]).find(p => p.date === dateStr && !p.label)
      || (s.participation||[]).find(p => p.date === dateStr);

    const card = document.createElement('div');
    card.className = 'seating-card';
    if (absence) {
      card.classList.add(absence.type === 'abwesend' ? 'is-absent-unexcused' : 'is-absent-excused');
    }
    if (forgotHw) {
      card.classList.add('forgot-hw');
    }
    card.dataset.id = s.id;
    // Für Tastatur und VoiceOver ein Knopf mit Namen (BUGS S12); Enter/Leertaste: siehe keydown unten
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.setAttribute('aria-label', [s.firstName, s.lastName].filter(Boolean).join(' '));
    
    const gx = seat.x, gy = seat.y;

    // Set dataset for grid pos
    card.dataset.gridX = gx;
    card.dataset.gridY = gy;
    
    const maxCardSize = Math.min(cellWidth, cellHeight);
    const padding = cardGap;
    const cardSize = maxCardSize - (padding * 2);

    const centerX = offsetX + gx * cellWidth + rowShift(gy) + (cellWidth - cardSize) / 2;
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
      // valLabels ist fertiges HTML; nur ein unbekannter Wert (Import/Sync) stammt aus den Daten und wird escaped
      partHtml = `<div class="sc-part" style="position:absolute; top:-6px; right:-6px; font-size:16px; font-weight:800; background:var(--bg-elevated); padding:0 6px; border-radius:8px; border:2px solid var(--border); box-shadow:0 2px 6px rgba(0,0,0,0.3); line-height:1.2; z-index:10;">${valLabels[participation.value] || escHtml(participation.value)}</div>`;
    }

    const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ');
    const shortName = !s.firstName ? (s.lastName || '')
      : firstCount[s.firstName] > 1 && s.lastName ? `${s.firstName} ${s.lastName[0]}.` : s.firstName;
    card.innerHTML = `
      <div class="sc-name" title="${escHtml(fullName)}">${escHtml(shortName)}</div>
      ${seatingShowGrades ? `<div class="sc-gpa" style="color:${gradeColor(rawAvg, scale)}">${avg}</div>` : ''}
      ${late ? '<div class="sc-late-note">Zu spät</div>' : ''}
      ${forgotHw ? '<div class="sc-hw-note">Keine HA</div>' : ''}
      ${partHtml}
    `;

    if (seatingEditMode) {
      makeDraggable(card, s.id, groupId, cellWidth, cellHeight, cols, rows, offsetX, 1, layout, rowShift);
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
    const tdX = desk.x, tdY = desk.y;

    const tDesk = document.createElement('div');
    tDesk.className = 'teacher-desk';
    const maxCardSize = Math.min(cellWidth, cellHeight);
    const padding = cardGap;
    const cardSize = maxCardSize - (padding * 2);

    const centerX = offsetX + tdX * cellWidth + rowShift(tdY) + (cellWidth * 2 - (cardSize * 2 + padding * 2)) / 2;
    const centerY = offsetY + tdY * cellHeight + (cellHeight - cardSize) / 2;

    tDesk.style.left = centerX + 'px';
    tDesk.style.top = centerY + 'px';
    tDesk.style.width = (cardSize * 2 + padding * 2) + 'px';
    tDesk.style.height = cardSize + 'px';
    tDesk.innerHTML = 'Lehrerpult';

    if (seatingEditMode) {
      makeDraggable(tDesk, 'teacherDesk', groupId, cellWidth, cellHeight, cols, rows, offsetX, 2, layout, rowShift);
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
  openModal('modal-seating-randomizer'); // Fokus-Übergabe und -Rückgabe (Regel 46, BUGS S11)
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
            Math.pow(seatOf(current).x - seatOf(candidate).x, 2) +
            Math.pow(seatOf(current).y - seatOf(candidate).y, 2)
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
// Bei nur einem Namen („Max“) ohne führendes Leerzeichen, sonst findet removeAbsenceNote den Hinweis nie (BUGS L4)
function absenceNoteText(s) { return `${[s.firstName, s.lastName].filter(Boolean).join(' ')} hat letzte Stunde unentschuldigt gefehlt`; }
// Nächste Stunde der Klasse nach dateStr, die wirklich stattfindet (A/B-Woche, Vertretung, Ausfall)
function nextLessonOfGroup(groupId, dateStr) {
  let d = parseDate(dateStr);
  for (let i = 0; i < 70; i++) {   // auch über die Sommerferien (Y8)
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
  // Fehlt ein gleichnamiger Schüler am selben Tag weiter unentschuldigt, gilt der Hinweis auch für ihn (BUGS Q10)
  const text = absenceNoteText(s);
  const twin = (db.students[groupId] || []).some(x => x !== s && absenceNoteText(x) === text
    && (x.attendance || []).some(a => a.date === dateStr && a.type === 'abwesend'));
  if (twin) return;
  replaceAbsenceNoteLines(groupId, dateStr, s, null);
}
// Hinweis-Zeilen dieses Schülers in den Stunden der Klasse bis 4 Wochen nach dateStr ersetzen (newText) oder
// entfernen (null). Zeilenweise, nie per replace auf dem ganzen Text (Regel 25).
function replaceAbsenceNoteLines(groupId, dateStr, s, newText) {
  const notes = [absenceNoteText(s)];
  // Ältere Versionen schrieben nur den Vornamen – den nur entfernen, wenn er in der Klasse eindeutig ist
  if (s.firstName && (db.students[groupId] || []).filter(x => x.firstName === s.firstName).length === 1) {
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
    const kept = newText === null
      ? lines.filter(l => !notes.includes(l.trim()))
      : lines.map(l => notes.includes(l.trim()) ? newText : l);
    if (kept.join('\n') !== lines.join('\n')) entry.notes = kept.join('\n').trim();
  });
}
// Schüler umbenannt: offene Hinweise auf den neuen Namen umschreiben, sonst bleiben sie beim Entfernen stehen (BUGS Q10)
function renameAbsenceNotes(groupId, oldStudent, s) {
  const newText = absenceNoteText(s);
  if (absenceNoteText(oldStudent) === newText) return;
  (s.attendance || []).filter(a => a.type === 'abwesend')
    .forEach(a => replaceAbsenceNoteLines(groupId, a.date, oldStudent, newText));
}
// Gelöschte Schüler: Hinweise, Sitzplätze und quittierte Warnungen mit aufräumen (Regel 10, BUGS Q10)
function cleanUpDeletedStudents(groupId, removed) {
  const remaining = db.students[groupId] || [];
  removed.forEach(s => (s.attendance || []).filter(a => a.type === 'abwesend')
    .forEach(a => {
      const twin = remaining.some(x => absenceNoteText(x) === absenceNoteText(s)
        && (x.attendance || []).some(b => b.date === a.date && b.type === 'abwesend'));
      if (!twin) replaceAbsenceNoteLines(groupId, a.date, s, null);
    }));
  const ids = new Set(removed.map(s => s.id));
  const group = db.groups.find(g => g.id === groupId);
  if (group && group.seatingPlan) group.seatingPlan = group.seatingPlan.filter(item => !ids.has(item.studentId));
  const ack = db.acknowledgedWarnings;
  if (ack) Object.keys(ack).forEach(k => { if (ids.has(k.split('_')[0])) delete ack[k]; });
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
    const [removed] = s.attendance.splice(existingIdx, 1);
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showUndoToast('Fehlzeit entfernt', () => restoreSeatingEntry(groupId, s, 'attendance', removed,
      () => { if (removed.type === 'abwesend') addAbsenceNote(groupId, removed.date, s); }));
    return;
  }
  
  const wasAbwesend = s.attendance.some(a => a.date === dateStr && a.type === 'abwesend');
  if (wasAbwesend && type !== 'abwesend') {
    removeAbsenceNote(groupId, dateStr, s);
  }
  // Fehlen und „zu spät“ schließen sich am selben Tag aus. Ein vorhandener Eintrag wird umgestellt,
  // damit sein Grund („Arztattest“) bleibt (BUGS Q11).
  const keep = s.attendance.find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
  s.attendance = s.attendance.filter(a => a === keep || a.date !== dateStr || !DAY_ATTENDANCE_TYPES.includes(a.type));
  
  if (keep) keep.type = type;
  else s.attendance.push({ id: uid(), date: dateStr, type: type, note: '' });

  // If unexcused, add note to next lesson
  if (type === 'abwesend') addAbsenceNote(groupId, dateStr, s);

  saveDB();
  refreshStudentViews(groupId);
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
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showUndoToast('„Zu spät“ entfernt', () => restoreSeatingEntry(groupId, s, 'attendance', existing));
    return;
  }

  // Wer zu spät kommt, fehlt nicht: ein Fehlen am selben Tag wird ersetzt
  if (s.attendance.some(a => a.date === dateStr && a.type === 'abwesend')) {
    removeAbsenceNote(groupId, dateStr, s);
  }
  s.attendance = s.attendance.filter(a => a.date !== dateStr || (a.type !== 'abwesend' && a.type !== 'entschuldigt'));
  s.attendance.push({ id: uid(), date: dateStr, type: 'zuspät', note: '' });
  saveDB();
  refreshStudentViews(groupId);
  closeModal('modal-seating-student');
  showToast('Zu spät eingetragen', 'warning');
}

function setSeatingHomework() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];
  
  // Nur den Eintrag ohne Bemerkung; einer mit Bemerkung gehört zu einer Spalte der Tabelle (BUGS Q8)
  const existingIdx = s.homework.findIndex(h => h.date === dateStr && !h.note);
  const labelled = s.homework.find(h => h.date === dateStr && h.note);
  if (existingIdx === -1 && labelled) {
    showToast(`Steht schon in der HA-Spalte „${labelled.note}“ – bitte in der Tabelle ändern`, 'error');
    return;
  }
  if (existingIdx === -1) {
    s.homework.push({ id: uid(), date: dateStr, note: '' });
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showToast('Hausaufgabe vergessen eingetragen', 'warning');
  } else {
    const [removed] = s.homework.splice(existingIdx, 1);
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showUndoToast('Hausaufgaben-Eintrag entfernt', () => restoreSeatingEntry(groupId, s, 'homework', removed));
  }
}

// Zelle unter der Mitte eines gezogenen Elements. Erst die Reihe, dann deren Versatz abziehen (BUGS AA5).
// Ein Element über mehrere Zellen (Lehrerpult: 2) hat seine Mitte auf der Grenze zwischen seinen Zellen – daher
// halbe Überbreite abziehen, sonst springt es eine Spalte nach rechts (BUGS E3)
function seatingSnap(centerX, centerY, cellWidth, cellHeight, maxCols, maxRows, widthCells = 1, rowShift = () => 0) {
  let gridY = Math.floor(centerY / cellHeight);
  if (gridY < 0) gridY = 0; if (gridY >= maxRows) gridY = maxRows - 1;
  let gridX = Math.floor((centerX - rowShift(gridY)) / cellWidth - (widthCells - 1) / 2);
  if (gridX < 0) gridX = 0; if (gridX + widthCells > maxCols) gridX = maxCols - widthCells;
  return { gridX, gridY };
}

function makeDraggable(el, studentId, groupId, cellWidth, cellHeight, maxCols, maxRows, offsetX = 0, widthCells = 1, layout = null, rowShift = () => 0) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  const point = e => e.type.includes('mouse') ? e : e.touches[0];
  function listen(on) {
    const fn = on ? 'addEventListener' : 'removeEventListener';
    document[fn]('mousemove', drag, { passive: false });
    document[fn]('mouseup', dragEnd);
    document[fn]('touchmove', drag, { passive: false });
    document[fn]('touchend', dragEnd);
    document[fn]('touchcancel', dragCancel);
  }

  function dragStart(e) {
    isDragging = true;
    startX = point(e).clientX;
    startY = point(e).clientY;
    initialLeft = parseFloat(el.style.left) || 0;
    initialTop = parseFloat(el.style.top) || 0;
    el.classList.add('dragging');
    listen(true);
  }

  function drag(e) {
    if (!isDragging) return;
    if (!e.type.includes('mouse') && !(e.touches && e.touches.length)) return;
    e.preventDefault();
    const { clientX, clientY } = point(e);
    if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) {
      el.dataset.dragged = 'true';
    }
    el.style.left = initialLeft + (clientX - startX) + 'px';
    el.style.top = initialTop + (clientY - startY) + 'px';
  }

  // Abgebrochene Geste (Mitteilung, Systemgeste auf dem iPad): zurück an den Platz, nichts speichern (BUGS N5)
  function dragCancel() {
    isDragging = false;
    listen(false);
    el.classList.remove('dragging');
    delete el.dataset.dragged;
    el.style.left = initialLeft + 'px';
    el.style.top = initialTop + 'px';
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');
    listen(false);
    if (!el.dataset.dragged) return;

    // Calculate closest grid snap relative to centered grid
    const centerX = parseFloat(el.style.left) + (el.offsetWidth / 2);
    const centerY = parseFloat(el.style.top) + (el.offsetHeight / 2);
    const { gridX, gridY } = seatingSnap(centerX - offsetX, centerY, cellWidth, cellHeight, maxCols, maxRows, widthCells, rowShift);

    const g = db.groups.find(x => x.id === groupId);
    const students = db.students[groupId] || [];
    if (!g || !layout) { renderSeatingPlan(); return; }
    // Wer umordnet, übernimmt den Plan so, wie er ihn sieht (Ausweichplätze inklusive, BUGS N1)
    materializeSeatingLayout(groupId, layout);

    if (studentId === 'teacherDesk') {
      g.teacherDeskX = gridX;
      g.teacherDeskY = gridY;
      // Schüler auf den neuen Pult-Zellen bekommen freie Plätze (BUGS N4)
      const onDesk = st => st.gridY === gridY && (st.gridX === gridX || st.gridX === gridX + 1);
      const displaced = students.filter(onDesk);
      if (displaced.length) {
        displaced.forEach(st => { delete st.gridX; delete st.gridY; });
        const { cols, rows } = seatingGridSize(g);
        materializeSeatingLayout(groupId, seatingLayout(students, cols, rows, seatingDesk(g, cols, rows)));
      }
    } else {
      const s = students.find(x => x.id === studentId);
      if (!s) { renderSeatingPlan(); return; }
      if (gridY === layout.desk.y && (gridX === layout.desk.x || gridX === layout.desk.x + 1)) {
        showToast('Dort steht das Lehrerpult', 'error'); // sonst läge die Karte unter dem Pult (BUGS N4)
        renderSeatingPlan();
        return;
      }
      const otherStudent = students.find(x => x.id !== studentId && x.gridX === gridX && x.gridY === gridY);
      if (otherStudent) {
        otherStudent.gridX = s.gridX;
        otherStudent.gridY = s.gridY;
      }
      s.gridX = gridX;
      s.gridY = gridY;
    }
    saveDB();
    renderSeatingPlan();
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
  document.getElementById('seating-student-participation-summary').innerHTML = `Mitarbeit bisher:
    <span style="color:var(--success)">😊 ${partPos}</span> ·
    <span style="color:var(--warning)">😐 ${partNeutral}</span> ·
    <span style="color:var(--danger)">☹️ ${partNeg}</span>
  `;

  renderSeatingStudentGrades(seatingShowGrades);
  markSeatingStudentState(s, dateStr);

  openModal('modal-seating-student');
}

// Was heute schon eingetragen ist, ist markiert – ein zweites Tippen nimmt es zurück (BUGS N6)
function markSeatingStudentState(s, dateStr) {
  const set = new Set();
  (s.participation || []).filter(p => p.date === dateStr && !p.label).forEach(p => set.add(p.value)); // wie addParticipationSmiley
  (s.attendance || []).filter(a => a.date === dateStr).forEach(a => set.add(a.type));
  if ((s.homework || []).some(h => h.date === dateStr)) set.add('homework');
  document.querySelectorAll('#modal-seating-student [data-action]').forEach(btn => {
    const on = set.has(btn.dataset.action);
    btn.classList.toggle('is-set', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
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
        <span>${s.grades.length === 1 ? '1 Note' : s.grades.length + ' Noten'} – verborgen</span>
        <button class="btn-secondary seating-reveal-btn" style="padding:4px 10px; font-size:12px;" onclick="revealSeatingStudentGrades()">Anzeigen</button>
      </div>`;
    return;
  }
  // Sort chronologically (descending)
  const sortedGrades = [...s.grades].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  sortedGrades.forEach(g => {
    const el = document.createElement('div');
    el.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:8px 12px; border-radius:8px; font-size:13px;';
    const valColor = gradeColor(gradeNumber(g.value), gradeScale(groupId));
    el.innerHTML = `
      <div style="display:flex; flex-direction:column; flex:1;">
        <span style="font-weight:600; color:var(--text-primary)">${escHtml(g.note || gradeTypeName(g.type))}</span>
        <span style="font-size:11px; color:var(--text-muted)">${g.date ? formatDateShort(g.date) : ''}</span>
      </div>
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="font-weight:800; font-size:15px; color:${valColor}">${escHtml(gradeText(g.value))}</div>
        <button class="btn-icon seating-grade-edit-btn" style="padding:4px;" aria-label="Note bearbeiten">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      </div>
    `;
    // Per Referenz: der Index kann sich bis zum Antippen verschoben haben (Regel 9, BUGS N13)
    el.querySelector('button').onclick = () => {
      const idx = s.grades.indexOf(g);
      if (idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
      openGradeForm(studentId, groupId, idx);
    };
    gradesContainer.appendChild(el);
  });
}

function openGradeFormForCurrentStudent() {
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  if (studentId && groupId) {
    openGradeForm(studentId, groupId, -1, dateStr || ''); // Datum wie Anwesenheit/Mitarbeit (BUGS N7)
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

  // Das Feld ist der Spaltentitel in der Notentabelle: vorhandene Titel der Klasse vorschlagen (BUGS U2)
  const group = db.groups.find(g => g.id === groupId);
  const titles = new Set([...(group && group.gradeEvents || []).map(e => e.label || ''),
    ...(db.students[groupId] || []).flatMap(st => (st.grades || []).map(g => g.note || ''))]);
  titles.delete('');
  document.getElementById('gf-column-titles').innerHTML = [...titles].sort().map(t => `<option value="${escHtml(t)}"></option>`).join('');

  const scale = gradeScale(groupId);
  document.getElementById('gf-value-label').textContent = scale.inputLabel;
  document.getElementById('gf-value').placeholder = scale.placeholder;

  const btnDelete = document.getElementById('gf-btn-delete');
  if (currentGradeFormCtx.grade) {
    const g = currentGradeFormCtx.grade;
    document.getElementById('grade-form-title').textContent = 'Note bearbeiten';
    setGradeTypeSelect(document.getElementById('gf-type'), g.type || 'test');
    document.getElementById('gf-value').value = gradeText(g.value || ''); // mit Komma wie überall (BUGS U10)
    document.getElementById('gf-date').value = g.date || formatDate(new Date());
    document.getElementById('gf-label').value = g.note || '';
    btnDelete.style.display = 'block';
  } else {
    document.getElementById('grade-form-title').textContent = 'Neue Note';
    setGradeTypeSelect(document.getElementById('gf-type'), 'test');
    document.getElementById('gf-value').value = '';
    document.getElementById('gf-date').value = defaultDateStr || formatDate(new Date());
    document.getElementById('gf-label').value = defaultLabel || '';
    btnDelete.style.display = 'none';
  }
  gradeFormSnapshot = gradeFormState(); // Vergleich für „Verwerfen?“ (BUGS S7)
  openModal('modal-grade-form');
}

// Abbrechen, ✕, Escape, daneben tippen: eine eingetippte Note nicht still verwerfen (Regel 27, BUGS S7)
function cancelGradeForm() {
  if (gradeFormSnapshot !== null && gradeFormState() !== gradeFormSnapshot && !confirm('Die Note ist noch nicht gespeichert.\n\nVerwerfen?')) return;
  closeGradeForm();
}
function gradeFormState() {
  return ['gf-type', 'gf-value', 'gf-date', 'gf-label'].map(id => document.getElementById(id).value).join('\u0000');
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
  if (!dateStr) { showToast('Bitte ein Datum wählen', 'error'); return; } // sonst Spalte ohne Kopf (BUGS Q12)
  const scale = gradeScale(groupId);
  const parsed = parseGradeInput(value, scale);
  if (!parsed) { showToast(scale.inputError, 'error'); return; }

  if (!s.grades) s.grades = [];
  const entry = { type, value: parsed.value, date: dateStr, note: label };
  // Note ohne Titel bleibt ohne Titel: sonst wandert sie in der Tabelle in eine andere Spalte (Titel '' statt Typ)
  if (isEdit && !label && s.grades[idx].note === undefined) delete entry.note;
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

  const [removed] = s.grades.splice(idx, 1);
  saveDB();
  closeGradeForm();
  refreshGradeViews(s, groupId);
  // „Löschen“ steht direkt neben „Abbrechen“: Rückgängig statt endgültig (BUGS U3)
  showUndoToast('Note gelöscht', () => restoreSeatingEntry(groupId, s, 'grades', removed));
}

// Nach Änderungen im Notenformular alles neu zeichnen, was gerade sichtbar ist und Noten zeigt
function refreshGradeViews(s, groupId) {
  const detailModal = document.getElementById('modal-student-detail');
  if (detailModal && !detailModal.classList.contains('hidden') && currentGroupId === groupId) renderGradesList(s);
  refreshStudentViews(groupId);
}

// Nach jeder Änderung an Schülern einer Klasse (Noten, Anwesenheit, Mitarbeit, HA): alle offenen
// Ansichten dieser Klasse neu zeichnen, egal von wo die Änderung kam (BUGS L1).
function refreshStudentViews(groupId) {
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (active('view-students') && currentGroupId === groupId) {
    const overview = document.getElementById('overview-content');
    if (overview && !overview.classList.contains('hidden') && currentOverviewGroupId === groupId) renderOverviewTable();
    else renderStudents();
  }
  if (active('view-seating') && currentSeatingGroupId === groupId) renderSeatingPlan();
  if (active('view-dashboard')) renderDashboard();
  const lessonSlot = !document.getElementById('modal-lesson').classList.contains('hidden')
    && db.lessonSlots.find(s => s.id === activeLessonId);
  if (lessonSlot && lessonSlot.groupId === groupId) renderLessonAbsent(lessonSlot, activeLessonDate);
}

// ─── Lesson Quick Access ──────────────────────────────────────────────────
function openClassOverviewFromLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !slot.groupId) return;
  leaveLessonModal();
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
      row.textContent = studentListName(s); // Namensformat nach Einstellung (BUGS M9)
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
  
  // Nur den Eintrag ohne Titel: einer mit Titel („Referat“) gehört zu einer Spalte der Tabelle (BUGS Q8)
  const existingIdx = s.participation.findIndex(p => p.date === dateStr && !p.label);
  if (existingIdx !== -1) {
    if (s.participation[existingIdx].value === type) {
      const [removed] = s.participation.splice(existingIdx, 1);
      saveDB();
      refreshStudentViews(groupId);
      showUndoToast('Mitarbeit entfernt', () => restoreSeatingEntry(groupId, s, 'participation', removed));
      closeModal('modal-seating-student');
      return;
    } else {
      s.participation[existingIdx].value = type;
    }
  } else {
    s.participation.push({ id: uid(), date: dateStr, value: type });
  }
  
  saveDB();
  refreshStudentViews(groupId);
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

// Fokus beim Öffnen ins Fenster, beim Schließen zurück auf den auslösenden Knopf (BUGS O8).
// Das Fenster selbst bekommt den Fokus, kein Eingabefeld: sonst ginge auf dem iPad jedes Mal die Tastatur auf.
const modalReturnFocus = {};
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  const wasHidden = m.classList.contains('hidden');
  m.classList.remove('hidden');
  if (!wasHidden) return;
  const active = document.activeElement;
  modalReturnFocus[id] = active && active !== document.body && !m.contains(active) ? active : null;
  const dialog = m.querySelector('.modal');
  if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  const wasOpen = !m.classList.contains('hidden');
  m.classList.add('hidden');
  const back = modalReturnFocus[id];
  delete modalReturnFocus[id];
  if (wasOpen && back && back.isConnected && (m.contains(document.activeElement) || document.activeElement === document.body)) {
    try { back.focus({ preventScroll: true }); } catch (e) { /* Element nicht fokussierbar */ }
  }
  if (id === 'modal-settings') { settingsSnapshot = null; hideAllPasswords(); }   // gemerkter Stand gilt nur für dieses Öffnen (S7)
  if (id === 'modal-grade-form') gradeFormSnapshot = null;
  if (wasOpen) {
    storageAfterModalsClosed(); // Stand eines anderen Fensters, der auf das Schließen gewartet hat (BUGS T1)
    syncAfterModalsClosed();    // Cloud-Stand, der auf das Schließen gewartet hat (BUGS P1)
  }
}
// Fenster als Dialog auszeichnen (Rolle, Titel) – für Screenreader (BUGS O8)
function labelModals() {
  document.querySelectorAll('.modal-overlay > .modal').forEach(dialog => {
    const overlay = dialog.parentElement;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.tabIndex = -1;
    const h = dialog.querySelector('h2');
    if (h) {
      if (!h.id) h.id = overlay.id + '-title';
      dialog.setAttribute('aria-labelledby', h.id);
    }
  });
}
labelModals();

// „Passwort anzeigen“ (Auge) an den Master-Passwort-Feldern (`data-reveal`). Nie gespeichert: Schließen der
// Einstellungen und Verlassen der App verbergen es wieder – am Pult soll es niemand sehen.
function setPasswordVisible(input, show) {
  input.type = show ? 'text' : 'password';
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
// Tippen neben ein Fenster: wie sein Schließen-Knopf, also z. B. Stunden-Notizen speichern (BUGS G13)
// Nur schließen, wenn auch das Drücken auf dem Overlay begann: Text im Feld markieren und daneben loslassen
// erzeugt einen click auf dem Overlay und hätte die Eingaben verworfen (BUGS O1).
let overlayPressTarget = null;
// Wo zuletzt gedrückt wurde – auch für Popups, die bei Klick außerhalb schließen (Raster-Menü, Aufklapplisten)
let lastPressTarget = null;
['pointerdown', 'mousedown'].forEach(type => document.addEventListener(type, e => { overlayPressTarget = e.target; lastPressTarget = e.target; }, true));
// Begann das Drücken in `el`? Dann ist ein Klick außerhalb nur das Loslassen nach dem Markieren/Ziehen – nicht schließen.
function pressStartedIn(el) { return !!(el && lastPressTarget && el.contains(lastPressTarget)); }
function closeModalOnOverlay(event, id) {
  const overlay = document.getElementById(id);
  const pressedElsewhere = overlayPressTarget && overlayPressTarget !== overlay;
  overlayPressTarget = null;
  if (event.target === overlay && !pressedElsewhere) closeModalLikeButton(id);
}

// Toast mit „Rückgängig“ (klickbar, anders als normale Toasts) für Einträge, die ein zweites Tippen entfernt (BUGS N6)
function showUndoToast(msg, undo) {
  const t = Object.assign(document.createElement('div'), { className: 'toast success toast-undo' });
  t.appendChild(Object.assign(document.createElement('span'), { textContent: msg }));
  const btn = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Rückgängig' });
  let done = false;
  btn.onclick = () => { if (done) return; done = true; t.remove(); undo(); };
  t.appendChild(btn);
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.cssText = 'opacity:0;transition:opacity .3s'; setTimeout(() => t.remove(), 300); }, 6000);
}
// Eintrag wiederherstellen, sofern der Schüler noch da ist (Sync kann die DB inzwischen ersetzt haben)
function restoreSeatingEntry(groupId, s, list, entry, after) {
  if (!(db.students[groupId] || []).includes(s)) { showToast('Nicht mehr möglich – die Daten wurden inzwischen ersetzt', 'error'); return; }
  if (!s[list]) s[list] = [];
  // Inzwischen neu eingetragen (z. B. „Entschuldigt“ statt des entfernten „Unentschuldigt“): nicht zwei Einträge
  // für denselben Tag anlegen (Regel 50, BUGS W4)
  const clash = list === 'attendance' ? DAY_ATTENDANCE_TYPES.includes(entry.type)
      && s.attendance.some(a => a.date === entry.date && DAY_ATTENDANCE_TYPES.includes(a.type))
    : list === 'participation' ? s.participation.some(p => p.date === entry.date && (p.label || '') === (entry.label || ''))
    : list === 'homework' ? s.homework.some(h => h.date === entry.date && (h.note || '') === (entry.note || ''))
    : false;
  if (clash) { showToast('Nicht wiederhergestellt – für den ' + formatDateShort(entry.date) + ' gibt es schon einen Eintrag', 'error'); return; }
  s[list].push(entry);
  if (after) after();
  saveDB();
  refreshStudentViews(groupId);
  refreshOpenProfile(s);
  showToast('Wiederhergestellt');
}

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
  return new Date(dateStr+'T00:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
}

// ─── Notenskala pro Klasse (BUGS H7) ─────────────────────────────────────
// group.gradeScale: fehlt/unbekannt = '1-6' (auch alle bestehenden Klassen), '0-15' = Punkte (Oberstufe).
// Bei Punkten gilt „höher = besser“. Alles, was Noten prüft, färbt oder bewertet, fragt die Skala der Klasse.
const GRADE_SCALES = {
  '1-6':  { id: '1-6',  min: 1, max: 6,  higherIsBetter: false, integer: false, unit: '',       label: 'Noten 1–6',
            inputLabel: 'Note / Wert (z. B. 1, 2,5, 2-, +)', placeholder: 'z. B. 1 oder +',
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
// Anzeige mit deutschem Komma (BUGS I14). Gespeichert und gerechnet wird weiter mit Punkt.
function formatGradeAverage(avg, digits = 1) {
  return avg === null || avg === undefined || isNaN(avg) ? '–' : avg.toFixed(digits).replace('.', ',');
}
// Gespeicherten Notenwert anzeigen: '2.5' → '2,5'; Tendenzen ('2-') und Text ('+') bleiben
function gradeText(value) {
  return String(value ?? '').replace('.', ',');
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

// Achtung: gradeTypeLabel ist auch Schlüssel. Noten ohne Titel werden über `g.note ?? gradeTypeLabel(g.type)`
// ihrer Spalte zugeordnet; ein neuer Text würde bestehende Noten aus der Tabelle werfen. Für die Anzeige gradeTypeName.
function gradeTypeLabel(type) {
  return {schularbeit:'Klassenarbeit',klausur:'Klausur',test:'Test',muendlich:'Mündlich',mitarbeit:'Mitarbeit',
          projekt:'Projekt',hausaufgabe:'HA',sonstig:'Sonstiges'}[type] || type;
}

// Name des Notentyps für die Anzeige. „Mitarbeitsnote“, damit sie nicht mit den Mitarbeit-Smileys verwechselt wird (BUGS I16)
function gradeTypeName(type) {
  return type === 'mitarbeit' ? 'Mitarbeitsnote' : gradeTypeLabel(type);
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
  // Bis zu zwei Nachkommastellen (1,75), sonst eine (2.0): nicht still auf 1,8 runden (BUGS U8)
  const rounded = Math.round(number * 100) / 100;
  const value = tendency ? String(Math.round(number * 10) / 10) + tendency
    : (Number.isInteger(rounded * 10) ? rounded.toFixed(1) : rounded.toFixed(2));
  return { value, number };
}

// ─── Keyboard ─────────────────────────────────────────────────────────────
// Escape und Tippen daneben schließen ein Fenster so wie sein eigener Schließen-Knopf (BUGS G7, G13).
const MODAL_CLOSE_ACTIONS = {
  'modal-lesson': () => saveLessonDataAndClose(),   // wie „Schließen“: Notizen nicht verwerfen
  'modal-grade-form': () => cancelGradeForm(),
  'modal-sync-conflict': null,                       // Entscheidung nötig, nicht wegdrückbar
  'modal-choice': () => answerChoice(null),          // Wegdrücken = Abbrechen
  'modal-settings': () => cancelSettings(),          // Farbvorschau nicht stehen lassen (BUGS O2)
  'modal-supervision': () => cancelSupervision(),    // bei Änderungen fragen (AA4)
  'modal-whats-new': () => closeWhatsNew(),          // Wegdrücken zählt als gelesen
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
    if (!container.contains(e.target) && !pressStartedIn(container)) { // im Menü gedrückt, außerhalb losgelassen: offen lassen
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

// ─── „Das ist neu“ ─────────────────────────────────────────────────────────
// Erscheint einmal pro Gerät, wenn sich mit einem Update für bestehende Nutzer etwas Sichtbares ändert.
// Für das nächste große Update: `id` ändern und die Punkte ersetzen. Gemerkt wird nur auf diesem Gerät
// (nicht in `db`, nicht synchronisiert). Neue Nutzer ohne Daten sehen es nie.
const WHATS_NEW = {
  id: '2026-10',
  items: [
    { icon: 'calendar', title: 'Ferien', text: 'Einstellungen → „Ferien & freie Tage“: Bundesland wählen und „Ferien laden“. In den Ferien fallen deine Stunden aus, Hausaufgaben sind erst danach fällig.' },
    { icon: 'late',     title: 'Pausenaufsicht', text: '„+ Aufsicht“ oben links im Stundenplan. Sie steht dann zwischen den Stunden und im Dashboard.' },
    { icon: 'refresh',  title: 'Vertretung', text: 'Im Fenster einer Stunde unten auf „Vertretung“ tippen – ersetzt die Stunde nur an diesem Tag und ist im Plan markiert.' },
    { icon: 'classes',  title: 'Mehrere Klassen auf einmal', text: 'beim Anlegen z. B. „7a-d“ eintippen. Dazu 35 statt 14 Farben.' },
    { icon: 'seating',  title: 'Einzelstunden & Sitzplan', text: 'Einstellungen → Stundenzeiten → „Vorlage …“ für 45-Minuten-Stunden. Im Sitzplan lassen sich Reihen versetzen (Raster-Menü).' },
  ],
};
const WHATS_NEW_SEEN_KEY = 'whats_new_seen';

// Browser-Speicher kann gesperrt sein (privater Modus) – dann einfach nichts merken
function readWhatsNewSeen() { try { return localStorage.getItem(WHATS_NEW_SEEN_KEY); } catch (e) { return null; } }
function markWhatsNewSeen() { try { localStorage.setItem(WHATS_NEW_SEEN_KEY, WHATS_NEW.id); } catch (e) {} }

function showWhatsNewIfDue(attempt = 0) {
  if (readWhatsNewSeen() === WHATS_NEW.id) return;
  if (isLocalDBEmpty()) { markWhatsNewSeen(); return; } // neues Gerät/neuer Nutzer: es gibt nichts „Altes“
  // Nie über ein anderes Fenster legen (z. B. Konflikt-Dialog); später noch einmal versuchen
  if (document.querySelector('.modal-overlay:not(.hidden)')) {
    if (attempt < 20) setTimeout(() => showWhatsNewIfDue(attempt + 1), 2000);
    return;
  }
  document.getElementById('whats-new-list').innerHTML = WHATS_NEW.items.map(item => `
    <li>${icon(item.icon)}<div><strong>${escHtml(item.title)}</strong> ${escHtml(item.text)}</div></li>`).join('');
  openModal('modal-whats-new');
}

function closeWhatsNew() {
  markWhatsNewSeen();
  closeModal('modal-whats-new');
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  updateAppliedThemeFromDB();
  renderTimetable();
  renderSubjectGroups();
  initAllCustomDropdowns();
  setTimeout(() => showWhatsNewIfDue(), 800); // nach dem ersten Zeichnen, damit die App dahinter schon steht
}



// ─── PWA Update Logic ───────────────────────────────────────────────────
async function forceAppUpdate() {
  // Offline den Cache zu löschen hieße: keine App bis zum nächsten WLAN (BUGS K12). Erst prüfen, ob der Server erreichbar ist.
  if (navigator.onLine === false || !(await serverReachable())) {
    showToast('Keine Internetverbindung – Aktualisieren geht nur online.', 'error');
    return;
  }
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
async function serverReachable() {
  try {
    const res = await fetch('./index.html?check=' + Date.now(), { cache: 'no-store' });
    return res.ok;
  } catch (e) {
    return false;
  }
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
  // Ohne Zieldatum zählt eine HA dort, wo sie gestellt wurde – wie das Symbol in der Kachel (BUGS R12)
  const onDate = (enabled, items) => enabled ? (items || []).filter(i => !i.targetDate || i.targetDate === dateStr) : [];
  return { hw: [...incoming.hw, ...onDate(own.hwEnabled, own.hwItems)], tests: [...incoming.tests, ...onDate(own.testEnabled, own.testItems)] };
}

// Nächste Stunde, die noch nicht begonnen hat und nicht ausfällt (bis zu 3 Wochen voraus)
function findNextLesson(now) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todayStr = formatDate(now);
  let d = parseDate(todayStr);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {   // 10 Wochen: auch über die Sommerferien (Y8)
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

// Welche Einträge eine quittierte Warnung meinte. Nur die Anzahl zu merken reichte nicht: Eintrag gelöscht und
// neuer angelegt = gleiche Anzahl, die neue Fehlzeit blieb unsichtbar (BUGS R14).
function warningSignature(s, type) {
  const parts = type === 'absences' ? (s.attendance || []).filter(a => a.type === 'abwesend').map(a => a.date)
    : type === 'homework' ? (s.homework || []).map(h => h.date + '|' + (h.note || ''))
    : (s.grades || []).map(g => (g.date || '') + '|' + g.value);
  const str = parts.sort().join(';');
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
// Noch quittiert? Anzahl nicht gestiegen und (falls gemerkt) dieselben Einträge
function warningAcknowledged(ack, s, type, count) {
  const n = ack[`${s.id}_${type}`];
  if (!(count <= (n || 0))) return false;
  // Weniger als beim Quittieren (z. B. ein Fehltag nachträglich entschuldigt): Es ist besser geworden (BUGS U6)
  if (type !== 'grade' && count < n) return true;
  const sig = ack[`${s.id}_${type}_sig`];
  return !sig || sig === warningSignature(s, type);
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
      if (warnAbsences > 0 && unexcused >= warnAbsences && !warningAcknowledged(ack, s, 'absences', unexcused)) {
        warnings.push({ student: s, group, type: 'absences', count: unexcused,
          title: 'Zu viele unentschuldigte Fehlzeiten', desc: `${name} hat ${unexcused === 1 ? 'eine unentschuldigte Fehlzeit' : unexcused + ' unentschuldigte Fehlzeiten'}.` });
      }
      const hwCount = (s.homework || []).length;
      if (warnHomework > 0 && hwCount >= warnHomework && !warningAcknowledged(ack, s, 'homework', hwCount)) {
        warnings.push({ student: s, group, type: 'homework', count: hwCount,
          title: 'Oft Hausaufgaben vergessen', desc: `${name} hat ${hwCount === 1 ? 'einmal' : hwCount + '-mal'} die Hausaufgaben vergessen.` });
      }
      const grades = s.grades || [];
      if (grades.length > 0) {
        const avg = calculateStudentAverage(s, group.id);
        const points = gradeScale(group).higherIsBetter;
        const critical = avg !== null && (points ? warnPoints > 0 && avg < warnPoints : warnGrade > 0 && avg >= warnGrade);
        // Quittiert und seitdem nicht schlechter geworden (z. B. Note zum Besseren korrigiert): bleibt quittiert (BUGS U6)
        const ackAvg = ack[`${s.id}_grade_avg`];
        const notWorse = ack[`${s.id}_grade`] !== undefined && typeof ackAvg === 'number'
          && (points ? avg >= ackAvg : avg <= ackAvg);
        if (critical && !notWorse && !warningAcknowledged(ack, s, 'grade', grades.length)) {
          warnings.push({ student: s, group, type: 'grade', count: grades.length,
            title: 'Kritischer Notenstand',
            desc: `${name} steht aktuell auf ${points ? formatGradeAverage(avg) + ' Punkten' : formatGradeAverage(avg, 2)}.` });
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
  // Ferien zwischen heute und dem gezeigten Schultag (Y8)
  const hol = !isTodayShown && (Array.isArray(db.settings.holidays) ? db.settings.holidays : []).find(h => h && typeof h.from === 'string' && typeof h.until === 'string'
    && h.until >= todayStr && h.from < dayStr);
  if (hol) {
    const range = hol.from === hol.until ? formatDateLong(hol.from) : `${formatDateLong(hol.from)} – ${formatDateLong(hol.until)}`;
    html += `<div class="dash-holiday">${escHtml(hol.label || 'Ferien')}: ${escHtml(range)}</div>`;
  }

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
    html += supRows(null);
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
      <div class="dash-next" data-slot="${escHtml(next.slot.id)}" style="--lesson-color:${escHtml(next.slot.color || '#6366f1')}" onclick="openLessonDetail(${jsArg(next.slot.id)},${jsArg(next.dateStr)})">
        <div class="dash-next-label">Nächste Stunde · ${escHtml(when)} · ${escHtml(next.block.label)}</div>
        <div class="dash-next-title">${escHtml(t.main)}${t.sub ? ` <span>${escHtml(t.sub)}</span>` : ''}${next.slot.room ? ` <span>· ${escHtml(next.slot.room)}</span>` : ''}</div>
        ${body || '<div class="dash-empty">Keine Notizen, nichts fällig.</div>'}
      </div>
    </section>`;
  }
  return html;
}

// Eine Aufsicht in der Liste „Heute“ (AA4)
function supervisionDashRow(x, isTodayShown, nowMins) {
  const start = timeToMins(x.start) ?? 0, end = timeToMins(x.end) ?? start;
  let state = '', status = '';
  if (isTodayShown && end <= nowMins) { state = 'past'; status = 'vorbei'; }
  else if (isTodayShown && start <= nowMins) { state = 'running'; status = `läuft noch ${end - nowMins} min`; }
  else if (isTodayShown && start - nowMins <= 60) { state = 'next'; status = `beginnt in ${start - nowMins} min`; }
  return `<div class="dash-lesson dash-supervision ${state}" onclick="openSupervisionForm(${jsArg(x.id)})">
      <div class="dash-lesson-time">${escHtml(x.start || '')}<small>Pause</small></div>
      <div class="dash-lesson-main">
        <div class="dash-lesson-title">Aufsicht${x.place ? ` <span>${escHtml(x.place)}</span>` : ''}</div>
        <div class="dash-lesson-room">${escHtml(x.start || '')}–${escHtml(x.end || '')}</div>
      </div>
      <div class="dash-lesson-badges"></div>
      ${status ? `<div class="dash-lesson-status">${status}</div>` : ''}
    </div>`;
}

// ─── Formular Pausenaufsicht (AA4). Merkt sich den Eintrag per Objekt (Regel 8). ──────────
let editingSupervision = null;
let supervisionSnapshot = null;
function supervisionFormState() {
  return ['sup-day', 'sup-start', 'sup-end', 'sup-place', 'sup-recurring', 'sup-date'].map(id => document.getElementById(id).value).join('|');
}
function updateSupervisionFormFields() {
  const rec = document.getElementById('sup-recurring').value;
  document.getElementById('sup-day-group').classList.toggle('hidden', rec !== 'weekly');
  document.getElementById('sup-date-group').classList.toggle('hidden', rec === 'weekly');
  document.getElementById('sup-date-label').textContent = rec === 'biweekly' ? 'Erstmals am (A-Woche)' : 'Am';
}
function openSupervisionForm(id) {
  const x = id ? supervisionList().find(s => s.id === id) : null;
  if (id && !x) { showToast('Diese Aufsicht gibt es nicht mehr (z. B. durch Sync)', 'error'); renderScheduleViews(); return; }
  editingSupervision = x;
  const blocks = getBlocks();
  const today = new Date();
  const set = (field, v) => { document.getElementById(field).value = v; };
  if (x) {
    set('sup-day', String(x.day));
    set('sup-start', x.start || ''); set('sup-end', x.end || '');
    set('sup-place', x.place || '');
    set('sup-recurring', x.recurring === 'biweekly' ? 'biweekly' : isOneOffSlot(x) ? 'none' : 'weekly');
    set('sup-date', x.recurring === 'biweekly' ? (x.startDate || '') : (x.specificDate || ''));
  } else {
    // Vorschlag: erste Pause zwischen zwei Blöcken, heutiger Wochentag
    set('sup-day', String(isSchoolDay(today) ? (today.getDay() + 6) % 7 : 0));
    set('sup-start', blocks[0] ? blocks[0].end : '09:15');
    set('sup-end', blocks[1] ? blocks[1].start : '09:35');
    set('sup-place', '');
    set('sup-recurring', 'weekly');
    set('sup-date', formatDate(nextSchoolDay(today)));
  }
  document.getElementById('supervision-modal-title').textContent = x ? 'Aufsicht bearbeiten' : 'Pausenaufsicht eintragen';
  document.getElementById('btn-delete-supervision').classList.toggle('hidden', !x);
  updateSupervisionFormFields();
  supervisionSnapshot = supervisionFormState();
  openModal('modal-supervision');
}
function saveSupervision() {
  const v = id => document.getElementById(id).value.trim();
  const start = v('sup-start'), end = v('sup-end'), place = v('sup-place'), recurring = v('sup-recurring');
  if (!/^\d\d:\d\d$/.test(start) || !/^\d\d:\d\d$/.test(end) || end <= start) {
    showToast('Ende muss nach dem Beginn liegen', 'error'); return;
  }
  const fields = { start, end, place, recurring };
  if (recurring === 'weekly') {
    fields.day = parseInt(v('sup-day'), 10) || 0;
  } else {
    const date = v('sup-date');
    if (!/^\d{4}-\d\d-\d\d$/.test(date)) { showToast('Bitte ein Datum wählen', 'error'); return; }
    const wd = parseDate(date).getDay();
    if (wd === 0 || wd === 6) { showToast('Das Datum liegt am Wochenende', 'error'); return; }
    fields.day = (wd + 6) % 7;
    if (recurring === 'biweekly') fields.startDate = date; else fields.specificDate = date;
  }
  if (!Array.isArray(db.supervisions)) db.supervisions = [];
  if (editingSupervision) {
    if (!db.supervisions.includes(editingSupervision)) { showToast('Diese Aufsicht gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
    delete editingSupervision.startDate; delete editingSupervision.specificDate;
    Object.assign(editingSupervision, fields);
  } else {
    db.supervisions.push({ id: uid(), ...fields });
  }
  saveDB();
  supervisionSnapshot = null;
  const wasNew = !editingSupervision;
  editingSupervision = null;
  closeModal('modal-supervision');
  renderScheduleViews();
  showToast(wasNew ? 'Aufsicht eingetragen ✓' : 'Aufsicht gespeichert ✓');
}
function deleteSupervision() {
  const x = editingSupervision;
  if (!x || !confirm('Diese Aufsicht löschen?')) return;
  const idx = (db.supervisions || []).indexOf(x);
  if (idx !== -1) { db.supervisions.splice(idx, 1); saveDB(); }
  supervisionSnapshot = null;
  editingSupervision = null;
  closeModal('modal-supervision');
  renderScheduleViews();
  showToast('Aufsicht gelöscht');
}
// Schließen (✕, Abbrechen, Escape, daneben tippen): bei Änderungen fragen (Regel 27, 55)
function cancelSupervision() {
  if (supervisionSnapshot !== null && supervisionFormState() !== supervisionSnapshot
      && !confirm('Deine Änderungen an der Aufsicht sind noch nicht gespeichert.\n\nVerwerfen?')) return;
  supervisionSnapshot = null;
  editingSupervision = null;
  closeModal('modal-supervision');
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
  db.acknowledgedWarnings[`${studentId}_${type}`] = count; // Anzahl: lesen auch ältere App-Versionen
  const s = Object.values(db.students).flat().find(x => x && x.id === studentId);
  if (s) db.acknowledgedWarnings[`${studentId}_${type}_sig`] = warningSignature(s, type);
  if (s && type === 'grade') {
    const groupId = Object.keys(db.students).find(g => (db.students[g] || []).includes(s));
    const avg = calculateStudentAverage(s, groupId);
    if (avg !== null) db.acknowledgedWarnings[`${studentId}_grade_avg`] = avg;
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

window.jumpToStudentDetailFromSeating = function() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId } = window.currentSeatingStudent;
  closeModal('modal-seating-student');
  leaveLessonModal(); // Eingetipptes übernehmen, Stunden-Fenster nicht darunter liegen lassen (Regel 35, BUGS S5)
  // Aus der Klassenansicht derselben Klasse: dort bleiben, sonst sprang sie auf den Reiter „Schüler“ (BUGS I10)
  const inClassView = document.getElementById('view-students').classList.contains('active') && currentGroupId === groupId;
  if (!inClassView) {
    switchView('classes');
    openGroupStudents(groupId);
  }
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
  document.getElementById('timer-display').classList.remove('timer-done');
  timerSeconds += mins * 60;
  if (timerSeconds < 0) timerSeconds = 0;
  updateTimerDisplay();
}

// Ton am Timer-Ende. iOS erlaubt Audio nur nach einer Berührung: beim Start freischalten.
let timerAudio = null;
function unlockTimerSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!timerAudio) timerAudio = new Ctx();
    if (timerAudio.state === 'suspended') timerAudio.resume();
  } catch (e) { timerAudio = null; }
}
function playTimerSound() {
  try {
    if (!timerAudio) return;
    [0, 0.35, 0.7].forEach(offset => {
      const osc = timerAudio.createOscillator(), gain = timerAudio.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, timerAudio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, timerAudio.currentTime + offset + 0.3);
      osc.connect(gain).connect(timerAudio.destination);
      osc.start(timerAudio.currentTime + offset);
      osc.stop(timerAudio.currentTime + offset + 0.3);
    });
  } catch (e) { /* kein Ton möglich: Markierung und Toast reichen */ }
}

function timerTick() {
  if (!timerIsRunning) return;
  timerSeconds = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
  updateTimerDisplay();
  if (timerSeconds <= 0) {
    clearInterval(timerInterval);
    timerIsRunning = false;
    setPlayButton('btn-timer-toggle', false, 'Timer');
    // Bleibt markiert, bis zurückgesetzt wird; kurzer Ton, falls der Browser ihn zulässt (BUGS N12)
    document.getElementById('timer-display').classList.add('timer-done');
    playTimerSound();
    showToast('Timer abgelaufen!');
  }
}

let timerRemainingMs = null; // beim Pausieren: genaue Restzeit, sonst rundete jede Pause auf (BUGS S10)
function toggleTimer() {
  if (timerIsRunning) {
    timerTick();
    timerRemainingMs = Math.max(0, timerEndsAt - Date.now());
    clearInterval(timerInterval);
    timerIsRunning = false;
    setPlayButton('btn-timer-toggle', false, 'Timer');
  } else {
    if (timerSeconds <= 0) { showToast('Bitte zuerst eine Zeit einstellen (+/−)', 'error'); return; }
    unlockTimerSound();
    timerIsRunning = true;
    // Nach +/− gilt die neue Anzeige, sonst die genaue Restzeit der Pause
    const ms = timerRemainingMs !== null && Math.ceil(timerRemainingMs / 1000) === timerSeconds ? timerRemainingMs : timerSeconds * 1000;
    timerRemainingMs = null;
    timerEndsAt = Date.now() + ms;
    setPlayButton('btn-timer-toggle', true, 'Timer');
    timerInterval = setInterval(timerTick, 250);
  }
}

function resetTimer() {
  document.getElementById('timer-display').classList.remove('timer-done');
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
  window.addEventListener('online', () => triggerSyncInternal());

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
    } else if (status === 'confirm_password') {
      badge.textContent = 'Status: Wartet auf Bestätigung des Master-Passworts';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
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
        alert('Anmeldung fehlgeschlagen: E-Mail oder Passwort stimmen nicht – oder das Konto wurde gelöscht.\n\nDie Daten auf diesem Gerät sind davon nicht betroffen.');
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

// Logout. Die Daten bleiben sonst auf dem Gerät; am geteilten PC landeten sie beim nächsten Konto (BUGS T6).
async function logoutSync() {
  let answer = 'keep';
  if (!isLocalDBEmpty()) {
    const unsynced = isLocalDBChanged();
    answer = await askChoice('Abmelden',
      'Sollen deine Daten (Klassen, Schüler, Noten) auf diesem Gerät bleiben?\n\n'
      + 'Eigenes Gerät: behalten. Geteiltes oder fremdes Gerät: löschen – in der Cloud bleiben sie erhalten.'
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
  accountDeleteChoice = null;
  document.getElementById('sync-delete-account-group').classList.add('hidden');
  document.getElementById('sync-delete-account-password').value = '';
}
async function confirmDeleteAccount() {
  const choice = accountDeleteChoice;
  if (!choice || !SyncManager.currentUser) return;
  const password = document.getElementById('sync-delete-account-password').value;
  if (SyncManager.usesPasswordLogin() && !password) { showToast('Bitte das Anmelde-Passwort eingeben', 'error'); return; }
  if (syncRunning) { showToast('Gerade läuft ein Sync – bitte gleich noch einmal versuchen', 'error'); return; }
  if (choice === 'delete' && isLocalDBChanged() && !isLocalDBEmpty()
      && !confirm('Die letzten Änderungen auf diesem Gerät sind nicht in der Cloud. Sie gehen beim Löschen verloren.\n\nTrotzdem löschen?')) return;
  syncRunning = true;
  accountDeleting = true;
  try {
    try {
      await SyncManager.reauthenticate(password);
    } catch (e) {
      const wrong = ['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e && e.code);
      alert((wrong ? '❌ Das Anmelde-Passwort stimmt nicht.' : '❌ Anmeldung nicht bestätigt: ' + e.message) + '\n\nEs wurde nichts gelöscht.');
      return;
    }
    try {
      await SyncManager.deleteAccount();
    } catch (e) {
      alert('❌ Das Konto konnte nicht gelöscht werden: ' + e.message
        + '\n\nBitte noch einmal versuchen. Die Daten auf diesem Gerät sind unverändert.');
      return;
    }
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
  if (accountDeleting || !SyncManager.currentUser) return;
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
}
function cancelNewCloudPassword() {
  const group = document.getElementById('sync-master-password-confirm-group');
  if (!group) return;
  group.classList.add('hidden');
  document.getElementById('sync-master-password-confirm').value = '';
  updateSyncAttention();
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
  if (syncRunning) { showToast('Gerade läuft ein Sync – bitte gleich noch einmal versuchen', 'error'); return; }
  syncRunning = true;
  const dbAtStart = db;
  const localModified = db.settings.lastModified;
  try {
    const newTimestamp = await SyncManager.overwriteCloud(JSON.stringify(db), pwd);
    storeMasterPassword(pwd);
    rememberNewCloudPasswordConfirmed(pwd);
    cancelNewCloudPassword();
    const passInput = document.getElementById('sync-master-password');
    if (passInput) passInput.value = pwd;
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    if (db === dbAtStart) markSynced(newTimestamp, localModified); // sonst: DB inzwischen ersetzt (Regel 32)
    SyncManager.updateStatus('synced'); // sonst stand noch „Konflikt!“ da (BUGS T9)
    cancelCloudPasswordReset();
    updateSyncAttention();
    updateSyncUI();
    warnIfCloudNearlyFull();
    showToast('Cloud mit neuem Master-Passwort gespeichert ✓');
  } catch (e) {
    if (e.name === 'CloudChangedError') alert('Gerade hat ein anderes Gerät hochgeladen. Es wurde nichts geändert – bitte noch einmal versuchen.');
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
function updateSyncAttention() {
  const btn = document.getElementById('nav-settings');
  if (!btn) return;
  const needs = syncNeedsAttention();
  btn.classList.toggle('needs-attention', needs);
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  if (needs && SyncManager.masterPassword && confirmGroup && !confirmGroup.classList.contains('hidden')) {
    btn.title = 'Cloud-Sync wartet: Master-Passwort in den Einstellungen bitte noch einmal eingeben';
  } else if (needs) btn.title = 'Cloud-Sync pausiert: Master-Passwort in den Einstellungen eingeben';
  else btn.removeAttribute('title');
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
    || (db.settings && Array.isArray(db.settings.holidays) && db.settings.holidays.length > 0);
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
  const timer = setTimeout(() => showToast('Der Sync dauert ungewöhnlich lange – bitte Internetverbindung prüfen.', 'error'), syncSlowNoticeMs);
  return promise.finally(() => clearTimeout(timer));
}

// Offene Fenster, deren Inhalt aus `db` stammt (Stunde, Klasse, Schüler, Note, Rückfrage …). Ein Cloud-Stand, der
// jetzt `db` ersetzt, passt nicht mehr zu ihren Feldern; beim Schließen würde z. B. das Stunden-Fenster die
// Notizen des anderen Geräts mit seinen leeren Feldern überschreiben (BUGS P1). Unveränderte Einstellungen werden
// nach dem Pull neu befüllt (replaceDB), der Konflikt-Dialog ist Teil des Syncs.
// Einstellungen zählen nur mit, wenn dort etwas eingetippt ist: Sonst ersetzte der Pull die Eingaben still (BUGS T5).
function inputModalOpen() {
  return [...document.querySelectorAll('.modal-overlay:not(.hidden)')]
    .some(m => m.id === 'modal-settings' ? settingsDirty() : m.id !== 'modal-sync-conflict' && m.id !== 'modal-whats-new');
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
  if (!document.getElementById('modal-lesson').classList.contains('hidden')) storeLessonForm();
  flushPendingSync();
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

function showSyncConflict(conflictInfo) {
  // Bewusst kein „(aktueller)“: Die Uhren verschiedener Geräte sind nicht vergleichbar.
  const fmt = ts => ts ? new Date(ts).toLocaleString('de-DE') : 'Unbekannt';
  document.getElementById('conflict-local-time').textContent = 'geändert ' + fmt(db.settings.lastModified);
  document.getElementById('conflict-cloud-time').textContent = 'geändert ' + fmt(conflictInfo.cloudTimestamp);
  // Solange der Konflikt offen ist, pausiert der automatische Sync (siehe triggerSyncInternal)
  window.currentConflict = conflictInfo;
  openModal('modal-sync-conflict');
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
    if (result.recovered && db === dbAtStart) markSynced(result.recovered.cloudTimestamp, result.recovered.localModified);
    if (['uploaded', 'pulled', 'no_change'].includes(result.status)) syncErrorShown = false;

    if (db !== dbAtStart) {
      // Während des Syncs wurde die ganze DB ersetzt („Alle Daten löschen“, Import, Cloud-Übernahme).
      // Das Ergebnis gehört zum alten Stand; in die neue DB geschrieben, würde sie als „synchron“
      // gelten und beim nächsten Mal die Cloud überschreiben (BUGS K1). Auch keinen Konflikt melden:
      // „Dieses Gerät hochladen“ lüde die neue, evtl. leere DB hoch (BUGS P4). Einfach neu prüfen.
      syncQueued = true;
    } else if ((result.status === 'pulled' || result.status === 'conflict') && !freshEmpty && inputModalOpen()) {
      // Erst übernehmen bzw. fragen, wenn alle Eingabefenster zu sind (BUGS P1)
      syncAfterModalClose = true;
      if (manual) showToast('Neuer Stand in der Cloud – wird übernommen, sobald das Fenster geschlossen ist.');
    } else if (result.status === 'conflict') {
      showSyncConflict(result);
    } else if (result.status === 'pulled') {
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
        ? '❌ Keine Verbindung zur Cloud – deine Daten sind auf diesem Gerät gespeichert. Sync folgt später.'
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
  if (syncRunning) { showToast('Gerade läuft ein Sync – bitte gleich noch einmal versuchen', 'error'); return; }

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
        const newTimestamp = await SyncManager.saveToCloud(JSON.stringify(db), conflict.cloudTimestamp);
        if (db === dbAtStart) markSynced(newTimestamp, localModified); // sonst: DB inzwischen ersetzt (BUGS K1)
      } finally {
        syncRunning = false;
      }
      SyncManager.updateStatus('synced');
      if (syncQueued) { syncQueued = false; triggerSyncInternal(); }
      showToast('Cloud-Version erfolgreich mit lokalem Stand überschrieben.');
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
  currentThemeAccent = db.settings.themeAccent || '#6366f1';
  document.querySelectorAll('.settings-swatch-accent').forEach(s => s.classList.toggle('selected', s.dataset.color === currentThemeAccent));
  currentThemeBg   = savedThemeBg();
  currentThemeMode = db.settings.theme || 'dark';
  currentThemeCard = currentThemeBg ? (db.settings.themeCard || '') : '';
  document.querySelectorAll('.settings-swatch-bg').forEach(s => s.classList.toggle('selected', s.dataset.color === currentThemeBg));
  let radVal = Number.isFinite(db.settings.themeRadius) ? db.settings.themeRadius : 8;
  if (radVal > 12) radVal = 12; // Clamp max radius to 12
  document.getElementById('settings-radius').value = radVal;
  document.getElementById('settings-radius-val').textContent = radVal + 'px';
}
// Gespeicherter Hintergrund, '' = Standard. '#0f1117' gibt es als Farbfeld nicht: Den hat früher jedes
// „Speichern“ ohne Farbwahl geschrieben (samt Karte '#1e2130'), er bedeutet also „Standard“ (BUGS S6).
function savedThemeBg() {
  const bg = db.settings.themeBg || '';
  return bg === '#0f1117' ? '' : bg;
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
  return JSON.stringify([fields, blocksDraft, holidaysDraft, currentThemeBg, currentThemeAccent, currentThemeMode]);
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

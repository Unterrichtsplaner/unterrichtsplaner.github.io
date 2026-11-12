// ▸ Start: alles, was beim Laden sofort läuft (Ereignisse anmelden, Takt, erster Aufbau). Läuft als letzte Datei, wenn alle Funktionen da sind.
// ▸ Teil von app.js (aufgeteilt, BUGS Y12). Die Abschnitte stehen in der Reihenfolge des alten app.js.

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
// ▸ zu js/einstellungen.js, Abschnitt „Leiste anordnen und Schnellzugriff (AH48)“

let currentThemeAccent = savedThemeAccent();
let currentThemeBg = savedThemeAuto() ? 'auto' : savedThemeBg();   // '' = Standard
let currentThemeMode = savedThemeMode();
let currentThemeCard = currentThemeBg && currentThemeBg !== 'auto' ? (db.settings.themeCard || '') : '';
// ▸ zu js/einstellungen.js, Abschnitt „Settings“
document.querySelectorAll('#modal-settings .set-rail button').forEach(b => b.addEventListener('click', () => showSettingsPane(b.dataset.pane)));
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
// ▸ zu js/dashboard.js, Abschnitt „Merkzettel (AH18)“
document.getElementById('todo-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitTodo(); } });
document.getElementById('btn-todo-add')?.addEventListener('click', () => submitTodo());
document.getElementById('btn-todo-cancel')?.addEventListener('click', () => { resetTodoForm(); renderTodos(); });
document.getElementById('todo-done-wrap')?.addEventListener('toggle', e => { todoDoneOpen = e.target.open; });
// ▸ zu js/dashboard.js, Abschnitt „Schnellsuche (AH19)“
window.visualViewport?.addEventListener('resize', fitSearchToKeyboard);

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
// ▸ zu js/bericht.js, Abschnitt „Excel (.xlsx, selbst erzeugt: Zip ohne Kompression + SpreadsheetML)“

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
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
// ▸ zu js/sync.js, Abschnitt „Sync-Stand klein und immer sichtbar (AN1)“
// „heute/gestern“ im Takt und beim Zurückkommen neu rechnen, auch offline (AP15)
setInterval(() => { if (!document.hidden) updateSyncIndicator(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateSyncIndicator(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) onAppHidden(); });
window.addEventListener('pagehide', onAppHidden);
// ▸ zu js/sync.js, Abschnitt „Drei-Wege-Abgleich: Speicher und Ablauf (AH4)“
// Gerät wechselt hell/dunkel (z. B. abends automatisch): bei „Automatisch“ sofort mitgehen
if (window.matchMedia) {
  const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
  const follow = () => { if (currentThemeBg === 'auto' || savedThemeAuto()) applyThemePreview(); };
  if (darkMq.addEventListener) darkMq.addEventListener('change', follow); else if (darkMq.addListener) darkMq.addListener(follow);
}
// ▸ zu js/einstellungen.js, Abschnitt „Schuljahreswechsel (Y6)“

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

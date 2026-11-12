// ─── Mitarbeit in vier Stufen (BUGS AH52) ───────────────────────────────
// Gespeichert wird das Wort (`value`), angezeigt das Zeichen. Die drei alten Werte behalten ihre Bedeutung,
// nur „neutral“ heißt jetzt „wenig“; alte Einträge brauchen keine Umrechnung. Reihenfolge: beste zuerst.
const PART_LEVELS = [
  { value: 'excellent', sign: '++', word: 'sehr gut', tone: 4 },
  { value: 'positive',  sign: '+',  word: 'gut',      tone: 3 },
  { value: 'neutral',   sign: '−',  word: 'wenig',    tone: 2 },
  { value: 'negative',  sign: '−−', word: 'schwach',  tone: 1 },
];
function partLevel(value) { return PART_LEVELS.find(l => l.value === value) || null; }
// Zeichen als farbiges Feld; Unbekanntes (neuere App-Version) roh und escaped (Regel 3)
function partSignHTML(value) {
  const l = partLevel(value);
  return l ? `<span class="part-sign p${l.tone}">${l.sign}</span>` : escHtml(value || '');
}
// Anzahl je Stufe, in der Reihenfolge von PART_LEVELS
function partCounts(list) {
  return PART_LEVELS.map(l => (list || []).filter(p => p && p.value === l.value).length);
}
// „2 / 3 / 1 / 0“ wie in den anderen Zusammenfassungen (Regel 76): nur „schwach“ rot
function partCountsHTML(list) {
  const c = partCounts(list), last = c.length - 1;
  return c.map((n, i) => `<span${i === last && n ? ' class="n-bad"' : ''}>${n}</span>`).join(' <span class="sep">/</span> ');
}
// „Mitarbeit: 2 sehr gut, 3 gut, 1 wenig, 0 schwach“ (Titel, VoiceOver)
function partCountsText(list) {
  const c = partCounts(list);
  return PART_LEVELS.map((l, i) => `${c[i]} ${l.word}`).join(', ');
}
// ▸ zu js/grundlagen.js, Abschnitt „Mitarbeit in vier Stufen (BUGS AH52)“
fillIcons(document);
tuneTextFields(document);
new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) tuneTextFields(n); })))
  .observe(document.body, { childList: true, subtree: true });
// ▸ zu js/grundlagen.js, Abschnitt „State“
let db = loadDB();
// ▸ zu js/grundlagen.js, Abschnitt „DB“
window.addEventListener('storage', onStorageChanged);

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
// ▸ zu js/grundlagen.js, Abschnitt „Navigation“
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

// ─── Subject Groups ───────────────────────────────────────────────────────
// Ansicht (AH12: Liste · Kacheln · Groß) und Sortierung der Klassenübersicht. Gehen mit den Daten in die Cloud
// (Wunsch 03.11.: auf allen Geräten gleich), Standard wird nie gespeichert. Unbekannte Werte (neuere App) = Standard.
const CLASSES_VIEWS = ['list', 'tiles', 'large'], CLASSES_SORTS = ['subject', 'next', 'class', 'warnings'];
const classesViewSetting = () => CLASSES_VIEWS.includes(db.settings.classesView) ? db.settings.classesView : 'tiles';
const classesSortSetting = () => CLASSES_SORTS.includes(db.settings.classesSort) ? db.settings.classesSort : 'subject';
function setClassesView(mode) {
  if (!CLASSES_VIEWS.includes(mode)) mode = 'tiles';
  if (mode !== classesViewSetting()) {
    if (mode === 'tiles') delete db.settings.classesView; else db.settings.classesView = mode;
    saveDB();
  }
  renderSubjectGroups();
}
function setClassesSort(mode) {
  if (!CLASSES_SORTS.includes(mode)) mode = 'subject';
  if (mode !== classesSortSetting()) {
    if (mode === 'subject') delete db.settings.classesSort; else db.settings.classesSort = mode;
    saveDB();
  }
  renderSubjectGroups();
}
// Klassen nach Jahrgang, dann Name (5a, 7b, 10a, Q1)
function compareClassNames(a, b) {
  const numA = parseInt(a.className) || 999, numB = parseInt(b.className) || 999;
  if (numA !== numB) return numA - numB;
  return (a.className || '').localeCompare(b.className || '') || (a.subject || '').localeCompare(b.subject || '');
}
// Laufende oder nächste Stunde der Klasse ab jetzt (bis 10 Wochen, über die Ferien)
function currentOrNextLessonOfGroup(groupId, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  let d = parseDate(todayStr);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {
    if (!isSchoolDay(d)) continue;
    const ds = formatDate(d);
    const hit = lessonsOnDate(ds).find(l => l.slot.groupId === groupId && !l.ausfall && (ds !== todayStr || (l.range && l.range.end > nowMins)));
    if (hit) return hit;
  }
  return null;
}
// Kurzform für die Meta-Zeile („Als Nächstes“): „jetzt · bis 09:15“ / „Heute · 3. Stunde · 09:40“ / „Morgen · …“ / Datum
function nextLessonLabelHTML(l, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  if (l.dateStr === todayStr && l.range && l.range.start <= nowMins) return `jetzt · bis ${minsToTime(l.range.end)}`;
  return lessonWhenParts({ ...l, slot: { ...l.slot, room: '' } }, now).html;
}
// Wann, relativ zu heute (AH14): laufend „jetzt“ mit Restzeit, sonst „Heute · 3. Stunde · 09:40“, „Morgen · …“ oder Datum
function lessonWhenParts(l, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  const room = l.slot.room ? ' · ' + escHtml(l.slot.room) : '';
  if (l.dateStr === todayStr && l.range && l.range.start <= nowMins) return { now: true, html: `${escHtml(l.block.label)}${room} · noch ${l.range.end - nowMins} Min` };
  const day = l.dateStr === todayStr ? 'Heute' : l.dateStr === formatDate(addDays(parseDate(todayStr), 1)) ? 'Morgen' : escHtml(formatWeekdayShort(l.dateStr));
  return { now: false, html: `${day} · ${escHtml(l.block.label)}${l.dateStr === todayStr && l.range ? ' · ' + minsToTime(l.range.start) : ''}${room}` };
}
// Plakette (AH14): eckig, neutral mit Symbol; „auffällig“ über watchChipHTML (AH24 f)
const classChip = (iconName, text) => `<span class="ct-chip">${icon(iconName)}${text}</span>`;
// ─── „auffällig“ ruhig, rot nur Neues (AH24 f) ───────────────────────────────
// Die Plakette ist neutral; rot ist nur der Zusatz „N neu“: Warnungen, die man seit dem letzten Hinschauen (Liste
// aufgemacht, Klasse im Dashboard aufgeklappt) nicht gesehen hat. Gesehen merkt sich nur dieses Gerät (wie „Zuletzt
// geöffnet“), nie in db. Schlimmer geworden (mehr Fehltage) = neue Kennung = wieder neu.
const WARN_SEEN_KEY = 'warnings_seen';
const warningKey = w => `${w.student.id}_${w.type}_${w.count}`;
function writeWarnSeen(seen, warnings) {
  const current = new Set(warnings.map(warningKey));   // nur Kennungen offener Warnungen behalten (bleibt klein)
  try { localStorage.setItem(WARN_SEEN_KEY, JSON.stringify([...seen].filter(k => current.has(k)))); } catch (e) { /* gesperrt: dann eben ohne Merken */ }
}
// Beim ersten Mal (nach dem Update, auf einem neuen Gerät) gilt alles Vorhandene als gesehen, sonst wäre wieder alles rot
function warnSeenSet(warnings) {
  let list = null;
  try { list = JSON.parse(localStorage.getItem(WARN_SEEN_KEY)); } catch (e) { list = null; }
  if (Array.isArray(list)) return new Set(list);
  const seen = new Set(warnings.map(warningKey));
  if (db.groups.length) writeWarnSeen(seen, warnings);   // leeres Gerät: erst nach dem Laden der Daten festlegen
  return seen;
}
function markWarningsSeen(list) {
  const all = collectWarnings();
  const seen = warnSeenSet(all);
  list.forEach(w => seen.add(warningKey(w)));
  writeWarnSeen(seen, all);
}
const warningIsNew = (w, seen) => !seen.has(warningKey(w));
// Grund in einfachen Worten; bei Noten ohne Zahl (die Liste kann am Beamer aufgehen)
const warningReason = w => w.type === 'grade' ? 'Notenstand kritisch'
  : w.type === 'absences' ? `${w.count}× unentschuldigt gefehlt` : `${w.count}× Hausaufgaben vergessen`;
function watchChipHTML(g, list, seen) {
  if (!list || !list.length) return '';
  const n = new Set(list.map(w => w.student.id)).size;
  const neu = new Set(list.filter(w => warningIsNew(w, seen)).map(w => w.student.id)).size;
  return `<button type="button" class="ct-chip is-watch" data-group="${escHtml(g.id)}" aria-haspopup="dialog"
    aria-label="${n} auffällig${neu ? `, ${neu} neu` : ''}: Namen anzeigen">${icon('alert')}${n} auffällig${neu ? `<span class="neu">${neu} neu</span>` : ''}</button>`;
}
let watchPop = null;   // { btn, groupId }
function closeWatchPop() {
  const p = document.getElementById('watch-pop');
  if (p) p.remove();
  const was = watchPop;
  watchPop = null;
  // Gesehenes verliert sein Rot erst nach dem Zumachen (in der Liste steht „neu“ noch dran)
  if (was && document.getElementById('view-classes')?.classList.contains('active')) renderSubjectGroups();
}
function openWatchPop(btn, groupId) {
  // Wechsel zu einer anderen Klasse: nur die alte Liste weg, nicht neu zeichnen – sonst gäbe es die angetippte
  // Plakette nicht mehr, und die Liste stünde oben links (AR15). Neu gezeichnet wird beim endgültigen Schließen.
  document.getElementById('watch-pop')?.remove();
  watchPop = null;
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !btn) return;
  const all = collectWarnings();
  const seen = warnSeenSet(all);
  const list = all.filter(w => w.group === g);
  if (!list.length) return;
  const pop = document.createElement('div');
  pop.id = 'watch-pop';
  pop.className = 'watch-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `${g.className} auffällig`);
  const fill = () => {
    const open = collectWarnings().filter(w => w.group === g);
    if (!open.length) { closeWatchPop(); return; }
    pop.innerHTML = `<h3>${escHtml(g.className)} · auffällig</h3>` + open.map(w => `<div class="watch-row">
        <button type="button" class="watch-who"><b>${escHtml(studentListName(w.student))}${warningIsNew(w, seen) ? '<span class="tag-neu">neu</span>' : ''}</b><span>${warningReason(w)}</span></button>
        <button type="button" class="btn-secondary watch-ack">Erledigt</button></div>`).join('');
    pop.querySelectorAll('.watch-row').forEach((row, i) => {
      const w = open[i];
      row.querySelector('.watch-who').addEventListener('click', () => {
        closeWatchPop();
        openStudentDetailFromDashboard(w.student.id, g.id, w.type);
      });
      row.querySelector('.watch-ack').addEventListener('click', () => { acknowledgeWarning(w.student.id, w.type, w.count); fill(); });
    });
  };
  document.body.appendChild(pop);
  watchPop = { btn, groupId };
  fill();
  if (!watchPop) return;
  markWarningsSeen(list);
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 320, h = pop.offsetHeight || 200;
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  pop.style.top = (r.bottom + 6 + h > window.innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 6) + 'px';
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!coarse) try { pop.querySelector('button').focus({ preventScroll: true }); } catch (e) { /* nicht fokussierbar */ }
}
// Tippen daneben (Druck auch daneben begonnen, Regel 27) oder Escape schließt
document.addEventListener('click', e => {
  const p = document.getElementById('watch-pop');
  if (!p || p.contains(e.target) || pressStartedIn(p)) return;
  if (watchPop && watchPop.btn.contains(e.target)) return;
  closeWatchPop();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('watch-pop')) closeWatchPop(); });

// Große Kachel, Mitte (A+ nach der Design-Prüfung, AH14): fester Stapel wann → Thema → zuletzt → Plaketten, ohne Etiketten
function classTileDetailsHTML(g, now, watchChip = '') {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  const next = currentOrNextLessonOfGroup(g.id, now);
  if (!next) return `<div class="ct-main"><div class="ct-when is-none">Keine Stunde geplant</div>${watchChip ? `<div class="ct-chips">${watchChip}</div>` : ''}</div>`;
  const when = lessonWhenParts(next, now);
  let html = `<div class="ct-when">${when.now ? '<span class="ct-now">jetzt</span>' : icon('late')}${when.html}</div>`;
  // Thema nur, wenn die Klasse überhaupt plant; geplant, aber nicht für diese Stunde: leise sagen
  if (groupPlan(g).length) {
    const a = plannedTopicOf(g.id, next, todayStr);   // auch schon abgehakt (AQ27)
    html += a ? `<div class="ct-topic">${a.done ? '✓ ' : ''}${escHtml(a.topic.title)}${a.of > 1 ? `<small>Stunde ${a.unit} von ${a.of}</small>` : ''}</div>`
      : '<div class="ct-topic is-none">Kein Thema geplant</div>';
  }
  const prev = previousLessonOfGroup(g.id, todayStr, nowMins);
  const prevTopic = prev ? firstLine((db.lessonData[lessonKeyOf(prev)] || {}).done) : '';
  if (prevTopic) html += `<div class="ct-prev">Zuletzt: ${escHtml(prevTopic)}</div>`;
  const due = dueItemsFor(next.slot.id, next.dateStr);
  const more = items => items.length > 1 ? ` (+${items.length - 1})` : '';
  const chips = [watchChip,
    due.hw.length ? classChip('homework', `HA fällig: ${escHtml(due.hw[0].text)}${more(due.hw)}`) : '',
    due.tests.length ? classChip('test', `Test: ${escHtml(due.tests[0].text)}${more(due.tests)}`) : ''].join('');
  if (chips) html += `<div class="ct-chips">${chips}</div>`;
  return `<div class="ct-main">${html}</div>`;
}
// Auf die Minute genau (Restzeit, „jetzt“): Uhr-Takt zeichnet nur neu, wenn sich die Angaben ändern (AH3: nicht unter dem Finger)
let classesClockSig = '';
function classesClockSignature(now = new Date()) {
  if (classesViewSetting() !== 'large' && classesSortSetting() !== 'next') return '';
  return db.groups.map(g => { const l = currentOrNextLessonOfGroup(g.id, now); return l ? lessonWhenParts(l, now).html : '-'; }).join('|');
}

function renderSubjectGroups() {
  const classesView = classesViewSetting(), sort = classesSortSetting();
  classesClockSig = classesClockSignature();
  const sortSel = document.getElementById('classes-sort');
  if (sortSel) sortSel.value = sort;
  document.querySelectorAll('#classes-mode button').forEach(b => {
    const on = b.dataset.mode === classesView;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
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

  // Klassen als Kacheln in Klassenfarbe (AH8, vorher Zeilen AE8): Man findet eine Klasse an Farbe und großem
  // Namen wieder wie im Stundenplan. Ganze Kachel öffnet die Klasse.
  const now = new Date();
  const todayStr = formatDate(now);
  // Auffällige Schüler je Klasse (nicht quittierte Warnungen, wie im Dashboard), in allen drei Ansichten (AH24 f)
  if (watchPop) { const p = document.getElementById('watch-pop'); if (p) p.remove(); watchPop = null; }
  const warnings = collectWarnings();
  const warnSeen = warnSeenSet(warnings);
  const warnByGroup = new Map();
  warnings.forEach(w => {
    if (!warnByGroup.has(w.group.id)) warnByGroup.set(w.group.id, []);
    warnByGroup.get(w.group.id).push(w);
  });
  const warnCount = g => new Set((warnByGroup.get(g.id) || []).map(w => w.student.id)).size;
  const watchChip = g => watchChipHTML(g, warnByGroup.get(g.id), warnSeen);
  const nextByGroup = new Map();
  if (sort === 'next') db.groups.forEach(g => nextByGroup.set(g.id, currentOrNextLessonOfGroup(g.id, now)));
  const nextKey = g => { const l = nextByGroup.get(g.id); return l ? l.dateStr + String(l.range ? l.range.start : 0).padStart(4, '0') : '9'; };

  // Sortierung: nach Fach in Abschnitten (Standard), sonst eine Liste mit einer Überschrift
  let sections;
  if (sort === 'subject') {
    const bySubject = {};
    db.groups.forEach(g => { const subj = g.subject || 'Ohne Fach'; (bySubject[subj] = bySubject[subj] || []).push(g); });
    sections = Object.keys(bySubject).sort((a, b) => a.localeCompare(b)).map(subj => ({ title: subj, groups: bySubject[subj].sort(compareClassNames) }));
  } else {
    const cmp = sort === 'next' ? (a, b) => nextKey(a).localeCompare(nextKey(b)) || compareClassNames(a, b)
      : sort === 'warnings' ? (a, b) => warnCount(b) - warnCount(a) || compareClassNames(a, b)
      : compareClassNames;
    sections = [{ title: { next: 'Als Nächstes', class: 'Nach Klasse', warnings: 'Auffällige zuerst' }[sort], groups: [...db.groups].sort(cmp) }];
  }

  sections.forEach(({ title, groups: sortedGroups }) => {
    const section = document.createElement('section');
    section.className = 'subject-section';
    section.innerHTML = `<h2 class="subject-heading">${escHtml(title)}<span>${sortedGroups.length} ${sortedGroups.length === 1 ? 'Klasse' : 'Klassen'}</span></h2>`;
    const list = document.createElement('div');
    list.className = 'class-list' + (classesView === 'list' ? ' is-list' : classesView === 'large' ? ' is-large' : '');

    sortedGroups.forEach(g => {
      const students = db.students[g.id] || [];
      const gradeCount = students.flatMap(s => periodList(s.grades, viewPeriod(todayStr))).filter(gr => !isNaN(gradeNumber(gr.value))).length;
      const groupAvg = calculateGroupAverage(g.id);   // Halbjahr wie in der Klassenansicht (Y7)
      const scale = gradeScale(g);
      // Wochentage aus dem Stundenplan; Vertretungen (L9) und beendete Stunden (M7) nicht
      const linkedSlots = db.lessonSlots.filter(s => s.groupId === g.id && !isOneOffSlot(s) && (!s.validUntil || s.validUntil >= todayStr));
      const scheduledDays = [...new Set(linkedSlots.map(s => s.day))].sort();
      const days = scheduledDays.map(d => DAY_SHORT[d]).join(', ');
      // „Als Nächstes“: statt der Tage die nächste Stunde; „Auffällige zuerst“: die Anzahl dazu
      const nextL = sort === 'next' ? nextByGroup.get(g.id) : null;
      const when = sort === 'next' ? (nextL ? `<span class="cr-next">${nextLessonLabelHTML(nextL, now)}</span>` : '<span class="cr-no-schedule">keine Stunde geplant</span>')
        : (days || '<span class="cr-no-schedule">Kein Stundenplan verknüpft</span>');
      const meta = [when, gradeCount + ' Noten'].join(' · ');

      const row = document.createElement('div');
      const cNotes = activeClassNotes(g, todayStr);
      row.style.setProperty('--card-color', safeColor(g.color));
      // Der Klassenname ist der Knopf (Tastatur, VoiceOver); die ganze Fläche öffnet per Klick mit. Keine Knöpfe in einem
      // Knopf: Die Kachel selbst hatte role="button", damit war ihr Inhalt für VoiceOver stumm (AH14)
      const nameBtn = `<button type="button" class="cr-name" aria-label="${escHtml(`Klasse ${g.className} ${g.subject || ''} öffnen`.replace(/\s+/g, ' ').trim())}">${escHtml(g.className)}</button>`;
      const notesBtn = `<button class="btn-icon cr-notes-btn" title="Notizen" aria-label="Notizen ${escHtml(g.className)}" onclick="event.stopPropagation();openClassNotes(${jsArg(g.id)})">${icon('pin')}</button>`;
      const editBtn = `<button class="btn-icon" title="Bearbeiten" aria-label="${escHtml(g.className)} bearbeiten" onclick="event.stopPropagation();openEditGroup(${jsArg(g.id)})">${icon('edit')}</button>`;
      const seatingBtn = `<button class="btn-secondary cr-seating-btn" title="Sitzplan" aria-label="Sitzplan ${escHtml(g.className)}" onclick="event.stopPropagation();openSeatingForGroup(${jsArg(g.id)})">${icon('seating')}<span>Sitzplan</span></button>`;
      const metaHTML = `<div class="cr-meta"><b>${escHtml([g.subject, g.year].filter(Boolean).join(' · '))}</b><small>${meta}${classTeacherText(g) ? ` · ${escHtml(classTeacherText(g))}` : ''}${classesView === 'list' && warnCount(g) ? ' ' + watchChip(g) : ''}</small></div>`;
      const numsHTML = `<div class="cr-nums">
            <span><em>${students.length}</em> Schüler</span>
            <span><em class="cr-avg" style="--grade:${gradeColor(groupAvg, scale)}">${formatGradeAverage(groupAvg)}</em> ${scale.higherIsBetter ? 'Pkt.' : 'Ø'}</span>
          </div>`;
      const notesHTML = cNotes.length ? classNotesInlineHTML(cNotes, 'cr-notes') : '';
      const avgHTML = `<em class="cr-avg" style="--grade:${gradeColor(groupAvg, scale)}">${formatGradeAverage(groupAvg)}</em>`;
      if (classesView === 'list') {
        // Zeile wie vor AH8 (AE8): gleiche Angaben in festen Spalten untereinander
        row.className = 'class-row' + (cNotes.length ? ' has-notes' : '');
        row.innerHTML = `${nameBtn}${metaHTML}${numsHTML}${notesHTML}
          <div class="cr-btns">${notesBtn}${seatingBtn}${editBtn}</div>`;
      } else if (classesView === 'large') {
        // A+ (AH14): links nur Fach und Tage, Mitte der Stapel, rechts Schülerzahl klein und Schnitt groß
        row.className = 'class-row class-tile is-large' + (cNotes.length ? ' has-notes' : '');
        row.innerHTML = `
        <div class="cr-head">${nameBtn}${notesBtn}${editBtn}</div>
        <div class="cr-meta"><small>${escHtml([g.subject, days, classTeacherText(g)].filter(Boolean).join(' · '))}</small></div>${notesHTML}
        ${classTileDetailsHTML(g, now, watchChip(g))}
        <div class="cr-foot"><div class="ct-score"><span>${students.length} Schüler</span><span><b>${avgHTML}</b> ${scale.higherIsBetter ? 'Pkt.' : 'Ø'}</span></div>${seatingBtn}</div>`;
      } else {
        row.className = 'class-row class-tile' + (cNotes.length ? ' has-notes' : '');
        // „auffällig“ und Klassennotizen als eine Reihe gleicher Plaketten, jede mit Symbol darin (sonst unterschiedlich eingerückt)
        const noteChips = cNotes.map(n => `<span class="ct-chip cn-chip">${icon('pin')}${escHtml(n.text.trim())}${isDateStr(n.until) ? ` <small>bis ${escHtml(formatDateDE(parseDate(n.until)))}</small>` : ''}</span>`).join('');
        const chipRow = warnCount(g) || cNotes.length
          ? `<div class="ct-chips${cNotes.length ? ' cr-notes' : ''}">${watchChip(g)}${noteChips}</div>` : '';
        row.innerHTML = `
        <div class="cr-head">${nameBtn}${notesBtn}${editBtn}</div>
        ${metaHTML}${chipRow}
        <div class="cr-foot">${numsHTML}${seatingBtn}</div>`;
      }
      row.addEventListener('click', () => openGroupStudents(g.id));
      const wc = row.querySelector('.ct-chip.is-watch');   // Antippen zeigt Namen, öffnet nicht die Klasse
      if (wc) wc.addEventListener('click', e => { e.stopPropagation(); if (watchPop && watchPop.btn === wc) closeWatchPop(); else openWatchPop(wc, g.id); });
      list.appendChild(row);
    });

    section.appendChild(list);
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
  document.getElementById('new-group-teacher').value = '';
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
  document.getElementById('new-group-teacher').value = g.classTeacher || '';
  
  document.getElementById('weight-schularbeit').value = g.schularbeitWeight !== undefined ? g.schularbeitWeight : 50;
  document.getElementById('new-group-scale').value = gradeScale(g).id;
  
  selectedGroupColor = g.color || APP_COLORS[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  const btnDelete = document.getElementById('btn-delete-group');
  btnDelete.style.display = 'block';
  btnDelete.onclick = () => { if (deleteGroup(id)) closeModal('modal-add-group'); };   // erst fragen, dann schließen (AR12)
  updateGroupClassPreview();

  openModal('modal-add-group');
}

function editCurrentGroup() { if (currentGroupId) openEditGroup(currentGroupId); }

// Klassenlehrer/in (AH51): nur der Name. „7b Mathe“ und „7b Physik“ sind getrennte Einträge derselben Klasse,
// darum reicht einmal Eintragen: Wer im selben Schuljahr noch keinen Namen hat, bekommt ihn mit; Vorhandenes bleibt.
const classTeacherText = g => (g && g.classTeacher ? `KL ${g.classTeacher}` : '');
function sameClassGroups(className, year) {
  const name = String(className || '').trim().toLowerCase();
  return db.groups.filter(g => String(g.className || '').trim().toLowerCase() === name && (g.year || '') === (year || ''));
}
function setClassTeacher(g, name) {
  if (name) g.classTeacher = name; else delete g.classTeacher;
  if (name) sameClassGroups(g.className, g.year).forEach(o => { if (!o.classTeacher) o.classTeacher = name; });
}
function saveSubjectGroup() {
  const className = document.getElementById('new-group-class').value.trim();
  // Beim Bearbeiten nie aufteilen: „Ethik 7a-d“ ist ein Name (R1)
  const classNames = editingGroupId ? [className] : parseClassNames(className);
  const subject   = document.getElementById('new-group-subject').value.trim();
  const year      = document.getElementById('new-group-year').value.trim();
  const teacher   = document.getElementById('new-group-teacher').value.trim();
  
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
      setClassTeacher(g, teacher);
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
      const known = sameClassGroups(c, year).find(o => o.classTeacher);   // vor dem Anlegen: neues Fach in bekannter Klasse
      const group = { id, className: c, subject, year, color: colors[i], schularbeitWeight: finalSchularbeitWeight, gradeScale: gradeScaleId };
      db.groups.push(group);
      setClassTeacher(group, teacher || (known ? known.classTeacher : ''));
      db.students[id] = [];
    });
    addedGroupsMessage = (fresh.length > 1 ? `${fresh.length} Klassen hinzugefügt ✓` : 'Klasse hinzugefügt ✓')
      + (skipped.length ? ` (${skipped.join(', ')} gab es schon)` : '');
  }
  saveDB();
  closeModal('modal-add-group');
  renderSubjectGroups();
  renderTimetable(); // Ensure timetable updates if colors changed
  renderNav();   // Schnellzugriff mit neuem Namen/Farbe (AR11)
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

// ─── Halbjahre (Y7) ────────────────────────────────────────────────────────
// Stichtag ist das Halbjahresende aus den Einstellungen (AD4), aber nur, wenn es in dieses Schuljahr gehört.
// Zeitraum = { key, from, to } (to null = offen) oder null = alles (kein Stichtag oder „Schuljahr“: wie bisher, nichts fällt weg).
// Welcher Zeitraum gezeigt wird, ist Ansichtszustand (Regel 19): nur in dieser Variable, nie in db, Standard vor dem
// Stichtag 1. Halbjahr, danach Schuljahr. Klassenansicht, Schüler-Fenster, Sitzplan und Bericht folgen ihm; die
// Warnungen zählen immer das laufende Halbjahr (runningHalf).
let periodChoice = null;   // null = Standard, sonst 'h1' | 'h2' | 'year'
const PERIOD_NAMES = { h1: '1. Halbjahr', h2: '2. Halbjahr', year: 'Schuljahr', all: 'Alle Jahre' };
// Nur ein Stichtag desselben Schuljahrs (AR4): Wer im Juli schon das nächste Halbjahresende einträgt, verliert sonst alle Noten
function halfYearSplit(todayStr = formatDate(new Date())) {
  const hy = db.settings.halfYearEnd;
  return isDateStr(hy) && schoolYearStart(hy) === schoolYearStart(todayStr) ? hy : null;
}
// „Schuljahr“ beginnt am 1. August (AR3); „Alle Jahre“ (null) nur für Klassen ohne Schuljahreswechsel mit alten Einträgen
function periodRange(key, todayStr = formatDate(new Date())) {
  const hy = halfYearSplit(todayStr);
  if (!hy || key === 'all') return null;
  if (key === 'year') return { key, from: schoolYearStart(hy), to: null };
  return key === 'h1' ? { key, from: schoolYearStart(hy), to: hy } : { key: 'h2', from: formatDate(addDays(parseDate(hy), 1)), to: null };
}
function periodKey(todayStr = formatDate(new Date())) {
  const hy = halfYearSplit(todayStr);
  if (!hy) return 'year';
  return periodChoice || (todayStr <= hy ? 'h1' : 'year');
}
const viewPeriod = (todayStr = formatDate(new Date())) => periodRange(periodKey(todayStr), todayStr);
function runningHalf(todayStr = formatDate(new Date())) {
  const hy = halfYearSplit(todayStr);
  return hy ? periodRange(todayStr <= hy ? 'h1' : 'h2', todayStr) : null;
}
function groupHasOlderEntries(groupId) {
  const range = periodRange('year');
  if (!range || !groupId) return false;
  return (db.students[groupId] || []).some(s => s && ['grades', 'attendance', 'participation', 'homework']
    .some(k => (Array.isArray(s[k]) ? s[k] : []).some(x => x && isDateStr(x.date) && x.date < range.from)));
}
// Einträge ohne gültiges Datum zählen immer (lieber sichtbar als still weg, Regel 7)
const inPeriod = (dateStr, range) => !range || !isDateStr(dateStr) || (dateStr >= range.from && (!range.to || dateStr <= range.to));
const periodList = (list, range) => (Array.isArray(list) ? list : []).filter(x => x && inPeriod(x.date, range));
// Neuer Eintrag außerhalb des gezeigten Halbjahrs: auf „Schuljahr“ stellen, statt ihn scheinbar verschwinden zu lassen
function revealPeriodOf(dateStr) {
  if (inPeriod(dateStr, viewPeriod())) return;
  periodChoice = inPeriod(dateStr, periodRange('year')) ? 'year' : 'all';
  overviewRenderedKey = null;
  updatePeriodSelect();
  showToast('Zeitraum auf „Schuljahr“ gestellt, damit der neue Eintrag zu sehen ist');
}
function setPeriodChoice(key) {
  periodChoice = PERIOD_NAMES[key] ? key : null;
  overviewRenderedKey = null;   // andere Spalten: neueste zeigen
  refreshPeriodViews();
}
// Alles, was dem Umschalter folgt, neu zeichnen
function refreshPeriodViews() {
  updatePeriodSelect();
  if (currentGroupId) refreshStudentViews(currentGroupId);   // Sitzplan und Schüler-Fenster zeichnen beim Öffnen neu
}
function updatePeriodSelect() {
  const sel = document.getElementById('period-select'), pick = document.getElementById('period-pick');
  if (!sel || !pick) return;
  const has = !!halfYearSplit();   // ohne Halbjahresende in den Einstellungen gibt es nichts umzuschalten
  pick.classList.toggle('hidden', !has);
  if (!has) return;
  // Handy: kurze Namen, sonst verdrängt der Umschalter den Klassennamen im Kopf (Y7, im Browser bei 375 px gemessen)
  const narrow = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
  const SHORT = { h1: '1. Hj', h2: '2. Hj', year: 'Jahr', all: 'Alle' };
  [...sel.options].forEach(o => { o.textContent = narrow ? SHORT[o.value] : PERIOD_NAMES[o.value]; });
  // „Alle Jahre“ nur, wenn die Klasse Einträge aus früheren Schuljahren hat (kein Schuljahreswechsel, AR3)
  const all = sel.querySelector('option[value="all"]');
  if (all) all.hidden = periodKey() !== 'all' && !groupHasOlderEntries(currentGroupId);
  sel.value = periodKey();
}
if (window.matchMedia) {
  const mq = window.matchMedia('(max-width: 600px)');
  if (mq.addEventListener) mq.addEventListener('change', updatePeriodSelect);
}

// Teil-Durchschnitte nach Gewichtungs-Kategorie (siehe gradeCategory), jeweils null wenn keine Noten.
function calculateGradeCategoryAverages(student, range = viewPeriod()) {
  const sums = { schularbeit: 0, sonstige: 0 }, counts = { schularbeit: 0, sonstige: 0 };
  periodList(student && student.grades, range).forEach(gr => {
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

function calculateStudentAverage(student, groupId, range = viewPeriod()) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !student || !student.grades || student.grades.length === 0) return null;

  const wSchularbeit = getSchularbeitWeight(g);
  const wSonstige = 100 - wSchularbeit;
  const { schularbeit: avgSchularbeit, sonstige: avgSonstige } = calculateGradeCategoryAverages(student, range);

  // 100 % bzw. 0 %: Die andere Art zählt laut Tabelle nicht, also bildet sie auch allein keinen Schnitt (AR8)
  if (wSchularbeit === 100) return avgSchularbeit === null ? null : smoothAverage(avgSchularbeit);
  if (wSchularbeit === 0) return avgSonstige === null ? null : smoothAverage(avgSonstige);
  if (avgSchularbeit !== null && avgSonstige !== null) {
    return smoothAverage((avgSchularbeit * wSchularbeit + avgSonstige * wSonstige) / 100);
  } else if (avgSchularbeit !== null) {
    return smoothAverage(avgSchularbeit);
  } else if (avgSonstige !== null) {
    return smoothAverage(avgSonstige);
  }
  return null;
}
// Kommazahlen sind im Computer nur ungefähr: 4,5 kommt als 4,4999999… heraus. Auf 12 Stellen glätten, damit Grenzen
// (Warnung ab 4,5) und Runden (2,15 → 2,2) stimmen (AR1).
const smoothAverage = x => (typeof x === 'number' && isFinite(x) ? Number(x.toPrecision(12)) : x);

// Klassenschnitt = Mittel der Schülerschnitte (Schüler ohne Noten zählen nicht)
function calculateGroupAverage(groupId, range = viewPeriod()) {
  const avgs = (db.students[groupId] || []).map(s => calculateStudentAverage(s, groupId, range)).filter(a => a !== null);
  return avgs.length ? smoothAverage(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
}

function deleteGroup(id) {
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  const studentCount = (db.students[id] || []).length;
  const slotIds = new Set(getGroupSlots(id).map(s => s.id));
  if (!confirm(`Klasse ${g.className} (${g.subject}) mit ${studentCount} Schüler(n), allen Noten/Einträgen und ${slotIds.size} Stunde(n) im Stundenplan löschen?`)) return false;
  removeGroupData(id);
  saveDB();
  if (currentSeatingGroupId === id) currentSeatingGroupId = '';
  if (currentGroupId === id || currentOverviewGroupId === id) {
    currentOverviewGroupId = null;
    goBackToSubjects();
  } else {
    renderSubjectGroups();
  }
  renderTimetable();
  renderNav();
  showToast('Klasse gelöscht');
  return true;
}

// Klasse samt Abhängigem aus db entfernen (Regel 10), ohne Rückfrage und ohne Speichern. Auch für den Schuljahreswechsel (Y6).
function removeGroupData(id) {
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  const slotIds = new Set(getGroupSlots(id).map(s => s.id));
  const shared = studentAppOf(g).access;   // Schülerseite der Klasse mit weg (AJ1, Regel 10)
  if (shared) queueShareDeletion(shared.id);
  queueStudentShares(g);                    // und die persönlichen Seiten (AJ2)
  db.groups = db.groups.filter(x => x.id !== id);
  delete db.students[id];
  // Stunden der Klasse samt ihren Stundendaten (Schlüssel '<slotId>_<Datum>') entfernen
  db.lessonSlots = db.lessonSlots.filter(s => !slotIds.has(s.id));
  Object.keys(db.lessonData || {}).forEach(key => {
    if (slotIds.has(key.slice(0, key.lastIndexOf('_')))) delete db.lessonData[key];
  });
  todosOf().forEach(t => { if (t.groupId === id) delete t.groupId; });   // Merkzettel bleibt, nur ohne Klasse (AH18)
  if (Array.isArray(db.settings.quickLinks)) {   // Schnellzugriff der Klasse mit weg (AH48)
    db.settings.quickLinks = db.settings.quickLinks.filter(l => !(l && l.groupId === id));
    if (!db.settings.quickLinks.length) delete db.settings.quickLinks;
  }
}

// ─── Class Overview (Tabelle) ─────────────────────────────────────────────
let currentOverviewGroupId = null;
let currentOverviewTab = 'grades';

function openClassOverview(groupId) {
  openGroupStudents(groupId, 'grades');
}

let currentClassDashboardTab = 'students';

function switchClassDashboardTab(tabName) {
  if (tabName === 'studentapp' && !studentAppOn()) tabName = 'students';   // Schülerapp aus: Reiter gibt es nicht (AJ1, AR13)
  currentClassDashboardTab = tabName;
  overviewRenderedKey = null;   // neu geöffnet: neueste Spalte zeigen, nicht die alte Scroll-Stelle (AH24)
  document.querySelectorAll('#view-students .tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('overview-tab-' + tabName);
  if (activeBtn) activeBtn.classList.add('active');
  
  const studentsContainer = document.getElementById('students-container');
  const overviewContent = document.getElementById('overview-content');
  const addColBtn = document.getElementById('btn-add-overview-col');
  const actionBtn = document.getElementById('btn-student-actions');
  
  if (tabName === 'plan' || tabName === 'studentapp') {   // Unterrichtsplanung (AD3), Schülerapp (AJ1)
    studentsContainer.classList.add('hidden');
    overviewContent.classList.remove('hidden');
    if (addColBtn) addColBtn.classList.add('hidden');
    if (actionBtn) actionBtn.classList.add('hidden');
    if (isStudentEditMode) toggleStudentEditMode();
    const bar = document.getElementById('mass-delete-bar');
    if (bar) bar.classList.add('hidden');
    currentOverviewTab = tabName;
    currentOverviewGroupId = currentGroupId;
    if (tabName === 'plan') renderPlanTab(); else renderStudentAppTab();
    updateClassGradesButton();
    return;
  }
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
  updateClassGradesButton();
}

function switchOverviewTab(tabName) {
  switchClassDashboardTab(tabName);
}
// ─── Beamer-Schutz in der Klassenansicht (AH24 c, Regel 16/67) ───────────────
// Schnitte, Noten-Tabelle und Mitarbeit nur auf Knopfdruck. Nie gespeichert; weg beim Öffnen einer Klasse,
// beim Verlassen der Klassenansicht und beim Verlassen der App.
let classGradesShown = false;
const CLASS_GRADE_TABS = ['students', 'grades', 'participation'];
function updateClassGradesButton() {
  const b = document.getElementById('btn-class-grades');
  const tab = currentClassDashboardTab;
  if (b) {
    b.classList.toggle('hidden', !CLASS_GRADE_TABS.includes(tab) || !classGradesProtected());
    const label = classGradesShown ? 'Noten verbergen' : 'Noten anzeigen';
    b.setAttribute('aria-pressed', String(classGradesShown));
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = icon(classGradesShown ? 'eye-off' : 'eye') + `<span class="btn-label">${classGradesShown ? 'Verbergen' : 'Noten zeigen'}</span>`;
  }
  updateOverviewAddButtons();
}
function rerenderClassTab() {
  if (!document.getElementById('view-students').classList.contains('active')) return;
  if (currentClassDashboardTab === 'students') renderStudents();
  else if (currentClassDashboardTab === 'studentapp') renderStudentAppTab();
  else if (currentClassDashboardTab !== 'plan') renderOverviewTable();
}
// Einstellung (AH24 c): Beamer-Schutz abschaltbar; Standard an, gespeichert wird nur „aus“ (classGradesProtect: false)
const classGradesProtected = () => db.settings.classGradesProtect !== false;
function hideClassGrades() {
  classGradesShown = !classGradesProtected();   // ohne Schutz: alles sofort sichtbar
  updateClassGradesButton();
}
function toggleClassGrades() {
  classGradesShown = !classGradesShown;
  updateClassGradesButton();
  rerenderClassTab();
}
function showClassGrades() { if (!classGradesShown) toggleClassGrades(); }
function gradesVeilHTML(text, big = false) {
  return `<div class="grades-veil${big ? ' grades-veil-big' : ''}">${icon('eye-off')}<span>${escHtml(text)}</span><button type="button" class="btn-secondary">Anzeigen</button></div>`;
}
function wireGradesVeil(container) {
  const b = container.querySelector('.grades-veil button');
  if (b) b.addEventListener('click', showClassGrades);
}

// Notentabelle ruhig (AH24 d): nur schwache Noten farbig – 1–3 in Schriftfarbe, 4 orange, 5–6 (Punkte unter 5) rot
// mit Fläche. Farbe der Skala kommt weiter aus gradeColor (Regel 1).
function gradeInk(val, scale) {
  const c = gradeColor(val, scale);
  if (c === 'var(--grade-5)') return 'var(--danger)';
  if (c === 'var(--grade-4)' || c === 'var(--text-muted)') return c;
  return 'var(--text-primary)';
}
const gradeIsWeak = (val, scale) => gradeColor(val, scale) === 'var(--grade-5)';

// Kopfknöpfe der Tabellen (AH24 e): Noten „+ Neue Spalte“ (Fenster: Titel, Art), sonst „+ Heute“ ohne Fenster
// und „Andere Spalte …“ für andere Tage
function updateOverviewAddButtons() {
  const add = document.getElementById('btn-add-overview-col'), other = document.getElementById('btn-add-overview-other');
  if (!add || !other) return;
  const tab = currentClassDashboardTab;
  const tableTab = ['grades', 'participation', 'attendance', 'homework'].includes(tab);
  const veiled = (tab === 'grades' || tab === 'participation') && !classGradesShown;
  add.classList.toggle('hidden', !tableTab || veiled);
  other.classList.toggle('hidden', !tableTab || veiled || tab === 'grades');
  const today = tab !== 'grades';
  add.setAttribute('aria-label', today ? 'Spalte für heute' : 'Neue Spalte');
  add.innerHTML = '+<span class="btn-label">' + (today ? ' Heute' : ' Neue Spalte') + '</span>';
}
function addOverviewColumn() {
  if (currentOverviewTab === 'grades') { openAddColumnModal(); return; }
  addTodayColumn();
}
function addTodayColumn() {
  const tab = currentOverviewTab;
  const field = { participation: 'participationEvents', attendance: 'attendanceEvents', homework: 'homeworkEvents' }[tab];
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  if (!field || !group) return;
  const date = profileDefaultDate();   // am Wochenende/in den Ferien der letzte Schultag (Regel 58)
  const key = tab === 'attendance' ? date : `${date}_`;
  if (overviewColumnKeys(group, db.students[currentOverviewGroupId] || []).has(key)) showToast('Die Spalte für heute gibt es schon');
  else { (group[field] = group[field] || []).push({ date, label: '' }); saveDB(); }
  revealPeriodOf(date);
  overviewRenderedKey = null;   // neueste Spalte zeigen
  renderOverviewTable();
}

// Spaltenkopf der Tabellen: Wochentag + Datum ohne Jahr (schmalere Spalten), Spalte von heute markiert (AH24)
function overviewDateHead(dateStr) { return escHtml(formatWeekdayShort(dateStr)); }
// Kopf einer Tabellenspalte: oben das Datum, darunter Art und Titel; alle Reiter gleich (AH40). tagHTML ist fertiges Markup.
// Passen nicht alle Spalten, wird die Breite so gewählt, dass nur ganze Spalten zu sehen sind; null = alle passen (AH40)
function overviewColWidth(free, cols, base) {
  const fit = Math.floor(free / base);
  return fit >= 1 && cols > fit ? free / fit : null;
}
function fitOverviewColumns() {
  const wrap = document.querySelector('#overview-content .overview-table-wrapper');
  const table = wrap && wrap.querySelector('table');
  if (!table || !wrap.clientWidth) return;
  table.style.removeProperty('--ov-col');
  const css = getComputedStyle(wrap);
  const [base, name, sum] = ['--ov-col', '--ov-name', '--ov-sum'].map(v => Number(css.getPropertyValue(v).trim().replace(/px$/, '')));
  if (!base || !name || !sum) return;   // schmal: rechnet style.css selbst (zwei Spalten)
  const width = overviewColWidth(wrap.clientWidth - name - sum, table.querySelectorAll('thead th').length - 2, base);
  if (width) table.style.setProperty('--ov-col', width + 'px');
}
// Fenster gedreht, Seitenleiste eingeklappt, Split View: Spalten neu einpassen
if (typeof ResizeObserver === 'function') new ResizeObserver(fitOverviewColumns).observe(document.getElementById('overview-content'));
function overviewColHead(dateStr, label, tagHTML = '') {
  const title = label ? `<span class="col-title" title="${escHtml(label)}">${escHtml(label)}</span>` : '';
  return `<div class="col-date">${overviewDateHead(dateStr)}</div>${tagHTML || title ? `<div class="col-sub">${tagHTML}${title}</div>` : ''}`;
}
const overviewTodayClass = dateStr => dateStr === formatDate(new Date()) ? ' class="ov-today"' : '';
// Welche Tabelle zuletzt gezeichnet wurde: gleiche Tabelle = Scroll-Stelle behalten (AH23), neue = neueste Spalte zeigen
let overviewRenderedKey = null;
function renderOverviewTable() {
  closeParticipationPicker();   // hängt an einer Zelle, die gleich ersetzt wird
  if (!currentOverviewGroupId) return;
  if (currentOverviewTab === 'plan') { renderPlanTab(); return; } // Planung ist keine Tabelle
  if (currentOverviewTab === 'studentapp') { renderStudentAppTab(); return; } // Schülerapp (AJ1) auch nicht
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
  if ((currentOverviewTab === 'grades' || currentOverviewTab === 'participation') && !classGradesShown) {
    content.innerHTML = gradesVeilHTML(currentOverviewTab === 'grades'
      ? 'Die Noten sind verborgen, damit am Beamer niemand mitliest.'
      : 'Die Mitarbeit ist verborgen, damit am Beamer niemand mitliest.', true);
    wireGradesVeil(content);
    overviewRenderedKey = null;   // beim Anzeigen: neueste Spalte zeigen
    return;
  }
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];
  // Neu zeichnen ersetzt den Scrollbereich: Stelle merken, sonst springt die Tabelle nach jedem Eintrag an den Anfang (AH23)
  const renderKey = currentOverviewGroupId + '|' + currentOverviewTab;
  const oldWrap = content.querySelector('.overview-table-wrapper');
  const keepScroll = oldWrap && overviewRenderedKey === renderKey
    ? { left: oldWrap.scrollLeft, top: oldWrap.scrollTop, outer: content.scrollTop } : null;
  
  if (!students.length) {
    content.innerHTML = '<div class="empty-state" style="padding:var(--space-5);text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
    return;
  }

  const sortedStudents = sortStudents(students);
  const range = viewPeriod();   // Halbjahr (Y7): nur Spalten und Einträge aus dem gewählten Zeitraum
  const inRange = ev => inPeriod(ev.date, range);
  let html = '<div class="overview-table-wrapper"><table class="overview-table"><thead><tr><th class="ov-name-col">Schüler</th>';

  if (currentOverviewTab === 'grades') {
    const gradeEvents = gradeColumns(group, sortedStudents).filter(inRange);

    html += '<th class="ov-sum-col">Ø</th>';
    const weight = getSchularbeitWeight(group);
    gradeEvents.forEach(ev => {
      const type = ev.type || 'test';
      const weighted = gradeCategory(type) === 'schularbeit';
      const typeTitle = weighted ? `${gradeTypeName(type)}: zählt ${weight} % der Note` : `${gradeTypeName(type)}: Sonstige, zählt ${100 - weight} % der Note`;
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)}, ${jsArg(type)}, ${ev.nth})">`
        + overviewColHead(ev.date, ev.label || gradeTypeName(type), `<span class="col-type${weighted ? ' weighted' : ''}" title="${escHtml(typeTitle)}">${escHtml(gradeTypeShort(type))}</span>`) + '</th>';
    });
    html += '</tr></thead><tbody>';

    const scale = gradeScale(currentOverviewGroupId);
    sortedStudents.forEach(s => {
      const rawAvg = calculateStudentAverage(s, currentOverviewGroupId);
      const avg = formatGradeAverage(rawAvg);
      
      const nameDisplay = escHtml(studentListName(s));
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${nameDisplay}">${nameDisplay}</span></td>`;
      html += `<td class="ov-sum-col" style="font-weight:700;color:${gradeInk(rawAvg, scale)};text-align:center;">${avg}</td>`;
      
      gradeEvents.forEach(ev => {
        const grade = findColumnGrade(s, ev);
        const val = grade ? grade.value : '';
        const num = val ? gradeNumber(val) : NaN;
        const weak = !isNaN(num) && gradeIsWeak(num, scale);
        html += `<td class="ov-grade-cell${weak ? ' ov-grade-weak' : ''}"><input type="text" enterkeyhint="next" class="form-input ov-grade-input" style="font-weight:${weak ? 700 : 600}; color:${val ? gradeInk(num, scale) : 'inherit'}" value="${escHtml(gradeText(val))}" placeholder="–" onchange="updateInlineGrade(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label)}, this.value, ${jsArg(ev.type)}, ${ev.nth})" /></td>`;
      });
      html += `</tr>`;
    });
    
    // Bottom average row
    html += '<tr><td class="ov-name-col" style="font-weight:700;">Durchschnitt</td>';
    const groupAvg = calculateGroupAverage(currentOverviewGroupId);
    html += `<td class="ov-sum-col" style="font-weight:700;color:${gradeInk(groupAvg, scale)};text-align:center;">${formatGradeAverage(groupAvg)}</td>`;

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
      html += `<td style="font-weight:700;color:${gradeInk(colAvg, scale)};text-align:center;">${formatGradeAverage(colAvg)}</td>`;
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
    const partDates = Array.from(partEventsMap.values()).filter(inRange).sort((a,b) => a.date.localeCompare(b.date));
    
    html += `<th class="ov-sum-col ov-part-head" title="Mitarbeit: ${PART_LEVELS.map(l => l.word).join(' / ')}">${PART_LEVELS.map(l => l.sign).join('<span class="sep">/</span>')}</th>`;
    partDates.forEach(ev => {
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})">${overviewColHead(ev.date, ev.label)}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      
      const shown = partDates.map(ev => (s.participation||[]).find(x => x.date === ev.date && (x.label||'') === (ev.label||''))).filter(Boolean);
      // Wie im Reiter Schüler: Schrägstriche, nur „schwach“ rot (AH24, AH52)
      html += `<td class="ov-sum-col ov-sum">${partCountsHTML(shown)}</td>`;

      partDates.forEach(ev => {
        const pIdx = (s.participation||[]).findIndex(x => x.date === ev.date && (x.label||'') === (ev.label||''));
        const val = pIdx !== -1 ? s.participation[pIdx].value : '';
        // Antippen öffnet die Auswahl; leer ist ein leiser Strich (AH24), Stufen als Zeichen (AH52)
        const lvl = partLevel(val);
        const label = `Mitarbeit ${studentListName(s)}, ${formatWeekdayShort(ev.date)}: ${lvl ? lvl.word : (val || 'keine')}`;
        html += `<td class="ov-part-cell">
          <button type="button" class="ov-part-btn" aria-label="${escHtml(label)}" onclick="openParticipationPicker(this, ${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')})">${val ? partSignHTML(val) : '<span class="ov-empty" aria-hidden="true">–</span>'}</button>
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
    const attDates = Array.from(attEventsMap.values()).filter(inRange).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th class="ov-sum-col" title="Fehltage unentschuldigt (F) / entschuldigt (E), ohne zu spät (Z)"><span class="ov-wide-only">Fehlt </span>F / E</th>';
    attDates.forEach(ev => {
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})">${overviewColHead(ev.date, ev.label)}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      // Wie im Reiter Schüler: F / E, nur unentschuldigte rot (AH24)
      const missF = periodList(s.attendance, range).filter(a => a.type === 'abwesend').length;
      const missE = periodList(s.attendance, range).filter(a => a.type === 'entschuldigt').length;
      html += `<td class="ov-sum-col ov-sum"><span${missF ? ' class="n-bad"' : ''}>${missF}</span> <span class="sep">/</span> <span>${missE}</span></td>`;

      attDates.forEach(ev => {
        const aIdx = (s.attendance||[]).findIndex(x => x.date === ev.date);
        const status = aIdx !== -1 ? s.attendance[aIdx].type : ''; // 'abwesend', 'entschuldigt', 'zuspät'
        const displayVal = ATTENDANCE_SHORT[status] || '';
        // Antippen schaltet weiter – → F → E → Z → – (AH24 e); am Laptop F/E/Z/Entf tippbar
        const label = `Fehlzeit ${studentListName(s)}, ${formatWeekdayShort(ev.date)}: ${{ abwesend: 'fehlt', entschuldigt: 'entschuldigt', 'zuspät': 'zu spät' }[status] || 'da'}`;
        html += `<td class="ov-cycle-cell"><button type="button" class="ov-cycle-btn${status === 'abwesend' ? ' is-bad' : ''}" data-kind="att" data-sid="${escHtml(s.id)}" data-date="${escHtml(ev.date)}" aria-label="${escHtml(label)}" onclick="cycleInlineAttendance(${jsArg(s.id)}, ${jsArg(ev.date)})">${displayVal}</button></td>`;
      });
      html += `</tr>`;
    });
  } else if (currentOverviewTab === 'homework') {
    const hwEventsMap = new Map();
    (group.homeworkEvents || []).forEach(ev => hwEventsMap.set(`${ev.date}_${ev.label||''}`, { date: ev.date, label: ev.label||'' }));
    sortedStudents.forEach(s => {
      (s.homework || []).forEach(h => hwEventsMap.set(`${h.date}_${h.note||''}`, { date: h.date, label: h.note||'' }));
    });
    const hwDates = Array.from(hwEventsMap.values()).filter(inRange).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th class="ov-sum-col" title="Wie oft die Hausaufgaben gefehlt haben">Vergessen</th>';
    hwDates.forEach(ev => {
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})">${overviewColHead(ev.date, ev.label)}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      const totalMissed = periodList(s.homework, range).length;
      html += `<td class="ov-sum-col" style="text-align:center;font-weight:600;color:${totalMissed ? 'var(--danger)' : 'var(--text-muted)'};">${totalMissed}</td>`;

      hwDates.forEach(ev => {
        const hIdx = (s.homework||[]).findIndex(x => x.date === ev.date && (x.note||'') === (ev.label||''));
        const hasMissed = hIdx !== -1;
        const label = `Hausaufgabe ${studentListName(s)}, ${formatWeekdayShort(ev.date)}: ${hasMissed ? 'vergessen' : 'da'}`;
        html += `<td class="ov-cycle-cell"><button type="button" class="ov-cycle-btn is-bad" data-kind="hw" data-sid="${escHtml(s.id)}" data-date="${escHtml(ev.date)}" data-label="${escHtml(ev.label || '')}" aria-label="${escHtml(label)}" onclick="cycleInlineHomework(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')})">${hasMissed ? 'X' : ''}</button></td>`;
      });
      html += `</tr>`;
    });
  }

  html += '</tbody></table></div>';
  // Erklärzeile auf jedem Reiter, damit die Tabelle überall an derselben Stelle beginnt (AH40)
  const legend = {
    grades: '<span>Antippen zum Eintragen</span><span>Ø = Schnitt mit Gewichtung</span>',
    participation: `<span class="ov-hint-wide">Antippen wählt:</span>${PART_LEVELS.map(l => `<span>${partSignHTML(l.value)} ${l.word}</span>`).join('')}`,
    attendance: '<span class="ov-hint-wide">Antippen schaltet weiter:</span><span class="ov-hint-wide">leer = da</span><span><b>F</b> fehlt</span><span><b>E</b> entschuldigt</span><span><b>Z</b> zu spät</span>',
    homework: '<span>Antippen: <b>X</b> = Hausaufgabe vergessen</span>',
  }[currentOverviewTab];
  content.innerHTML = `<div class="ov-legend">${legend}</div>` + html;
  const wrapEl = content.querySelector('.overview-table-wrapper');
  if (wrapEl) {
    wrapEl.addEventListener('scroll', () => {   // Wischen schließt die Auswahl; das späte Scroll-Ereignis vom Springen zur neuesten Spalte nicht
      if (ovPartPicker && (wrapEl.scrollLeft !== ovPartPicker.left || wrapEl.scrollTop !== ovPartPicker.top)) closeParticipationPicker();
    }, { passive: true });
    const tableEl = wrapEl.querySelector('table');
    tableEl.style.setProperty('--ov-cols', tableEl.querySelectorAll('thead th').length - 2);   // für die Mindestbreite (AH40)
    fitOverviewColumns();
    if (keepScroll) { wrapEl.scrollLeft = keepScroll.left; wrapEl.scrollTop = keepScroll.top; content.scrollTop = keepScroll.outer; }
    else wrapEl.scrollLeft = wrapEl.scrollWidth;   // neu geöffnet: neueste Spalte (rechts) zeigen (AH24)
  }
  overviewRenderedKey = renderKey;
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
    showToast('Bitte zuerst die erste Spalte „' + label + '“ ausfüllen. Gleichnamige Spalten füllen sich von links', 'error');
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
    if (parsed.number === null) showToast(`„${parsed.value}“ gespeichert, zählt nicht im Schnitt`);
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

// Mitarbeit in der Tabelle (AH24 e): Antippen öffnet eine kleine Auswahl ++ + − −− leer neben dem Feld (AH52)
let ovPartPicker = null;   // { btn, left, top }: Scroll-Stelle der Tabelle beim Öffnen
function closeParticipationPicker() {
  const p = document.getElementById('ov-part-pop');
  if (p) p.remove();
  ovPartPicker = null;
}
function openParticipationPicker(btn, studentId, date, label) {
  closeParticipationPicker();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s || !btn) return;
  const cur = (s.participation || []).find(p => p.date === date && (p.label || '') === (label || ''));
  const curVal = cur ? cur.value : '';
  const opts = [...PART_LEVELS.map(l => [l.value, partSignHTML(l.value), l.word]), ['', 'leer', 'leer']];
  const pop = document.createElement('div');
  pop.id = 'ov-part-pop';
  pop.className = 'ov-part-pop';
  pop.setAttribute('role', 'group');
  pop.setAttribute('aria-label', `Mitarbeit ${studentListName(s)}, ${formatWeekdayShort(date)}`);
  pop.innerHTML = opts.map(([v, face, name]) => `<button type="button" class="${curVal === v ? 'on' : ''}${v ? '' : ' is-clear'}" data-val="${v}" aria-label="${name}">${face}</button>`).join('');
  document.body.appendChild(pop);
  pop.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    closeParticipationPicker();
    setInlineParticipation(studentId, date, label, b.dataset.val || null);
  }));
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 220, h = pop.offsetHeight || 60;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
  const top = r.bottom + 4 + h > window.innerHeight - 8 ? r.top - h - 4 : r.bottom + 4;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  const wrap = btn.closest('.overview-table-wrapper');
  ovPartPicker = { btn, left: wrap ? wrap.scrollLeft : 0, top: wrap ? wrap.scrollTop : 0 };
  // Mit Tastatur den Fokus in die Auswahl, mit dem Finger nicht (sonst steht ein Fokusrahmen da)
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const focusEl = pop.querySelector('button.on') || pop.querySelector('button');
  if (!coarse) try { focusEl.focus({ preventScroll: true }); } catch (e) { /* nicht fokussierbar */ }
}
// Tippen daneben (Druck auch daneben begonnen, Regel 27) oder Escape schließt ohne Änderung
document.addEventListener('click', e => {
  const p = document.getElementById('ov-part-pop');
  if (!p || p.contains(e.target) || pressStartedIn(p)) return;
  if (ovPartPicker && ovPartPicker.btn.contains(e.target)) return;   // der Tipp, der sie gerade geöffnet hat
  closeParticipationPicker();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('ov-part-pop')) closeParticipationPicker(); });
function setInlineParticipation(studentId, date, label, value) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.participation) s.participation = [];
  const cur = s.participation.find(p => p.date === date && (p.label || '') === (label || ''));
  if (value) {
    if (cur) cur.value = value;
    else s.participation.push({ id: uid(), date, label: label || '', value });
  } else if (cur) {
    s.participation.splice(s.participation.indexOf(cur), 1);
    const gid = currentOverviewGroupId;
    showUndoToast(`Mitarbeit am ${formatWeekdayShort(date)} entfernt`, () => restoreSeatingEntry(gid, s, 'participation', cur));
  } else return;
  saveDB();
  renderOverviewTable();
}

// Fehlzeiten/HA per Antippen (AH24 e). Umschalten behält den Eintrag samt Grund (Regel 50); Entfernen bietet
// „Rückgängig“ (Regel 45)
const ATT_CYCLE = ['', 'F', 'E', 'Z'];
function setAttendanceWithUndo(studentId, date, letter) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  const before = (s.attendance || []).find(a => a.date === date);
  updateInlineAttendance(studentId, date, letter);
  if (before && !letter && !(s.attendance || []).includes(before)) {
    const gid = currentOverviewGroupId;
    showUndoToast(`Fehlzeit am ${formatWeekdayShort(date)} entfernt`, () => restoreSeatingEntry(gid, s, 'attendance', before,
      () => { if (before.type === 'abwesend') addAbsenceNote(gid, date, s); }));
  }
}
function cycleInlineAttendance(studentId, date) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  const cur = (s.attendance || []).find(a => a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  const next = ATT_CYCLE[(ATT_CYCLE.indexOf(cur ? ATTENDANCE_SHORT[cur.type] : '') + 1) % ATT_CYCLE.length];
  setAttendanceWithUndo(studentId, date, next);
}
function cycleInlineHomework(studentId, date, label) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  const cur = (s.homework || []).find(h => h.date === date && (h.note || '') === (label || ''));
  if (!cur) { updateInlineHomework(studentId, date, label, 'X'); return; }
  updateInlineHomework(studentId, date, label, '');
  const gid = currentOverviewGroupId;
  showUndoToast(`Hausaufgabe am ${formatWeekdayShort(date)} entfernt`, () => restoreSeatingEntry(gid, s, 'homework', cur));
}
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

function updateInlineAttendance(studentId, date, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];
  // Doppelte Tageseinträge aus Altdaten (Q2, W4, Q6) zu einem zusammenfassen, Gründe bleiben (AR14, Regel 50)
  const day = s.attendance.filter(a => a && a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  const wasUnexcusedAny = day.some(a => a.type === 'abwesend');
  if (day.length > 1) {
    const notes = [...new Set(day.map(a => String(a.note || '').trim()).filter(Boolean))];
    day[0].note = notes.join(' / ');
    day.slice(1).forEach(a => s.attendance.splice(s.attendance.indexOf(a), 1));
  }
  const idx = s.attendance.findIndex(a => a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  
  const status = Object.keys(ATTENDANCE_SHORT).find(t => ATTENDANCE_SHORT[t] === value) || null;

  // Nur ein leeres Feld löscht. Ein Tippfehler („U“ statt „E“) darf den Eintrag samt Grund nicht still entfernen (BUGS K5).
  if (value && !status) {
    showToast('Bitte F, E oder Z eingeben (leer = Eintrag löschen)', 'error');
    renderOverviewTable(); // Eingabe zurücksetzen
    return;
  }
  const wasUnexcused = wasUnexcusedAny;
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
  document.getElementById('new-col-date').value = profileDefaultDate();   // Wochenende/Ferien: letzter Schultag (AR5)
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
  revealPeriodOf(newDate);
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
  rememberSearchRecent({ kind: 'group', groupId });   // „Zuletzt geöffnet“ in der Suche (AH19)
  hideClassGrades();   // Beamer-Schutz: jede Klasse öffnet verborgen (AH24 c)
  setClassViewHeader(g);
  switchView('students');
  updateStudentAppTabVisibility();   // Reiter „Schülerapp“ nur, wenn sie an ist (AJ1)
  updatePeriodSelect();   // Halbjahr (Y7)
  switchClassDashboardTab(initialTab);
}

// Klasse groß, Fach klein wie in Stundenplan und Klassenkarten (BUGS I13); auch nach dem Bearbeiten (L7)
function setClassViewHeader(g) {
  document.getElementById('student-view-title').textContent = g.className;
  document.getElementById('student-view-subtitle').textContent = [g.subject, g.year, classTeacherText(g)].filter(Boolean).join(' · ');
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
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;justify-content:center;margin-top:var(--space-3)">
        <button class="btn-primary" onclick="openAddStudent()">Schüler hinzufügen</button>
        <button class="btn-secondary" onclick="openImportStudentsModal()">Liste einfügen</button>
      </div>
    </div>`;
    return;
  }
  // Schlichte Liste mit Kopfzeile statt einer Karte je Schüler (BUGS AE8)
  const showGrades = classGradesShown;   // Beamer-Schutz (AH24 c): Schnitt und Mitarbeit nur auf Knopfdruck
  container.innerHTML = (showGrades ? '' : gradesVeilHTML('Schnitte und Mitarbeit sind verborgen, damit am Beamer niemand mitliest.'))
    + `<div class="students-head${showGrades ? '' : ' is-veiled'}" aria-hidden="true">${isStudentEditMode ? '<span class="students-head-cb"></span>' : ''}
    <span class="students-head-main">Name</span>${showGrades ? `<span class="students-head-part">Mitarbeit ${PART_LEVELS.map(l => l.sign).join(' / ')}</span>` : ''}
    <span class="students-head-att">Fehlt F / E</span>${showGrades ? '<span class="students-head-avg">Ø</span>' : ''}</div>`;
  wireGradesVeil(container);
  const scale = gradeScale(currentGroupId);
  const todayStr = formatDate(new Date());
  const range = viewPeriod(todayStr);   // Halbjahr (Y7)
  sortStudents(students).forEach(s => {
    const avg = calculateStudentAverage(s, currentGroupId, range);
    const att = periodList(s.attendance, range), part = periodList(s.participation, range);
    const attUnexcused = att.filter(a => a.type==='abwesend').length;
    const attExcused = att.filter(a => a.type==='entschuldigt').length;
    const partN = partCounts(part);
    const hints = {
      participation: { title: 'Mitarbeit', lines: PART_LEVELS.map((l, i) => [partN[i], l.word]) },
      attendance: { title: 'Fehltage', lines: [[attUnexcused, 'unentschuldigt', 'danger'], [attExcused, 'entschuldigt', 'success']] },
    };
    const hintText = kind => `${hints[kind].title}: ` + hints[kind].lines.map(([n, label]) => `${n} ${label}`).join(', ');

    const grades = periodList(s.grades, range);
    const row = document.createElement('div');
    row.className = 'student-row';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.setAttribute('aria-label', `Schülerakte öffnen: ${studentListName(s)}`);
    row.innerHTML = `
      ${isStudentEditMode ? `<input type="checkbox" class="student-select-cb" data-id="${escHtml(s.id)}" onclick="event.stopPropagation(); updateMassDeleteBar()" style="margin-right: var(--space-3); width: 18px; height: 18px; cursor: pointer;">` : ''}
      <div class="student-info">
        <div class="student-name">${escHtml(studentListName(s))}</div>
        <div class="student-quick-notes">${[grades.length + ' Note' + (grades.length !== 1 ? 'n' : ''),
          (s.importantNote || '').trim() ? '<span class="sq-important">Wichtig</span>' : '', (s.notes || '').trim() ? 'Hinweis' : '', birthdayInfo(s, todayStr) ? 'Geburtstag' : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="student-counters">
        ${showGrades ? `<div class="student-counter" data-kind="participation" role="button" tabindex="0" title="${hintText('participation')}" aria-label="${hintText('participation')}">
          <span class="student-counter-label">Mitarbeit</span>
          ${partCountsHTML(part).replace(/ <span class="sep">\/<\/span> /g, '<span class="sep">/</span>')}
        </div>` : ''}
        <div class="student-counter" data-kind="attendance" role="button" tabindex="0" title="${hintText('attendance')}" aria-label="${hintText('attendance')}">
          <span class="student-counter-label">Fehlt</span>
          <span${attUnexcused ? ' class="n-bad"' : ''}>${attUnexcused}</span><span class="sep">/</span><span>${attExcused}</span>
        </div>
      </div>
      ${!showGrades ? '' : avg!==null
        ? `<div class="student-grade-badge" style="color:${gradeColor(avg, scale)}">${formatGradeAverage(avg)}</div>`
        : `<div class="student-grade-badge student-grade-none">–</div>`}
    `;
    row.addEventListener('click', () => openStudentDetail(s.id, showGrades ? 'grades' : 'attendance'));   // verborgen: nicht auf „Noten“ öffnen
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
      btn.innerHTML = `<span style="font-size:12px; font-weight:600; font-family:inherit; padding:0 var(--space-1);">Fertig</span>`;
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
      id: uid(), firstName: s.firstName, lastName: s.lastName, notes: s.notes, ...(s.importantNote ? { importantNote: s.importantNote } : {}), ...(s.birthday ? { birthday: s.birthday } : {}), grades: [], studentNotes: [], attendance: []
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
    } else {
      // Ein einzelner Name ist der Vorname (Wunsch 09.11.: Listen tippt man meist nur mit Vornamen)
      const parts = line.includes('\t') ? line.split('\t').map(c => c.trim()).filter(c => c) : line.split(/\s+/);
      lastName = parts.length > 1 ? parts.pop() : '';
      firstName = parts.join(' ');
    }
    if (firstName || lastName) {
      if (skipDups) {
        // Voller Name: Altdaten haben einen einzelnen Namen im Nachnamen (AR20)
        const full = x => `${x.firstName || ''} ${x.lastName || ''}`.trim().replace(/\s+/g, ' ').toLowerCase();
        const exists = before.some(existing => full(existing) === full({ firstName, lastName }));
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

function setStudentHintsVeiled(veiled, n = 0) {
  document.getElementById('student-hints-fields').classList.toggle('hidden', veiled);
  const veil = document.getElementById('student-hints-veil');
  veil.classList.toggle('hidden', !veiled);
  veil.querySelector('span').textContent = `${n} ${n === 1 ? 'Hinweis' : 'Hinweise'}, am Beamer verborgen`;
}
document.querySelector('#student-hints-veil button')?.addEventListener('click', () => setStudentHintsVeiled(false));
function openAddStudent() {
  setStudentHintsVeiled(false);
  editingStudentId = null;
  document.getElementById('student-modal-title').textContent = 'Schüler hinzufügen';
  ['new-student-first','new-student-last','new-student-important','new-student-notes','new-student-birthday'].forEach(id => document.getElementById(id).value = '');
  openModal('modal-add-student');
}

function saveStudent() {
  const firstName = document.getElementById('new-student-first').value.trim();
  const lastName  = document.getElementById('new-student-last').value.trim();
  const notes     = document.getElementById('new-student-notes').value.trim();
  const important = document.getElementById('new-student-important').value.trim(); // AD17
  const birthday  = document.getElementById('new-student-birthday').value; // AD6, YYYY-MM-DD oder leer
  // Ein Name genügt: der Import erlaubt Schüler mit nur einem Namen, die müssen bearbeitbar bleiben (BUGS L8)
  if (!firstName && !lastName) { showToast('Bitte einen Namen eingeben', 'error'); return; }
  if (birthday && !validBirthday(birthday)) { showToast('Der Geburtstag kann nicht stimmen. Bitte prüfen oder das Feld leeren', 'error'); return; }
  // Bearbeiten aus dem Schüler-Fenster: dessen Klasse (kann eine andere sein als die offene Klassenansicht, AH28)
  const gid = editingStudentId && editingStudentGroupId ? editingStudentGroupId : currentGroupId;
  if (!db.students[gid]) db.students[gid] = [];
  if (editingStudentId) {
    const s = db.students[gid].find(x => x.id === editingStudentId);
    if (s) {
      const oldStudent = { firstName: s.firstName, lastName: s.lastName };
      Object.assign(s, { firstName, lastName, notes });
      setImportantNote(s, important);
      if (birthday) s.birthday = birthday; else delete s.birthday; // kein leeres Feld an alle Schüler hängen
      renameAbsenceNotes(gid, oldStudent, s);
    }
  } else {
    db.students[gid].push({ id:uid(), firstName, lastName, notes, ...(important ? { importantNote: important } : {}), ...(birthday ? { birthday } : {}), grades:[], studentNotes:[], attendance:[] });
  }
  saveDB();
  closeModal('modal-add-student');
  refreshStudentViews(gid); // auch eine offene Tabelle (BUGS Q4)
  showToast(editingStudentId ? 'Schüler geändert ✓' : 'Schüler hinzugefügt ✓');
  editingStudentId = null;
  editingStudentGroupId = null;
}

// ─── Student Detail ───────────────────────────────────────────────────────
// Profil = Schüler-Fenster mit aufgeklapptem „Mehr zu …“ (AH28; früher eigenes Fenster mit Reitern). Gehört zur
// Klasse der Klassenansicht; Datum oben = heute bzw. letzter Schultag.
function openStudentDetail(studentId, initialTab = 'grades') {
  if (!(db.students[currentGroupId] || []).some(x => x.id === studentId)) return;
  rememberSearchRecent({ kind: 'student', groupId: currentGroupId, studentId });   // AH19
  openSeatingStudentModal(studentId, currentGroupId, profileDefaultDate(), { more: true, focus: initialTab });
}
// Alle Listen im offenen Schülerprofil neu zeichnen (z. B. nach „Rückgängig“)
function renderStudentDetailLists(s) {
  renderStudentAppSection(s);   // Schülerapp Stufe 2a (AJ2)
  renderGradesList(s);
  renderStudentNotesList(s);
  renderAttendanceList(s);
  renderStudentParticipationList(s);
  renderStudentHomeworkList(s);
}
function refreshOpenProfile(s) {
  if (document.getElementById('modal-seating-student').classList.contains('hidden')) return;
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

// Früher Reiter im Profil; heute springt es zum Abschnitt unter „Mehr zu …“ (AH28)
function switchStudentTab(tab) {
  setSeatingStudentMore(true);
  const more = document.getElementById('sw-more');
  if (more) more.dataset.focus = tab;
  const sec = document.getElementById('sw-sec-' + tab);
  if (sec && sec.scrollIntoView) try { sec.scrollIntoView({ block: 'start' }); } catch (e) { /* jsdom */ }
}

function openGradeFormForCurrentStudentDetailed() {
  const s = getCurrentStudent();
  if (!s) return;
  refreshSeatingStudentDay();   // über Nacht offen (AS2)
  const ctx = window.currentSeatingStudent;
  openGradeForm(s.id, profileGroupId, -1, (ctx && ctx.studentId === s.id && ctx.dateStr) || '');   // Tag oben im Fenster (AR6, N7)
}

function getCurrentStudent() { return (db.students[profileGroupId]||[]).find(x => x.id === currentStudentId); }

function renderGradesList(s) {
  const range = viewPeriod();   // Halbjahr wie in der Klassenansicht (Y7)
  const grades = periodList(s.grades, range);
  const scale = gradeScale(profileGroupId);
  const summary = document.getElementById('grades-summary');
  if (!grades.length) {
    summary.innerHTML = `<span style="color:var(--text-muted);font-size:13px">${range ? `Keine Noten im ${PERIOD_NAMES[range.key]}.` : 'Noch keine Noten.'}</span>`;
  } else {
    const byType = {};
    grades.forEach(g => {
      const v = gradeNumber(g.value);
      if (isNaN(v)) return;
      if (!byType[g.type]) byType[g.type]=[];
      byType[g.type].push(v);
    });
    const rawAvg = calculateStudentAverage(s, profileGroupId, range);
    summary.innerHTML = `
      <div class="grade-summary-item" style="margin-right:var(--space-4)">
        <div class="grade-avg-display" style="color:${gradeColor(rawAvg, scale)}">${formatGradeAverage(rawAvg)}</div>
        <div class="grade-avg-label">${range ? `Ø ${PERIOD_NAMES[range.key]}` : scale.higherIsBetter ? 'Ø Punkte' : 'Ø Gesamt'}</div>
      </div>
      ${Object.entries(byType).map(([type,vals]) => {
        const ta = vals.reduce((a,b)=>a+b,0)/vals.length;
        return `<div class="grade-summary-item">
          <div style="font-size:14px;font-weight:700;color:${gradeColor(ta, scale)}">${formatGradeAverage(ta)}</div>
          <div class="grade-avg-label">${escHtml(gradeTypeName(type))} (${vals.length})</div>
        </div>`;
      }).join('')}`;
  }
  const list = document.getElementById('grades-list');
  list.innerHTML = '';
  if (!grades.length) { list.innerHTML='<div class="entry-empty">Noten erscheinen hier.</div>'; return; }
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
        showToast('Die Liste war veraltet und wurde neu geladen. Bitte noch einmal tippen', 'error');
        if (cur) renderGradesList(cur);
        return;
      }
      openGradeForm(s.id, profileGroupId, idx);
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
  if (!notes.length) { list.innerHTML='<div class="entry-empty">Noch keine Anmerkungen.</div>'; return; }
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
  s.studentNotes.splice(idx,1); saveDB(); renderStudentNotesList(s); refreshStudentViews(profileGroupId);   // Notizzettel auf der Karte (AS10)
  offerProfileUndo('Anmerkung gelöscht', s, 'studentNotes', note);
}
// Ein Tipp aufs ✕ löscht sofort – deshalb „Rückgängig“ wie im Sitzplan (BUGS U3, Regel 45)
function offerProfileUndo(msg, s, list, entry, after) {
  const groupId = profileGroupId;
  showUndoToast(msg, () => restoreSeatingEntry(groupId, s, list, entry, after));
}

function addStudentNote() {
  const text = document.getElementById('new-student-note-text').value.trim();
  const date = document.getElementById('new-student-note-date').value;
  if (!text) return;
  const s = getCurrentStudent(); if (!s) return;
  if (!s.studentNotes) s.studentNotes=[];
  s.studentNotes.push({ text, date: date||formatDate(new Date()) });
  saveDB(); renderStudentNotesList(s); refreshStudentViews(profileGroupId);
  document.getElementById('new-student-note-text').value='';
  document.getElementById('new-student-note-date').value=profileDefaultDate();
}

function renderAttendanceList(s) {
  const att  = periodList(s.attendance, viewPeriod());   // Halbjahr (Y7)
  const list = document.getElementById('attendance-list');
  list.innerHTML='';
  if (!att.length) { list.innerHTML='<div class="entry-empty">Keine Einträge.</div>'; return; }
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
  if (wasUnexcused && type !== 'abwesend') removeAbsenceNote(profileGroupId, date, s);
  if (!wasUnexcused && type === 'abwesend') addAbsenceNote(profileGroupId, date, s); // wie im Sitzplan (BUGS L3, Regel 25)
  saveDB(); revealPeriodOf(date); renderAttendanceList(s); refreshStudentViews(profileGroupId);   // AR7
  if (existing) showToast('Eintrag vom ' + formatDateShort(date) + ' geändert');
  document.getElementById('new-att-date').value=profileDefaultDate();
  document.getElementById('new-att-note').value='';
}

function deleteAttendance(a) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.attendance||[]).indexOf(a);
  if (idx === -1) { renderAttendanceList(s); return; }
  // Schülerdetail gehört zu profileGroupId (getCurrentStudent), nicht zur Klassenübersicht
  const groupId = profileGroupId;
  if (a.type === 'abwesend') removeAbsenceNote(groupId, a.date, s);
  s.attendance.splice(idx,1); saveDB(); renderAttendanceList(s); refreshStudentViews(groupId);
  offerProfileUndo('Fehlzeit gelöscht', s, 'attendance', a, a.type === 'abwesend' ? () => addAbsenceNote(groupId, a.date, s) : null);
}

function renderStudentParticipationList(s) {
  const pList = periodList(s.participation, viewPeriod());   // Halbjahr (Y7)
  const list = document.getElementById('participation-list');
  if (!list) return;
  list.innerHTML = '';
  if (!pList.length) { list.innerHTML = '<div class="entry-empty">Keine Einträge.</div>'; return; }
  // Gesichter wie überall (Sitzplan, Tabelle), statt „Hervorragende/Moderate Mitarbeit“ (AH28)
  [...pList].sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach(p => {
    const el = document.createElement('div');
    el.className = 'entry-item';
    el.innerHTML = `
      <span class="entry-face" role="img" aria-label="${escHtml(partLevel(p.value)?.word || 'Mitarbeit')}">${partSignHTML(p.value)}</span>
      <span class="entry-item-text">${p.label ? escHtml(p.label) : ''}</span>
      <span class="entry-item-date">${p.date ? formatDateShort(p.date) : ''}</span>
      <button class="entry-item-delete" aria-label="Löschen">✕</button>`;
    el.querySelector('.entry-item-delete').onclick = () => deleteParticipation(p);
    list.appendChild(el);
  });
}

function deleteParticipation(p) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.participation||[]).indexOf(p);
  if (idx === -1) { renderStudentParticipationList(s); return; }
  s.participation.splice(idx, 1); saveDB(); renderStudentParticipationList(s); refreshStudentViews(profileGroupId);
  offerProfileUndo('Mitarbeit gelöscht', s, 'participation', p);
}

function renderStudentHomeworkList(s) {
  const list = document.getElementById('student-homework-list');
  if (!list) return;
  // Die Bemerkung ist der Spaltentitel in der HA-Tabelle: vorhandene Titel vorschlagen (BUGS Q15)
  const titles = document.getElementById('hw-column-titles');
  if (titles) {
    const group = db.groups.find(g => g.id === profileGroupId);
    const labels = new Set([...(group && group.homeworkEvents || []).map(e => e.label || ''),
      ...(db.students[profileGroupId] || []).flatMap(st => (st.homework || []).map(h => h.note || ''))]);
    labels.delete('');
    titles.innerHTML = [...labels].sort().map(l => `<option value="${escHtml(l)}"></option>`).join('');
  }
  const hw = periodList(s.homework, viewPeriod());   // Halbjahr (Y7)
  if (!hw.length) {
    list.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Keine Hausaufgaben vergessen.</span>';
    return;
  }
  const sorted = [...hw].sort((a,b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.map((h) => {
    return `<div class="entry-item">
      <div class="entry-date-badge">${formatDateLong(h.date)}</div>
      <div style="flex:1; margin-left:var(--space-3);">
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
  revealPeriodOf(date);   // AR7
  renderStudentHomeworkList(s);
  refreshStudentViews(profileGroupId);
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
  refreshStudentViews(profileGroupId);
  offerProfileUndo('Eintrag gelöscht', s, 'homework', entry);
}

function deleteCurrentStudent() {
  if (!confirm('Schüler wirklich löschen?')) return;
  const removed = (db.students[profileGroupId]||[]).filter(s=>s.id===currentStudentId);
  db.students[profileGroupId]=(db.students[profileGroupId]||[]).filter(s=>s.id!==currentStudentId);
  cleanUpDeletedStudents(profileGroupId, removed);
  saveDB(); closeModal('modal-seating-student'); refreshStudentViews(profileGroupId); renderSubjectGroups();
  showToast('Schüler gelöscht');
}

function openEditStudent() {
  const s = getCurrentStudent(); if (!s) return;
  editingStudentId = s.id;
  document.getElementById('student-modal-title').textContent = 'Schüler bearbeiten';
  document.getElementById('new-student-first').value = s.firstName;
  document.getElementById('new-student-last').value  = s.lastName;
  document.getElementById('new-student-notes').value = s.notes||'';
  document.getElementById('new-student-important').value = s.importantNote||'';
  document.getElementById('new-student-birthday').value = validBirthday(s.birthday) ? s.birthday : '';
  editingStudentGroupId = profileGroupId;
  // Hinweise nur, wenn sie im Schüler-Fenster schon eingeblendet waren (AS9, Regel 67); die Felder behalten ihren Wert
  const n = [s.importantNote, s.notes].filter(x => String(x || '').trim()).length;
  setStudentHintsVeiled(n > 0 && !swShown, n);
  closeModal('modal-seating-student');
  openModal('modal-add-student');
}

// Dateien mit Schülerdaten sind unverschlüsselt (Regel 70): vor dem Herunterladen darauf hinweisen (AU3)
async function confirmUnencryptedFile(what) {
  return (await askChoice('Datei mit Schülerdaten', `${what} enthält Schülerdaten unverschlüsselt. Sicher aufbewahren, nicht über private Mail verschicken.`,
    [{ label: 'Herunterladen', value: 'ok', primary: true }])) === 'ok';
}
async function exportCurrentStudent() {
  const s = getCurrentStudent();
  if (!s) return;
  if (!(await confirmUnencryptedFile('Die Schülerakte (mit Hinweisen und Notizen)'))) return;
  if (getCurrentStudent() !== s) return;   // inzwischen anderer Schüler oder neuer Stand (Regel 43)
  exportCurrentStudentFile();
}
function exportCurrentStudentFile() {
  const s = getCurrentStudent();
  if (!s) return;
  // Das Profil gehört zu profileGroupId (getCurrentStudent), nicht zur zuletzt geöffneten Tabelle
  const group = db.groups.find(g => g.id === profileGroupId);
  const subjName = group ? (group.subject + ' ' + group.className) : 'Unbekannte Klasse';
  const points = gradeScale(group).higherIsBetter;
  
  let txt = `SCHÜLERAKTE: ${s.firstName} ${s.lastName}\n`;
  txt += `Klasse/Fach: ${subjName}\n`;
  txt += `Exportiert am: ${new Date().toLocaleDateString('de-DE')}\n`;
  txt += `=================================================\n\n`;
  
  if (s.importantNote) {
    txt += `=== WICHTIG ===\n${s.importantNote}\n\n`;
  }
  if (s.notes) {
    txt += `=== ALLGEMEINE NOTIZEN ===\n${s.notes}\n\n`;
  }
  
  // Einträge ohne Datum (Altdaten) dürfen den Export nicht abbrechen
  const byDate = (a,b) => (a.date||'').localeCompare(b.date||'');
  const dateStr = d => d ? formatDateLong(d) : 'ohne Datum';

  // Sicherung: immer alle Noten; der Schnitt über alle, dazu je Halbjahr, wenn eins eingestellt ist (Y7)
  const avgText = r => { const a = calculateStudentAverage(s, profileGroupId, r); return a === null ? '-' : points ? formatGradeAverage(a) + ' Punkte' : formatGradeAverage(a, 2); };
  const halves = halfYearSplit() ? `, 1. Halbjahr: ${avgText(periodRange('h1'))}, 2. Halbjahr: ${avgText(periodRange('h2'))}` : '';
  txt += `=== NOTEN (Schnitt aller Noten: ${avgText(null)}${halves}) ===\n`;
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
    const sortedPart = [...s.participation].sort(byDate);
    sortedPart.forEach(p => {
      const l = partLevel(p.value);
      const valStr = `(${l ? l.sign : p.value || '?'})`;
      const desc = p.label || (l ? `Mitarbeit ${l.word}` : 'Mitarbeit');
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
// „Heute“ im Sitzplan: zurück zum heutigen (bzw. nächsten) Schultag
function seatingGoToday() {
  setSeatingDate(formatDate(nextSchoolDay(new Date())));
  renderSeatingDateStrip();
  renderSeatingPlan();
}
function refreshSeatingDateIfStale() {
  const view = document.getElementById('view-seating');
  if (!view || !view.classList.contains('active') || document.hidden) return;
  if (refreshSeatingDate()) { renderSeatingDateStrip(); renderSeatingPlan(); }
}
setInterval(refreshSeatingDateIfStale, 60000);
document.addEventListener('visibilitychange', refreshSeatingDateIfStale);
// Offenes Schüler-Fenster beim Zurückkommen und im Minutentakt auf den neuen Tag stellen (AS2)
const refreshSeatingStudentDayIfVisible = () => { if (!document.hidden) refreshSeatingStudentDay(); };
setInterval(refreshSeatingStudentDayIfVisible, 60000);
document.addEventListener('visibilitychange', refreshSeatingStudentDayIfVisible);

// Klasse der laufenden (bzw. gleich beginnenden) Stunde. Über lessonsOnDate, damit halbe Blöcke ihre eigene Zeit
// haben und ausfallende Stunden nicht vorgeschlagen werden (BUGS S3).
function getSuggestedSeatingGroupId(now = new Date()) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const buffer = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
  // Nur Klassen, die es noch gibt: Stunden einer gelöschten Klasse (alte Version, Sync) ließen sonst Ansichten abstürzen (AQ3)
  const known = new Set(db.groups.map(g => g.id));
  const candidates = lessonsOnDate(formatDate(now)).filter(l => l.slot.groupId && known.has(l.slot.groupId) && !l.ausfall && l.range
    && nowMins >= l.range.start - buffer && nowMins <= l.range.end);
  const running = candidates.find(l => l.range.start <= nowMins && nowMins < l.range.end);
  // Läuft gerade eine und beginnt gleich die nächste (Vorlauf), gewinnt die nächste – aber nur mit Pause dazwischen.
  // Folgt sie ohne Pause (7:45–8:30, 8:30–9:15), bleibt die laufende Klasse bis zum Stundenende: Man steht ja noch drin.
  const upcoming = candidates.find(l => l.range.start > nowMins);
  const hit = upcoming && (!running || upcoming.range.start > running.range.end) ? upcoming : (running || upcoming);
  return hit ? hit.slot.groupId : null;
}

// Klasse der nächsten Stunde überhaupt (laufende zählt mit), über alle Klassen; ohne Stundenplan null (AH59)
function nextLessonGroupId(now = new Date()) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  const known = new Set(db.groups.map(g => g.id));
  let d = parseDate(todayStr);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {   // über die Sommerferien (Regel 17)
    if (!isSchoolDay(d)) continue;
    const ds = formatDate(d);
    const hit = lessonsOnDate(ds).find(l => known.has(l.slot.groupId) && !l.ausfall && (ds !== todayStr || (l.range && l.range.end > nowMins)));
    if (hit) return hit.slot.groupId;
  }
  return null;
}
// Oberste Klasse der Klassenauswahl (Fach, dann Klasse), statt der zuerst angelegten
function firstSeatingGroupId() {
  const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  const sorted = [...db.groups].sort((a, b) => cmp(a.subject || 'Ohne Fach', b.subject || 'Ohne Fach') || cmp(a.className || '', b.className || ''));
  return sorted.length ? sorted[0].id : '';
}

function initSeatingPlan() {
  const request = seatingRequest;
  seatingRequest = null;
  if (request && request.dateStr) setSeatingDate(formatDate(nextSchoolDay(parseDate(request.dateStr))));
  else refreshSeatingDate();
  // Datenschutz (BUGS H1): Noten bei jedem Öffnen wieder verborgen, Zustand wird nicht gespeichert
  seatingShowGrades = false;
  seatingShowTrend = false;
  updateSeatingGradesButton();
  
  const suggestedGroupId = request ? request.groupId : getSuggestedSeatingGroupId();
  if (suggestedGroupId) {
    currentSeatingGroupId = suggestedGroupId;
  } else if (!db.groups.some(g => g.id === currentSeatingGroupId)) {
    // Noch keine Wahl (nach dem Neuladen): die Klasse, die als Nächstes dran ist (AH59)
    currentSeatingGroupId = nextLessonGroupId() || firstSeatingGroupId();
  }
  seatingAutoLast = getSuggestedSeatingGroupId(); // ab hier nur bei einem Wechsel der Stunde automatisch umschalten
  seatingSwitchOffer = null;
  
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
    currentSeatingGroupId = firstSeatingGroupId();
  }

  // Klasse als Überschrift, das Fach klein daneben (AH50; ersetzt „7b Mathe“ bei Zwillingen, BUGS N9)
  const activeGroup = db.groups.find(g => g.id === currentSeatingGroupId);
  if (document.getElementById('view-seating')?.classList.contains('active')) markNavActive();   // Schnellzugriff (AH48)
  const subject = document.getElementById('seating-group-subject');
  label.textContent = activeGroup ? activeGroup.className : 'Klasse';
  if (subject) subject.textContent = activeGroup ? (activeGroup.subject || '') : '';
  const trigger = document.getElementById('seating-group-trigger');
  if (trigger) trigger.setAttribute('aria-label', activeGroup
    ? `Klasse wählen: ${[activeGroup.className, activeGroup.subject].filter(Boolean).join(' ')}` : 'Klasse wählen');

  const grouped = {};
  db.groups.forEach(g => {
    const subject = g.subject || 'Ohne Fach';
    if (!grouped[subject]) grouped[subject] = [];
    grouped[subject].push(g);
  });

  const sortedSubjects = Object.keys(grouped).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  const now = new Date();

  sortedSubjects.forEach(subject => {
    const header = document.createElement('div');
    header.className = 'seating-group-head';
    header.textContent = subject;
    menu.appendChild(header);

    const classes = grouped[subject].sort((a,b) => a.className.localeCompare(b.className, undefined, { numeric: true }));

    classes.forEach(g => {
      const item = document.createElement('button'); // Knopf: per Tastatur/Screenreader erreichbar (BUGS N11)
      item.type = 'button';
      item.className = 'seating-group-item' + (g.id === currentSeatingGroupId ? ' active' : '');
      // Daneben, wann die Klasse dran ist (AH58), mit denselben Texten wie die Klassenansicht; Reihenfolge bleibt
      const next = currentOrNextLessonOfGroup(g.id, now);
      const when = next ? nextLessonLabelHTML(next, now) : '';
      const isNow = !!(next && when.startsWith('jetzt'));
      item.innerHTML = `<span class="sgi-name">Klasse ${escHtml(g.className)}</span>`
        + (when ? `<span class="sgi-when${isNow ? ' is-now' : ''}">${when}</span>` : '');
      item.onclick = (e) => {
        e.stopPropagation();
        // Andere Klasse: deren Noten nicht gleich auf dem Beamer zeigen (Regel 16, BUGS S1)
        if (g.id !== currentSeatingGroupId) hideSeatingGrades();
        currentSeatingGroupId = g.id;
        seatingAutoLast = getSuggestedSeatingGroupId(); // von Hand gewählt: erst bei der nächsten Stunde wieder wechseln
        seatingSwitchOffer = null;
        menu.classList.add('hidden');
        renderSeatingGroupSelect();
        renderSeatingDateStrip();
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
    if (menu.classList.contains('hidden')) renderSeatingGroupSelect();   // „jetzt · bis …“ frisch zur Uhrzeit (AH58)
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

// Datum im Kopf (AH50): wie im Stundenplan „Heute“, Pfeile, Datum (antippen = Kalender). Name von früher (Datums-Chips).
function renderSeatingDateStrip() {
  const label = document.getElementById('seating-date-label');
  const baseDate = nextSchoolDay(currentSeatingDateStr ? parseDate(currentSeatingDateStr) : new Date());
  const picker = document.getElementById('seating-date-hidden');
  if (picker) picker.value = formatDate(baseDate); // wie beim Stundenplan (BUGS M14)
  if (label) label.textContent = formatWeekdayShort(formatDate(baseDate));
  const todayBtn = document.getElementById('btn-seating-today');
  if (todayBtn) todayBtn.classList.toggle('active', currentSeatingDateStr === formatDate(nextSchoolDay(new Date())));
}
// Pfeile: vorige/nächste Stunde dieser Klasse (ohne Ausfall, bis 70 Tage weit, Regel 17); ohne Stunden ein Schultag
function seatingStepLesson(dir) {
  const start = parseDate(currentSeatingDateStr || formatDate(nextSchoolDay(new Date())));
  let target = null;
  if (currentSeatingGroupId) {
    let d = addDays(start, dir);
    for (let i = 0; i < 70 && !target; i++, d = addDays(d, dir)) {
      if (!isSchoolDay(d)) continue;
      const ds = formatDate(d);
      if (lessonsOnDate(ds).some(l => l.slot.groupId === currentSeatingGroupId && !l.ausfall)) target = ds;
    }
  }
  setSeatingDate(target || formatDate(addSchoolDays(start, dir)));
  renderSeatingDateStrip();
  renderSeatingPlan();
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
  if (!seatingShowGrades && !seatingShowTrend) return;
  seatingShowGrades = false;
  seatingShowTrend = false;
  updateSeatingGradesButton();
}
function toggleSeatingGrades() {
  seatingShowGrades = !seatingShowGrades;
  if (seatingShowGrades) seatingShowTrend = false; // eins von beiden: Noten oder Mitarbeit-Verlauf
  updateSeatingGradesButton();
  renderSeatingPlan();
}
// Mitarbeit-Verlauf auf den Karten (AD2): letzte Smileys als Punkte. Leistungsdaten → wie Noten nur auf
// Knopfdruck, nie gespeichert, beim Öffnen und Klassenwechsel wieder aus (Regel 16).
let seatingShowTrend = false;
function toggleSeatingTrend() {
  seatingShowTrend = !seatingShowTrend;
  if (seatingShowTrend) seatingShowGrades = false;
  updateSeatingGradesButton();
  renderSeatingPlan();
}
function updateSeatingGradesButton() {
  const trend = document.getElementById('btn-seating-trend');
  if (trend) {
    trend.classList.toggle('active', seatingShowTrend);
    trend.setAttribute('aria-pressed', seatingShowTrend ? 'true' : 'false');
    trend.title = seatingShowTrend ? 'Mitarbeit-Verlauf verbergen' : 'Mitarbeit-Verlauf anzeigen';
  }
  const btn = document.getElementById('btn-seating-grades');
  if (!btn) return;
  btn.classList.toggle('active', seatingShowGrades);
  const text = seatingShowGrades ? 'Noten verbergen' : 'Noten zeigen';
  btn.title = seatingShowGrades ? 'Noten verbergen' : 'Noten anzeigen';
  btn.setAttribute('aria-label', text);
  btn.setAttribute('aria-pressed', seatingShowGrades ? 'true' : 'false');
  btn.innerHTML = icon(seatingShowGrades ? 'eye-off' : 'eye') + `<span class="btn-label">${text}</span>`;
}

// ─── Unterrichts-Cockpit im Sitzplan (AD2) ─────────────────────────────────
// Läuft heute gerade eine Stunde dieser Klasse (oder beginnt sie gleich), zeigt der Sitzplan oben eine Leiste:
// Restzeit, was danach kommt, Thema, fällige HA/Tests, wer fehlt, Geburtstage – und hält den Bildschirm an.
// Kein eigener Modus: außerhalb der Stunde (Planen, Plätze tauschen) bleibt die ruhige Ansicht.
const COCKPIT_LEAD_MINS = 15; // so lange vorher erscheint „beginnt in …“
function seatingCockpitInfo(groupId, dateStr, now = new Date()) {
  const todayStr = formatDate(now);
  if (!groupId || dateStr !== todayStr) return null;
  const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const day = lessonsOnDate(todayStr).filter(l => l.range && !l.ausfall);
  const mine = day.filter(l => l.slot.groupId === groupId);
  const running = mine.find(l => l.range.start <= nowMins && nowMins < l.range.end);
  const upcoming = !running && mine.find(l => l.range.start > nowMins && l.range.start - nowMins <= COCKPIT_LEAD_MINS);
  const lesson = running || upcoming;
  if (!lesson) return null;
  const { start, end } = lesson.range;
  const next = day.find(l => l !== lesson && l.range.start >= end) || null;
  return {
    lesson, running: !!running, next,
    minsLeft: Math.max(0, Math.ceil(end - nowMins)),
    startsIn: running ? 0 : Math.max(1, Math.ceil(start - nowMins)),
    progress: running ? Math.min(1, (nowMins - start) / Math.max(1, end - start)) : 0,
  };
}
const studentName = s => [s.firstName, s.lastName].filter(Boolean).join(' ');
function seatingTodayInfo(groupId, info) {
  const { lesson } = info;
  const dateStr = lesson.dateStr;
  const data = db.lessonData[lesson.slot.id + '_' + dateStr] || {};
  const students = db.students[groupId] || [];
  const prev = previousLessonOfGroup(groupId, dateStr, lesson.range.start);
  const prevData = prev ? (db.lessonData[prev.slot.id + '_' + prev.dateStr] || {}) : {};
  const absentOn = ds => students.filter(s => (s.attendance || []).some(a => a.date === ds && (a.type === 'abwesend' || a.type === 'entschuldigt')));
  const absent = absentOn(dateStr);
  return {
    topic: firstLine(data.done),
    planned: plannedTopicOf(groupId, lesson),
    prevTopic: firstLine(prevData.done), prev,
    due: dueItemsFor(lesson.slot.id, dateStr),
    absent,
    // Wer letzte Stunde gefehlt hat und heute da ist: Stoff nachholen
    missed: prev && prev.dateStr !== dateStr ? absentOn(prev.dateStr).filter(s => !absent.includes(s)) : [],
    birthdays: students.map(s => ({ s, b: birthdayInfo(s, dateStr) })).filter(x => x.b),
  };
}
// Leiste mit fester Höhe (eine Zeile): Zeit, Thema, Zähler. Was zu einzelnen Schülern gehört (fehlt,
// Geburtstag, letzte Stunde gefehlt), steht auf den Karten; die Namen im Fenster „Heute“ (Zähler antippen).
function cockpitCount(cls, iconName, count, label, title) {
  return `<button type="button" class="cockpit-count ${cls}" onclick="openSeatingToday()" title="${escHtml(title)}" aria-label="${escHtml(title)}">`
    + `${icon(iconName)}${count !== null ? `<b>${count}</b>` : ''}<span class="cockpit-count-label">${label}</span></button>`;
}
// Außerhalb der Stunde (AH50): welche Stunde die Leiste zeigt. Heute die nächste, die noch kommt; an einem anderen
// Tag die erste an diesem Tag, sonst die nächste danach. Ohne Ausfall, bis 70 Tage weit (Regel 17).
function seatingPlannedLesson(groupId, dateStr, now = new Date()) {
  if (!groupId || !dateStr) return null;
  const todayStr = formatDate(now);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const mine = ds => lessonsOnDate(ds).filter(l => l.slot.groupId === groupId && !l.ausfall && l.range);
  if (dateStr !== todayStr) {
    const own = mine(dateStr)[0];
    if (own) return { lesson: own, kicker: 'Stunde' };
  }
  let d = parseDate(dateStr);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {
    const ds = formatDate(d);
    if (!isSchoolDay(d) && ds !== dateStr) continue;
    const hit = mine(ds).find(l => ds !== todayStr || l.range.start > nowMins);
    if (hit && (i > 0 || ds === todayStr)) return { lesson: hit, kicker: 'Nächste Stunde' };
  }
  return null;
}
// Zeichnet die Leiste. Sie ist immer da (feste Höhe, das Raster springt nicht): während der Stunde Restzeit und
// Bildschirm an, sonst die nächste Stunde. Liefert true, wenn sich Sichtbarkeit oder Art geändert hat (Raster neu einpassen).
function renderSeatingCockpit(now = new Date()) {
  const el = document.getElementById('seating-cockpit');
  if (!el) return false;
  const viewOpen = document.getElementById('view-seating')?.classList.contains('active');
  const groupOk = !!db.groups.find(g => g.id === currentSeatingGroupId);
  const info = viewOpen && groupOk ? seatingCockpitInfo(currentSeatingGroupId, currentSeatingDateStr, now) : null;
  const wasShown = !el.classList.contains('hidden'), wasLive = el.classList.contains('live');
  const show = !!(viewOpen && groupOk);
  el.classList.toggle('hidden', !show);
  el.classList.toggle('live', !!info);
  setSeatingWakeLock(!!info);
  const changed = wasShown !== show || wasLive !== !!info;
  if (!show) { el.innerHTML = ''; cockpitHTML = ''; cockpitLesson = null; cockpitToday = null; return changed; }
  if (!info) { renderPlannedCockpit(el, now); return changed; }
  const t = seatingTodayInfo(currentSeatingGroupId, info);
  cockpitLesson = { slotId: info.lesson.slot.id, dateStr: info.lesson.dateStr };
  cockpitToday = { info, t, live: true };
  const { range, block } = info.lesson;
  const nextText = info.next ? `danach ${[lessonTitle(info.next.slot).main, minsToTime(info.next.range.start)].join(' · ')}` : '';
  // Links groß die Zeit mit Balken (das, worauf man im Unterricht am häufigsten schaut)
  const timeHTML = (info.running
    ? `<div class="cockpit-mins"><b>${info.minsLeft}</b> Min</div>`
    : `<div class="cockpit-mins cockpit-soon">in <b>${info.startsIn}</b> Min</div>`)
    + `<div class="cockpit-progress" aria-hidden="true"><span style="width:${Math.round(info.progress * 100)}%"></span></div>`
    + `<div class="cockpit-sub">${info.running ? `bis ${minsToTime(range.end)}` : `${escHtml(block.label)} · ab ${minsToTime(range.start)}`}</div>`
    + (nextText ? `<div class="cockpit-sub cockpit-next">${escHtml(nextText)}</div>` : '');
  setCockpitHTML(el, `
    <button type="button" class="cockpit-time" onclick="openSeatingToday()" aria-label="Alles zu heute">${timeHTML}</button>
    ${cockpitMainHTML(t, 'Thema heute')}`);
  return changed;
}
// Leiste außerhalb der Stunde: links wann, Mitte Thema und Zähler wie während der Stunde
function renderPlannedCockpit(el, now) {
  const plan = seatingPlannedLesson(currentSeatingGroupId, currentSeatingDateStr, now);
  if (!plan) {
    cockpitLesson = null; cockpitToday = null;
    setCockpitHTML(el, `<div class="cockpit-time cockpit-none"><div class="cockpit-kicker">Nächste Stunde</div><div class="cockpit-when">–</div></div>
      <div class="cockpit-main"><span class="cockpit-topic-text"><span class="cockpit-empty">Kein Unterricht eingetragen</span></span></div>`);
    return;
  }
  const info = { lesson: plan.lesson, running: false, next: null };
  const t = seatingTodayInfo(currentSeatingGroupId, info);
  cockpitLesson = { slotId: plan.lesson.slot.id, dateStr: plan.lesson.dateStr };
  cockpitToday = { info, t, live: false };
  const { range, block, dateStr } = plan.lesson;
  const today = dateStr === formatDate(now);
  const timeHTML = `<div class="cockpit-kicker">${plan.kicker}</div>`
    + `<div class="cockpit-when">${escHtml(today ? minsToTime(range.start) : formatWeekdayShort(dateStr))}</div>`
    + `<div class="cockpit-sub">${escHtml((today ? 'heute' : minsToTime(range.start)) + ' · ' + block.label)}</div>`;
  setCockpitHTML(el, `
    <button type="button" class="cockpit-time" onclick="openSeatingToday()" aria-label="Alles zu dieser Stunde">${timeHTML}</button>
    ${cockpitMainHTML(t, 'Thema')}`);
}
// Nur bei neuem Inhalt ersetzen: Sonst verschwände alle paar Sekunden der Knopf unter dem Finger, und das Tippen ginge verloren (AH3)
function setCockpitHTML(el, html) {
  if (html !== cockpitHTML) { el.innerHTML = html; cockpitHTML = html; }
}
function cockpitMainHTML(t, ownLabel) {
  // Mitte: Überschrift, Thema in voller Breite, darunter die Zähler
  // Reihenfolge (AI1): eingetragener Unterrichtsinhalt → geplantes Thema → was letzte Stunde war
  const p = !t.topic && t.planned && String(t.planned.topic.title || '').trim() ? t.planned : null;
  const unitText = p && p.of > 1 ? ` · Stunde ${p.unit} von ${p.of}` : '';
  const topicLabel = t.topic ? ownLabel : p ? `${p.done ? 'Erledigt' : 'Geplant'}${unitText}`
    : t.prevTopic ? `Letzte Stunde · ${formatWeekdayShort(t.prev.dateStr)}` : 'Thema';
  const topicText = t.topic || (p ? firstLine(p.topic.title) : t.prevTopic);
  const topicHTML = `<span class="cockpit-topic-label">${escHtml(topicLabel)}</span>`
    + `<span class="cockpit-topic-text">${topicText ? escHtml(topicText) : '<span class="cockpit-empty">Noch kein Thema eingetragen</span>'}</span>`;
  const counts = [];
  if (t.due.hw.length) counts.push(cockpitCount('hw', 'homework', t.due.hw.length > 1 ? t.due.hw.length : null, 'HA', `${t.due.hw.length} ${plural(t.due.hw.length, 'Hausaufgabe', 'Hausaufgaben')} fällig`));
  if (t.due.tests.length) counts.push(cockpitCount('test', 'test', t.due.tests.length > 1 ? t.due.tests.length : null, 'Test', `${t.due.tests.length} ${plural(t.due.tests.length, 'Test', 'Tests')} angekündigt`));
  if (t.absent.length) counts.push(cockpitCount('absent', 'absences', t.absent.length, plural(t.absent.length, 'fehlt', 'fehlen'), `${t.absent.length} ${plural(t.absent.length, 'fehlt', 'fehlen')} heute`));
  if (t.missed.length) counts.push(cockpitCount('missed', 'calendar-x', t.missed.length, 'nachholen', `${t.missed.length} ${plural(t.missed.length, 'hat', 'haben')} letzte Stunde gefehlt`));
  if (t.birthdays.length) counts.push(cockpitCount('bday', 'cake', t.birthdays.length, 'Geb.', `${t.birthdays.length} ${plural(t.birthdays.length, 'Geburtstag', 'Geburtstage')}`));
  return `<div class="cockpit-main">
      <button type="button" class="cockpit-topic" onclick="openLessonTopic()" title="Thema dieser Stunde">${topicHTML}</button>
      ${counts.length ? `<div class="cockpit-counts">${counts.join('')}</div>` : ''}
    </div>
    ${seatingSwitchOfferHTML()}
    <button type="button" class="btn-secondary cockpit-lesson-btn" onclick="openCockpitLesson()" aria-label="Diese Stunde: Inhalt, Notiz, Hausaufgabe">${icon('edit')}<span>Stunde</span></button>`;
}
let cockpitToday = null, cockpitHTML = '';
// Fenster „Heute“: alles zur laufenden Stunde im Detail (Listen dürfen hier beliebig lang sein)
let seatingTodayLesson = null;   // die Stunde, die das Fenster „Heute“ zeigt (AS4) – die Leiste rechnet weiter
function openSeatingToday() {
  if (!cockpitToday) return;
  seatingTodayLesson = { slotId: cockpitToday.info.lesson.slot.id, dateStr: cockpitToday.info.lesson.dateStr };
  renderSeatingToday();
  openModal('modal-seating-today');
}
function renderSeatingToday() {
  const box = document.getElementById('seating-today-body');
  if (!box || !cockpitToday) return;
  const { info, t } = cockpitToday;
  const { slot, range, block } = info.lesson;
  const title = lessonTitle(slot);
  const day = info.lesson.dateStr === formatDate(new Date()) ? 'Heute' : formatWeekdayShort(info.lesson.dateStr);
  document.getElementById('seating-today-title').textContent = `${day} · ${title.main}${title.sub ? ' ' + title.sub : ''}`;
  const section = (label, iconName, body, cls = '') => `<section class="today-section ${cls}"><h3>${icon(iconName)}${label}</h3>${body}</section>`;
  const list = items => `<ul>${items.join('')}</ul>`;
  const text = s => escHtml(s).replace(/\n/g, '<br>');
  const absenceType = (s, ds) => (s.attendance || []).find(a => a.date === ds && (a.type === 'abwesend' || a.type === 'entschuldigt'));
  let html = `<p class="today-meta">${escHtml(block.label)} · ${minsToTime(range.start)}–${minsToTime(range.end)}${slot.room ? ` · ${escHtml(slot.room)}` : ''}${info.next
    ? `<br>Danach: ${escHtml(lessonTitle(info.next.slot).main)}${info.next.slot.room ? ` · ${escHtml(info.next.slot.room)}` : ''} · ${minsToTime(info.next.range.start)}` : ''}</p>`;
  const data = db.lessonData[slot.id + '_' + info.lesson.dateStr] || {};
  const prevData = t.prev ? (db.lessonData[t.prev.slot.id + '_' + t.prev.dateStr] || {}) : {};
  if (data.done) html += section('Thema heute', 'content', `<p>${text(data.done)}</p>`);
  if (prevData.done) html += section(`Letzte Stunde · ${escHtml(formatWeekdayShort(t.prev.dateStr))}`, 'content', `<p>${text(prevData.done)}</p>`, data.done ? 'muted' : '');
  if (t.due.hw.length) html += section('Hausaufgabe fällig', 'homework', list(t.due.hw.map(i => `<li>${escHtml(i.text)}</li>`)), 'hw');
  if (t.due.tests.length) html += section('Test', 'test', list(t.due.tests.map(i => `<li>${escHtml(i.text)}</li>`)), 'test');
  if (t.absent.length) html += section(`Fehlt heute (${t.absent.length})`, 'absences', list(t.absent.map(s =>
    `<li>${escHtml(studentName(s))} <small>${absenceType(s, info.lesson.dateStr)?.type === 'entschuldigt' ? 'entschuldigt' : 'unentschuldigt'}</small></li>`)), 'absent');
  if (t.missed.length) html += section(`Letzte Stunde gefehlt (${t.missed.length}) · Stoff nachholen`, 'calendar-x', list(t.missed.map(s => `<li>${escHtml(studentName(s))}</li>`)), 'missed');
  if (t.birthdays.length) html += section(`Geburtstag (${t.birthdays.length})`, 'cake', list(t.birthdays.map(({ s, b }) =>
    `<li>${escHtml(studentName(s))}${b.age ? ` <small>wird ${b.age}</small>` : ''}${b.when === 'past' ? ` <small>· hatte am ${escHtml(formatWeekdayShort(b.date))}</small>` : ''}</li>`)), 'bday');
  if (!data.done && !prevData.done && !t.due.hw.length && !t.due.tests.length && !t.absent.length && !t.missed.length && !t.birthdays.length) {
    html += '<p class="today-empty">Nichts fällig, alle da.</p>';
  }
  box.innerHTML = html;
}
let cockpitLesson = null;
// Notiz zur Stunde = Stunde abschließen: das Stunden-Fenster (Inhalt, Notizen, HA, Test) dieser Stunde
function openSeatingTodayLesson() {
  if (!seatingTodayLesson) return;
  const { slotId, dateStr } = seatingTodayLesson;
  closeModal('modal-seating-today');
  openLessonDetail(slotId, dateStr, { fromSeating: true });
}
function openCockpitLesson() {
  if (!cockpitLesson) return;
  closeModal('modal-seating-today');
  openLessonDetail(cockpitLesson.slotId, cockpitLesson.dateStr, { fromSeating: true });
}
document.getElementById('lt-topic')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); commitLessonTopic('lt-topic', lessonTopicShown, refreshLessonTopicRow); }
});

// Timer / nach Änderungen: Leiste aktualisieren; erscheint oder verschwindet sie, das Raster neu einpassen
function refreshSeatingCockpit() {
  if (!document.getElementById('view-seating')?.classList.contains('active') || seatingEditMode) return;
  if (maybeAutoSwitchSeatingClass()) return; // hat schon alles neu gezeichnet
  if (renderSeatingCockpit()) renderSeatingPlan();
}

// Offener Sitzplan wechselt zur nächsten Klasse (Einstellung, Standard an). Nur beim Wechsel der Stunde – nicht
// gegen eine Klasse, die man gerade von Hand gewählt hat –, nie mitten in einer laufenden Stunde der angezeigten
// Klasse, nie bei offenem Fenster, im Bearbeiten-Modus oder wenn ein anderer Tag gewählt ist.
// Wer in den letzten Minuten im Sitzplan etwas angetippt hat (Mitarbeit nach dem Klingeln), trägt noch ein: dann nicht
// wechseln, sondern in der Leiste „Weiter zu …“ anbieten; nach der Ruhezeit doch wechseln, mit „Rückgängig“ (AI3).
let seatingAutoLast = null;
let seatingLastTouch = null;      // Date.now() beim letzten Antippen im Sitzplan (auch in Fenstern darüber)
let seatingSwitchOffer = null;    // Klasse, die die Leiste mit „Weiter zu …“ anbietet
const SEATING_SWITCH_QUIET_MINS = 3;
function noteSeatingTouch() {
  if (document.getElementById('view-seating')?.classList.contains('active')) seatingLastTouch = Date.now();
}
document.addEventListener('pointerdown', noteSeatingTouch, true);
document.addEventListener('keydown', noteSeatingTouch, true);
function maybeAutoSwitchSeatingClass(now = new Date()) {
  if (db.settings.seatingAutoSwitch === false || seatingEditMode || gradeRound) { seatingSwitchOffer = null; return false; }
  if (!document.getElementById('view-seating')?.classList.contains('active')) return false;
  if (document.querySelector('.modal-overlay:not(.hidden)')) return false;
  if (currentSeatingDateStr !== formatDate(now)) { seatingSwitchOffer = null; return false; }
  const sug = getSuggestedSeatingGroupId(now);
  if (!sug || sug === currentSeatingGroupId) { seatingAutoLast = sug; seatingSwitchOffer = null; return false; }
  if (sug === seatingAutoLast) { seatingSwitchOffer = null; return false; }   // diese Stunde hat man bewusst eine andere Klasse gewählt
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const stillRunning = lessonsOnDate(formatDate(now)).some(l => l.slot.groupId === currentSeatingGroupId && !l.ausfall
    && l.range && l.range.start <= nowMins && nowMins < l.range.end);
  if (stillRunning) return false;              // später noch einmal versuchen (nicht merken)
  if (!db.groups.some(x => x.id === sug)) return false;
  if (seatingLastTouch !== null && now.getTime() - seatingLastTouch < SEATING_SWITCH_QUIET_MINS * 60000) {
    seatingSwitchOffer = sug;                  // man trägt noch ein: nur anbieten
    return false;
  }
  const from = currentSeatingGroupId;
  switchSeatingClassTo(sug);
  const g = db.groups.find(x => x.id === sug);
  showUndoToast(`Sitzplan: ${g.className}${g.subject ? ' ' + g.subject : ''} (nächste Stunde)`, () => {
    if (!db.groups.some(x => x.id === from) || !document.getElementById('view-seating')?.classList.contains('active')) return;
    switchSeatingClassTo(from);                // seatingAutoLast bleibt: in dieser Stunde nicht noch einmal wechseln
  }, 'seating-switch');
  return true;
}
function switchSeatingClassTo(groupId) {
  hideSeatingGrades();
  currentSeatingGroupId = groupId;
  seatingAutoLast = getSuggestedSeatingGroupId();
  seatingSwitchOffer = null;
  renderSeatingGroupSelect();
  renderSeatingDateStrip();
  renderSeatingPlan();
}
// Knopf „Weiter zu …“ in der Leiste
function switchToOfferedSeatingClass() {
  const sug = seatingSwitchOffer;
  if (!sug || !db.groups.some(x => x.id === sug)) { seatingSwitchOffer = null; renderSeatingCockpit(); return; }
  switchSeatingClassTo(sug);
}
function seatingSwitchOfferHTML() {
  const g = seatingSwitchOffer && seatingSwitchOffer !== currentSeatingGroupId && db.groups.find(x => x.id === seatingSwitchOffer);
  if (!g) return '';
  const name = g.className || g.subject || 'nächste Klasse';
  return `<button type="button" class="btn-primary cockpit-switch-btn" onclick="switchToOfferedSeatingClass()" aria-label="${escHtml('Weiter zur nächsten Stunde: ' + name)}">${icon('arrow-right')}<span><span class="switch-long">Weiter zu </span>${escHtml(name)}</span></button>`;
}

// Während des Unterrichts direkt im Sitzplan starten (Einstellung, Standard an): beim Öffnen der App und
// beim Zurückkommen nach längerer Zeit – nie mitten in einer Eingabe.
const SEATING_RESUME_MINS = 15;
function shouldStartInSeating(now = new Date()) {
  return db.settings.seatingStartInLesson !== false && !!getSuggestedSeatingGroupId(now);
}
let appHiddenAt = null;
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

// Bildschirm bleibt an, solange das Cockpit eine Stunde zeigt (Screen Wake Lock; iPad ab iOS 16.4).
// Der Browser gibt die Sperre beim Verlassen der App selbst frei → beim Zurückkommen neu anfordern.
let seatingWakeLock = null, seatingWakeWanted = false;
function setSeatingWakeLock(on) {
  seatingWakeWanted = on;
  if (!on) {
    // Noch angefordert ('pending'): gibt die Anfrage selbst wieder frei, sobald sie ankommt
    if (seatingWakeLock && seatingWakeLock !== 'pending') seatingWakeLock.release().catch(() => {});
    seatingWakeLock = null;
    return;
  }
  if (seatingWakeLock || document.hidden || !navigator.wakeLock || !navigator.wakeLock.request) return;
  seatingWakeLock = 'pending';
  navigator.wakeLock.request('screen').then(lock => {
    if (!seatingWakeWanted || seatingWakeLock !== 'pending') { lock.release().catch(() => {}); if (seatingWakeLock === 'pending') seatingWakeLock = null; return; }
    seatingWakeLock = lock;
    lock.addEventListener('release', () => { if (seatingWakeLock === lock) seatingWakeLock = null; });
  }).catch(() => { seatingWakeLock = null; }); // z. B. Energiesparmodus: dann eben nicht
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && seatingWakeWanted && !seatingWakeLock) setSeatingWakeLock(true);
});

// Mitarbeit-Verlauf: die letzten Smileys (ohne Titel, wie die Schnellbewertung, Regel 49) als Punkte, alt → neu
// Mitarbeit zuletzt (ohne Titel, Regel 49), älteste zuerst
function lastParticipation(s, n) {
  return (s.participation || []).filter(p => p && !p.label && partLevel(p.value))
    .sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(-n);
}
// Auf der Sitzplan-Karte: die letzten 3 als Zeichen in ihrer Farbe, neueste rechts (AM2; vorher Balken, schlecht lesbar)
const TREND_COUNT = 3;
function participationTrendHTML(s) {
  const list = lastParticipation(s, TREND_COUNT);
  if (!list.length) return '<div class="sc-trend sc-trend-empty">–</div>';
  return `<div class="sc-trend" title="Mitarbeit zuletzt: ${list.map(p => partLevel(p.value).word).join(', ')}">${list.map(p => partSignHTML(p.value)).join('')}</div>`;
}

// Schülernotizen „aus den letzten Stunden“ (AM1): von heute und aus den letzten 2 Stunden der Klasse vor dateStr
// (Ausfall und Ferien zählen nicht). Liefert den ersten Tag, der dazugehört; ohne frühere Stunden nur dateStr.
function recentNotesSince(groupId, dateStr) {
  let d = addDays(parseDate(dateStr), -1), found = 0, since = dateStr;
  for (let i = 0; i < 70 && found < 2; i++, d = addDays(d, -1)) {   // über die Sommerferien (Regel 17)
    if (!isSchoolDay(d)) continue;
    const ds = formatDate(d);
    const n = lessonsOnDate(ds).filter(l => l.slot.groupId === groupId && !l.ausfall).length;
    if (n) { found += n; since = ds; }
  }
  return since;
}
// Neueste zuerst; kaputte Einträge (ohne Text/Datum) fallen weg
function recentStudentNotes(s, since, dateStr) {
  return (s.studentNotes || []).filter(n => n && typeof n.text === 'string' && n.text.trim() && isDateStr(n.date) && n.date >= since && n.date <= dateStr)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Schülerzentrale (AM1) oben im Schüler-Fenster: Hinweise, Notizen aus den letzten Stunden, Mitarbeit auf einen Blick.
// Inhalte wie der Beamer-Schutz (Regel 16, 67): mit Schutz erst nach „Anzeigen“ (swShown, nie gespeichert), ohne sofort.
// Verborgen steht nur, WAS es gibt (Hinweis, Anzahl Notizen, Mitarbeit), nie der Text oder eine Wertung.
function renderSwHub(s) {
  const box = document.getElementById('sw-hub');
  const ctx = window.currentSeatingStudent;
  if (!box || !ctx) return;
  const hint = (s.notes || '').trim(), important = (s.importantNote || '').trim();
  const notes = recentStudentNotes(s, recentNotesSince(ctx.groupId, ctx.dateStr), ctx.dateStr);
  const range = viewPeriod();   // Halbjahr wie in der Klassenansicht (Y7)
  const partN = partCounts(periodList(s.participation, range).filter(p => p && !p.label));
  const last = lastParticipation(s, 5);
  const hasPart = partN.some(n => n) || last.length;
  box.hidden = !hint && !important && !notes.length && !hasPart;
  box.innerHTML = '';
  if (box.hidden) return;
  const protectedView = classGradesProtected();
  const open = !protectedView || swShown;
  if (!open) {
    const tag = (ic, text, cls = '') => `<span class="sw-hub-tag${cls}">${icon(ic)}${text}</span>`;
    box.innerHTML = `<div class="sw-hub-closed"><div class="sw-hub-tags">`
      + (important ? tag('alert', 'Wichtiger Hinweis', ' is-important') : hint ? tag('info', 'Hinweis') : '')
      + (notes.length ? tag('sticky', notes.length === 1 ? '1 Notiz' : `${notes.length} Notizen`) : '')
      + (hasPart ? tag('participation', 'Mitarbeit') : '')
      + `</div><button type="button" class="btn-secondary sw-hub-show">Anzeigen</button></div>`;
    box.querySelector('.sw-hub-show').addEventListener('click', () => revealSeatingStudent());
    return;
  }
  const label = text => `<div class="sw-label">${text}</div>`;
  let html = '';
  if (hint || important) html += `<div class="sw-hub-hint${important ? ' is-important' : ''}">${label(important ? `${icon('alert')}Wichtiger Hinweis` : `${icon('info')}Hinweis`)}`
    + `${important ? `<b>${escHtml(important)}</b>` : ''}${hint ? `<span>${escHtml(hint)}</span>` : ''}</div>`;
  if (notes.length) html += `<div class="sw-hub-notes">${label(`${icon('sticky')}Notizen aus den letzten Stunden`)}<ul>`
    + notes.map(n => `<li><small>${escHtml(n.date === ctx.dateStr ? (ctx.dateStr === formatDate(new Date()) ? 'Heute' : formatWeekdayShort(n.date)) : formatWeekdayShort(n.date))}</small><span>${escHtml(n.text)}</span></li>`).join('')
    + `</ul></div>`;
  if (hasPart) html += `<div class="sw-hub-part">${label(`${icon('participation')}Mitarbeit ${range ? `im ${PERIOD_NAMES[range.key]}` : 'bisher'}`)}`
    + `<div class="sw-hub-counts">${PART_LEVELS.map((l, i) => `<span class="sw-hub-count${i === PART_LEVELS.length - 1 && partN[i] ? ' n-bad' : ''}">${partSignHTML(l.value)}<b>${partN[i]}</b></span>`).join('')}</div>`
    + (last.length ? `<div class="sw-hub-last"><small>Zuletzt</small>${last.map(p => partSignHTML(p.value)).join('')}</div>` : '') + `</div>`;
  if (protectedView) html += `<button type="button" class="link-btn sw-hub-hide">Verbergen</button>`;
  box.innerHTML = html;
  const hide = box.querySelector('.sw-hub-hide');
  if (hide) hide.addEventListener('click', () => hideSeatingStudent());
}
function renderSeatingStudentHint(show) {
  const box = document.getElementById('seating-student-hint');
  const ctx = window.currentSeatingStudent;
  if (!box || !ctx) return;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  if (!s) return;
  renderSwHub(s);
  const text = (s.notes || '').trim();
  const important = (s.importantNote || '').trim();   // AD17
  if ((text || important) && !show) {
    box.innerHTML = `<div class="seating-hint-hidden${important ? ' is-important' : ''}"><span>${important ? 'Wichtiger Hinweis vorhanden (verborgen)' : 'Hinweis vorhanden (verborgen)'}</span>
      <button type="button" class="btn-secondary seating-reveal-btn" onclick="renderSeatingStudentHint(true)">Anzeigen</button></div>`;
    return;
  }
  // Lesen statt offener Eingabefelder (AH28): erst „Ändern“ zeigt die Felder – kein versehentliches Tippen am Beamer
  if (show === 'view') {
    box.innerHTML = (important ? `<div class="sw-hint is-important"><small>${icon('alert')}Wichtig</small>${escHtml(important)}</div>` : '')
      + (text ? `<div class="sw-hint"><small>Sonstiges</small>${escHtml(text)}</div>` : '')
      + (!important && !text ? '<div class="sw-hint-empty">Kein Hinweis</div>' : '')
      + `<button type="button" class="btn-secondary sw-hint-edit">${icon('edit')}${important || text ? 'Ändern' : 'Hinweis eintragen'}</button>`;
    box.querySelector('.sw-hint-edit').addEventListener('click', () => {
      renderSeatingStudentHint(true);
      try { box.querySelector('textarea').focus(); } catch (e) { /* egal */ }
    });
    return;
  }
  box.innerHTML = `<label class="seating-hint-label is-important" for="seating-student-important-input">${icon('alert')}Wichtig</label>
    <textarea id="seating-student-important-input" class="form-input seating-hint-input" rows="1"
      placeholder="z. B. Diabetes, Allergie, Nachteilsausgleich …"></textarea>
    <label class="seating-hint-label" for="seating-student-hint-input">Sonstiges</label>
    <textarea id="seating-student-hint-input" class="form-input seating-hint-input" rows="2"
      placeholder="z. B. mag Fußball, sitzt gern am Fenster …"></textarea>`;
  box.querySelector('#seating-student-important-input').value = s.importantNote || '';
  box.querySelector('#seating-student-hint-input').value = s.notes || '';
  box.querySelectorAll('textarea').forEach(ta => ta.addEventListener('change', commitSeatingStudentHint));
}
// Wichtiger Hinweis (AD17): leer = Feld weg, damit nicht jeder Schüler ein leeres Feld trägt
function setImportantNote(s, value) {
  if (value) s.importantNote = value; else delete s.importantNote;
}
function commitSeatingStudentHint() {
  const ta = document.getElementById('seating-student-hint-input');
  const taImp = document.getElementById('seating-student-important-input');
  const ctx = window.currentSeatingStudent;
  if (!ta || !ctx) return;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  const value = ta.value.trim();
  const impValue = taImp ? taImp.value.trim() : (s ? (s.importantNote || '').trim() : '');
  if (!s) { if (value || impValue) showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Hinweis nicht gespeichert', 'error'); return; }
  if (value === (s.notes || '').trim() && impValue === (s.importantNote || '').trim()) return;
  s.notes = value;
  setImportantNote(s, impValue);
  saveDB();
  refreshStudentViews(ctx.groupId);
  renderSwHub(s);
}

// Notiz zum Schüler direkt im Sitzplan (AH10), landet bei den Anmerkungen im Profil (studentNotes). Vorhandene
// Notizen nur auf Knopfdruck (Beamer, Regel 67); was man eben selbst getippt hat, bleibt sichtbar. Nie gespeichert.
let seatingNotesFresh = [];
function commitSeatingStudentForm() { addSeatingStudentNote(); addStudentNote(); commitSeatingStudentHint(); }
function renderSeatingStudentNotes() {
  const box = document.getElementById('seating-student-notes');
  const ctx = window.currentSeatingStudent;
  if (!box || !ctx) return;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  if (!s) { box.innerHTML = ''; return; }
  // Unter dem Feld nur, was eben getippt wurde (verborgen, AH28); offen steht es oben in der Zentrale (AM1)
  renderSwToday(s, ctx.dateStr);
  renderSwHub(s);
  const hubOpen = !classGradesProtected() || swShown;
  const visible = hubOpen ? [] : (s.studentNotes || []).filter(n => seatingNotesFresh.includes(n));
  box.innerHTML = visible.length ? `<ul class="seating-notes">${visible.map(n =>
      `<li><small>${n.date ? escHtml(formatDateShort(n.date)) : ''}</small>${escHtml(n.text)}</li>`).join('')}</ul>` : '';
}
function addSeatingStudentNote() {
  refreshSeatingStudentDay();   // AS2: Notiz mit dem neuen Tag, nie verworfen
  const input = document.getElementById('seating-student-note-input');
  const ctx = window.currentSeatingStudent;
  const text = input ? input.value.trim() : '';
  if (!text || !ctx) return false;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  if (!s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Notiz nicht gespeichert', 'error'); return false; }
  if (!Array.isArray(s.studentNotes)) s.studentNotes = [];
  const note = { text, date: ctx.dateStr || formatDate(new Date()) };
  s.studentNotes.push(note);
  seatingNotesFresh.push(note);
  input.value = '';
  saveDB();
  refreshStudentViews(ctx.groupId);
  renderSeatingStudentNotes();
  refreshOpenProfile(s);
  return true;
}
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

// ─── Geburtstage (AD6) ──────────────────────────────────────────────────────
// Nur ein Datum, das als Geburtstag eines Kindes stimmen kann: Ein Datum aus diesem oder den letzten Jahren kam vom iPad,
// das beim Antippen des leeren Feldes „heute“ einträgt (AH7). Gespeicherte Werte bleiben, sie zählen nur nicht.
function validBirthday(b) {
  if (typeof b !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b) || isNaN(parseDate(b))) return false;
  const y = +b.slice(0, 4);
  return y >= 1900 && y <= new Date().getFullYear() - 3;
}
const isLeapYear = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// Fällt der Geburtstag auf dateStr? 29.02. zählt in anderen Jahren am 28.02.
function birthdayOn(b, dateStr) {
  const md = b.slice(5), y = +dateStr.slice(0, 4);
  return md === dateStr.slice(5) || (md === '02-29' && !isLeapYear(y) && dateStr.slice(5) === '02-28');
}
// { when: 'today' | 'past', date, age } – 'past': Geburtstag an einem freien Tag (Wochenende, Ferien) seit dem
// letzten Schultag, damit er am nächsten Schultag nicht untergeht
function birthdayInfo(s, dateStr) {
  if (!s || !validBirthday(s.birthday) || !dateStr) return null;
  const year = +dateStr.slice(0, 4), born = +s.birthday.slice(0, 4);
  const age = born > 1900 && born < year ? year - born : null;
  if (birthdayOn(s.birthday, dateStr)) return { when: 'today', date: dateStr, age };
  let d = parseDate(dateStr);
  for (let i = 1; i <= 21; i++) {   // höchstens 3 Wochen zurück (lange Ferien: danach nicht mehr erwähnen)
    d = addDays(d, -1);
    if (isSchoolDay(d)) break;
    const ds = formatDate(d);
    if (birthdayOn(s.birthday, ds)) return { when: 'past', date: ds, age: born > 1900 && born < +ds.slice(0, 4) ? +ds.slice(0, 4) - born : null };
  }
  return null;
}

let seatingEditMode = false;
// ─── Notenrunde im Sitzplan (AH28) ───────────────────────────────────────────
// Werkzeug „Noten geben“: Karte antippen → Notentafel an der Karte → Zahl antippen = gespeichert → nächste Karte.
// Art in der Leiste (wie im Schüler-Fenster je Klasse gemerkt), Datum = Tag im Sitzplan. Zustand nie gespeichert;
// endet mit „Fertig“, beim Verlassen des Sitzplans und beim Klassenwechsel.
let gradeRound = null;   // { groupId, done: Set(studentId), count }
function toggleGradeRound() { if (gradeRound) endGradeRound(); else startGradeRound(); }
function startGradeRound() {
  if (!currentSeatingGroupId) return;
  if (seatingEditMode) toggleSeatingEditMode();   // Antippen soll eintragen, nicht verschieben
  gradeRound = { groupId: currentSeatingGroupId, done: new Set(), count: 0 };
  renderGradeRoundBar();
  renderSeatingPlan();
}
function endGradeRound() {
  closeGradeRoundPad();
  const was = !!gradeRound;
  gradeRound = null;
  renderGradeRoundBar();
  if (was && document.getElementById('view-seating')?.classList.contains('active')) renderSeatingPlan();
}
function renderGradeRoundBar() {
  const bar = document.getElementById('grade-round-bar');
  const btn = document.getElementById('btn-seating-round');
  if (btn) { btn.classList.toggle('active', !!gradeRound); btn.setAttribute('aria-pressed', gradeRound ? 'true' : 'false'); }
  if (!bar) return;
  if (!gradeRound) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
  const type = quickGradeType(gradeRound.groupId);
  const n = gradeRound.count;
  bar.innerHTML = `<span class="grade-round-title">${icon('grades')}<span class="grade-round-label">Noten geben</span></span>
    <select class="form-input grade-round-type" aria-label="Art der Note">${QUICK_GRADE_TYPES.map(([k, label]) =>
      `<option value="${k}"${k === type ? ' selected' : ''}>${label}</option>`).join('')}</select>
    <span class="grade-round-count">${n === 1 ? '1 Note' : n + ' Noten'}</span>
    <span class="grade-round-hint">Schüler antippen, dann die Note</span>
    <button type="button" class="btn-secondary grade-round-done">Fertig</button>`;
  bar.classList.remove('hidden');
  bar.querySelector('select').addEventListener('change', e => rememberQuickGradeType(gradeRound.groupId, e.target.value));
  bar.querySelector('.grade-round-done').addEventListener('click', endGradeRound);
}
function closeGradeRoundPad() { document.getElementById('grade-round-pop')?.remove(); }
function openGradeRoundPad(card, studentId) {
  closeGradeRoundPad();
  if (!gradeRound) return;
  const groupId = gradeRound.groupId;
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  if (!s) return;
  const pop = document.createElement('div');
  pop.id = 'grade-round-pop';
  pop.className = 'grade-round-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `Note für ${studentListName(s)}`);
  const scale = gradeScale(groupId);
  pop.innerHTML = `<div class="grade-round-who">${escHtml(`${s.firstName || ''} ${s.lastName || ''}`.trim())}</div>
    <div class="sw-grid${scale.higherIsBetter ? ' is-points' : ''}">${quickGradeValues(scale).map(v =>
      `<button type="button" data-val="${escHtml(v.val)}" class="${v.main ? 'is-main' : ''}" aria-label="Note ${escHtml(v.label)}">${escHtml(v.label)}</button>`).join('')}</div>`;
  document.body.appendChild(pop);
  pop.querySelectorAll('[data-val]').forEach(b => b.addEventListener('click', () => giveRoundGrade(studentId, b.dataset.val)));
  const r = card.getBoundingClientRect();
  const w = pop.offsetWidth || 300, h = pop.offsetHeight || 170;
  pop.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)) + 'px';
  pop.style.top = (r.bottom + 8 + h <= window.innerHeight - 8 ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + 'px';
}
function giveRoundGrade(studentId, val) {
  if (!gradeRound) return;
  const round = gradeRound;
  const groupId = round.groupId;
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  closeGradeRoundPad();
  if (!s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Note nicht gespeichert', 'error'); return; }
  if (refreshSeatingDate()) renderSeatingDateStrip();   // über Nacht offen (Regel 24)
  const parsed = parseGradeInput(val, gradeScale(groupId));
  if (!parsed) return;
  const type = document.querySelector('#grade-round-bar select')?.value || quickGradeType(groupId);
  const entry = { type, value: parsed.value, date: currentSeatingDateStr || profileDefaultDate(), note: '' };
  if (!Array.isArray(s.grades)) s.grades = [];
  s.grades.push(entry);
  round.done.add(studentId);
  round.given = [...(round.given || []), entry];
  round.count++;
  saveDB();
  revealPeriodOf(entry.date);   // AR7
  renderGradeRoundBar();
  refreshGradeViews(s, groupId);
  const typeName = (QUICK_GRADE_TYPES.find(([k]) => k === type) || [])[1] || gradeTypeName(type);
  showUndoToast(`${studentListName(s)}: ${gradeText(entry.value)} (${typeName})`, () => {
    // Inzwischen ersetzte DB (Abgleich): Das Objekt gehört zum alten Stand, ein Löschen dort täte nichts (Regel 32)
    const i = (db.students[groupId] || []).includes(s) ? (s.grades || []).indexOf(entry) : -1;
    if (i === -1) { showToast('Nicht mehr möglich: Die Daten wurden inzwischen ersetzt', 'error'); return; }
    s.grades.splice(i, 1);
    if (gradeRound === round) {
      round.count--;
      round.given = (round.given || []).filter(x => x !== entry);
      if (!round.given.some(x => s.grades.includes(x))) round.done.delete(studentId);
      renderGradeRoundBar();
    }
    saveDB();
    refreshGradeViews(s, groupId);
  }, 'round');
}
// Tippen daneben (Druck auch daneben begonnen, Regel 27) und Escape schließen die Tafel
document.addEventListener('click', e => {
  const p = document.getElementById('grade-round-pop');
  if (!p || p.contains(e.target) || pressStartedIn(p)) return;
  closeGradeRoundPad();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('grade-round-pop')) closeGradeRoundPad(); });

function toggleSeatingEditMode() {
  seatingEditMode = !seatingEditMode;
  const btn = document.getElementById('btn-seating-edit');
  btn.classList.toggle('is-editing', seatingEditMode);
  btn.setAttribute('aria-pressed', seatingEditMode ? 'true' : 'false');
  btn.innerHTML = icon(seatingEditMode ? 'check' : 'edit') + `<span class="btn-label">${seatingEditMode ? 'Fertig' : 'Bearbeiten'}</span>`;
  // Raster-Größe gehört zum Bearbeiten (AH50): sonst ausgeblendet
  document.getElementById('seating-grid-tool')?.classList.toggle('hidden', !seatingEditMode);
  document.querySelector('.seating-tools')?.classList.toggle('editing', seatingEditMode);   // „Noten geben“ passt nicht zum Umsetzen
  if (!seatingEditMode) document.getElementById('seating-settings-popup')?.classList.add('hidden');
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
  // Notenrunde gehört zu einer Klasse: Klassenwechsel beendet sie (AH28)
  if (gradeRound && gradeRound.groupId !== groupId) { gradeRound = null; closeGradeRoundPad(); renderGradeRoundBar(); }
  renderSeatingCockpit(); // vor dem Messen: die Leiste nimmt dem Raster Höhe weg
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

  document.getElementById('seating-overflow-hint').classList.add('hidden');   // auch ohne Klasse (W16)
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
  // Platz innerhalb des Innenabstands (AH50: das Raster hat keinen Rahmen mehr, der Abstand kommt aus style.css)
  const box = wrapper || canvas.parentElement;
  const pad = getComputedStyle(box);
  const containerWidth = box.clientWidth - (parseFloat(pad.paddingLeft) || 0) - (parseFloat(pad.paddingRight) || 0);
  const containerHeight = box.clientHeight - (parseFloat(pad.paddingTop) || 0) - (parseFloat(pad.paddingBottom) || 0);
  
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
  const noteDay = isDateStr(dateStr) ? dateStr : formatDate(new Date());
  const notesSince = recentNotesSince(groupId, noteDay);   // Notizzettel auf der Karte (AM1), einmal je Zeichnen
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
    // Nur Mitarbeit ohne Titel: „Referat“ gehört zu einer Spalte der Tabelle (Regel 49, W10)
    const participation = (s.participation||[]).find(p => p.date === dateStr && !p.label);

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
    card.style.setProperty('--sc', cardSize + 'px');   // Symbole in der Ecke wachsen und schrumpfen mit der Karte (AH57)

    if (isCompact) card.classList.add('compact');
    if (isTiny) card.classList.add('tiny');

    let partHtml = '';
    if (participation) {
      // partSignHTML ist fertiges HTML; nur ein unbekannter Wert (Import/Sync) wird escaped (F2)
      partHtml = `<div class="sc-part">${partSignHTML(participation.value)}</div>`;
    }

    const fullName = [s.firstName, s.lastName].filter(Boolean).join(' ');
    const shortName = !s.firstName ? (s.lastName || '')
      : firstCount[s.firstName] > 1 && s.lastName ? `${s.firstName} ${s.lastName[0]}.` : s.firstName;
    // Symbole oben links (AD2/AD6): Hinweis vorhanden, Geburtstag – nie der Text selbst (Beamer)
    const hasHint = !!(s.notes || '').trim();
    const important = !!(s.importantNote || '').trim();   // AD17: rot, ersetzt das graue ⓘ
    const bday = birthdayInfo(s, dateStr);
    const missedLast = !!(cockpitToday && cockpitToday.live && cockpitToday.t.missed.includes(s)); // nur während der Stunde (Cockpit)
    const recentNote = recentStudentNotes(s, notesSince, noteDay).length > 0;   // nur dass es eine gibt, nie der Text (Regel 67)
    const marks = (important ? `<span class="sc-mark sc-important" title="Wichtiger Hinweis">${icon('alert')}</span>`
        : hasHint ? `<span class="sc-mark sc-hint" title="Hinweis vorhanden">${icon('info')}</span>` : '')
      + (recentNote ? `<span class="sc-mark sc-note" title="Notiz aus den letzten Stunden">${icon('sticky')}</span>` : '')
      + (bday ? `<span class="sc-mark sc-bday" title="Geburtstag">${icon('cake')}</span>` : '')
      + (missedLast ? `<span class="sc-mark sc-missed" title="Letzte Stunde gefehlt, Stoff nachholen">${icon('calendar-x')}</span>` : '');
    if (hasHint || important || bday || missedLast || recentNote) card.setAttribute('aria-label', fullName + (bday ? ', Geburtstag' : '')
      + (missedLast ? ', letzte Stunde gefehlt' : '') + (important ? ', wichtiger Hinweis vorhanden' : hasHint ? ', Hinweis vorhanden' : '')
      + (recentNote ? ', Notiz aus den letzten Stunden' : ''));
    card.innerHTML = `
      ${marks ? `<div class="sc-marks">${marks}</div>` : ''}
      <div class="sc-name" title="${escHtml(fullName)}">${escHtml(shortName)}</div>
      ${seatingShowGrades ? `<div class="sc-gpa" style="color:${gradeColor(rawAvg, scale)}">${avg}</div>` : ''}
      ${seatingShowTrend ? participationTrendHTML(s) : ''}
      ${late ? '<div class="sc-late-note">Zu spät</div>' : ''}
      ${forgotHw ? '<div class="sc-hw-note">Keine HA</div>' : ''}
      ${partHtml}
    `;

    if (seatingEditMode) {
      makeDraggable(card, s.id, groupId, cellWidth, cellHeight, cols, rows, offsetX, 1, layout, rowShift);
      card.classList.add('draggable-mode');
    } else {
      if (gradeRound && gradeRound.done.has(s.id)) card.classList.add('sc-graded');
      card.addEventListener('click', (e) => {
        // Seit dem Zeichnen kann ein neuer Tag begonnen haben (App über Nacht offen, BUGS E2)
        if (refreshSeatingDate()) { renderSeatingDateStrip(); renderSeatingPlan(); }
        if (gradeRound) { e.stopPropagation(); openGradeRoundPad(card, s.id); return; }   // Notenrunde (AH28)
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
    showToast('Keine anwesenden Schüler in dieser Klasse', 'error');
    return;
  }

  const modal = document.getElementById('modal-seating-randomizer');
  const nameEl = document.getElementById('random-student-name');
  
  nameEl.textContent = 'Auswahl läuft …';
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
    showToast('Keine anwesenden Schüler zum Einteilen', 'error');
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
  showToast(`${groups.length} Gruppen gebildet`);
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
const ABSENCE_NOTE_DAYS = 70;   // Hinweis eintragen und wieder finden: gleich weit, auch über die Sommerferien (Y8, AS11)
function nextLessonOfGroup(groupId, dateStr) {
  let d = parseDate(dateStr);
  for (let i = 0; i < ABSENCE_NOTE_DAYS; i++) {   // auch über die Sommerferien (Y8)
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
  // Hinweise zu anderen, weiter unentschuldigten Fehltagen (auch gleichnamiger Schüler) bleiben stehen (AS5)
  const keep = new Set();
  (db.students[groupId] || []).filter(x => absenceNoteText(x) === text).forEach(x => (x.attendance || [])
    .filter(a => a && a.type === 'abwesend' && a.date !== dateStr && isDateStr(a.date))
    .forEach(a => { const next = nextLessonOfGroup(groupId, a.date); if (next) keep.add(next.slotId + '_' + next.dateStr); }));
  replaceAbsenceNoteLines(groupId, dateStr, s, null, keep);
}
// Hinweis-Zeilen dieses Schülers in den Stunden der Klasse bis 4 Wochen nach dateStr ersetzen (newText) oder
// entfernen (null). Zeilenweise, nie per replace auf dem ganzen Text (Regel 25).
function replaceAbsenceNoteLines(groupId, dateStr, s, newText, keep = null) {
  const notes = [absenceNoteText(s)];
  // Ältere Versionen schrieben nur den Vornamen – den nur entfernen, wenn er in der Klasse eindeutig ist
  if (s.firstName && (db.students[groupId] || []).filter(x => x.firstName === s.firstName).length === 1) {
    notes.push(`${s.firstName} hat letzte Stunde unentschuldigt gefehlt`);
  }
  const slotIds = new Set(db.lessonSlots.filter(slot => slot.groupId === groupId).map(slot => slot.id));
  const until = formatDate(addDays(parseDate(dateStr), ABSENCE_NOTE_DAYS));   // so weit wie beim Eintragen (AS11)
  Object.keys(db.lessonData).forEach(key => {
    const sep = key.lastIndexOf('_');
    const slotId = key.slice(0, sep), keyDate = key.slice(sep + 1);
    if (!slotIds.has(slotId) || keyDate <= dateStr || keyDate > until || (keep && keep.has(key))) return;
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
  removed.forEach(s => { const a = studentAccessOf(s); if (a) queueShareDeletion(a.id); });   // persönliche Seite mit weg (AJ2)
  const group = db.groups.find(g => g.id === groupId);
  if (group && group.seatingPlan) group.seatingPlan = group.seatingPlan.filter(item => !ids.has(item.studentId));
  const ack = db.acknowledgedWarnings;
  if (ack) Object.keys(ack).forEach(k => { if (ids.has(k.split('_')[0])) delete ack[k]; });
}

// Schüler-Fenster über Nacht offen (AS2): Ist seit dem Öffnen ein neuer Tag, das Fenster auf den neuen Tag stellen und
// melden. Liefert true, wenn umgestellt wurde – Ein-Tipp-Knöpfe speichern dann nichts (man tippt nach dem Hinweis neu).
function refreshSeatingStudentDay(now = new Date()) {
  const ctx = window.currentSeatingStudent;
  if (!ctx || ctx.fixedDate || !ctx.openedOn || ctx.openedOn === formatDate(now)) return false;
  if (document.getElementById('modal-seating-student').classList.contains('hidden')) return false;
  let dateStr = profileDefaultDate(now);
  if (document.getElementById('view-seating')?.classList.contains('active')) {
    if (refreshSeatingDate(now)) { renderSeatingDateStrip(); renderSeatingPlan(); }
    dateStr = currentSeatingDateStr || dateStr;
  }
  const note = document.getElementById('seating-student-note-input');
  const typed = note ? note.value : '';
  openSeatingStudentModal(ctx.studentId, ctx.groupId, dateStr, { keep: true });
  if (note) note.value = typed;   // Eingetipptes nie verwerfen (Regel 27)
  showToast(`Neuer Tag: Einträge gelten jetzt für ${formatWeekdayShort(dateStr)}`);
  return true;
}
function setSeatingAbsence(type) {
  if (!window.currentSeatingStudent) return;
  if (refreshSeatingStudentDay()) return;
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
  // damit sein Grund („Arztattest“, „Bus“) bleibt (Regel 50, BUGS Q11, W3).
  const keep = s.attendance.find(a => a.date === dateStr && DAY_ATTENDANCE_TYPES.includes(a.type));
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
  if (refreshSeatingStudentDay()) return;   // AS2
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
  // Vorhandenen Eintrag umstellen, damit sein Grund bleibt (Regel 50, W3)
  const keep = s.attendance.find(a => a.date === dateStr && DAY_ATTENDANCE_TYPES.includes(a.type));
  s.attendance = s.attendance.filter(a => a === keep || a.date !== dateStr || !DAY_ATTENDANCE_TYPES.includes(a.type));
  if (keep) keep.type = 'zuspät';
  else s.attendance.push({ id: uid(), date: dateStr, type: 'zuspät', note: '' });
  saveDB();
  refreshStudentViews(groupId);
  closeModal('modal-seating-student');
  showToast('Zu spät eingetragen', 'warning');
}

function setSeatingHomework() {
  if (!window.currentSeatingStudent) return;
  if (refreshSeatingStudentDay()) return;   // AS2
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];
  
  // Nur den Eintrag ohne Bemerkung; einer mit Bemerkung gehört zu einer Spalte der Tabelle (BUGS Q8)
  const existingIdx = s.homework.findIndex(h => h.date === dateStr && !h.note);
  const labelled = s.homework.find(h => h.date === dateStr && h.note);
  if (existingIdx === -1 && labelled) {
    showToast(`Steht schon in der HA-Spalte „${labelled.note}“. Bitte in der Tabelle ändern`, 'error');
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


// Schüler-Fenster (AH28): Sitzplan, Stunde und Klassenansicht/Profil öffnen dasselbe Fenster. opts.more = „Mehr zu …“
// gleich offen (Profil), opts.focus = Abschnitt, opts.keep = Zustand wie vorher (nach dem Notenformular).
let swShown = false;   // Noten, Mitarbeit, Notizen, Hinweise unter „Mehr“ eingeblendet – nie gespeichert (Regel 16, 67)
function openSeatingStudentModal(studentId, groupId, dateStr, opts = {}) {
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  if (!s) return;
  const prev = window.currentSeatingStudent;
  const same = opts.keep && prev && prev.studentId === studentId && prev.groupId === groupId;
  const moreWasOpen = !document.getElementById('sw-more').hidden;
  document.getElementById('seating-student-title').textContent = `${s.firstName} ${s.lastName}`;
  // Klasse · Fach · Tag: Der Tag gilt für alles oben im Fenster (Mitarbeit, Fehlzeit, HA, Note, Notiz; AH28)
  const sg = db.groups.find(x => x.id === groupId);
  document.getElementById('seating-student-sub').textContent = [sg && sg.className, sg && sg.subject, formatWeekdayShort(dateStr)].filter(Boolean).join(' · ');

  // Tag des Öffnens (AS2): Über Nacht offen, gilt am neuen Tag der neue Tag – außer aus einer Stunde geöffnet (fixedDate)
  window.currentSeatingStudent = { studentId, groupId, dateStr,
    openedOn: same && prev.openedOn && opts.keepDay ? prev.openedOn : formatDate(new Date()),
    fixedDate: !!(opts.fixedDate || (same && prev.fixedDate)) };
  profileGroupId = groupId;
  currentStudentId = studentId;
  // QR-Knopf oben (AJ2e): schneller Weg zum Code, nur mit persönlichen Seiten der Klasse
  const codeBtn = document.getElementById('sw-code-btn');
  if (codeBtn) {
    codeBtn.classList.toggle('hidden', !(sg && personalActive(sg)));
    codeBtn.onclick = () => showStudentCode(groupId, studentId);
  }
  // Beamer: aus dem Sitzplan nur, wenn dort die Noten eingeblendet sind; aus der Klassenansicht wie dort (AH24 c)
  const fromClassView = document.getElementById('view-students').classList.contains('active') && currentGroupId === groupId;
  const fromSeating = document.getElementById('view-seating').classList.contains('active');   // sonst gilt der Sitzplan-Schalter nie (W1)
  if (!same) swShown = fromClassView ? classGradesShown : fromSeating && seatingShowGrades;

  const range = viewPeriod();   // Halbjahr wie in der Klassenansicht (Y7)
  const partN = partCounts(periodList(s.participation, range));
  document.getElementById('seating-student-participation-summary').innerHTML = `${range ? `Mitarbeit im ${PERIOD_NAMES[range.key]}` : 'Mitarbeit bisher'}: ` +
    PART_LEVELS.map((l, i) => `<span>${partSignHTML(l.value)} ${partN[i]}</span>`).join(' · ');

  closeSeatingGradePad();
  closeSeatingMenu();
  renderStudentDetailLists(s);
  resetProfileDates();
  renderSeatingStudentHint('view');
  if (!same) {
    seatingNotesFresh = [];
    // Angefangenes darf nie beim nächsten Schüler landen (W2)
    ['new-att-note', 'new-hw-student-note', 'new-student-note-text'].forEach(id => { document.getElementById(id).value = ''; });
  }
  document.getElementById('seating-student-note-input').value = '';
  renderSeatingStudentNotes();
  markSeatingStudentState(s, dateStr);
  setSeatingStudentVeil();
  setSeatingStudentMore(same ? moreWasOpen : !!opts.more, s);

  openModal('modal-seating-student');
  if (opts.focus && opts.more) switchStudentTab(opts.focus);
}
function setSeatingStudentVeil() {
  const more = document.getElementById('sw-more');
  if (more) more.classList.toggle('is-veiled', !swShown);
}
function revealSeatingStudent() { setSeatingStudentShown(true); }
function hideSeatingStudent() { setSeatingStudentShown(false); }
// Ein Schalter für alles Private im Fenster: Zentrale oben und „Mehr“ (AM1)
function setSeatingStudentShown(on) {
  swShown = on;
  setSeatingStudentVeil();
  renderSeatingStudentNotes();   // zeichnet auch die Zentrale neu
}

// Was heute schon eingetragen ist, ist markiert – ein zweites Tippen nimmt es zurück (BUGS N6)
// Was an diesem Tag schon eingetragen ist (AH34). Nur Arten und Anzahl, nie Notenwerte oder Notiztexte (Regel 67).
function renderSwToday(s, dateStr) {
  const box = document.getElementById('sw-today');
  if (!box) return;
  const words = [];
  if ((s.participation || []).some(p => p.date === dateStr && !p.label)) words.push('Mitarbeit');
  const absence = { abwesend: 'Fehlt', entschuldigt: 'Entschuldigt', 'zuspät': 'Zu spät' };
  (s.attendance || []).filter(a => a.date === dateStr && absence[a.type]).forEach(a => words.push(absence[a.type]));
  if ((s.homework || []).some(h => h.date === dateStr)) words.push('HA fehlt');
  const count = (n, one, many) => { if (n) words.push(`${n} ${n === 1 ? one : many}`); };
  count((s.grades || []).filter(g => g.date === dateStr).length, 'Note', 'Noten');
  count((s.studentNotes || []).filter(n => n.date === dateStr).length, 'Notiz', 'Notizen');
  const day = dateStr === formatDate(new Date()) ? 'Heute' : `Am ${formatDateDE(parseDate(dateStr))}`;
  box.textContent = words.length ? `${day}: ${words.join(' · ')}` : `${day} noch nichts eingetragen`;
}
function markSeatingStudentState(s, dateStr) {
  renderSwToday(s, dateStr);
  renderSwHub(s);   // Mitarbeit-Bilanz oben (AM1)
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

// Noten unter „Mehr zu …“ zeigt dieselbe Liste wie früher das Profil (renderGradesList, AH28); „Anzeigen“ blendet sie ein
function revealSeatingStudentGrades() { revealSeatingStudent(); }

// „Mehr zu …“ (AH28): Hinweise, Noten, Bilanz und der Weg ins Profil – zu beim Öffnen, damit oben das Schnelle bleibt
function setSeatingStudentMore(open, s) {
  const more = document.getElementById('sw-more');
  const btn = document.getElementById('sw-more-btn');
  if (!more || !btn) return;
  more.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (s) document.getElementById('sw-more-label').textContent = `Mehr zu ${s.firstName || 'diesem Schüler'}`;
}
function toggleSeatingStudentMore() {
  const more = document.getElementById('sw-more');
  setSeatingStudentMore(more.hidden);
}

// ─── Note schnell geben (AH28) ───────────────────────────────────────────────
// Schüler antippen → „Note geben“ → Zahl antippen = gespeichert. Art als Chips (je Klasse auf dem Gerät gemerkt, nie in
// db), Titel nur wahlweise und nur für diese eine Note. Datum = Tag des Fensters. Rückgängig im Hinweis (Regel 45).
const QUICK_GRADE_TYPES = [['muendlich', 'Mündlich'], ['test', 'Test'], ['mitarbeit', 'Mitarbeit'], ['projekt', 'Referat'], ['sonstig', 'Sonstiges']];
const QUICK_GRADE_KEY = 'quick_grade_type';
function quickGradeType(groupId) {
  try {
    const t = (JSON.parse(localStorage.getItem(QUICK_GRADE_KEY)) || {})[groupId];
    return QUICK_GRADE_TYPES.some(([k]) => k === t) ? t : 'muendlich';
  } catch (e) { return 'muendlich'; }
}
function rememberQuickGradeType(groupId, type) {
  try {
    const all = JSON.parse(localStorage.getItem(QUICK_GRADE_KEY)) || {};
    all[groupId] = type;
    localStorage.setItem(QUICK_GRADE_KEY, JSON.stringify(all));
  } catch (e) { /* gesperrt: dann eben Mündlich */ }
}
// Knöpfe der Notentafel: 1–6 mit Tendenz (drei Reihen) bzw. 15 … 0 Punkte (zwei Reihen à 8)
function quickGradeValues(scale) {
  if (scale.higherIsBetter) return [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(n => ({ val: String(n), label: String(n), main: true }));
  const n = [1, 2, 3, 4, 5, 6];
  return [...n.map(x => ({ val: x + '+', label: x + '+' })), ...n.map(x => ({ val: String(x), label: String(x), main: true })),
    ...n.map(x => ({ val: x + '-', label: x + '−' }))];
}
function quickGradePadHTML(groupId, withTitle) {
  const scale = gradeScale(groupId);
  const type = quickGradeType(groupId);
  const vals = quickGradeValues(scale);
  return `<div id="sw-grade-pad" class="sw-pad">
    <div class="sw-chips" role="group" aria-label="Art der Note">${QUICK_GRADE_TYPES.map(([k, label]) =>
      `<button type="button" data-type="${k}" class="${k === type ? 'on' : ''}" aria-pressed="${k === type}">${label}</button>`).join('')}</div>
    ${withTitle ? '<input type="text" id="sw-grade-title" class="entry-input sw-grade-title" placeholder="Titel, z. B. Vokabeltest" aria-label="Titel der Note" list="gf-column-titles" />' : ''}
    <div class="sw-grid${scale.higherIsBetter ? ' is-points' : ''}" role="group" aria-label="Note antippen = speichern">${vals.map(v =>
      `<button type="button" data-val="${escHtml(v.val)}" class="${v.main ? 'is-main' : ''}" aria-label="Note ${escHtml(v.label)}">${escHtml(v.label)}</button>`).join('')}</div>
    <div class="sw-pad-foot">${withTitle ? '' : '<button type="button" id="sw-grade-title-btn" class="btn-secondary sw-pad-title">+ Titel</button>'}<span>Antippen = gespeichert</span><button type="button" class="btn-secondary sw-pad-cancel">Abbrechen</button></div>
  </div>`;
}
function openSeatingGradePad(withTitle = false) {
  const ctx = window.currentSeatingStudent;
  const box = document.getElementById('sw-grade-slot');
  if (!ctx || !box) return;
  if (withTitle) fillGradeTitleList(ctx.groupId);   // AR10
  const title = document.getElementById('sw-grade-title');
  const keepTitle = title ? title.value : '';
  box.innerHTML = quickGradePadHTML(ctx.groupId, withTitle);
  box.hidden = false;
  document.getElementById('sw-grade-btn').setAttribute('aria-expanded', 'true');
  const pad = box.querySelector('#sw-grade-pad');
  if (withTitle) { const t = pad.querySelector('#sw-grade-title'); t.value = keepTitle; try { t.focus(); } catch (e) { /* egal */ } }
  pad.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
    rememberQuickGradeType(ctx.groupId, b.dataset.type);
    pad.querySelectorAll('[data-type]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
  }));
  pad.querySelector('#sw-grade-title-btn')?.addEventListener('click', () => openSeatingGradePad(true));
  pad.querySelectorAll('[data-val]').forEach(b => b.addEventListener('click', () => giveQuickGrade(b.dataset.val)));
  pad.querySelector('.sw-pad-cancel').addEventListener('click', closeSeatingGradePad);
}
function closeSeatingGradePad() {
  const box = document.getElementById('sw-grade-slot');
  if (box) { box.innerHTML = ''; box.hidden = true; }
  document.getElementById('sw-grade-btn')?.setAttribute('aria-expanded', 'false');
}
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
// „…“: Seltenes (Name/Geburtstag/Hinweise ändern, Export, Löschen) nicht mehr groß im Fenster (AH28)
function toggleSeatingMenu() {
  const menu = document.getElementById('sw-menu');
  if (!menu) return;
  menu.hidden = !menu.hidden;
  document.getElementById('sw-menu-btn').setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
}
function closeSeatingMenu() {
  const menu = document.getElementById('sw-menu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  document.getElementById('sw-menu-btn').setAttribute('aria-expanded', 'false');
}
function seatingMenuAction(action) {
  if (action === 'edit') { commitSeatingStudentForm(); openEditStudent(); }
  else if (action === 'export') exportCurrentStudent();
  else if (action === 'delete') deleteCurrentStudent();
}
function giveQuickGrade(val) {
  if (refreshSeatingStudentDay()) return;   // AS2
  const ctx = window.currentSeatingStudent;
  if (!ctx) return;
  const { studentId, groupId, dateStr } = ctx;
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  if (!s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Note nicht gespeichert', 'error'); return; }
  const parsed = parseGradeInput(val, gradeScale(groupId));
  if (!parsed) return;
  const type = document.querySelector('#sw-grade-pad .sw-chips .on')?.dataset.type || quickGradeType(groupId);
  const titleEl = document.getElementById('sw-grade-title');
  const entry = { type, value: parsed.value, date: dateStr || profileDefaultDate(), note: titleEl ? titleEl.value.trim() : '' };
  if (!Array.isArray(s.grades)) s.grades = [];
  s.grades.push(entry);
  saveDB();
  revealPeriodOf(entry.date);   // sonst verschwände die Note im gezeigten Halbjahr (AR7)
  refreshGradeViews(s, groupId);
  closeModal('modal-seating-student');
  const typeName = (QUICK_GRADE_TYPES.find(([k]) => k === type) || [])[1] || gradeTypeName(type);
  showUndoToast(`${studentListName(s)}: ${gradeText(entry.value)} (${entry.note || typeName})`, () => {
    // Inzwischen ersetzte DB (Abgleich): Das Objekt gehört zum alten Stand, ein Löschen dort täte nichts (Regel 32)
    const i = (db.students[groupId] || []).includes(s) ? (s.grades || []).indexOf(entry) : -1;
    if (i === -1) { showToast('Nicht mehr möglich: Die Daten wurden inzwischen ersetzt', 'error'); return; }
    s.grades.splice(i, 1);
    saveDB();
    refreshGradeViews(s, groupId);
  });
}

function openGradeFormForCurrentStudent() {
  refreshSeatingStudentDay();   // AS2: Formular zeigt dann gleich den neuen Tag
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  if (studentId && groupId) {
    openGradeForm(studentId, groupId, -1, dateStr || ''); // Datum wie Anwesenheit/Mitarbeit (BUGS N7)
  }
}

// ─── Global Grade Form ────────────────────────────────────────────────────
let profileGroupId = null;          // Klasse des offenen Schüler-Fensters (AH28), unabhängig von der Klassenansicht
let editingStudentGroupId = null;   // Klasse beim Bearbeiten aus dem Schüler-Fenster
let currentGradeFormCtx = null; // { studentId, groupId, grade } – grade = Objekt-Referenz (null = neue Note)

// Vorhandene Titel der Klasse vorschlagen (BUGS U2); auch für die schnelle Note im Schüler-Fenster (AR10)
function fillGradeTitleList(groupId) {
  const group = db.groups.find(g => g.id === groupId);
  const titles = new Set([...(group && group.gradeEvents || []).map(e => e.label || ''),
    ...(db.students[groupId] || []).flatMap(st => (st.grades || []).map(g => g.note || ''))]);
  titles.delete('');
  document.getElementById('gf-column-titles').innerHTML = [...titles].sort().map(t => `<option value="${escHtml(t)}"></option>`).join('');
}
function openGradeForm(studentId, groupId, gradeIdx, defaultDateStr = '', defaultLabel = '') {
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  // Referenz statt Index merken: der Index kann sich verschieben, solange das Formular offen ist
  currentGradeFormCtx = { studentId, groupId, grade: (gradeIdx >= 0 && s.grades && s.grades[gradeIdx]) || null };

  // Hide the quick student modal if it's open, so they don't overlap awkwardly
  const seatingModal = document.getElementById('modal-seating-student');
  if (!seatingModal.classList.contains('hidden')) {
    commitSeatingStudentForm(); // eingetippten Hinweis/Notiz sichern, bevor das Fenster (ohne closeModal) verschwindet
    seatingModal.classList.add('hidden');
    currentGradeFormCtx.wasSeatingModalOpen = true;
    currentGradeFormCtx.returnFocus = modalReturnFocus['modal-seating-student'] || null;   // Auslöser merken (W14)
  }


  fillGradeTitleList(groupId);

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
      // Fenster wieder öffnen, „Mehr“ und „Anzeigen“ wie vorher (AH28)
      openSeatingStudentModal(studentId, groupId, window.currentSeatingStudent.dateStr, { keep: true, keepDay: true });
      if (ctx.returnFocus) modalReturnFocus['modal-seating-student'] = ctx.returnFocus;   // Schließen führt zum Auslöser zurück (W14)
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
  if (!target) { showToast('Schüler nicht gefunden, Note nicht gespeichert', 'error'); return; }
  const { s, groupId, idx, isEdit } = target;
  if (isEdit && idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync). Bitte neu öffnen', 'error'); return; }

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
  revealPeriodOf(dateStr);
  refreshGradeViews(s, groupId);
}

function deleteGradeFromForm() {
  const target = findGradeFormTarget();
  if (!target || !target.isEdit) return;
  const { s, groupId, idx } = target;
  if (idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync). Bitte neu öffnen', 'error'); return; }

  const [removed] = s.grades.splice(idx, 1);
  saveDB();
  closeGradeForm();
  refreshGradeViews(s, groupId);
  // „Löschen“ steht direkt neben „Abbrechen“: Rückgängig statt endgültig (BUGS U3)
  showUndoToast('Note gelöscht', () => restoreSeatingEntry(groupId, s, 'grades', removed));
}

// Nach Änderungen im Notenformular alles neu zeichnen, was gerade sichtbar ist und Noten zeigt
function refreshGradeViews(s, groupId) {
  const win = document.getElementById('modal-seating-student');
  // Nur, wenn das Fenster genau diesen Schüler zeigt: „Rückgängig“ kommt oft, wenn schon der nächste offen ist (AS3)
  if (win && !win.classList.contains('hidden') && profileGroupId === groupId && getCurrentStudent() === s) renderGradesList(s);
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
  // Offenes Schüler-Fenster: Zentrale, „Heute: …“ und gedrückte Knöpfe oben passend zu „Mehr“ (AS10)
  const ctx = window.currentSeatingStudent;
  if (ctx && profileGroupId === groupId && !document.getElementById('modal-seating-student').classList.contains('hidden')) {
    const cur = getCurrentStudent();
    if (cur) markSeatingStudentState(cur, ctx.dateStr);
  }
}

function addParticipationSmiley(type) {
  if (refreshSeatingStudentDay()) return;   // AS2
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
  // Angefangene Fehlzeit/HA unter „Mehr“: Fenster offen lassen, sonst wäre sie still weg (AS6, Regel 27)
  if (seatingStudentDraft()) {
    markSeatingStudentState(s, dateStr);
    renderStudentDetailLists(s);
    showToast('Mitarbeit gespeichert. Fehlzeit oder HA ist noch nicht eingetragen');
    return;
  }
  showToast('Mitarbeit gespeichert');
  closeModal('modal-seating-student');
}
const seatingStudentDraft = () => ['new-att-note', 'new-hw-student-note'].some(id => document.getElementById(id)?.value.trim());
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
// Eintrag wiederherstellen, sofern der Schüler noch da ist (Sync kann die DB inzwischen ersetzt haben)
function restoreSeatingEntry(groupId, s, list, entry, after) {
  if (!(db.students[groupId] || []).includes(s)) { showToast('Nicht mehr möglich: Die Daten wurden inzwischen ersetzt', 'error'); return; }
  if (!s[list]) s[list] = [];
  // Inzwischen neu eingetragen (z. B. „Entschuldigt“ statt des entfernten „Unentschuldigt“): nicht zwei Einträge
  // für denselben Tag anlegen (Regel 50, BUGS W4)
  const clash = list === 'attendance' ? DAY_ATTENDANCE_TYPES.includes(entry.type)
      && s.attendance.some(a => a.date === entry.date && DAY_ATTENDANCE_TYPES.includes(a.type))
    : list === 'participation' ? s.participation.some(p => p.date === entry.date && (p.label || '') === (entry.label || ''))
    : list === 'homework' ? s.homework.some(h => h.date === entry.date && (h.note || '') === (entry.note || ''))
    : false;
  if (clash) { showToast('Nicht wiederhergestellt: Für den ' + formatDateShort(entry.date) + ' gibt es schon einen Eintrag', 'error'); return; }
  s[list].push(entry);
  if (after) after();
  saveDB();
  refreshStudentViews(groupId);
  refreshOpenProfile(s);
  showToast('Wiederhergestellt');
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
  if (avg === null || avg === undefined || isNaN(avg)) return '–';
  // Kaufmännisch runden (,x5 immer auf), nicht toFixed: 2,15 liegt intern bei 2,1499… (AR1)
  const f = 10 ** digits, scaled = Number((smoothAverage(avg) * f).toPrecision(12));
  return (Math.sign(scaled) * Math.round(Math.abs(scaled)) / f).toFixed(digits).replace('.', ',');
}
// Gespeicherten Notenwert anzeigen: '2.5' → '2,5'; Tendenzen ('2-') und Text ('+') bleiben
function gradeText(value) {
  const v = String(value ?? '');
  return GRADE_INPUT_RE.test(v.trim()) ? v.replace('.', ',') : v;   // Text wie „n. b.“ bleibt, wie er ist (AR9)
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
// Notizen übernimmt das Schließen (commitSeatingStudentForm). Ein angefangener Grund oder eine HA-Spalte wäre ein neuer
// Eintrag, den man noch nicht bestätigt hat: fragen statt raten.
function leaveSeatingStudentWindow() {
  if (seatingStudentDraft() && !confirm('Du hast eine Fehlzeit oder Hausaufgabe angefangen, aber noch nicht eingetragen.\n\nVerwerfen?')) return;
  closeModal('modal-seating-student');
}
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
// ── Klassennotizen (AD15): kurze Notizen pro Klasse („schon unterrichtet“, „auf Klassenfahrt“), wahlweise „gilt bis“.
// Sichtbar in Klassenliste, Dashboard, Stundenplan (Symbol) und Stunden-Fenster – nie im Sitzplan (Beamer).
function classNotesOf(g) {
  return g && Array.isArray(g.classNotes) ? g.classNotes.filter(n => n && typeof n.text === 'string' && n.text.trim()) : [];
}
function classNoteActive(n, dateStr) { return !isDateStr(n.until) || n.until >= dateStr; }
function activeClassNotes(g, dateStr = formatDate(new Date())) {
  return classNotesOf(g).filter(n => classNoteActive(n, dateStr));
}
function classNotesInlineHTML(notes, cls) {
  return `<div class="cn-inline ${cls}">${icon('pin')}<span class="cn-inline-list">${notes.map(n =>
    `<span class="cn-chip">${escHtml(n.text.trim())}${isDateStr(n.until) ? ` <small>bis ${escHtml(formatDateDE(parseDate(n.until)))}</small>` : ''}</span>`).join('')}</span></div>`;
}
function refreshClassNoteViews() {
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (active('view-classes')) renderSubjectGroups();
  if (active('view-dashboard')) renderDashboard();
  if (active('view-timetable')) renderTimetable();
  const slot = activeLessonId && db.lessonSlots.find(s => s.id === activeLessonId);
  if (slot && !document.getElementById('modal-lesson').classList.contains('hidden')) renderLessonClassNotes(slot, activeLessonDate, true);
}
// Klassennotizen im Stunden-Fenster: lesen und gleich eintragen (AH9), Ändern/Löschen/„gilt bis“ im Fenster „Notizen“.
// Wird auch bei offenem Fenster neu gezeichnet (refreshClassNoteViews): Eingetipptes bleibt stehen.
function renderLessonClassNotes(slot, dateStr, keepTyped = false) { fillLessonClassNotes(slot, dateStr, keepTyped); layoutLessonCards(); }
function fillLessonClassNotes(slot, dateStr, keepTyped) {
  const box = document.getElementById('lesson-class-notes');
  if (!box) return;
  const g = slot.groupId && db.groups.find(x => x.id === slot.groupId);
  const typed = keepTyped ? document.getElementById('lesson-class-note-input')?.value || '' : '';   // neues Fenster: leer
  box.classList.toggle('hidden', !g);
  if (!g) { box.innerHTML = ''; return; }
  const notes = activeClassNotes(g, dateStr);
  const veiled = lessonPrivateVeiled && notes.length;
  box.innerHTML = `<div class="notes-section-header"><span class="notes-section-icon">${icon('pin')}</span><span class="notes-section-label">Notiz für die Klasse</span></div>`
    + (veiled ? lessonVeilHTML(notes.length, 'Notiz', 'Notizen')
      : notes.length ? `<div class="lcn-row">${classNotesInlineHTML(notes, 'lcn-notes')}<button type="button" class="btn-secondary lcn-btn">Ändern</button></div>` : '')
    + `<div class="lcn-add"><input type="text" id="lesson-class-note-input" class="entry-input" placeholder="z. B. Buch vergessen" aria-label="Neue Notiz für die Klasse" />`
    + `<button type="button" class="btn-secondary btn-circle lcn-add-btn" aria-label="Notiz für die Klasse hinzufügen">${icon('plus')}</button></div>`;
  const input = box.querySelector('#lesson-class-note-input');
  input.value = typed;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addLessonClassNote(); } });
  box.querySelector('.lcn-add-btn').addEventListener('click', () => addLessonClassNote());
  box.querySelector('.lc-veil-btn')?.addEventListener('click', showLessonPrivate);
  const btn = box.querySelector('.lcn-btn');
  if (btn) btn.addEventListener('click', () => openClassNotes(g.id));
}
// Eingetippte Klassennotiz übernehmen (auch beim Schließen des Stunden-Fensters, storeLessonForm). Gilt ab heute.
function addLessonClassNote() {
  const input = document.getElementById('lesson-class-note-input');
  const text = input ? input.value.trim() : '';
  if (!text) return false;
  const slot = activeLessonId && db.lessonSlots.find(s => s.id === activeLessonId);
  const g = slot && slot.groupId && db.groups.find(x => x.id === slot.groupId);
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
  if (!Array.isArray(g.classNotes)) g.classNotes = [];
  g.classNotes.push({ id: uid(), text, date: formatDate(new Date()) });
  input.value = '';
  saveDB();
  refreshClassNoteViews();
  return true;
}

// ── Fenster „Notizen“ ──
let classNotesCtx = null;   // { groupId, note } – note = bearbeitete Notiz per Referenz (Regel 8), null = neue
function classNotesGroup() { return (classNotesCtx && db.groups.find(g => g.id === classNotesCtx.groupId)) || null; }
function openClassNotes(groupId) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  classNotesCtx = { groupId, note: null };
  document.getElementById('class-notes-title').textContent = 'Notizen ' + [g.className, g.subject].filter(Boolean).join(' ');
  resetClassNoteForm();
  renderClassNotesList();
  openModal('modal-class-notes');
}
function resetClassNoteForm() {
  if (classNotesCtx) classNotesCtx.note = null;
  document.getElementById('class-note-text').value = '';
  document.getElementById('class-note-until').value = '';
  document.getElementById('class-note-until').min = formatDate(new Date());
  document.getElementById('class-note-label').textContent = 'Neue Notiz';
  document.getElementById('btn-class-note-save').textContent = 'Hinzufügen';
  document.getElementById('btn-class-note-cancel').classList.add('hidden');
}
function editClassNote(note) {
  if (!classNotesCtx) return;
  // Angefangene neue Notiz erst übernehmen, sonst überschreibt das Formular sie still (AQ28, Regel 27)
  if (!classNotesCtx.note && classNoteFormDirty() && !saveClassNoteFromForm()) return;
  classNotesCtx.note = note;
  document.getElementById('class-note-text').value = note.text;
  document.getElementById('class-note-until').value = isDateStr(note.until) ? note.until : '';
  document.getElementById('class-note-label').textContent = 'Notiz ändern';
  document.getElementById('btn-class-note-save').textContent = 'Speichern';
  document.getElementById('btn-class-note-cancel').classList.remove('hidden');
  renderClassNotesList();
  document.getElementById('class-note-text').focus();
}
function cancelClassNoteEdit() { resetClassNoteForm(); renderClassNotesList(); }
function classNoteFormDirty() {
  const text = document.getElementById('class-note-text').value.trim();
  const until = document.getElementById('class-note-until').value;
  const n = classNotesCtx && classNotesCtx.note;
  return n ? (text !== n.text || until !== (isDateStr(n.until) ? n.until : '')) : !!text;
}
function saveClassNoteFromForm() {
  const g = classNotesGroup();
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
  const text = document.getElementById('class-note-text').value.trim();
  const until = document.getElementById('class-note-until').value;
  if (!text) { showToast('Bitte einen Text eingeben', 'error'); return false; }
  if (!Array.isArray(g.classNotes)) g.classNotes = [];
  const n = classNotesCtx.note;
  if (n) {
    if (!g.classNotes.includes(n)) { showToast('Diese Notiz gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
    n.text = text;
    if (isDateStr(until)) n.until = until; else delete n.until;
  } else {
    g.classNotes.push({ id: uid(), text, date: formatDate(new Date()), ...(isDateStr(until) ? { until } : {}) });
  }
  saveDB();
  resetClassNoteForm();
  renderClassNotesList();
  refreshClassNoteViews();
  return true;
}
// Texte aus anderen Klassen zum Antippen („schon unterrichtet“ bei 18 Klassen nicht 18-mal tippen)
function classNoteSuggestions(g) {
  if (!g) return [];
  const today = formatDate(new Date());
  const own = new Set(activeClassNotes(g, today).map(n => n.text.trim().toLowerCase()));
  const seen = new Map();
  db.groups.forEach(x => {
    if (x === g) return;
    activeClassNotes(x, today).forEach(n => {
      const t = n.text.trim(), k = t.toLowerCase();
      if (own.has(k) || t.length > 40) return;
      const e = seen.get(k) || { t, count: 0, date: '', until: null };
      e.count++;
      if ((n.date || '') >= e.date) { e.date = n.date || ''; e.until = isDateStr(n.until) ? n.until : null; } // „gilt bis“ der neuesten übernehmen
      seen.set(k, e);
    });
  });
  return [...seen.values()].sort((a, b) => b.count - a.count || b.date.localeCompare(a.date)).slice(0, 4).map(e => ({ text: e.t, until: e.until }));
}
function addSuggestedClassNote({ text, until }) {
  const g = classNotesGroup();
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  if (!Array.isArray(g.classNotes)) g.classNotes = [];
  g.classNotes.push({ id: uid(), text, date: formatDate(new Date()), ...(until ? { until } : {}) });
  saveDB();
  renderClassNotesList();
  refreshClassNoteViews();
}
function deleteClassNote(note) {
  const g = classNotesGroup();
  const list = g && Array.isArray(g.classNotes) ? g.classNotes : [];
  const i = list.indexOf(note);
  if (i < 0) { renderClassNotesList(); return; }   // inzwischen weg (z. B. Sync): nichts löschen
  list.splice(i, 1);
  if (classNotesCtx.note === note) resetClassNoteForm();
  saveDB();
  renderClassNotesList();
  refreshClassNoteViews();
  const gid = g.id;
  showUndoToast('Notiz gelöscht', () => {
    const gg = db.groups.find(x => x.id === gid);
    if (!gg) return;
    if (!Array.isArray(gg.classNotes)) gg.classNotes = [];
    if (gg.classNotes.some(n => n.id === note.id)) return;
    gg.classNotes.splice(Math.min(i, gg.classNotes.length), 0, note);
    saveDB();
    refreshClassNoteViews();
    if (classNotesCtx && classNotesCtx.groupId === gid && !document.getElementById('modal-class-notes').classList.contains('hidden')) renderClassNotesList();
  });
}
function renderClassNotesList() {
  const box = document.getElementById('class-notes-list');
  const g = classNotesGroup();
  const today = formatDate(new Date());
  const notes = classNotesOf(g);
  const current = notes.filter(n => classNoteActive(n, today));
  const expired = notes.filter(n => !classNoteActive(n, today));
  const editing = classNotesCtx && classNotesCtx.note;
  const item = (n, isExp) => `<li class="cn-item${isExp ? ' is-expired' : ''}${editing === n ? ' is-editing' : ''}">
      <button type="button" class="cn-text" aria-label="Notiz ändern: ${escHtml(n.text)}"><span>${escHtml(n.text)}</span>${isDateStr(n.until)
        ? `<small>${isExp ? 'galt' : 'gilt'} bis ${escHtml(formatDateLong(n.until))}</small>` : ''}</button>
      <button type="button" class="btn-icon cn-del" title="Löschen" aria-label="Notiz löschen: ${escHtml(n.text)}">${icon('trash')}</button></li>`;
  box.innerHTML = (current.length ? `<ul class="cn-list">${current.map(n => item(n, false)).join('')}</ul>` : '<p class="cn-empty">Noch keine Notiz.</p>')
    + (expired.length ? `<p class="cn-sub">Abgelaufen</p><ul class="cn-list">${expired.map(n => item(n, true)).join('')}</ul>` : '');
  const all = [...current, ...expired];
  box.querySelectorAll('.cn-item').forEach((li, i) => {
    li.querySelector('.cn-text').addEventListener('click', () => editClassNote(all[i]));
    li.querySelector('.cn-del').addEventListener('click', () => deleteClassNote(all[i]));
  });
  const sugBox = document.getElementById('class-note-suggestions');
  const sugg = classNoteSuggestions(g);
  sugBox.innerHTML = sugg.length ? '<span class="cn-sugg-label">Aus anderen Klassen:</span>'
    + sugg.map(x => `<button type="button" class="cn-suggest">${icon('plus')}${escHtml(x.text)}${x.until ? ` <small>bis ${escHtml(formatDateDE(parseDate(x.until)))}</small>` : ''}</button>`).join('') : '';
  sugBox.classList.toggle('hidden', !sugg.length);
  sugBox.querySelectorAll('.cn-suggest').forEach((b, i) => b.addEventListener('click', () => addSuggestedClassNote(sugg[i])));
}
// Schließen (✕, Fertig, Escape, daneben tippen): Eingetipptes übernehmen statt verwerfen (Regel 27)
function closeClassNotes() {
  if (classNotesCtx && classNoteFormDirty() && document.getElementById('class-note-text').value.trim()) saveClassNoteFromForm();
  closeModal('modal-class-notes');
  classNotesCtx = null;
}
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

// Welche Einträge eine quittierte Warnung meinte. Nur die Anzahl zu merken reichte nicht: Eintrag gelöscht und
// neuer angelegt = gleiche Anzahl, die neue Fehlzeit blieb unsichtbar (BUGS R14).
// Warnungen zählen das laufende Halbjahr (Y7). Was quittiert wurde, merkt sich db unter `<id>_<art>`; im 2. Halbjahr
// unter eigenem Namen, sonst hielte der höhere Stand aus dem 1. Halbjahr neue Warnungen zurück. Im 1. Halbjahr und
// ohne Stichtag bleibt der alte Name, damit Quittiertes gültig bleibt (auch für ältere App-Versionen).
function warningAckBase(studentId, type, range = runningHalf()) {
  return `${studentId}_${type}` + (range && range.key === 'h2' ? `_h2-${range.from}` : '');
}
function warningSignature(s, type, range = runningHalf()) {
  const parts = type === 'absences' ? periodList(s.attendance, range).filter(a => a.type === 'abwesend').map(a => a.date)
    : type === 'homework' ? periodList(s.homework, range).map(h => h.date + '|' + (h.note || ''))
    : periodList(s.grades, range).map(g => (g.date || '') + '|' + g.value);
  const str = parts.sort().join(';');
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
// Noch quittiert? Anzahl nicht gestiegen und (falls gemerkt) dieselben Einträge
// Quittung aus einem früheren Schuljahr gilt nicht mehr (AR2): Der Name im 1. Halbjahr hat kein Schuljahr
function warningAckFresh(ack, base) {
  const at = ack[`${base}_at`];
  return !isDateStr(at) || schoolYearStart(at) === schoolYearStart();
}
function warningAcknowledged(ack, s, type, count) {
  const base = warningAckBase(s.id, type);
  if (!warningAckFresh(ack, base)) return false;
  const n = ack[base];
  if (!(count <= (n || 0))) return false;
  // Weniger als beim Quittieren (z. B. ein Fehltag nachträglich entschuldigt): Es ist besser geworden (BUGS U6)
  if (type !== 'grade' && count < n) return true;
  const sig = ack[`${base}_sig`];
  return !sig || sig === warningSignature(s, type);
}

function collectWarnings() {
  const ack = db.acknowledgedWarnings || {};
  const warnAbsences = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  const warnHomework = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  const warnGrade    = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  const warnPoints   = db.settings.warnPoints !== undefined ? db.settings.warnPoints : 5; // Oberstufe: unter x Punkten
  const warnings = [];

  const range = runningHalf();   // laufendes Halbjahr (Y7)
  db.groups.forEach(group => {
    (db.students[group.id] || []).forEach(s => {
      const name = `${escHtml(s.firstName)} ${escHtml(s.lastName)}`;
      const unexcused = periodList(s.attendance, range).filter(a => a.type === 'abwesend').length;
      if (warnAbsences > 0 && unexcused >= warnAbsences && !warningAcknowledged(ack, s, 'absences', unexcused)) {
        warnings.push({ student: s, group, type: 'absences', count: unexcused,
          title: 'Zu viele unentschuldigte Fehlzeiten', desc: `${name} hat ${unexcused === 1 ? 'eine unentschuldigte Fehlzeit' : unexcused + ' unentschuldigte Fehlzeiten'}.` });
      }
      const hwCount = periodList(s.homework, range).length;
      if (warnHomework > 0 && hwCount >= warnHomework && !warningAcknowledged(ack, s, 'homework', hwCount)) {
        warnings.push({ student: s, group, type: 'homework', count: hwCount,
          title: 'Oft Hausaufgaben vergessen', desc: `${name} hat ${hwCount === 1 ? 'einmal' : hwCount + '-mal'} die Hausaufgaben vergessen.` });
      }
      const grades = periodList(s.grades, range);
      if (grades.length > 0) {
        const avg = calculateStudentAverage(s, group.id, range);
        const points = gradeScale(group).higherIsBetter;
        const critical = avg !== null && (points ? warnPoints > 0 && avg < warnPoints : warnGrade > 0 && avg >= warnGrade);
        // Quittiert und seitdem nicht schlechter geworden (z. B. Note zum Besseren korrigiert): bleibt quittiert (BUGS U6)
        const ackAvg = ack[`${warningAckBase(s.id, 'grade', range)}_avg`];
        const notWorse = ack[warningAckBase(s.id, 'grade', range)] !== undefined && typeof ackAvg === 'number'
          && warningAckFresh(ack, warningAckBase(s.id, 'grade', range))
          && (points ? avg >= ackAvg : avg <= ackAvg);
        if (critical && !notWorse && !warningAcknowledged(ack, s, 'grade', grades.length)) {
          warnings.push({ student: s, group, type: 'grade', count: grades.length, avg,   // avg nur intern, nie angezeigt (AS8)
            title: 'Kritischer Notenstand',
            desc: `${name}: Notenstand kritisch.` });   // nie die Zahl: das Dashboard kann am Beamer offen sein (AS8, Regel 78)
        }
      }
    });
  });
  return warnings;
}

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
  updateToolLabels();
}

let timerInterval = null;
let timerSeconds = 300; // 5 mins default; läuft der Timer, ist das die zuletzt angezeigte Restzeit
let timerIsRunning = false;
let timerEndsAt = 0;    // Date.now()-Zeitpunkt, an dem der laufende Timer abläuft

const mmss = secs => Math.floor(secs / 60).toString().padStart(2, '0') + ':' + (secs % 60).toString().padStart(2, '0');
let timerDone = false;   // abgelaufen, bis „Zurücksetzen“ (BUGS N12)
function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (el) el.textContent = mmss(timerSeconds);
  updateToolLabels();
}
// Knöpfe unten (AH50): „Timer“/„Stoppuhr“, sobald etwas läuft oder eingestellt ist die Zeit – auch bei geschlossenem Feld
function updateToolLabels() {
  const t = document.getElementById('btn-tool-timer'), tl = document.getElementById('tool-timer-label');
  if (t && tl) {
    const on = timerIsRunning || timerDone || timerSeconds !== 300;
    tl.textContent = on ? mmss(timerSeconds) : 'Timer';
    t.classList.toggle('on', on);
    t.classList.toggle('done', timerDone);
    t.setAttribute('aria-label', on ? `Timer ${mmss(timerSeconds)}${timerDone ? ', abgelaufen' : ''}` : 'Timer');
  }
  const w = document.getElementById('btn-tool-stopwatch'), wl = document.getElementById('tool-stopwatch-label');
  if (w && wl) {
    const on = stopwatchIsRunning || stopwatchMs > 0;
    wl.textContent = on ? mmss(Math.floor(stopwatchMs / 1000)) : 'Stoppuhr';
    w.classList.toggle('on', on);
    w.setAttribute('aria-label', on ? `Stoppuhr ${mmss(Math.floor(stopwatchMs / 1000))}` : 'Stoppuhr');
  }
}
// Feld über dem Knopf: höchstens eins offen; Escape und Tippen daneben schließen es (Regel 27)
function toggleToolPop(name) {
  const pop = document.getElementById(`tool-${name}-pop`);
  if (!pop) return;
  const opening = pop.classList.contains('hidden');
  closeToolPops();
  if (!opening) return;
  const btn = document.getElementById(`btn-tool-${name}`);
  pop.classList.remove('hidden');
  btn?.setAttribute('aria-expanded', 'true');
  placeToolPop(pop, btn);
}
function placeToolPop(pop, btn) {
  const bar = pop.parentElement;
  if (!btn || !bar) return;
  pop.style.left = '0px';
  const max = Math.max(0, bar.clientWidth - pop.offsetWidth - 8);
  const want = btn.offsetLeft + btn.offsetWidth / 2 - pop.offsetWidth / 2;
  pop.style.left = Math.round(Math.max(8, Math.min(max, want))) + 'px';
}
function closeToolPops() {
  ['timer', 'stopwatch'].forEach(n => {
    document.getElementById(`tool-${n}-pop`)?.classList.add('hidden');
    document.getElementById(`btn-tool-${n}`)?.setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', e => {
  const open = document.querySelector('.tool-pop:not(.hidden)');
  if (!open || open.contains(e.target) || pressStartedIn(open)) return;
  if (e.target.closest && e.target.closest('#btn-tool-timer, #btn-tool-stopwatch')) return;
  closeToolPops();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.querySelector('.tool-pop:not(.hidden)')) closeToolPops();
});

// Läuft der Timer, verschiebt +/− sein Ende (W9: vorher tat „+1 Min“ ohne Rückmeldung nichts); nie unter jetzt
function adjustTimer(mins) {
  if (timerIsRunning) {
    timerEndsAt = Math.max(Date.now(), timerEndsAt + mins * 60000);
    timerTick();
    return;
  }
  document.getElementById('timer-display').classList.remove('timer-done');
  timerDone = false;
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
    timerDone = true;
    updateToolLabels();
    playTimerSound();
    showToast('Timer abgelaufen');
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
    if (timerFresh) { timerPreset = timerSeconds; timerFresh = false; }   // „Zurücksetzen“ springt hierher (W9)
    timerEndsAt = Date.now() + ms;
    setPlayButton('btn-timer-toggle', true, 'Timer');
    timerInterval = setInterval(timerTick, 250);
  }
}

// Zurück auf die Zeit, mit der der Timer zuletzt gestartet wurde (W9: vorher immer 5:00); ein zweites Mal auf 5:00
let timerPreset = 300, timerFresh = true;
function resetTimer() {
  document.getElementById('timer-display').classList.remove('timer-done');
  timerDone = false;
  clearInterval(timerInterval);
  timerIsRunning = false;
  timerRemainingMs = null;
  timerSeconds = timerFresh ? 300 : timerPreset;
  timerFresh = true;
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
  updateToolLabels();
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

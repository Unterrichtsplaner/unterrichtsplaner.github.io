// ▸ Stundenplan: Woche, Tag, Klasse, Stunden anlegen/ändern/verlegen, Ziehen, Drucken, Aufsichten
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.

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
function isTimetableDayView() { return timetableMode === 'day' || window.innerWidth < DAY_VIEW_MAX_WIDTH; }
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
function goToCurrentWeek()  {
  currentWeekOffset = 0; timetableDay = null; timetableChosenOn = '';
  if (timetableMode === 'class') ttClassShowPast = false;   // Klassen-Ansicht: frühere Stunden zu, heute oben
  renderTimetable();
  if (timetableMode === 'class') {
    const wrap = document.getElementById('timetable-grid').parentElement;
    if (wrap) wrap.scrollTop = 0;
  }
}
function jumpToDate(dateStr) {
  if (!dateStr) return;
  const targetDate = parseDate(dateStr);
  if (isNaN(targetDate.getTime())) return;
  // Wochenansicht: nur das Wochenende auf Montag, Ferienwochen bleiben erreichbar (AQ23)
  if (!isTimetableDayView()) {
    const wd = targetDate.getDay();
    const d = wd === 6 ? addDays(targetDate, 2) : wd === 0 ? addDays(targetDate, 1) : targetDate;
    currentWeekOffset = Math.round((mondayOf(d) - getWeekDates(0)[0]) / 86400000 / 7);
    timetableDay = null; timetableChosenOn = formatDate(new Date());
    renderTimetable();
    return;
  }
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
  updateTimetableModeUI();
  if (timetableMode === 'class') { renderTimetableClass(grid); return; }
  grid.className = 'timetable-grid';
  const dayView = isTimetableDayView();
  grid.classList.toggle('day-view', dayView);
  const prevBtn = document.querySelector('button[onclick="navigateWeek(-1)"]');
  const nextBtn = document.querySelector('button[onclick="navigateWeek(1)"]');
  if (prevBtn) prevBtn.title = dayView ? 'Vorheriger Tag' : 'Vorherige Woche';
  if (nextBtn) nextBtn.title = dayView ? 'Nächster Tag' : 'Nächste Woche';
  if (dayView) { renderTimetableDay(grid); addTopicsToDayTiles(grid); }
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
  document.getElementById('week-label').innerHTML = `<span class="week-label-kw">KW ${weekNo}  ·  </span>` + (y0 === y4
    ? `${formatDateDE(dates[0])} – ${formatDateDE(dates[4])}<span class="week-label-kw"> ${y4}</span>`
    : `${formatDateDE(dates[0])}${y0} – ${formatDateDE(dates[4])}${y4}`);

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
  weekLabel.innerHTML = `${DAY_SHORT[dayIdx]} ${formatDateDE(d)}<span class="week-label-kw">  ·  KW ${getWeekNumber(d)}</span>`;   // Handy: KW fällt weg, sonst ist das Datum abgeschnitten
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
    + (hasEarlier ? 'Für diese Stunde gibt es Notizen oder Hausaufgaben aus früheren Stunden. Die bleiben, wie sie waren.\n\n' : '')
    + 'Nur an diesem Tag oder dauerhaft?';
  const choices = [];
  if (allowOnce) choices.push({ label: `Nur am ${formatDateLong(dateStr)}`, value: 'once' });
  choices.push({ label: hasEarlier ? `Für immer (${fromPhrase(from)})` : 'Für immer', value: 'from', primary: true });
  if (hasEarlier) choices.push({ label: 'Alle Stunden ändern, auch frühere', value: 'all' });
  return askChoice(other ? 'Stunden tauschen' : 'Stunde ändern', text, choices);
}

// ─── Verlegen „nur an einem Tag“ (Regel 65, Gesamtprüfung 11.11. Paket 2) ───────────────────────────
// Der Ursprung einer verlegten Stunde ist der lessonData-Eintrag mit `movedTo` auf die Kopie. Er wandert mit, wenn die
// Stunde später dauerhaft geändert wird (moveLessonData, splitSlotFrom) – `movedFrom` der Kopie dagegen nicht. Darum
// wird der Ursprung immer über diesen Vermerk gesucht (AQ4) und nur genommen, wenn die Stunde dort noch stattfindet (AQ13).
function movedOrigin(once) {
  if (!once || !once.movedFrom || !isOneOffSlot(once)) return null;
  let key = Object.keys(db.lessonData).find(k => { const d = db.lessonData[k]; return d && d.movedTo && d.movedTo.slotId === once.id; });
  if (!key) key = `${once.movedFrom.slotId}_${once.movedFrom.date}`;
  const sep = key.lastIndexOf('_'), slotId = key.slice(0, sep), date = key.slice(sep + 1);
  const slot = db.lessonSlots.find(s => s.id === slotId && s !== once);
  if (!slot || !slotOccursOn(slot, date)) return null;
  return { slot, date, key };
}
// Ursprung weg (Stunde beendet/gelöscht) oder Kopie regelmäßig geworden: Die Kopie bleibt eine normale Stunde mit ihren
// Einträgen; am alten Termin fällt die Stunde weiter aus, nur der Verweis verschwindet (AQ6, AQ13).
function detachMovedCopy(once) {
  Object.values(db.lessonData).forEach(d => { if (d && d.movedTo && d.movedTo.slotId === once.id) delete d.movedTo; });
  delete once.movedFrom;
}
// `movedFrom` der Kopien an den tatsächlichen Ursprung angleichen (für Anzeige „verlegt“/„geändert“ und alte Versionen)
function refreshMovedFrom() {
  db.lessonSlots.forEach(s => {
    if (!s.movedFrom) return;
    const key = Object.keys(db.lessonData).find(k => { const d = db.lessonData[k]; return d && d.movedTo && d.movedTo.slotId === s.id; });
    if (!key) return;
    const sep = key.lastIndexOf('_');
    s.movedFrom = { slotId: key.slice(0, sep), date: key.slice(sep + 1) };
  });
}
// Zwei Einträge desselben Termins zusammenlegen, nie etwas verlieren: Texte untereinander, Listen hintereinander
function mergeLessonEntry(target, src) {
  Object.entries(src || {}).forEach(([k, v]) => {
    const cur = target[k];
    if (cur === undefined || cur === null || cur === '' || cur === false) target[k] = v;
    else if (Array.isArray(cur) && Array.isArray(v)) target[k] = [...cur, ...v.filter(x => !cur.some(c => c && x && c.id && c.id === x.id))];
    else if (typeof cur === 'string' && typeof v === 'string' && v.trim() && !cur.includes(v)) target[k] = `${cur}\n${v}`;
  });
  return target;
}
// lessonData-Eintrag umziehen, ohne einen vorhandenen zu überschreiben; Planung zieht mit (AQ1, AQ17)
function moveLessonEntry(oldKey, newKey) {
  if (oldKey === newKey) return;
  const d = db.lessonData[oldKey];
  if (d) {
    delete db.lessonData[oldKey];
    if (db.lessonData[newKey]) mergeLessonEntry(db.lessonData[newKey], d); else db.lessonData[newKey] = d;
  }
  movePlanRefs(oldKey, newKey);
}
// Erledigt-Haken (doneLessons) und eingetippte Themen (pinned + pinnedSlot) hängen an Terminen wie lessonData (AQ17)
function movePlanRefs(oldKey, newKey) {
  const sep = newKey.lastIndexOf('_'), slotId = newKey.slice(0, sep), date = newKey.slice(sep + 1);
  db.groups.forEach(g => groupPlan(g).forEach(t => {
    if (Array.isArray(t.doneLessons) && t.doneLessons.includes(oldKey)) t.doneLessons = t.doneLessons.map(k => (k === oldKey ? newKey : k));
    if (t.pinnedSlot && `${t.pinnedSlot}_${t.pinned}` === oldKey) { t.pinnedSlot = slotId; t.pinned = date; }
  }));
}

// „Nur diese Woche“: einmalige Stunde mit den neuen Angaben am Zieltag; der Ursprung fällt an diesem Tag aus
// („verlegt“, mit Verweis), seine Einträge wandern mit, fällige HA/Tests zeigen auf den neuen Termin.
// Liegt das Ziel am selben Platz (nur Raum o. Ä. geändert), ersetzt die einmalige Stunde die regelmäßige (lessonsAt).
// Ist der Tag schon verlegt, wird die alte Verlegung zuerst aufgehoben: nie zwei Kopien (AQ5). Wird eine Kopie selbst
// verlegt, geht es vom Ursprung aus neu (rehomeMovedCopy).
function moveOccurrenceOnce(slot, fromDate, target, overrides = {}) {
  if (isOneOffSlot(slot) && slot.movedFrom) return rehomeMovedCopy(slot, target, overrides);
  const fromKey = `${slot.id}_${fromDate}`;
  const prev = db.lessonData[fromKey] && db.lessonData[fromKey].movedTo;
  if (prev) revertMovedLesson(prev.slotId);
  const once = { id: uid(), subject: slot.subject || '', groupId: slot.groupId || null, room: slot.room || '', color: slot.color,
    part: target.part || slot.part || 'full', ...overrides,
    day: target.day, block: target.block, recurring: false, startDate: null, startWeek: null, specificDate: target.dateStr,
    movedFrom: { slotId: slot.id, date: fromDate } };
  if (!target.part && overrides.part) once.part = overrides.part;
  db.lessonSlots.push(once);
  const moved = db.lessonData[fromKey];
  delete db.lessonData[fromKey];
  if (moved) { delete moved.ausfall; delete moved.movedTo; db.lessonData[`${once.id}_${target.dateStr}`] = moved; }
  movePlanRefs(fromKey, `${once.id}_${target.dateStr}`);
  const samePlace = target.dateStr === fromDate && target.block === slot.block && partsOverlap(once.part, slot.part);
  if (!samePlace) db.lessonData[fromKey] = { ausfall: true, movedTo: { slotId: once.id, date: target.dateStr } };
  retargetMovedItems(slot, fromDate, target.dateStr);
  return once;
}
// Eine schon verlegte Stunde bekommt einen neuen Platz: erst zurück zum Ursprung, dann von dort neu verlegen.
// Liegt das Ziel wieder am Ursprung, bleibt es beim Zurücknehmen (AQ2). Ohne Ursprung: normale einmalige Stunde.
function rehomeMovedCopy(once, target, overrides = {}) {
  const origin = movedOrigin(once);
  if (!origin) { detachMovedCopy(once); return null; }
  const keep = { subject: once.subject, groupId: once.groupId || null, room: once.room || '', color: once.color, part: target.part || once.part || 'full', ...overrides };
  revertMovedLesson(once.id);
  const home = target.dateStr === origin.date && target.block === origin.slot.block && partsOverlap(keep.part, origin.slot.part);
  if (home) return 'home';
  return moveOccurrenceOnce(origin.slot, origin.date, target, keep);
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
// Verlegung zurücknehmen (Stunden-Fenster am alten Platz, oder die verlegte Stunde löschen): Einträge zurück.
// Am Ursprung wird nichts überschrieben, beide Stände werden zusammengelegt. Gibt es den Ursprung an dem Tag nicht
// mehr, bleibt die Kopie als normale einmalige Stunde (false).
function revertMovedLesson(onceId) {
  const once = db.lessonSlots.find(s => s.id === onceId && s.movedFrom);
  if (!once) return false;
  const origin = movedOrigin(once);
  if (!origin) { detachMovedCopy(once); return false; }
  const mine = `${once.id}_${once.specificDate}`;
  const od = db.lessonData[origin.key];
  if (od && od.movedTo && od.movedTo.slotId === once.id) {
    delete od.movedTo; delete od.ausfall;
    if (!Object.keys(od).length) delete db.lessonData[origin.key];
  }
  const md = db.lessonData[mine];
  if (md && !Object.keys(md).length) delete db.lessonData[mine];
  moveLessonEntry(mine, origin.key);
  db.lessonSlots = db.lessonSlots.filter(s => s !== once);
  // Fällige HA/Tests wieder auf den alten Termin
  const ids = new Set(relatedSlots(origin.slot).map(s => s.id));
  Object.entries(db.lessonData).forEach(([key, data]) => {
    if (!ids.has(key.slice(0, key.lastIndexOf('_')))) return;
    [...(data.hwItems || []), ...(data.testItems || [])].forEach(item => {
      if (item.targetDate === once.specificDate && !lessonsOnDate(once.specificDate).some(l => ids.has(l.slot.id) && !l.ausfall)) item.targetDate = origin.date;
    });
  });
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
  if (!entry || ttUndoStack[ttUndoStack.length - 1] !== entry) { showToast('Nicht mehr möglich: Danach wurde schon etwas anderes verschoben', 'error'); return; }
  if (db !== entry.db || scheduleState() !== entry.after) {
    ttUndoStack = [];
    updateTimetableUndoButton();
    showToast('Nicht mehr möglich: Inzwischen wurde etwas geändert', 'error');
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
  const dropPart = target.part || slot.part || 'full';
  if (target.day === slot.day && target.block === slot.block && dropPart === (slot.part || 'full') && target.dateStr === sourceDate) return false;
  // Eine an dem Tag verlegte Stunde („verlegt“, durchgestrichen) belegt ihren Platz nicht mehr (AQ2)
  const movedAwayOn = (s, d) => !!(db.lessonData[`${s.id}_${d}`] || {}).movedTo;
  const occupants = lessonsAt(target.dateStr, target.block).filter(s => s !== slot && partsOverlap(dropPart, s.part) && !movedAwayOn(s, target.dateStr));
  if (occupants.length > 1) { showToast('Dort liegen schon zwei Stunden. Bitte zuerst eine davon verschieben', 'error'); return false; }
  const other = occupants[0] || null;
  // Tauschen heißt: jede Stunde nimmt genau den Platz der anderen, auch die Hälfte (AQ7)
  const part = other ? (other.part || 'full') : dropPart;
  if (other) {
    const back0 = { block: slot.block, part: slot.part || 'full' };
    const third = lessonsAt(sourceDate, back0.block).filter(s => s !== slot && s !== other && partsOverlap(back0.part, s.part) && !movedAwayOn(s, sourceDate));
    if (third.length) { showToast('Am alten Platz liegt noch eine Stunde. Bitte zuerst sie verschieben', 'error'); return false; }
  }
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
  // Verlegte Kopie: vom Ursprung aus neu verlegen, am alten Platz = Verlegung aufheben (AQ2, AQ5). Sonst: Einträge,
  // Planung und am alten Tag fällige HA/Tests wandern mit (AQ8, AQ17).
  let wentHome = false;
  const moveOneOff = (s, to) => {
    if (s.movedFrom) {
      const r = rehomeMovedCopy(s, to);
      if (r === 'home') wentHome = true;
      if (r) return true;
    }
    const oldDate = s.specificDate;
    moveLessonEntry(`${s.id}_${oldDate}`, `${s.id}_${to.dateStr}`);
    Object.assign(s, { day: to.day, block: to.block, part: to.part || s.part || 'full', specificDate: to.dateStr });
    retargetMovedItems(s, oldDate, to.dateStr);
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
    if (ok && other) ok = await place(other, target.dateStr, back, slot);
  } finally {
    currentSpecificDate = prevSpecific;
  }
  if (db !== dbAtStart) return false;
  if (!ok) {
    if (scheduleState() !== before) { restore(); showToast('Nicht verschoben, alles wie vorher', 'error'); }
    return false;
  }
  saveDB();
  renderScheduleViews();
  const entry = { db, before, after: scheduleState() };
  ttUndoStack.push(entry);
  if (ttUndoStack.length > 30) ttUndoStack.shift();
  updateTimetableUndoButton();
  const label = wentHome && !other ? 'Verlegung aufgehoben' : (other ? 'Stunden getauscht' : 'Stunde verschoben') + (scope === 'once' ? ' (nur diese Woche)' : '');
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
      // A/B nur bei echten zweiwöchigen Stunden; eine wöchentliche, die wechselt, gilt wie in Woche A (AQ21)
      .map(x => (isABSlot(x.sl) ? x : { ...x, inB: x.inA }))
      .filter(x => x.inA || x.inB)
      .sort((x, y) => (partOrder[x.sl.part || 'full'] - partOrder[y.sl.part || 'full']) || (Number(y.inA) - Number(x.inA)));
    if (!list.length) return '';
    return `<div class="pt-cell${list.length > 1 ? ' pt-multi' : ''}">${list.map(x => entryHTML(x.sl, tagged(x.inA, x.inB))).join('')}</div>`;
  };
  // Pausenzeilen nur, wo eine regelmäßige Aufsicht liegt (wie im Stundenplan)
  const supCell = (dayIdx, gap) => sups.filter(x => supervisionGap(x, blocks) === gap)
    .map(x => ({ x, inA: slotInRegularPlan(x, weekA[dayIdx]), inB: slotInRegularPlan(x, weekB[dayIdx]) }))
    .map(e => (isABSlot(e.x) ? e : { ...e, inB: e.inA }))   // AQ21
    .filter(e => e.inA || e.inB)
    .map(e => { const tag = tagged(e.inA, e.inB); return `<div class="pt-sup">${tag ? `<i class="pt-tag">${tag}</i>` : ''}${e.x.place ? escHtml(e.x.place) : 'Aufsicht'} <span>${escHtml(e.x.start || '')}–${escHtml(e.x.end || '')}</span></div>`; }).join('');
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
  if (active('view-classes') && !watchPop && classesClockSignature() !== classesClockSig) renderSubjectGroups();   // Restzeit, „jetzt“ (AH14); nie unter der offenen Liste (AH24 f)
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
  refreshSeatingCockpit(); // Inhalt/HA der laufenden Stunde geändert (AD2)
}

// Linien-Icons für die Status-Symbole einer Stunde
const TT_STATUS_ICONS = { inhalt: ICONS.content, hw: ICONS.homework, test: ICONS.test, notiz: ICONS.notes, klasse: ICONS.pin };
const TT_STATUS_TITLES = { inhalt: 'Inhalt', hw: 'Hausaufgabe', test: 'Test angekündigt', notiz: 'Notiz', klasse: 'Klassennotiz' };
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
    // Klassennotiz (AD15): nur Symbol, Text im Stunden-Fenster; vergangene Stunden brauchen keinen Hinweis
    if (lesson.groupId && dateStr >= clock.todayStr && activeClassNotes(db.groups.find(g => g.id === lesson.groupId), dateStr).length) status.push('klasse');

    // Klasse groß, Fach (+ Raum) klein; ohne Klasse ist das Fach der Titel.
    // Raum als eigener Teil: in ganzen Stunden eigene Zeile, in halben mit „·“ dahinter (BUGS I6)
    const t = lessonTitle(lesson);
    const sub = (t.sub ? `<span>${escHtml(t.sub)}</span>` : '') +
                (lesson.room ? `<span class="tt-lesson-room">${escHtml(lesson.room)}</span>` : '');

    const range = lessonTimeRange(block, lessonPartIn(block, lesson, lessons.length));
    const running = !isAusfall && dateStr === clock.todayStr && range &&
      range.start <= clock.nowMins && clock.nowMins < range.end;
    const isNext = !running && clock.next && clock.next.slot.id === lesson.id && clock.next.dateStr === dateStr;
    const badge = running ? `<span class="tt-lesson-badge" title="läuft noch ${range.end - clock.nowMins} min"><span class="tt-noch">noch </span>${range.end - clock.nowMins} min</span>`
                : isNext ? `<span class="tt-lesson-badge">als Nächstes</span>` : '';

    const ttName = lessonTitle(lesson);   // Name für Tastatur und VoiceOver (X3, Regel 55)
    return `<div class="tt-lesson${isAusfall?' ausfall-lesson':''}${running?' running':''}${isNext?' next':''}" role="button" tabindex="0"
           aria-label="${escHtml([ttName.main, ttName.sub, formatWeekdayShort(dateStr), block.label, isAusfall ? 'fällt aus' : ''].filter(Boolean).join(', '))}"
           style="--lesson-color:${escHtml(safeColor(lesson.color))}"
           data-slot="${escHtml(lesson.id)}" data-date="${escHtml(dateStr)}"
           onclick="${timetableEditMode ? 'openEditLessonFor' : 'openLessonDetail'}(${jsArg(lesson.id)},${jsArg(dateStr)})">
        <div class="tt-lesson-head">
          <div class="tt-lesson-class" title="${escHtml(t.main)}">${escHtml(t.main)}</div>
          ${sub ? `<div class="tt-lesson-subject">${sub}</div>` : ''}
          ${kind ? `<div class="tt-lesson-kind${lesson.substitute ? ' sub' : ''}">${kind}</div>` : ''}
        </div>
        ${badge || status.length ? `<div class="tt-lesson-foot">${badge}<span class="tt-status-row">${status.map(ttStatusIcon).join('')}</span></div>` : ''}
      </div>`;
  };

  const renderEmptyHTML = (part) => {
    return `<div class="tt-empty-cell" role="button" tabindex="0" aria-label="${DAYS[dayIdx]}, ${escHtml(block.label)}: Stunde hinzufügen" title="${DAYS[dayIdx]}, ${escHtml(block.label)}: Stunde hinzufügen"
                 onclick="openAddLessonSlot(${dayIdx}, ${jsArg(block.num)}, ${jsArg(dateStr)}, ${jsArg(part)})">
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
  sel.innerHTML = '<option value="">Ohne Klasse (freie Eingabe)</option>';
  db.groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.className} · ${g.subject}${g.year ? ' (' + g.year + ')' : ''}`;
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
function openAddLessonSlot(preDay = null, preBlock = null, specificDateStr = null, part = 'full', { substitute = false } = {}) {
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
  // Vertretung schon vor dem Sperren der Hälften und vor openModal (AQ11): sonst ist die eigene Hälfte „belegt“,
  // die andere wird angehakt, und der Stand beim Öffnen gilt danach als Eingabe
  document.getElementById('new-lesson-recurring').value = substitute ? 'substitute' : 'weekly';
  if (substitute) document.getElementById('add-lesson-title').textContent = 'Vertretung eintragen';
  selectedLessonColor = APP_COLORS[0];
  renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });
  updateLessonDateHint();
  if (substitute) {
    const own = [...document.getElementsByName('new-lesson-part')].find(r => r.value === part);
    if (own && !own.disabled) { own.checked = true; updateLessonPartVisibility(part); }
  }
  openModal('modal-add-lesson');
  setTimeout(() => document.getElementById('new-lesson-subject').focus(), 80);
}

// Stunden-Fenster → „Vertretung“: einmalige Stunde im selben Platz am selben Tag, ersetzt dort diese (BUGS AA3)
function openSubstituteForLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !activeLessonDate) return;
  const dateStr = activeLessonDate;
  leaveLessonModal();
  openAddLessonSlot(slot.day, slot.block, dateStr, slot.part || 'full', { substitute: true });
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
  // Verlegte Kopie mit neuem Platz oder Datum: vom Ursprung aus neu verlegen, nie eine zweite Kopie (Regel 65, AQ5)
  if (slot && slot.movedFrom && isOneOffSlot(slot) && !recurring
      && (specificDate !== slot.specificDate || block !== slot.block || part !== (slot.part || 'full'))) {
    const moved = rehomeMovedCopy(slot, { day, block, part, dateStr: specificDate }, { subject, groupId, room, color: input.color, part });
    if (moved) {
      saveDB();
      closeModal('modal-add-lesson');
      renderScheduleViews();
      editingSlotId = null;
      showToast(moved === 'home' ? 'Verlegung aufgehoben' : 'Stunde gespeichert ✓');
      return true;
    }
  }
  // Alle ersetzten Stunden, auch beide Hälften eines Blocks (AQ12)
  const replacedAll = isOneOffSlot(candidate) ? db.lessonSlots.filter(s => s !== slot && !isOneOffSlot(s)
    && s.block === block && slotOccursOn(s, specificDate) && partsOverlap(part, s.part)) : [];
  const replaced = replacedAll[0] || null;
  // Vertretung über schon vorbereiteten Notizen: die wären bis zum Löschen der Vertretung unsichtbar (BUGS V6)
  const withNotes = replacedAll.filter(r => lessonEntryDates(r.id).includes(specificDate));
  if (withNotes.length
      && !confirm(`Für ${withNotes.map(r => lessonTitle(r).main).join(' und ')} am ${formatDateLong(specificDate)} gibt es schon Notizen oder Hausaufgaben. `
        + 'Solange die Vertretung dort liegt, sind sie nicht zu sehen (sie bleiben aber gespeichert).\n\nVertretung trotzdem anlegen?')) return false;
  // Mit dem eigenen Beginn der Stunde: Eine Nachfolgerin, die erst nach der beendeten beginnt, überschneidet
  // sich nie mit ihr und darf weiter bearbeitet werden (Nachtrag BUGS V1)
  // Ohne Terminänderung (nur Raum, Farbe …) nie: Altdaten aus V1 ließen sich sonst gar nicht mehr speichern (Y14)
  // scheduleChanged statt changesSchedule: Eine einmalige Stunde, die regelmäßig wird, ändert ihren Termin (AQ20)
  const endedHere = !isOneOffSlot(candidate) && !splitFrom && !(slot && !scheduleChanged(slot, fields)) && db.lessonSlots.find(s => s !== slot && endedBefore(s)
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
  const slotBefore = slot ? { ...slot } : null;   // alte Klasse für „hängende“ HA (AQ9)

  if (slot && splitFrom) {
    retargetDueItems(slot, fields, splitFrom);
    splitSlotFrom(slot, splitFrom, fields);
    showToast(`Stunde ${fromPhrase(splitFrom)} geändert ✓`);
  } else if (slot) {
    if (day !== slot.day) {
      retargetDueItems(slot, fields, null);
      moveLessonData(slot.id, day - slot.day);
    }
    if (slot.movedFrom && recurring) detachMovedCopy(slot);   // verlegte Kopie wird regelmäßig: kein Verweis mehr (AQ6)
    Object.assign(slot, fields);
    if (!fields.substitute) delete slot.substitute; // auf „Nur einmalig“/regelmäßig umgestellt
    if (candidate.validFrom && !slot.validFrom) slot.validFrom = candidate.validFrom; // BUGS V1
    showToast('Stunde gespeichert ✓');
  } else {
    const newSlot = { id: uid(), ...fields };
    if (candidate.validFrom) newSlot.validFrom = candidate.validFrom;
    db.lessonSlots.push(newSlot);
    const added = fields.substitute ? 'Vertretung eingetragen ✓' : 'Stunde hinzugefügt ✓';
    showToast(replaced ? `${added.replace(' ✓', '')}, ersetzt ${replacedAll.map(r => lessonTitle(r).main).join(' und ')} an diesem Tag ✓` : added);
  }
  refreshMovedFrom();   // Verweise verlegter Kopien folgen ihrem Ursprung (AQ4)
  saveDB();
  for (const r of replacedAll) {   // BUGS R4, für jede ersetzte Stunde (AQ12)
    if (!(await offerMoveDueItems(r.id, specificDate, `${lessonTitle(r).main} fällt aus`))) break;
  }
  closeModal('modal-add-lesson');
  renderScheduleViews();
  editingSlotId = null;
  if (dueBefore.length) await offerRetargetHanging(dueBefore, slotBefore);
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
  // Altdaten: „jede Woche“ als true oder ohne Feld – wie 'weekly' (AQ19)
  const rec = s => isOneOffSlot(s) ? 'none' : s.recurring === 'biweekly' ? 'biweekly' : 'weekly';
  // Andere Klasse (bei freien Stunden: anderes Fach) ist ein Stundenplanwechsel wie ein anderer Tag (AQ9):
  // frühere Stunden, ihr Inhalt und ihre HA gehören weiter der alten Klasse
  const owner = s => s.groupId ? 'g:' + s.groupId : 's:' + String(s.subject || '').trim().toLowerCase();
  return slot.day !== f.day || slot.block !== f.block || (slot.part || 'full') !== f.part || rec(slot) !== rec(f) || owner(slot) !== owner(f)
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
// Neues Datum eines Eintrags, wenn die Stunde um `shift` Tage wandert. Beim Teilen ab `from` nie davor:
// Fr → Mo ab Mittwoch heißt nächster Montag, nicht der vergangene.
function shiftedEntryDate(dateStr, shift, from) {
  let d = addDays(parseDate(dateStr), shift);
  while (from && formatDate(d) < from) d = addDays(d, 7);
  return formatDate(d);
}
// Stundenplanwechsel „ab …“: ALLE Einträge ab dann wandern um denselben Abstand, und zwar so, dass der erste Termin
// der alten Stunde ab `from` auf den ersten Termin der neuen Stunde ab `from` fällt. Einzeln „−4 Tage, sonst +7“
// legte zwei Freitage auf denselben Montag, einer war danach weg (AQ1).
function splitShift(slot, newDay, from) {
  let shift = newDay - slot.day;
  let first = parseDate(from);
  while (first.getDay() !== (slot.day + 1) % 7) first = addDays(first, 1);   // 0 = Mo … 4 = Fr
  if (formatDate(addDays(first, shift)) < from) shift += 7;
  return shift;
}
// Tage mit Einträgen, die nach der Änderung auf keinen Termin der Stunde mehr fallen (BUGS R10)
function orphanedEntryDates(slot, fields, splitFrom) {
  const shift = fields.day - slot.day;
  const after = { ...slot, ...fields, validFrom: splitFrom || slot.validFrom, validUntil: splitFrom ? undefined : slot.validUntil };
  const sShift = splitFrom ? splitShift(slot, fields.day, splitFrom) : shift;
  return lessonEntryDates(slot.id).filter(d => !splitFrom || d >= splitFrom)
    .map(d => shiftedEntryDate(d, sShift, null))
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
      if (splitFrom) {   // derselbe Abstand wie die Einträge (AQ1), aber nie vor den Tag nach der Aufgabe
        let d = shiftedEntryDate(t, splitShift(slot, fields.day, splitFrom), null);
        while (d < givenAfter) d = formatDate(addDays(parseDate(d), 7));
        item.targetDate = d;
        return;
      }
      const notBefore = t >= today ? (givenAfter > today ? givenAfter : today) : null;
      item.targetDate = shiftedEntryDate(t, shift, notBefore);
    });
  });
}

// Stunde ab einem Tag ändern: alte endet davor, neue beginnt dort; Einträge ab dann ziehen um (BUGS M7, R1)
function splitSlotFrom(slot, fromDateStr, fields) {
  // splitFrom: Der Abgleich ordnet Einträge des anderen Geräts eindeutig der richtigen neuen Stunde zu (AP7)
  const newSlot = { ...slot, ...fields, id: uid(), validFrom: fromDateStr, splitFrom: slot.id };
  slot.validUntil = formatDate(addDays(parseDate(fromDateStr), -1));
  const shift = fields.day !== undefined && fields.day !== slot.day ? splitShift(slot, fields.day, fromDateStr) : 0;
  const prefix = slot.id + '_';
  // Nie überschreiben: Fällt doch einmal etwas zusammen, wird zusammengelegt (moveLessonEntry, AQ1)
  Object.keys(db.lessonData).filter(k => k.startsWith(prefix) && k.slice(prefix.length) >= fromDateStr).forEach(k => {
    moveLessonEntry(k, newSlot.id + '_' + shiftedEntryDate(k.slice(prefix.length), shift, null));
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
  const map = new Map();
  entries.forEach(([k, data]) => {
    const nk = prefix + formatDate(addDays(parseDate(k.slice(prefix.length)), dayShift));
    db.lessonData[nk] = data;
    map.set(k, nk);
  });
  // Planung zieht mit, in einem Durchgang (sonst liefe a→b→c in einer Kette, AQ17)
  db.groups.forEach(g => groupPlan(g).forEach(t => {
    if (Array.isArray(t.doneLessons)) t.doneLessons = t.doneLessons.map(k => map.get(k) || k);
    if (t.pinnedSlot === slotId && t.pinned) {
      const nk = map.get(`${slotId}_${t.pinned}`) || `${slotId}_${formatDate(addDays(parseDate(t.pinned), dayShift))}`;
      t.pinned = nk.slice(nk.lastIndexOf('_') + 1);
    }
  }));
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
  // Ohne Ursprung (beendet, gelöscht) oder regelmäßig gewordene Kopie: normale Stunde, normales Löschen (AQ6, AQ13)
  if (slot.movedFrom && !movedOrigin(slot)) detachMovedCopy(slot);
  if (slot.movedFrom) {
    // „nur diese Woche“ verlegt: löschen = Verlegung aufheben, Notizen wandern zurück (nicht gelöscht)
    if (!confirm(`Verlegung aufheben?\n\nDie Stunde findet dann wieder am ${formatDateLong(movedOrigin(slot).date)} statt; Notizen und Hausaufgaben wandern zurück.`)) return;
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
  // „Nur an einem Tag“ verlegte Stunden im betroffenen Zeitraum bleiben als normale einmalige Stunden (AQ13)
  db.lessonSlots.filter(c => c.movedFrom).forEach(c => {
    const o = movedOrigin(c);
    if (o && o.slot === slot && (choice === 'all' || o.date >= weekStart)) detachMovedCopy(c);
  });
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

// ── Stundenplan: Woche · Tag · Klasse ──
let timetableClassGroupId = null;
let ttClassShowPast = false;
function setTimetableMode(mode) {
  timetableMode = ['week', 'day', 'class'].includes(mode) ? mode : 'week';
  try { localStorage.setItem('tt_mode', timetableMode); } catch (e) { /* privat: nur für diese Sitzung */ }
  if (timetableMode === 'class' && timetableEditMode) setTimetableEditUI(false);
  renderTimetable();
}
function updateTimetableModeUI() {
  document.querySelectorAll('#tt-mode button').forEach(b => {
    const on = b.dataset.mode === (timetableMode === 'week' && window.innerWidth < DAY_VIEW_MAX_WIDTH ? 'day' : timetableMode);
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const cls = timetableMode === 'class';
  document.getElementById('view-timetable').classList.toggle('tt-class-mode', cls);
  const compact = document.getElementById('btn-tt-classmode'); // Handy: ein Knopf statt Woche · Tag · Klasse
  if (compact) { compact.classList.toggle('active', cls); compact.setAttribute('aria-pressed', cls ? 'true' : 'false'); }
}
function renderTimetableClass(grid) {
  const groups = db.groups.slice().sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || (a.className || '').localeCompare(b.className || '', undefined, { numeric: true }));
  grid.innerHTML = '';
  grid.removeAttribute('style');
  grid.className = 'timetable-grid tt-class-list';
  const wrap = grid.parentElement;
  wrap.classList.remove('tt-compact-wrap');
  wrap.style.overflow = 'auto';
  if (!groups.length) { grid.innerHTML = '<div class="empty-state"><div class="empty-state-title">Noch keine Klassen</div></div>'; return; }
  if (!groups.some(g => g.id === timetableClassGroupId)) timetableClassGroupId = getSuggestedSeatingGroupId() || groups[0].id;
  const g = groups.find(x => x.id === timetableClassGroupId);
  const todayStr = formatDate(new Date());
  const { halfYearEnd, yearEnd } = schoolYearMarks(todayStr);
  const { byKey, until } = planAssignments(g, todayStr);
  const past = groupLessons(g.id, formatDate(addDays(parseDate(todayStr), -120)), formatDate(addDays(parseDate(todayStr), -1)));
  const future = groupLessons(g.id, todayStr, until);
  const counts = [];
  if (halfYearEnd) counts.push(`<b>${countLessons(g.id, todayStr, halfYearEnd)}</b> Stunden bis zum Halbjahr`);
  if (yearEnd) counts.push(`<b>${countLessons(g.id, todayStr, yearEnd)}</b> bis Schuljahresende`);
  const head = `<div class="ttc-head">
      <select id="ttc-group" class="form-input ttc-select" aria-label="Klasse">${groups.map(x => `<option value="${escHtml(x.id)}"${x.id === g.id ? ' selected' : ''}>${escHtml(x.className)} ${escHtml(x.subject || '')}</option>`).join('')}</select>
      <span class="ttc-counts">${counts.length ? 'Noch ' + counts.join(' · ') : 'Halbjahr/Schuljahresende in den Einstellungen eintragen'}</span>
      <button type="button" class="btn-secondary ttc-plan-btn" data-act="plan">${icon('list')}<span>Planung</span></button>
    </div>`;
  let lastWeek = '';
  const row = (l, isPast) => {
    const key = lessonKeyOf(l);
    const wk = formatDate(mondayOf(parseDate(l.dateStr)));
    const kw = wk !== lastWeek ? `<small class="ttc-kw">KW ${getWeekNumber(parseDate(l.dateStr))}</small>` : '';
    lastWeek = wk;
    const data = db.lessonData[key] || {};
    const doneT = topicDoneIn(g, key);
    const a = byKey.get(key);
    let topic;
    if (l.ausfall) topic = '<span class="ttc-muted">fällt aus</span>';
    else if (doneT) topic = `<span class="ttc-done">✓ ${escHtml(doneT.title)}</span>`;
    else if (isPast) topic = data.done ? escHtml(firstLine(data.done)) : '<span class="ttc-muted">–</span>';
    else if (a) topic = `${escHtml(a.topic.title)}${a.of > 1 ? ` <small>(${a.unit}/${a.of})</small>` : ''}`;
    else topic = '<button type="button" class="btn-secondary ttc-add-btn" data-act="add">+ Thema</button>'; // Kasten statt Link: gut zu treffen
    const hasAdd = topic.includes('data-act="add"');   // Knopf im Knopf: Zeile dann ohne role, Datum ist der Knopf (AQ22, AH14)
    const due = !isPast ? dueItemsFor(l.slot.id, l.dateStr) : { hw: [], tests: [] };
    const badges = (due.hw.length ? `<span class="dash-badge hw">HA</span>` : '') + (due.tests.length ? `<span class="dash-badge test">Test</span>` : '');
    const label = escHtml(formatWeekdayShort(l.dateStr) + ', ' + l.block.label);
    return `<div class="ttc-row${isPast ? ' is-past' : ''}${l.dateStr === todayStr ? ' is-today' : ''}${l.ausfall ? ' is-off' : ''}"${hasAdd ? '' : ` role="button" tabindex="0" aria-label="${label}"`}
        data-slot="${escHtml(l.slot.id)}" data-date="${escHtml(l.dateStr)}">
        ${hasAdd ? `<button type="button" class="ttc-date ttc-open" aria-label="${label}">` : '<span class="ttc-date">'}${escHtml(formatWeekdayShort(l.dateStr))}${kw}${hasAdd ? '</button>' : '</span>'}<span class="ttc-block">${escHtml(l.block.label)}</span>
        <span class="ttc-topic">${topic}</span><span class="ttc-badges">${badges}</span></div>`;
  };
  let html = head;
  // Monats-Überschriften zur Orientierung beim Scrollen
  let lastMonth = '';
  const month = l => {
    const m = l.dateStr.slice(0, 7);
    if (m === lastMonth) return '';
    lastMonth = m;
    return `<div class="ttc-month">${escHtml(parseDate(l.dateStr).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }))}</div>`;
  };
  if (past.length) {
    html += `<button type="button" class="link-btn ttc-past-toggle" data-act="past">${ttClassShowPast ? 'Frühere Stunden ausblenden' : `Frühere Stunden anzeigen (${past.length})`}</button>`;
    if (ttClassShowPast) html += past.map(l => month(l) + row(l, true)).join('');
  }
  let marked = false;
  future.forEach(l => {
    if (!marked && halfYearEnd && l.dateStr > halfYearEnd) { html += `<div class="ttc-mark">Halbjahr · ${escHtml(formatDateDE(parseDate(halfYearEnd)))}</div>`; marked = true; }
    html += month(l) + row(l, false);
  });
  if (!future.length) html += '<div class="plan-empty">Keine kommenden Stunden im Stundenplan.</div>';
  grid.innerHTML = html;
  const sel = grid.querySelector('#ttc-group');
  sel.addEventListener('change', e => { timetableClassGroupId = e.target.value; renderTimetable(); });
  makeCustomFormDropdown(sel);   // sieht aus wie die anderen Auswahllisten (Pfeil), sonst kaum als Auswahl erkennbar
  grid.querySelector('[data-act="plan"]').addEventListener('click', () => openPlanForGroup(g.id));
  const pastBtn = grid.querySelector('[data-act="past"]');
  if (pastBtn) pastBtn.addEventListener('click', () => { ttClassShowPast = !ttClassShowPast; renderTimetable(); });
  grid.querySelectorAll('.ttc-row').forEach(r => r.addEventListener('click', e => {
    if (e.target.closest('[data-act="add"]')) { e.stopPropagation(); openPlanTopicForm(g.id, null); return; }
    openLessonDetail(r.dataset.slot, r.dataset.date);
  }));
}
// Tagesansicht: geplantes bzw. behandeltes Thema in der Kachel (rechts, wo Platz ist)
// Tagesansicht: Thema und Notizen rechts in der Kachel (AD3, AD16)
function addTopicsToDayTiles(grid) {
  const todayStr = formatDate(new Date());
  const cache = new Map();
  grid.querySelectorAll('.tt-lesson[data-slot][data-date]').forEach(tile => {
    const slot = db.lessonSlots.find(s => s.id === tile.dataset.slot);
    const g = slot && slot.groupId && db.groups.find(x => x.id === slot.groupId);
    const key = tile.dataset.slot + '_' + tile.dataset.date;
    let text = '';
    if (g) {
      const doneT = topicDoneIn(g, key);
      if (doneT) text = '✓ ' + doneT.title;
      else if (tile.dataset.date >= todayStr) {
        if (!cache.has(g.id)) cache.set(g.id, planAssignments(g, todayStr).byKey);
        const a = cache.get(g.id).get(key);
        if (a) text = a.topic.title;
      }
    }
    if (!text) text = firstLine((db.lessonData[key] || {}).done);
    // Darunter die Notizen ausgeschrieben (AD16): Klassennotizen (ab heute) und erste Zeile der Stunden-Notiz
    const notes = [];
    const cNotes = g && tile.dataset.date >= todayStr ? activeClassNotes(g, tile.dataset.date) : [];
    if (cNotes.length) notes.push([icon('pin'), cNotes.map(n => n.text.trim()).join(' · ')]);
    const lessonNote = firstLine((db.lessonData[key] || {}).notes);
    if (lessonNote) notes.push([icon('notes'), lessonNote]);
    if (!text && !notes.length) return;
    tile.insertAdjacentHTML('beforeend', `<div class="tt-lesson-side">${text ? `<div class="tt-lesson-topic">${escHtml(text)}</div>` : ''}${notes.length
      ? `<div class="tt-lesson-notes">${notes.map(([ico, t]) => `<span class="tt-note-part">${ico}<span>${escHtml(t)}</span></span>`).join('')}</div>` : ''}</div>`);
    if (notes.length) tile.classList.add('has-side-notes');
  });
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
    if (recurring === 'biweekly') { fields.startDate = date; fields.validFrom = date; }   // „Erstmals am“ heißt: vorher nicht (AQ29)
    else fields.specificDate = date;
  }
  if (!Array.isArray(db.supervisions)) db.supervisions = [];
  if (editingSupervision) {
    if (!db.supervisions.includes(editingSupervision)) { showToast('Diese Aufsicht gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
    delete editingSupervision.startDate; delete editingSupervision.specificDate; delete editingSupervision.validFrom;
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

// ▸ Sitzplan: Raster, Leiste (Cockpit), Notenrunde, Zufall und Gruppen, Timer
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


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
// ─── Resize Observer for Smart Fit ────────────────────────────────────────
let seatingResizeTimeout;


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

// ▸ Unterrichtsplanung und Thema der Stunde
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.

// Thema der Unterrichtsplanung für eine Stunde (heute oder später): erledigt oder geplant, mit „Stunde n von m“ (AI1).
// Die Leiste zeichnet alle 5 s neu: die Verteilung nur neu rechnen, wenn sich Daten oder Tag geändert haben.
let planCache = { db: null, stamp: null, day: '', byGroup: new Map() };
function cachedPlanAssignments(g, todayStr = formatDate(new Date())) {
  if (planCache.db !== db || planCache.stamp !== db.settings.lastModified || planCache.day !== todayStr) {
    planCache = { db, stamp: db.settings.lastModified, day: todayStr, byGroup: new Map() };
  }
  if (!planCache.byGroup.has(g.id)) planCache.byGroup.set(g.id, planAssignments(g, todayStr).byKey);
  return planCache.byGroup.get(g.id);
}
function plannedTopicOf(groupId, lesson, todayStr = formatDate(new Date())) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !lesson) return null;
  const key = lessonKeyOf(lesson);
  const doneT = topicDoneIn(g, key);
  if (doneT) return { topic: doneT, done: true, unit: doneT.doneLessons.indexOf(key) + 1, of: topicLength(doneT) };
  if (lesson.dateStr < todayStr) return null;
  const a = cachedPlanAssignments(g, todayStr).get(key);
  return a ? { topic: a.topic, done: false, unit: a.unit, of: a.of } : null;
}
// ─── Fenster „Thema der Stunde“ aus der Sitzplan-Leiste (AI2) ──────────────
// Letzte Stunde (Unterrichtsinhalt), Thema dieser Stunde (Planung, wie die Thema-Karte im Stunden-Fenster) und ihr
// Unterrichtsinhalt – alles änderbar. Schließen übernimmt Eingetipptes (Regel 27), gespeichert wird nur bei Änderung.
let lessonTopicCtx = null;   // { slotId, dateStr, groupId, prevKey, shownPrev, shownDone }
let lessonTopicShown = null; // wie lessonPlanShown, für commitLessonTopic
function openLessonTopic() {
  if (!cockpitLesson) return;
  const slot = db.lessonSlots.find(x => x.id === cockpitLesson.slotId);
  const g = slot && db.groups.find(x => x.id === slot.groupId);
  if (!slot || !g) return;
  const dateStr = cockpitLesson.dateStr;
  const own = lessonsOnDate(dateStr).find(l => l.slot.id === slot.id);
  const prev = previousLessonOfGroup(g.id, dateStr, own && own.range ? own.range.start : 0);
  const prevKey = prev ? lessonKeyOf(prev) : null;
  const key = slot.id + '_' + dateStr;
  lessonTopicCtx = { slotId: slot.id, dateStr, groupId: g.id, prevKey,
    shownPrev: prevKey ? String((db.lessonData[prevKey] || {}).done || '') : '',
    shownDone: String((db.lessonData[key] || {}).done || '') };
  const title = lessonTitle(slot);
  const today = dateStr === formatDate(new Date());
  document.getElementById('lesson-topic-title').textContent = `Thema · ${title.main}${title.sub ? ' ' + title.sub : ''}`;
  document.getElementById('lt-prev-group').classList.toggle('hidden', !prevKey);
  document.getElementById('lt-prev-label').textContent = prev ? `Letzte Stunde · ${formatWeekdayShort(prev.dateStr)}` : 'Letzte Stunde';
  document.getElementById('lt-prev-done').value = lessonTopicCtx.shownPrev;
  document.getElementById('lt-this-label').textContent = `${today ? 'Diese Stunde' : formatWeekdayShort(dateStr)}${own ? ' · ' + own.block.label : ''}`;
  document.getElementById('lt-done').value = lessonTopicCtx.shownDone;
  renderLessonTopicRow();
  openModal('modal-lesson-topic');
}
// Zeile „Thema“ (geplant/erledigt) neu zeichnen; die Textfelder darunter bleiben, wie sie sind
function renderLessonTopicRow() {
  const ctx = lessonTopicCtx;
  const slot = ctx && db.lessonSlots.find(x => x.id === ctx.slotId);
  if (!slot) return;
  const p = plannedTopicOf(ctx.groupId, { slot, dateStr: ctx.dateStr });
  const t = p ? p.topic : null;
  const done = !!(p && p.done);
  // Vergangene Stunde ohne erledigtes Thema: kein Planungsfeld wie im Stunden-Fenster (AQ16) – ein fester Termin in
  // der Vergangenheit rutschte sonst still in die nächste Stunde. Was dran war, gehört unter „Unterrichtsinhalt“.
  const past = !done && ctx.dateStr < formatDate(new Date());
  lessonTopicShown = done || past ? null : { slotId: slot.id, dateStr: ctx.dateStr, groupId: ctx.groupId, topic: t };
  document.getElementById('lt-topic-label').textContent = `${done ? 'Erledigt' : t ? 'Geplant' : 'Thema'}${t && topicLength(t) > 1 ? ` · Stunde ${p.unit} von ${p.of}` : ''}`;
  document.querySelector('.lt-topic-row').classList.toggle('hidden', past);
  const input = document.getElementById('lt-topic');
  input.value = t ? normTopicTitle(t.title) : '';
  input.disabled = done || past;
  const btn = document.getElementById('lt-topic-done');
  btn.disabled = past;
  btn.textContent = done ? '✓ Erledigt' : 'Erledigt';
  btn.className = done ? 'btn-secondary' : 'btn-primary';
  btn.setAttribute('aria-pressed', done ? 'true' : 'false');
  const note = document.getElementById('lt-topic-note');
  note.textContent = past ? 'Vergangene Stunde: Was dran war, unten unter „Unterrichtsinhalt“ eintragen.' : t && t.note ? t.note : '';
  note.classList.toggle('hidden', !past && !(t && t.note));
}
const refreshLessonTopicRow = () => { if (!document.getElementById('modal-lesson-topic').classList.contains('hidden')) renderLessonTopicRow(); };
// „Erledigt“: Thema übernehmen (neu oder geändert → geplant für diese Stunde), dann als erledigt markieren bzw. zurücknehmen
function lessonTopicDone() {
  const ctx = lessonTopicCtx;
  const slot = ctx && db.lessonSlots.find(x => x.id === ctx.slotId);
  if (!slot) return;
  const p = plannedTopicOf(ctx.groupId, { slot, dateStr: ctx.dateStr });
  if (!(p && p.done) && !lessonTopicShown) return;   // vergangene Stunde (AQ16)
  const topic = p && p.done ? p.topic : commitLessonTopic('lt-topic', lessonTopicShown, refreshLessonTopicRow);
  if (!topic) { if (!document.getElementById('lt-topic').value.trim()) showToast('Bitte zuerst ein Thema eintragen', 'error'); return; }
  toggleLessonTopicDone(slot, ctx.dateStr, topic, 'lt-done', renderLessonTopicRow);
}
// Eingetipptes übernehmen (Schließen, „Ganze Planung“, App verlassen); speichert nur bei Änderungen
function storeLessonTopicForm() {
  const ctx = lessonTopicCtx;
  if (!ctx) return;
  if (lessonTopicShown && !document.getElementById('lt-topic').disabled) commitLessonTopic('lt-topic', lessonTopicShown, refreshLessonTopicRow);
  const prevText = document.getElementById('lt-prev-done').value;
  const doneText = document.getElementById('lt-done').value;
  let changed = false;
  const write = (key, text, shown) => {
    if (!key || text === shown) return;
    if (!db.lessonData[key]) { if (!text) return; db.lessonData[key] = {}; }
    db.lessonData[key].done = text;
    changed = true;
  };
  write(ctx.prevKey, prevText, ctx.shownPrev);
  write(ctx.slotId + '_' + ctx.dateStr, doneText, ctx.shownDone);
  if (!changed) return;
  ctx.shownPrev = prevText; ctx.shownDone = doneText;   // gespeicherter Stand = neuer Vergleichsstand (Fenster kann offen bleiben)
  saveDB();
  renderScheduleViews();
  refreshSeatingCockpit();
}
function closeLessonTopic() {
  storeLessonTopicForm();
  closeModal('modal-lesson-topic');
  lessonTopicCtx = null;
  lessonTopicShown = null;
}
function openLessonTopicPlan() {
  const groupId = lessonTopicCtx && lessonTopicCtx.groupId;
  closeLessonTopic();
  if (groupId && db.groups.some(g => g.id === groupId)) openPlanForGroup(groupId);
}
function groupPlan(g) { return g && Array.isArray(g.plan) ? g.plan.filter(t => t && typeof t === 'object') : []; }
function ensurePlan(g) { if (!Array.isArray(g.plan)) g.plan = []; return g.plan; }
const topicLength = t => Math.max(1, Math.min(40, parseInt(t.lessons) || 1));
const topicDoneCount = t => Array.isArray(t.doneLessons) ? t.doneLessons.length : 0;
const lessonKeyOf = l => l.slot.id + '_' + l.dateStr;
// Verteilung ab heute: feste Termine zuerst, dann die Reihe nach. Stunden, in denen etwas erledigt wurde, sind belegt.
function planAssignments(g, todayStr = formatDate(new Date())) {
  const plan = groupPlan(g);
  const { yearEnd } = schoolYearMarks(todayStr);
  const until = yearEnd || formatDate(addDays(parseDate(todayStr), 365));
  const consumed = new Set(plan.flatMap(t => Array.isArray(t.doneLessons) ? t.doneLessons : []));
  const allLessons = groupLessons(g.id, todayStr, until);
  const lessons = allLessons.filter(l => !l.ausfall && !consumed.has(lessonKeyOf(l)));
  const byKey = new Map(), firstDate = new Map();
  const take = (t, list) => {
    let n = topicLength(t) - topicDoneCount(t), unit = topicDoneCount(t);
    for (const l of list) {
      if (n <= 0) break;
      const key = lessonKeyOf(l);
      if (byKey.has(key)) continue;
      byKey.set(key, { topic: t, unit: ++unit, of: topicLength(t) });
      if (!firstDate.has(t)) firstDate.set(t, l);
      n--;
    }
    return n <= 0;
  };
  const open = plan.filter(t => !t.done);
  const overflow = [];
  // Feste Termine: der späteste zuerst, damit ein früherer, mehrstündiger Termin einen späteren nicht verdrängt (AH54).
  // Ein im Stunden-Fenster eingetipptes Thema nimmt genau seine Stunde, falls sie stattfindet.
  // Verrutschte Termine (Tag vorbei oder ihre Stunde fällt aus) danach in ihrer eigenen Reihenfolge, frühester zuerst:
  // sonst kämen zwei ausgefallene Themen vertauscht (AQ15, Entscheidung AH54 „rutscht zur nächsten Stunde“).
  const ownLesson = t => l => l.dateStr === t.pinned && (!t.pinnedSlot || l.slot.id === t.pinnedSlot);
  const slipped = t => t.pinned < todayStr || (!lessons.some(ownLesson(t)) && allLessons.some(ownLesson(t)));
  const pinned = open.filter(t => isDateStr(t.pinned));
  const pinnedFirst = [
    ...pinned.filter(t => !slipped(t)).sort((a, b) => b.pinned.localeCompare(a.pinned) || (b.pinnedSlot ? 1 : 0) - (a.pinnedSlot ? 1 : 0)),
    ...pinned.filter(slipped).sort((a, b) => a.pinned.localeCompare(b.pinned)),
  ];
  // Eingetipptes Thema (pinnedSlot): nie in eine frühere Stunde desselben Tages (AQ25)
  const startOf = l => (l.range && Number.isFinite(l.range.start) ? l.range.start : 0);
  pinnedFirst.forEach(t => {
    const own = t.pinnedSlot ? allLessons.find(l => l.dateStr === t.pinned && l.slot.id === t.pinnedSlot) : null;
    const from = lessons.filter(l => l.dateStr > t.pinned || (l.dateStr === t.pinned && !(own && startOf(l) < startOf(own))));
    const exact = t.pinnedSlot ? from.findIndex(l => l.dateStr === t.pinned && l.slot.id === t.pinnedSlot) : -1;
    if (exact > 0) from.unshift(from.splice(exact, 1)[0]);
    if (!take(t, from)) overflow.push(t);
  });
  open.filter(t => !isDateStr(t.pinned)).forEach(t => { if (!take(t, lessons)) overflow.push(t); });
  return { byKey, firstDate, overflow, until };
}
// Thema, das in dieser Stunde erledigt wurde (für vergangene Stunden und den Haken)
function topicDoneIn(g, key) { return groupPlan(g).find(t => Array.isArray(t.doneLessons) && t.doneLessons.includes(key)) || null; }
function countLessons(groupId, fromStr, untilStr) {
  return untilStr ? groupLessons(groupId, fromStr, untilStr).filter(l => !l.ausfall).length : null;
}

// ── Tab „Planung“ in der Klassenansicht ──
let planShowDone = false; // Ansichtszustand (Regel 19)
function renderPlanTab() {
  const content = document.getElementById('overview-content');
  const g = db.groups.find(x => x.id === currentOverviewGroupId);
  if (!content || !g) return;
  const todayStr = formatDate(new Date());
  const plan = groupPlan(g);
  const { byKey, firstDate, overflow } = planAssignments(g, todayStr);
  const { halfYearEnd, yearEnd } = schoolYearMarks(todayStr);
  const open = plan.filter(t => !t.done), done = plan.filter(t => t.done);
  const planned = open.reduce((n, t) => n + topicLength(t) - topicDoneCount(t), 0);
  const left = [];
  if (halfYearEnd) left.push(`<b>${countLessons(g.id, todayStr, halfYearEnd)}</b> Stunden bis zum Halbjahr <small>(${escHtml(formatDateDE(parseDate(halfYearEnd)))})</small>`);
  if (yearEnd) left.push(`<b>${countLessons(g.id, todayStr, yearEnd)}</b> bis Schuljahresende <small>(${escHtml(formatDateDE(parseDate(yearEnd)))})</small>`);
  const summary = (left.length ? `Noch ${left.join(' · ')}` : 'Halbjahr und Schuljahresende in den Einstellungen eintragen, dann zählt die App die Stunden.')
    + ` · Geplant: <b>${planned}</b> ${planned === 1 ? 'Stunde' : 'Stunden'}`;
  const when = t => {
    const l = firstDate.get(t);
    if (!l) return '<span class="plan-when plan-over">passt nicht mehr bis Schuljahresende</span>';
    return `<span class="plan-when">${escHtml(formatWeekdayShort(l.dateStr))} · ${escHtml(l.block.label)}${isDateStr(t.pinned) ? ' · fest' : ''}</span>`;
  };
  let html = `<div class="plan-view"><p class="plan-summary">${summary}</p>`;
  if (overflow.length) html += `<p class="plan-warn">${overflow.length} ${overflow.length === 1 ? 'Thema passt' : 'Themen passen'} nicht mehr bis zum Schuljahresende.</p>`;
  if (!open.length) html += `<div class="plan-empty">Noch keine Themen. Trage die Reihenfolge ein, die App verteilt sie auf die kommenden Stunden. Für Parallelklassen: „Von Klasse übernehmen“.</div>`;
  html += '<div class="plan-list">' + open.map((t, i) => `
    <div class="plan-row" data-id="${escHtml(t.id)}">
      <span class="plan-num">${i + 1}</span>
      <button type="button" class="plan-main" data-act="edit"><b>${escHtml(t.title)}</b>${t.note ? `<small>${escHtml(firstLine(t.note))}</small>` : ''}</button>
      <span class="plan-len">${topicDoneCount(t) ? `${topicDoneCount(t)}/${topicLength(t)} Std.` : `${topicLength(t)} Std.`}</span>
      ${when(t)}
      <span class="plan-move">
        <button type="button" class="btn-icon" data-act="up" aria-label="Nach oben"${i === 0 ? ' disabled' : ''}>↑</button>
        <button type="button" class="btn-icon" data-act="down" aria-label="Nach unten"${i === open.length - 1 ? ' disabled' : ''}>↓</button>
      </span>
    </div>`).join('') + '</div>';
  html += `<div class="plan-actions"><button type="button" class="btn-primary" data-act="add">+ Themen</button>`
    + `<button type="button" class="btn-secondary" data-act="copy">${planTemplatesOf().length ? 'Von Klasse oder Vorlage übernehmen …' : 'Von Klasse übernehmen …'}</button></div>`;
  if (done.length) {
    html += `<details class="plan-done"${planShowDone ? ' open' : ''}><summary>Erledigt (${done.length})</summary><div class="plan-list">`
      + done.slice().sort((a, b) => (a.done || '').localeCompare(b.done || '')).map(t => `
        <div class="plan-row is-done" data-id="${escHtml(t.id)}"><span class="plan-num">✓</span>
          <button type="button" class="plan-main" data-act="edit"><b>${escHtml(t.title)}</b></button>
          <span class="plan-when">${escHtml(formatWeekdayShort(t.done))}</span></div>`).join('') + '</div></details>';
  }
  content.innerHTML = html + '</div>';
  const det = content.querySelector('details.plan-done');
  if (det) det.addEventListener('toggle', () => { planShowDone = det.open; });
  content.querySelector('[data-act="add"]').addEventListener('click', () => openPlanTopicForm(g.id, null));
  content.querySelector('[data-act="copy"]').addEventListener('click', () => choosePlanSource(g.id));
  content.querySelectorAll('.plan-row').forEach(row => {
    const t = plan.find(x => x.id === row.dataset.id);
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openPlanTopicForm(g.id, t));
    row.querySelectorAll('[data-act="up"],[data-act="down"]').forEach(b => b.addEventListener('click', () => movePlanTopic(g.id, t, b.dataset.act === 'up' ? -1 : 1)));
  });
}
// Verschieben in der Reihe der offenen Themen (per Objekt, Regel 4/9)
// Vorlage (Parallelklasse): Themenliste einer anderen Klasse übernehmen – angehängt, als saubere Liste
// (ohne feste Termine und Erledigt-Stände, die gehören zur anderen Klasse). Gleiches Fach zuerst.
async function choosePlanSource(targetId) {
  const target = db.groups.find(x => x.id === targetId);
  if (!target) return;
  const sources = db.groups.filter(x => x.id !== targetId && groupPlan(x).length)
    .sort((a, b) => (b.subject === target.subject) - (a.subject === target.subject)
      || (a.className || '').localeCompare(b.className || '', undefined, { numeric: true }));
  // Vorlagen aus dem letzten Schuljahr (Y6), gleiches Fach zuerst
  const tpls = planTemplatesOf().slice().sort((a, b) => (String(b.name).startsWith(target.subject || '\u0000') ? 1 : 0) - (String(a.name).startsWith(target.subject || '\u0000') ? 1 : 0));
  if (!sources.length && !tpls.length) { showToast('Noch keine andere Klasse hat Themen. Erst dort planen, dann hier übernehmen', 'error'); return; }
  const n = g => groupPlan(g).length, nt = k => `${k} ${k === 1 ? 'Thema' : 'Themen'}`;
  const choice = await askChoice('Themen übernehmen',
    `Die Themen werden in derselben Reihenfolge hinten an die Liste der ${target.className} angehängt, ohne feste Termine und ohne „erledigt“.`,
    [...sources.map(x => ({ label: `${x.className} ${x.subject || ''} · ${nt(n(x))}`, value: x.id })),
      ...tpls.map(t => ({ label: `Vorlage: ${t.name}${t.year ? ` (${t.year})` : ''} · ${nt(t.topics.length)}`, value: t.id }))]
      .map((o, i) => ({ ...o, primary: i === 0 })));
  if (choice) copyPlanFrom(targetId, choice);
}
function copyPlanFrom(targetId, sourceId) {
  const target = db.groups.find(x => x.id === targetId);
  const group = db.groups.find(x => x.id === sourceId), tpl = !group && planTemplatesOf().find(x => x.id === sourceId);
  const source = group || (tpl && { className: `der Vorlage ${tpl.name}` });
  if (!target || !source) { showToast('Diese Klasse oder Vorlage gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  const added = (group ? groupPlan(group) : tpl.topics.filter(t => t && String(t.title || '').trim())).map(t => {
    const c = { id: uid(), title: t.title };
    if (topicLength(t) > 1) c.lessons = topicLength(t);
    if (t.note) c.note = t.note;
    return c;
  });
  if (!added.length) return;
  ensurePlan(target).push(...added);
  saveDB();
  refreshPlanViews(targetId);
  showUndoToast(`${added.length} ${added.length === 1 ? 'Thema' : 'Themen'} von ${source.className} übernommen`, () => {
    const g = db.groups.find(x => x.id === targetId);
    if (!g) return;
    g.plan = groupPlan(g).filter(t => !added.includes(t));   // genau die übernommenen, per Objekt (Regel 4)
    saveDB();
    refreshPlanViews(targetId);
  });
}
function movePlanTopic(groupId, t, dir) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  const plan = ensurePlan(g);
  const open = plan.filter(x => !x.done);
  const i = open.indexOf(t), j = i + dir;
  if (i < 0 || j < 0 || j >= open.length) return;
  const a = plan.indexOf(open[i]), b = plan.indexOf(open[j]);
  [plan[a], plan[b]] = [plan[b], plan[a]];
  saveDB();
  refreshPlanViews(groupId);
}

function refreshPlanViews(groupId) {
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (active('view-students') && currentOverviewGroupId === groupId && currentOverviewTab === 'plan'
      && !document.getElementById('overview-content').classList.contains('hidden')) renderPlanTab();
  if (active('view-timetable')) renderTimetable();
  refreshSeatingCockpit();
}

// ── Fenster „Thema“ ──
let planTopicCtx = null;   // { groupId, topic } – Thema per Referenz (Regel 8)
let planTopicSnapshot = null;
function planTopicFormState() {
  return ['plan-topic-title', 'plan-topic-lessons', 'plan-topic-pinned', 'plan-topic-note'].map(id => document.getElementById(id).value).join('\u0001');
}
function openPlanTopicForm(groupId, topic) {
  planTopicCtx = { groupId, topic };
  const isNew = !topic;
  document.getElementById('plan-topic-title-h').textContent = isNew ? 'Themen hinzufügen' : 'Thema bearbeiten';
  document.getElementById('plan-topic-title').value = topic ? topic.title : '';
  document.getElementById('plan-topic-title').rows = isNew ? 4 : 2;
  document.getElementById('plan-topic-hint').classList.toggle('hidden', !isNew);
  document.getElementById('plan-topic-lessons').value = topic ? topicLength(topic) : 1;
  document.getElementById('plan-topic-pinned').value = topic && isDateStr(topic.pinned) ? topic.pinned : '';
  document.getElementById('plan-topic-note').value = topic ? (topic.note || '') : '';
  document.getElementById('btn-plan-topic-delete').classList.toggle('hidden', isNew);
  const doneBtn = document.getElementById('btn-plan-topic-done');
  doneBtn.classList.toggle('hidden', isNew);
  if (topic) doneBtn.textContent = topic.done ? 'Wieder offen' : 'Als erledigt markieren';
  planTopicSnapshot = planTopicFormState();
  openModal('modal-plan-topic');
}
function cancelPlanTopic() {
  if (planTopicSnapshot !== null && planTopicFormState() !== planTopicSnapshot
      && !confirm('Deine Änderungen am Thema sind noch nicht gespeichert.\n\nVerwerfen?')) return;
  planTopicSnapshot = null;
  closeModal('modal-plan-topic');
}
// Felder des Fensters in ein bestehendes Thema übernehmen (Speichern und „Als erledigt markieren“, AQ18). false = nichts geändert.
function applyPlanTopicForm(ctx, plan) {
  if (!plan.includes(ctx.topic)) { showToast('Dieses Thema gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
  const title = document.getElementById('plan-topic-title').value.trim();
  if (!title) { showToast('Bitte ein Thema eingeben', 'error'); return false; }
  const lessons = Math.max(1, Math.min(40, parseInt(document.getElementById('plan-topic-lessons').value) || 1));
  const pinned = document.getElementById('plan-topic-pinned').value;
  const note = document.getElementById('plan-topic-note').value.trim();
  const t = ctx.topic;
  t.title = title;
  if (lessons > 1) t.lessons = lessons; else delete t.lessons;
  if (t.pinned !== pinned) delete t.pinnedSlot;   // anderer Termin: gilt nicht mehr für die eingetippte Stunde
  if (isDateStr(pinned)) t.pinned = pinned; else delete t.pinned;
  if (note) t.note = note; else delete t.note;
  if (t.done && topicDoneCount(t) < topicLength(t) && topicDoneCount(t) > 0) delete t.done; // länger geworden
  // auf die erledigten Stunden verkürzt: fertig, am Tag der letzten erledigten Stunde (AQ26)
  if (!t.done && topicDoneCount(t) > 0 && topicDoneCount(t) >= topicLength(t)) {
    t.done = t.doneLessons.map(k => String(k).slice(-10)).filter(isDateStr).sort().pop() || formatDate(new Date());
  }
  return true;
}
function savePlanTopic() {
  const ctx = planTopicCtx;
  const g = ctx && db.groups.find(x => x.id === ctx.groupId);
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  const plan = ensurePlan(g);
  const titleRaw = document.getElementById('plan-topic-title').value;
  const lessons = Math.max(1, Math.min(40, parseInt(document.getElementById('plan-topic-lessons').value) || 1));
  const pinned = document.getElementById('plan-topic-pinned').value;
  const note = document.getElementById('plan-topic-note').value.trim();
  const apply = t => {
    if (lessons > 1) t.lessons = lessons; else delete t.lessons;
    if (t.pinned !== pinned) delete t.pinnedSlot;   // anderer Termin: gilt nicht mehr für die eingetippte Stunde
    if (isDateStr(pinned)) t.pinned = pinned; else delete t.pinned;
    if (note) t.note = note; else delete t.note;
    return t;
  };
  if (ctx.topic) {
    if (!applyPlanTopicForm(ctx, plan)) return;
  } else {
    // Mehrere Zeilen = mehrere Themen (z. B. aus dem Stoffverteilungsplan eingefügt)
    const titles = titleRaw.split('\n').map(x => x.replace(/^\s*(\d+[.)]|[-•*])\s*/, '').trim()).filter(Boolean);
    if (!titles.length) { showToast('Bitte mindestens ein Thema eingeben', 'error'); return; }
    titles.forEach(title => plan.push(apply({ id: uid(), title })));
  }
  saveDB();
  planTopicSnapshot = null;
  closeModal('modal-plan-topic');
  refreshPlanViews(g.id);
}
function deletePlanTopicFromForm() {
  const ctx = planTopicCtx;
  const g = ctx && db.groups.find(x => x.id === ctx.groupId);
  const plan = g ? ensurePlan(g) : [];
  const i = ctx && ctx.topic ? plan.indexOf(ctx.topic) : -1;
  if (i < 0) { closeModal('modal-plan-topic'); return; }
  const [removed] = plan.splice(i, 1);
  saveDB();
  planTopicSnapshot = null;
  closeModal('modal-plan-topic');
  refreshPlanViews(g.id);
  showUndoToast('Thema gelöscht', () => {
    const gg = db.groups.find(x => x.id === g.id);
    if (!gg) return;
    const pl = ensurePlan(gg);
    pl.splice(Math.min(i, pl.length), 0, removed);
    saveDB();
    refreshPlanViews(gg.id);
  });
}
// Von Hand erledigt/wieder offen (ohne Stunde, z. B. Thema übersprungen oder nachgeholt)
function togglePlanTopicDoneFromForm() {
  const ctx = planTopicCtx;
  const g = ctx && db.groups.find(x => x.id === ctx.groupId);
  if (!g || !ctx.topic || !ensurePlan(g).includes(ctx.topic)) { closeModal('modal-plan-topic'); return; }
  if (!applyPlanTopicForm(ctx, ensurePlan(g))) return;   // Eingetipptes zuerst übernehmen (AQ18)
  if (ctx.topic.done) { delete ctx.topic.done; ctx.topic.doneLessons = (ctx.topic.doneLessons || []).slice(0, Math.max(0, topicLength(ctx.topic) - 1)); }
  else ctx.topic.done = formatDate(new Date());
  saveDB();
  planTopicSnapshot = null;
  closeModal('modal-plan-topic');
  refreshPlanViews(g.id);
}
function openPlanForGroup(groupId) {
  leaveLessonModal();
  switchView('classes');
  openGroupStudents(groupId);
  switchClassDashboardTab('plan');
}

// ── Im Stunden-Fenster: Thema der Stunde (AH54) ──
// Heute und künftig ein Eingabefeld: zeigt das geplante Thema, Eintippen plant direkt (gleiche Liste wie der Reiter „Planung“).
// Übernommen wird beim Schließen (storeLessonForm), mit Enter oder mit „Erledigt“ – nie beim Verlassen des Feldes,
// sonst würde das Neuzeichnen den angetippten Knopf unter dem Finger ersetzen.
let lessonPlanShown = null;   // { slotId, dateStr, groupId, topic } – was das Feld zeigt, Thema per Referenz (Regel 8)
function renderLessonPlanBox(slot, dateStr) { fillLessonPlanBox(slot, dateStr); layoutLessonCards(); }
function fillLessonPlanBox(slot, dateStr) {
  const box = document.getElementById('lesson-plan-box');
  if (!box) return;
  lessonPlanShown = null;
  const g = slot.groupId && db.groups.find(x => x.id === slot.groupId);
  const todayStr = formatDate(new Date());
  if (!g || (dateStr < todayStr && !topicDoneIn(g, slot.id + '_' + dateStr))) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const key = slot.id + '_' + dateStr;
  const doneT = topicDoneIn(g, key);
  const a = !doneT && dateStr >= todayStr ? planAssignments(g, todayStr).byKey.get(key) : null;
  const t = doneT || (a && a.topic) || null;
  box.classList.remove('hidden');
  const unit = doneT ? doneT.doneLessons.indexOf(key) + 1 : a ? a.unit : 0;
  const label = `${doneT ? 'Erledigt' : t ? 'Geplant' : 'Thema'}${t && topicLength(t) > 1 ? ` · Stunde ${unit} von ${topicLength(t)}` : ''}`;
  const head = `<div class="notes-section-header"><span class="notes-section-icon">${icon('list')}</span><span class="notes-section-label">${label}</span>`
    + `<button type="button" class="link-btn lesson-plan-link" data-act="plan">Ganze Planung</button></div>`;
  const note = t && t.note ? `<div class="lesson-plan-note">${escHtml(t.note)}</div>` : '';
  const prev = lessonPrevHTML(slot, dateStr);
  if (doneT) {
    box.innerHTML = `${head}${prev}<div class="lesson-plan-row is-done"><div class="lesson-plan-text"><b>${escHtml(doneT.title)}</b>${note}</div>
      <button type="button" class="btn-secondary lesson-plan-btn" data-act="toggle">✓ Erledigt</button></div>`;
  } else {
    box.innerHTML = `${head}${prev}${note}<div class="lesson-plan-row"><input type="text" id="lesson-plan-input" class="entry-input" maxlength="200"
      placeholder="Thema für diese Stunde" aria-label="Thema für diese Stunde" />
      <button type="button" class="btn-primary lesson-plan-btn" data-act="toggle">Erledigt</button></div>`;
    lessonPlanShown = { slotId: slot.id, dateStr, groupId: g.id, topic: t };
    const input = box.querySelector('#lesson-plan-input');
    const btn = box.querySelector('[data-act="toggle"]');
    input.value = t ? normTopicTitle(t.title) : '';
    const sync = () => { btn.disabled = !input.value.trim(); };
    sync();
    input.addEventListener('input', sync);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commitLessonTopic(); } });
  }
  box.querySelector('[data-act="plan"]').addEventListener('click', () => openPlanForGroup(g.id));
  box.querySelector('[data-act="toggle"]').addEventListener('click', () => {
    const topic = doneT || commitLessonTopic();
    if (topic) toggleLessonTopicDone(slot, dateStr, topic);
  });
}
// Was die Klasse in der Stunde davor gemacht hat (Unterrichtsinhalt), wie „Zuletzt“ in der Klassen-Ansicht (AH56)
function lessonPrevHTML(slot, dateStr) {
  const own = lessonsOnDate(dateStr).find(l => l.slot.id === slot.id);
  const prev = previousLessonOfGroup(slot.groupId, dateStr, own && own.range ? own.range.start : 0);
  const done = prev ? String((db.lessonData[lessonKeyOf(prev)] || {}).done || '').trim() : '';
  if (!done) return '';
  return `<div class="lesson-plan-prev"><span>Letzte Stunde · ${escHtml(formatWeekdayShort(prev.dateStr))}</span><p>${escHtml(done)}</p></div>`;
}
// Eingetipptes Thema übernehmen. Liefert das Thema, das danach in dieser Stunde liegt (oder null).
// Neu bzw. anders als geplant → eigenes Thema mit festem Termin für genau diese Stunde; die Reihe rutscht dahinter.
// Ein Thema nur für diese Stunde (fester Termin heute, eine Stunde) wird umbenannt bzw. beim Leeren gelöscht.
// Auch für das Fenster „Thema der Stunde“ (AI2): anderes Feld, anderer Stand, anderes Neuzeichnen.
// Titel für das einzeilige Feld und den Vergleich gleich behandeln: Tab, doppelte Leerzeichen, Zeilenumbruch = ein
// Leerzeichen (AQ10, AP9). Sonst gälte ein unveränderter Titel als „geändert“ und jedes Schließen legte ein Thema an.
const normTopicTitle = t => String(t || '').trim().replace(/\s+/g, ' ');
function commitLessonTopic(inputId = 'lesson-plan-input', shown = lessonPlanShown, refresh = refreshLessonPlanBox) {
  const input = document.getElementById(inputId);
  if (!input || !shown) return null;
  const text = normTopicTitle(input.value);
  const g = db.groups.find(x => x.id === shown.groupId);
  const topic = shown.topic && g && groupPlan(g).includes(shown.topic) ? shown.topic : null;
  // Unverändert: nichts anlegen. Ist das Thema inzwischen weg (Sync), meldet „Erledigt“ das (toggleLessonTopicDone)
  if (text === (shown.topic ? normTopicTitle(shown.topic.title) : '')) return shown.topic;
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return null; }
  const plan = ensurePlan(g);
  const own = topic && topic.pinned === shown.dateStr && topicLength(topic) === 1 && !topicDoneCount(topic);
  let result = null;
  if (own && text) {
    topic.title = text;
    result = topic;
  } else if (own) {
    const i = plan.indexOf(topic);
    plan.splice(i, 1);
    showUndoToast(`Thema „${topic.title}“ gelöscht`, () => {
      if (!db.groups.includes(g) || ensurePlan(g).includes(topic)) return;
      ensurePlan(g).splice(Math.min(i, g.plan.length), 0, topic);
      saveDB();
      refreshPlanViews(g.id);
      refresh(shown);
    });
  } else if (text) {
    result = { id: uid(), title: text, pinned: shown.dateStr, pinnedSlot: shown.slotId };
    const { byKey, firstDate } = planAssignments(g);
    const cur = byKey.get(shown.slotId + '_' + shown.dateStr);
    // In der Liste dorthin, wo es zeitlich steht: vor das bisherige Thema der Stunde (mitten in einer Reihe: dahinter)
    let i = cur ? plan.indexOf(cur.topic) + (cur.unit > 1 ? 1 : 0)
      : plan.findIndex(x => x && !x.done && firstDate.has(x) && firstDate.get(x).dateStr > shown.dateStr);
    if (i < 0) i = plan.length;
    plan.splice(i, 0, result);
  } else {
    // Thema aus der Liste geleert: bleibt geplant (gelöscht wird in der Planung, dort sieht man die ganze Reihe)
    input.value = topic ? String(topic.title || '') : '';
    showToast('Das Thema bleibt in der Planung. Löschen geht unter „Ganze Planung“.');
    return topic;
  }
  saveDB();
  refreshPlanViews(g.id);
  refresh(shown);
  return result;
}
// Thema-Kachel neu zeichnen, wenn das Stunden-Fenster noch dieselbe Stunde zeigt
function refreshLessonPlanBox(shown) {
  if (document.getElementById('modal-lesson').classList.contains('hidden')) return;
  if (activeLessonId !== shown.slotId || activeLessonDate !== shown.dateStr) return;
  const slot = db.lessonSlots.find(x => x.id === shown.slotId);
  if (slot) renderLessonPlanBox(slot, shown.dateStr);
}
// Haken in der Stunde: Thema (bzw. eine seiner Stunden) erledigt. Schreibt den Titel ins Feld „Unterrichtsinhalt“
// des offenen Fensters (wird mit ihm gespeichert) – nie direkt in lessonData, sonst überschriebe das Fenster es.
// Fenster „Thema der Stunde“ (AI2): eigenes Feld und eigenes Neuzeichnen.
function toggleLessonTopicDone(slot, dateStr, t, doneFieldId = 'lesson-done-text', rerender = () => renderLessonPlanBox(slot, dateStr)) {
  const g = db.groups.find(x => x.id === slot.groupId);
  if (!g || !groupPlan(g).includes(t)) { showToast('Dieses Thema gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  const key = slot.id + '_' + dateStr;
  t.doneLessons = Array.isArray(t.doneLessons) ? t.doneLessons : [];
  const ta = document.getElementById(doneFieldId);
  const i = t.doneLessons.indexOf(key);
  if (i >= 0) {
    t.doneLessons.splice(i, 1);
    if (!t.doneLessons.length) delete t.doneLessons;
    delete t.done;
    if (ta && ta.value.trim() === t.title) ta.value = '';
  } else {
    t.doneLessons.push(key);
    if (t.doneLessons.length >= topicLength(t)) t.done = dateStr;
    if (ta && !ta.value.trim()) ta.value = t.title;
  }
  saveDB();
  rerender();
  refreshPlanViews(g.id);
}

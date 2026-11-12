// ▸ Stunden-Fenster: Inhalt, Notizen, Hausaufgaben, Tests, Ausfall, Karten
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


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

// ─── Lesson Detail ───────────────────────────────────────────────────────
let currentLessonDataKey = null;
let lessonTogglesShown = { hwEnabled: false, testEnabled: false }; // Schalterstand beim Öffnen (BUGS R7)

// Aus dem Sitzplan geöffnet (Beamer): Klassennotizen und Merkzettel erst nach „Anzeigen“ (AS7, Regel 71/73). Nie gespeichert.
let lessonPrivateVeiled = false;
function showLessonPrivate() {
  lessonPrivateVeiled = false;
  const slot = activeLessonId && db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot) return;
  renderLessonClassNotes(slot, activeLessonDate, true);
  renderLessonTodos(slot);
}
const lessonVeilHTML = (n, one, many) => `<div class="lc-veil"><span>${n} ${n === 1 ? one : many}, am Beamer verborgen</span><button type="button" class="btn-secondary lc-veil-btn">Anzeigen</button></div>`;
function openLessonDetail(slotId, dateStr, { fromSeating = false } = {}) {
  const slot = db.lessonSlots.find(s => s.id === slotId);
  if (!slot) return;
  lessonPrivateVeiled = !!fromSeating;

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
  renderLessonPlanBox(slot, dateStr);   // AD3
  renderLessonClassNotes(slot, dateStr); // AD15
  renderLessonTodos(slot); // Merkzettel der Klasse (AH18)

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
  document.getElementById('lesson-color-dot').style.background = safeColor(slot.color);   // AT9
  const group = slot.groupId && db.groups.find(g => g.id === slot.groupId);
  // Klasse als Titel, Fach vorn in der Unterzeile (BUGS I13); ohne Klasse ist das Fach der Titel
  const t = lessonTitle(slot);
  document.getElementById('lesson-modal-title').textContent = t.main;
  document.getElementById('lesson-modal-subtitle').textContent = [t.sub, DAYS[slot.day],
    block ? block.label + ' (' + block.start + '–' + block.end + ')' : '',
    d.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}), slot.room,
    classTeacherText(db.groups.find(x => x.id === slot.groupId))].filter(Boolean).join(' · ');

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
  layoutLessonCards();   // erst jetzt stehen alle Felder fest (AH37)
  openModal('modal-lesson');
}

// „Heute fehlen“ im Stunden-Fenster; auch nach Einträgen über „Schüler bewerten“ neu (BUGS M10)
function renderLessonAbsent(slot, dateStr) { fillLessonAbsent(slot, dateStr); layoutLessonCards(); }
function fillLessonAbsent(slot, dateStr) {
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
  layoutLessonCards();   // eingeschaltet ist die Karte groß, sie bekommt einen anderen Partner (AH37)
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
  label.textContent = 'Nächste Stunden (Datum wählen):';
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

  // Themen einer Arbeit wählen (AJ6 b): nur bei Tests einer Klasse mit Planung und eingeschalteter Schülerapp
  const plan = type === 'test' ? testTopicChoices() : [];
  if (!items.length) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:var(--space-1) 0">Noch keine Einträge.</div>`;
  } else {
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'entry-item' + (plan.length ? ' has-topics' : '');
      const targetLabel = item.targetDate ? `<span class="entry-item-target">${formatDateLong(item.targetDate)}</span>` : '';
      el.innerHTML = `
        <span class="entry-item-text">${escHtml(item.text)}</span>
        ${targetLabel}
        <button class="entry-item-delete" aria-label="Löschen">✕</button>
        ${plan.length ? testTopicsHTML(item, plan) : ''}
      `;
      el.querySelector('.entry-item-delete').onclick = () => removeItem(type, item); // per Referenz (Regel 9, BUGS M15)
      if (plan.length) {
        el.querySelector('.test-topics-btn').onclick = () => {
          testTopicsOpenFor = testTopicsOpenFor === item ? null : item;
          renderTestItems(items, incoming);
        };
        el.querySelectorAll('[data-topic]').forEach(b => { b.onclick = () => toggleTestTopic(item, b.dataset.topic); });
      }
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

// Themen einer Arbeit (AJ6 b). Gemerkt wird die Kennung des Themas (item.topics), angezeigt der aktuelle Titel.
// Welche Arbeit gerade aufgeklappt ist, ist Ansichtszustand (Regel 19), nie in db.
let testTopicsOpenFor = null;
function testTopicChoices() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  const g = slot && db.groups.find(x => x.id === slot.groupId);
  return g && studentAppOn() && studentAppOf(g).on ? groupPlan(g).filter(t => t && t.id && String(t.title || '').trim()) : [];
}
function testTopicsHTML(item, plan) {
  const ids = Array.isArray(item.topics) ? item.topics : [];
  const chosen = plan.filter(t => ids.includes(t.id)).map(t => String(t.title).trim());
  const open = testTopicsOpenFor === item;
  return `<div class="test-topics">
    <button type="button" class="btn-secondary test-topics-btn" aria-expanded="${open}">${icon('list')}${chosen.length ? `Kommt dran (${chosen.length})` : 'Was kommt dran?'}</button>
    ${chosen.length && !open ? `<p class="test-topics-chosen">${escHtml(chosen.join(', '))}</p>` : ''}
    ${open ? `<div class="sw-chips" role="group" aria-label="Themen der Arbeit, für die Schülerapp">${plan.map(t =>
      `<button type="button" data-topic="${escHtml(t.id)}" class="${ids.includes(t.id) ? 'on' : ''}" aria-pressed="${ids.includes(t.id)}">${escHtml(String(t.title).trim())}</button>`).join('')}</div>
      <p class="field-hint-muted">Steht in der Schülerapp bei der Arbeit unter „Das kommt dran“.</p>` : ''}
  </div>`;
}
function toggleTestTopic(item, topicId) {
  const data = db.lessonData[currentLessonDataKey];
  if (!data || !(data.testItems || []).includes(item)) { showToast('Diesen Test gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  const ids = Array.isArray(item.topics) ? item.topics : [];
  const next = ids.includes(topicId) ? ids.filter(x => x !== topicId) : [...ids, topicId];
  if (next.length) item.topics = next; else delete item.topics;
  saveDB();
  renderTestItems(data.testItems, getIncomingItems(activeLessonId, activeLessonDate).tests);
}

// Liegt an diesem Datum eine Stunde der Klasse? Sonst wäre eine HA/ein Test nirgends fällig (BUGS R13).
// Beim Schließen des Fensters (fromClose) wird nicht gefragt: Eingetipptes darf dabei nie verloren gehen (Regel 27).
function confirmTargetHasLesson(targetDate, fromClose) {
  if (!targetDate || fromClose) return true;
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  const ids = new Set(relatedSlots(slot).map(x => x.id));
  // Eine ausfallende Stunde zählt nicht: dort hinge der Eintrag fest (BUGS V9)
  if (lessonsOnDate(targetDate).some(l => ids.has(l.slot.id) && !l.ausfall)) return true;
  return confirm(`Am ${formatDateLong(targetDate)} hat die Klasse keine Stunde (oder sie fällt aus). Dort würde der Eintrag nirgends als fällig angezeigt.\n\nTrotzdem eintragen?`);
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
  // Eingetippte, aber nicht per „+“ übernommene HA/Tests, Klassennotiz und Thema nicht verwerfen
  addLessonClassNote();
  commitLessonTopic();
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
    const back = revertMovedLesson(moved.slotId);
    saveDB();   // auch ohne Zurücknehmen: der Verweis ist dann gelöst (detachMovedCopy)
    renderScheduleViews();
    showToast(back ? 'Verlegung aufgehoben' : 'Hier findet die Stunde nicht mehr statt. Die verlegte Stunde bleibt mit ihren Einträgen.');
    openLessonDetail(activeLessonId, activeLessonDate);
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
    listContainer.innerHTML = '<div style="padding:var(--space-4);text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
  } else {
    const sorted = sortStudents(students);
    sorted.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:12px 16px; border-bottom:1px solid var(--border); cursor:pointer; font-weight:500;';
      row.textContent = studentListName(s); // Namensformat nach Einstellung (BUGS M9)
      row.onclick = () => {
        closeModal('modal-lesson-students');
        openSeatingStudentModal(s.id, slot.groupId, activeLessonDate, { fixedDate: true });
      };
      listContainer.appendChild(row);
    });
  }
  openModal('modal-lesson-students');
}
// ─── Karten im Stunden-Fenster (AH37) ───────────────────────────────────────
// Reihenfolge und Ausblenden in db.settings.lessonCards ({ order, hidden }); der Standard wird nie gespeichert.
// Feste Paare (AH53): 1+2, 3+4 … in der gewählten Reihenfolge, damit jede Stunde gleich aussieht. Fehlt in einer Stunde
// der Partner (Wer fehlt, Merkzettel, Thema), nimmt die Karte die Zeile; die Zeilen darunter bleiben, wo sie sind.
// Die Karten bleiben im DOM, wo sie sind, nur CSS-order und .lc-wide ändern sich: Sonst ginge beim Tippen der Fokus verloren.
const LESSON_CARDS = [
  { key: 'absent', sel: '#lesson-absent-container', label: 'Wer fehlt', icon: 'attendance', always: true },
  { key: 'todos', sel: '#lesson-todos', label: 'Merkzettel', icon: 'todo', always: true },
  { key: 'plan', sel: '#lesson-plan-box', label: 'Thema', icon: 'list' },
  { key: 'classnotes', sel: '#lesson-class-notes', label: 'Notiz für die Klasse', icon: 'pin' },
  { key: 'content', sel: '.lc-content', label: 'Unterrichtsinhalt', icon: 'content' },
  { key: 'notes', sel: '.lc-notes', label: 'Notizen & Anmerkungen', icon: 'notes' },
  { key: 'hw', sel: '.lc-hw', label: 'Hausaufgaben', icon: 'homework' },
  { key: 'test', sel: '.lc-test', label: 'Test / Klassenarbeit', icon: 'test' },
];
// Gespeichertes lesen und dabei reparieren: Unbekanntes fällt weg, Fehlendes kommt hinten dazu (auch aus anderen App-Versionen)
function lessonCardSetup() {
  const saved = db.settings.lessonCards;
  const keys = LESSON_CARDS.map(c => c.key);
  const given = saved && Array.isArray(saved.order) ? saved.order.filter(k => keys.includes(k)) : [];
  const order = [...new Set(given), ...keys.filter(k => !given.includes(k))];
  const hidden = saved && Array.isArray(saved.hidden) ? [...new Set(saved.hidden.filter(k => keys.includes(k) && !LESSON_CARDS.find(c => c.key === k).always))] : [];
  return { order, hidden };
}
const lessonCardsAreDefault = order => order.every((k, i) => k === LESSON_CARDS[i].key);
function setLessonCards(order, hidden) {
  if (lessonCardsAreDefault(order) && !hidden.length) delete db.settings.lessonCards;
  else db.settings.lessonCards = { order: [...order], hidden: [...hidden] };
  saveDB();
  layoutLessonCards();
}
// Steht in dieser Stunde etwas in der Karte? Dann erscheint sie auch ausgeblendet, sonst wäre es still weg
function lessonCardHasContent(key) {
  const el = document.querySelector(LESSON_CARDS.find(c => c.key === key).sel);
  if (LESSON_CARDS.find(c => c.key === key).always) return true;
  if (key === 'plan') return !!el.querySelector('.lesson-plan-row.is-done') || !!(el.querySelector('#lesson-plan-input')?.value.trim());
  if (key === 'classnotes') return !!el.querySelector('.cn-chip, .lc-veil');
  if (key === 'content' || key === 'notes') return !!el.querySelector('textarea').value.trim();
  const incoming = document.getElementById(`${key}-incoming-list`);
  return document.getElementById(`${key}-toggle`).checked || !!document.querySelector(`#${key}-items-list .entry-item`)
    || !!(incoming && !incoming.classList.contains('hidden') && incoming.children.length);
}
// Plätze (ausgeblendete Karten zählen nicht mit) → Zeilen mit den in dieser Stunde sichtbaren Karten
function lessonCardRows(slots) {
  const rows = [];
  for (let i = 0; i < slots.length; i += 2) {
    const row = slots.slice(i, i + 2).filter(c => c.shown);
    if (row.length) rows.push(row);
  }
  return rows;
}
function layoutLessonCards() {
  const form = document.getElementById('lesson-notes-form');
  if (!form) return;
  const { order, hidden } = lessonCardSetup();
  form.classList.toggle('lc-default', lessonCardsAreDefault(order));
  const slots = [];
  order.forEach(key => {
    const el = form.querySelector(LESSON_CARDS.find(c => c.key === key).sel);
    el.classList.toggle('lc-off', hidden.includes(key) && !lessonCardHasContent(key));
    if (!el.classList.contains('lc-off')) slots.push({ key, el, shown: !el.classList.contains('hidden') });
  });
  let n = 0;
  lessonCardRows(slots).forEach(row => row.forEach(c => {
    c.el.style.setProperty('--lc-order', n++);
    c.el.classList.toggle('lc-wide', row.length === 1);
  }));
  ['hw', 'test'].forEach(key => {
    const hint = form.querySelector(`.lc-${key} .lc-off-hint`);
    if (hint) hint.hidden = document.getElementById(`${key}-toggle`).checked;
  });
}
// Fenster zum Anordnen: alle Karten gleich groß, auch die, die in dieser Stunde gerade leer sind
function renderLessonCardTiles() {
  const box = document.getElementById('lc-tiles');
  const { order, hidden } = lessonCardSetup();
  box.innerHTML = LESSON_CARDS.map(c => {
    const off = hidden.includes(c.key);
    return `<div class="lc-tile${off ? ' is-off' : ''}" data-key="${c.key}" style="order:${order.indexOf(c.key)}">${icon(c.icon)}<span class="lc-tile-name">${c.label}</span>
      <button type="button" class="lc-move" data-move="-1" aria-label="${c.label} nach vorn">‹</button><button type="button" class="lc-move" data-move="1" aria-label="${c.label} nach hinten">›</button>
      ${c.always ? '' : `<button type="button" class="btn-icon lc-eye" data-eye aria-pressed="${off ? 'false' : 'true'}" aria-label="${c.label} ${off ? 'einblenden' : 'ausblenden'}">${icon(off ? 'eye-off' : 'eye')}</button>`}</div>`;
  }).join('');
  box.querySelectorAll('.lc-tile').forEach(wireLessonCardTile);
}
function swapLessonCards(a, b) {
  const { order, hidden } = lessonCardSetup();
  const i = order.indexOf(a), j = order.indexOf(b);
  if (i === -1 || j === -1 || i === j) return;
  order[i] = b; order[j] = a;
  setLessonCards(order, hidden);
  document.querySelectorAll('#lc-tiles .lc-tile').forEach(t => { t.style.order = order.indexOf(t.dataset.key); });
}
function wireLessonCardTile(tile) {
  const key = tile.dataset.key;
  tile.querySelectorAll('[data-move]').forEach(btn => btn.addEventListener('click', () => {
    const { order } = lessonCardSetup();
    const other = order[order.indexOf(key) + Number(btn.dataset.move)];
    if (other) swapLessonCards(key, other);
  }));
  tile.querySelector('[data-eye]')?.addEventListener('click', () => {
    const { order, hidden } = lessonCardSetup();
    setLessonCards(order, hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key]);
    renderLessonCardTiles();
  });
  // Ziehen: Die Karte folgt dem Finger, beim Loslassen tauscht sie mit der Karte darunter. Nur diese zwei ändern den Platz.
  let start = null;
  const targetAt = e => (document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [])
    .map(el => el.closest && el.closest('.lc-tile')).find(t => t && t !== tile) || null;
  const markTarget = t => document.querySelectorAll('#lc-tiles .is-target').forEach(x => x.classList.toggle('is-target', x === t)) || (t && t.classList.add('is-target'));
  const finish = () => {
    start = null;
    tile.classList.remove('is-dragging');
    tile.style.transform = '';
    markTarget(null);
  };
  tile.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    if (tile.setPointerCapture && e.pointerId !== undefined) { try { tile.setPointerCapture(e.pointerId); } catch (err) { /* egal */ } }
    start = { x: e.clientX, y: e.clientY };
    tile.classList.add('is-dragging');
  });
  tile.addEventListener('pointermove', e => {
    if (!start) return;
    tile.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px)`;
    markTarget(targetAt(e));
  });
  tile.addEventListener('pointerup', e => {
    if (!start) return;
    const over = targetAt(e);
    finish();
    if (over) swapLessonCards(key, over.dataset.key);
  });
  tile.addEventListener('pointercancel', finish);
}
function openLessonCardsModal() {
  renderLessonCardTiles();
  openModal('modal-lesson-cards');
}

// Hausaufgaben/Tests, die zu dieser Stunde fällig sind (aus anderen Stunden der Klasse oder dieser selbst)
function dueItemsFor(slotId, dateStr) {
  const incoming = getIncomingItems(slotId, dateStr);
  const own = db.lessonData[slotId + '_' + dateStr] || {};
  // Ohne Zieldatum zählt eine HA dort, wo sie gestellt wurde – wie das Symbol in der Kachel (BUGS R12)
  const onDate = (enabled, items) => enabled ? (items || []).filter(i => !i.targetDate || i.targetDate === dateStr) : [];
  return { hw: [...incoming.hw, ...onDate(own.hwEnabled, own.hwItems)], tests: [...incoming.tests, ...onDate(own.testEnabled, own.testItems)] };
}

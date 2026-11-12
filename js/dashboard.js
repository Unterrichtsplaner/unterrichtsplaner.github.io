// ▸ Dashboard, Merkzettel, Schnellsuche
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


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

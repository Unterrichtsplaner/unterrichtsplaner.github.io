// ▸ Schülerapp (Seite des Planers): Freigabe, Auszüge, persönliche Seiten
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


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
// Plusse der ganzen Klasse seit `since` (++ zählt doppelt, Minus gar nicht) – nur die Summe, keine Namen.
// Gespendete Plusse (Plus-Konto, AV1) zählen ein zweites Mal dazu.
function classGoalCount(g, since) {
  let n = 0;
  (db.students[g.id] || []).forEach(s => (s.participation || []).forEach(p => {
    if (!p || (since && String(p.date || '') < since)) return;
    if (p.value === 'excellent') n += 2;
    else if (p.value === 'positive') n += 1;
  }));
  return n + classDonated(g, since);
}
// Summe der Spenden ans Klassenziel seit `since` (AV1): nie, wer wie viel gespendet hat
function classDonated(g, since) {
  let n = 0;
  (db.students[g.id] || []).forEach(s => (Array.isArray(s.redeemed) ? s.redeemed : []).forEach(r => {
    if (r && r.kind === 'donate' && isDateStr(r.date) && (!since || r.date >= since)) n += clampInt(r.price, 0, 999, 0);
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
    snap.goal = { target: sa.goal.target, reward: sa.goal.reward, count: classGoalCount(g, sa.goal.since), donated: classDonated(g, sa.goal.since), since: sa.goal.since,
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
// Rückmeldung der letzten Stunden mit allen vier Stufen, Serie, Rang (je Klasse benannt), Plus-Konto mit Laden (AV1,
// ersetzt die Joker; eingelöst wird im Schüler-Fenster, students[].redeemed). Nie Noten, Fehlzeiten, Hinweise, Notizen
// oder andere Schüler; nur der eigene Vorname. Dazu die Klassenseite als zweiter Reiter.
const SA_LEVELS = { easy: 14, normal: 12, hard: 11 };   // Ziel-Level der Mittleren am Schuljahresende (Punkte-Rechner 09.11.)
const SA_LEVEL_NAMES = { easy: 'entspannt', normal: 'normal', hard: 'sportlich' };
const SA_RANK_PRESETS = {
  heft: ['Bleistift', 'Buntstift', 'Fineliner', 'Füller', 'Goldfüller'],
  gaming: ['Neuling', 'Entdecker', 'Durchblicker', 'Taktiker', 'Legende'],
};
// Joker gibt es seit AV1 nicht mehr (der Laden ersetzt sie). Die Startwerte bleiben, um eigene Joker-Texte zu erkennen.
const SA_JOKERS_DEFAULT = ['Sitzplatz für eine Stunde aussuchen', 'Song zum Analysieren vorschlagen', 'Aufgabe aussuchen', 'Partner wählen', 'Rätsel der Stunde stellen'];
const SA_XP = { positive: 10, excellent: 20 };
const SA_FIRST_LEVEL_XP = 10;              // Level 2 mit dem ersten Plus
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
    shop: Array.isArray(p.shop) ? p.shop.map(cleanShopItem).filter(Boolean).slice(0, 16) : shopFromJokers(p.jokers),   // AV1
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
  return { xp, step, ...li, rank: rankName(p, r), tier: r, nextRank };
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
  const info = studentPersonalInfo(g, s, todayStr);
  const feedback = yearParticipation(s, todayStr).filter(x => !x.label && partLevel(x.value))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-400).map(x => ({ date: x.date, v: x.value }));   // ganzes Schuljahr (AJ3g), Grenze nur gegen Ausreißer
  return {
    v: 1, kind: 'me', first: String(s.firstName || '').trim(),
    cls: g.className || '', subject: g.subject || '', teacher: studentAppTeacherName(), color: g.color || '',
    xp: info.xp, level: info.level, from: info.from, next: info.next, rank: info.rank, nextRank: info.nextRank,
    account: studentAccountSnapshot(g, s, todayStr),   // AV1, statt der Joker
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
      'Jeder Schüler bekommt einen eigenen Link mit Vorname, Level, Rückmeldung zur Mitarbeit (auch − und −−), Rang und Plus-Konto (Kontostand und eigene Einlösungen). Keine Noten, keine Fehlzeiten. '
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
  renderStudentAppTab();   // Tempo, Ränge, Laden, Sticker erscheinen bzw. verschwinden sofort (AT13)
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
function findStudentIn(groupId, studentId) { return (db.students[groupId] || []).find(x => x.id === studentId) || null; }
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

// ─── Plus-Konto und Laden (BUGS AV1, Stufe 1; KONZEPT-PLUSKONTO.md) ───────────────────────────────────────
// Die Plusse sind eine Währung: + ist 1 Plus wert, ++ sind 2 (alle Einträge des Schuljahrs, auch mit Titel, wie beim
// Klassenziel). Das Konto wird nur berechnet (verdient − eingelöst, nie unter 0), nie gespeichert; Level und XP sinken
// beim Einlösen nie. Eingelöst wird im Schüler-Fenster: Vorteil (nur vermerkt), Note (trägt eine mündliche 1 „Plus-Konto“
// ein) oder Spende ans Klassenziel (zählt dort ein zweites Mal; die Klassenseite kennt nur die Summe). Name, Preis, Art
// und Symbol werden beim Einlösen gespeichert (students[].redeemed), spätere Änderungen am Laden ändern sie nicht.
// Der Laden ersetzt die Joker: schon eingelöste Joker (jokersUsed) stehen weiter in der Liste, ohne Preis.
const SA_PLUS_VALUE = { positive: 1, excellent: 2 };
const SA_SHOP_DEFAULT = [   // feste Kennungen, damit beide Geräte dieselben Startwerte haben (abgesprochen 12.11.)
  { id: 'l-platz', name: 'Sitzplatz aussuchen', price: 2, kind: 'perk', icon: 'seat' },
  { id: 'l-partner', name: 'Partner wählen', price: 2, kind: 'perk', icon: 'pair' },
  { id: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk', icon: 'music' },
  { id: 'l-aufgabe', name: 'Aufgabe aussuchen', price: 3, kind: 'perk', icon: 'puzzle' },
  { id: 'l-raetsel', name: 'Rätsel der Stunde stellen', price: 3, kind: 'perk', icon: 'ask' },
  { id: 'l-tue', name: 'Keine TÜ abgeben', price: 4, kind: 'perk', icon: 'skip' },
  { id: 'l-eins', name: 'Eine 1 (mündlich)', price: 6, kind: 'grade', icon: 'one' },
];
const SA_JOKER_SHOP = { 'Sitzplatz für eine Stunde aussuchen': 'l-platz', 'Song zum Analysieren vorschlagen': 'l-song', 'Aufgabe aussuchen': 'l-aufgabe',
  'Partner wählen': 'l-partner', 'Rätsel der Stunde stellen': 'l-raetsel' };
const SA_SHOP_KINDS = { perk: 'Vorteil', grade: 'Note: eine 1' };
const SA_SHOP_ICON_NAMES = { seat: 'Stuhl', pair: 'Zwei Personen', music: 'Musik', puzzle: 'Puzzle', ask: 'Frage', skip: 'Blatt durchgestrichen', one: 'Eins',
  gift: 'Geschenk', star: 'Stern', rocket: 'Rakete', bulb: 'Glühbirne', heart: 'Herz', medal: 'Medaille', flame: 'Flamme', bubble: 'Sprechblase', hands: 'Hände' };
const SA_DONATE_STEPS = [1, 3, 5, 10];
const SA_GRADE_NOTE = 'Plus-Konto';   // Titel der Note, die eine eingelöste 1 einträgt
const plusWord = n => (n === 1 ? '1 Plus' : `${n} Plusse`);
const cleanShopItem = x => x && x.id && String(x.name || '').trim()
  ? { id: String(x.id), name: String(x.name).trim().slice(0, 40), price: clampInt(x.price, 1, 99, 3), kind: SA_SHOP_KINDS[x.kind] ? x.kind : 'perk',
    icon: SA_SHOP_ICON_NAMES[x.icon] ? x.icon : 'star' } : null;
// Laden ohne eigene Einstellung: die Startwerte; wer die Joker selbst geschrieben hatte, bekommt seine Texte als erste
// Angebote (bekannte mit ihrem Preis, sonst 3 Plusse), dazu die 1 (Konzept Abschnitt 7). Nur gelesen, nie gespeichert.
function shopFromJokers(jokers) {
  const list = Array.isArray(jokers) ? jokers.map(x => String(x || '').trim()).filter(Boolean) : null;
  if (!list || list.join('\n') === SA_JOKERS_DEFAULT.join('\n')) return SA_SHOP_DEFAULT.map(x => ({ ...x }));
  const known = t => SA_SHOP_DEFAULT.find(x => x.id === SA_JOKER_SHOP[t] || x.name.toLowerCase() === t.toLowerCase());
  const items = list.slice(0, 12).map((t, i) => known(t) || { id: 'j-' + i, name: t.slice(0, 40), price: 3, kind: 'perk', icon: 'star' });
  return [...items.filter((x, i) => items.indexOf(x) === i), ...SA_SHOP_DEFAULT.filter(x => x.kind === 'grade')].map(x => ({ ...x }));
}
// Konto eines Schülers im Schuljahr: verdient (+ 1, ++ 2), eingelöst (Preise beim Einlösen), Stand
function studentAccount(g, s, todayStr = formatDate(new Date())) {
  const earned = yearParticipation(s, todayStr).reduce((n, p) => n + (SA_PLUS_VALUE[p.value] || 0), 0);
  const seen = new Set();   // ein Code (Einmal-Nummer) zählt nur einmal, auch wenn zwei Geräte ihn gescannt haben (Stufe 2)
  const redeemed = yearList(s.redeemed, todayStr).filter(r => !r.nonce || (!seen.has(r.nonce) && seen.add(r.nonce)));
  const spent = redeemed.reduce((n, r) => n + clampInt(r.price, 0, 999, 0), 0);
  return { earned, spent, balance: Math.max(0, earned - spent), redeemed };
}
const redeemIcon = r => (r.kind === 'donate' ? 'heart' : SA_SHOP_ICON_NAMES[r.icon] ? r.icon : 'star');
// Für die persönliche Seite: nur das eigene Konto, der Laden und die eigenen Einlösungen (neueste zuerst)
function studentAccountSnapshot(g, s, todayStr) {
  const acc = studentAccount(g, s, todayStr);
  const kinds = ['perk', 'grade', 'donate'];
  const redeemed = [
    ...acc.redeemed.map(r => ({ date: r.date, name: String(r.name || ''), price: clampInt(r.price, 0, 999, 0), kind: kinds.includes(r.kind) ? r.kind : 'perk', icon: redeemIcon(r),
      ...(r.nonce ? { nonce: String(r.nonce) } : {}) })),   // Einmal-Nummer: die Schülerseite hakt damit „wartet auf Bestätigung“ ab
    ...yearList(s.jokersUsed, todayStr).map(j => ({ date: j.date, name: j.text ? `Joker: ${String(j.text)}` : 'Joker', price: 0, kind: 'joker', icon: 'star' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  return { balance: acc.balance, earned: acc.earned, spent: acc.spent,
    shop: personalOf(g).shop.map(x => ({ id: x.id, name: x.name, price: x.price, kind: x.kind, icon: x.icon })), redeemed };
}
function afterRedeemChange(g, s, grade, created = false) {
  if (grade) {
    if (created) revealPeriodOf(grade.date);   // sonst verschwände die Note im gezeigten Halbjahr (AR7)
    refreshGradeViews(s, g.id);
  }
  refreshOpenProfile(s);
  refreshStudentAppViews();   // Klassenziel (Spende)
}
// Einlösen im Schüler-Fenster. Ohne „Anzeigen“ steht nirgends der Kontostand, nur was reicht (Beamer, Regel 16/67).
async function redeemShop(groupId, studentId) {
  const g = db.groups.find(x => x.id === groupId), s = findStudentIn(groupId, studentId);
  if (!g || !s || !personalActive(g)) return;
  const balance = studentAccount(g, s).balance;
  const items = personalOf(g).shop.filter(x => x.price <= balance);
  const canGive = !!studentAppOf(g).goal && balance >= SA_DONATE_STEPS[0];
  if (!items.length && !canGive) { showToast(`Das Konto von ${s.firstName} reicht gerade für kein Angebot`, 'error'); return; }
  const pick = await askChoice(`Einlösen für ${s.firstName}`, 'Was wird eingelöst? Hier steht nur, wofür das Konto reicht.',
    [...items.map(x => ({ label: `${x.name} · ${plusWord(x.price)}`, value: x.id })), ...(canGive ? [{ label: 'Für die Klasse spenden', value: 'donate' }] : [])]);
  if (!pick) return;
  let item;
  if (pick === 'donate') {
    const n = await askChoice('Für die Klasse spenden', `Wie viele Plusse spendet ${s.firstName}? Sie zählen fürs Klassenziel ein zweites Mal.`,
      SA_DONATE_STEPS.filter(k => k <= balance).map(k => ({ label: plusWord(k), value: k })));
    if (!n) return;
    item = { name: 'Spende an die Klasse', price: n, kind: 'donate' };
  } else {
    const x = personalOf(g).shop.find(i => i.id === pick);
    if (!x) return;
    item = { itemId: x.id, name: x.name, price: x.price, kind: x.kind, icon: x.icon };
  }
  // Nach dem Warten (Regel 43): Schüler noch da und Konto reicht noch (ein Abgleich kann dazwischen gekommen sein)
  if (!db.groups.includes(g) || findStudentIn(groupId, studentId) !== s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  if (studentAccount(g, s).balance < item.price) { showToast('Das Konto reicht inzwischen nicht mehr', 'error'); return; }
  applyRedemption(g, s, item);
}
// Einlösung eintragen (Schüler-Fenster und Scanner): Note bei Art „grade“, speichern, „Rückgängig“. Vorher geprüft: Konto reicht.
function applyRedemption(g, s, item) {
  const groupId = g.id;
  const today = formatDate(new Date());
  const entry = { id: uid(), date: today, ...item };
  let grade = null;
  if (item.kind === 'grade') {   // die beste Note der Skala: 1 bzw. 15 Punkte (Regel 1)
    const scale = gradeScale(g);
    grade = { type: 'muendlich', value: parseGradeInput(String(scale.higherIsBetter ? scale.max : scale.min), scale).value, date: today, note: SA_GRADE_NOTE };
    (s.grades = Array.isArray(s.grades) ? s.grades : []).push(grade);
  }
  (s.redeemed = Array.isArray(s.redeemed) ? s.redeemed : []).push(entry);
  saveDB();
  afterRedeemChange(g, s, grade, true);
  showUndoToast(`${s.firstName}: ${item.name} eingelöst`, () => {
    const i = (db.students[groupId] || []).includes(s) ? s.redeemed.indexOf(entry) : -1;
    if (i === -1) { showToast('Nicht mehr möglich: Die Daten wurden inzwischen ersetzt', 'error'); return; }
    s.redeemed.splice(i, 1);
    const k = grade ? (s.grades || []).indexOf(grade) : -1;
    if (k !== -1) s.grades.splice(k, 1);
    saveDB();
    afterRedeemChange(g, s, grade);
  });
  return entry;
}
// ─── Einlösen per QR-Code (AV1 Stufe 2) ───────────────────────────────────────────────────────────────────
// Die Schülerseite zeigt einen unterschriebenen Code (StudentShare.plusCode), der Scanner (js/scanner.js) gibt den Text hierher.
// Geprüft wird: Code-Form, bekannter persönlicher Link, Unterschrift mit dessen Schlüssel, Einmal-Nummer noch nicht benutzt,
// Angebot noch im Laden (Preis gilt aus dem Planer), Konto reicht. Die Rückfrage nennt den Kontostand nie (Beamer, Regel 16/67).
function findStudentByAccess(id) {
  for (const g of db.groups) for (const s of (db.students[g.id] || [])) { const a = studentAccessOf(s); if (a && a.id === id) return { g, s }; }
  return null;
}
const codeUsed = (s, nonce) => (Array.isArray(s.redeemed) ? s.redeemed : []).some(r => r && r.nonce === nonce);
// Liefert { kind: 'ok'|'error'|'cancel', msg } für die Anzeige im Scanner; wirft nie
async function redeemFromCode(text) {
  const code = StudentShare.parsePlusCode(text);
  if (!code) return { kind: 'error', msg: 'Das ist kein Einlöse-Code aus der Schülerapp.' };
  let hit = findStudentByAccess(code.id);
  if (!hit) return { kind: 'error', msg: 'Diesen Code kennt der Planer nicht (alter Link oder eine andere Lehrkraft).' };
  if (!(await StudentShare.verifyPlusCode(code, studentAccessOf(hit.s).key))) return { kind: 'error', msg: 'Der Code ist nicht gültig (Unterschrift passt nicht).' };
  hit = findStudentByAccess(code.id);   // nach dem Warten neu suchen (Regel 32/43)
  if (!hit) return { kind: 'error', msg: 'Diesen Schüler gibt es nicht mehr (z. B. durch Sync).' };
  const { g, s } = hit;
  const name = `${s.firstName} ${s.lastName}`.trim();
  if (!personalActive(g)) return { kind: 'error', msg: `Die persönlichen Seiten der ${g.className} sind ausgeschaltet.` };
  if (codeUsed(s, code.nonce)) return { kind: 'error', msg: `Schon eingelöst: Jeder Code von ${s.firstName} gilt nur einmal.` };
  let item;
  if (code.item === 'donate') {
    if (!studentAppOf(g).goal) return { kind: 'error', msg: `Die ${g.className} hat gerade kein Klassenziel, Spenden geht nicht.` };
    item = { name: 'Spende an die Klasse', price: code.n, kind: 'donate' };
  } else {
    const x = personalOf(g).shop.find(i => i.id === code.item);
    if (!x) return { kind: 'error', msg: `Dieses Angebot gibt es im Laden der ${g.className} nicht mehr.` };
    item = { itemId: x.id, name: x.name, price: x.price, kind: x.kind, icon: x.icon };
  }
  if (studentAccount(g, s).balance < item.price) return { kind: 'error', msg: `${s.firstName}: Das Konto reicht nicht für „${item.name}“.` };
  const changed = item.kind !== 'donate' && item.price !== code.n ? `\nDer Preis ist inzwischen ${plusWord(item.price)} (in der App stand ${code.n}).` : '';
  const ok = await askChoice(name, `${g.className} · ${item.name} · ${plusWord(item.price)}\nKonto reicht.${changed}${item.kind === 'grade' ? '\nDabei wird eine mündliche Note eingetragen.' : ''}`,
    [{ label: 'Einlösen', value: 'ok', primary: true }]);
  if (ok !== 'ok') return { kind: 'cancel', msg: 'Nicht eingelöst.' };
  // Nach der Rückfrage: alles noch einmal (Abgleich, zweites Gerät, zweites Scannen)
  if (findStudentByAccess(code.id)?.s !== s || !db.groups.includes(g)) return { kind: 'error', msg: 'Diesen Schüler gibt es nicht mehr (z. B. durch Sync).' };
  if (codeUsed(s, code.nonce)) return { kind: 'error', msg: `Schon eingelöst: Jeder Code von ${s.firstName} gilt nur einmal.` };
  if (studentAccount(g, s).balance < item.price) return { kind: 'error', msg: 'Das Konto reicht inzwischen nicht mehr.' };
  applyRedemption(g, s, { ...item, nonce: code.nonce });
  return { kind: 'ok', msg: `${s.firstName}: ${item.name} eingelöst.` };
}
// Einlösung entfernen (Verklickt): die Plusse sind wieder auf dem Konto, eine eingelöste 1 nimmt ihre Note mit
function removeRedemption(groupId, studentId, entry) {
  const g = db.groups.find(x => x.id === groupId), s = findStudentIn(groupId, studentId);
  const list = s && s.redeemed;
  const i = Array.isArray(list) ? list.indexOf(entry) : -1;
  if (!g || i === -1) return;   // inzwischen weg (Sync): nichts löschen (Regel 9)
  list.splice(i, 1);
  let grade = null, gi = -1;
  if (entry.kind === 'grade') {
    (s.grades || []).forEach((x, k) => { if (x && x.date === entry.date && x.note === SA_GRADE_NOTE) gi = k; });
    if (gi !== -1) grade = s.grades.splice(gi, 1)[0];
  }
  saveDB();
  afterRedeemChange(g, s, grade);
  showUndoToast(grade ? 'Einlösung und Note entfernt' : 'Einlösung entfernt', () => {
    if (list.includes(entry) || !(db.students[groupId] || []).includes(s)) return;
    list.splice(Math.min(i, list.length), 0, entry);
    if (grade && !(s.grades || []).includes(grade)) {
      if (!Array.isArray(s.grades)) s.grades = [];
      s.grades.splice(Math.min(gi, s.grades.length), 0, grade);
    }
    saveDB();
    afterRedeemChange(g, s, grade);
  });
}
// Laden einrichten im Reiter „Schülerapp“ (Farbe der Kachel wie die Seltenheit auf der Schülerseite)
const shopTileColor = price => (price >= 6 ? 5 : price >= 4 ? 0 : price >= 3 ? 3 : 4);
function shopEditorHTML(g, p) {
  const year = weeklyLessons(g) * 36 * SA_MIDDLE_XP_PER_LESSON / 10;   // + gibt 10 XP und ist 1 Plus wert
  const scale = gradeScale(g), best = gradeText(String(scale.higherIsBetter ? scale.max : scale.min)) + (scale.unit ? ` ${scale.unit}` : '');
  return `<div class="form-group"><span class="group-label">Laden</span>
      <div class="sa-stk-list" id="sa-shop-list">${p.shop.map(x => `<div class="sa-stk-row" data-id="${escHtml(x.id)}">${stickerTile(x.icon, shopTileColor(x.price))}
        <input type="text" class="form-input" data-f="name" maxlength="40" value="${escHtml(x.name)}" aria-label="Name des Angebots">
        <button type="button" class="btn-icon" data-del aria-label="Angebot ${escHtml(x.name)} entfernen">✕</button>
        <div class="sa-stk-opts"><label class="sa-xp"><input type="number" class="form-input" data-f="price" min="1" max="99" value="${x.price}" aria-label="Preis in Plussen"> Plusse</label>
          <select class="form-input" data-f="kind" aria-label="Art">${optionList(SA_SHOP_KINDS, x.kind)}</select>
          <select class="form-input" data-f="icon" aria-label="Symbol">${optionList(SA_SHOP_ICON_NAMES, x.icon)}</select></div></div>`).join('')}</div>
      <div class="sa-row-btns"><button type="button" class="btn-secondary" id="sa-shop-add">+ Angebot</button></div>
      <p class="field-hint-muted" id="sa-shop-hint">+ ist 1 Plus wert, ++ sind 2. Ein mittlerer Schüler sammelt etwa ${Math.round(year / 2)} Plusse im Halbjahr und ${Math.round(year)} im Schuljahr.
        Eingelöst wird per Code aus der App (Knopf „Codes scannen“ unten oder „Einlösen“ im Sitzplan) oder im Schüler-Fenster (Mehr → Schülerapp → Plusse einlösen); „Note: eine 1“ trägt dabei eine mündliche ${escHtml(best)} mit Titel „${SA_GRADE_NOTE}“ ein.
        Mit Klassenziel können die Schüler Plusse auch für die Klasse spenden.</p></div>`;
}
function wireShopEditor(content, g) {
  const box = content.querySelector('#sa-shop-list');
  if (!box) return;
  const read = () => [...box.querySelectorAll('.sa-stk-row')].map(row => {
    const f = k => row.querySelector(`[data-f="${k}"]`).value;
    return cleanShopItem({ id: row.dataset.id, name: f('name'), price: f('price'), kind: f('kind'), icon: f('icon') });
  }).filter(Boolean);
  box.addEventListener('change', e => {
    setPersonalList(g.id, 'shop', read());
    if (e.target.matches('[data-f="icon"], [data-f="price"]')) renderStudentAppTab();   // Kachel zeigt Symbol und Seltenheit
  });
  box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    b.closest('.sa-stk-row').remove();
    setPersonalList(g.id, 'shop', read());
    renderStudentAppTab();
  }));
  content.querySelector('#sa-shop-add')?.addEventListener('click', () => {
    setPersonalList(g.id, 'shop', [...personalOf(g).shop, { id: uid(), name: 'Neues Angebot', price: 3, kind: 'perk', icon: 'gift' }]);
    renderStudentAppTab();
  });
}

// ── Anzeigen ──
function personalCardHTML(g) {
  const p = personalOf(g), n = (db.students[g.id] || []).length, cls = escHtml(g.className);
  const step = personalStep(g);
  const rankPh = i => i < 4 ? `Level ${2 * i + 1}–${2 * i + 2}` : 'ab Level 9';
  return `<section class="set-card sa-card" id="sa-personal">
    <div class="sa-head"><div><h3 class="sa-subtitle">Persönliche Seiten</h3>
      <p class="sa-status">Jeder Schüler bekommt einen eigenen Link: Level, Rückmeldung zur Mitarbeit, Rang und Plus-Konto mit Laden. Keine Noten, keine Fehlzeiten.</p></div>
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
      ${shopEditorHTML(g, p)}
      ${stickerEditorHTML(p)}
      <div class="sa-row-btns"><button type="button" class="btn-secondary" id="sa-scan">${icon('qr')}Codes scannen</button>
        <button type="button" class="btn-secondary" id="sa-cards">${icon('printer')}Kärtchen drucken (${n})</button></div>
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
  wireShopEditor(content, g);   // AV1
  content.querySelector('#sa-cards')?.addEventListener('click', () => printStudentCards(g.id));
  content.querySelector('#sa-scan')?.addEventListener('click', () => openPlusScanner());   // AV1 Stufe 2
  wireStickerEditor(content, g);   // AJ2b
}
// Schüler-Fenster, Abschnitt „Schülerapp“: Geben und Einlösen offen (im Unterricht ohne „Anzeigen“), Level, Kontostand,
// Eingelöstes, Baustellen-Text und vergebene Sticker erst nach „Anzeigen“ (data-private, Regel 16/80)
function renderStudentAppSection(s) {
  const sec = document.getElementById('sw-sec-studentapp'), box = document.getElementById('sw-studentapp');
  if (!sec || !box) return;
  const g = db.groups.find(x => x.id === profileGroupId);
  const on = !!(g && personalActive(g));
  sec.hidden = !on;
  if (!on) { box.innerHTML = ''; return; }
  const today = formatDate(new Date());
  const info = studentPersonalInfo(g, s, today);
  const acc = studentAccount(g, s, today);
  const redeemed = acc.redeemed.slice().sort((a, b) => b.date.localeCompare(a.date));
  const jokers = yearList(s.jokersUsed, today).slice().reverse();   // aus der Zeit vor dem Laden (AV1), ohne Preis
  const openBau = (s.baustellen || []).filter(b => b && !b.done && String(b.text || '').trim());
  const given = yearList(s.stickersGiven, today).slice().sort((a, b) => b.date.localeCompare(a.date));
  const doneBau = yearList(s.baustellen, today, 'done');
  box.innerHTML = `<div class="sa-row-btns"><button type="button" class="btn-primary" id="sw-sa-sticker">${icon('star')}Sticker geben</button>
      <button type="button" class="btn-secondary" id="sw-sa-bau">Baustelle geben</button>
      <button type="button" class="btn-secondary" id="sw-sa-redeem">Plusse einlösen</button>
      <button type="button" class="btn-secondary" id="sw-sa-code">${icon('qr')}Code zeigen</button></div>
    ${openBau.length ? `<p class="sw-sa-count">${openBau.length === 1 ? '1 Baustelle offen' : `${openBau.length} Baustellen offen`}</p>` : ''}
    <div class="sw-sa-private" data-private>
      <div class="sw-sa-line"><b>Level ${info.level}</b>${info.rank ? ` · ${escHtml(info.rank)}` : ''} · ${info.xp} XP <small>(noch ${info.next - info.xp} bis Level ${info.level + 1})</small></div>
      <div class="sw-sa-line sw-sa-acct">Konto: <b>${plusWord(acc.balance)}</b> <small>(${acc.earned} verdient, ${acc.spent} eingelöst)</small></div>
      ${redeemed.length || jokers.length ? `<div class="entry-list sw-sa-redeemed">${redeemed.map((r, i) => `<div class="entry-item">${stickerTile(redeemIcon(r), shopTileColor(clampInt(r.price, 0, 999, 0)))}
          <span class="entry-item-text"><b>${escHtml(r.name)}</b> · ${plusWord(clampInt(r.price, 0, 999, 0))}${r.kind === 'grade' ? ' · Note eingetragen' : ''}</span><span class="entry-item-date">${escHtml(formatDateShort(r.date))}</span>
          <button class="entry-item-delete" data-red-del="${i}" aria-label="Einlösung ${escHtml(r.name)} entfernen">✕</button></div>`).join('')}
        ${jokers.map((j, i) => `<div class="entry-item">${stickerTile('star', 5)}<span class="entry-item-text"><b>Joker${j.text ? `: ${escHtml(j.text)}` : ''}</b></span><span class="entry-item-date">${escHtml(formatDateShort(j.date))}</span>
          <button class="entry-item-delete" data-jok-del="${i}" aria-label="Joker vom ${escHtml(formatDateShort(j.date))} entfernen">✕</button></div>`).join('')}</div>` : ''}
      ${openBau.map((b, i) => `<div class="sw-sa-bau"><span>Baustelle seit ${escHtml(formatDateShort(b.date))}: <b>${escHtml(b.text)}</b></span>
        <button type="button" class="btn-secondary" data-bau-done="${i}">Geschafft</button><button type="button" class="entry-item-delete" data-bau-del="${i}" aria-label="Baustelle entfernen">✕</button></div>`).join('')}
      ${given.length || doneBau.length ? `<div class="entry-list sw-sa-given">${given.map((x, i) => `<div class="entry-item">${stickerTile(x.icon, x.color)}
          <span class="entry-item-text"><b>${escHtml(x.name)}</b>${x.reason ? ` · ${escHtml(x.reason)}` : ''}</span><span class="entry-item-date">${escHtml(formatDateShort(x.date))}</span>
          <button class="entry-item-delete" data-stk-del="${i}" aria-label="Sticker ${escHtml(x.name)} entfernen">✕</button></div>`).join('')}
        ${doneBau.map(b => `<div class="entry-item">${stickerTile('crane', 1)}<span class="entry-item-text"><b>Baustelle geschafft</b> · ${escHtml(b.text)}</span><span class="entry-item-date">${escHtml(formatDateShort(b.done))}</span></div>`).join('')}</div>` : ''}
      <div class="sa-row-btns"><button type="button" class="btn-secondary" id="sw-sa-renew">${icon('refresh')}Neuer Link</button></div>
    </div>`;
  box.querySelector('#sw-sa-sticker').addEventListener('click', () => openGive('sticker', g.id, s.id));
  box.querySelector('#sw-sa-bau').addEventListener('click', () => openGive('bau', g.id, s.id));
  box.querySelector('#sw-sa-code').addEventListener('click', () => showStudentCode(g.id, s.id));
  box.querySelector('#sw-sa-redeem').addEventListener('click', () => redeemShop(g.id, s.id));
  box.querySelectorAll('[data-red-del]').forEach(b => b.addEventListener('click', () => removeRedemption(g.id, s.id, redeemed[Number(b.dataset.redDel)])));
  box.querySelectorAll('[data-jok-del]').forEach(b => b.addEventListener('click', () => removeStudentAppEntry(g.id, s.id, 'jokersUsed', jokers[Number(b.dataset.jokDel)], 'Joker entfernt')));
  box.querySelector('#sw-sa-renew').addEventListener('click', () => renewStudentAccess(g.id, s.id));
  box.querySelectorAll('[data-bau-done]').forEach(b => b.addEventListener('click', () => finishBaustelle(g.id, s.id, openBau[Number(b.dataset.bauDone)])));
  box.querySelectorAll('[data-bau-del]').forEach(b => b.addEventListener('click', () => removeStudentAppEntry(g.id, s.id, 'baustellen', openBau[Number(b.dataset.bauDel)], 'Baustelle entfernt')));
  box.querySelectorAll('[data-stk-del]').forEach(b => b.addEventListener('click', () => removeStudentAppEntry(g.id, s.id, 'stickersGiven', given[Number(b.dataset.stkDel)], 'Sticker entfernt')));
}

// ▸ Schülerapp-Übersicht (BUGS BE1): alle Klassen auf einer Seite – Versand, Stand je Klasse mit Schaltern, Plusse im
// Monat, Vorschau zum Durchblättern, Rangliste. Geöffnet über den Knopf „Schülerapp“ in der Klassen-Übersicht.
// Nur Summen je Klasse (am Beamer unbedenklich). Persönliche Seiten in der Vorschau erst nach „Anzeigen“ (Regel 16/67):
// Der Zustand steht nur hier (`hubShown`), nie in db, und fällt beim Klassen- oder Schülerwechsel, beim Verlassen der
// Seite und der App weg. Geschaltet wird über dieselben set…-Funktionen wie im Reiter „Schülerapp“ (gleiche Rückfragen).
// Teil des globalen Bereichs (Y12): nur Deklarationen, Ereignisse meldet js/start.js an.

let hubGroupId = null;      // Klasse in der Vorschau
let hubPicked = false;      // schmal: Vorschau erst nach Antippen einer Klasse (sonst stünde sie mitten in der Liste)
let hubMode = 'class';      // 'class' | 'me'
let hubStudentId = null;    // persönliche Seite: welcher Schüler
let hubShown = false;       // persönliche Seite aufgedeckt (nie gespeichert)
let hubWide = null;         // zuletzt gezeichnet breit (Vorschau rechts) oder schmal (unter der Karte)
const HUB_WIDE_MIN = 860;   // ab dieser Breite von #hub-content steht die Vorschau rechts (.hub-grid.is-wide)
const HUB_MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const hubActive = () => !!document.getElementById('view-studentapp')?.classList.contains('active');
function hubIsWide() {
  const el = document.getElementById('hub-content');
  const w = (el && el.getBoundingClientRect().width) || window.innerWidth;
  return w >= HUB_WIDE_MIN;
}
function openStudentAppHub() {
  hubVeil();
  switchView('studentapp');
}
// Aus Einstellungen → Schülerapp: erst die Einstellungen schließen (fragt bei ungespeicherten Änderungen, Regel 27)
function openStudentAppHubFromSettings() {
  closeModalLikeButton('modal-settings');
  if (!document.getElementById('modal-settings').classList.contains('hidden')) return;
  openStudentAppHub();
}
// Persönliche Seite wieder verbergen (Seite verlassen, App verlassen, anderer Schüler)
function hubVeil() { hubShown = false; }
function hubOnAppHidden() {
  if (!hubShown) return;
  hubVeil();
  if (hubActive()) renderStudentAppHub();
}
function hubOnResize() {
  if (!(hubActive() && hubWide !== null && hubWide !== hubIsWide())) return;
  hubVeil();   // schmal zugeklappt → breit sofort sichtbar: wieder verborgen (Regel 16/67)
  renderStudentAppHub();
}

// ── Zahlen je Klasse ──
function hubMonthNumbers(g, month) {
  let redeemed = 0, donated = 0;
  (db.students[g.id] || []).forEach(s => (Array.isArray(s.redeemed) ? s.redeemed : []).forEach(r => {
    if (!r || !isDateStr(r.date) || r.date.slice(0, 7) !== month) return;
    const n = clampInt(r.price, 0, 999, 0);
    if (r.kind === 'donate') donated += n; else redeemed += n;
  }));
  return { earned: classMonthPlusses(g, month), redeemed, donated };
}
const HUB_SHOW_WORDS = { expedition: 'Inhaltsverzeichnis', fullText: 'ganzer Unterrichtsinhalt', hw: 'Hausaufgaben', tests: 'Tests', next: 'Nächste Stunde' };
const hubTime = at => { const d = new Date(at); return `${formatDate(d) === formatDate(new Date()) ? 'heute' : formatWeekdayShort(formatDate(d))} um ${minsToTime(d.getHours() * 60 + d.getMinutes())}`; };

// ── Versand: ein Satz für alle Seiten ──
function hubStatusText() {
  if (studentAppProblem === 'rules') return 'Die Cloud lehnt die Schülerseiten ab: Die Firestore-Regeln für die Schülerapp fehlen noch.';
  if (studentAppProblem === 'taken') return 'Eine Schülerseite gehört inzwischen einem anderen Konto. Abhilfe: für die Klasse „Neuer Link“ im Reiter „Schülerapp“. Die übrigen Seiten sind aktuell.';
  if (studentAppProblem === 'offline') return 'Gerade keine Verbindung zur Cloud. Die Seiten werden beim nächsten Sync aktualisiert.';
  if (saPendingAt) { const d = new Date(saPendingAt); return `Neue Einträge gehen spätestens um ${minsToTime(d.getHours() * 60 + d.getMinutes())} an die Schüler.`; }
  let last = 0;
  db.groups.forEach(g => {
    const sa = studentAppOf(g);
    if (!sa.on) return;
    [sa.access, ...(db.students[g.id] || []).map(studentAccessOf)].forEach(a => { const m = a && saRead(SA_PUB_PREFIX + a.id, null); if (m && m.at > last) last = m.at; });
  });
  return last ? `Alle Seiten sind aktuell, zuletzt gesendet ${hubTime(last)}. Neue Einträge gehen höchstens alle 10 Minuten raus.` : 'Noch nichts gesendet. Die Seiten erscheinen mit dem nächsten Sync.';
}
function hubStatusHTML() {
  const on = db.groups.filter(g => studentAppOf(g).on);
  const personal = db.groups.filter(personalActive);
  const scan = db.groups.some(shopActive);
  return `<section class="set-card sa-card hub-status"><div class="sa-head"><div><h3 class="sa-subtitle">Versand</h3>
      <p class="sa-status" id="hub-status-text">${escHtml(hubStatusText())}</p></div></div>
    <p class="hub-sum">${on.length} von ${db.groups.length} ${db.groups.length === 1 ? 'Klasse' : 'Klassen'} freigegeben${personal.length ? `, ${personal.length} mit persönlichen Seiten` : ''}.</p>
    <div class="sa-row-btns" id="hub-status-btns">${hubStatusButtons(scan)}</div></section>`;
}
const hubStatusButtons = scan => `${studentAppSendNowHTML()}${scan ? `<button type="button" class="btn-secondary" id="hub-scan">${icon('qr')}Codes scannen</button>` : ''}`;

// ── Karte je Klasse ──
function hubSwitchHTML(key, label, hint, on, gName) {
  return `<div class="hub-switch"><span class="hub-switch-text">${label}${hint ? `<small>${escHtml(hint)}</small>` : ''}</span>
    <label class="toggle-switch" title="${label}"><input type="checkbox" data-hub-switch="${key}" aria-label="${label}: ${escHtml(gName)}"${on ? ' checked' : ''}><span class="toggle-slider"></span></label></div>`;
}
function hubCardHTML(g, month, rows, wide) {
  const sa = studentAppOf(g), p = personalOf(g), name = [g.className, g.subject].filter(Boolean).join(' ');
  const live = sa.on && !!sa.access;
  const sel = g.id === hubGroupId && (wide || hubPicked);
  const switches = [hubSwitchHTML('on', 'Für die Klasse freigegeben', live ? '' : 'Aus: Die Klasse sieht nichts.', sa.on, name)];
  if (live) {
    switches.push(hubSwitchHTML('ranking', 'Rangliste der Klassen', '', sa.ranking, name));
    switches.push(hubSwitchHTML('personal', 'Persönliche Seiten', p.on ? `${(db.students[g.id] || []).length} Schüler mit eigenem Link` : '', p.on, name));
    if (p.on) switches.push(hubSwitchHTML('shop', 'Plus-Konto und Laden', p.shopOn ? '' : 'Aus: Es gelten die Joker.', p.shopOn, name));
  }
  let facts = '';
  if (live) {
    const seen = Object.keys(HUB_SHOW_WORDS).filter(k => sa.show[k]).map(k => HUB_SHOW_WORDS[k]);
    const goal = sa.goal, count = goal ? classGoalCount(g, goal.since) : 0;
    const pct = goal ? Math.min(100, Math.round(count / goal.target * 100)) : 0;
    const row = sa.ranking && rows.length >= 2 ? rows.find(r => r.g === g) : null;
    const n = hubMonthNumbers(g, month);
    const plus = [`${n.earned} gesammelt`, ...(shopActive(g) || n.redeemed ? [`${n.redeemed} eingelöst`] : []), ...(n.donated ? [`${n.donated} gespendet`] : [])];
    facts = `<dl class="hub-facts">
      <div><dt>Sieht</dt><dd>${seen.length ? escHtml(seen.join(' · ')) : 'nur den Kopf der Seite'}</dd></div>
      <div><dt>Klassenziel</dt><dd>${goal ? `${count} von ${goal.target}${goal.reward ? `, dann: ${escHtml(goal.reward)}` : ''}
        <span class="sa-bar" role="img" aria-label="${count} von ${goal.target} Plussen"><i style="width:${pct}%"></i></span>` : 'keins'}</dd></div>
      ${sa.ranking ? `<div><dt>Rangliste</dt><dd>${row ? `Platz ${row.place} von ${rows.length}, ${rankValueText(row.value)} pro Kopf in ${RANKING_PER} Stunden` : escHtml(rankingWaitText(g, rows))}</dd></div>` : ''}
      <div><dt>Plusse ${escHtml(HUB_MONTHS[Number(month.slice(5)) - 1])}</dt><dd>${plus.join(' · ')}</dd></div>
    </dl>`;
  }
  return `<section class="set-card sa-card hub-card${sel ? ' is-selected' : ''}" data-id="${escHtml(g.id)}">
    <div class="hub-card-head"><span class="sa-dot" style="--dot:${escHtml(safeColor(g.color))}"></span>
      <button type="button" class="hub-card-name" data-hub-pick aria-pressed="${sel}" aria-label="Vorschau zeigen: ${escHtml(name)}"><span class="hub-card-title">${escHtml(g.className || '')}<small>${escHtml(g.subject || '')}</small></span>
        <span class="hub-card-go">${icon('eye')}Vorschau</span></button></div>
    <div class="hub-switches">${switches.join('')}</div>
    ${facts}
    <div class="sa-row-btns">${live ? `<button type="button" class="btn-secondary" data-hub-act="beamer">${icon('panel')}Am Beamer zeigen</button>` : ''}
      ${personalActive(g) ? `<button type="button" class="btn-secondary" data-hub-act="cards">${icon('printer')}Kärtchen drucken</button>` : ''}
      <button type="button" class="btn-secondary" data-hub-act="more">${icon('settings')}Mehr einstellen</button></div>
  </section>`;
}

// ── Vorschau ──
function hubPreviewHTML(g) {
  const sa = studentAppOf(g), cls = escHtml(g.className || '');
  if (!(sa.on && sa.access)) return `<div class="hub-preview" id="hub-preview"><h3 class="sa-subtitle">So sieht es die ${cls}</h3><p class="field-hint-muted">Nicht freigegeben: Die Klasse sieht nichts.</p></div>`;
  const me = hubMode === 'me' && personalActive(g);
  const students = sortStudents(db.students[g.id] || []);
  const s = me ? students.find(x => x.id === hubStudentId) || null : null;
  const fullName = x => [x.firstName, x.lastName].filter(Boolean).join(' ');
  return `<div class="hub-preview" id="hub-preview">
    <div class="hub-prev-head"><h3 class="sa-subtitle">So sieht es die ${cls}</h3>
      ${personalActive(g) ? `<div class="tt-mode hub-mode" role="group" aria-label="Welche Seite">
        <button type="button" data-hub-mode="class" aria-pressed="${!me}"${me ? '' : ' class="active"'}>Klassenseite</button>
        <button type="button" data-hub-mode="me" aria-pressed="${me}"${me ? ' class="active"' : ''}>Persönliche Seite</button></div>` : ''}</div>
    ${me ? `<select id="hub-student" class="form-input" aria-label="Schüler">${students.length ? '' : '<option value="">Keine Schüler</option>'}${students.map(x =>
      `<option value="${escHtml(x.id)}"${s === x ? ' selected' : ''}>${escHtml(fullName(x))}</option>`).join('')}</select>` : ''}
    ${me && !s ? '<p class="field-hint-muted">Noch keine Schüler in dieser Klasse.</p>'
      : me && !hubShown ? `<div class="hub-veil"><p>Die persönliche Seite zeigt Level, Rückmeldung zur Mitarbeit und Konto. Sie ist verborgen, damit am Beamer niemand mitliest.</p>
        <button type="button" class="btn-secondary" id="hub-show">${icon('eye')}Anzeigen</button></div>`
      : `${me ? `<div class="hub-veil-bar"><span>Aufgedeckt: Seite von ${escHtml(s.firstName || fullName(s))}</span><button type="button" class="btn-secondary" id="hub-hide">${icon('eye-off')}Verbergen</button></div>` : ''}
        <div class="sa-phone"><iframe id="hub-frame" src="schueler.html?vorschau" title="Vorschau der Schülerapp: ${me ? 'persönliche Seite' : 'Klassenseite'} ${cls}"></iframe></div>`}
  </div>`;
}
function hubPreviewData() {
  const g = db.groups.find(x => x.id === hubGroupId);
  if (!g || !studentAppOf(g).on) return null;
  const klasse = studentAppSnapshot(g);
  if (hubMode !== 'me' || !personalActive(g)) return { ...klasse, at: Date.now() };
  const s = (db.students[g.id] || []).find(x => x.id === hubStudentId);
  if (!s || !hubShown) return null;
  return { ...studentPersonalSnapshot(g, s), klasse, at: Date.now() };
}
function refreshHubPreview(resetTab = false) {
  const frame = document.getElementById('hub-frame');
  const data = frame && hubPreviewData();
  if (!data) return;
  try {
    const w = frame.contentWindow;
    if (resetTab && w && w.SchuelerSeite) w.SchuelerSeite.setMeTab('ich');
    if (w && typeof w.renderStudentPage === 'function') w.renderStudentPage(data);
  } catch (e) { /* Rahmen noch nicht geladen */ }
}

// ── Rangliste aller Klassen ──
function hubRankingHTML(month, rows) {
  const parts = rankingGroups().length;
  return `<section class="set-card sa-card"><h3 class="sa-subtitle">Rangliste ${escHtml(HUB_MONTHS[Number(month.slice(5)) - 1])}</h3>
    ${rows.length >= 2 ? `<ol class="sa-rank-list">${rows.map(r => `<li><span class="sa-rank-place">${r.place}.</span>
      <span class="sa-rank-name">${escHtml([r.g.className, r.g.subject].filter(Boolean).join(' '))}</span><span class="sa-rank-value">${rankValueText(r.value)}</span></li>`).join('')}</ol>
      <p class="field-hint-muted">Plusse pro Kopf in ${RANKING_PER} Stunden, seit dem 1. dieses Monats.</p>`
    : `<p class="field-hint-muted">${parts ? 'Erst ab zwei teilnehmenden Klassen. Schalte „Rangliste der Klassen“ bei einer weiteren Klasse ein.' : `Keine Klasse macht mit. Schalte „Rangliste der Klassen“ bei mindestens zwei Klassen ein (je mindestens ${RANKING_MIN_STUDENTS} Schüler).`}</p>`}</section>`;
}

// ── Zeichnen ──
function renderStudentAppHub() {
  const content = document.getElementById('hub-content');
  if (!content) return;
  if (!studentAppOn()) {
    content.innerHTML = `<section class="set-card sa-card hub-off"><h3 class="sa-subtitle">Die Schülerapp ist aus</h3>
      <p class="sa-status">Einschalten unter Einstellungen → Schülerapp. Danach gibst du hier jede Klasse einzeln frei.</p>
      <div><button type="button" class="btn-secondary" id="hub-open-settings">${icon('settings')}Zu den Einstellungen</button></div></section>`;
    content.querySelector('#hub-open-settings').addEventListener('click', () => { openSettings(); showSettingsPane('studentapp'); });
    return;
  }
  if (!SyncManager.isInitialized || !SyncManager.currentUser) {
    content.innerHTML = `<section class="set-card sa-card"><h3 class="sa-subtitle">Die Schülerapp braucht die Cloud</h3>
      <p class="sa-status">Die Seiten der Klassen liegen verschlüsselt dort. Melde dich unter Einstellungen → Daten &amp; Cloud an.</p>
      <div><button type="button" class="btn-secondary" id="hub-open-cloud">${icon('cloud')}Zur Anmeldung</button></div></section>`;
    content.querySelector('#hub-open-cloud').addEventListener('click', () => { openSettings(); showSettingsPane('data'); });
    return;
  }
  if (!db.groups.length) { content.innerHTML = '<p class="field-hint-muted">Noch keine Klassen.</p>'; return; }
  // Auswahl prüfen (Klasse gelöscht, Schüler gelöscht, persönliche Seiten aus)
  if (!db.groups.some(g => g.id === hubGroupId)) { hubGroupId = (db.groups.find(g => studentAppOf(g).on) || db.groups[0]).id; hubPicked = false; hubShown = false; }
  const g = db.groups.find(x => x.id === hubGroupId);
  if (hubMode === 'me' && !personalActive(g)) { hubMode = 'class'; hubShown = false; }
  if (hubMode === 'me' && !(db.students[g.id] || []).some(s => s.id === hubStudentId)) {
    hubStudentId = (sortStudents(db.students[g.id] || [])[0] || {}).id || null;
    hubShown = false;
  }
  const wide = hubWide = hubIsWide();
  const month = monthOf(new Date());
  const rows = classRanking(month);
  const cards = db.groups.map(x => hubCardHTML(x, month, rows, wide)
    + (!wide && hubPicked && x.id === hubGroupId ? hubPreviewHTML(x) : '')).join('');
  content.innerHTML = `<div class="hub-grid${wide ? ' is-wide' : ''}"><div class="sa-col">
      ${fixNamesHTML()}${hubStatusHTML()}
      ${cards}
      ${hubRankingHTML(month, rows)}
    </div>${wide ? `<aside class="hub-aside">${hubPreviewHTML(g)}</aside>` : ''}</div>`;
  wireStudentAppHub(content);
}
// Nach dem Neuzeichnen den Fokus auf dasselbe Bedienelement zurück (Regel 55, sonst landet die Tastatur oben auf der Seite)
function hubRefocus(find) {
  const content = document.getElementById('hub-content');
  const el = content && find(content);
  if (el && typeof el.focus === 'function') el.focus({ preventScroll: true });
}
const hubCardEl = (content, gid) => [...content.querySelectorAll('.hub-card')].find(c => c.dataset.id === gid) || null;
function wireStudentAppHub(content) {
  wireSendNow(content);
  wireFixNames(content);
  content.querySelector('#hub-scan')?.addEventListener('click', () => openPlusScanner());
  content.querySelectorAll('.hub-card').forEach(card => {
    const gid = card.dataset.id;
    card.querySelectorAll('[data-hub-pick]').forEach(b => b.addEventListener('click', () => hubPick(gid)));
    card.querySelectorAll('[data-hub-switch]').forEach(box => box.addEventListener('change', () => hubSwitch(gid, box.dataset.hubSwitch, box.checked)));
    card.querySelectorAll('[data-hub-act]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.hubAct === 'beamer') showStudentAppBeamer(gid);
      else if (b.dataset.hubAct === 'cards') printStudentCards(gid);
      else openGroupStudents(gid, 'studentapp');
    }));
  });
  content.querySelectorAll('[data-hub-mode]').forEach(b => b.addEventListener('click', () => {
    if (hubMode === b.dataset.hubMode) return;
    hubMode = b.dataset.hubMode;
    hubShown = false;
    renderStudentAppHub();
    hubRefocus(c => c.querySelector(`[data-hub-mode="${hubMode}"]`));
  }));
  content.querySelector('#hub-student')?.addEventListener('change', e => { hubStudentId = e.target.value; hubShown = false; renderStudentAppHub(); hubRefocus(c => c.querySelector('#hub-student')); });
  content.querySelector('#hub-show')?.addEventListener('click', () => { hubShown = true; renderStudentAppHub(); hubRefocus(c => c.querySelector('#hub-hide')); });
  content.querySelector('#hub-hide')?.addEventListener('click', () => { hubShown = false; renderStudentAppHub(); hubRefocus(c => c.querySelector('#hub-show')); });
  const frame = content.querySelector('#hub-frame');
  if (frame) frame.addEventListener('load', () => refreshHubPreview(true));
}
function hubPick(gid) {
  const again = hubGroupId === gid && hubPicked;
  if (hubGroupId !== gid) { hubMode = 'class'; hubShown = false; hubStudentId = null; }
  hubGroupId = gid;
  hubPicked = !(again && !hubWide);   // schmal: zweites Antippen klappt die Vorschau wieder zu
  if (!hubPicked) hubVeil();          // zugeklappt heißt auch verborgen
  renderStudentAppHub();
  hubRefocus(c => hubCardEl(c, gid)?.querySelector('.hub-card-name'));
  const target = hubWide ? null : document.getElementById('hub-preview');
  if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest' });
}
async function hubSwitch(gid, key, on) {
  if (key === 'on') setStudentAppOn(gid, on);
  else if (key === 'ranking') setStudentAppRanking(gid, on);
  else if (key === 'personal') await setPersonalOn(gid, on);
  else if (key === 'shop') await setShopOn(gid, on);
  if (!hubActive()) return;
  renderStudentAppHub();   // auch bei „Abbrechen“: Schalter zurück auf den gespeicherten Stand
  hubRefocus(c => hubCardEl(c, gid)?.querySelector(`[data-hub-switch="${key}"]`));
}
// Nach Sync und Versand: nur Status und Vorschau, sonst nähme das Neuzeichnen den Fokus und lüde die Vorschau neu
function refreshStudentAppHub() {
  if (!hubActive()) return;
  const text = document.getElementById('hub-status-text');
  if (!text) { renderStudentAppHub(); return; }
  text.textContent = hubStatusText();
  const btns = document.getElementById('hub-status-btns');
  const html = hubStatusButtons(db.groups.some(shopActive));
  if (btns && btns.innerHTML !== html) {
    btns.innerHTML = html;
    wireSendNow(btns);
    btns.querySelector('#hub-scan')?.addEventListener('click', () => openPlusScanner());
  }
  refreshHubPreview();
}
// Knopf „Schülerapp“ in der Klassen-Übersicht nur, wenn die Schülerapp an ist
function updateStudentAppHubButton() {
  const b = document.getElementById('btn-studentapp-hub');
  if (b) b.classList.toggle('hidden', !studentAppOn());
  if (!studentAppOn() && hubActive()) renderStudentAppHub();
}

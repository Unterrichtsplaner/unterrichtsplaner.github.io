// Schülerapp (BUGS AJ1): Seite für die Klasse, nur zum Lesen.
// Ablauf: Kennung und Schlüssel aus dem Link („#id.schlüssel“) → Dokument `shares/<id>` aus Firestore (ohne Konto) →
// im Browser entschlüsseln (student-share.js) → zeichnen. Ohne Netz: der zuletzt geladene, noch verschlüsselte Stand.
// Alles Relative („morgen“, „noch 10 Tage“, was schon vorbei ist) rechnet die Seite selbst aus, der Planer schickt Daten.
// Im Planer läuft dieselbe Seite als Vorschau (?vorschau): dort ruft der Planer renderStudentPage(auszug) auf.
(function () {
  const DAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const DAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pad2 = n => String(n).padStart(2, '0');
  const dateOf = s => new Date(s + 'T12:00:00');
  const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const fmt = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const short = s => { const d = dateOf(s); return `${DAYS_SHORT[d.getDay()]} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`; };
  const long = s => { const d = dateOf(s); return `${DAYS[d.getDay()]}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`; };
  const daysBetween = (a, b) => Math.round((dateOf(b) - dateOf(a)) / 864e5);
  function rel(s, today) {
    const n = daysBetween(today, s);
    if (n === 0) return 'heute';
    if (n === 1) return 'morgen';
    if (n === 2) return 'übermorgen';
    if (n > 2 && n < 7) return `am ${DAYS[dateOf(s).getDay()]}`;
    return `in ${n} Tagen`;
  }
  const list = v => (Array.isArray(v) ? v : []);

  // Abhaken nur für sich: bleibt auf diesem Handy, die Lehrkraft sieht davon nichts
  const tickKey = (it) => 'sa_tick_' + it.date + '_' + String(it.text).slice(0, 80);
  const ticked = it => { try { return localStorage.getItem(tickKey(it)) === '1'; } catch (e) { return false; } };

  // Stationen der Expedition: erledigt (✓), jetzt, kommend, am Ende die nächste Klassenarbeit
  function stations(d, today) {
    const out = [];
    const t = d.topics;
    if (t) {
      list(t.done).forEach(x => out.push({ kind: 'done', title: x.title }));
      if (t.now && t.now.title) {
        const of = Number(t.now.of) > 1 ? `Stunde ${t.now.unit} von ${t.now.of}, ` : '';
        out.push({ kind: 'now', title: t.now.title, sub: t.fromLessons ? 'Zuletzt im Unterricht' : `${of}hier seid ihr gerade` });
      }
      list(t.next).forEach(x => out.push({ kind: 'later', title: x.title }));
    }
    const boss = list(d.tests).filter(x => isDate(x.date) && x.date >= today)[0];
    if (boss) {
      const n = daysBetween(today, boss.date);
      out.push({ kind: 'boss', title: boss.text, sub: `${short(boss.date)}, ${n === 0 ? 'heute' : n === 1 ? 'morgen' : `noch ${n} Tage`}` });
    }
    return out;
  }
  function mapHTML(st) {
    const STEP = 76, X = [0, 34, 70, 34];
    const pos = st.map((s, i) => ({ s, x: X[i % X.length], y: i * STEP }));
    const size = s => (s.kind === 'boss' ? 46 : s.kind === 'now' ? 34 : 28);
    const pts = pos.map(p => [p.x + size(p.s) / 2, p.y + size(p.s) / 2]);
    let path = '';
    pts.forEach(([x, y], i) => {
      if (!i) { path = `M${x} ${y}`; return; }
      const [px, py] = pts[i - 1], my = (py + y) / 2;
      path += ` C ${px} ${my}, ${x} ${my}, ${x} ${y}`;
    });
    // Unten Platz für die Beschriftung der letzten Station (aktuelles Thema/Klassenarbeit haben bis zu drei Zeilen)
    const last = pos[pos.length - 1];
    const h = last ? last.y + (last.s.kind === 'now' || last.s.kind === 'boss' ? 92 : 48) : 0;
    return `<div class="map" style="height:${h}px">
      <svg class="path" width="160" height="${h}" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="1 7" stroke-linecap="round"/></svg>
      ${pos.map(p => `<div class="st ${p.s.kind}" style="top:${p.y}px;padding-left:${p.x}px">
        <div class="dot" aria-hidden="true">${p.s.kind === 'done' ? '✓' : p.s.kind === 'boss' ? '!' : ''}</div>
        <div class="lbl">${esc(p.s.title)}${p.s.sub ? `<small>${esc(p.s.sub)}</small>` : ''}</div></div>`).join('')}
    </div>`;
  }

  // Die Seite aus dem Auszug. `now` als Parameter (Regel 21), damit „heute“ testbar ist.
  function buildClassPage(d, now = new Date(), opts = {}) {
    const today = fmt(now);
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    let html = `<header><div class="class-name">${esc(d.cls || 'Klasse')}</div>`;
    const sub = [d.subject, d.teacher ? `bei ${d.teacher}` : ''].filter(Boolean).join(' ');
    if (sub) html += `<div class="class-sub">${esc(sub)}</div>`;
    html += '</header>';
    if (opts.offline) html += '<div class="banner">Offline: zuletzt geladener Stand</div>';

    let shown = 0;
    if (d.goal && Number(d.goal.target) > 0) {
      const target = Number(d.goal.target), count = Math.max(0, Number(d.goal.count) || 0);
      const pct = Math.min(100, Math.round(count / target * 100));
      const done = count >= target;
      html += `<h2>Klassenziel</h2><div class="card goal">
        <div class="t">${count} von ${target} Plussen</div>
        <div class="hl" role="img" aria-label="${count} von ${target} Plussen"><div class="hl-track"></div><div class="hl-fill" style="width:${pct}%"></div><div class="hl-text">${done ? 'geschafft' : `noch ${target - count}`}</div></div>
        ${d.goal.reward ? `<div class="r">${done ? 'Geschafft, es gibt' : 'Dann gibt es'}: <b>${esc(d.goal.reward)}</b></div>` : ''}
      </div>`;
      shown++;
    }
    const st = stations(d, today);
    if (st.length) {
      html += `<h2>Expedition</h2>${mapHTML(st)}`;
      shown++;
    }
    const hw = list(d.hw).filter(x => isDate(x.date) && x.date >= today);
    if (d.hw) {
      html += '<h2>Aufträge</h2>';
      html += hw.length ? hw.map((x, i) => {
        const on = ticked(x);
        return `<div class="quest${on ? ' is-done' : ''}"><button type="button" class="qbox" data-tick="${i}" aria-pressed="${on}" aria-label="Für dich abhaken: ${esc(x.text)}">${on ? '✓' : ''}</button>
          <div><div class="q">${esc(x.text)}</div><div class="d">bis ${esc(short(x.date))}, ${esc(rel(x.date, today))}</div></div></div>`;
      }).join('') : '<p class="empty" style="margin-top:0">Gerade nichts auf.</p>';
      shown++;
    }
    const tests = list(d.tests).filter(x => isDate(x.date) && x.date >= today);
    if (tests.length > 1) {
      html += '<h2>Weitere Termine</h2>' + tests.slice(1).map(x => `<div class="quest term"><div><div class="q"><span class="tag">Test</span>${esc(x.text)}</div>
        <div class="d">${esc(short(x.date))}, ${esc(rel(x.date, today))}</div></div></div>`).join('');
    }
    if (!shown) html += '<p class="empty">Gerade steht hier nichts. Schau später noch einmal rein.</p>';

    const next = list(d.next).find(n => isDate(n.date) && (n.date > today || (n.date === today && String(n.end) > hhmm)));
    const foot = [];
    if (next) foot.push(`Nächste Stunde: ${next.date === today ? 'heute' : long(next.date)} um ${esc(next.start)}${next.room ? ` in ${esc(next.room)}` : ''}.`);
    if (d.at) {
      const a = new Date(d.at);
      foot.push(`Stand: ${fmt(a) === today ? 'heute' : short(fmt(a))}, ${pad2(a.getHours())}:${pad2(a.getMinutes())}.`);
    }
    html += `<footer class="foot">${foot.map(f => `<p>${esc(f)}</p>`).join('')}
      <p class="muted">Hier steht nur, was deine Lehrkraft für die Klasse freigegeben hat. Keine Namen, keine Noten.</p></footer>`;
    return html;
  }

  let current = null;   // { data, offline } für Neuzeichnen und Abhaken
  function draw(data, opts = {}) {
    current = { data, opts };
    const page = document.getElementById('page');
    page.innerHTML = buildClassPage(data, new Date(), opts);
    document.title = [data.cls, data.subject].filter(Boolean).join(' ') || 'Klasse';
    const hw = list(data.hw).filter(x => isDate(x.date) && x.date >= fmt(new Date()));
    page.querySelectorAll('[data-tick]').forEach(b => b.addEventListener('click', () => {
      const it = hw[Number(b.dataset.tick)];
      if (!it) return;
      try { if (ticked(it)) localStorage.removeItem(tickKey(it)); else localStorage.setItem(tickKey(it), '1'); } catch (e) { /* privates Fenster */ }
      draw(current.data, current.opts);
    }));
  }
  function message(title, text, retry) {
    const page = document.getElementById('page');
    page.innerHTML = `<div class="msg"><h1>${esc(title)}</h1><p class="msg-text">${esc(text)}</p>${retry ? '<button type="button" id="retry">Noch einmal versuchen</button>' : ''}</div>`;
    if (retry) page.querySelector('#retry').addEventListener('click', () => load());
  }

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('Zeitüberschreitung'), { code: 'unavailable' })), ms))]);
  let loading = false;
  async function load() {
    if (loading) return;
    const access = StudentShare.parseHash(location.hash);
    if (!access) { message('Link unvollständig', 'Scanne den Code noch einmal oder frag deine Lehrkraft nach dem Link.'); return; }
    loading = true;
    const cacheKey = 'sa_cache_' + access.id;
    let doc = null, offline = false;
    try {
      if (typeof firebase === 'undefined' || typeof FIREBASE_CONFIG === 'undefined') throw Object.assign(new Error('Firebase fehlt'), { code: 'unavailable' });
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      const snap = await withTimeout(firebase.firestore().collection('shares').doc(access.id).get(), 12000);
      if (!snap.exists) {
        try { localStorage.removeItem(cacheKey); } catch (e) { /* egal */ }
        message('Gerade nicht freigegeben', 'Deine Lehrkraft hat diese Seite ausgeschaltet oder einen neuen Code erzeugt.');
        return;
      }
      doc = snap.data();
      try { localStorage.setItem(cacheKey, JSON.stringify(doc)); } catch (e) { /* voll oder privat */ }
    } catch (e) {
      if (e && e.code === 'permission-denied') {   // Regeln lassen das Lesen nicht zu: wie „nicht freigegeben“
        message('Gerade nicht freigegeben', 'Deine Lehrkraft hat diese Seite noch nicht freigeschaltet.');
        return;
      }
      try { doc = JSON.parse(localStorage.getItem(cacheKey)); } catch (x) { doc = null; }
      offline = true;
      if (!doc) { message('Keine Verbindung', 'Gerade kommt die Seite nicht durch. Versuch es gleich noch einmal.', true); return; }
    } finally {
      loading = false;
    }
    try {
      draw(await StudentShare.decrypt(doc, access.key), { offline });
    } catch (e) {
      if (e && e.name === 'ShareFormatError' && /neuere/.test(e.message)) message('Bitte neu laden', 'Diese Seite braucht eine neuere Version. Lade sie neu.', true);
      else message('Link passt nicht', 'Frag deine Lehrkraft nach dem aktuellen Code.');
    }
  }

  const preview = /[?&]vorschau\b/.test(location.search);
  // Vorschau im Planer: Inhalt kommt vom Planer, nichts wird geladen
  window.renderStudentPage = data => { if (data && typeof data === 'object') draw(data, {}); };
  window.SchuelerSeite = { buildClassPage, rel };
  if (preview) { message('Vorschau', 'Wird gleich gezeigt.'); return; }
  load();
  // Zurück in die App oder neuer Tag: frisch laden bzw. „heute/morgen“ neu rechnen
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  window.addEventListener('hashchange', () => load());
})();

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

  // Name der Lehrkraft im Satz „Mathe bei …“: „Herr X“ → „Herrn X“ (Dativ)
  const dativ = t => String(t || '').replace(/^Herr\s/, 'Herrn ');

  // Inhaltsverzeichnis (AJ5). Neuer Auszug: d.toc = { items: [{ title, state: done|now|later, unit, of, from, lessons: [{ date, text }] }],
  // fromLessons }. Ältere Planer schicken d.topics (AJ1) – das wird hier umgebaut (Regel 15).
  function tocOf(d) {
    if (d.toc && Array.isArray(d.toc.items)) return { items: d.toc.items.filter(x => x && x.title), fromLessons: !!d.toc.fromLessons };
    const t = d.topics;
    if (!t) return null;
    const items = [];
    list(t.done).forEach(x => items.push({ title: x.title, state: 'done', lessons: [] }));
    if (t.now && t.now.title) items.push({ title: t.now.title, state: 'now', unit: t.now.unit, of: t.now.of, lessons: [] });
    list(t.next).forEach(x => items.push({ title: x.title, state: 'later', lessons: [] }));
    return { items: items.filter(x => x.title), fromLessons: !!t.fromLessons };
  }
  // Klassenarbeiten stehen im Verzeichnis dort, wo sie im Stoff liegen: vor dem ersten Thema, das erst danach beginnt
  function tocRows(toc, tests) {
    const rows = toc.items.map(x => ({ kind: 'topic', x }));
    tests.forEach(test => {
      let at = rows.findIndex(r => r.kind === 'topic' && r.x.state === 'later' && isDate(r.x.from) && r.x.from > test.date);
      if (at < 0) at = rows.findIndex(r => r.kind === 'topic' && r.x.state === 'later' && !isDate(r.x.from));
      rows.splice(at < 0 ? rows.length : at, 0, { kind: 'test', x: test });
    });
    return rows;
  }
  const countdown = (date, today) => { const n = daysBetween(today, date); return n === 0 ? 'heute' : n === 1 ? 'morgen' : `noch ${n} Tage`; };
  const lessonsHTML = ls => `<ol class="lessons">${ls.map(l => `<li><span class="ld">${esc(short(l.date))}</span>
    <span class="lt">${esc(l.text).replace(/\n/g, '<br>')}</span></li>`).join('')}</ol>`;
  function topicRow(x, n, today) {
    const ls = list(x.lessons).filter(l => isDate(l.date) && l.text);
    const right = x.state === 'now' && Number(x.of) > 1 ? `${x.unit}/${x.of}` : Number(x.of) > 0 ? `${x.of} Std.` : ls.length ? `${ls.length} Std.` : '';
    const sub = x.state === 'now' ? (Number(x.of) > 1 ? `Stunde ${x.unit} von ${x.of}, hier seid ihr gerade` : 'hier seid ihr gerade')
      : x.state === 'later' && isDate(x.from) ? `ab ${short(x.from)}` : '';
    const head = `<span class="no">${n}</span><span class="tt"><span class="tx">${esc(x.title)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      <span class="lead" aria-hidden="true"></span><span class="pg">${esc(right)}</span>`;
    if (!ls.length) return `<div class="row ${x.state}">${head}</div>`;
    return `<details class="row ${x.state}"><summary>${head}</summary>
      <div class="more"><p class="more-h">Das habt ihr gemacht</p>${lessonsHTML(ls)}</div></details>`;
  }
  function testRow(x, today) {
    const topics = list(x.topics).filter(Boolean);
    return `<details class="row test"><summary><span class="no">!</span><span class="tt"><span class="tx">${esc(x.text)}</span>
      <small>${esc(countdown(x.date, today))}</small></span><span class="lead" aria-hidden="true"></span><span class="pg">${esc(short(x.date))}</span></summary>
      <div class="more"><div class="cd"><b>${Math.max(0, daysBetween(today, x.date))}</b><span>${daysBetween(today, x.date) === 1 ? 'Tag' : 'Tage'}<br>bis zur Arbeit</span></div>
      ${topics.length ? `<p class="more-h">Das kommt dran</p><ul class="chips">${topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <button type="button" class="cal" data-cal="${esc(x.date)}">In meinen Kalender</button></div></details>`;
  }
  // Ohne Planung: die letzten Stunden, jede mit dem, was behandelt wurde
  function lessonRows(toc) {
    const ls = toc.items.flatMap(x => list(x.lessons)).filter(l => isDate(l.date) && l.text);
    if (!ls.length) return '';
    return lessonsHTML(ls.slice().reverse());
  }

  // Klassenziel mit Stempelkarte (AJ6 c): eine Zelle je Stunde seit dem Start, darin die Plusse dieser Stunde
  function goalHTML(g, today) {
    const target = Number(g.target), count = Math.max(0, Number(g.count) || 0);
    const pct = Math.min(100, Math.round(count / target * 100));
    const done = count >= target;
    const stamps = list(g.stamps).filter(x => isDate(x.date));
    const best = stamps.reduce((m, x) => Math.max(m, Number(x.n) || 0), 0);
    const halfway = !done && count >= target / 2;
    const head = `<div class="t">${count} von ${target} Plussen</div>
      <div class="hl" role="img" aria-label="${count} von ${target} Plussen"><div class="hl-track"></div><div class="hl-fill" style="width:${pct}%"></div>
        <i class="mile" style="left:50%" aria-hidden="true"></i><div class="hl-text">${done ? 'geschafft' : `noch ${target - count}`}</div></div>
      ${g.reward ? `<div class="r">${done ? 'Geschafft, es gibt' : 'Dann gibt es'}: <b>${esc(g.reward)}</b></div>` : ''}`;
    if (!stamps.length) return `<div class="card goal">${head}</div>`;
    return `<details class="card goal"><summary>${head}<span class="open-hint">Stempelkarte</span></summary>
      <div class="more">
        <div class="stamps">${stamps.map(x => {
          const n = Number(x.n) || 0;
          return `<div class="stamp${n ? "" : " none"}${n && n === best ? ' best' : ''}" title="${esc(short(x.date))}: ${n}">
            <b>${n ? '+' + n : ''}</b><span>${esc(short(x.date).slice(3))}</span></div>`;
        }).join('')}</div>
        <p class="more-note">${halfway ? 'Halbzeit geschafft. ' : ''}${best ? `Beste Stunde: +${best}. ` : ''}Jede Stunde ein Stempel, darin die Plusse der ganzen Klasse.</p>
      </div></details>`;
  }

  // Kalender-Datei (AJ6 d): Termine als ganztägige Einträge, entsteht auf dem Handy, geht an keinen Server
  function icsFor(items, d) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const escI = t => String(t).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Unterrichtsplaner//Schuelerseite//DE', 'CALSCALE:GREGORIAN'];
    items.forEach((it, i) => {
      const day = it.date.replace(/-/g, ''), next = fmt(new Date(dateOf(it.date).getTime() + 864e5)).replace(/-/g, '');
      lines.push('BEGIN:VEVENT', `UID:${day}-${i}-${encodeURIComponent(it.text).slice(0, 40)}@unterrichtsplaner`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next}`, `SUMMARY:${escI([d.subject, it.text].filter(Boolean).join(': '))}`,
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${escI(it.text)}`, 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function saveIcs(items, d) {
    if (!items.length) return;
    const blob = new Blob([icsFor(items, d)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${[d.cls, d.subject].filter(Boolean).join(' ') || 'Termine'}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // Die Seite aus dem Auszug. `now` als Parameter (Regel 21), damit „heute“ testbar ist.
  function buildClassPage(d, now = new Date(), opts = {}) {
    const today = fmt(now);
    const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    let html = `<header><div class="class-name">${esc(d.cls || 'Klasse')}</div>`;
    const sub = [d.subject, d.teacher ? `bei ${dativ(d.teacher)}` : ''].filter(Boolean).join(' ');
    if (sub) html += `<div class="class-sub">${esc(sub)}</div>`;
    html += '</header>';
    if (opts.offline) html += '<div class="banner">Offline: zuletzt geladener Stand</div>';

    const tests = list(d.tests).filter(x => isDate(x.date) && x.date >= today);
    const hw = list(d.hw).filter(x => isDate(x.date) && x.date >= today);
    const toc = tocOf(d);
    let left = '', right = '', shown = 0;

    if (d.goal && Number(d.goal.target) > 0) { left += `<section><h2>Klassenziel</h2>${goalHTML(d.goal, today)}</section>`; shown++; }
    if (d.hw) {
      left += '<section><h2>Aufträge</h2>' + (hw.length ? hw.map((x, i) => {
        const on = ticked(x);
        return `<div class="quest${on ? ' is-done' : ''}"><button type="button" class="qbox" data-tick="${i}" aria-pressed="${on}" aria-label="Für dich abhaken: ${esc(x.text)}">${on ? '✓' : ''}</button>
          <div><div class="q">${esc(x.text)}</div><div class="d">bis ${esc(short(x.date))}, ${esc(rel(x.date, today))}</div></div></div>`;
      }).join('') : '<p class="empty" style="margin-top:0">Gerade nichts auf.</p>') + '</section>';
      shown++;
    }
    if (toc && (toc.items.length || tests.length)) {
      if (toc.fromLessons) {
        const rows = lessonRows(toc);
        right += `<section><h2>Zuletzt im Unterricht</h2>${rows ? `<div class="card toc">${rows}</div>` : '<p class="empty" style="margin-top:0">Noch nichts eingetragen.</p>'}</section>`;
        if (tests.length) right += `<section><h2>Klassenarbeit</h2><div class="card toc">${testRow(tests[0], today)}</div></section>`;
      } else {
        let n = 0;
        right += `<section><h2>Inhaltsverzeichnis</h2><div class="card toc">${tocRows(toc, tests.slice(0, 1)).map(r =>
          r.kind === 'test' ? testRow(r.x, today) : topicRow(r.x, ++n, today)).join('')}</div></section>`;
      }
      shown++;
    } else if (tests.length) {
      right += `<section><h2>Klassenarbeit</h2><div class="card toc">${testRow(tests[0], today)}</div></section>`;
      shown++;
    }
    const cal = [...tests.map(x => ({ date: x.date, text: x.text })), ...hw.map(x => ({ date: x.date, text: x.text }))];
    if (tests.length > 1 || cal.length) {
      right += '<section><h2>Termine</h2>' + tests.slice(1).map(x => `<div class="quest term"><div><div class="q"><span class="tag">Test</span>${esc(x.text)}</div>
        <div class="d">${esc(short(x.date))}, ${esc(rel(x.date, today))}</div></div></div>`).join('')
        + `<button type="button" class="cal wide" data-cal="all">Alle Termine in meinen Kalender</button></section>`;
    }
    if (!shown) html += '<p class="empty">Gerade steht hier nichts. Schau später noch einmal rein.</p>';
    else html += `<div class="spread"><div class="col">${left}</div><div class="col">${right}</div></div>`;

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

  // ── Persönliche Seite (AJ2): Reiter „Ich“ und „Klasse“ ──
  const PART = { excellent: ['++', 'pp'], positive: ['+', 'p'], neutral: ['−', 'm'], negative: ['−−', 'mm'] };
  let meTab = 'ich';   // nur Ansicht, nie gespeichert
  function meHead(d) {
    const sub = [d.subject, d.teacher ? `bei ${dativ(d.teacher)}` : ''].filter(Boolean).join(' ');
    return `<header class="me-top"><div><div class="class-name me-cls">${esc(d.cls || 'Klasse')}</div>${sub ? `<div class="class-sub">${esc(sub)}</div>` : ''}</div>
      <div class="tabs" role="tablist">${[['ich', 'Ich'], ['klasse', 'Klasse']].map(([k, l]) =>
        `<button type="button" role="tab" data-tab="${k}" aria-selected="${meTab === k}" class="${meTab === k ? 'on' : ''}">${l}</button>`).join('')}</div></header>`;
  }
  // Jahreskarte (AJ2c): ein Feld je Stunde, nach Monaten; Zahlen darunter. Längste Serie wie im Planer: Fehltag zählt nicht dagegen
  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const YR_WORD = { excellent: 'sehr gut', positive: 'gut', neutral: 'wenig', negative: 'schwach', a: 'gefehlt' };
  function yearMapHTML(cells) {
    if (!cells.length) return '';
    const months = [];
    cells.forEach(c => {
      const m = c.date.slice(0, 7);
      if (!months.length || months[months.length - 1].m !== m) months.push({ m, cells: [] });
      months[months.length - 1].cells.push(c);
    });
    let best = 0, run = 0;
    cells.forEach(c => { if (c.v === 'a') return; if (c.v === 'positive' || c.v === 'excellent') best = Math.max(best, ++run); else run = 0; });
    const plus = cells.filter(c => c.v === 'positive' || c.v === 'excellent').length;
    const cls = v => (PART[v] ? PART[v][1] : v === 'a' ? 'a' : 'none');
    return `<h2>Dein Schuljahr</h2><div class="yr">${months.map(mo => `<div class="yr-month"><span class="yr-m">${MONTHS[Number(mo.m.slice(5)) - 1]}</span>
        <span class="yr-cells">${mo.cells.map(c => `<i class="yr-c ${cls(c.v)}" title="${esc(short(c.date))}: ${esc(YR_WORD[c.v] || 'nichts eingetragen')}"></i>`).join('')}</span></div>`).join('')}</div>
      <div class="legend yr-legend">${[['pp', '++'], ['p', '+'], ['m', '−'], ['mm', '−−'], ['a', 'gefehlt'], ['none', 'nichts']].map(([c, l]) => `<span><i class="yr-c ${c}"></i>${l}</span>`).join('')}</div>
      <div class="yr-stats"><span><b>${cells.length}</b> Stunden</span><span><b>${plus}</b> mit Plus</span><span><b>${best}</b> längste Serie</span></div>`;
  }
  function buildMePage(d, now = new Date(), opts = {}) {
    const today = fmt(now);
    let html = meHead(d);
    if (opts.offline) html += '<div class="banner">Offline: zuletzt geladener Stand</div>';
    if (meTab === 'klasse') {
      const k = d.klasse && typeof d.klasse === 'object' ? d.klasse : null;
      // Klassenseite ohne ihren eigenen Kopf (der steht schon oben)
      return html + (k ? buildClassPage(k, now, opts).replace(/^<header>[\s\S]*?<\/header>/, '') : '<p class="empty">Die Klassenseite ist gerade nicht freigegeben.</p>');
    }
    const level = Math.max(1, Number(d.level) || 1), xp = Math.max(0, Number(d.xp) || 0);
    const from = Number(d.from) || 0, next = Number(d.next) || from + 10;
    const pct = Math.max(0, Math.min(100, Math.round((xp - from) / Math.max(1, next - from) * 100)));
    const j = d.jokers && typeof d.jokers === 'object' ? d.jokers : {};
    const jl = list(j.list).filter(Boolean);
    const left = `<div class="player"><div class="lvl" aria-label="Level ${level}"><small>Level</small><b>${level}</b></div>
        <div><div class="who">${esc(d.first || 'Ich')}</div><div class="rank">${d.rank ? `${esc(d.rank)} · ` : ''}${xp} XP</div></div></div>
      <div class="hl" role="img" aria-label="${xp - from} von ${next - from} XP bis Level ${level + 1}"><div class="hl-track"></div><div class="hl-fill" style="width:${pct}%"></div>
        <div class="hl-text"><span>noch ${Math.max(0, next - xp)} XP bis Level ${level + 1}</span></div></div>
      ${d.nextRank && d.nextRank.name ? `<p class="me-next">Ab Level ${esc(d.nextRank.level)}: <b>${esc(d.nextRank.name)}</b></p>` : ''}
      ${Number(d.streak) > 0 ? `<div class="card streak"><div class="n">${Number(d.streak)}</div><div class="t"><b>${Number(d.streak) === 1 ? 'Stunde' : 'Stunden'} in Folge mit Plus</b>Bleib dran.</div></div>` : ''}
      <div class="card joker">${Number(j.open) > 0
        ? `<div class="t"><b>${Number(j.open) === 1 ? 'Ein Joker' : `${Number(j.open)} Joker`} frei</b>Zeig diese Seite deiner Lehrkraft und such dir aus:</div>${jl.length ? `<ul>${jl.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`
        : `<div class="t"><b>Joker</b>${Number(j.earned) >= Number(j.max || 4) ? 'Alle Joker für dieses Schuljahr verdient.' : `Den nächsten gibt es bei Level ${(Math.floor(level / (Number(j.every) || 4)) + 1) * (Number(j.every) || 4)}.`}</div>`}</div>`;
    const fb = list(d.feedback).filter(x => x && isDate(x.date) && PART[x.v]);
    const right = `<h2>Rückmeldung <small>deine letzten Stunden</small></h2>
      ${fb.length ? `<div class="fb">${fb.map(x => `<div><div class="sp ${PART[x.v][1]}">${PART[x.v][0]}</div><small>${esc(short(x.date).slice(3))}</small></div>`).join('')}</div>
        <div class="legend"><span><b>++</b> sehr gut</span><span><b>+</b> gut</span><span><b>−</b> wenig</span><span><b>−−</b> schwach</span></div>`
        : '<p class="empty" style="margin-top:0">Noch keine Einträge in diesem Schuljahr.</p>'}
      ${yearMapHTML(list(d.year).filter(c => c && isDate(c.date)))}
      <p class="hint"><b>So bekommst du XP:</b> + gibt 10, ++ gibt 20. Abgezogen wird nie etwas.</p>`;
    html += `<div class="spread"><div class="col">${left}</div><div class="col">${right}</div></div>`;
    const foot = [];
    if (d.at) { const a = new Date(d.at); foot.push(`Stand: ${fmt(a) === today ? 'heute' : short(fmt(a))}, ${pad2(a.getHours())}:${pad2(a.getMinutes())}.`); }
    html += `<footer class="foot">${foot.map(f => `<p>${esc(f)}</p>`).join('')}<p class="muted">Diese Seite gehört nur dir. Gib den Link nicht weiter. Noten stehen hier nie.</p></footer>`;
    return html;
  }

  let current = null;   // { data, offline } für Neuzeichnen und Abhaken
  function draw(data, opts = {}) {
    current = { data, opts };
    const page = document.getElementById('page');
    const me = data.kind === 'me';
    page.innerHTML = me ? buildMePage(data, new Date(), opts) : buildClassPage(data, new Date(), opts);
    document.title = me ? `${data.first || 'Ich'} · ${data.cls || ''}`.trim() : [data.cls, data.subject].filter(Boolean).join(' ') || 'Klasse';
    page.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { meTab = b.dataset.tab; draw(current.data, current.opts); }));
    if (me) data = data.klasse && typeof data.klasse === 'object' ? data.klasse : {};   // Aufträge und Kalender: aus der Klassenseite
    const hw = list(data.hw).filter(x => isDate(x.date) && x.date >= fmt(new Date()));
    const today = fmt(new Date());
    const tests = list(data.tests).filter(x => isDate(x.date) && x.date >= today);
    page.querySelectorAll('[data-cal]').forEach(b => b.addEventListener('click', () => {
      const all = [...tests, ...hw].map(x => ({ date: x.date, text: x.text }));
      saveIcs(b.dataset.cal === 'all' ? all : all.filter(x => x.date === b.dataset.cal).slice(0, 1), data);
    }));
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
  window.SchuelerSeite = { buildClassPage, buildMePage, rel, icsFor, setMeTab: t => { meTab = t; } };
  if (preview) { message('Vorschau', 'Wird gleich gezeigt.'); return; }
  load();
  // Zurück in die App oder neuer Tag: frisch laden bzw. „heute/morgen“ neu rechnen
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  window.addEventListener('hashchange', () => load());
})();

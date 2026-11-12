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
  // until: nach „bis“ ohne „am“ („bis Freitag“, AT12)
  function rel(s, today, until = false) {
    const n = daysBetween(today, s);
    if (n === 0) return 'heute';
    if (n === 1) return 'morgen';
    if (n === 2) return 'übermorgen';
    if (n > 2 && n < 7) return `${until ? '' : 'am '}${DAYS[dateOf(s).getDay()]}`;
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
    // Nur bekannte Zustände: Der Wert landet als Klasse im HTML (AT1); Unbekanntes gilt als „später“
    const STATES = ['done', 'now', 'later'];
    if (d.toc && Array.isArray(d.toc.items)) return { items: d.toc.items.filter(x => x && x.title).map(x => STATES.includes(x.state) ? x : { ...x, state: 'later' }), fromLessons: !!d.toc.fromLessons };
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
  // Beim Aufklappen nur, was mehr sagt als der Titel: Zeilen, die nur den Titel wiederholen, fallen weg (Rückmeldung 09.11.)
  const sameText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  function topicRow(x, n, today) {
    const all = list(x.lessons).filter(l => isDate(l.date) && l.text);
    const ls = all.map(l => ({ date: l.date, text: String(l.text).split('\n').filter(line => line.trim() && !sameText(line, x.title)).join('\n') })).filter(l => l.text);
    const right = x.state === 'now' && Number(x.of) > 1 ? `${x.unit}/${x.of}` : Number(x.of) > 0 ? `${x.of} Std.` : all.length > 1 ? `${all.length} Std.` : '';
    const sub = x.state === 'now' ? (Number(x.of) > 1 ? `Stunde ${x.unit} von ${x.of}, hier seid ihr gerade` : 'hier seid ihr gerade')
      : x.state === 'later' && isDate(x.from) ? `ab ${short(x.from)}`
        : all.length === 1 && !ls.length ? `am ${short(all[0].date)}` : '';
    const head = `<span class="no">${n}</span><span class="tt"><span class="tx">${esc(x.title)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      <span class="lead" aria-hidden="true"></span><span class="pg">${esc(right)}</span>`;
    if (!ls.length) return `<div class="row ${esc(x.state)}">${head}</div>`;
    return `<details class="row ${esc(x.state)}"><summary>${head}</summary>
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
    const head = `<span class="t" aria-hidden="true">${count}<small>/${target}</small></span><span class="vh">${count} von ${target} Plussen</span>
      <div class="hl" role="img" aria-label="${count} von ${target} Plussen"><div class="hl-track"></div><div class="hl-fill" style="width:${pct}%"></div>
        <i class="mile" style="left:50%" aria-hidden="true"></i><div class="hl-text">${done ? 'geschafft' : `noch ${target - count}`}</div></div>
      ${g.reward ? `<div class="r">${done ? 'Geschafft, es gibt' : 'Dann gibt es'}: <b>${esc(g.reward)}</b></div>` : ''}`;
    if (!stamps.length) return `<div class="goal">${head}</div>`;
    return `<details class="goal"><summary>${head}<span class="open-hint">Stempelkarte</span></summary>
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
        'BEGIN:VALARM', 'TRIGGER:-PT6H', 'ACTION:DISPLAY', `DESCRIPTION:${escI(it.text)}`, 'END:VALARM', 'END:VEVENT');
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
    let html = '';
    if (!opts.noHead) {   // im Reiter „Klasse“ der persönlichen Seite steht der Kopf schon oben
      const sub = [d.subject, d.teacher ? `bei ${dativ(d.teacher)}` : ''].filter(Boolean).join(' ');
      html += `<header class="top"><div class="class-name">${esc(d.cls || 'Klasse')}</div>${sub ? `<div class="class-sub">${esc(sub)}</div>` : ''}</header>`;
      if (opts.offline) html += '<div class="banner">Offline: zuletzt geladener Stand</div>';
    }

    const tests = list(d.tests).filter(x => isDate(x.date) && x.date >= today);
    const hw = list(d.hw).filter(x => isDate(x.date) && x.date >= today);
    const toc = tocOf(d);
    // Farbflächen (AJ3l): Ziel Meerblau, Aufträge hell, Inhaltsverzeichnis auf Tinte, Termine Sand
    let body = '', shown = 0;

    if (d.goal && Number(d.goal.target) > 0) { body += `<section class="f f-sea"><h2>Klassenziel</h2>${goalHTML(d.goal, today)}</section>`; shown++; }
    if (d.hw) {
      body += '<section class="f f-paper"><h2>Aufträge</h2>' + (hw.length ? hw.map((x, i) => {
        const on = ticked(x);
        return `<div class="quest${on ? ' is-done' : ''}"><button type="button" class="qbox" data-tick="${i}" aria-pressed="${on}" aria-label="Für dich abhaken: ${esc(x.text)}">${on ? '✓' : ''}</button>
          <div><div class="q">${esc(x.text)}</div><div class="d">bis ${esc(short(x.date))}, ${esc(rel(x.date, today))}</div></div></div>`;
      }).join('') : '<p class="empty">Gerade nichts auf.</p>') + '</section>';
      shown++;
    }
    if (toc && (toc.items.length || tests.length)) {
      if (toc.fromLessons) {
        const rows = lessonRows(toc);
        body += `<section class="f f-ink"><h2>Zuletzt im Unterricht</h2>${rows ? `<div class="toc">${rows}</div>` : '<p class="empty">Noch nichts eingetragen.</p>'}</section>`;
        if (tests.length) body += `<section class="f f-ink"><h2>Klassenarbeit</h2><div class="toc">${testRow(tests[0], today)}</div></section>`;
      } else {
        let n = 0;
        body += `<section class="f f-ink"><h2>Inhaltsverzeichnis</h2><div class="toc">${tocRows(toc, tests.slice(0, 1)).map(r =>
          r.kind === 'test' ? testRow(r.x, today) : topicRow(r.x, ++n, today)).join('')}</div></section>`;
      }
      shown++;
    } else if (tests.length) {
      body += `<section class="f f-ink"><h2>Klassenarbeit</h2><div class="toc">${testRow(tests[0], today)}</div></section>`;
      shown++;
    }
    const cal = [...tests.map(x => ({ date: x.date, text: x.text })), ...hw.map(x => ({ date: x.date, text: x.text }))];
    if (tests.length > 1 || cal.length) {
      body += '<section class="f f-sand"><h2>Termine</h2>' + tests.slice(1).map(x => `<div class="quest term"><div><div class="q"><span class="tag">Test</span>${esc(x.text)}</div>
        <div class="d">${esc(short(x.date))}, ${esc(rel(x.date, today))}</div></div></div>`).join('')
        + `<button type="button" class="cal wide" data-cal="all">Alle Termine in meinen Kalender</button></section>`;
    }
    html += shown ? body : '<section class="f f-ink"><p class="empty">Gerade steht hier nichts. Schau später noch einmal rein.</p></section>';

    const next = list(d.next).find(n => isDate(n.date) && (n.date > today || (n.date === today && String(n.end) > hhmm)));
    const foot = [];
    // Die Zeile wird unten als Ganzes umgewandelt (esc(f)), hier also roh einsetzen – sonst „Musik &amp; Kunst“ (AT10)
    if (next) foot.push(`Nächste Stunde: ${next.date === today ? 'heute' : long(next.date)} um ${next.start}${next.room ? ` in ${next.room}` : ''}.`);
    if (d.at) {
      const a = new Date(d.at);
      foot.push(`Stand: ${fmt(a) === today ? 'heute' : short(fmt(a))}, ${pad2(a.getHours())}:${pad2(a.getMinutes())}.`);
    }
    html += `<footer class="foot">${foot.map(f => `<p>${esc(f)}</p>`).join('')}
      <p class="muted">Hier steht nur, was deine Lehrkraft für die Klasse freigegeben hat. Keine Namen, keine Noten.</p></footer>`;
    return html;
  }

  // ── Persönliche Seite (AJ2): Reiter „Ich“, „Sammlung“ und „Klasse“ (AJ3b: weniger auf einmal) ──
  const PART = { excellent: ['++', 'pp'], positive: ['+', 'p'], neutral: ['−', 'm'], negative: ['−−', 'mm'] };
  let meTab = 'ich';   // nur Ansicht, nie gespeichert
  // Plus-Konto (AV1): nur in Auszügen neuerer Planer; ältere schicken Joker (Regel 15)
  const accountOf = d => (d && d.account && typeof d.account === 'object' ? d.account : null);
  function meHead(d) {
    const sub = [d.subject, d.teacher ? `bei ${dativ(d.teacher)}` : ''].filter(Boolean).join(' ');
    const head = [d.cls, sub].filter(Boolean).join(' ');   // „7b Mathematik bei Herrn …“ klein, die Reiter groß (AJ3l)
    const tabs = [['ich', 'Ich'], ['sammlung', 'Sammlung'], ['klasse', 'Klasse'], ...(accountOf(d) ? [['shop', 'Shop']] : [])];
    return `<header class="me-top">${head ? `<div class="class-sub">${esc(head)}</div>` : ''}
      <div class="tabs${tabs.length > 3 ? ' four' : ''}" role="tablist">${tabs.map(([k, l]) =>
        `<button type="button" role="tab" data-tab="${k}" aria-selected="${meTab === k}"${meTab === k ? ' class="on"' : ''}>${l}</button>`).join('')}</div></header>`;
  }
  // Jahreskarte (AJ2c): ein Feld je Stunde, nach Monaten; Zahlen darunter. Längste Serie wie im Planer: Fehltag zählt nicht dagegen
  const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  // Fehltage zeigt die Seite nie (AT8): ältere Planer schickten noch „a“, das erscheint wie „nichts eingetragen“
  const YR_WORD = { excellent: 'sehr gut', positive: 'gut', neutral: 'wenig', negative: 'schwach' };
  function yearMapHTML(cells, extra = '', bestFromPlanner) {
    if (!cells.length) return extra ? `<section class="f f-ink"><h2>Dein Schuljahr</h2>${extra}</section>` : '';
    const months = [];
    cells.forEach(c => {
      const m = c.date.slice(0, 7);
      if (!months.length || months[months.length - 1].m !== m) months.push({ m, cells: [] });
      months[months.length - 1].cells.push(c);
    });
    let best = 0, run = 0;
    cells.forEach(c => { if (c.v === 'a') return; if (c.v === 'positive' || c.v === 'excellent') best = Math.max(best, ++run); else run = 0; });
    if (Number.isInteger(bestFromPlanner) && bestFromPlanner >= 0) best = bestFromPlanner;   // zählt Fehltage nicht mit, ohne sie zu nennen
    const plus = cells.filter(c => c.v === 'positive' || c.v === 'excellent').length;
    const cls = v => (PART[v] ? PART[v][1] : 'none');
    return `<section class="f f-ink"><h2>Dein Schuljahr</h2><div class="yr">${months.map(mo => `<div class="yr-month"><span class="yr-m">${MONTHS[Number(mo.m.slice(5)) - 1]}</span>
        <span class="yr-cells">${mo.cells.map(c => `<i class="yr-c ${cls(c.v)}" title="${esc(short(c.date))}: ${esc(YR_WORD[c.v] || 'nichts eingetragen')}"></i>`).join('')}</span></div>`).join('')}</div>
      <div class="legend yr-legend">${[['pp', '++'], ['p', '+'], ['m', '−'], ['mm', '−−'], ['none', 'nichts']].map(([c, l]) => `<span><i class="yr-c ${c}"></i>${l}</span>`).join('')}</div>
      <div class="yr-stats"><span><b>${cells.length}</b> Stunden</span><span><b>${plus}</b> mit Plus</span><span><b>${best}</b> längste Serie</span></div>${extra}</section>`;
  }
  // Sticker und Baustelle (AJ2b). Symbole und Farben aus student-share.js, Unbekanntes als Stern.
  const stk = (icon, color, rot) => `<span class="s" style="--stk:${esc(StudentShare.stickerColor(color))};transform:rotate(${rot}deg)">${StudentShare.stickerSvg(icon)}</span>`;
  const ROT = [-6, 3, -3, 5, -2, 4];
  function bauHTML(d) {
    const b = d.bau && typeof d.bau === 'object' && d.bau.text ? d.bau : null;
    if (!b) return '';
    return `<section class="card f f-paper bau">
      <p class="k">Deine Baustelle${isDate(b.since) ? ` seit ${esc(short(b.since).slice(3))}` : ''}</p>
      <div class="bt">${esc(b.text)}</div>
      <p class="r">Schaffst du sie, gibt es den Sticker „Baustelle geschafft“ und ${Number(d.bauXP) || 0} XP.</p></section>`;
  }
  function giftsHTML(d) {
    const gifts = list(d.gifts).filter(x => x && x.name && isDate(x.date)).slice(0, 6);
    if (!gifts.length) return '';
    return `<section class="f f-sea"><h2>Von ${esc(dativ(d.giver || 'deiner Lehrkraft'))}</h2><div class="gifts">` + gifts.map((x, i) => `<div class="gift">${stk(x.icon, x.color, ROT[i % ROT.length])}
      <div><b>${esc(x.name)}</b>${x.reason ? `<div class="q">„${esc(x.reason)}“</div>` : ''}<div class="d">${esc(short(x.date).slice(3))}${Number(x.xp) ? `, +${Number(x.xp)} XP` : ''}</div></div></div>`).join('') + '</div></section>';
  }
  function albumHTML(d) {
    const got = list(d.album).filter(x => x && x.name), locked = list(d.locked).filter(x => x && x.name);
    if (!got.length && !locked.length) return '';
    // Was die Lehrkraft geschenkt hat, steht schon oben mit Grund (AJ3j: nicht doppelt); gezählt wird trotzdem alles
    const given = new Set(list(d.gifts).filter(x => x && x.name).map(x => x.name + '|' + x.icon));
    const rest = got.filter(x => !given.has(x.name + '|' + x.icon));
    if (!rest.length && !locked.length) return `<section class="f f-paper"><h2>Sticker <small>${got.length} gesammelt</small></h2></section>`;
    return `<section class="f f-paper"><h2>Sticker <small>${got.length} gesammelt</small></h2><div class="album">${rest.map((x, i) => `<div class="stk">${stk(x.icon, x.color, ROT[i % ROT.length])}<b>${esc(x.name)}</b></div>`).join('')}
      ${locked.map(x => `<div class="stk locked"><span class="s">${StudentShare.stickerSvg(x.icon)}</span><b>${esc(x.name)}</b>${esc(x.hint || '')}</div>`).join('')}</div></section>`;
  }
  // Belohnungen (AJ3l, ersetzt AJ3b): alle zwei Level ab Level 3 eine neue Leuchtfarbe für die Level-Fläche.
  // Was der Schüler wählt, speichert nur sein Handy (localStorage), nie die Lehrkraft oder die Cloud.
  // Eigener Schlüssel `sa_farbe_<id>`: Wahlen aus der Heft-Zeit (`sa_look_…`) fallen still weg.
  const COLORS = { aqua: ['Aqua', 'oklch(85% 0.13 195)'], sand: ['Sand', 'oklch(86% 0.08 80)'], koralle: ['Koralle', 'oklch(76% 0.13 30)'],
    mint: ['Mint', 'oklch(88% 0.12 160)'], sonne: ['Sonne', 'oklch(90% 0.15 95)'], himmel: ['Himmel', 'oklch(84% 0.08 235)'],
    rosa: ['Rosa', 'oklch(86% 0.08 10)'], limette: ['Limette', 'oklch(90% 0.18 125)'], pfirsich: ['Pfirsich', 'oklch(85% 0.09 55)'] };
  const REWARDS = [
    { level: 3, id: 'sand' }, { level: 5, id: 'koralle' }, { level: 7, id: 'mint' }, { level: 9, id: 'sonne' },
    { level: 11, id: 'himmel' }, { level: 13, id: 'rosa' }, { level: 15, id: 'limette' }, { level: 17, id: 'pfirsich' },
  ].map(r => ({ ...r, name: COLORS[r.id][0] }));
  // Ränge in Rangfarben (Wunsch 09.11.): alle 2 Level eine Stufe, wie im Planer (rankIndex)
  const TIERS = [['bronze', 'Bronze'], ['silver', 'Silber'], ['gold', 'Gold'], ['platinum', 'Platin'], ['diamond', 'Diamant']];
  const tierOf = level => Math.min(4, Math.floor((Math.max(1, level) - 1) / 2));
  // Rang als Tintenstempel (AJ3j): Kreis in Rangfarbe wie ein Lehrerstempel; lange Namen schmaler (Archivo hat eine Breiten-Achse)
  const rankName = (tier, name) => String(name || TIERS[tier][1]);
  const rankStamp = (tier, name) => `<span class="rank-stamp t-${TIERS[tier][0]}" title="Rang"><i aria-hidden="true"></i>${esc(rankName(tier, name))}</span>`;
  const rankInk = (tier, name) => `<span class="rank-ink t-${TIERS[tier][0]}">${esc(rankName(tier, name))}</span>`;
  const pageKey = () => { const a = StudentShare.parseHash(location.hash); return a ? a.id : 'vorschau'; };
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat: dann eben nicht gemerkt */ } };
  const colorOptions = level => [{ id: 'aqua', name: COLORS.aqua[0], level: 1 }, ...REWARDS].map(o => ({ ...o, open: level >= o.level }));
  // Gewählte Farbe; nicht (mehr) freigeschaltete Wahl fällt auf Aqua zurück (z. B. Level nach Korrektur gesunken)
  function colorFor(level) {
    const saved = lsGet('sa_farbe_' + pageKey());
    const o = colorOptions(level).find(x => x.id === saved && x.open);
    return o ? o.id : 'aqua';
  }
  const newestReward = level => REWARDS.filter(r => level >= r.level).pop() || null;
  function newRewardHTML(level) {
    const r = newestReward(level);
    if (!r || (Number(lsGet('sa_seen_' + pageKey())) || 0) >= r.level) return '';
    return `<section class="f f-paper newrw"><p class="t"><b>Neue Farbe: ${esc(r.name)}</b>Färb deine Level-Fläche in der Sammlung.</p>
      <button type="button" class="go" data-tab="sammlung">Aussuchen</button></section>`;
  }
  function rewardsHTML(level) {
    const cur = colorFor(level);
    const next = REWARDS.find(r => level < r.level);
    return `<section class="f f-sig"><h2>Deine Farbe <small>${next ? `nächste bei Level ${next.level}` : 'alle freigeschaltet'}</small></h2><p class="tall">Färb deine Seite</p>
      <div class="rw-opts">${colorOptions(level).filter(o => o.open).map(o =>
        `<button type="button" class="rw${cur === o.id ? ' on' : ''}" data-look="color" data-val="${o.id}" aria-pressed="${cur === o.id}" style="--sw:${COLORS[o.id][1]}"><i aria-hidden="true"></i>${esc(o.name)}</button>`).join('')}</div>
      ${next ? `<div class="rw locked" aria-label="Als Nächstes: ${esc(next.name)} ab Level ${next.level}" style="--sw:${COLORS[next.id][1]}"><i aria-hidden="true"></i>${esc(next.name)} <small>ab Level ${next.level}</small></div>` : ''}
      <p class="me-line">Bleibt nur auf deinem Handy.</p></section>`;
  }
  function jokerInfoHTML(d, level) {
    const j = d.jokers && typeof d.jokers === 'object' ? d.jokers : {};
    const every = Number(j.every) || 4, max = Number(j.max || 4);
    const text = Number(j.earned) >= max ? 'Alle Joker für dieses Schuljahr verdient.' : `Den nächsten gibt es bei Level ${(Math.floor(level / every) + 1) * every}.`;
    return `<section class="f f-mist"><h2>Joker <small>${Number(j.used) || 0} eingelöst</small></h2><p class="me-line">${Number(j.open) > 0 ? `<b>${Number(j.open)} frei.</b> ` : ''}${esc(text)}</p></section>`;
  }
  // Rückmeldung (AJ3g): Reihe von Stempeln, auf Wunsch alle des Schuljahrs nach Monaten (neueste oben), darunter Zählung je Stufe
  let fbAll = false;   // nur Ansicht, nie gespeichert
  const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  let fbToday = '';   // beim Zeichnen gesetzt: Datum von heute für die Markierung „heute“
  const fbRow = items => `<div class="fb">${items.map(x => `<div${x.date === fbToday ? ' class="today"' : ''}><div class="sp ${PART[x.v][1]}">${PART[x.v][0]}</div><small>${esc(short(x.date).slice(3))}</small></div>`).join('')}</div>`;
  function fbAllHTML(items) {
    const months = [];
    items.forEach(x => {
      const m = x.date.slice(0, 7);
      if (!months.length || months[months.length - 1].m !== m) months.push({ m, items: [] });
      months[months.length - 1].items.push(x);
    });
    return `<div class="fb-all">${months.reverse().map(mo => `<div class="fb-month"><h4>${MONTHS_LONG[Number(mo.m.slice(5)) - 1]} ${mo.m.slice(0, 4)}</h4>${fbRow(mo.items)}</div>`).join('')}</div>`;
  }
  function fbStatsHTML(items) {
    const n = v => items.filter(x => x.v === v).length;
    return `<div class="fb-stats"><div class="fs-k">Dieses Schuljahr</div><div class="fs-row">${[['excellent', 'sehr gut'], ['positive', 'gut'], ['neutral', 'wenig'], ['negative', 'schwach']]
      .map(([v, w]) => `<div class="fs"><b>${n(v)}×</b> <span class="sp ${PART[v][1]}">${PART[v][0]}</span> <small>${w}</small></div>`).join('')}</div></div>`;
  }
  // „Als Nächstes“ (AJ3i): was ein Schüler nach der Stunde wissen will, ganz oben in „Ich“. Gleiche Regeln wie die Klassenseite
  // (offene Aufgabe = nicht für sich abgehakt). Antippen führt zum Reiter „Klasse“.
  function soonHTML(k, now) {
    if (!k || typeof k !== 'object') return '';
    const today = fmt(now), hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const rows = [];
    const hw = list(k.hw).filter(x => x && isDate(x.date) && x.date >= today && x.text && !ticked(x)).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (hw) rows.push(['Aufgabe', esc(hw.text), `bis ${esc(rel(hw.date, today, true))}`]);
    const nx = list(k.next).find(n => n && isDate(n.date) && (n.date > today || (n.date === today && String(n.end) > hhmm)));
    if (nx) rows.push(['Stunde', `${esc(rel(nx.date, today) === 'heute' ? 'heute' : short(nx.date))}, ${esc(nx.start)}`, nx.room ? `in ${esc(nx.room)}` : '']);
    const t = list(k.tests).filter(x => x && isDate(x.date) && x.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!rows.length && !t) return '';
    // Die nächste Arbeit als große Zahl (AJ3l): Tage bis dahin, heute/morgen als Wort
    let count = '';
    if (t) {
      const n = daysBetween(today, t.date);
      count = `<span class="soon-count">${n === 0 ? '<span class="huge word">Heute</span>' : `<span class="huge">${n}</span>`}
        <span class="t">${n === 0 ? 'ist die Arbeit' : n === 1 ? 'Tag bis zur Arbeit' : 'Tage bis zur Arbeit'}<br>${esc(t.text || 'Test')}</span></span>`;
    }
    return `<button type="button" class="soon f f-sand" data-tab="klasse"><span class="soon-h">Als Nächstes</span>${count}
      ${rows.length ? `<span class="soon-rows">${rows.map(([kind, what, when]) =>
        `<span class="soon-r"><span class="soon-k">${kind}</span><span class="soon-v">${what}${when ? `<small>${when}</small>` : ''}</span></span>`).join('')}</span>` : ''}
      <span class="soon-go">Zur Klasse</span></button>`;
  }
  // Lange Vornamen kleiner statt mitten im Wort umbrechen (neben dem Stempel ist wenig Platz)
  const nameSize = n => { const l = String(n || '').length; return l > 12 ? ' xlong' : l > 8 ? ' long' : ''; };
  function buildMePage(d, now = new Date(), opts = {}) {
    const today = fmt(now);
    fbToday = today;
    const acc = accountOf(d);
    if (meTab === 'shop' && !acc) meTab = 'ich';
    let html = meHead(d);
    if (opts.offline) html += '<div class="banner">Offline: zuletzt geladener Stand</div>';
    if (meTab === 'klasse') {
      const k = d.klasse && typeof d.klasse === 'object' ? d.klasse : null;
      return html + (k ? buildClassPage(k, now, { ...opts, noHead: true }) : '<section class="f f-ink"><p class="empty">Die Klassenseite ist gerade nicht freigegeben.</p></section>');
    }
    const level = Math.max(1, Number(d.level) || 1), xp = Math.max(0, Number(d.xp) || 0);
    const from = Number(d.from) || 0, next = Number(d.next) || from + 10;
    const pct = Math.max(0, Math.min(100, Math.round((xp - from) / Math.max(1, next - from) * 100)));
    const foot = [];
    if (d.at) { const a = new Date(d.at); foot.push(`Stand: ${fmt(a) === today ? 'heute' : short(fmt(a))}, ${pad2(a.getHours())}:${pad2(a.getMinutes())}.`); }
    const footer = `<footer class="foot">${foot.map(f => `<p>${esc(f)}</p>`).join('')}<p class="muted">Diese Seite gehört nur dir. Gib den Link nicht weiter. Noten stehen hier nie.</p></footer>`;
    const j = d.jokers && typeof d.jokers === 'object' ? d.jokers : {};
    if (meTab === 'shop') return html + shopHTML(acc, d.klasse) + footer;
    if (meTab === 'sammlung') {
      const rv = reviewOf(d);
      const again = rv ? `<button type="button" class="link" data-review>Rückblick ${esc(rv.label)} ansehen</button>` : '';
      return html + giftsHTML(d) + albumHTML(d) + yearMapHTML(list(d.year).filter(c => c && isDate(c.date)), again, d.yearBest) + rewardsHTML(level) + (acc ? '' : jokerInfoHTML(d, level)) + footer;
    }
    // Reiter „Ich“ (AJ3l): Level-Fläche ganz oben, gleich darunter die letzten Stunden, dann Als Nächstes, Baustelle, Joker
    const jl = list(j.list).filter(Boolean);
    const tier = tierOf(level);
    const hero = `<section class="card f f-sig hero"><p class="k">Dein Level</p>
      <div class="lvl-row"><div class="lvl" aria-label="Level ${level}"><small>Level</small><b${level >= 10 ? ' class="two"' : ''}>${level}</b></div>
        <div class="who-box"><p class="who${nameSize(d.first)}">${esc(d.first || 'Ich')}</p>${rankStamp(tier, d.rank)}</div></div>
      <div class="xpbar" role="img" aria-label="${xp - from} von ${next - from} XP bis Level ${level + 1}"><i style="width:${pct}%"></i></div>
      <p class="xpl"><span><b>${xp} XP</b>, noch ${Math.max(0, next - xp)} XP bis Level ${level + 1}</span>${Number(d.streak) > 0 ? `<span><b>${Number(d.streak)}</b> ${Number(d.streak) === 1 ? 'Stunde' : 'Stunden'} in Folge mit Plus</span>` : ''}</p>
      <div class="rank-row">${tier < 4 ? `Ab Level ${2 * (tier + 1) + 1}: ${rankInk(tier + 1, d.nextRank && d.nextRank.name)}` : 'Höchster Rang erreicht'}
        <details class="xp-help"><summary>Wie funktioniert das?</summary>
          <p>+ gibt 10 XP, ++ gibt 20${d.giver ? `. Sticker von ${esc(dativ(d.giver))} und` : '. Sticker und'} geschaffte Baustellen bringen extra. Abgezogen wird nie etwas.</p>
          ${acc ? '<p>Alle 2 Level steigt dein Rang. Deine Plusse kannst du außerdem im Shop einlösen: + ist 1 Plus wert, ++ sind 2. XP und Level bleiben dabei.</p>'
            : `<p>Alle 2 Level steigt dein Rang, alle ${Number(j.every) || 4} Level gibt es einen Joker.</p>`}</details></div></section>`;
    const fbAllList = list(d.feedback).filter(x => x && isDate(x.date) && PART[x.v]).sort((a, b) => a.date.localeCompare(b.date));
    const fbHTML = `<section class="f f-ink"><h2>${fbAll ? 'Rückmeldung <small>dieses Schuljahr</small>' : 'Letzte Stunden'}</h2>
      ${fbAllList.length ? `${fbAll ? fbAllHTML(fbAllList) : fbRow(fbAllList.slice(-6))}
        ${fbAll ? fbStatsHTML(fbAllList) : ''}
        <button type="button" class="fb-more" data-fb-all aria-expanded="${fbAll}">${fbAll ? 'Weniger anzeigen' : `Alle anzeigen (${fbAllList.length})`}</button>`
        : '<p class="empty">Noch keine Einträge in diesem Schuljahr.</p>'}</section>`;
    const joker = Number(j.open) > 0 ? `<section class="card f f-mist joker"><p class="k">${Number(j.open) === 1 ? 'Ein Joker frei' : `${Number(j.open)} Joker frei`}</p>
      <p class="tall">Such dir einen aus</p>${jl.length ? `<ul>${jl.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<p class="sub">Zeig das deiner Lehrkraft.</p></section>` : '';
    return html + hero + fbHTML + reviewStripHTML(reviewOf(d)) + soonHTML(d.klasse, now) + bauHTML(d) + (acc ? acctHTML(acc) : joker) + newRewardHTML(level) + footer;
  }

  // ── Plus-Konto und Shop (AV1): wie ein Item-Shop aus Spielen, in den Farben der Seite. Der Planer schickt Kontostand,
  // Laden und die eigenen Einlösungen; eingelöst wird bei der Lehrkraft (die Seite selbst kann nichts schreiben). ──
  const RARITY = p => (p >= 6 ? ['r-legend', 'Legendär'] : p >= 4 ? ['r-epic', 'Episch'] : p >= 3 ? ['r-rare', 'Selten'] : ['r-common', 'Gewöhnlich']);
  const coin = () => `<span class="coin" aria-hidden="true">${StudentShare.stickerSvg('plus')}</span>`;
  const plusWord = n => (n === 1 ? '1 Plus' : `${n} Plusse`);
  const shopItems = acc => list(acc.shop).filter(x => x && x.name && Number(x.price) > 0).map(x => ({ ...x, price: Math.round(Number(x.price)) }));
  const shopGoal = k => (k && typeof k === 'object' && k.goal && Number(k.goal.target) > 0 ? k.goal : null);
  function acctHTML(acc) {
    const bal = num(acc.balance);
    return `<button type="button" class="card f f-mist acct" data-tab="shop"><span class="k">Dein Konto</span>
      <span class="acct-row"><span class="huge">${bal}</span><span class="t">${bal === 1 ? 'Plus' : 'Plusse'}<br>zum Einlösen</span></span><span class="go">Zum Shop</span></button>`;
  }
  function shopCard(x, i, bal, hl, waiting) {
    const [cls, tier] = RARITY(x.price), need = x.price - bal;
    const inner = `<span class="tier">${tier}</span><span class="ic">${StudentShare.stickerSvg(x.icon)}</span><span class="name">${esc(x.name)}</span>
      <span class="price">${need > 0 ? `noch ${plusWord(need)}` : `${coin()}${x.price}<span class="vh"> Plusse</span>`}</span>
      ${waiting && need <= 0 ? '<span class="shop-wait">Wartet auf Bestätigung</span>' : ''}`;
    const c = `shop-item ${cls}${hl ? ' shop-hl' : ''}${need > 0 ? ' locked' : ''}`;
    return need > 0 ? `<div class="${c}">${inner}</div>` : `<button type="button" class="${c}" data-buy="${i}">${inner}</button>`;
  }
  function shopHTML(acc, klasse) {
    const bal = num(acc.balance), spent = num(acc.spent);
    const items = shopItems(acc);
    const waits = waitList(acc);
    const waiting = x => waits.some(w => w.item === x.id && w.n === x.price);
    const top = items.reduce((b, x, i) => (b < 0 || x.price > items[b].price ? i : b), -1);   // Highlight: das teuerste
    let html = `<section class="f-ink shop-bal"><p class="k">Dein Konto</p><div class="shop-num">${coin()}<span>${bal}</span></div>
      <p class="shop-rule">+ ist 1 Plus wert · ++ sind 2${spent ? ` · ${spent} schon eingelöst` : ''}</p>
      ${isDate(acc.since) ? `<p class="shop-rule">Plusse zählen ab ${esc(short(acc.since))}</p>` : ''}</section>`;
    if (top < 0) html += '<p class="shop-empty">Gerade gibt es nichts im Shop.</p>';
    else {
      html += `<h2 class="shop-h">Highlight</h2>${shopCard(items[top], top, bal, true, waiting(items[top]))}`;
      const rest = items.map((x, i) => [x, i]).filter(([, i]) => i !== top);
      if (rest.length) html += `<h2 class="shop-h">Im Shop</h2><div class="shop-grid">${rest.map(([x, i]) => shopCard(x, i, bal, false, waiting(x))).join('')}</div>`;
    }
    const g = shopGoal(klasse);
    if (g) {
      const target = Number(g.target), count = num(g.count), donated = num(g.donated);
      html += `<section class="f f-sea shop-give"><h2>Für die Klasse spenden</h2>
        <p class="shop-goal">${count} von ${target} Plussen${g.reward ? `, dann gibt es: <b>${esc(g.reward)}</b>` : ''}.</p>
        <p class="shop-goal">Gespendete Plusse zählen noch einmal${donated ? `, ${donated} schon gespendet` : ''}.</p>
        ${waits.filter(w => w.item === 'donate').map(w => `<p class="shop-wait">Spende von ${w.n === 1 ? '1 Plus' : `${w.n} Plussen`}: wartet auf Bestätigung</p>`).join('')}
        <div class="shop-bar" role="img" aria-label="${count} von ${target} Plussen"><i style="width:${Math.min(100, Math.round(count / target * 100))}%"></i></div>
        <div class="shop-chips">${[1, 3, 5, 10].map(n => `<button type="button" data-donate="${n}"${n > bal ? ' disabled' : ''}>${coin()}${n}<span class="vh"> ${n === 1 ? 'Plus' : 'Plusse'} spenden</span></button>`).join('')}</div></section>`;
    }
    const done = list(acc.redeemed).filter(r => r && r.name && isDate(r.date)).sort((a, b) => b.date.localeCompare(a.date));
    if (done.length) {
      html += `<h2 class="shop-h">Eingelöst</h2><ul class="shop-done">${done.map(r => `<li><span class="ic">${StudentShare.stickerSvg(r.kind === 'donate' ? 'heart' : r.icon)}</span>
        <b>${esc(r.name)}</b><small>${esc(short(r.date))}</small>${num(r.price) ? `<span class="minus">−${num(r.price)}</span>` : ''}</li>`).join('')}</ul>`;
    }
    return html;
  }
  // Einlöse-Codes, die dieses Handy gezeigt hat (AV1 Stufe 2): „wartet auf Bestätigung“, bis der Auszug die Einmal-Nummer
  // enthält (die Lehrkraft hat gescannt) oder WAIT_MS vorbei sind. Nur auf diesem Handy, nie in der Cloud.
  const WAIT_MS = 6 * 3600e3;
  const waitKey = () => 'sa_wait_' + pageKey();
  function waitList(acc) {
    const done = new Set(list(acc && acc.redeemed).map(r => r && r.nonce).filter(Boolean));
    const now = Date.now();
    const all = list(lsGet(waitKey()));
    const keep = all.filter(w => w && w.nonce && w.item && Number.isInteger(w.n) && now - Number(w.at) < WAIT_MS && !done.has(w.nonce));
    if (keep.length !== all.length) lsSet(waitKey(), keep);
    return keep;
  }
  // Kauf-Bildschirm: ganze Seite in der Farbe der Seltenheit mit dem Code zum Zeigen. Eingelöst wird bei der Lehrkraft.
  let buy = null;   // { el, opener, onKey, again } – nur Ansicht
  function closeBuy() {
    if (!buy) return;
    document.removeEventListener('keydown', buy.onKey);
    buy.el.remove();
    document.documentElement.classList.remove('story-open');
    const { opener, again } = buy;
    buy = null;
    if (again && current) {   // neu zeichnen („wartet auf Bestätigung“), dann den Fokus auf dieselbe Karte
      draw(current.data, current.opts);
      const back = document.querySelector(again);
      if (back) back.focus();
    } else if (opener && document.contains(opener)) opener.focus();
  }
  async function fillCode(el, acc, item, n) {
    const box = el.querySelector('.shop-qr');
    const access = StudentShare.parseHash(location.hash);
    if (!access) { box.innerHTML = '<p class="shop-qr-note">Vorschau: Hier steht beim Schüler sein Code.</p>'; return; }
    let code = null;
    try {
      const prev = waitList(acc).find(w => w.item === item && w.n === n);
      code = await StudentShare.plusCode(access, item, n, prev ? prev.nonce : undefined);
      if (code && !prev) lsSet(waitKey(), [...waitList(acc), { nonce: code.nonce, item, n, at: Date.now() }]);
    } catch (e) { code = null; }
    if (!buy || buy.el !== el) return;   // inzwischen geschlossen
    if (!code || typeof qrcode !== 'function') { box.innerHTML = '<p class="shop-qr-note">Der Code geht gerade nicht. Deine Lehrkraft kann es auch so eintragen.</p>'; return; }
    const q = qrcode(0, 'M');
    q.addData(code.text);
    q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    box.dataset.code = code.text;   // für Tests; enthält keinen Schlüssel
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', 'Einlöse-Code');
  }
  function openBuy(x, bal, opener, again) {
    closeBuy();
    const acc = accountOf(current && current.data);
    const [cls, tier] = x.donate ? ['r-give', 'Spende'] : RARITY(x.price);
    const el = document.createElement('div');
    el.className = `shop-buy ${cls}`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', String(x.name));
    el.innerHTML = `<div class="shop-buy-in"><div class="shop-buy-bar"><span class="tier">${tier}</span><button type="button" class="shop-buy-close" aria-label="Schließen">✕</button></div>
      <div class="shop-buy-head"><span class="ic">${StudentShare.stickerSvg(x.icon)}</span><div><p class="name">${esc(x.name)}</p><span class="price">${coin()}${x.price}<span class="vh"> Plusse</span></span></div></div>
      <div class="shop-qr"></div>
      <p class="show">Zeig das deiner Lehrkraft</p><p class="fine">Gilt einmal · danach ${plusWord(Math.max(0, bal - x.price))} übrig</p></div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('story-open');
    buy = { el, opener, again, onKey: e => { if (e.key === 'Escape') closeBuy(); } };
    document.addEventListener('keydown', buy.onKey);
    el.querySelector('.shop-buy-close').addEventListener('click', closeBuy);
    el.querySelector('.shop-buy-close').focus();
    fillCode(el, acc, x.donate ? 'donate' : String(x.id), x.price);
  }

  // ── Rückblick als Geschichte (AJ3k): rechnet der Planer, die Seite zeichnet nur. Karten ohne Inhalt fallen weg. ──
  const reviewOf = d => (d.review && typeof d.review === 'object' && Number(d.review.lessons) > 0 ? d.review : null);
  const reviewTitle = r => (r.kind === 'year' ? 'Dein Schuljahr' : `Dein ${r.label || 'Halbjahr'}`);
  function reviewStripHTML(r) {
    if (!r || !r.fresh) return '';
    return `<button type="button" class="review-strip" data-review><span><b>${esc(reviewTitle(r))} ist da</b><span>Deine Geschichte zum Durchtippen</span></span><em>Ansehen</em></button>`;
  }
  const num = v => Math.max(0, Number(v) || 0);
  const dayMonth = s => { const t = dateOf(s); return `${t.getDate()}. ${MONTHS_LONG[t.getMonth()]}`; };
  // Viele Stunden: mehr Spalten, sonst ist die Karte höher als das Handy und die neuesten Reihen fehlen (AU13)
  const gcols = n => (n > 90 ? 20 : n > 60 ? 15 : 10);
  function storyCards(r, d) {
    const cards = [];
    const subj = d.subject || 'Unterricht';
    const head = [d.subject, d.teacher ? `bei ${dativ(d.teacher)}` : ''].filter(Boolean).join(' ');
    cards.push(['sig', `<p class="k">${esc(head)}</p><h2 class="st-tall st-xl">${esc(reviewTitle(r))}</h2>
      <p class="st-who">${esc([d.first, d.cls].filter(Boolean).join(', '))}</p><p class="st-foot">Tippe rechts für weiter, links für zurück.</p>`]);
    const cells = list(r.cells).map((c, i) => `<i class="${c === 'pp' ? 'pp' : c === 'p' ? 'p' : ''}" style="--n:${i}"></i>`).join('');
    cards.push(['ink', `<p class="k">So oft hattet ihr ${esc(subj)}</p><p class="st-huge">${num(r.lessons)}</p>
      <p class="st-sub">Stunden. Jedes Feld ist eine, hell heißt Plus, leuchtend heißt Doppelplus.</p><div class="st-grid" style="--gcols:${gcols(list(r.cells).length)}">${cells}</div>`]);
    const pp = num(r.pp), pl = num(r.p);
    cards.push(['sand', `<p class="k">Deine Plusse</p><p class="st-huge">${pp + pl}</p>
      <div class="st-split"><div><b>${pp}</b><span>mal Doppelplus</span></div><div><b>${pl}</b><span>mal Plus</span></div></div>
      <p class="st-foot">${pp + pl ? `Das sind ${num(r.xp)} XP. Abgezogen wurde nie etwas.` : 'Noch keine Plusse. Das nächste Halbjahr ist deine Chance.'}</p>`]);
    if (r.best && num(r.best.n) >= 2 && isDate(r.best.from) && isDate(r.best.to)) {
      cards.push(['paper', `<p class="k">Deine längste Serie</p><h2 class="st-tall">${num(r.best.n)} Stunden am Stück</h2>
        <div class="st-run">${Array.from({ length: Math.min(num(r.best.n), 20) }, (_, i) => `<i style="--n:${i}">+</i>`).join('')}</div>
        <p class="st-foot">Vom ${esc(dayMonth(r.best.from))} bis zum ${esc(dayMonth(r.best.to))} hast du in jeder Stunde ein Plus geholt.</p>`]);
    }
    const months = list(r.months).filter(m => m && /^\d{4}-\d{2}$/.test(m.m));
    const top = months.find(m => m.m === r.top);
    if (top && num(top.n) > 0) {
      const max = Math.max(...months.map(m => num(m.n)), 1);
      cards.push(['sea', `<p class="k">Dein stärkster Monat</p><h2 class="st-tall">${MONTHS_LONG[Number(top.m.slice(5)) - 1]}</h2>
        <div class="st-chart" style="--cols:${months.length}">${months.map((m, i) => `<div class="${m === top ? 'st-top' : ''}"><b>${num(m.n)}</b><i style="--h:${Math.round(num(m.n) / max * 100)}%;--n:${i}"></i><span>${MONTHS[Number(m.m.slice(5)) - 1]}</span></div>`).join('')}</div>
        <p class="st-foot">${num(top.n)} ${num(top.n) === 1 ? 'Plus' : 'Plusse'} in einem Monat.</p>`]);
    }
    const tier = Math.min(4, Math.max(0, Number(r.tier) || 0));
    cards.push(['ink', `<p class="k">So weit bist du gekommen</p>
      <p class="st-lv"><span>${Math.max(1, Number(r.levelFrom) || 1)}</span><span aria-hidden="true">→</span><b>${Math.max(1, Number(r.levelTo) || 1)}</b></p>
      <p class="st-sub">Von Level ${Math.max(1, Number(r.levelFrom) || 1)} auf Level ${Math.max(1, Number(r.levelTo) || 1)}. Dein Rang jetzt: <b>${esc(r.rank || TIERS[tier][1])}</b>.</p>
      <div class="st-ranks">${TIERS.map(([k, n], i) => `<i class="t-${k}${i <= tier ? ' got' : ''}${i === tier ? ' now' : ''}" style="--n:${i}">${esc(n)}</i>`).join('')}</div>`]);
    const gifts = list(r.gifts).filter(x => x && x.name);
    if (gifts.length) {
      cards.push(['mist', `<p class="k">Von ${esc(dativ(d.giver || d.teacher || 'deiner Lehrkraft'))}</p><h2 class="st-tall">${gifts.length} ${gifts.length === 1 ? 'Sticker' : 'Sticker'}</h2>
        <ul class="st-gifts">${gifts.map(x => `<li><span class="s">${StudentShare.stickerSvg(x.icon)}</span><span><b>${esc(x.name)}</b>${x.reason ? `<span>„${esc(x.reason)}“</span>` : ''}</span></li>`).join('')}</ul>`]);
    }
    const topics = list(r.topics).filter(t => t && t.title);
    if (topics.length) {
      cards.push(['paper', `<p class="k">Das habt ihr geschafft</p><h2 class="st-tall">${topics.length} ${topics.length === 1 ? 'Thema' : 'Themen'}</h2>
        <ol class="st-topics">${topics.map((t, i) => `<li style="--n:${i}"><i aria-hidden="true"></i>${esc(t.title)}<span>${num(t.n)} Std.</span></li>`).join('')}</ol>`]);
    }
    cards.push(['sig', `<p class="k">Und jetzt</p><h2 class="st-tall st-xl">Weiter so${d.first ? `, ${esc(d.first)}` : ''}</h2>
      <p class="st-sub">${r.kind === 'year' ? 'Schöne Ferien. Im neuen Schuljahr geht es wieder bei Level 1 los.' : 'Jetzt kommt das 2. Halbjahr. Level, Rang und Sticker nimmst du mit.'}</p>
      <div class="st-end"><button type="button" class="st-again">Noch mal ansehen</button><button type="button" class="st-back">Zurück zu meiner Seite</button></div>`]);
    return cards;
  }
  const STORY_MS = 6500;
  let story = null;   // { el, i, n, timer, left, started, opener, onKey } – nur Ansicht
  function closeStory() {
    if (!story) return;
    clearTimeout(story.timer);
    document.removeEventListener('keydown', story.onKey);
    story.el.remove();
    document.documentElement.classList.remove('story-open');
    const back = story.opener;
    story = null;
    if (back && document.contains(back)) back.focus();
  }
  function storyShow(i) {
    if (!story) return;
    story.i = Math.max(0, Math.min(story.n - 1, i));
    const cards = story.el.querySelectorAll('.st-card');
    cards.forEach((c, k) => { c.classList.toggle('on', k === story.i); c.setAttribute('aria-hidden', String(k !== story.i)); });
    story.el.querySelectorAll('.st-bars i').forEach((b, k) => { b.className = k < story.i ? 'done' : k === story.i ? 'now' : ''; });
    story.el.dataset.tone = cards[story.i].dataset.tone;
    const bar = story.el.querySelectorAll('.st-bars i b')[story.i];
    bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    story.el.classList.toggle('last', story.i === story.n - 1);
    clearTimeout(story.timer);
    story.left = STORY_MS; story.started = Date.now();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && story.i < story.n - 1) story.timer = setTimeout(() => storyShow(story.i + 1), STORY_MS);
  }
  function openStory(r, d, opener) {
    closeStory();
    const cards = storyCards(r, d);
    const el = document.createElement('div');
    el.className = 'story';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', reviewTitle(r));
    el.style.setProperty('--dur', STORY_MS + 'ms');
    el.innerHTML = `<div class="st-bars" aria-hidden="true">${cards.map(() => '<i><b></b></i>').join('')}</div>
      <button type="button" class="story-close" aria-label="Rückblick schließen">×</button>
      ${cards.map(([tone, html]) => `<section class="st-card c-${tone}" data-tone="${tone}">${html}</section>`).join('')}
      <div class="st-nav"><button type="button" class="story-prev" aria-label="Zurück"></button><button type="button" class="story-next" aria-label="Weiter"></button></div>`;
    document.body.appendChild(el);
    document.documentElement.classList.add('story-open');
    story = { el, i: 0, n: cards.length, timer: null, left: STORY_MS, started: Date.now(), opener,
      onKey: e => { if (e.key === 'Escape') closeStory(); else if (e.key === 'ArrowRight') storyShow(story.i + 1); else if (e.key === 'ArrowLeft') storyShow(story.i - 1); } };
    document.addEventListener('keydown', story.onKey);
    el.querySelector('.story-close').addEventListener('click', closeStory);
    el.querySelector('.story-prev').addEventListener('click', () => storyShow(story.i - 1));
    el.querySelector('.story-next').addEventListener('click', () => storyShow(story.i + 1));
    el.querySelector('.st-again').addEventListener('click', () => storyShow(0));
    el.querySelector('.st-back').addEventListener('click', closeStory);
    // Gedrückt halten pausiert (wie bei Storys)
    el.addEventListener('pointerdown', () => { if (!story) return; clearTimeout(story.timer); story.left -= Date.now() - story.started; el.classList.add('paused'); });
    const resume = () => {
      if (!story || !el.classList.contains('paused')) return;
      el.classList.remove('paused');
      story.started = Date.now();
      if (story.i < story.n - 1) story.timer = setTimeout(() => storyShow(story.i + 1), Math.max(300, story.left));
    };
    el.addEventListener('pointerup', resume); el.addEventListener('pointercancel', resume);
    storyShow(0);
    el.querySelector('.story-close').focus();
  }

  let current = null;   // { data, offline } für Neuzeichnen und Abhaken
  function draw(data, opts = {}) {
    current = { data, opts };
    const page = document.getElementById('page');
    const me = data.kind === 'me';
    page.innerHTML = me ? buildMePage(data, new Date(), opts) : buildClassPage(data, new Date(), opts);
    const level = Math.max(1, Number(data.level) || 1);
    // Gewählte Leuchtfarbe gilt nur auf der persönlichen Seite (AJ3l); die Klassenseite bleibt Aqua
    document.documentElement.style.setProperty('--c-sig', COLORS[me ? colorFor(level) : 'aqua'][1]);
    if (me && meTab === 'sammlung') { const r = newestReward(level); if (r) lsSet('sa_seen_' + pageKey(), r.level); }
    page.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => {
      lsSet('sa_farbe_' + pageKey(), b.dataset.val);
      draw(current.data, current.opts);
    }));
    document.title = me ? `${data.first || 'Ich'} · ${data.cls || ''}`.trim() : [data.cls, data.subject].filter(Boolean).join(' ') || 'Klasse';
    page.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { meTab = b.dataset.tab; draw(current.data, current.opts); }));
    page.querySelectorAll('[data-fb-all]').forEach(b => b.addEventListener('click', () => { fbAll = !fbAll; draw(current.data, current.opts); }));
    page.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => { const r = reviewOf(current.data); if (r) openStory(r, current.data, b); }));
    page.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => {
      const acc = accountOf(current.data), x = acc && shopItems(acc)[Number(b.dataset.buy)];
      if (x) openBuy(x, num(acc.balance), b, `[data-buy="${b.dataset.buy}"]`);
    }));
    page.querySelectorAll('[data-donate]').forEach(b => b.addEventListener('click', () => {
      const acc = accountOf(current.data), n = Number(b.dataset.donate);
      if (acc && n) openBuy({ name: 'Für die Klasse spenden', price: n, icon: 'heart', donate: true }, num(acc.balance), b, `[data-donate="${n}"]`);
    }));
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

  // Klassenseite zur persönlichen Seite (AK3): eigenes Dokument, eigener Zwischenspeicher. Scheitert es, geht die
  // persönliche Seite trotzdem; der Reiter „Klasse“ sagt dann, dass sie gerade fehlt. Wirft nie.
  async function loadKlasse(ref) {
    if (!ref || !StudentShare.isAccess(ref)) return null;
    const cacheKey = 'sa_cache_' + ref.id;
    let doc = null, offline = false;
    try {
      const snap = await withTimeout(firebase.firestore().collection('shares').doc(ref.id).get(), 12000);
      if (!snap.exists || snap.data().format === 0) { try { localStorage.removeItem(cacheKey); } catch (e) { /* egal */ } return null; }
      doc = snap.data();
      try { localStorage.setItem(cacheKey, JSON.stringify(doc)); } catch (e) { /* voll oder privat */ }
    } catch (e) {
      try { doc = JSON.parse(localStorage.getItem(cacheKey)); } catch (x) { doc = null; }
      offline = true;
    }
    if (!doc) return null;
    try { return { data: await StudentShare.decrypt(doc, ref.key), offline }; } catch (e) { return null; }
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
        message('Gerade nicht freigegeben', 'Vielleicht ist die Seite noch nicht hochgeladen: Versuch es in ein paar Minuten noch einmal. Sonst hat deine Lehrkraft sie ausgeschaltet oder einen neuen Code erzeugt.', true);
        return;
      }
      doc = snap.data();
      if (doc && doc.format === 0) {   // abgeschaltet, Kennung bleibt beim Planer (AT2)
        try { localStorage.removeItem(cacheKey); } catch (e) { /* egal */ }
        message('Gerade nicht freigegeben', 'Deine Lehrkraft hat diese Seite ausgeschaltet oder einen neuen Code erzeugt.', true);
        return;
      }
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
      const data = await StudentShare.decrypt(doc, access.key);
      // Persönliche Seite verweist auf die Klassenseite (AK3); ältere Planer schickten sie noch mit (Regel 15)
      if (data && data.kind === 'me' && !data.klasse && data.klasseRef) {
        const k = await loadKlasse(data.klasseRef);
        data.klasse = k ? k.data : null;
        if (k && k.offline) offline = true;
      }
      draw(data, { offline });
    } catch (e) {
      if (e && e.name === 'ShareFormatError' && /neuere/.test(e.message)) message('Bitte neu laden', 'Diese Seite braucht eine neuere Version. Lade sie neu.', true);
      else message('Link passt nicht', 'Frag deine Lehrkraft nach dem aktuellen Code.');
    }
  }

  // Safari auf dem iPhone ignoriert user-scalable=no: Zwei-Finger-Zoom hier abfangen (wie eine App, Wunsch 09.11.)
  ['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

  const preview = /[?&]vorschau\b/.test(location.search);
  // Vorschau im Planer: Inhalt kommt vom Planer, nichts wird geladen
  window.renderStudentPage = data => { if (data && typeof data === 'object') draw(data, {}); };
  window.SchuelerSeite = { buildClassPage, buildMePage, rel, icsFor, setMeTab: t => { meTab = t; }, REWARDS, COLORS, load };
  if (preview) { message('Vorschau', 'Wird gleich gezeigt.'); return; }
  load();
  // Zurück in die App oder neuer Tag: frisch laden bzw. „heute/morgen“ neu rechnen
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  window.addEventListener('hashchange', () => load());
})();

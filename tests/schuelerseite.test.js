// Schülerapp (BUGS AJ1): die Seite für die Klasse (schueler.html/schueler.js). Zeichnet den entschlüsselten Auszug,
// rechnet „heute/morgen“ selbst, blendet Vergangenes aus und escaped alles (der Inhalt stammt aus Eingaben der Lehrkraft).
const fs = require('fs');
const path = require('path');
const { loadScript } = require('./helpers/load-app');

const X = `Peter's "Test" <img data-xss src=x>`;
const html = fs.readFileSync(path.join(__dirname, '..', 'schueler.html'), 'utf8');

// Auszug, wie ihn der Planer seit AJ5/AJ6 schickt (v2): Inhaltsverzeichnis, Themen der Arbeit, Stempel
function sample() {
  return {
    v: 2, cls: '7b', subject: 'Mathematik', teacher: 'Frau T.', at: new Date(2026, 10, 9, 14, 20).getTime(),
    next: [
      { date: '2026-11-09', start: '07:45', end: '09:15', room: 'R 104' },   // heute, schon vorbei
      { date: '2026-11-12', start: '09:45', end: '11:15', room: 'R 104' },
    ],
    hw: [{ date: '2026-11-05', text: 'Alte Aufgabe' }, { date: '2026-11-10', text: 'S. 42 Nr. 3' }, { date: '2026-11-11', text: 'AB fertig' }],
    tests: [{ date: '2026-11-19', text: 'Klassenarbeit Brüche', topics: ['Brüche', 'Terme'] }, { date: '2026-12-02', text: 'Kurztest' }],
    toc: { fromLessons: false, items: [
      { title: 'Brüche', state: 'done', of: 2, lessons: [{ date: '2026-10-26', text: 'Kürzen\nS. 30' }, { date: '2026-10-29', text: 'Erweitern' }] },
      { title: 'Wiederholung', state: 'done', lessons: [{ date: '2026-11-02', text: 'Wiederholung' }] },
      { title: 'Terme', state: 'now', unit: 2, of: 3, from: '2026-11-05', lessons: [{ date: '2026-11-05', text: 'Terme vereinfachen' }] },
      { title: 'Gleichungen', state: 'later', of: 2, from: '2026-11-23', lessons: [] },
    ] },
    goal: { target: 200, reward: 'Spielestunde', count: 162, since: '2026-11-01',
      stamps: [{ date: '2026-11-02', n: 9 }, { date: '2026-11-05', n: 0 }, { date: '2026-11-09', n: 14 }] },
  };
}
// Auszug einer älteren Planer-Version (AJ1, v1): muss weiter lesbar sein (Regel 15)
function sampleV1() {
  return {
    v: 1, cls: '7b', subject: 'Mathematik', teacher: 'Frau T.', at: new Date(2026, 10, 9, 14, 20).getTime(),
    next: [
      { date: '2026-11-09', start: '07:45', end: '09:15', room: 'R 104' },   // heute, schon vorbei
      { date: '2026-11-12', start: '09:45', end: '11:15', room: 'R 104' },
    ],
    hw: [{ date: '2026-11-05', text: 'Alte Aufgabe' }, { date: '2026-11-10', text: 'S. 42 Nr. 3' }, { date: '2026-11-11', text: 'AB fertig' }],
    tests: [{ date: '2026-11-19', text: 'Klassenarbeit Brüche' }, { date: '2026-12-02', text: 'Kurztest' }],
    topics: { done: [{ title: 'Brüche' }], now: { title: 'Terme', unit: 2, of: 3 }, next: [{ title: 'Gleichungen' }] },
    goal: { target: 200, reward: 'Spielestunde', count: 162, since: '2026-11-01' },
  };
}
const NOW = new Date(2026, 10, 9, 10, 0);   // Mo 09.11.2026, 10:00
const page = () => document.getElementById('page');
const build = (d, opts) => window.SchuelerSeite.buildClassPage(d, NOW, opts);

beforeAll(() => {
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/g, '');
  loadScript('student-share.js');
  loadScript('schueler.js');
});

describe('Schülerseite', () => {
  it('ohne gültigen Link: verständliche Meldung statt leerer Seite', () => {
    expect(page().textContent).toMatch(/Link unvollständig/);
  });

  it('Kopf mit Klasse, Fach und Lehrkraft; Klassenziel mit Stand und Belohnung', () => {
    document.getElementById('page').innerHTML = build(sample());
    const t = page().textContent;
    expect(t).toContain('7b');
    expect(t).toContain('Mathematik bei Frau T.');
    expect(t).toMatch(/162 von 200 Plussen/);
    expect(t).toMatch(/noch 38/);
    expect(t).toMatch(/Dann gibt es: Spielestunde/);
  });

  const rows = () => [...page().querySelectorAll('.toc .row')].map(e => `${e.className.replace(/^row /, '')}:${e.querySelector('.tx').textContent}`);

  it('Inhaltsverzeichnis: Kapitel der Reihe nach, die Klassenarbeit dort, wo sie im Stoff liegt (AJ5)', () => {
    page().innerHTML = build(sample());
    expect(page().textContent).toMatch(/Inhaltsverzeichnis/);
    expect(page().querySelector('.map')).toBeNull();   // keine Expedition mehr
    expect(rows()).toEqual(['done:Brüche', 'done:Wiederholung', 'now:Terme', 'test:Klassenarbeit Brüche', 'later:Gleichungen']);
    expect(page().querySelector('.row.now small').textContent).toBe('Stunde 2 von 3, hier seid ihr gerade');
    expect(page().querySelector('.row.now .pg').textContent).toBe('2/3');
    expect(page().querySelector('.row.later small').textContent).toBe('ab Mo 23.11.');
  });

  it('Thema antippen: jede Stunde mit Datum und dem ganzen Text (AJ6 a)', () => {
    page().innerHTML = build(sample());
    const bruch = page().querySelector('details.row.done');
    expect(bruch.open).toBe(false);
    const ls = [...bruch.querySelectorAll('.lessons li')].map(li => `${li.querySelector('.ld').textContent} ${li.querySelector('.lt').innerHTML}`);
    expect(ls).toEqual(['Mo 26.10. Kürzen<br>S. 30', 'Do 29.10. Erweitern']);
    expect(page().querySelector('div.row.later')).not.toBeNull();   // ohne Stunden: nichts zum Aufklappen
  });

  it('Thema aufklappen zeigt nie nur den Titel noch einmal (Rückmeldung 09.11.)', () => {
    const d = sample();
    d.toc.items = [
      { title: 'test', state: 'done', lessons: [{ date: '2026-11-02', text: 'test' }] },                         // nur der Titel
      { title: 'Lied A', state: 'done', lessons: [{ date: '2026-11-05', text: 'Lied A\nRhythmus klatschen' }] },   // Titel + mehr
      { title: 'Brüche', state: 'done', of: 2, lessons: [{ date: '2026-10-26', text: 'Brüche' }, { date: '2026-10-29', text: 'Erweitern' }] },
    ];
    page().innerHTML = build(d);
    const rows = [...page().querySelectorAll('.toc .row')];
    expect(rows[0].tagName).toBe('DIV');                                  // nicht aufklappbar …
    expect(rows[0].querySelector('small').textContent).toBe('am Mo 02.11.');   // … aber mit Datum
    expect(rows[1].tagName).toBe('DETAILS');
    expect([...rows[1].querySelectorAll('.lt')].map(e => e.textContent)).toEqual(['Rhythmus klatschen']);
    expect([...rows[2].querySelectorAll('.lessons li')].map(li => li.querySelector('.lt').textContent)).toEqual(['Erweitern']);
  });

  it('Klassenarbeit antippen: Countdown, was drankommt, Kalender (AJ6 b, d)', () => {
    page().innerHTML = build(sample());
    const t = page().querySelector('details.row.test');
    expect(t.querySelector('summary small').textContent).toBe('noch 10 Tage');
    expect(t.querySelector('.pg').textContent).toBe('Do 19.11.');
    expect(t.querySelector('.cd b').textContent).toBe('10');
    expect([...t.querySelectorAll('.chips li')].map(li => li.textContent)).toEqual(['Brüche', 'Terme']);
    expect(t.querySelector('[data-cal="2026-11-19"]')).not.toBeNull();
  });

  it('weitere Tests stehen unter „Termine“, mit Knopf für alle Termine in den Kalender', () => {
    page().innerHTML = build(sample());
    expect(page().textContent).toMatch(/Termine/);
    expect(page().textContent).toMatch(/Kurztest/);
    expect(page().querySelector('[data-cal="all"]')).not.toBeNull();
  });

  it('Kalender-Datei: ganztägig, Fach im Titel, Erinnerung am Vortag, Sonderzeichen geschützt', () => {
    const ics = window.SchuelerSeite.icsFor([{ date: '2026-11-19', text: 'Arbeit; Brüche, Terme' }], { subject: 'Mathe' });
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261120');
    expect(ics).toContain('SUMMARY:Mathe: Arbeit\\; Brüche\\, Terme');
    expect(ics).toContain('TRIGGER:-P1D');
  });

  it('Klassenziel: Stempelkarte zum Aufklappen, beste Stunde markiert, Stunde ohne Plus leer (AJ6 c)', () => {
    page().innerHTML = build(sample());
    const goal = page().querySelector('details.goal');
    expect(goal.querySelector('.open-hint').textContent).toBe('Stempelkarte');
    const st = [...goal.querySelectorAll('.stamp')].map(e => `${e.className}|${e.querySelector('b').textContent}`);
    expect(st).toEqual(['stamp|+9', 'stamp none|', 'stamp best|+14']);
    expect(goal.textContent).toMatch(/Halbzeit geschafft/);
  });

  it('ohne Planung: die Stunden mit Datum und Text, neueste zuerst', () => {
    const d = sample();
    d.toc = { fromLessons: true, items: [
      { title: 'Lied A', state: 'done', lessons: [{ date: '2026-11-02', text: 'Lied A' }] },
      { title: 'Lied B', state: 'done', lessons: [{ date: '2026-11-05', text: 'Lied B\nRhythmus' }] }] };
    page().innerHTML = build(d);
    expect(page().textContent).toMatch(/Zuletzt im Unterricht/);
    expect([...page().querySelectorAll('.toc .lessons .ld')].map(e => e.textContent)).toEqual(['Do 05.11.', 'Mo 02.11.']);
  });

  it('ältere Planer-Version (v1 mit „topics“): wird als Inhaltsverzeichnis gezeigt (Regel 15)', () => {
    page().innerHTML = build(sampleV1());
    expect(rows()).toEqual(['done:Brüche', 'now:Terme', 'test:Klassenarbeit Brüche', 'later:Gleichungen']);
  });

  it('„Herr …“ wird im Satz zu „bei Herrn …“', () => {
    page().innerHTML = build({ ...sample(), teacher: 'Herr Winderlich' });
    expect(page().querySelector('.class-sub').textContent).toBe('Mathematik bei Herrn Winderlich');
  });

  it('Aufträge: Vergangenes fällt weg, „morgen/übermorgen“ stimmen', () => {
    document.getElementById('page').innerHTML = build(sample());
    const q = [...page().querySelectorAll('.quest:not(.term)')].map(e => `${e.querySelector('.q').textContent} ${e.querySelector('.d').textContent}`);
    expect(q).toEqual(['S. 42 Nr. 3 bis Di 10.11., morgen', 'AB fertig bis Mi 11.11., übermorgen']);
    expect(page().textContent).not.toContain('Alte Aufgabe');
  });

  it('nächste Stunde: die heutige ist vorbei, also Donnerstag; Stand mit Uhrzeit', () => {
    document.getElementById('page').innerHTML = build(sample());
    expect(page().textContent).toMatch(/Nächste Stunde: Donnerstag, 12\.11\. um 09:45 in R 104\./);
    expect(page().textContent).toMatch(/Stand: heute, 14:20\./);
  });

  it('abgewählte Bereiche fehlen ganz; ganz ohne Inhalt ein freundlicher Hinweis', () => {
    document.getElementById('page').innerHTML = build({ cls: '7b', subject: 'Mathe', next: null, hw: null, tests: null, toc: null, goal: null });
    expect(page().querySelector('.map')).toBeNull();
    expect(page().textContent).not.toMatch(/Aufträge|Klassenziel/);
    expect(page().textContent).toMatch(/Gerade steht hier nichts/);
  });

  it('offline: Hinweis auf den zuletzt geladenen Stand', () => {
    document.getElementById('page').innerHTML = build(sample(), { offline: true });
    expect(page().textContent).toMatch(/Offline/);
  });

  it('präparierte Inhalte werden escaped, nichts wird eingeschleust', () => {
    const d = sample();
    d.cls = X; d.subject = X; d.teacher = X;
    d.hw = [{ date: '2026-11-10', text: X }]; d.tests = [{ date: '2026-11-19', text: X }, { date: '2026-11-20', text: X }];
    d.tests[0].topics = [X];
    d.toc = { fromLessons: false, items: [{ title: X, state: 'done', of: X, lessons: [{ date: '2026-11-02', text: X }] },
      { title: X, state: 'now', unit: X, of: 3, from: X, lessons: [] }, { title: X, state: 'later', from: '2026-12-01' }] };
    d.goal = { target: 10, reward: X, count: 1, stamps: [{ date: '2026-11-02', n: X }] };
    d.next = [{ date: '2026-11-12', start: X, end: '99:99', room: X }];
    window.renderStudentPage(d);
    expect(document.querySelectorAll('[data-xss]').length).toBe(0);
    expect(page().textContent).toContain(`Peter's "Test"`);
  });

  it('Aufträge für sich abhaken: bleibt nur auf dem Handy, Klick schaltet um', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    try {
      window.renderStudentPage(sample());
      const box = () => page().querySelector('[data-tick="0"]');
      expect(box().getAttribute('aria-pressed')).toBe('false');
      box().click();
      expect(box().getAttribute('aria-pressed')).toBe('true');
      expect(page().querySelector('.quest').classList.contains('is-done')).toBe(true);
      expect(Object.keys(localStorage).some(k => k.startsWith('sa_tick_'))).toBe(true);
      box().click();
      expect(box().getAttribute('aria-pressed')).toBe('false');
    } finally { vi.useRealTimers(); }
  });

  it('lädt keine fremden Schriften oder Skripte (Datenschutz, Regel 63)', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'schueler.css'), 'utf8');
    expect(css).not.toMatch(/@import|googleapis|https?:\/\//);
    expect(html).not.toMatch(/https?:\/\/(?!unterrichtsplaner)/);
    expect(html).toMatch(/noindex/);
  });
});

describe('Persönliche Seite (AJ2)', () => {
  const me = () => ({
    v: 1, kind: 'me', first: 'Anna', cls: '7b', subject: 'Mathematik', teacher: 'Herr T.', at: new Date(2026, 10, 9, 14, 20).getTime(),
    xp: 90, level: 6, from: 85, next: 100, rank: 'Füller', nextRank: { name: 'Textmarker', level: 9 },
    jokers: { earned: 1, used: 0, open: 1, max: 4, every: 4, list: ['Song vorschlagen', 'Platz wählen'] },
    feedback: [{ date: '2026-10-26', v: 'positive' }, { date: '2026-11-02', v: 'negative' }, { date: '2026-11-05', v: 'excellent' }, { date: '2026-11-06', v: 'neutral' }],
    streak: 2, klasse: sample(),
  });
  afterEach(() => window.SchuelerSeite.setMeTab('ich'));

  it('Reiter „Ich“: Level, Vorname, Rang, XP bis zum nächsten Level, Serie, Joker, Rückmeldung mit allen vier Stufen', () => {
    page().innerHTML = window.SchuelerSeite.buildMePage(me(), NOW);
    const t = page().textContent;
    expect(page().querySelector('.lvl b').textContent).toBe('6');
    expect(page().querySelector('.who').textContent).toBe('Anna');
    expect(page().querySelector('.rank-badge').textContent).toBe('Füller');   // Rang als Plakette (09.11.)
    expect(t).toMatch(/90 XP/);
    expect(t).toMatch(/noch 10 XP bis Level 7/);
    expect(t).toMatch(/Ab Level 7: Textmarker/);   // Stufe aus dem Level: 6 → nächster Rang bei 7
    expect(t).toMatch(/2\s*Stunden in Folge mit Plus/);
    expect(t).toMatch(/Ein Joker frei/);
    expect([...page().querySelectorAll('.joker li')].map(li => li.textContent)).toEqual(['Song vorschlagen', 'Platz wählen']);
    expect([...page().querySelectorAll('.fb .sp')].map(e => e.textContent)).toEqual(['+', '−−', '++', '−']);   // gut, schwach, sehr gut, wenig
    expect(t).toMatch(/Abgezogen wird nie etwas/);
    expect(t.replace('Noten stehen hier nie', '')).not.toMatch(/Note/);
  });

  it('Jahreskarte (AJ2c): ein Feld je Stunde nach Monaten, Zahlen und längste Serie', () => {
    const d = me();
    d.year = [{ date: '2026-09-14', v: null }, { date: '2026-09-21', v: 'positive' }, { date: '2026-09-28', v: 'excellent' }, { date: '2026-10-05', v: 'a' },
      { date: '2026-10-12', v: 'positive' }, { date: '2026-10-19', v: 'negative' }, { date: '2026-10-26', v: 'positive' }, { date: '2026-11-02', v: 'neutral' }];
    window.SchuelerSeite.setMeTab('sammlung');   // AJ3b: Jahreskarte steht in der Sammlung
    page().innerHTML = window.SchuelerSeite.buildMePage(d, NOW);
    const months = [...page().querySelectorAll('.yr-month')].map(m => [m.querySelector('.yr-m').textContent, m.querySelectorAll('.yr-c').length]);
    expect(months).toEqual([['Sep', 3], ['Okt', 4], ['Nov', 1]]);
    expect(page().querySelector('.yr-c.a').getAttribute('title')).toMatch(/gefehlt/);
    const t = page().querySelector('.yr-stats').textContent;
    expect(t).toMatch(/8\s*Stunden/);
    expect(t).toMatch(/4\s*mit Plus/);
    expect(t).toMatch(/3\s*längste Serie/);   // 21.09., 28.09., (05.10. gefehlt), 12.10.
  });

  it('AJ2b: Baustelle mit Textmarker, „Von Herrn …“ mit Grund, Album mit gesperrten Stickern und Hinweis', () => {
    const d = me();
    d.giver = 'Herr T.'; d.bauXP = 20;
    d.bau = { text: 'Material fehlt oft', since: '2026-10-26' };
    d.gifts = [{ name: 'Erklärprofi', icon: 'bubble', color: 3, reason: 'hat Lisa geholfen', date: '2026-11-02', xp: 20 },
      { name: 'Baustelle geschafft', icon: 'crane', color: 1, reason: 'Hausaufgaben', date: '2026-10-20', xp: 20 }];
    d.album = [{ name: 'Erstes Plus', icon: 'plus', color: 0 }, { name: 'Erklärprofi', icon: 'bubble', color: 3 }, { name: 'Baustelle geschafft', icon: 'crane', color: 1 }];
    d.locked = [{ name: 'Dranbleiben', icon: 'flame', hint: '3× Plus in Folge' }];
    page().innerHTML = window.SchuelerSeite.buildMePage(d, NOW);   // Ich: Baustelle steht, was gerade ansteht
    expect(page().querySelector('.bau .bt').textContent).toBe('Material fehlt oft');
    expect(page().querySelector('.bau').textContent).toMatch(/seit 26\.10\..*20 XP/s);
    expect(page().querySelector('.gift')).toBeNull();   // AJ3b: Sammlung steht nicht mehr auf „Ich“
    window.SchuelerSeite.setMeTab('sammlung');
    page().innerHTML = window.SchuelerSeite.buildMePage(d, NOW);
    expect(page().textContent).toMatch(/Von Herrn T\./);
    expect([...page().querySelectorAll('.gift')].map(g => g.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      'Erklärprofi„hat Lisa geholfen“02.11., +20 XP', 'Baustelle geschafft„Hausaufgaben“20.10., +20 XP']);
    expect(page().querySelectorAll('.album .stk:not(.locked)').length).toBe(3);
    expect(page().querySelector('.album .stk.locked').textContent).toMatch(/Dranbleiben3× Plus in Folge/);
    expect(page().querySelector('.gift .s svg')).not.toBeNull();
  });

  it('AJ2b: präparierte Sticker, Gründe und Baustellen werden escaped; unbekanntes Symbol zeigt den Stern', () => {
    const d = me();
    d.giver = X; d.bau = { text: X, since: '2026-10-26' };
    d.gifts = [{ name: X, icon: X, color: X, reason: X, date: '2026-11-02', xp: X }];
    d.album = [{ name: X, icon: '<img data-xss>', color: 1 }]; d.locked = [{ name: X, icon: X, hint: X }];
    window.renderStudentPage(d);
    expect(document.querySelectorAll('[data-xss]').length).toBe(0);
    window.SchuelerSeite.setMeTab('sammlung');
    window.renderStudentPage(d);
    expect(document.querySelectorAll('[data-xss]').length).toBe(0);
    expect(page().querySelectorAll('.album svg').length).toBe(2);
  });

  it('Reiter „Klasse“ zeigt die Klassenseite ohne doppelten Kopf', () => {
    window.SchuelerSeite.setMeTab('klasse');
    page().innerHTML = window.SchuelerSeite.buildMePage(me(), NOW);
    expect(page().querySelectorAll('.class-name').length).toBe(1);
    expect(page().textContent).toMatch(/Inhaltsverzeichnis/);
  });

  it('Reiter wechseln per Antippen; Titel mit Vorname', () => {
    window.renderStudentPage(me());
    expect(document.title).toBe('Anna · 7b');
    page().querySelector('[data-tab="klasse"]').click();
    expect(page().querySelector('[data-tab="klasse"]').getAttribute('aria-selected')).toBe('true');
    expect(page().textContent).toMatch(/Aufträge/);
  });

  it('präparierte Inhalte werden escaped', () => {
    const d = me();
    d.first = X; d.rank = X; d.nextRank = { name: X, level: X }; d.jokers.list = [X]; d.cls = X;
    window.renderStudentPage(d);
    expect(document.querySelectorAll('[data-xss]').length).toBe(0);
    expect(page().textContent).toContain(`Peter's "Test"`);
  });
});

describe('Belohnungen zum Aussuchen (AJ3b, ersetzt AJ2d)', () => {
  const me = level => ({ v: 1, kind: 'me', first: 'Anna', cls: '7b', subject: 'Mathe', level, xp: 10 * level, from: 10 * level - 5, next: 10 * level + 5, jokers: {}, feedback: [], year: [] });
  const heft = () => document.querySelector('.heft');
  const look = () => [...heft().classList].filter(c => /^(st|hc|pp|mk)-/.test(c)).sort();
  beforeEach(() => { Object.keys(localStorage).filter(k => /^sa_(look|seen)_/.test(k)).forEach(k => localStorage.removeItem(k)); window.SchuelerSeite.setMeTab('ich'); });
  afterEach(() => { window.SchuelerSeite.setMeTab('ich'); window.renderStudentPage({ v: 2, cls: '7b' }); });

  it('Freischaltung alle zwei Level ab 3, im Wechsel Stempel, Heftfarbe, Papier, Textmarker', () => {
    const r = window.SchuelerSeite.REWARDS;
    expect(r.slice(0, 4).map(x => [x.level, x.kind])).toEqual([[3, 'stamp'], [5, 'color'], [7, 'paper'], [9, 'marker']]);
    expect(r.every((x, i) => x.level === 3 + 2 * i)).toBe(true);
  });

  it('Level 1: Standard-Heft, nichts zum Aussuchen außer dem Standard, kein goldener Rahmen mehr', () => {
    window.renderStudentPage(me(1));
    expect(look()).toEqual(['hc-white', 'mk-yellow', 'pp-karo', 'st-circle']);
    window.SchuelerSeite.setMeTab('sammlung');
    window.renderStudentPage(me(1));
    expect(page().querySelectorAll('.rw[data-look]').length).toBe(4);   // je Art nur der Standard
    expect(page().querySelector('.rw.locked').textContent).toMatch(/Stern.*ab Level 3/);
    expect(document.querySelector('.u-gold')).toBeNull();
  });

  it('neu freigeschaltet: Hinweis auf „Ich“, verschwindet nach dem Blick in die Sammlung', () => {
    window.renderStudentPage(me(5));
    expect(page().querySelector('.newrw').textContent).toMatch(/Heftfarbe „Mint“/);
    page().querySelector('.newrw [data-tab="sammlung"]').click();
    expect(page().querySelector('[data-tab="sammlung"]').getAttribute('aria-selected')).toBe('true');
    page().querySelector('[data-tab="ich"]').click();
    expect(page().querySelector('.newrw')).toBeNull();
  });

  it('aussuchen: Stern und Mint gewählt, gilt sofort für die ganze Seite und bleibt auf dem Handy', () => {
    window.SchuelerSeite.setMeTab('sammlung');
    window.renderStudentPage(me(5));
    page().querySelector('[data-look="stamp"][data-val="star"]').click();
    page().querySelector('[data-look="color"][data-val="mint"]').click();
    expect(look()).toEqual(['hc-mint', 'mk-yellow', 'pp-karo', 'st-star']);
    expect(page().querySelector('[data-val="star"]').getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem('sa_look_vorschau'))).toMatchObject({ stamp: 'star', color: 'mint' });
    window.SchuelerSeite.setMeTab('ich');
    window.renderStudentPage(me(5));
    expect(look()).toContain('st-star');
  });

  it('Level gesunken (Korrektur): nicht mehr freigeschaltete Wahl fällt auf den Standard zurück', () => {
    localStorage.setItem('sa_look_vorschau', JSON.stringify({ stamp: 'crown', color: 'mint', paper: 'dots', marker: 'green' }));
    window.renderStudentPage(me(6));
    expect(look()).toEqual(['hc-mint', 'mk-yellow', 'pp-karo', 'st-circle']);
  });

  it('Klassenseite (ohne persönlichen Link): immer das normale Heft', () => {
    localStorage.setItem('sa_look_vorschau', JSON.stringify({ stamp: 'star' }));
    window.renderStudentPage(me(9));
    window.renderStudentPage({ v: 2, cls: '7b' });
    expect(look()).toEqual([]);
  });

  it('Reiter „Ich“ zeigt nur das Wichtigste: Karte, was ansteht, letzte 6 Stunden', () => {
    const d = me(4);
    d.feedback = Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(10 + i).padStart(2, '0')}`, v: 'positive' }));
    window.renderStudentPage(d);
    expect(page().querySelector('.hero .who').textContent).toBe('Anna');
    expect(page().querySelectorAll('.fb .sp').length).toBe(6);
    expect(page().querySelector('.album')).toBeNull();
    expect(page().querySelector('.yr')).toBeNull();
    expect(page().querySelector('.card.joker')).toBeNull();   // kein Joker frei: nichts dazu auf „Ich“
  });

  it('„Ich“ geordnet (Wunsch 09.11.): XP und Rückmeldung eine Karte oben, dann Baustelle, dann Joker', () => {
    const d = me(4);
    d.feedback = [{ date: '2026-11-02', v: 'positive' }];
    d.jokers = { open: 1, list: ['Platz wählen'] };
    d.bau = { text: 'Material', since: '2026-11-01' };
    window.renderStudentPage(d);
    const cards = [...page().querySelectorAll('.card')];
    expect(cards[0].classList.contains('hero')).toBe(true);
    expect(cards[0].querySelector('.fb .sp')).not.toBeNull();   // Rückmeldung steckt in der Level-Karte
    expect(page().querySelectorAll('.fb').length).toBe(1);
    expect(cards.map(c => ['hero', 'bau', 'joker'].find(k => c.classList.contains(k))).filter(Boolean)).toEqual(['hero', 'bau', 'joker']);
  });

  it('lange Vornamen werden kleiner statt im Wort umzubrechen', () => {
    const d = me(4); d.first = 'Maximilian';
    window.renderStudentPage(d);
    expect(page().querySelector('.who').className).toContain('long');
  });

  it('Abstand zwischen Reitern und erster Karte', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'schueler.css'), 'utf8');
    expect(css).toMatch(/\.me-top \{[^}]*margin-bottom: \d+px/);
  });
});

describe('Fühlt sich an wie eine App (Wunsch 09.11.)', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'schueler.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'schueler.js'), 'utf8');
  it('kein Zoomen: Viewport fest, nur senkrecht wischen, Zwei-Finger-Geste auf dem iPhone abgefangen', () => {
    expect(html).toMatch(/name="viewport" content="[^"]*maximum-scale=1[^"]*user-scalable=no/);
    expect(css).toMatch(/html, body \{[^}]*touch-action: pan-y/);
    expect(js).toMatch(/gesturestart/);
  });
  it('kein seitliches Verschieben', () => {
    expect(css).toMatch(/html, body \{[^}]*overflow-x: hidden/);
  });
});

describe('Farben (Wunsch 09.11.): kein Lila, Ränge in Rangfarben', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'schueler.css'), 'utf8');
  const share = fs.readFileSync(path.join(__dirname, '..', 'student-share.js'), 'utf8');
  const me = (level, rank) => ({ v: 1, kind: 'me', first: 'Anna', cls: '7b', level, xp: 10, from: 0, next: 20, jokers: {}, feedback: [], year: [], ...(rank ? { rank } : {}) });
  afterEach(() => window.renderStudentPage({ v: 2, cls: '7b' }));

  it('kein Lila in Schülerseite und Sticker-Farben', () => {
    ['#6a3db8', '#b79cff', '#8e5cf6'].forEach(c => { expect(css).not.toContain(c); expect(share).not.toContain(c); });
  });

  it('Rang als farbige Plakette: Stufe aus dem Level (alle 2 Level), Name aus der Klasse oder die Farbe selbst', () => {
    const tier = l => { window.renderStudentPage(me(l)); const b = page().querySelector('.rank-badge'); return [b.className.replace('rank-badge ', ''), b.textContent]; };
    expect(tier(1)).toEqual(['t-bronze', 'Bronze']);
    expect(tier(4)).toEqual(['t-silver', 'Silber']);
    expect(tier(6)).toEqual(['t-gold', 'Gold']);
    expect(tier(8)).toEqual(['t-platinum', 'Platin']);
    expect(tier(10)).toEqual(['t-diamond', 'Diamant']);
    expect(tier(11)).toEqual(['t-diamond', 'Diamant']);   // kein Regenbogen (Wunsch 09.11.): Diamant bleibt
    expect(tier(30)).toEqual(['t-diamond', 'Diamant']);
    expect(css).not.toContain('rainbow');
    window.renderStudentPage(me(6, 'Füller'));
    expect(page().querySelector('.rank-badge').textContent).toBe('Füller');
    expect(page().querySelector('.rank-badge').className).toContain('t-gold');
  });
});

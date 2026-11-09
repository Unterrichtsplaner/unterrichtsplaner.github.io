// Schülerapp (BUGS AJ1): die Seite für die Klasse (schueler.html/schueler.js). Zeichnet den entschlüsselten Auszug,
// rechnet „heute/morgen“ selbst, blendet Vergangenes aus und escaped alles (der Inhalt stammt aus Eingaben der Lehrkraft).
const fs = require('fs');
const path = require('path');
const { loadScript } = require('./helpers/load-app');

const X = `Peter's "Test" <img data-xss src=x>`;
const html = fs.readFileSync(path.join(__dirname, '..', 'schueler.html'), 'utf8');

function sample() {
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

  it('Expedition: erledigt, jetzt (mit Stunde n von m), kommend, am Ende die nächste Klassenarbeit', () => {
    document.getElementById('page').innerHTML = build(sample());
    const st = [...page().querySelectorAll('.st')].map(e => [e.className.replace('st ', ''), e.querySelector('.lbl').firstChild.textContent]);
    expect(st).toEqual([['done', 'Brüche'], ['now', 'Terme'], ['later', 'Gleichungen'], ['boss', 'Klassenarbeit Brüche']]);
    expect(page().querySelector('.st.now small').textContent).toMatch(/Stunde 2 von 3/);
    expect(page().querySelector('.st.boss small').textContent).toBe('Do 19.11., noch 10 Tage');
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

  it('weitere Tests nach der Klassenarbeit stehen unter „Weitere Termine“', () => {
    document.getElementById('page').innerHTML = build(sample());
    expect(page().textContent).toMatch(/Weitere Termine/);
    expect(page().textContent).toMatch(/Kurztest/);
  });

  it('abgewählte Bereiche fehlen ganz; ganz ohne Inhalt ein freundlicher Hinweis', () => {
    document.getElementById('page').innerHTML = build({ cls: '7b', subject: 'Mathe', next: null, hw: null, tests: null, topics: null, goal: null });
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
    d.topics = { done: [{ title: X }], now: { title: X, unit: X, of: 3 }, next: [{ title: X }] };
    d.goal = { target: 10, reward: X, count: 1 };
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

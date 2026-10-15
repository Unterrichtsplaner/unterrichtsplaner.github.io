// Ferien laden (Y8c): Schulferien + Feiertage des Bundeslands von der OpenHolidays API, auf Knopfdruck, mit Vorschau.
const { loadApp, app } = require('./helpers/load-app');

const SCHOOL = [
  { startDate: '2026-08-03', endDate: '2026-09-14', name: [{ language: 'DE', text: 'Sommerferien' }], nationwide: false, subdivisions: [{ code: 'DE-BY' }] },
  { startDate: '2026-11-02', endDate: '2026-11-06', name: [{ language: 'DE', text: 'Herbstferien' }], nationwide: false, subdivisions: [{ code: 'DE-BY' }] },
  { startDate: '2026-12-24', endDate: '2027-01-08', name: [{ language: 'DE', text: 'Weihnachtsferien' }], nationwide: false, subdivisions: [{ code: 'DE-BY' }] },
];
const PUBLIC = [
  { startDate: '2026-08-08', endDate: '2026-08-08', name: [{ language: 'DE', text: 'Friedensfest' }], nationwide: false, subdivisions: [{ code: 'DE-BY-AU' }] }, // nur Augsburg
  { startDate: '2026-10-03', endDate: '2026-10-03', name: [{ language: 'DE', text: 'Tag der Deutschen Einheit' }], nationwide: true },   // Samstag
  { startDate: '2026-12-25', endDate: '2026-12-25', name: [{ language: 'DE', text: '1. Weihnachtsfeiertag' }], nationwide: true },        // in den Ferien
  { startDate: '2027-01-06', endDate: '2027-01-06', name: [{ language: 'DE', text: 'Heilige Drei Könige' }], nationwide: false, subdivisions: [{ code: 'DE-BY' }] }, // in den Ferien
  { startDate: '2027-03-29', endDate: '2027-03-29', name: [{ language: 'DE', text: 'Ostermontag' }], nationwide: true },
  { startDate: '2027-05-27', endDate: '2027-05-27', name: [{ language: 'DE', text: 'Fronleichnam' }], nationwide: false, subdivisions: [{ code: 'DE-BY' }, { code: 'DE-NW' }] },
  { startDate: '2027-11-01', endDate: '2027-11-01', name: [{ language: 'DE', text: 'Allerheiligen' }], nationwide: false, subdivisions: [{ code: 'DE-NW' }] }, // anderes Land
];

function sampleDB(holidays = []) {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, holidays },
    lessonSlots: [], lessonData: {}, groups: [], students: {},
  };
}
const flush = () => new Promise(r => setTimeout(r, 0));
const rows = () => [...document.querySelectorAll('#holidays-editor .holiday-row')];
const rowLabels = () => rows().map(r => r.querySelector('.holiday-name-input').value);
const toast = () => document.getElementById('toast-container').textContent;
const choiceOpen = () => !document.getElementById('modal-choice').classList.contains('hidden');
let calls;

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0)); // Do 15.10.2026 → Schuljahr 2026/27
  app('db = ' + JSON.stringify(sampleDB()));
  document.getElementById('toast-container').innerHTML = '';
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  calls = [];
  globalThis.fetch = vi.fn(async url => {
    calls.push(String(url));
    return { ok: true, json: async () => (String(url).includes('SchoolHolidays') ? SCHOOL : PUBLIC) };
  });
  window.confirm = () => true;
});
afterEach(() => { vi.useRealTimers(); delete globalThis.fetch; });

describe('Y8c: Ferien laden', () => {
  it('Auswahl mit allen 16 Bundesländern, gespeichert mit den Einstellungen', () => {
    const sel = document.getElementById('settings-federal-state');
    expect([...sel.options].filter(o => o.value).length).toBe(16);
    app('openSettings()');
    sel.value = 'DE-BY';
    app('saveSettings()');
    expect(app('db.settings.federalState')).toBe('DE-BY');
    app('openSettings()');
    expect(document.getElementById('settings-federal-state').value).toBe('DE-BY');
  });

  it('ohne Bundesland: Hinweis, keine Abfrage', async () => {
    app('openSettings()');
    document.getElementById('settings-federal-state').value = '';
    await app('loadHolidaysFromApi()');
    expect(calls).toHaveLength(0);
    expect(toast()).toMatch(/Bundesland/);
  });

  it('fragt Schulferien und Feiertage für dieses und nächstes Schuljahr ab', async () => {
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    const p = app('loadHolidaysFromApi()');
    await flush(); await flush();
    expect(calls).toHaveLength(2);
    calls.forEach(u => {
      expect(u).toContain('countryIsoCode=DE');
      expect(u).toContain('subdivisionCode=DE-BY');
      expect(u).toContain('validFrom=2026-08-01');
      expect(u).toContain('validTo=2028-07-31');
    });
    app('answerChoice(null)');
    await p;
  });

  it('Vorschau, dann übernehmen: nur passende Einträge, erst mit „Speichern“ gespeichert', async () => {
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    const p = app('loadHolidaysFromApi()');
    await flush(); await flush();
    expect(choiceOpen()).toBe(true);
    const text = document.getElementById('modal-choice-text').textContent;
    expect(text).toContain('Herbstferien');
    expect(text).toContain('Ostermontag');
    expect(text).not.toContain('Friedensfest');           // nur Augsburg
    expect(text).not.toContain('Tag der Deutschen Einheit'); // Samstag
    expect(text).not.toContain('Weihnachtsfeiertag');     // liegt in den Ferien
    expect(text).not.toContain('Heilige Drei Könige');
    expect(text).not.toContain('Allerheiligen');          // anderes Bundesland
    expect(text).not.toContain('Sommerferien');           // schon vorbei (heute 15.10.2026)
    app('answerChoice("take")');
    await p;
    expect(rowLabels()).toEqual(['Herbstferien', 'Weihnachtsferien', 'Ostermontag', 'Fronleichnam']);
    expect(app('db.settings.holidays')).toEqual([]);      // noch nicht gespeichert
    app('saveSettings()');
    expect(app('db.settings.holidays').map(h => [h.label, h.from, h.until])).toContainEqual(['Herbstferien', '2026-11-02', '2026-11-06']);
  });

  it('schon Eingetragenes wird nicht doppelt angelegt, eigene Einträge bleiben', async () => {
    app('db.settings.holidays = ' + JSON.stringify([
      { id: 'a', label: 'Herbstferien', from: '2026-11-02', until: '2026-11-06' },
      { id: 'b', label: 'Beweglicher Ferientag', from: '2027-02-15', until: '2027-02-15' }]));
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    const p = app('loadHolidaysFromApi()');
    await flush(); await flush();
    app('answerChoice("take")');
    await p;
    expect(rowLabels().filter(l => l === 'Herbstferien')).toHaveLength(1);
    expect(rowLabels()).toContain('Beweglicher Ferientag');
  });

  it('alles schon da: Hinweis statt Rückfrage', async () => {
    app('db.settings.holidays = ' + JSON.stringify(SCHOOL.map((x, i) => ({ id: 's' + i, label: x.name[0].text, from: x.startDate, until: x.endDate }))
      .concat([{ id: 'o', label: 'Ostermontag', from: '2027-03-29', until: '2027-03-29' }, { id: 'f', label: 'Fronleichnam', from: '2027-05-27', until: '2027-05-27' }])));
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    await app('loadHolidaysFromApi()');
    expect(choiceOpen()).toBe(false);
    expect(toast()).toMatch(/schon/);
  });

  it('keine Verbindung: Hinweis, nichts geändert', async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    await app('loadHolidaysFromApi()');
    expect(toast()).toMatch(/nicht geladen/);
    expect(rows()).toHaveLength(0);
  });

  it('Antwort im falschen Format: Hinweis, nichts geändert', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ error: 'x' }) }));
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    await app('loadHolidaysFromApi()');
    expect(toast()).toMatch(/nicht geladen/);
    expect(rows()).toHaveLength(0);
  });

  it('Einstellungen inzwischen geschlossen: nichts eintragen', async () => {
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    const p = app('loadHolidaysFromApi()');
    await flush(); await flush();
    app('answerChoice("take")');
    app('closeModal("modal-settings")');
    await p;
    app('openSettings()');
    expect(rows()).toHaveLength(0);
  });

  it('Namen aus der Antwort werden nicht als HTML ausgeführt', async () => {
    globalThis.fetch = vi.fn(async url => ({ ok: true, json: async () => (String(url).includes('SchoolHolidays')
      ? [{ startDate: '2026-11-02', endDate: '2026-11-06', name: [{ language: 'DE', text: '<img src=x onerror="window.__xss3=1">' }], nationwide: true }] : []) }));
    app('openSettings()');
    document.getElementById('settings-federal-state').value = 'DE-BY';
    const p = app('loadHolidaysFromApi()');
    await flush(); await flush();
    app('answerChoice("take")');
    await p;
    expect(document.querySelector('#holidays-editor img, #modal-choice img')).toBeNull();
    expect(window.__xss3).toBeUndefined();
  });

  it('Datenschutzhinweise nennen den Dienst', () => {
    expect(document.getElementById('modal-privacy').textContent).toContain('OpenHolidays');
  });
});

describe('Y8c: erneut laden – ersetzen statt überlappen', () => {
  const mk = (t, a, b, code) => ({ startDate: a, endDate: b, name: [{ language: 'DE', text: t }], nationwide: false, subdivisions: [{ code }] });
  const BY = [mk('Herbstferien', '2026-11-02', '2026-11-06', 'DE-BY'), mk('Weihnachtsferien', '2026-12-24', '2027-01-08', 'DE-BY')];
  const NW = [mk('Herbstferien', '2026-10-19', '2026-10-31', 'DE-NW'), mk('Weihnachtsferien', '2026-12-23', '2027-01-06', 'DE-NW')];
  const values = () => rows().map(r => [...r.querySelectorAll('input')].map(i => i.value).join(' '));
  async function load(state, data, answer = 'take') {
    globalThis.fetch = vi.fn(async url => ({ ok: true, json: async () => (String(url).includes('School') ? data : []) }));
    document.getElementById('settings-federal-state').value = state;
    const p = app('loadHolidaysFromApi()');
    await flush(); await flush();
    const text = choiceOpen() ? document.getElementById('modal-choice-text').textContent : '';
    const buttons = choiceOpen() ? [...document.querySelectorAll('#modal-choice-buttons button')].map(b => b.textContent) : [];
    if (choiceOpen()) app(`answerChoice(${JSON.stringify(answer)})`);
    await p;
    return { text, buttons };
  }

  it('Bundesland gewechselt: früher geladene Einträge werden ersetzt (Vorschau sagt es)', async () => {
    app('openSettings()');
    await load('DE-BY', BY);
    app('saveSettings()'); app('openSettings()');
    const { text } = await load('DE-NW', NW);
    expect(text).toMatch(/ersetzt 2 früher geladene/);
    expect(text).toContain('Bayern');
    expect(values()).toEqual(['Herbstferien 2026-10-19 2026-10-31', 'Weihnachtsferien 2026-12-23 2027-01-06']);
  });

  it('geladene Einträge merken sich die Herkunft, auch nach dem Speichern', async () => {
    app('openSettings()');
    await load('DE-BY', BY);
    app('saveSettings()');
    expect(app('db.settings.holidays').every(h => h.source === 'DE-BY')).toBe(true);
  });

  it('eigener Eintrag überschneidet sich: Vorschau nennt ihn, „ersetzen“ entfernt ihn', async () => {
    app('db.settings.holidays = ' + JSON.stringify([{ id: 'm', label: 'Herbst (von Hand)', from: '2026-11-02', until: '2026-11-04' },
      { id: 'b', label: 'Beweglicher Ferientag', from: '2027-02-15', until: '2027-02-15' }]));
    app('openSettings()');
    const { text, buttons } = await load('DE-BY', BY, 'replace');
    expect(text).toContain('Herbst (von Hand)');
    expect(buttons.some(b => /ersetzen/.test(b))).toBe(true);
    expect(buttons.some(b => /behalten/.test(b))).toBe(true);
    expect(values()).toEqual(['Herbstferien 2026-11-02 2026-11-06', 'Weihnachtsferien 2026-12-24 2027-01-08', 'Beweglicher Ferientag 2027-02-15 2027-02-15']);
  });

  it('eigener Eintrag überschneidet sich, „behalten“: beide bleiben', async () => {
    app('db.settings.holidays = ' + JSON.stringify([{ id: 'm', label: 'Herbst (von Hand)', from: '2026-11-02', until: '2026-11-04' }]));
    app('openSettings()');
    await load('DE-BY', BY, 'keep');
    expect(values()).toContain('Herbst (von Hand) 2026-11-02 2026-11-04');
    expect(values()).toContain('Herbstferien 2026-11-02 2026-11-06');
  });

  it('geladenen Eintrag selbst geändert → gilt als eigener, wird beim nächsten Laden nicht ersetzt', async () => {
    app('openSettings()');
    await load('DE-BY', BY);
    const herbst = rows()[0];
    herbst.querySelector('.holiday-until-input').value = '2026-11-09'; // Schule verlängert um ein paar Tage
    app('saveSettings()');
    expect(app('db.settings.holidays')[0].source).toBeUndefined();
    app('openSettings()');
    await load('DE-BY', BY, 'keep');
    expect(values()).toContain('Herbstferien 2026-11-02 2026-11-09');   // eigener bleibt
    expect(values().filter(v => v.startsWith('Herbstferien'))).toHaveLength(1); // deckt die geladenen ab
  });

  it('nochmal dasselbe laden: nichts doppelt, kein „ersetzt“', async () => {
    app('openSettings()');
    await load('DE-BY', BY);
    app('saveSettings()'); app('openSettings()');
    const { text } = await load('DE-BY', BY);
    expect(text).toBe('');                              // keine Rückfrage nötig
    expect(values()).toHaveLength(2);
    expect(toast()).toMatch(/schon/);
  });
});

// AO1: Keine Autokorrektur in Eingabefeldern (iPad ersetzte Wörter, vor allem Namen beim Enter), Sprache Deutsch als
// Hinweis für die Tastatur; Namensfelder ohne Rechtschreibprüfung, Großbuchstabe je Wort. Auch für später gezeichnete Felder.
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [], lessonData: {}, supervisions: [],
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#3b82f6', schularbeitWeight: 50 }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}
const tick = () => new Promise(r => setTimeout(r, 0));   // Beobachter läuft nach dem Einfügen

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });

describe('Eingabefelder (AO1)', () => {
  it('alle Text-Felder und Textbereiche beim Start: Autokorrektur aus, Sprache Deutsch', () => {
    const fields = [...document.querySelectorAll('input, textarea')].filter(el => el.tagName === 'TEXTAREA' || ['text', 'search', ''].includes((el.getAttribute('type') || '').toLowerCase()));
    expect(fields.length).toBeGreaterThan(30);
    expect(fields.filter(el => el.getAttribute('autocorrect') !== 'off').map(el => el.id || el.className)).toEqual([]);
    expect(fields.filter(el => el.getAttribute('lang') !== 'de').map(el => el.id || el.className)).toEqual([]);
  });
  it('Namen: keine Rechtschreibprüfung, großer Anfangsbuchstabe je Wort, keine Vorschläge aus dem Adressbuch', () => {
    for (const id of ['new-student-first', 'new-student-last', 'import-text', 'new-group-class']) {
      const el = document.getElementById(id);
      expect([el.getAttribute('spellcheck'), el.getAttribute('autocapitalize'), el.getAttribute('autocomplete')], id).toEqual(['false', 'words', 'off']);
    }
  });
  it('Passwort-, Datums- und Zahlenfelder bleiben, wie sie sind', () => {
    // Passwort-Felder bleiben Passwort-Felder; ihr „Auge“ stellt Autokorrektur & Co. ab (AU9)
    expect(document.getElementById('sync-reset-password').type).toBe('password');
    expect(document.getElementById('sync-reset-password').getAttribute('autocorrect')).not.toBe('on');
    expect(document.getElementById('new-student-birthday').hasAttribute('autocorrect')).toBe(false);
  });
  it('später gezeichnete Felder (Tabellen, Fenster) bekommen dieselben Einstellungen', async () => {
    const box = document.createElement('div');
    box.innerHTML = '<input type="text" class="spaeter"><textarea class="spaeter2"></textarea><input type="number" class="zahl">';
    document.body.appendChild(box);
    await tick();
    expect(box.querySelector('.spaeter').getAttribute('autocorrect')).toBe('off');
    expect(box.querySelector('.spaeter2').getAttribute('lang')).toBe('de');
    expect(box.querySelector('.zahl').hasAttribute('autocorrect')).toBe(false);
    box.remove();
  });
  it('eigene Einstellung eines Feldes bleibt (Suche)', () => {
    const search = document.getElementById('search-input');
    expect(search.getAttribute('autocorrect')).toBe('off');
    expect(search.getAttribute('lang')).toBe('de');
  });
  it('Stunden-Fenster und Schüler-Fenster: Notizfelder ohne Autokorrektur', () => {
    for (const id of ['lesson-done-text', 'lesson-notes-text', 'seating-student-note-input']) {
      expect(document.getElementById(id).getAttribute('autocorrect'), id).toBe('off');
    }
  });
});

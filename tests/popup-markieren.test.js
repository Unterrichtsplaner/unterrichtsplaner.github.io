// Text in einem Popup markieren und außerhalb loslassen schließt das Popup nicht (wie BUGS O1 bei den Fenstern).
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null }, lessonSlots: [], lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [{ id: 'a', firstName: 'Anna', lastName: 'A', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}
const press = el => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); };
// Browser: click geht an den gemeinsamen Vorfahren von Drücken und Loslassen
const releaseOn = el => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
  app('initAllCustomDropdowns()');
});

describe('Raster-Menü im Sitzplan', () => {
  const popup = () => document.getElementById('seating-settings-popup');
  beforeEach(() => {
    app('openSeatingForGroup("g1")');
    popup().classList.remove('hidden');
  });

  it('im Feld drücken (markieren), außerhalb loslassen → bleibt offen', () => {
    press(document.getElementById('seating-cols'));
    releaseOn(document.body);
    expect(popup().classList.contains('hidden')).toBe(false);
  });

  it('außerhalb drücken und loslassen → schließt wie bisher', () => {
    press(document.body);
    releaseOn(document.body);
    expect(popup().classList.contains('hidden')).toBe(true);
  });
});

describe('Aufklappliste in Formularen', () => {
  it('im Menü drücken, außerhalb loslassen → bleibt offen; außerhalb tippen → zu', () => {
    const container = document.getElementById('new-group-scale').nextSibling;
    const menu = container.querySelector('.custom-form-dropdown-menu');
    menu.classList.add('show');
    press(menu.querySelector('.custom-form-dropdown-item'));
    releaseOn(document.body);
    expect(menu.classList.contains('show')).toBe(true);
    press(document.body);
    releaseOn(document.body);
    expect(menu.classList.contains('show')).toBe(false);
  });
});

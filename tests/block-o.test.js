// Block O (Review 25.09.2026): Fenster, Einstellungen, Navigation.
const { loadApp, app } = require('./helpers/load-app');

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null, themeRadius: 0, themeAccent: '#6366f1' },
    lessonSlots: [],
    lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', color: '#6366f1', schularbeitWeight: 50 }],
    students: {
      g1: [
        { id: 's1', firstName: 'Anna', lastName: 'Zander', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
        { id: 's2', firstName: 'Ben', lastName: 'Adam', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] },
      ],
    },
  };
}

const rootVar = name => document.documentElement.style.getPropertyValue(name);
const hidden = id => document.getElementById(id).classList.contains('hidden');
const lastToast = () => { const t = document.querySelectorAll('#toast-container .toast'); return t.length ? t[t.length - 1].textContent : ''; };
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.confirm = () => true;
});

describe('O1: Markieren und neben dem Fenster loslassen', () => {
  it('schließt das Fenster nicht, die Eingabe bleibt', () => {
    app('openAddSubjectGroup()');
    const input = document.getElementById('new-group-class');
    input.value = 'Testklasse 9z';
    fire(input, 'pointerdown');                                  // Maus im Feld gedrückt …
    const overlay = document.getElementById('modal-add-group');
    // … und daneben losgelassen. Den click nicht per dispatchEvent feuern: Das Inline-onclick läuft in jsdom ins Leere (Regel 18, BUGS P12)
    app('closeModalOnOverlay')({ target: overlay }, 'modal-add-group');
    expect(hidden('modal-add-group')).toBe(false);
    expect(input.value).toBe('Testklasse 9z');
  });

  it('echtes Tippen neben das Fenster schließt weiterhin', () => {
    app('openModal("modal-add-group")');
    const overlay = document.getElementById('modal-add-group');
    fire(overlay, 'pointerdown');
    app('closeModalOnOverlay')({ target: overlay }, 'modal-add-group');
    expect(hidden('modal-add-group')).toBe(true);
  });
});

describe('O2/O3: Darstellung', () => {
  it('O2: Farbvorschau wird beim Schließen ohne Speichern verworfen', () => {
    app('openSettings()');
    app(`selectThemeAccent(document.querySelector('.settings-swatch-accent[data-color="#be123c"]'), "#be123c")`);
    expect(rootVar('--accent')).toBe('#be123c');
    app('closeTopModal()');
    expect(hidden('modal-settings')).toBe(true);
    expect(rootVar('--accent')).toBe('#6366f1');
  });

  it('O2: auch der ✕-Knopf verwirft die Vorschau', () => {
    const btn = document.querySelector('#modal-settings .modal-close');
    expect(btn.getAttribute('onclick')).toBe("closeModalLikeButton('modal-settings')");
  });

  it('O3: gespeicherter Radius gilt nach dem Laden, nicht der Startwert des Reglers', () => {
    document.getElementById('settings-radius').value = '8'; // Startwert aus index.html
    app('updateAppliedThemeFromDB()');
    expect(rootVar('--radius-md')).toBe('0px');
  });
});

describe('O4: Speichern der Einstellungen zeichnet die offene Ansicht neu', () => {
  it('Sortierung nach Nachname wirkt sofort in der Schülerliste', () => {
    app('openGroupStudents("g1")');
    app('openSettings()');
    document.getElementById('settings-sort-order').value = 'lastName';
    app('saveSettings()');
    const first = document.querySelector('#students-container .student-name, #students-container [class*="name"]');
    expect(first.textContent).toContain('Adam');
  });
});

describe('O5: Einstellungen prüfen', () => {
  it('leerer Sitzplan-Vorlauf → Standard 5', () => {
    app('openSettings()');
    document.getElementById('settings-seating-buffer').value = '';
    app('saveSettings()');
    expect(app('db.settings.seatingBufferMins')).toBe(5);
  });

  it('Block mit Ende vor Beginn wird nicht gespeichert', () => {
    app('openSettings()');
    const times = document.querySelectorAll('#blocks-editor .block-time-input');
    times[0].value = '10:00'; times[1].value = '09:00';
    app('saveSettings()');
    expect(app('db.settings.blocks')).toBeNull();
    expect(lastToast()).toContain('1. Block');
    expect(hidden('modal-settings')).toBe(false);
  });

  it('neuer Block beginnt nach dem letzten', () => {
    app('openSettings(); addBlockRow()');
    const b = app('blocksDraft[blocksDraft.length - 1]');
    expect(b.start).toBe('15:30');
    expect(b.end).toBe('17:00');
  });
});

describe('O6: Logo', () => {
  it('lädt die Seite nicht neu, sondern öffnet das Dashboard', () => {
    const logo = document.querySelector('.app-logo');
    expect(logo.getAttribute('onclick')).not.toContain('reload');
    app('switchView("timetable")');
    app(logo.getAttribute('onclick'));
    expect(document.getElementById('view-dashboard').classList.contains('active')).toBe(true);
  });
});

describe('O8: Fenster für Screenreader und Tastatur', () => {
  it('alle Fenster sind als Dialog ausgezeichnet und benannt', () => {
    document.querySelectorAll('.modal-overlay > .modal').forEach(m => {
      expect(m.getAttribute('role'), m.parentElement.id).toBe('dialog');
      expect(m.getAttribute('aria-modal')).toBe('true');
      const label = m.getAttribute('aria-labelledby');
      if (m.querySelector('h2')) expect(document.getElementById(label)).toBeTruthy();
    });
  });

  it('Fokus geht beim Öffnen ins Fenster und beim Schließen zurück', () => {
    const btn = document.getElementById('nav-settings');
    btn.focus();
    app('openSettings()');
    expect(document.getElementById('modal-settings').contains(document.activeElement)).toBe(true);
    app('closeTopModal()');
    expect(document.activeElement).toBe(btn);
  });
});

// „Das ist neu“: einmal pro Gerät nach einem großen Update, nicht bei neuen Nutzern.
const { loadApp, app } = require('./helpers/load-app');

const SEEN_KEY = 'whats_new_seen';

function sampleDB() {
  return {
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [], lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathe', className: '5a', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [{ id: 's1', firstName: 'Anna', lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [] }] },
  };
}
const emptyDB = () => ({ settings: { teacherName: '', school: '', blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} });

const modal = () => document.getElementById('modal-whats-new');
const isOpen = () => !modal().classList.contains('hidden');

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});

beforeEach(() => {
  localStorage.removeItem(SEEN_KEY);
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

describe('Das ist neu', () => {
  it('erscheint bei vorhandenen Daten, wenn das Update noch nicht gesehen wurde', () => {
    app('showWhatsNewIfDue()');
    expect(isOpen()).toBe(true);
    const text = modal().textContent;
    expect(text).toContain('Das ist neu');
    expect(text).toContain('Sitzplan');
    expect(text).toContain('Master-Passwort');
    expect(text).toContain('Heute');
    expect(text).toContain('0–15 Punkte');
    expect(text).toContain('Verschlüsselung');
  });

  it('„Verstanden“ schließt es, und es kommt danach nie wieder', () => {
    app('showWhatsNewIfDue()');
    app('closeWhatsNew()');
    expect(isOpen()).toBe(false);
    app('showWhatsNewIfDue()');
    expect(isOpen()).toBe(false);
  });

  it('Wegdrücken (Escape / daneben tippen) zählt ebenfalls als gesehen', () => {
    app('showWhatsNewIfDue()');
    app('closeModalLikeButton("modal-whats-new")');
    expect(isOpen()).toBe(false);
    app('showWhatsNewIfDue()');
    expect(isOpen()).toBe(false);
  });

  it('neue Nutzer ohne Daten sehen es nicht – auch später nicht, wenn sie Daten anlegen', () => {
    app('db = ' + JSON.stringify(emptyDB()));
    app('showWhatsNewIfDue()');
    expect(isOpen()).toBe(false);
    app('db = ' + JSON.stringify(sampleDB()));
    app('showWhatsNewIfDue()');
    expect(isOpen()).toBe(false);
  });

  it('wartet, solange ein anderes Fenster offen ist (z. B. Konflikt-Dialog)', () => {
    vi.useFakeTimers();
    try {
      document.getElementById('modal-sync-conflict').classList.remove('hidden');
      app('showWhatsNewIfDue()');
      expect(isOpen()).toBe(false);
      document.getElementById('modal-sync-conflict').classList.add('hidden');
      vi.advanceTimersByTime(3000);
      expect(isOpen()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('blockiert den Sync nicht (kein Eingabefenster)', () => {
    app('showWhatsNewIfDue()');
    expect(isOpen()).toBe(true);
    expect(app('inputModalOpen()')).toBe(false);
  });

  it('funktioniert auch, wenn der Browser-Speicher gesperrt ist', () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('gesperrt'); };
    try {
      expect(() => app('showWhatsNewIfDue()')).not.toThrow();
    } finally {
      Storage.prototype.getItem = orig;
    }
  });
});

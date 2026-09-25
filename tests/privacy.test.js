// Datenschutzhinweise in den Einstellungen (BUGS Y1): Lehrkräfte brauchen etwas, das sie der Schulleitung vorlegen können.
const { loadApp, app } = require('./helpers/load-app');

const isOpen = id => !document.getElementById(id).classList.contains('hidden');

beforeAll(() => {
  loadApp();
});

beforeEach(() => {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

describe('Datenschutzhinweise', () => {
  it('Knopf in den Einstellungen öffnet das Fenster', () => {
    const btn = document.querySelector('#modal-settings button[onclick="openPrivacyNotice()"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Datenschutzhinweise');
    app('openSettings()');
    app('openPrivacyNotice()');
    expect(isOpen('modal-privacy')).toBe(true);
    expect(isOpen('modal-settings')).toBe(true);
  });

  it('liegt über den Einstellungen: Escape schließt nur die Hinweise', () => {
    app('openSettings()');
    app('openPrivacyNotice()');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(isOpen('modal-privacy')).toBe(false);
    expect(isOpen('modal-settings')).toBe(true);
  });

  it('nennt, was wo liegt: Gerät, Verschlüsselung, Anbieter, Schule', () => {
    const text = document.getElementById('modal-privacy').textContent;
    ['auf diesem Gerät', 'Master-Passwort', 'Google', 'Firebase', 'GitHub', 'Schulleitung', 'Tracking']
      .forEach(word => expect(text, word).toContain(word));
  });
});

// „Passwort anzeigen“ (Auge) an den Master-Passwort-Feldern.
const { loadApp, app } = require('./helpers/load-app');

const IDS = ['sync-master-password', 'sync-master-password-confirm', 'sync-reset-password', 'sync-reset-password-confirm'];
const btnFor = id => document.getElementById(id).parentElement.querySelector('.password-reveal');

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} }));
  loadApp();
});

describe('Master-Passwort anzeigen', () => {
  it('jedes Master-Passwort-Feld hat ein Auge mit Namen; Konto-Passwort nicht', () => {
    IDS.forEach(id => {
      const btn = btnFor(id);
      expect(btn, id).toBeTruthy();
      expect(btn.getAttribute('aria-label')).toBe('Passwort anzeigen');
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.type).toBe('button');
      expect(btn.querySelector('svg')).toBeTruthy();
    });
    expect(document.getElementById('sync-password').parentElement.querySelector('.password-reveal')).toBeNull();
  });

  it('Antippen zeigt und verbirgt das Passwort', () => {
    const input = document.getElementById('sync-master-password');
    btnFor('sync-master-password').click();
    expect(input.type).toBe('text');
    expect(btnFor('sync-master-password').getAttribute('aria-pressed')).toBe('true');
    expect(btnFor('sync-master-password').getAttribute('aria-label')).toBe('Passwort verbergen');
    btnFor('sync-master-password').click();
    expect(input.type).toBe('password');
  });

  it('Drücken nimmt dem Feld nicht den Fokus (sonst würde das Passwort vorzeitig übernommen)', () => {
    const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    btnFor('sync-master-password').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('Einstellungen schließen oder App verlassen: wieder verborgen', () => {
    app('openSettings()');
    btnFor('sync-master-password').click();
    btnFor('sync-reset-password').click();
    window.confirm = () => true;
    app('cancelSettings()');
    IDS.forEach(id => expect(document.getElementById(id).type, id).toBe('password'));
    btnFor('sync-master-password').click();
    app('onAppHidden()');
    expect(document.getElementById('sync-master-password').type).toBe('password');
  });

  it('Feld ist nicht mehr schmaler als vorher nötig: Platz rechts für das Auge', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'style.css'), 'utf8');
    expect(css).toMatch(/\.password-field input\{[^}]*padding-right/);
  });
});

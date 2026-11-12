// Z5: Hilfeseite „So funktioniert die Cloud“ (Einstellungen → Cloud-Synchronisierung → „Wie funktioniert das?“).
const fs = require('fs'), path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {} })); loadApp(); });

describe('Z5: Hilfe zur Cloud', () => {
  it('Knopf in den Cloud-Einstellungen öffnet das Fenster, Schließen per Knopf', () => {
    expect(html).toMatch(/onclick="openCloudHelp\(\)"[^>]*>[^<]*(<i[^>]*><\/i>)?Wie funktioniert das\?/);
    app('openCloudHelp()');
    const m = document.getElementById('modal-cloud-help');
    expect(m.classList.contains('hidden')).toBe(false);
    expect(m.querySelector('.modal-close').getAttribute('aria-label')).toBe('Schließen');
    app('closeModalLikeButton("modal-cloud-help")');
    expect(m.classList.contains('hidden')).toBe(true);
  });
  it('erklärt das Wichtige, mit den Namen der echten Knöpfe', () => {
    const t = document.getElementById('modal-cloud-help').textContent;
    for (const s of ['Anmelde-Passwort', 'Master-Passwort', 'Master-Passwort vergessen oder ändern?', 'ohne Internet', 'Zwei Stände',
      'Sicherheitskopie dieses Geräts speichern, dann Cloud laden', 'Cloud-Version laden', 'Dieses Gerät hochladen',
      'Früheren Stand zurückholen', '14 Tage', 'Exportieren', 'Importieren', 'Alles löschen, auch in der Cloud', 'Cloud-Konto löschen']) {
      expect(t, s).toContain(s);
    }
    expect(t).not.toMatch(/!/);   // keine Ausrufezeichen (Regel 68)
  });
  it('Fenster hat eine Breite, Text ist markierbar', () => {
    expect(html).toMatch(/id="modal-cloud-help"[^>]*>\s*<div class="modal modal-small/);
    expect(css).toMatch(/#modal-cloud-help \.modal-body/);
  });
});

// AH38: Einstellungen als Fenster mit Menü und Bereichen statt vier Bildschirmen Scrollen.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

const rail = () => [...document.querySelectorAll('#modal-settings .set-rail button')];
const panes = () => [...document.querySelectorAll('#modal-settings .set-pane')];
const onPane = () => panes().filter(p => p.classList.contains('on')).map(p => p.dataset.pane);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { teacherName: 'T', blocks: null }, lessonSlots: [], lessonData: {}, groups: [], students: {}, supervisions: [] })); loadApp(); });
afterEach(() => { app('closeModal("modal-settings")'); });

describe('Menü und Bereiche', () => {
  it('sieben Bereiche, jeder mit Knopf; beim Öffnen immer „Allgemein“', () => {
    expect(rail().map(b => b.textContent.trim())).toEqual(['Allgemein', 'Unterricht', 'Stundenzeiten', 'Ferien', 'Darstellung', 'Daten & Cloud', 'Über die App']);
    expect(panes().length).toBe(7);
    app('openSettings()');
    expect(onPane()).toEqual(['general']);
    expect(rail()[0].getAttribute('aria-current')).toBe('true');
  });
  it('Antippen wechselt den Bereich, und nächstes Öffnen beginnt wieder oben', () => {
    app('openSettings()');
    rail()[5].click();
    expect(onPane()).toEqual(['data']);
    expect(rail()[5].getAttribute('aria-current')).toBe('true');
    expect(rail()[0].getAttribute('aria-current')).toBe('false');
    app('closeModal("modal-settings"); openSettings()');
    expect(onPane()).toEqual(['general']);
  });
  it('jedes Feld steckt in genau dem Bereich, in den es gehört', () => {
    const where = id => document.getElementById(id).closest('.set-pane').dataset.pane;
    expect(where('settings-teacher-name') || '').toBe('general');
    expect(where('settings-seating-buffer')).toBe('lessons');
    expect(where('settings-class-grades-protect')).toBe('lessons');
    expect(where('blocks-editor')).toBe('times');
    expect(where('sync-master-password')).toBe('data');
    expect(where('merge-restore-row')).toBe('data');
  });
  it('keine Karte außerhalb eines Bereichs', () => {
    expect(document.querySelectorAll('#modal-settings .set-body > :not(.set-pane)').length).toBe(0);
    document.querySelectorAll('#modal-settings .settings-section').forEach(s => expect(s.closest('.set-card')).not.toBeNull());
  });
  it('Cloud-Hinweis steht auch am Menüpunkt', () => {
    const b = document.querySelector('#modal-settings .set-rail [data-pane="data"]');
    app('syncNeedsAttention = () => true; updateSyncAttention()');
    expect(b.classList.contains('needs-attention')).toBe(true);
    app('syncNeedsAttention = () => false; updateSyncAttention()');
    expect(b.classList.contains('needs-attention')).toBe(false);
  });
  it('Speichern steht rechts, der Hinweis links', () => {
    const foot = document.querySelector('#modal-settings .modal-footer');
    expect([...foot.children].map(c => c.tagName)).toEqual(['SPAN', 'BUTTON']);
    expect(foot.getAttribute('style')).toBeNull();
    expect(css).toMatch(/\.settings-footer-hint\{[^}]*margin-right:auto/);
  });
});

describe('Knöpfe unten in allen Fenstern (AH38)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  it('keine Sonderwege per Inline-Stil, die Löschen-Knöpfe gehen über .footer-left', () => {
    const footers = [...html.matchAll(/<div class="modal-footer[^"]*"[^>]*>/g)].map(m => m[0]);
    expect(footers.filter(f => f.includes('style=') && !f.includes('modal-choice-buttons'))).toEqual([]);
    expect(css).toMatch(/\.modal-footer\{[^}]*justify-content:flex-end/);
    expect(css).toMatch(/\.footer-left\{margin-right:auto;\}/);
    ['btn-delete-lesson', 'btn-plan-topic-delete'].forEach(id => { const m = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`)); if (m) expect(m[0]).toContain('footer-left'); });
  });
});

describe('Hauptknopf rechts und Listen bis zum Rand (AH38)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  it('Klassenkopf: „+ Heute“ steht als letzter Knopf', () => {
    const block = html.slice(html.indexOf('id="student-view-title"'));
    const actions = block.slice(block.indexOf('class="header-actions"'), block.indexOf('</div>', block.indexOf('class="header-actions"')));
    const ids = [...actions.matchAll(/<button[^>]*?(?:id="([^"]+)")?[^>]*class="([^"]+)"|<button[^>]*class="([^"]+)"[^>]*?id="([^"]+)"/g)];
    const last = [...actions.matchAll(/<button\b[^>]*>/g)].pop()[0];
    expect(last).toContain('btn-add-overview-col');
    expect(ids.length).toBeGreaterThan(2);
  });
  it('Planung und Klassenplan ohne Höchstbreite', () => {
    expect(css).not.toMatch(/\.plan-view\{[^}]*max-width/);
    expect(css).not.toMatch(/\.tt-class-list\{[^}]*max-width/);
  });
});

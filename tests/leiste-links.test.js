// AH47 Teil 1: Oben links stehen weder „Planer“ noch ☰. Die oberste Zeile ist die Suche, die aussieht wie ein Menüpunkt
// (sie öffnet ja nur ein Fenster), Einklappen ist ein benannter Menüpunkt unten. Auf dem Handy: Lupe neben dem Zahnrad.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const ROOT = path.join(__dirname, '..');
const CSS = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = sel => [...CSS.matchAll(new RegExp('(?:^|[}\\s,])' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(?:,[^{]*)?\\{([^}]*)\\}', 'gm'))].map(m => m[1]).join(';');
const $ = id => document.getElementById(id);

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify({ settings: { teacherName: 'T', blocks: null }, lessonSlots: [], lessonData: {}, supervisions: [], groups: [], students: {} })); loadApp(); });

describe('Oberste Zeile', () => {
  it('kein Schriftzug, kein ☰; die Suche steht in der Kopfzeile der Leiste', () => {
    expect(document.querySelector('.app-logo')).toBeNull();
    expect(document.querySelector('.sidebar-toggle-btn')).toBeNull();
    expect($('btn-search').parentElement.classList.contains('sidebar-header')).toBe(true);
    expect(CSS).not.toMatch(/\.app-logo|\.logo-short|\.sidebar-toggle-btn/);
  });
  it('die Suche sieht aus wie ein Menüpunkt, nicht wie ein Feld', () => {
    const r = rule('.sidebar-search');
    expect(r).toMatch(/border:none/);
    expect(r).toMatch(/background:transparent/);
    expect(r).toMatch(/height:var\(--control-h\)/);
    expect($('btn-search').tagName).toBe('BUTTON');
    expect($('btn-search').getAttribute('onclick')).toBe('openSearch()');
    expect($('btn-search').textContent.trim()).toBe('Suchen');
  });
});

describe('Einklappen', () => {
  it('ein Menüpunkt unten über der Linie zu den Einstellungen, ohne Ziel-Ansicht; auf dem Handy nicht da', () => {
    const btn = $('btn-sidebar-toggle');
    expect(btn.classList.contains('nav-item')).toBe(true);
    expect(btn.parentElement.classList.contains('nav-items')).toBe(true);
    expect(btn.nextElementSibling).toBeNull();
    expect(rule('#btn-sidebar-toggle')).toMatch(/margin-top:auto/);
    expect(rule('#btn-sidebar-toggle')).toMatch(/display:none/);
    expect(btn.dataset.view).toBeUndefined();
    expect(btn.getAttribute('onclick')).toBe('toggleSidebar(event)');
    expect(btn.querySelector('svg')).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Einklappen');
  });
  it('der Name sagt, was als Nächstes passiert, auch für VoiceOver', () => {
    const btn = $('btn-sidebar-toggle'), sb = $('sidebar');
    sb.classList.remove('collapsed'); app('updateSidebarToggle()');
    expect(btn.getAttribute('aria-label')).toBe('Leiste einklappen');
    app('toggleSidebar()');
    expect(sb.classList.contains('collapsed')).toBe(true);
    expect(btn.getAttribute('aria-label')).toBe('Leiste ausklappen');
    app('toggleSidebar()');
    expect(btn.getAttribute('aria-label')).toBe('Leiste einklappen');
  });
  it('schmal startet zugeklappt und der Name stimmt von Anfang an', () => {
    window.innerWidth = 820; app('applyInitialSidebar()');
    expect($('btn-sidebar-toggle').getAttribute('aria-label')).toBe('Leiste ausklappen');
    window.innerWidth = 1180; app('applyInitialSidebar()');
    expect($('btn-sidebar-toggle').getAttribute('aria-label')).toBe('Leiste einklappen');
    window.innerWidth = 1024;
  });
  it('Wechseln der Ansicht lässt den Knopf in Ruhe', () => {
    app('switchView("classes")');
    expect($('btn-sidebar-toggle').classList.contains('active')).toBe(false);
  });
});

describe('Handy', () => {
  it('Lupe als Knopf im Kopf des Dashboards neben dem Zahnrad, kein Feld mehr', () => {
    const lupe = $('btn-search-dashboard');
    expect(lupe.classList.contains('btn-icon')).toBe(true);
    expect(lupe.parentElement.classList.contains('view-header')).toBe(true);
    expect(lupe.nextElementSibling.id).toBe('btn-settings-dashboard');
    expect(lupe.getAttribute('aria-label')).toBe('Suchen');
    expect(CSS).not.toMatch(/\.dash-search[^-]/);
  });
});

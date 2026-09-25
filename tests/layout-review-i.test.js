// Block I (Design-Review 24.09.2026). jsdom misst kein Layout – geprüft werden Markup und Regeln,
// im Browser nachgemessen bei 375/768/1024 px.
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// Alle Deklarationen, die style.css für einen Selektor setzt (Regeln ohne Medienabfrage und mit)
function rulesFor(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  return [...css.matchAll(new RegExp(`(?:^|[}\\s,])${esc}\\s*\\{([^}]*)\\}`, 'g'))].map(m => m[1]).join(';');
}

beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify({
    settings: { teacherName: 'Test', school: '', blocks: null },
    lessonSlots: [], lessonData: {},
    groups: [{ id: 'g1', subject: 'Mathematik', className: 'Q1 Leistungskurs', color: '#6366f1', schularbeitWeight: 50 }],
    students: { g1: [] },
  }));
  loadApp();
});

describe('I1: Dashboard lässt sich scrollen', () => {
  it('der Inhalt liegt in einem eigenen Scrollbereich unter dem Kopf', () => {
    // .view hat overflow:hidden; vorher hatte der Inhalt gar kein CSS → alles unterhalb des Bildschirms unerreichbar
    const content = document.getElementById('dashboard-content');
    const scroller = content.parentElement;
    expect(scroller.parentElement.id).toBe('view-dashboard');
    expect(scroller.classList.contains('dashboard-scroll')).toBe(true);
    const r = rulesFor('.dashboard-scroll');
    expect(r).toMatch(/flex:\s*1/);
    expect(r).toMatch(/min-height:\s*0/);
    expect(r).toMatch(/overflow-y:\s*auto/);
  });

  it('der Inhalt füllt schmale Bildschirme, Layout steht in style.css statt inline', () => {
    const content = document.getElementById('dashboard-content');
    expect(content.getAttribute('style')).toBeNull();
    const r = rulesFor('#dashboard-content');
    expect(r).toMatch(/width:\s*100%/);      // margin:0 auto ohne width schrumpft den Block (H12)
    expect(r).toMatch(/max-width:\s*800px/);
  });
});

describe('I2: Klassenkarten schneiden nichts ab', () => {
  it('Karten wachsen mit dem Inhalt statt fest quadratisch mit overflow:hidden', () => {
    const r = rulesFor('.subject-group-card');
    expect(r).not.toMatch(/aspect-ratio/);
    expect(r).not.toMatch(/overflow:\s*hidden/);
  });

  it('lange Klassennamen brechen um statt über den Rand zu laufen', () => {
    expect(rulesFor('.sgc-class')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('Karte zeigt weiterhin alle Teile inkl. Sitzplan-Knopf', () => {
    app('switchView("classes")');
    const card = document.querySelector('.subject-group-card');
    expect(card.textContent).toContain('Q1 Leistungskurs');
    expect(card.textContent).toContain('Sitzplan');
  });
});

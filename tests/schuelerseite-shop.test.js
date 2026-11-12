// Plus-Konto mit Laden (BUGS AV1, Stufe 1) auf der Schülerseite: eigener Reiter SHOP wie ein Item-Shop aus Spielen
// (KONZEPT-PLUSKONTO.md, 5a). Ältere Auszüge ohne Konto zeigen weiter die Joker (Regel 15).
const fs = require('fs');
const path = require('path');
const { loadScript } = require('./helpers/load-app');

const X = `Peter's "Test" <img data-xss src=x>`;
const html = fs.readFileSync(path.join(__dirname, '..', 'schueler.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'schueler.css'), 'utf8');
const page = () => document.getElementById('page');
const SHOP = [
  { id: 'l-platz', name: 'Sitzplatz aussuchen', price: 2, kind: 'perk', icon: 'seat' },
  { id: 'l-song', name: 'Song aussuchen', price: 3, kind: 'perk', icon: 'music' },
  { id: 'l-tue', name: 'Keine TÜ abgeben', price: 4, kind: 'perk', icon: 'skip' },
  { id: 'l-eins', name: 'Eine 1 (mündlich)', price: 6, kind: 'grade', icon: 'one' },
];
const me = (extra = {}) => ({
  v: 1, kind: 'me', first: 'Anna', cls: '7b', subject: 'Mathematik', teacher: 'Herr T.', level: 7, xp: 140, from: 130, next: 160, feedback: [], year: [],
  account: { balance: 5, earned: 9, spent: 4, shop: SHOP, redeemed: [
    { date: '2026-11-09', name: 'Song aussuchen', price: 3, kind: 'perk', icon: 'music' },
    { date: '2026-11-05', name: 'Spende an die Klasse', price: 1, kind: 'donate' },
    { date: '2026-10-20', name: 'Joker: Platz wählen', price: 0, kind: 'joker' }] },
  klasse: { goal: { target: 200, reward: 'Spielestunde', count: 162, donated: 7 } },
  ...extra,
});
const show = (d, tab = 'shop') => { window.SchuelerSeite.setMeTab(tab); window.renderStudentPage(d); };

beforeAll(() => {
  document.body.innerHTML = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script[\s\S]*?<\/script>/g, '');
  loadScript('student-share.js');
  loadScript('schueler.js');
});
afterEach(() => {
  document.querySelectorAll('.shop-buy').forEach(e => e.remove());
  window.SchuelerSeite.setMeTab('ich');
  window.renderStudentPage({ v: 2, cls: '7b' });
});

describe('Reiter SHOP', () => {
  it('erscheint nur mit Konto im Auszug, als vierter Reiter', () => {
    show(me(), 'ich');
    expect([...page().querySelectorAll('.tabs [data-tab]')].map(b => b.textContent)).toEqual(['Ich', 'Sammlung', 'Klasse', 'Shop']);
    expect(page().querySelector('.tabs').classList.contains('four')).toBe(true);
    const old = me({ jokers: { open: 1, list: ['A'] } });
    delete old.account;
    show(old, 'ich');
    expect([...page().querySelectorAll('.tabs [data-tab]')].map(b => b.textContent)).toEqual(['Ich', 'Sammlung', 'Klasse']);
    expect(page().querySelector('.card.joker')).not.toBeNull();   // ältere Planer: Joker wie bisher
  });
  it('Konto als riesige Zahl, darunter die Regel und wie viel schon eingelöst ist', () => {
    show(me());
    expect(page().querySelector('.shop-bal .shop-num').textContent.trim()).toBe('5');
    expect(page().querySelector('.shop-bal').textContent).toMatch(/\+ ist 1 Plus wert · \+\+ sind 2 · 4 schon eingelöst/);
  });
  it('Highlight ist das teuerste Angebot; die übrigen im Raster; Seltenheit nach Preis', () => {
    show(me());
    const hl = page().querySelector('.shop-hl');
    expect(hl.textContent).toMatch(/Eine 1 \(mündlich\)/);
    expect(hl.classList.contains('r-legend')).toBe(true);
    expect(hl.textContent).toMatch(/Legendär/);
    const grid = [...page().querySelectorAll('.shop-grid .shop-item')];
    expect(grid.map(e => e.querySelector('.name').textContent)).toEqual(['Sitzplatz aussuchen', 'Song aussuchen', 'Keine TÜ abgeben']);
    expect(grid.map(e => ['r-common', 'r-rare', 'r-epic', 'r-legend'].find(c => e.classList.contains(c)))).toEqual(['r-common', 'r-rare', 'r-epic']);
  });
  it('was das Konto nicht hergibt: gesperrt mit „noch N Plusse“, kein Knopf', () => {
    show(me());
    const hl = page().querySelector('.shop-hl');
    expect(hl.classList.contains('locked')).toBe(true);
    expect(hl.tagName).not.toBe('BUTTON');
    expect(hl.textContent).toMatch(/noch 1 Plus\b/);
    show(me({ account: { ...me().account, balance: 1 } }));
    expect(page().querySelector('.shop-grid .shop-item').textContent).toMatch(/noch 1 Plus\b/);
    expect(page().querySelectorAll('.shop-grid .shop-item')[1].textContent).toMatch(/noch 2 Plusse/);
    expect(page().querySelectorAll('.shop-grid button.shop-item').length).toBe(0);
  });
  it('Spenden für die Klasse nur mit Klassenziel; zu große Beträge gesperrt', () => {
    show(me());
    const give = page().querySelector('.shop-give');
    expect(give.textContent).toMatch(/162 von 200 Plussen, dann gibt es: Spielestunde/);
    expect(give.textContent).toMatch(/Gespendete Plusse zählen noch einmal/);
    expect(give.textContent).toMatch(/7 schon gespendet/);
    expect([...give.querySelectorAll('[data-donate]')].map(b => [b.dataset.donate, b.disabled])).toEqual([['1', false], ['3', false], ['5', false], ['10', true]]);
    show(me({ klasse: {} }));
    expect(page().querySelector('.shop-give')).toBeNull();
  });
  it('Eingelöst: neueste zuerst mit Datum und Abzug; alte Joker ohne Abzug', () => {
    show(me());
    const rows = [...page().querySelectorAll('.shop-done li')].map(li => li.textContent.replace(/\s+/g, ' ').trim());
    expect(rows[0]).toMatch(/Song aussuchen.*09\.11\..*−3/);
    expect(rows[1]).toMatch(/Spende an die Klasse.*−1/);
    expect(rows[2]).toMatch(/Joker: Platz wählen/);
    expect(rows[2]).not.toMatch(/−/);
  });
  it('Antippen öffnet den Kauf-Bildschirm in der Farbe der Seltenheit; ✕ und Escape schließen ihn', () => {
    show(me());
    const song = [...page().querySelectorAll('.shop-grid button.shop-item')].find(b => /Song/.test(b.textContent));
    song.click();
    const buy = document.querySelector('.shop-buy');
    expect(buy.getAttribute('role')).toBe('dialog');
    expect(buy.classList.contains('r-rare')).toBe(true);
    expect(buy.textContent).toMatch(/Song aussuchen/);
    expect(buy.textContent).toMatch(/Zeig das deiner Lehrkraft/);
    expect(buy.textContent).toMatch(/danach 2 Plusse übrig/);
    buy.querySelector('.shop-buy-close').click();
    expect(document.querySelector('.shop-buy')).toBeNull();
    page().querySelector('[data-donate="3"]').click();
    expect(document.querySelector('.shop-buy').textContent).toMatch(/Für die Klasse spenden/);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.shop-buy')).toBeNull();
  });
  it('„Ich“ zeigt statt der Joker das Konto mit Weg zum Shop; Hilfe und Sammlung ohne Joker', () => {
    show(me(), 'ich');
    expect(page().querySelector('.card.joker')).toBeNull();
    const acct = page().querySelector('.acct');
    expect(acct.textContent).toMatch(/Dein Konto/);
    expect(acct.textContent).toMatch(/5\s*Plusse/);
    expect(page().querySelector('.hero details.xp-help').textContent).toMatch(/Shop/);
    expect(page().querySelector('.hero').textContent).not.toMatch(/Joker/);
    acct.click();
    expect(page().querySelector('.shop-bal')).not.toBeNull();
    show(me(), 'sammlung');
    expect(page().textContent).not.toMatch(/Joker/);
  });
  it('escaped alle Namen aus dem Laden', () => {
    show(me({ account: { balance: 9, earned: 9, spent: 0, shop: [{ id: X, name: X, price: 2, kind: X, icon: X }], redeemed: [{ date: '2026-11-02', name: X, price: 1, kind: X, icon: X }] } }));
    expect(page().querySelector('[data-xss]')).toBeNull();
    expect(page().textContent).toContain(X);
    page().querySelector('.shop-hl').click();
    expect(document.querySelector('.shop-buy [data-xss]')).toBeNull();
  });
  it('Gestaltung: keine Schatten, keine Verläufe, kein Lila im Shop; vier Reiter passen (schmaler)', () => {
    const shopCss = css.slice(css.indexOf('/* Shop (AV1)'));
    expect(shopCss.length).toBeGreaterThan(100);
    expect(shopCss).not.toMatch(/box-shadow|gradient/);
    expect(shopCss).not.toMatch(/oklch\([^)]*\s(2[89]\d|3[0-2]\d)(\.\d+)?\)/);   // Farbton Lila/Violett
    expect(css).toMatch(/\.tabs\.four \{[^}]*gap: var\(--s3\)/);
    expect(css).toMatch(/\.tabs\.four button \{[^}]*font-size: min\(28px,/);   // auf schmalen Handys kleiner (gemessen bis 320 px)
  });
});

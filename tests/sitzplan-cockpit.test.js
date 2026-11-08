// Unterrichts-Cockpit im Sitzplan (AD2) und Geburtstage (AD6)
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

// Mo 02.11.2026: 7a hat 1. Block (07:45–09:15) und 3. Block, 9c den 2. Block
const MON = '2026-11-02', FRI = '2026-10-30', THU = '2026-10-29';
const student = (id, firstName, extra = {}) => ({ id, firstName, lastName: 'Muster', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'T', blocks: null },
    lessonSlots: [
      { id: 'm1', day: 0, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R101' },
      { id: 'p2', day: 0, block: 2, part: 'full', subject: 'Physik', color: '#22c55e', groupId: 'g2', recurring: 'weekly', room: 'R132' },
      { id: 'm3', day: 0, block: 3, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R101' },
      { id: 'm4', day: 4, block: 1, part: 'full', subject: 'Mathe', color: '#6366f1', groupId: 'g1', recurring: 'weekly', room: 'R101' },
    ],
    lessonData: {
      [`m4_${FRI}`]: { done: 'Brüche kürzen\nzweite Zeile', hwEnabled: true, hwItems: [{ id: 'h1', text: 'S. 12 Nr. 3', targetDate: MON }] },
    },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7a', color: '#6366f1', schularbeitWeight: 50, seatingCols: 4, seatingRows: 3 },
             { id: 'g2', subject: 'Physik', className: '9c', color: '#22c55e', schularbeitWeight: 50 }],
    students: {
      g1: [
        student('a', 'Anna', { notes: 'hörgeschädigt – vorne sitzen', birthday: '2013-11-02' }),
        student('b', 'Ben', { attendance: [{ id: 'x1', date: FRI, type: 'abwesend' }] }),
        student('c', 'Clara', { attendance: [{ id: 'x2', date: MON, type: 'entschuldigt' }] }),
        student('d', 'David', { birthday: '2012-10-31' }), // Samstag
      ],
      g2: [],
    },
    supervisions: [],
  };
}
const at = (h, m = 0, s = 0) => vi.setSystemTime(new Date(2026, 10, 2, h, m, s));
const cockpit = () => document.getElementById('seating-cockpit');
// „Live“ = Leiste der laufenden Stunde (Restzeit). Außerhalb zeigt die Leiste seit AH50 die nächste Stunde (tests/sitzplan-neu).
const shown = () => !cockpit().classList.contains('hidden') && cockpit().classList.contains('live');
const openSeating = (groupId = 'g1') => app(`seatingRequest = { groupId: ${JSON.stringify(groupId)}, dateStr: "${MON}" }; switchView("seating")`);
const card = id => document.querySelector(`.seating-card[data-id="${id}"]`);

let wakeRequests, released;
beforeAll(() => {
  localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB()));
  loadApp();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(8, 0);
  app('db = ' + JSON.stringify(sampleDB()));
  app('seatingEditMode = false; seatingShowGrades = false; seatingShowTrend = false');
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  wakeRequests = 0; released = 0;
  navigator.wakeLock = { request: vi.fn(async () => { wakeRequests++; const l = new EventTarget(); l.release = vi.fn(async () => { released++; }); return l; }) };
});
afterEach(() => { app('switchView("dashboard")'); vi.useRealTimers(); });
const flush = () => new Promise(r => setTimeout(r, 0));

describe('Cockpit-Leiste', () => {
  it('während der Stunde: Restzeit, „bis“, Fortschritt, danach-Stunde', () => {
    at(8, 52, 30);
    openSeating();
    expect(shown()).toBe(true);
    expect(cockpit().querySelector('.cockpit-mins').textContent.replace(/\s+/g, ' ')).toBe('23 Min');
    expect(cockpit().textContent).toContain('bis 09:15');
    const w = parseFloat(cockpit().querySelector('.cockpit-progress span').style.width);
    expect(w).toBeGreaterThan(70); expect(w).toBeLessThan(80);
    expect(cockpit().querySelector('.cockpit-sub').textContent).toBe('bis 09:15');
    expect(cockpit().querySelector('.cockpit-next').textContent).toMatch(/^danach 9c · 09:/);
  });

  it('kurz vorher „in … Min“, außerhalb der Stunde und an anderen Tagen keine Restzeit', () => {
    at(7, 35);
    openSeating();
    expect(shown()).toBe(true);
    expect(cockpit().querySelector('.cockpit-mins').textContent.replace(/\s+/g, ' ')).toBe('in 10 Min');
    at(7, 0); app('refreshSeatingCockpit()');
    expect(shown()).toBe(false);
    at(9, 20); app('refreshSeatingCockpit()');            // Pause, nächste 7a-Stunde erst im 3. Block
    expect(shown()).toBe(false);
    at(8, 0); app(`setSeatingDate("${FRI}"); renderSeatingPlan()`); // anderer Tag gewählt
    expect(shown()).toBe(false);
  });

  it('andere Klasse (9c läuft nicht): keine Restzeit', () => {
    at(8, 0);
    openSeating('g2');
    expect(shown()).toBe(false);
  });

  const topic = () => cockpit().querySelector('.cockpit-topic-label').textContent + ' | ' + cockpit().querySelector('.cockpit-topic-text').textContent.trim();
  const counts = () => [...cockpit().querySelectorAll('.cockpit-count')].map(c => c.className.replace('cockpit-count ', '') + ':' + c.textContent.replace(/\s+/g, ' ').trim());

  it('eine Zeile: Thema (letzte Stunde, erste Zeile) und kurze Zähler statt Namen', () => {
    at(8, 0);
    openSeating();
    expect(topic()).toMatch(/^Letzte Stunde · Fr\.?,? 30\.10\.? \| Brüche kürzen$/);   // erste Zeile, mit Tag
    expect(counts()).toEqual(['hw:HA', 'absent:1fehlt', 'missed:1nachholen', 'bday:2Geb.']);
    expect(cockpit().textContent).not.toMatch(/Clara|Ben|Anna|David/); // Namen nur auf Karten und im Fenster „Heute“
  });

  it('viele Fehlende und Geburtstage: Leiste bleibt gleich lang (nur die Zahl ändert sich)', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: 'z' + i, firstName: 'Kind' + i, lastName: 'X', birthday: i < 5 ? '2013-11-02' : undefined,
      attendance: i >= 5 ? [{ id: 'za' + i, date: MON, type: 'abwesend' }] : [], grades: [], participation: [], homework: [], studentNotes: [] }));
    app(`db.students.g1.push(...${JSON.stringify(many)}); db.groups[0].seatingCols = 8; db.groups[0].seatingRows = 4`);
    at(8, 0);
    openSeating();
    expect(counts()).toEqual(['hw:HA', 'absent:8fehlen', 'missed:1nachholen', 'bday:7Geb.']);
    expect(cockpit().querySelectorAll('.cockpit-count').length).toBe(4);
  });

  it('Zähler, Thema und Zeit öffnen das Fenster „Heute“ mit allen Namen und Texten', () => {
    at(8, 0);
    openSeating();
    [...cockpit().querySelectorAll('.cockpit-count'), cockpit().querySelector('.cockpit-topic'), cockpit().querySelector('.cockpit-time')]
      .forEach(b => expect(b.getAttribute('onclick')).toBe('openSeatingToday()'));
    app('openSeatingToday()');
    const m = document.getElementById('modal-seating-today');
    expect(m.classList.contains('hidden')).toBe(false);
    const t = m.textContent.replace(/\s+/g, ' ');
    expect(t).toContain('Heute · 7a Mathe');
    expect(t).toMatch(/Danach: 9c · R132/);
    expect(m.innerHTML).toContain('Brüche kürzen<br>zweite Zeile');  // hier der ganze Text, mit Zeilen
    expect(t).toContain('S. 12 Nr. 3');
    expect(t).toMatch(/Fehlt heute \(1\)\s*Clara Muster entschuldigt/);
    expect(t).toMatch(/Letzte Stunde gefehlt \(1\).*Ben Muster/);
    expect(t).toMatch(/Anna Muster wird 13/);
    expect(t).toMatch(/David Muster wird 14 · hatte am Sa/);
    app('openCockpitLesson()');                                   // „Stunde eintragen“ schließt „Heute“
    expect(m.classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-lesson').classList.contains('hidden')).toBe(false);
  });

  it('„Letzte Stunde gefehlt“ steht auf der Karte (nur während der Stunde)', () => {
    at(8, 0);
    openSeating();
    expect(card('b').querySelector('.sc-missed')).toBeTruthy();
    expect(card('b').getAttribute('aria-label')).toMatch(/letzte Stunde gefehlt/);
    expect(card('a').querySelector('.sc-missed')).toBeNull();
    app('db.settings.seatingAutoSwitch = false');                // sonst wechselt der Sitzplan (richtig) zur 9c
    at(10, 0); app('refreshSeatingCockpit()');                   // keine Stunde der 7a mehr
    expect(card('b').querySelector('.sc-missed')).toBeNull();
  });

  it('nichts los: „Noch kein Thema“, keine Zähler', () => {
    app('db.lessonData = {}; db.students.g1.forEach(s => { s.attendance = []; delete s.birthday; })');
    at(8, 0);
    openSeating();
    expect(topic()).toBe('Thema | Noch kein Thema eingetragen');
    expect(cockpit().querySelector('.cockpit-counts')).toBeNull();
    app('openSeatingToday()');
    expect(document.getElementById('seating-today-body').textContent).toContain('Nichts fällig, alle da.');
  });

  it('Thema der laufenden Stunde hat Vorrang vor der letzten', () => {
    app(`db.lessonData["m1_${MON}"] = { done: 'Brüche addieren' }`);
    at(8, 0);
    openSeating();
    expect(topic()).toBe('Thema heute | Brüche addieren');
  });

  it('zweite Stunde am selben Tag: „letzte Stunde“ ist die frühere von heute', () => {
    app(`db.lessonData["m1_${MON}"] = { done: 'Brüche addieren' }`);
    at(11, 30);
    openSeating();
    expect(shown()).toBe(true);
    expect(topic()).toContain('Brüche addieren');
    expect(cockpit().querySelector('.cockpit-count.missed')).toBeNull(); // heute früher war niemand weg
  });

  it('„Stunde“ öffnet das Stunden-Fenster dieser Stunde (Notiz = Stunde abschließen)', () => {
    at(8, 0);
    openSeating();
    expect(cockpit().querySelector('.cockpit-lesson-btn').getAttribute('onclick')).toBe('openCockpitLesson()');
    app('openCockpitLesson()');
    expect(document.getElementById('modal-lesson').classList.contains('hidden')).toBe(false);
    expect(app('activeLessonId')).toBe('m1');
    expect(app('activeLessonDate')).toBe(MON);
  });

  it('Stunde beginnt/endet bei offenem Sitzplan: Leiste erscheint/verschwindet, Raster passt sich an', () => {
    at(7, 0);
    openSeating();
    expect(shown()).toBe(false);
    const spy = vi.fn(); const orig = app('renderSeatingPlan');
    app('renderSeatingPlan = ' + 'function(){ window.__rsp = (window.__rsp||0) + 1; return (' + orig.toString() + ').apply(this, arguments); }');
    window.__rsp = 0;
    at(7, 40); app('refreshSeatingCockpit()');
    expect(shown()).toBe(true);
    expect(window.__rsp).toBe(1);
    at(7, 41); app('refreshSeatingCockpit()');       // nur die Leiste neu, kein neues Raster
    expect(window.__rsp).toBe(1);
    app('renderSeatingPlan = ' + orig.toString());
    spy();
  });

  it('im Bearbeiten-Modus bleibt die Leiste stehen (Raster springt nicht), der Takt zeichnet nicht neu', () => {
    at(8, 0);
    openSeating();
    app('toggleSeatingEditMode()');
    expect(shown()).toBe(true);
    const html = cockpit().innerHTML;
    at(8, 10); app('refreshSeatingCockpit()');
    expect(cockpit().innerHTML).toBe(html);
    app('toggleSeatingEditMode()');
    expect(shown()).toBe(true);
  });
});

describe('Bildschirm bleibt an (Wake Lock)', () => {
  it('angefordert, solange die Leiste da ist; frei beim Verlassen und nach der Stunde', async () => {
    at(8, 0);
    openSeating();
    await flush();
    expect(wakeRequests).toBe(1);
    app('refreshSeatingCockpit()'); await flush();
    expect(wakeRequests).toBe(1);                 // nicht bei jedem Neuzeichnen neu
    app('switchView("dashboard")'); await flush();
    expect(released).toBe(1);
    openSeating(); await flush();
    expect(wakeRequests).toBe(2);
    at(9, 20); app('refreshSeatingCockpit()'); await flush();
    expect(released).toBe(2);
  });

  it('ohne Wake-Lock-Unterstützung (alte Geräte) kein Fehler', () => {
    delete navigator.wakeLock;
    at(8, 0);
    expect(() => openSeating()).not.toThrow();
    expect(shown()).toBe(true);
  });
});

describe('Karten: Verlauf, Hinweis, Geburtstag', () => {
  it('Verlauf: letzte 6 Smileys ohne Titel als Punkte, alt → neu; schließt Noten aus; beim Öffnen wieder aus', () => {
    const entries = ['negative', 'positive', 'positive', 'neutral', 'positive', 'negative', 'positive']
      .map((v, i) => ({ id: 'p' + i, date: `2026-10-${String(10 + i).padStart(2, '0')}`, value: v }));
    entries.push({ id: 'ref', date: '2026-10-30', value: 'negative', label: 'Referat' }); // Spalte der Tabelle: zählt nicht
    app(`db.students.g1[0].participation = ${JSON.stringify(entries)}`);
    openSeating();
    expect(card('a').querySelector('.sc-trend')).toBeNull();
    app('toggleSeatingGrades()');
    app('toggleSeatingTrend()');
    expect(app('seatingShowGrades')).toBe(false);
    const dots = [...card('a').querySelectorAll('.sc-trend i')].map(i => i.className);
    expect(dots).toEqual(['t-positive p3', 't-positive p3', 't-neutral p2', 't-positive p3', 't-negative p1', 't-positive p3']);   // AH52: Balkenhöhe je Stufe
    expect(card('b').querySelector('.sc-trend-empty')).toBeTruthy();
    expect(document.getElementById('btn-seating-trend').getAttribute('aria-pressed')).toBe('true');
    openSeating();
    expect(app('seatingShowTrend')).toBe(false);
    expect(card('a').querySelector('.sc-trend')).toBeNull();
  });

  it('Klassenwechsel blendet den Verlauf aus (wie Noten, Regel 16)', () => {
    openSeating();
    app('toggleSeatingTrend()');
    app('hideSeatingGrades()');
    expect(app('seatingShowTrend')).toBe(false);
  });

  it('Hinweis: nur ein Symbol auf der Karte, nie der Text', () => {
    openSeating();
    expect(card('a').querySelector('.sc-hint')).toBeTruthy();
    expect(card('a').textContent).not.toContain('hörgeschädigt');
    expect(card('b').querySelector('.sc-hint')).toBeNull();
    expect(card('a').getAttribute('aria-label')).toMatch(/Hinweis vorhanden/);
  });

  it('Geburtstag heute bzw. am Wochenende davor: Torte auf der Karte', () => {
    openSeating();
    expect(card('a').querySelector('.sc-bday')).toBeTruthy();
    expect(card('d').querySelector('.sc-bday')).toBeTruthy();
    expect(card('b').querySelector('.sc-bday')).toBeNull();
  });
});

describe('Hinweis im Schüler-Fenster', () => {
  const hintBox = () => document.getElementById('seating-student-hint');
  // AH28: Hinweise stehen unter „Mehr zu …“ im privaten Abschnitt (ein „Anzeigen“ für alles); zum Lesen, Felder erst nach „Ändern“
  const veiled = () => document.getElementById('sw-more').classList.contains('is-veiled');
  const edit = () => hintBox().querySelector('.sw-hint-edit').click();
  it('verborgen bis „Anzeigen“ (außer Noten sind eingeblendet), dann zum Lesen; Felder erst nach „Ändern“', () => {
    openSeating();
    app(`openSeatingStudentModal("a", "g1", "${MON}")`);
    expect(veiled()).toBe(true);
    expect(document.getElementById('sw-sec-hints').hasAttribute('data-private')).toBe(true);
    expect(document.getElementById('seating-student-hint-input')).toBeNull();
    app('revealSeatingStudent()');
    expect(hintBox().querySelector('.sw-hint').textContent).toContain('hörgeschädigt – vorne sitzen');
    edit();
    expect(document.getElementById('seating-student-hint-input').value).toBe('hörgeschädigt – vorne sitzen');
    app('closeModal("modal-seating-student"); toggleSeatingGrades()');
    app(`openSeatingStudentModal("a", "g1", "${MON}")`);
    expect(veiled()).toBe(false);
  });

  it('ohne Hinweis „Hinweis eintragen“ → Feld; Eintippen + Schließen speichert, Karte bekommt das Symbol', () => {
    openSeating();
    app(`openSeatingStudentModal("b", "g1", "${MON}")`);
    expect(hintBox().textContent).toMatch(/Kein Hinweis/);
    edit();
    const ta = document.getElementById('seating-student-hint-input');
    ta.value = 'mag FCM';
    app('closeModalLikeButton("modal-seating-student")');   // Escape / daneben tippen
    expect(app('db.students.g1[1].notes')).toBe('mag FCM');
    expect(card('b').querySelector('.sc-hint')).toBeTruthy();
  });

  it('Smiley antippen schließt das Fenster – der Hinweis geht trotzdem nicht verloren', () => {
    openSeating();
    app(`openSeatingStudentModal("b", "g1", "${MON}")`);
    edit();
    document.getElementById('seating-student-hint-input').value = 'Brille';
    app('addParticipationSmiley("positive")');
    app('addParticipationSmiley("positive")'); // zweites Tippen nimmt zurück und schließt
    expect(app('db.students.g1[1].notes')).toBe('Brille');
  });

  it('„Neue Note“ aus dem Schüler-Fenster sichert den eingetippten Hinweis vorher', () => {
    openSeating();
    app(`openSeatingStudentModal("b", "g1", "${MON}")`);
    edit();
    document.getElementById('seating-student-hint-input').value = 'sitzt am Fenster';
    app('openGradeFormForCurrentStudent()');
    expect(app('db.students.g1[1].notes')).toBe('sitzt am Fenster');
    app('cancelGradeForm()');
  });

  it('unverändert: kein Speichern (lastModified bleibt)', () => {
    openSeating();
    const before = app('db.settings.lastModified');
    app(`openSeatingStudentModal("a", "g1", "${MON}"); renderSeatingStudentHint(true)`);
    app('closeModal("modal-seating-student")');
    expect(app('db.settings.lastModified')).toBe(before);
  });

  it('Hinweis leeren löscht ihn', () => {
    openSeating();
    app(`openSeatingStudentModal("a", "g1", "${MON}"); renderSeatingStudentHint(true)`);
    document.getElementById('seating-student-hint-input').value = '  ';
    app('closeModal("modal-seating-student")');
    expect(app('db.students.g1[0].notes')).toBe('');
  });
});

describe('Geburtstage (AD6)', () => {
  it('birthdayInfo: heute, Wochenende davor, nicht nach langen Pausen, 29.02.', () => {
    const info = (b, d) => app('birthdayInfo')({ birthday: b }, d);
    expect(info('2013-11-02', MON)).toMatchObject({ when: 'today', age: 13 });
    expect(info('2012-10-31', MON)).toMatchObject({ when: 'past', date: '2026-10-31', age: 14 });
    expect(info('2012-10-30', MON)).toBeNull();                 // Freitag war Schultag: da schon gezeigt
    expect(info('2012-02-29', '2027-03-01')).toMatchObject({ when: 'past', date: '2027-02-28' }); // Montag; 28.02.2027 = Sonntag
    expect(info('2012-02-29', '2028-02-29')).toMatchObject({ when: 'today' });
    expect(info('', MON)).toBeNull();
    expect(info('kaputt', MON)).toBeNull();
    expect(app('birthdayInfo')({}, MON)).toBeNull();            // Altdaten ohne Feld
  });

  it('Schüler-Formular: Geburtstag speichern, ändern, leeren (Feld verschwindet)', () => {
    app('switchView("classes"); openGroupStudents("g1"); currentStudentId = "b"; openEditStudent()');
    document.getElementById('new-student-birthday').value = '2013-05-04';
    app('saveStudent()');
    expect(app('db.students.g1[1].birthday')).toBe('2013-05-04');
    app('currentStudentId = "b"; openEditStudent()');
    expect(document.getElementById('new-student-birthday').value).toBe('2013-05-04');
    document.getElementById('new-student-birthday').value = '';
    app('saveStudent()');
    expect('birthday' in app('db.students.g1[1]')).toBe(false);
  });

  it('neuer Schüler mit Geburtstag; ohne Angabe kein Feld', () => {
    app('switchView("classes"); openGroupStudents("g1"); openAddStudent()');
    document.getElementById('new-student-first').value = 'Emil';
    document.getElementById('new-student-birthday').value = '2013-01-02';
    app('saveStudent()');
    app('openAddStudent()');
    document.getElementById('new-student-first').value = 'Frida';
    app('saveStudent()');
    const list = app('db.students.g1');
    expect(list.find(s => s.firstName === 'Emil').birthday).toBe('2013-01-02');
    expect('birthday' in list.find(s => s.firstName === 'Frida')).toBe(false);
  });

  it('Dashboard „Heute“ nennt die Geburtstage, Wochenende davor mit Tag', () => {
    app('switchView("dashboard")');
    const box = document.querySelector('#view-dashboard .dash-birthdays');
    expect(box).toBeTruthy();
    expect(box.textContent).toContain('Anna Muster');
    expect(box.textContent).toMatch(/David Muster\s*7a · 14 · Sa/);
  });

  it('kein Geburtstag: kein Kasten', () => {
    app('db.students.g1.forEach(s => delete s.birthday); switchView("dashboard")');
    expect(document.querySelector('#view-dashboard .dash-birthdays')).toBeNull();
  });
});

describe('Darstellung', () => {
  it('Leiste und Symbole nutzen nur definierte Klassen/Variablen; Hover nur mit hover:hover', () => {
    expect(CSS).toMatch(/\.seating-cockpit\{/);
    expect(CSS).toMatch(/\.cockpit-progress span\{/);
    // :hover nur in @media (hover: hover) – prüft tests/block-s.test.js für die ganze Datei
    expect(CSS).toMatch(/\.cockpit-topic-text\{[^}]*white-space:nowrap[^}]*text-overflow:ellipsis/); // Thema nie mehrzeilig
  });
});

describe('Wichtiger Hinweis (AD17): eigenes Feld, rotes Symbol', () => {
  const hintBox = () => document.getElementById('seating-student-hint');
  const imp = () => document.getElementById('seating-student-important-input');
  beforeEach(() => app('db.students.g1[1].importantNote = "Diabetes: darf jederzeit essen"'));

  it('Karte: rotes Ausrufezeichen statt ⓘ, auch wenn es daneben einen normalen Hinweis gibt; nie der Text', () => {
    app('db.students.g1[1].notes = "mag Fußball"');
    openSeating();
    expect(card('b').querySelector('.sc-important')).toBeTruthy();
    expect(card('b').querySelector('.sc-hint')).toBeNull();
    expect(card('b').textContent).not.toMatch(/Diabetes|Fußball/);
    expect(card('b').getAttribute('aria-label')).toMatch(/wichtiger Hinweis/);
    expect(card('a').querySelector('.sc-important')).toBeNull();   // nur normaler Hinweis: grau wie bisher
    expect(card('a').querySelector('.sc-hint')).toBeTruthy();
    expect(CSS).toMatch(/\.seating-card \.sc-important\{color:var\(--danger\);\}/);
  });

  it('Schüler-Fenster: verborgen bis „Anzeigen“, dann rot „Wichtig“ zum Lesen; Ändern + Schließen speichert beide', () => {
    openSeating();
    app(`openSeatingStudentModal("b", "g1", "${MON}")`);
    expect(document.getElementById('sw-more').classList.contains('is-veiled')).toBe(true);
    app('revealSeatingStudent()');
    expect(hintBox().querySelector('.sw-hint.is-important').textContent).toContain('Diabetes');
    app('renderSeatingStudentHint(true)');
    expect(imp().value).toBe('Diabetes: darf jederzeit essen');
    expect(document.getElementById('seating-student-hint-input').value).toBe('');
    imp().value = 'Diabetes: darf jederzeit essen, Traubenzucker im Ranzen';
    document.getElementById('seating-student-hint-input').value = 'mag Fußball';
    app('closeModalLikeButton("modal-seating-student")');
    expect(app('db.students.g1[1].importantNote')).toBe('Diabetes: darf jederzeit essen, Traubenzucker im Ranzen');
    expect(app('db.students.g1[1].notes')).toBe('mag Fußball');
  });

  it('Wichtig leeren: Feld verschwindet aus den Daten, Karte wieder ohne rotes Symbol', () => {
    openSeating();
    app(`openSeatingStudentModal("b", "g1", "${MON}"); renderSeatingStudentHint(true)`);
    imp().value = '  ';
    app('closeModalLikeButton("modal-seating-student")');
    expect(app('"importantNote" in db.students.g1[1]')).toBe(false);
    expect(card('b').querySelector('.sc-important')).toBeNull();
  });

  it('Schüler-Formular: Feld „Wichtig“ wird gefüllt und gespeichert, leer kommt nicht in die Daten', () => {
    app('openGroupStudents("g1"); openStudentDetail("b"); openEditStudent()');
    expect(document.getElementById('new-student-important').value).toBe('Diabetes: darf jederzeit essen');
    document.getElementById('new-student-important').value = 'Allergie: Nüsse';
    app('saveStudent()');
    expect(app('db.students.g1[1].importantNote')).toBe('Allergie: Nüsse');
    app('openAddStudent()');
    expect(document.getElementById('new-student-important').value).toBe('');
    document.getElementById('new-student-first').value = 'Emil';
    app('saveStudent()');
    expect(app('"importantNote" in db.students.g1.find(s => s.firstName === "Emil")')).toBe(false);
  });

  it('Schülerliste: „Wichtig“ rot statt nur „Hinweis“', () => {
    app('openGroupStudents("g1")');
    const row = [...document.querySelectorAll('.student-card, .student-row, [data-student-id]')].find(r => /Ben/.test(r.textContent));
    expect(row.querySelector('.sq-important').textContent).toBe('Wichtig');
  });
});

describe('Restzeit nach dem Entsperren (AH3)', () => {
  const mins = () => cockpit().querySelector('.cockpit-mins').textContent.replace(/\s+/g, ' ');
  const comeBack = () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  afterEach(() => { delete document.hidden; });

  it('kurz gesperrt (unter 15 Min): Leiste zeigt sofort die neue Restzeit', () => {
    at(8, 30);
    openSeating();
    expect(mins()).toBe('45 Min');
    at(8, 33, 10);
    comeBack();
    expect(mins()).toBe('42 Min');
  });

  it('auch mit offenem Fenster (z. B. „Heute“)', () => {
    at(8, 30);
    openSeating();
    app('openSeatingToday()');
    at(8, 40, 5);
    comeBack();
    expect(mins()).toBe('35 Min');
    app('closeModal("modal-seating-today")');
  });

  it('gleiche Minute: Knöpfe bleiben dieselben (Tippen geht nicht verloren)', () => {
    at(8, 30, 0);
    openSeating();
    const btn = cockpit().querySelector('.cockpit-time');
    at(8, 30, 5); app('refreshSeatingCockpit()');
    expect(cockpit().querySelector('.cockpit-time')).toBe(btn);
    at(8, 31, 5); app('refreshSeatingCockpit()');
    expect(mins()).toBe('44 Min');
  });
});

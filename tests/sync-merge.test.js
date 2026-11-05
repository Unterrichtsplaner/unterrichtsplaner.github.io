// AH4/Z3: Drei-Wege-Abgleich. mergeDB(basis, gerät, cloud) ist eine reine Funktion: Was nur eine Seite geändert hat,
// wird übernommen; nur echte Widersprüche werden zur Frage. Es darf nie still etwas verloren gehen.
const { loadScript, app } = require('./helpers/load-app');
beforeAll(() => loadScript('sync-merge.js'));

const clone = x => JSON.parse(JSON.stringify(x));
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function baseDB() {
  return {
    settings: { teacherName: 'T', lastModified: 100, blocks: [{ num: 1, start: '08:00', end: '08:45' }], themeMode: 'light' },
    lessonSlots: [{ id: 'l1', day: 0, block: 1, part: 'full', subject: 'Mathe', room: 'R1', color: '#111', groupId: 'g1', recurring: 'weekly' }],
    lessonData: { 'l1_2026-11-02': { done: 'Brüche', notes: 'Zeile A' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b', year: '26/27', color: '#111', schularbeitWeight: 50,
      seatingRows: 4, seatingPlan: [{ studentId: 'a', gridX: 0, gridY: 0 }, { studentId: 'b', gridX: 1, gridY: 0 }],
      gradeEvents: [{ date: '2026-10-15', label: 'KA 1', type: 'schularbeit' }],
      plan: [{ id: 'p1', title: 'Eins' }, { id: 'p2', title: 'Zwei' }], classNotes: [{ id: 'n1', text: 'Notiz', date: '2026-11-01' }] }],
    students: { g1: [
      st('a', 'Anna', { grades: [{ type: 'schularbeit', value: '2.0', date: '2026-10-15', note: 'KA 1' }], attendance: [{ id: 'f1', date: '2026-10-20', type: 'entschuldigt', note: 'Arzt' }] }),
      st('b', 'Ben'),
    ] },
    supervisions: [], todos: [{ id: 't1', text: 'Kopien', created: 1, groupId: 'g1' }], acknowledgedWarnings: { a_absences: 2 },
    syncSettings: { lastSyncedCloudTimestamp: 5, syncedLocalModified: 100 },
  };
}
const merge = (edit1, edit2, base = baseDB()) => {
  const l = clone(base), c = clone(base);
  edit1(l); edit2(c);
  return app('mergeDB')(clone(base), l, c);
};
const none = () => {};
const anna = d => d.students.g1[0];

describe('nur eine Seite geändert', () => {
  it('nichts geändert: unverändert, keine Frage', () => {
    const r = merge(none, none);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.students).toEqual(baseDB().students);
  });
  it('Gerät trägt Note ein, Cloud eine Fehlzeit bei jemand anderem: beides da, keine Frage', () => {
    const r = merge(d => anna(d).grades.push({ type: 'test', value: '1.0', date: '2026-11-03', note: 'T' }),
      d => d.students.g1[1].attendance.push({ id: 'x', date: '2026-11-03', type: 'abwesend', note: '' }));
    expect(r.conflicts).toEqual([]);
    expect(anna(r.merged).grades.length).toBe(2);
    expect(r.merged.students.g1[1].attendance.length).toBe(1);
  });
  it('beide tragen verschiedene Noten bei derselben Person ein: beide bleiben', () => {
    const r = merge(d => anna(d).grades.push({ type: 'test', value: '1.0', date: '2026-11-03', note: 'A' }),
      d => anna(d).grades.push({ type: 'test', value: '4.0', date: '2026-11-04', note: 'B' }));
    expect(r.conflicts).toEqual([]);
    expect(anna(r.merged).grades.map(g => g.note).sort()).toEqual(['A', 'B', 'KA 1']);
  });
  it('beide tragen dasselbe ein (auch mit anderer Kennung): nur einmal, keine Frage', () => {
    const f = id => d => anna(d).attendance.push({ id, date: '2026-11-03', type: 'abwesend', note: '' });
    const r = merge(f('x1'), f('x2'));
    expect(r.conflicts).toEqual([]);
    expect(anna(r.merged).attendance.filter(a => a.date === '2026-11-03').length).toBe(1);
  });
  it('gelöscht und auf der anderen Seite unverändert: bleibt gelöscht', () => {
    const r = merge(d => { anna(d).grades = []; }, none);
    expect(r.conflicts).toEqual([]);
    expect(anna(r.merged).grades).toEqual([]);
    const r2 = merge(none, d => { d.students.g1.splice(1, 1); });
    expect(r2.conflicts).toEqual([]);
    expect(r2.merged.students.g1.map(s => s.id)).toEqual(['a']);
  });
  it('Uhrzeiten: Gerät mit alten Werten setzt die neuen aus der Cloud nicht zurück (AH2)', () => {
    const r = merge(d => anna(d).grades.push({ type: 'test', value: '1.0', date: '2026-11-03', note: 'A' }),
      d => { d.settings.blocks = [{ num: 1, start: '07:45', end: '08:30' }]; });
    expect(r.conflicts).toEqual([]);
    expect(r.merged.settings.blocks[0].start).toBe('07:45');
  });
  it('verschiedene Felder derselben Stunde: beide übernommen', () => {
    const r = merge(d => { d.lessonSlots[0].room = 'R9'; }, d => { d.lessonSlots[0].subject = 'Physik'; });
    expect(r.conflicts).toEqual([]);
    expect(r.merged.lessonSlots[0]).toEqual(expect.objectContaining({ room: 'R9', subject: 'Physik' }));
  });
  it('neue Klasse je Seite: beide da', () => {
    const g = id => d => { d.groups.push({ id, subject: 'X', className: id, color: '#222' }); d.students[id] = [st('s' + id, 'Neu')]; };
    const r = merge(g('g2'), g('g3'));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.groups.map(x => x.id)).toEqual(['g1', 'g2', 'g3']);
    expect(Object.keys(r.merged.students).sort()).toEqual(['g1', 'g2', 'g3']);
  });
  it('syncSettings bleiben die des Geräts und zählen nie als Änderung', () => {
    const r = merge(d => { d.syncSettings.lastSyncedCloudTimestamp = 7; }, d => { d.syncSettings = { lastSyncedCloudTimestamp: 9 }; d.settings.lastModified = 999; });
    expect(r.conflicts).toEqual([]);
    expect(r.merged.syncSettings.lastSyncedCloudTimestamp).toBe(7);
  });
  it('leer und fehlend gelten als gleich: kein Widerspruch wegen note "" gegen keine note', () => {
    const r = merge(d => { anna(d).grades[0].note = 'KA 1'; d.lessonData['l1_2026-11-02'].hwEnabled = undefined; }, d => { d.lessonData['l1_2026-11-02'].extra = ''; });
    expect(r.conflicts).toEqual([]);
  });
});

describe('echte Widersprüche werden zur Frage', () => {
  const grade = v => d => { anna(d).grades[0].value = v; };
  it('dieselbe Note verschieden geändert: Frage mit Name, Spalte, beiden Werten mit Komma', () => {
    const r = merge(grade('2.5'), grade('3.0'));
    expect(r.conflicts.length).toBe(1);
    const q = r.conflicts[0];
    expect(q.kind).toBe('value');
    expect(q.title).toMatch(/7b/);
    expect(q.title).toMatch(/Anna X/);
    expect(q.what).toMatch(/KA 1/);
    expect(q.localText).toBe('2,5');
    expect(q.cloudText).toBe('3,0');
  });
  it('Antwort „Cloud“ setzt den Cloud-Wert, „Gerät“ den Gerätewert', () => {
    const a = merge(grade('2.5'), grade('3.0'));
    a.conflicts[0].apply('cloud');
    expect(anna(a.merged).grades[0].value).toBe('3.0');
    const b = merge(grade('2.5'), grade('3.0'));
    b.conflicts[0].apply('local');
    expect(anna(b.merged).grades[0].value).toBe('2.5');
  });
  it('dieselbe neue Note in derselben Spalte (mit Titel) verschieden: Frage', () => {
    const add = v => d => anna(d).grades.push({ type: 'test', value: v, date: '2026-11-03', note: 'T' });
    const r = merge(add('1.0'), add('2.0'));
    expect(r.conflicts.length).toBe(1);
    expect(anna(r.merged).grades.filter(g => g.note === 'T').length).toBe(1);
  });
  it('am selben Tag Fehlt gegen Entschuldigt: eine Frage, nie zwei Einträge (Regel 50)', () => {
    const add = (id, type) => d => anna(d).attendance.push({ id, date: '2026-11-03', type, note: '' });
    const r = merge(add('x', 'abwesend'), add('y', 'entschuldigt'));
    expect(r.conflicts.length).toBe(1);
    expect(anna(r.merged).attendance.filter(a => a.date === '2026-11-03').length).toBe(1);
    expect(r.conflicts[0].localText).toMatch(/Fehlt/);
    expect(r.conflicts[0].cloudText).toMatch(/Entschuldigt/);
  });
  it('Mitarbeit am selben Tag verschieden: Frage', () => {
    const add = v => d => anna(d).participation.push({ id: 'p' + v, date: '2026-11-03', value: v });
    const r = merge(add('positive'), add('negative'));
    expect(r.conflicts.length).toBe(1);
  });
  it('Klassenname, Uhrzeiten: Frage', () => {
    expect(merge(d => { d.groups[0].className = '7c'; }, d => { d.groups[0].className = '7d'; }).conflicts.length).toBe(1);
    const b = n => d => { d.settings.blocks = [{ num: 1, start: n, end: '09:00' }]; };
    const r = merge(b('07:00'), b('07:30'));
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].what).toMatch(/Uhrzeiten/);
  });
});

describe('freier Text: beide behalten, ohne Frage', () => {
  const n = t => d => { d.lessonData['l1_2026-11-02'].notes = t; };
  it('verschieden ergänzt: beide Zeilen', () => {
    const r = merge(n('Zeile A\nvom iPad'), n('Zeile A\nvom Laptop'));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.lessonData['l1_2026-11-02'].notes).toBe('Zeile A\nvom iPad\nvom Laptop');
  });
  it('eine Seite streicht eine Zeile, die andere ergänzt: Streichung gilt, Ergänzung bleibt', () => {
    const r = merge(n(''), n('Zeile A\nneu'));
    expect(r.merged.lessonData['l1_2026-11-02'].notes).toBe('neu');
  });
  it('Hinweis am Schüler, Grund einer Fehlzeit: ebenso', () => {
    const base = baseDB(); anna(base).notes = 'alt';
    const r = merge(d => { anna(d).notes = 'alt\nvorne sitzen'; anna(d).attendance[0].note = 'Arzt\nAttest da'; },
      d => { anna(d).notes = 'alt\nBrille'; anna(d).attendance[0].note = 'Arzt\nkrank'; }, base);
    expect(r.conflicts).toEqual([]);
    expect(anna(r.merged).notes).toBe('alt\nvorne sitzen\nBrille');
    expect(anna(r.merged).attendance[0].note).toBe('Arzt\nAttest da\nkrank');
  });
});

describe('Kleinigkeiten fragen nicht: Darstellung, Sitzplätze, quittierte Warnungen', () => {
  it('Farbe, Darstellung, Sitzplatz verschieden: Gerät gewinnt still', () => {
    const r = merge(d => { d.settings.themeMode = 'dark'; d.groups[0].color = '#a'; d.groups[0].seatingPlan[0].gridX = 3; },
      d => { d.settings.themeMode = 'sepia'; d.groups[0].color = '#b'; d.groups[0].seatingPlan[0].gridX = 5; });
    expect(r.conflicts).toEqual([]);
    expect(r.merged.settings.themeMode).toBe('dark');
    expect(r.merged.groups[0].seatingPlan[0].gridX).toBe(3);
  });
  it('quittierte Warnung: höhere Zahl gewinnt; letzte Sicherung: neuere', () => {
    const r = merge(d => { d.acknowledgedWarnings.a_absences = 3; d.settings.lastBackupTimestamp = 50; }, d => { d.acknowledgedWarnings.a_absences = 4; d.settings.lastBackupTimestamp = 70; });
    expect(r.conflicts).toEqual([]);
    expect(r.merged.acknowledgedWarnings.a_absences).toBe(4);
    expect(r.merged.settings.lastBackupTimestamp).toBe(70);
  });
});

describe('gelöscht gegen geändert: fragen, ohne Antwort bleibt alles', () => {
  it('Note gelöscht, auf der anderen Seite geändert: bleibt zunächst, Frage; „löschen“ entfernt', () => {
    const r = merge(d => { anna(d).grades = []; }, d => { anna(d).grades[0].value = '1.0'; });
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].kind).toBe('delete');
    expect(r.conflicts[0].deletedOn).toBe('local');
    expect(anna(r.merged).grades[0].value).toBe('1.0');
    r.conflicts[0].apply('delete');
    expect(anna(r.merged).grades).toEqual([]);
  });
  it('Schüler gelöscht, auf der anderen Seite neue Note: eine Frage; Behalten behält alles, Löschen räumt den Sitzplatz weg', () => {
    const edit = [d => { d.students.g1.splice(1, 1); d.groups[0].seatingPlan.splice(1, 1); },
      d => { d.students.g1[1].grades.push({ type: 'test', value: '3.0', date: '2026-11-03', note: 'T' }); }];
    const r = merge(...edit);
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].title).toMatch(/Ben X/);
    expect(r.merged.students.g1.map(s => s.id)).toEqual(['a', 'b']);
    const r2 = merge(...edit);
    r2.conflicts[0].apply('delete');
    app('finishMerge')(r2.merged);
    expect(r2.merged.students.g1.map(s => s.id)).toEqual(['a']);
    expect(r2.merged.groups[0].seatingPlan.map(p => p.studentId)).toEqual(['a']);
  });
  const delGroup = d => { d.groups = []; delete d.students.g1; d.lessonSlots = []; d.lessonData = {}; };
  it('Klasse gelöscht, sonst nichts geändert: bleibt gelöscht, samt Stunden und Stundendaten; Merkzettel-Punkt bleibt ohne Klasse', () => {
    const r = merge(delGroup, none);
    expect(r.conflicts).toEqual([]);
    app('finishMerge')(r.merged);
    expect(r.merged.groups).toEqual([]);
    expect(r.merged.students.g1).toBeUndefined();
    expect(r.merged.lessonSlots).toEqual([]);
    expect(r.merged.lessonData).toEqual({});
    expect(r.merged.todos[0].groupId).toBeUndefined();
    expect(r.merged.todos[0].text).toBe('Kopien');
  });
  it('Klasse gelöscht, anderswo neue Note darin: genau eine Frage; ohne Antwort alles da; Löschen räumt alles weg', () => {
    const add = d => { anna(d).grades.push({ type: 'test', value: '3.0', date: '2026-11-03', note: 'T' }); };
    const r = merge(delGroup, add);
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].kind).toBe('delete');
    expect(r.conflicts[0].title).toMatch(/7b/);
    expect(r.merged.groups.length).toBe(1);
    expect(anna(r.merged).grades.length).toBe(2);
    expect(r.merged.lessonSlots.length).toBe(1);
    r.conflicts[0].apply('delete');
    app('finishMerge')(r.merged);
    expect(r.merged.groups).toEqual([]);
    expect(r.merged.students.g1).toBeUndefined();
    expect(r.merged.lessonSlots).toEqual([]);
    expect(r.merged.lessonData).toEqual({});
  });
  it('Stunde gelöscht, anderswo Notiz dazu geschrieben: Frage; Notiz nie still weg', () => {
    const r = merge(d => { d.lessonSlots = []; delete d.lessonData['l1_2026-11-02']; }, d => { d.lessonData['l1_2026-11-03'] = { notes: 'wichtig' }; });
    expect(r.conflicts.length).toBe(1);
    expect(r.merged.lessonSlots.length).toBe(1);
    expect(r.merged.lessonData['l1_2026-11-03'].notes).toBe('wichtig');
  });
});

describe('Reihenfolge und Sonderfälle', () => {
  it('Themen nur auf einer Seite umsortiert, auf der anderen eins ergänzt: neue Reihenfolge + neues Thema', () => {
    const r = merge(d => { d.groups[0].plan.reverse(); }, d => { d.groups[0].plan.push({ id: 'p3', title: 'Drei' }); });
    expect(r.conflicts).toEqual([]);
    expect(r.merged.groups[0].plan.map(p => p.id)).toEqual(['p2', 'p1', 'p3']);
    const r2 = merge(d => { d.groups[0].plan.push({ id: 'p3', title: 'Drei' }); }, d => { d.groups[0].plan.reverse(); });
    expect(r2.merged.groups[0].plan.map(p => p.id)).toEqual(['p2', 'p1', 'p3']);
  });
  it('mehrere Noten in derselben Spalte (nth): getrennt zugeordnet', () => {
    const base = baseDB();
    anna(base).grades = [{ type: 'test', value: '1.0', date: '2026-11-01', note: 'T' }, { type: 'test', value: '2.0', date: '2026-11-01', note: 'T' }];
    const r = merge(d => { anna(d).grades[1].value = '2.5'; }, none, base);
    expect(r.conflicts).toEqual([]);
    expect(anna(r.merged).grades.map(g => g.value)).toEqual(['1.0', '2.5']);
  });
  it('unbekannte Felder einer neueren App-Version bleiben erhalten; unbekannte Liste beidseitig geändert: lieber Abbruch', () => {
    const r = merge(d => { d.futureField = { a: 1 }; }, d => { d.futureField2 = 'x'; });
    expect(r.merged.futureField).toEqual({ a: 1 });
    expect(r.merged.futureField2).toBe('x');
    const base = baseDB(); base.neueListe = [1];
    expect(() => merge(d => { d.neueListe = [1, 2]; }, d => { d.neueListe = [1, 3]; }, base)).toThrow(/neueListe/);
  });
  it('Eingaben bleiben unverändert (reine Funktion)', () => {
    const b = baseDB(), l = clone(b), c = clone(b);
    anna(l).grades[0].value = '1.0'; anna(c).notes = 'x';
    const [lc, cc, bc] = [clone(l), clone(c), clone(b)];
    const r = app('mergeDB')(b, l, c);
    anna(r.merged).grades.push({});
    expect(l).toEqual(lc); expect(c).toEqual(cc); expect(b).toEqual(bc);
  });
});

describe('Nachprüfung: Neues geht nie verloren (Zufallstest)', () => {
  let seed = 12345;
  const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const edit = (d, tag) => {
    for (let i = 0, n = rnd(6); i < n; i++) {
      const list = d.students.g1; const s = list[rnd(list.length)]; if (!s) continue;
      const day = `2026-11-${String(1 + rnd(20)).padStart(2, '0')}`;
      switch (rnd(9)) {
        case 0: s.grades.push({ type: 'test', value: String(1 + rnd(6)) + '.0', date: day, note: tag + rnd(3) }); break;
        case 1: if (s.grades[0]) s.grades[0].value = String(1 + rnd(6)) + '.0'; break;
        case 2: s.grades.splice(0, 1); break;
        case 3: if (!s.attendance.some(a => a.date === day)) s.attendance.push({ id: tag + rnd(9999), date: day, type: ['abwesend', 'entschuldigt', 'zuspät'][rnd(3)], note: '' }); break;
        case 4: if (!s.participation.some(p => p.date === day)) s.participation.push({ id: tag + rnd(9999), date: day, value: ['positive', 'neutral', 'negative'][rnd(3)] }); break;
        case 5: s.studentNotes.push({ text: tag + rnd(999), date: day }); break;
        case 6: d.lessonData[`l1_${day}`] = { ...(d.lessonData[`l1_${day}`] || {}), notes: tag + rnd(99) }; break;
        case 7: d.todos.push({ id: tag + rnd(99999), text: 'x', created: 1 }); break;
        case 8: if (rnd(4) === 0 && list.length > 1) list.splice(rnd(list.length), 1); break;
      }
    }
  };
  it('300 zufällige Paare: wirft nicht; alles Neue ist im Ergebnis; pro Tag höchstens ein Fehlzeit-Eintrag', () => {
    for (let i = 0; i < 300; i++) {
      const base = baseDB(), l = clone(base), c = clone(base);
      edit(l, 'L'); edit(c, 'C');
      const r = app('mergeDB')(clone(base), l, c);
      for (const side of [l, c]) for (const s of side.students.g1) {
        const m = r.merged.students.g1.find(x => x.id === s.id);
        const wasThere = base.students.g1.find(x => x.id === s.id);
        expect(m || wasThere).toBeTruthy();
        if (!m) continue;
        for (const n of s.studentNotes) expect(m.studentNotes.some(x => x.text === n.text && x.date === n.date)).toBe(true);
        for (const g of s.grades) if (!(wasThere?.grades || []).some(x => x.date === g.date && x.note === g.note)) {
          expect(m.grades.some(x => x.date === g.date && x.note === g.note && x.type === g.type), JSON.stringify(g)).toBe(true);
        }
      }
      for (const t of [...l.todos, ...c.todos]) expect(r.merged.todos.some(x => x.id === t.id)).toBe(true);
      for (const s of r.merged.students.g1) {
        const days = s.attendance.map(a => a.date);
        expect(new Set(days).size).toBe(days.length);
      }
      r.conflicts.forEach(q => { expect(q.title).toBeTruthy(); q.apply(q.kind === 'delete' ? 'keep' : 'cloud'); });
      app('finishMerge')(r.merged);
    }
  });
});

describe('Unterschiede beschreiben (Rückfall-Fenster, Y10)', () => {
  it('nennt Klasse und Art; gleich = leer', () => {
    const l = baseDB(), c = baseDB();
    const d = app('describeDifferences');
    expect(d(l, c)).toEqual([]);
    anna(l).grades[0].value = '1.0';
    c.students.g1[1].attendance.push({ id: 'x', date: '2026-11-03', type: 'abwesend', note: '' });
    c.lessonSlots[0].room = 'R9';
    const text = d(l, c).join(' | ');
    expect(text).toMatch(/7b/);
    expect(text).toMatch(/1 Note/);
    expect(text).toMatch(/1 Fehlzeit/);
    expect(text).toMatch(/Stundenplan/);
    expect(text).not.toMatch(/1,0|Anna/);   // Zusammenfassung ohne Namen und Werte
  });
});

describe('Altdaten', () => {
  it('Schülerliste ohne Klasse bleibt erhalten, leere fällt weg', () => {
    const r = merge(none, none);
    r.merged.students.alt = [st('z', 'Zoe')];
    r.merged.students.leer = [];
    app('finishMerge')(r.merged);
    expect(r.merged.students.alt.length).toBe(1);
    expect(r.merged.students.leer).toBeUndefined();
  });
});

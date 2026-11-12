// AH4, Nachprüfung vor dem Ausliefern: Fälle, in denen ein Abgleich Einträge an Stellen hinterlassen könnte, die niemand
// mehr sieht, oder Dinge still zurechtbiegt. Was nicht sauber geht, landet im Fenster mit dem ganzen Stand (Abbruch).
const { loadScript, app } = require('./helpers/load-app');
beforeAll(() => loadScript('sync-merge.js'));

const clone = x => JSON.parse(JSON.stringify(x));
const st = (id, f, extra = {}) => ({ id, firstName: f, lastName: 'X', grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
const DI = '2026-11-03', MI = '2026-11-04', FR = '2026-11-06';
function baseDB() {
  return {
    settings: { lastModified: 100, blocks: [{ num: 1, start: '08:00', end: '08:45' }, { num: 8, start: '14:00', end: '14:45' }] },
    lessonSlots: [{ id: 's1', day: 1, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }],
    lessonData: { [`s1_${DI}`]: { notes: 'alt' } },
    groups: [{ id: 'g1', subject: 'Mathe', className: '7b' }, { id: 'g2', subject: 'Bio', className: '5a' }],
    students: { g1: [st('a', 'Anna'), st('b', 'Ben')], g2: [st('c', 'Cem')] },
    supervisions: [], todos: [], syncSettings: {},
  };
}
const merge = (edit1, edit2, base = baseDB()) => {
  const l = clone(base), c = clone(base);
  edit1(l); edit2(c);
  return app('mergeDB')(clone(base), l, c);
};
const none = () => {};
const addNote = (d, key, line) => { const x = d.lessonData[key] || (d.lessonData[key] = {}); x.notes = (x.notes ? `${x.notes}\n` : '') + line; };
// wie moveLessonData / commitLessonSlot
const moveSeries = (d, id, day) => {
  const s = d.lessonSlots.find(x => x.id === id), shift = day - s.day;
  Object.keys(d.lessonData).filter(k => k.startsWith(`${id}_`)).forEach(k => {
    const date = new Date(`${k.slice(id.length + 1)}T12:00:00`); date.setDate(date.getDate() + shift);
    const to = `${id}_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const v = d.lessonData[k]; delete d.lessonData[k]; d.lessonData[to] = v;
  });
  s.day = day;
};
// wie moveOccurrenceOnce
const moveOnce = (d, id, from, to, onceId = 'o1') => {
  const s = d.lessonSlots.find(x => x.id === id);
  d.lessonSlots.push({ id: onceId, subject: s.subject, groupId: s.groupId, part: 'full', day: 4, block: 1, recurring: false, specificDate: to, movedFrom: { slotId: id, date: from } });
  const moved = d.lessonData[`${id}_${from}`];
  delete d.lessonData[`${id}_${from}`];
  if (moved) d.lessonData[`${onceId}_${to}`] = moved;
  d.lessonData[`${id}_${from}`] = { ausfall: true, movedTo: { slotId: onceId, date: to } };
};
const split = (d, id, from, day, newId = 'n1') => {
  const s = d.lessonSlots.find(x => x.id === id);
  s.validUntil = '2026-11-08';
  d.lessonSlots.push({ ...s, id: newId, day, validFrom: from, validUntil: undefined });
};

describe('Stunde verlegt, anderes Gerät trägt am alten Termin ein', () => {
  it('Serie von Di auf Mi: Eintrag des anderen Geräts wandert mit, nichts bleibt am alten Tag', () => {
    const r = merge(d => moveSeries(d, 's1', 2), d => addNote(d, `s1_${DI}`, 'neu'));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.lessonData[`s1_${DI}`]).toBeUndefined();
    expect(r.merged.lessonData[`s1_${MI}`].notes).toBe('alt\nneu');
  });
  it('dasselbe andersherum (Cloud verlegt, Gerät trägt ein), auch ganz neue Einträge', () => {
    const r = merge(d => addNote(d, 's1_2026-11-10', 'kommt'), d => moveSeries(d, 's1', 2));
    expect(r.merged.lessonData['s1_2026-11-10']).toBeUndefined();
    expect(r.merged.lessonData['s1_2026-11-11'].notes).toBe('kommt');
    expect(r.merged.lessonSlots[0].day).toBe(2);
  });
  it('beide verlegen auf denselben Tag: keine Frage, nichts doppelt', () => {
    const r = merge(d => moveSeries(d, 's1', 2), d => moveSeries(d, 's1', 2));
    expect(r.conflicts).toEqual([]);
    expect(Object.keys(r.merged.lessonData)).toEqual([`s1_${MI}`]);
  });
  it('beide verlegen verschieden: nicht raten, Fenster mit dem ganzen Stand', () => {
    expect(() => merge(d => moveSeries(d, 's1', 2), d => moveSeries(d, 's1', 3))).toThrow(/verlegt/);
  });
  it('Stundenplanwechsel: Einträge ab dem Wechsel gehen an die neue Stunde, frühere bleiben', () => {
    const r = merge(d => split(d, 's1', '2026-11-09', 3), d => { addNote(d, 's1_2026-11-10', 'danach'); addNote(d, `s1_${DI}`, 'davor'); });
    expect(r.merged.lessonData['n1_2026-11-12'].notes).toBe('danach');
    expect(r.merged.lessonData['s1_2026-11-10']).toBeUndefined();
    expect(r.merged.lessonData[`s1_${DI}`].notes).toBe('alt\ndavor');
  });
  it('beide wechseln: zwei neue Stunden am selben Platz wären doppelt, also ganzer Stand', () => {
    expect(() => merge(d => split(d, 's1', '2026-11-09', 3, 'n1'), d => split(d, 's1', '2026-11-09', 3, 'n2'))).toThrow(/Stundenplanwechsel/);
  });
  it('„nur an diesem Tag“ verlegt: Eintrag des anderen Geräts landet an der verlegten Stunde, Ursprung bleibt Verweis', () => {
    const r = merge(d => moveOnce(d, 's1', DI, FR), d => addNote(d, `s1_${DI}`, 'neu'));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.lessonData[`o1_${FR}`].notes).toBe('alt\nneu');
    expect(r.merged.lessonData[`s1_${DI}`]).toEqual({ ausfall: true, movedTo: { slotId: 'o1', date: FR } });
  });
  it('dieselbe Stunde auf beiden Geräten „nur an diesem Tag“ verlegt: ganzer Stand', () => {
    expect(() => merge(d => moveOnce(d, 's1', DI, FR, 'o1'), d => moveOnce(d, 's1', DI, MI, 'o2'))).toThrow(/verlegt/);
  });
  it('Stunde beendet, anderes Gerät hat einen Eintrag danach: unsichtbar wäre still verloren, also ganzer Stand', () => {
    expect(() => merge(d => { d.lessonSlots[0].validUntil = '2026-11-08'; }, d => addNote(d, 's1_2026-11-10', 'danach'))).toThrow(/nicht mehr/);
  });
  it('einmalige Stunde auf ein anderes Datum: Eintrag wandert mit', () => {
    const once = { id: 'e1', day: 1, block: 1, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: false, specificDate: DI };
    const base = baseDB(); base.lessonSlots.push(once); base.lessonData[`e1_${DI}`] = { notes: 'a' };
    const r = merge(d => { const s = d.lessonSlots[1]; s.specificDate = FR; s.day = 4; d.lessonData[`e1_${FR}`] = d.lessonData[`e1_${DI}`]; delete d.lessonData[`e1_${DI}`]; },
      d => addNote(d, `e1_${DI}`, 'b'), base);
    expect(r.merged.lessonData[`e1_${DI}`]).toBeUndefined();
    expect(r.merged.lessonData[`e1_${FR}`].notes).toBe('a\nb');
  });
});

describe('Noten', () => {
  const grade = (value, note = '') => ({ type: 'muendlich', value, date: MI, note });
  it('beide geben am selben Tag eine neue Note ohne Titel, verschiedene Werte: beide bleiben', () => {
    const r = merge(d => d.students.g1[0].grades.push(grade('2.0')), d => d.students.g1[0].grades.push(grade('3.0')));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.students.g1[0].grades.map(g => g.value).sort()).toEqual(['2.0', '3.0']);
  });
  it('eine vorhandene Note auf beiden geändert: bleibt eine Frage', () => {
    const base = baseDB(); base.students.g1[0].grades.push(grade('2.0', 'KA'));
    const r = merge(d => { d.students.g1[0].grades[0].value = '1.0'; }, d => { d.students.g1[0].grades[0].value = '3.0'; }, base);
    expect(r.conflicts.length).toBe(1);
  });
});

describe('Sitzplätze', () => {
  it('beide haben umgeordnet: keine Fragen, Platz bleibt als Paar', () => {
    const base = baseDB(); base.students.g1[0].gridX = 0; base.students.g1[0].gridY = 0;
    const r = merge(d => { d.students.g1[0].gridX = 1; d.students.g1[0].gridY = 1; }, d => { d.students.g1[0].gridX = 2; }, base);
    expect(r.conflicts).toEqual([]);
    expect([r.merged.students.g1[0].gridX, r.merged.students.g1[0].gridY]).toEqual([1, 1]);
  });
  it('nur eine Seite hat diesen Schüler umgesetzt: Platz kommt als Paar an', () => {
    const r = merge(d => { d.students.g1[0].gridX = 3; d.students.g1[0].gridY = 2; }, d => { d.students.g1[1].gridX = 1; d.students.g1[1].gridY = 1; });
    expect(r.merged.students.g1[0].gridX).toBe(3);
    expect(r.merged.students.g1[1].gridY).toBe(1);
  });
});

describe('Platz einer Stunde', () => {
  it('Tag und Block sind eine Frage mit lesbarem Text, Antwort setzt beide', () => {
    const r = merge(d => { d.lessonData = {}; d.lessonSlots[0].block = 8; }, d => { d.lessonData = {}; d.lessonSlots[0].block = 3; d.lessonSlots[0].part = 'first'; });
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].localText).toMatch(/Di.*8\. Stunde/);
    expect(r.conflicts[0].cloudText).toMatch(/Di.*3\. Stunde/);
    r.conflicts[0].apply('cloud');
    expect(r.merged.lessonSlots[0]).toEqual(expect.objectContaining({ block: 3, part: 'first' }));
  });
});

describe('Blöcke', () => {
  it('Gerät löscht Block 8, Cloud legt dort eine Stunde an: Block bleibt, die Stunde ist sichtbar', () => {
    const r = merge(d => { d.settings.blocks = d.settings.blocks.filter(b => b.num !== 8); },
      d => d.lessonSlots.push({ id: 's2', day: 2, block: 8, part: 'full', subject: 'Mathe', groupId: 'g1', recurring: 'weekly' }));
    const done = app('finishMerge')(r.merged, r.blockPool);
    expect(done.settings.blocks.map(b => b.num)).toContain(8);
  });
  it('Frage zu den Uhrzeiten zeigt den Unterschied', () => {
    const r = merge(d => { d.settings.blocks[0].end = '08:40'; }, d => { d.settings.blocks[0].end = '08:50'; });
    expect(r.conflicts[0].localText).toMatch(/08:40/);
    expect(r.conflicts[0].cloudText).toMatch(/08:50/);
  });
});

describe('Hausaufgabe nicht wegschalten', () => {
  const key = `s1_${DI}`;
  const base = () => { const b = baseDB(); b.lessonData[key] = { hwEnabled: true, hwItems: [{ id: 'h1', text: 'alt' }] }; return b; };
  it('Gerät schaltet HA aus, Cloud ergänzt eine neue: Schalter an, sonst wäre sie nirgends fällig', () => {
    const r = merge(d => { d.lessonData[key] = { hwEnabled: false, hwItems: [] }; }, d => d.lessonData[key].hwItems.push({ id: 'h2', text: 'neu' }), base());
    expect(r.merged.lessonData[key].hwEnabled).toBe(true);
    expect(r.merged.lessonData[key].hwItems.map(i => i.id)).toEqual(['h2']);
  });
  it('Wer selbst eine ergänzt und ausschaltet, bleibt bei aus', () => {
    const r = merge(d => { d.lessonData[key].hwItems.push({ id: 'h2', text: 'neu' }); d.lessonData[key].hwEnabled = false; }, none, base());
    expect(r.merged.lessonData[key].hwEnabled).toBe(false);
  });
});

describe('Nicht still viel wegnehmen', () => {
  const full = () => {
    const b = baseDB();
    for (let i = 0; i < 40; i++) b.students.g1[0].grades.push({ type: 'test', value: '2.0', date: DI, note: `N${i}` });
    return b;
  };
  it('Klasse in der Cloud gelöscht, hier unverändert: Frage, „Behalten“ ist voreingestellt', () => {
    const r = merge(none, d => { d.groups = d.groups.filter(g => g.id !== 'g2'); delete d.students.g2; });
    expect(r.conflicts.length).toBe(1);
    expect(r.conflicts[0].kind).toBe('delete');
    expect(r.merged.groups.some(g => g.id === 'g2')).toBe(true);
    r.conflicts[0].apply('delete');
    expect(r.merged.groups.some(g => g.id === 'g2')).toBe(false);
    expect(r.merged.students.g2).toBeUndefined();
  });
  it('Klasse hier gelöscht, in der Cloud unverändert: keine Frage', () => {
    const r = merge(d => { d.groups = d.groups.filter(g => g.id !== 'g2'); delete d.students.g2; }, none);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.groups.some(g => g.id === 'g2')).toBe(false);
  });
  it('alter Stand hochgeladen: viele Einträge fehlen in der Cloud → ganzer Stand statt still weg', () => {
    expect(() => merge(d => d.todos.push({ id: 't', text: 'x' }), d => { d.students.g1[0].grades = []; }, full())).toThrow(/Viele/);
  });
  it('eine Seite ganz leer (Cloud geleert): ganzer Stand', () => {
    expect(() => merge(d => d.todos.push({ id: 't', text: 'x' }), d => { d.groups = []; d.students = {}; d.lessonSlots = []; d.lessonData = {}; })).toThrow(/leer/);
  });
});

describe('Gesamtprüfung 11.11., Paket 2: Verlegungen im Abgleich', () => {
  const movedBase = () => { const b = baseDB(); moveOnce(b, 's1', DI, FR, 'o1'); return b; };
  // wie revertMovedLesson: Kopie weg, Einträge zurück an den Ursprung
  const revert = d => {
    const data = d.lessonData[`o1_${FR}`];
    delete d.lessonData[`o1_${FR}`];
    d.lessonData[`s1_${DI}`] = data;
    d.lessonSlots = d.lessonSlots.filter(x => x.id !== 'o1');
  };
  it('AP6: Gerät hebt die Verlegung auf, Cloud trägt in der verlegten Stunde ein: beides am alten Termin, keine Kopie', () => {
    const r = merge(revert, d => addNote(d, `o1_${FR}`, 'neu in der Cloud'), movedBase());
    expect(r.conflicts).toEqual([]);
    expect(r.merged.lessonSlots.map(s => s.id)).toEqual(['s1']);
    expect(r.merged.lessonData[`s1_${DI}`].notes).toBe('alt\nneu in der Cloud');
    expect(r.merged.lessonData[`s1_${DI}`].movedTo).toBeUndefined();
    expect(r.merged.lessonData[`o1_${FR}`]).toBeUndefined();
  });
  it('AP6 andersherum: Cloud hebt auf, Gerät trägt ein', () => {
    const r = merge(d => addNote(d, `o1_${FR}`, 'neu hier'), revert, movedBase());
    expect(r.merged.lessonSlots.map(s => s.id)).toEqual(['s1']);
    expect(r.merged.lessonData[`s1_${DI}`].notes).toBe('alt\nneu hier');
  });
  it('AP8: ein Gerät verlegt die Stunde auf einen anderen Tag, das andere in einen anderen Block: nicht raten, ganzer Stand', () => {
    expect(() => merge(d => moveSeries(d, 's1', 2), d => { d.lessonSlots[0].block = 8; })).toThrow(/verlegt|geändert/);
  });
  it('AQ17 im Abgleich: Erledigt-Haken des anderen Geräts wandert mit der Verlegung', () => {
    const base = baseDB();
    base.groups[0].plan = [{ id: 'p1', title: 'Brüche' }];
    const r = merge(d => moveSeries(d, 's1', 2), d => { d.groups[0].plan[0].doneLessons = [`s1_${DI}`]; }, base);
    expect(r.merged.groups[0].plan[0].doneLessons).toEqual([`s1_${MI}`]);
  });
});

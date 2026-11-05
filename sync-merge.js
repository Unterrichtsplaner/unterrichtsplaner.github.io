// ─── Drei-Wege-Abgleich (AH4, Z3) ────────────────────────────────────────────
// Haben Gerät und Cloud seit dem letzten gemeinsamen Stand („Basis“) beide geändert, führt mergeDB sie zusammen:
// Was nur eine Seite geändert hat, wird übernommen; nur echte Widersprüche werden zu Fragen (conflicts).
// Reine Funktionen ohne Zugriff auf die App. Die Eingaben bleiben unverändert.
//
// Listen ohne feste Kennung werden über ihren fachlichen Schlüssel zugeordnet (Noten: Regel 33, Fehlzeiten: Regel 50),
// darum braucht es weder neue IDs noch eine Migration, und das Cloud-Format bleibt gleich (Regel 15).
// Im Zweifel nie raten: Unbekannte Listen, die beide Seiten geändert haben, brechen ab (MergeUnsupportedError);
// dann bleibt der Dialog, in dem man einen ganzen Stand wählt.
class MergeUnsupportedError extends Error {
  constructor(message) { super(message); this.name = 'MergeUnsupportedError'; }
}

const mergeClone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const mergeIsEmpty = v => v === undefined || v === null || v === '';
const mergeIsObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
// Inhaltlich gleich: Reihenfolge der Felder egal; fehlend, null und '' gelten als gleich
function mergeEqual(a, b, ignore) {
  if (mergeIsEmpty(a) && mergeIsEmpty(b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => mergeEqual(x, b[i]));
  if (mergeIsObject(a) && mergeIsObject(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].every(k => (ignore && ignore.includes(k)) || mergeEqual(a[k], b[k]));
  }
  return a === b;
}

// Freier Text zeilenweise: Was eine Seite gestrichen hat, fällt weg; was eine Seite ergänzt hat, bleibt. So stehen
// bei zwei verschiedenen Änderungen beide da, und automatische Notiz-Zeilen (Regel 25) bleiben einzeln.
function mergeText(base, local, cloud) {
  const lines = t => (mergeIsEmpty(t) ? [] : String(t).split('\n'));
  const b = lines(base), l = lines(local), c = lines(cloud);
  const kept = l.filter(x => c.includes(x) || !b.includes(x));
  c.forEach(x => { if (!b.includes(x) && !kept.includes(x)) kept.push(x); });
  return kept.join('\n');
}

const MERGE_FIELD_NAMES = {
  subject: 'Fach', className: 'Klassenname', year: 'Schuljahr', schularbeitWeight: 'Gewichtung', gradeScale: 'Notenskala',
  room: 'Raum', day: 'Tag', block: 'Stunde', part: 'Teil der Stunde', recurring: 'Wiederholung', groupId: 'Klasse',
  firstName: 'Vorname', lastName: 'Nachname', birthday: 'Geburtstag', title: 'Thema', lessons: 'Dauer', pinned: 'Fester Termin',
  until: 'Gilt bis', due: 'Frist', text: 'Text', date: 'Datum', ausfall: 'Stunde fällt aus', movedTo: 'Verlegung', movedFrom: 'Verlegung',
  validFrom: 'Gültig ab', validUntil: 'Gültig bis', startDate: 'Startdatum', specificDate: 'Datum', targetDate: 'Fällig am',
  start: 'Beginn', end: 'Ende', place: 'Ort', done: 'Erledigt', label: 'Titel', value: 'Wert', type: 'Art', note: 'Bemerkung',
};
const mergeShortDate = d => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.` : d);
function mergeShow(v) {
  if (mergeIsEmpty(v)) return 'leer';
  if (v === true) return 'ja';
  if (v === false) return 'nein';
  if (typeof v === 'object') return 'geändert';
  return String(mergeShortDate(v));
}
const MERGE_ATTENDANCE_WORDS = { abwesend: 'Fehlt', entschuldigt: 'Entschuldigt', 'zuspät': 'Zu spät' };
const MERGE_DAY_TYPES = Object.keys(MERGE_ATTENDANCE_WORDS);
const MERGE_FACE_WORDS = { positive: '😊 gut', neutral: '😐 mittel', negative: '☹️ schwach' };

// Beschreibung der Daten: atomic = als Ganzes vergleichen ('ask' fragt, 'local' Gerät gewinnt still, 'max' größerer Wert),
// text = zeilenweise, list = Liste mit Schlüssel, map = Objekt mit gleichartigen Werten, fields = bekannte Felder.
// onDelete: gelöscht gegen geändert → 'ask' oder still 'keep' (Änderung bleibt).
const MERGE_LOCAL = { atomic: 'local' };
const MERGE_TEXT = { text: true };
const mergeEventList = { list: e => `${e.date}|${e.label || ''}|${e.type || ''}`, item: { other: MERGE_LOCAL }, onDelete: 'keep' };
const MERGE_SPEC = {
  fields: {
    syncSettings: { skip: true },
    settings: {
      fields: {
        lastModified: { skip: true },
        lastBackupTimestamp: { atomic: 'max' },
        blocks: { atomic: 'ask', what: 'Uhrzeiten der Stunden', title: () => 'Einstellungen', show: () => 'eigene Uhrzeiten' },
        holidays: { list: h => h.id, item: { other: MERGE_LOCAL }, onDelete: 'keep' },
      },
      other: MERGE_LOCAL,   // Darstellung und Vorlieben: keine Frage wert
    },
    acknowledgedWarnings: { map: { atomic: 'max' }, onDelete: 'keep' },
    lessonSlots: {
      list: s => s.id, onDelete: 'ask', ignore: [],
      title: s => `Stunde ${s.subject || ''}`.trim(),
      item: { fields: { color: MERGE_LOCAL, startWeek: MERGE_LOCAL } },
    },
    lessonData: {
      map: {
        fields: {
          done: MERGE_TEXT, notes: MERGE_TEXT, hwEnabled: MERGE_LOCAL, testEnabled: MERGE_LOCAL,
          hwItems: { list: i => i.id, onDelete: 'keep', item: { fields: { text: MERGE_TEXT } } },
          testItems: { list: i => i.id, onDelete: 'keep', item: { fields: { text: MERGE_TEXT } } },
          movedTo: { atomic: 'ask' },
        },
      },
      onDelete: 'keep',   // Daten wandern beim Verlegen unter einen neuen Schlüssel; das Löschen ganzer Stunden prüft mergeDB vorher
      mapTitle: (key, ctx) => [ctx.slotName ? ctx.slotName(key) : 'Stunde', `am ${mergeShortDate(String(key).slice(-10))}`].join(' '),
    },
    groups: {
      list: g => g.id, onDelete: 'ask',
      title: g => `Klasse ${g.className || ''}`.trim(),
      item: {
        fields: {
          color: MERGE_LOCAL, seatingRows: MERGE_LOCAL, seatingCols: MERGE_LOCAL, teacherDeskX: MERGE_LOCAL, teacherDeskY: MERGE_LOCAL, seatingStagger: MERGE_LOCAL,
          seatingPlan: { list: p => p.studentId, item: { other: MERGE_LOCAL }, onDelete: 'keep' },
          gradeEvents: mergeEventList, attendanceEvents: mergeEventList, participationEvents: mergeEventList, homeworkEvents: mergeEventList,
          plan: {
            list: p => p.id, ordered: true, onDelete: 'ask', title: p => `Thema „${p.title || ''}“`,
            item: { fields: { note: MERGE_TEXT, title: MERGE_TEXT, doneLessons: { list: k => k, onDelete: 'keep' } } },
          },
          classNotes: { list: n => n.id, onDelete: 'ask', title: n => `Klassennotiz „${n.text || ''}“`, item: { fields: { text: MERGE_TEXT } } },
        },
      },
    },
    students: {
      map: {
        list: s => s.id, onDelete: 'ask',
        title: s => `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        scope: 'student',
        item: {
          fields: {
            notes: MERGE_TEXT, importantNote: MERGE_TEXT,
            grades: {
              list: g => `${g.date || ''}|${g.type || ''}|${g.note || ''}`, ignore: ['id'], onDelete: 'ask',
              what: g => `${g.note || 'Note'}${g.date ? ` (${mergeShortDate(g.date)})` : ''}`,
              item: { fields: { value: { atomic: 'ask', show: v => mergeShow(v).replace('.', ',') } } },
            },
            attendance: {
              list: a => (MERGE_DAY_TYPES.includes(a.type) ? `tag|${a.date || ''}` : `${a.type || ''}|${a.date || ''}`), ignore: ['id'], onDelete: 'ask',
              what: a => `Fehlzeit am ${mergeShortDate(a.date)}`,
              item: { fields: { note: MERGE_TEXT, type: { atomic: 'ask', show: t => MERGE_ATTENDANCE_WORDS[t] || mergeShow(t) } } },
            },
            participation: {
              list: p => `${p.date || ''}|${p.label || ''}`, ignore: ['id'], onDelete: 'ask',
              what: p => `Mitarbeit am ${mergeShortDate(p.date)}${p.label ? ` (${p.label})` : ''}`,
              item: { fields: { value: { atomic: 'ask', show: v => MERGE_FACE_WORDS[v] || mergeShow(v) } } },
            },
            homework: {
              list: h => `${h.date || ''}|${h.note || ''}`, ignore: ['id'], onDelete: 'ask',
              what: h => `Hausaufgabe vom ${mergeShortDate(h.date)}`, item: { other: MERGE_LOCAL },
            },
            studentNotes: {
              list: n => `${n.date || ''}|${n.text || ''}`, ignore: ['id'], onDelete: 'keep', item: { other: MERGE_LOCAL },
            },
          },
        },
      },
      onDelete: 'keep',   // Liste einer ganzen Klasse: das Löschen ganzer Klassen prüft mergeDB vorher
    },
    supervisions: { list: s => s.id, onDelete: 'ask', title: s => `Aufsicht ${s.place || ''}`.trim(), item: {} },
    todos: {
      list: t => t.id, onDelete: 'ask', title: t => `Merkzettel „${t.text || ''}“`,
      item: { fields: { text: MERGE_TEXT, done: { atomic: 'max' }, doneAt: { atomic: 'max' } } },
    },
  },
};

function mergeValue(parent, key, b, l, c, spec, ctx) {
  spec = spec || {};
  if (spec.skip) return;
  const set = v => { if (v === undefined) delete parent[key]; else parent[key] = mergeClone(v); };
  if (mergeEqual(l, c, spec.ignore)) { if (l === undefined && c !== undefined) set(c); return; }   // gleich: Gerät steht schon im Ergebnis
  if (mergeEqual(b, l, spec.ignore)) { set(c); return; }   // nur die Cloud hat geändert
  if (mergeEqual(b, c, spec.ignore)) return;               // nur das Gerät hat geändert

  // Beide Seiten verschieden
  if (spec.text) { set(mergeText(b, l, c)); return; }
  if (spec.atomic === 'local') return;
  if (spec.atomic === 'max') {
    if (mergeIsEmpty(l)) set(c);
    else if (!mergeIsEmpty(c)) set(l >= c ? l : c);
    return;
  }
  if (spec.atomic !== 'ask') {
    if (spec.list) { parent[key] = mergeList(b || [], l || [], c || [], spec, ctx); return; }
    if ((spec.map || spec.fields || spec.other || !(Array.isArray(l) || Array.isArray(c))) && (mergeIsObject(l) || mergeIsEmpty(l)) && (mergeIsObject(c) || mergeIsEmpty(c)) && (mergeIsObject(l) || mergeIsObject(c))) {
      if (!mergeIsObject(parent[key])) parent[key] = {};
      mergeObject(parent[key], mergeIsObject(b) ? b : {}, mergeIsObject(l) ? l : {}, mergeIsObject(c) ? c : {}, spec, ctx);
      return;
    }
    if (Array.isArray(l) || Array.isArray(c)) throw new MergeUnsupportedError(`Unbekannte Liste „${key}“ wurde auf beiden Seiten geändert`);
  }
  // Widerspruch: Bis zur Antwort steht der Wert des Geräts im Ergebnis
  const show = spec.show || mergeShow;
  ctx.conflicts.push({
    kind: 'value',
    title: (spec.title && spec.title()) || ctx.title || 'Einstellungen',
    what: spec.what || [ctx.what, ctx.what ? null : MERGE_FIELD_NAMES[key] || key].filter(Boolean).join(' · '),
    field: MERGE_FIELD_NAMES[key] || key,
    localText: show(l),
    cloudText: show(c),
    apply: choice => { if (choice === 'cloud') set(c); else set(l); },
  });
}

function mergeObject(target, b, l, c, spec, ctx) {
  const keys = [...new Set([...Object.keys(l), ...Object.keys(c), ...Object.keys(b)])];
  keys.forEach(k => {
    const fieldSpec = (spec.fields && spec.fields[k]) || spec.map || spec.other;
    if (fieldSpec && fieldSpec.skip) return;
    const inL = !mergeIsEmpty(l[k]), inC = !mergeIsEmpty(c[k]);
    // Ganze Einträge einer Sammlung (lessonData, Listen je Klasse): gelöscht gegen geändert behalten
    if (spec.map && b[k] !== undefined && inL !== inC && spec.onDelete === 'keep') {
      const survivor = inL ? l[k] : c[k];
      if (mergeEqual(b[k], survivor)) { delete target[k]; return; }
      target[k] = mergeClone(survivor);
      return;
    }
    const sub = spec.mapTitle ? { ...ctx, title: spec.mapTitle(k, ctx), what: '' } : ctx;
    mergeValue(target, k, b[k], l[k], c[k], fieldSpec, sub);
  });
}

// Zuordnung über den Schlüssel; gleiche Schlüssel werden der Reihe nach durchgezählt (nth, Regel 33)
function mergeIndex(list, keyFn) {
  const seen = new Map(), out = new Map();
  (Array.isArray(list) ? list : []).forEach(item => {
    if (item === null || item === undefined) return;   // kaputte Einträge überspringen
    const k = String(keyFn(item));
    const n = seen.get(k) || 0;
    seen.set(k, n + 1);
    out.set(`${k}#${n}`, item);
  });
  return out;
}

function mergeList(b, l, c, spec, ctx) {
  const ib = mergeIndex(b, spec.list), il = mergeIndex(l, spec.list), ic = mergeIndex(c, spec.list);
  const result = [];
  const entries = new Map();   // Schlüssel → Eintrag im Ergebnis
  const itemCtx = item => {
    const label = spec.title ? spec.title(item) : null;
    const what = spec.what ? spec.what(item) : null;
    if (spec.scope === 'student') return { ...ctx, title: [ctx.group, label].filter(Boolean).join(' · '), student: label, what: '' };
    if (what) return { ...ctx, what };
    if (label) return { ...ctx, title: [ctx.title, label].filter(Boolean).join(' · '), what: '' };
    return ctx;
  };
  const askDelete = (key, item, deletedOn) => {
    const value = mergeClone(item);
    entries.set(key, value);
    if (spec.onDelete !== 'ask') return;
    const c2 = itemCtx(item);
    ctx.conflicts.push({
      kind: 'delete', deletedOn,
      title: c2.title || 'Eintrag',
      what: c2.what || '',
      apply: choice => {
        if (choice !== 'delete') return;
        const i = result.indexOf(value);
        if (i !== -1) result.splice(i, 1);
      },
    });
  };
  // Alle Schlüssel der Vereinigung, zunächst in der Reihenfolge des Geräts
  [...il.keys(), ...[...ic.keys()].filter(k => !il.has(k))].forEach(key => {
    const bi = ib.get(key), li = il.get(key), ci = ic.get(key);
    if (li !== undefined && ci !== undefined) {
      if (spec.item === undefined && !mergeIsObject(li)) { entries.set(key, li); return; }
      const holder = { v: mergeClone(li) };
      entries.set(key, holder);
      const inner = spec.item || {};
      const sub = itemCtx(li);
      if (mergeIsObject(li) && mergeIsObject(ci)) {
        mergeObject(holder.v, mergeIsObject(bi) ? bi : {}, li, ci, { ...inner, fields: { ...(inner.fields || {}), ...(spec.ignore || []).reduce((o, f) => ({ ...o, [f]: MERGE_LOCAL }), {}) } }, sub);
      } else if (!mergeEqual(li, ci)) {
        mergeValue(holder, 'v', bi, li, ci, inner, sub);
      }
      entries.set(key, holder.v);
    } else if (li !== undefined) {
      if (bi === undefined) entries.set(key, mergeClone(li));          // auf dem Gerät neu
      else if (!mergeEqual(bi, li, spec.ignore)) askDelete(key, li, 'cloud');   // in der Cloud gelöscht, hier geändert
      // sonst: in der Cloud gelöscht, hier unverändert → bleibt weg
    } else {
      if (bi === undefined) entries.set(key, mergeClone(ci));          // in der Cloud neu
      else if (!mergeEqual(bi, ci, spec.ignore)) askDelete(key, ci, 'local');
    }
  });
  // Reihenfolge: bei geordneten Listen die Seite, die umsortiert hat; Neues hinten
  let order = [...entries.keys()];
  if (spec.ordered) {
    const common = list => [...list.keys()].filter(k => ib.has(k) && il.has(k) && ic.has(k));
    if (mergeEqual(common(ib), common(il))) {
      order = [...[...ic.keys()].filter(k => entries.has(k)), ...order.filter(k => !ic.has(k))];
    }
  }
  order.forEach(k => result.push(entries.get(k)));
  return result;
}

const mergeSlotDataKeys = (d, slotId) => Object.keys(d.lessonData || {}).filter(k => k.startsWith(`${slotId}_`));
const mergeSlotDataOf = (d, slotId) => Object.fromEntries(mergeSlotDataKeys(d, slotId).map(k => [k, d.lessonData[k]]));

// Ganze Klassen und Stunden: Gelöscht wird zusammen mit Abhängigem (Regel 10). Hat die andere Seite darin etwas geändert,
// gibt es genau eine Frage statt vieler einzelner. Dafür kommt der Stand der anderen Seite in die Arbeitskopie zurück;
// „Löschen“ räumt das Ganze dann im Ergebnis ab.
function mergeRestoreDeleted(b, l, c, pending) {
  const sameList = (x, y) => mergeEqual(x || [], y || []);
  const slotsOf = (d, gid) => (d.lessonSlots || []).filter(s => s.groupId === gid);
  (b.groups || []).forEach(g => {
    const inL = (l.groups || []).find(x => x.id === g.id), inC = (c.groups || []).find(x => x.id === g.id);
    if (!!inL === !!inC) return;
    const [keep, gone, deletedOn] = inL ? [l, c, 'cloud'] : [c, l, 'local'];
    const survivor = inL || inC;
    const dataOf = d => Object.assign({}, ...slotsOf(b, g.id).concat(slotsOf(keep, g.id)).map(s => mergeSlotDataOf(d, s.id)));
    const changed = !mergeEqual(g, survivor) || !sameList((b.students || {})[g.id], (keep.students || {})[g.id])
      || !sameList(slotsOf(b, g.id), slotsOf(keep, g.id)) || !mergeEqual(dataOf(b), dataOf(keep));
    if (!changed) return;   // nur gelöscht: normale Zusammenführung reicht
    gone.groups = [...(gone.groups || []), mergeClone(survivor)];
    gone.students = { ...(gone.students || {}), [g.id]: mergeClone((keep.students || {})[g.id] || []) };
    gone.lessonSlots = [...(gone.lessonSlots || []), ...mergeClone(slotsOf(keep, g.id))];
    gone.lessonData = { ...(gone.lessonData || {}), ...mergeClone(dataOf(keep)) };
    pending.push({ type: 'group', id: g.id, deletedOn, title: `Klasse ${survivor.className || ''}`.trim() });
  });
  (b.lessonSlots || []).forEach(s => {
    if (pending.some(p => p.type === 'group' && p.id === s.groupId)) return;
    const inL = (l.lessonSlots || []).find(x => x.id === s.id), inC = (c.lessonSlots || []).find(x => x.id === s.id);
    if (!!inL === !!inC) return;
    const [keep, gone, deletedOn] = inL ? [l, c, 'cloud'] : [c, l, 'local'];
    const survivor = inL || inC;
    if (mergeEqual(s, survivor) && mergeEqual(mergeSlotDataOf(b, s.id), mergeSlotDataOf(keep, s.id))) return;
    gone.lessonSlots = [...(gone.lessonSlots || []), mergeClone(survivor)];
    gone.lessonData = { ...(gone.lessonData || {}), ...mergeClone(mergeSlotDataOf(keep, s.id)) };
    pending.push({ type: 'slot', id: s.id, deletedOn, title: `Stunde ${survivor.subject || ''}`.trim() });
  });
}

// Was gelöscht wurde, zieht Abhängiges nach. Läuft nach allen Antworten (Regel 10, 73).
function finishMerge(merged) {
  const groupIds = new Set((merged.groups || []).map(g => g.id));
  // Nur leere Listen: Einträge ohne Klasse (Altdaten) räumt der Abgleich nie still weg
  Object.keys(merged.students || {}).forEach(gid => {
    if (!groupIds.has(gid) && !(merged.students[gid] || []).length) delete merged.students[gid];
  });
  (merged.groups || []).forEach(g => {
    if (!Array.isArray(g.seatingPlan)) return;
    const ids = new Set((merged.students[g.id] || []).map(s => s.id));
    g.seatingPlan = g.seatingPlan.filter(p => ids.has(p.studentId));
  });
  (merged.todos || []).forEach(t => { if (t && t.groupId && !groupIds.has(t.groupId)) delete t.groupId; });
  return merged;
}

// Nachprüfung: Was eine Seite neu angelegt hat, muss im Ergebnis stehen (bis zur Antwort bleibt alles erhalten)
function mergeVerify(b, l, c, merged) {
  const check = (bl, sideL, sideC, m, keyFn, name) => {
    const ib = mergeIndex(bl, keyFn), im = mergeIndex(m, keyFn);
    [sideL, sideC].forEach(side => mergeIndex(side, keyFn).forEach((_, k) => {
      if (!ib.has(k) && !im.has(k)) throw new MergeUnsupportedError(`Nachprüfung: ${name} fehlt im Ergebnis`);
    }));
  };
  const lists = MERGE_SPEC.fields.students.map.item.fields;
  check(b.groups, l.groups, c.groups, merged.groups, x => x.id, 'Klasse');
  check(b.lessonSlots, l.lessonSlots, c.lessonSlots, merged.lessonSlots, x => x.id, 'Stunde');
  check(b.todos, l.todos, c.todos, merged.todos, x => x.id, 'Merkzettel');
  (merged.groups || []).forEach(g => {
    const bs = (b.students || {})[g.id], ls = (l.students || {})[g.id], cs = (c.students || {})[g.id], ms = (merged.students || {})[g.id];
    check(bs, ls, cs, ms, s => s.id, 'Schüler');
    (ms || []).forEach(s => {
      const pick = list => (list || []).find(x => x.id === s.id) || {};
      Object.keys(lists).filter(f => lists[f].list).forEach(f => {
        check(pick(bs)[f], pick(ls)[f], pick(cs)[f], s[f], lists[f].list, f);
      });
    });
  });
  [l, c].forEach(side => Object.keys(side.lessonData || {}).forEach(k => {
    if (!(b.lessonData || {})[k] && !(merged.lessonData || {})[k] && !mergeIsEmpty(side.lessonData[k])) {
      const slot = k.slice(0, k.lastIndexOf('_'));
      if ((merged.lessonSlots || []).some(s => s.id === slot)) throw new MergeUnsupportedError('Nachprüfung: Stundendaten fehlen im Ergebnis');
    }
  }));
}

function mergeDB(base, local, cloud) {
  const b = mergeClone(base), l = mergeClone(local), c = mergeClone(cloud);
  const pending = [];
  mergeRestoreDeleted(b, l, c, pending);
  const merged = mergeClone(l);
  // Stundendaten hängen an slotId_Datum: Für Fragen die Stunde beim Namen nennen
  const slotName = key => {
    const slot = [...(l.lessonSlots || []), ...(c.lessonSlots || [])].find(s => s.id === String(key).slice(0, String(key).lastIndexOf('_')));
    return slot ? `Stunde ${slot.subject || ''}`.trim() : 'Stunde';
  };
  const ctx = { conflicts: [], title: '', what: '', slotName };

  // Klassenname vor die Schüler-Fragen: students ist nach Klasse aufgeteilt
  const groupName = gid => ((l.groups || []).concat(c.groups || []).find(g => g.id === gid) || {}).className || '';
  const specs = MERGE_SPEC.fields;
  [...new Set([...Object.keys(l), ...Object.keys(c), ...Object.keys(b)])].forEach(k => {
    if (specs[k] && specs[k].skip) return;
    if (k === 'students') return;
    mergeValue(merged, k, b[k], l[k], c[k], specs[k], ctx);
  });
  const bs = b.students || {}, ls = l.students || {}, cs = c.students || {};
  if (!merged.students) merged.students = {};
  [...new Set([...Object.keys(ls), ...Object.keys(cs), ...Object.keys(bs)])].forEach(gid => {
    const inL = !mergeIsEmpty(ls[gid]), inC = !mergeIsEmpty(cs[gid]);
    if (bs[gid] !== undefined && !inL && !inC) { delete merged.students[gid]; return; }
    merged.students[gid] = mergeList(bs[gid] || [], ls[gid] || [], cs[gid] || [], specs.students.map, { conflicts: ctx.conflicts, group: groupName(gid) });
  });
  pending.forEach(p => {
    ctx.conflicts.push({
      kind: 'delete', deletedOn: p.deletedOn, title: p.title, what: '',
      apply: choice => {
        if (choice !== 'delete') return;
        const slotIds = p.type === 'group' ? (merged.lessonSlots || []).filter(s => s.groupId === p.id).map(s => s.id) : [p.id];
        if (p.type === 'group') {
          merged.groups = merged.groups.filter(g => g.id !== p.id);
          delete merged.students[p.id];
        }
        merged.lessonSlots = merged.lessonSlots.filter(s => !slotIds.includes(s.id));
        slotIds.forEach(id => mergeSlotDataKeys(merged, id).forEach(k => delete merged.lessonData[k]));
      },
    });
  });
  mergeVerify(b, l, c, merged);
  return { merged, conflicts: ctx.conflicts };
}

// Zusammenfassung ohne Namen und Werte, für das Fenster, in dem man einen ganzen Stand wählt (Y10)
function describeDifferences(local, cloud) {
  const out = [];
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const lists = MERGE_SPEC.fields.students.map.item.fields;
  const NAMES = { grades: ['Note', 'Noten'], attendance: ['Fehlzeit', 'Fehlzeiten'], participation: ['Mitarbeit-Eintrag', 'Mitarbeit-Einträge'], homework: ['Hausaufgabe', 'Hausaufgaben'], studentNotes: ['Notiz', 'Notizen'] };
  const groups = [...(local.groups || []), ...(cloud.groups || []).filter(g => !(local.groups || []).some(x => x.id === g.id))];
  groups.forEach(g => {
    const inL = (local.groups || []).some(x => x.id === g.id), inC = (cloud.groups || []).some(x => x.id === g.id);
    if (!inL || !inC) { out.push(`Klasse ${g.className}: ${inL ? 'nur auf diesem Gerät' : 'nur in der Cloud'}`); return; }
    const ls = (local.students || {})[g.id] || [], cs = (cloud.students || {})[g.id] || [];
    const counts = {};
    let people = 0;
    new Set([...ls, ...cs].map(s => s.id)).forEach(id => {
      const a = ls.find(s => s.id === id), b = cs.find(s => s.id === id);
      if (!a || !b) { people++; return; }
      Object.keys(NAMES).forEach(f => {
        const ia = mergeIndex(a[f], lists[f].list), ib = mergeIndex(b[f], lists[f].list);
        new Set([...ia.keys(), ...ib.keys()]).forEach(k => {
          if (!mergeEqual(ia.get(k), ib.get(k), ['id'])) counts[f] = (counts[f] || 0) + 1;
        });
      });
    });
    const parts = Object.keys(NAMES).filter(f => counts[f]).map(f => plural(counts[f], NAMES[f][0], NAMES[f][1]));
    if (people) parts.unshift(plural(people, 'Schüler', 'Schüler'));
    if (parts.length) out.push(`Klasse ${g.className}: ${parts.join(', ')}`);
  });
  if (!mergeEqual(local.lessonSlots || [], cloud.lessonSlots || [])) out.push('Stundenplan');
  if (!mergeEqual(local.lessonData || {}, cloud.lessonData || {})) out.push('Einträge zu Stunden');
  if (!mergeEqual(local.todos || [], cloud.todos || [])) out.push('Merkzettel');
  if (!mergeEqual((local.settings || {}).blocks, (cloud.settings || {}).blocks)) out.push('Uhrzeiten');
  return out;
}

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
  subject: 'Fach', className: 'Klassenname', classTeacher: 'Klassenlehrer/in', year: 'Schuljahr', schularbeitWeight: 'Gewichtung', gradeScale: 'Notenskala',
  room: 'Raum', day: 'Tag', block: 'Stunde', part: 'Teil der Stunde', recurring: 'Wiederholung', groupId: 'Klasse',
  firstName: 'Vorname', lastName: 'Nachname', birthday: 'Geburtstag', title: 'Thema', lessons: 'Dauer', pinned: 'Fester Termin',
  until: 'Gilt bis', due: 'Frist', text: 'Text', date: 'Datum', ausfall: 'Stunde fällt aus', movedTo: 'Verlegung', movedFrom: 'Verlegung',
  validFrom: 'Gültig ab', validUntil: 'Gültig bis', startDate: 'Startdatum', specificDate: 'Datum', targetDate: 'Fällig am',
  topics: 'Themen der Arbeit', start: 'Beginn', end: 'Ende', place: 'Ort', done: 'Erledigt', label: 'Titel', value: 'Wert', type: 'Art', note: 'Bemerkung',
};
const mergeShortDate = d => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.` : d);
function mergeShow(v) {
  if (mergeIsEmpty(v)) return 'leer';
  if (v === true) return 'ja';
  if (v === false) return 'nein';
  if (typeof v === 'object') return 'geändert';
  return String(mergeShortDate(v));
}
// Uhrzeiten: nur was sich unterscheidet, sonst stünde auf beiden Seiten dasselbe
function mergeBlocksText(v, ctx, other) {
  if (!Array.isArray(v)) return 'Standardzeiten';
  const diff = v.filter(x => !(Array.isArray(other) ? other : []).some(o => mergeEqual(x, o)));
  const shown = (diff.length ? diff : v).slice(0, 3).map(x => `${x.start}–${x.end}`).join(', ');
  return `${v.length} Stunden, u. a. ${shown}`;
}
const MERGE_WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MERGE_PARTS = { first: ' (1. Hälfte)', second: ' (2. Hälfte)' };
const mergeSlotPlace = p => `${p.specificDate ? `${mergeShortDate(p.specificDate)}, ` : `${MERGE_WEEKDAYS[p.day] || ''}, `}${p.block}. Stunde${MERGE_PARTS[p.part] || ''}`;
const MERGE_ATTENDANCE_WORDS = { abwesend: 'Fehlt', entschuldigt: 'Entschuldigt', 'zuspät': 'Zu spät' };
const MERGE_DAY_TYPES = Object.keys(MERGE_ATTENDANCE_WORDS);
const MERGE_FACE_WORDS = { excellent: '++ sehr gut', positive: '+ gut', neutral: '− wenig', negative: '−− schwach' };   // Mitarbeit (AH52, wie PART_LEVELS)

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
        blocks: { atomic: 'ask', what: 'Uhrzeiten der Stunden', title: () => 'Einstellungen', show: mergeBlocksText },
        holidays: { list: h => h.id, item: { other: MERGE_LOCAL }, onDelete: 'keep' },
      },
      other: MERGE_LOCAL,   // Darstellung und Vorlieben: keine Frage wert
    },
    acknowledgedWarnings: { map: { atomic: 'max' }, onDelete: 'keep' },
    lessonSlots: {
      list: s => s.id, onDelete: 'ask', ignore: [],
      title: s => `Stunde ${s.subject || ''}`.trim(),
      item: {
        together: [{ fields: ['day', 'block', 'part', 'specificDate'], what: 'Platz im Stundenplan', show: mergeSlotPlace }],
        fields: {
          color: MERGE_LOCAL, startWeek: MERGE_LOCAL, splitFrom: MERGE_LOCAL,   // splitFrom: alte Stunde beim Wechsel (AP7)
          recurring: { atomic: 'ask', show: v => ({ weekly: 'jede Woche', biweekly: 'alle zwei Wochen' }[v] || (v === true ? 'jede Woche' : 'einmalig')) },
          groupId: { atomic: 'ask', show: (v, ctx) => (ctx.groupName && ctx.groupName(v)) || 'keine Klasse' },
        },
      },
    },
    lessonData: {
      map: {
        fields: {
          done: MERGE_TEXT, notes: MERGE_TEXT, hwEnabled: MERGE_LOCAL, testEnabled: MERGE_LOCAL,
          hwItems: { list: i => i.id, onDelete: 'keep', item: { fields: { text: MERGE_TEXT } } },
          testItems: { list: i => i.id, onDelete: 'keep', item: { fields: { text: MERGE_TEXT, topics: { list: k => k, onDelete: 'keep' } } } },   // topics: AJ6
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
            item: {
              together: [{ fields: ['pinned', 'pinnedSlot'], what: 'Fester Termin', show: p => (p.pinned ? mergeShortDate(p.pinned) : 'kein') }],   // AH54
              // Titel ist einzeilig: nie Zeile für Zeile zusammenführen, sondern fragen (AP9)
              fields: { note: MERGE_TEXT, title: { atomic: 'ask' }, doneLessons: { list: k => k, onDelete: 'keep' } },
            },
          },
          classNotes: { list: n => n.id, onDelete: 'ask', title: n => `Klassennotiz „${n.text || ''}“`, item: { fields: { text: MERGE_TEXT } } },
          // Schülerapp (AJ1): Zugang und Klassenziel nur als Ganzes (ein halber Zugang aus zwei Geräten taugt nichts)
          studentApp: {
            fields: {
              access: { atomic: 'ask', what: 'Zugang zur Schülerapp', show: a => (a && a.id ? `Link …${String(a.id).slice(-4)}` : 'kein Link') },
              goal: { atomic: 'ask', what: 'Klassenziel', show: gl => (gl && gl.target ? `${gl.target} Plusse${gl.reward ? `: ${gl.reward}` : ''}` : 'keins') },
              // Persönliche Seiten (AJ2): Tempo samt XP je Level gehört zusammen, Ränge und Joker als Ganzes
              personal: {
                together: [{ fields: ['level', 'step'], what: 'Tempo der Level', show: p => (p.level || 'normal') }],
                fields: { ranks: { atomic: 'ask', what: 'Ränge', show: r => (r || []).filter(Boolean).join(', ') || 'keine' },
                  jokers: { atomic: 'ask', what: 'Joker', show: j => (j || []).join(', ') || 'keine' },
                  stickers: { atomic: 'ask', what: 'Sticker von dir', show: l => (l || []).map(x => x.name).join(', ') || 'keine' },   // AJ2b
                  autoStickers: { atomic: 'ask', what: 'Sticker, die von selbst kommen', show: l => (l || []).map(x => x.name).join(', ') || 'keine' },
                  bauXP: { atomic: 'ask', what: 'XP für eine geschaffte Baustelle' } },
                other: MERGE_LOCAL,
              },
            },
            other: MERGE_LOCAL,
          },
        },
      },
    },
    students: {
      map: {
        list: s => s.id, onDelete: 'ask',
        title: s => `${s.firstName || ''} ${s.lastName || ''}`.trim(),
        scope: 'student',
        item: {
          together: [{ fields: ['gridX', 'gridY'], atomic: 'local' }],   // Sitzplatz als Paar, Regel 44; beide umgeordnet: dieses Gerät
          fields: {
            notes: MERGE_TEXT, importantNote: MERGE_TEXT,
            grades: {
              list: g => `${g.date || ''}|${g.type || ''}|${g.note || ''}`, ignore: ['id'], onDelete: 'ask', keepBoth: g => !g.note,   // ohne Titel gibt es mehrere am Tag; mit Titel ist es eine Spalte, also ein echter Widerspruch
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
            // Schülerapp Stufe 2a (AJ2): persönlicher Link als Ganzes, eingelöste Joker als Liste
            studentApp: { fields: { access: { atomic: 'ask', what: 'Persönlicher Link', show: a => (a && a.id ? `Link …${String(a.id).slice(-4)}` : 'kein Link') } }, other: MERGE_LOCAL },
            jokersUsed: { list: j => j.id, onDelete: 'ask', what: j => `Joker vom ${mergeShortDate(j.date)}`, item: { other: MERGE_LOCAL } },
            // AJ2b: vergebene Sticker (Grund als Text), Baustellen (geschafft: das spätere Datum gilt)
            stickersGiven: { list: x => x.id, onDelete: 'ask', what: x => `Sticker „${x.name || ''}“ vom ${mergeShortDate(x.date)}`, item: { fields: { reason: MERGE_TEXT }, other: MERGE_LOCAL } },
            baustellen: { list: x => x.id, onDelete: 'ask', what: x => `Baustelle „${x.text || ''}“`, item: { fields: { text: MERGE_TEXT, done: { atomic: 'max' }, xp: { atomic: 'max' } }, other: MERGE_LOCAL } },
          },
        },
      },
      onDelete: 'keep',   // Liste einer ganzen Klasse: das Löschen ganzer Klassen prüft mergeDB vorher
    },
    supervisions: { list: s => s.id, onDelete: 'ask', title: s => `Aufsicht ${s.place || ''}`.trim(), item: {} },
    // Vorlagen der Planung (Y6): entstehen beim Schuljahreswechsel, werden danach nur übernommen oder gelöscht
    planTemplates: {
      list: t => t.id, onDelete: 'ask', title: t => `Vorlage „${t.name || ''}“`,
      item: { fields: { name: MERGE_TEXT, topics: { atomic: 'ask', what: 'Themen der Vorlage', show: v => `${(v || []).length} Themen` } } },
    },
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
    localText: show(l, ctx, c),
    cloudText: show(c, ctx, l),
    apply: choice => { if (choice === 'cloud') set(c); else set(l); },
  });
}

// Felder, die nur zusammen Sinn ergeben (Platz einer Stunde): eine Frage, und nie ein Platz, den niemand gewählt hat
function mergeTogether(target, b, l, c, group, ctx) {
  const pick = o => Object.fromEntries(group.fields.map(f => [f, o[f]]));
  const pb = pick(b), pl = pick(l), pc = pick(c);
  const setAll = src => group.fields.forEach(f => { if (src[f] === undefined) delete target[f]; else target[f] = mergeClone(src[f]); });
  if (mergeEqual(pl, pc) || mergeEqual(pb, pc)) return;
  if (mergeEqual(pb, pl)) { setAll(pc); return; }
  if (group.atomic === 'local') return;
  ctx.conflicts.push({
    kind: 'value', title: ctx.title || 'Einstellungen', what: group.what, field: group.what,
    localText: group.show(pl), cloudText: group.show(pc),
    apply: choice => setAll(choice === 'cloud' ? pc : pl),
  });
}

function mergeObject(target, b, l, c, spec, ctx) {
  const together = new Set();
  (spec.together || []).forEach(group => {
    group.fields.forEach(f => together.add(f));
    mergeTogether(target, b, l, c, group, ctx);
  });
  const keys = [...new Set([...Object.keys(l), ...Object.keys(c), ...Object.keys(b)])];
  keys.forEach(k => {
    if (together.has(k)) return;
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
      // Auf beiden Seiten neu und verschieden (zwei Noten am selben Tag): zwei Einträge, nicht einer gegen den anderen
      if (spec.keepBoth && spec.keepBoth(li) && bi === undefined && !mergeEqual(li, ci, spec.ignore)) {
        entries.set(key, mergeClone(li));
        entries.set(`${key}|cloud`, mergeClone(ci));
        return;
      }
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

function mergeAddDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const mergeKeySlot = key => String(key).slice(0, String(key).lastIndexOf('_'));
const mergeKeyDate = key => String(key).slice(String(key).lastIndexOf('_') + 1);
// Einträge einer Stunde umziehen, alle auf einmal (wie moveLessonData: verschieben sich gemeinsam, also keine Kollision)
function mergeRekey(d, slotId, rename) {
  const data = d.lessonData;
  if (!data) return;
  const moved = Object.keys(data).filter(k => mergeKeySlot(k) === slotId).map(k => [k, rename(mergeKeyDate(k))]).filter(([k, to]) => to && to !== k);
  const values = moved.map(([k]) => data[k]);
  moved.forEach(([k]) => delete data[k]);
  moved.forEach(([, to], i) => { data[to] = values[i]; });
  // Planung hängt an denselben Terminen: Erledigt-Haken und eingetippte Themen ziehen mit (AQ17, Regel 84)
  (d.groups || []).forEach(g => (Array.isArray(g.plan) ? g.plan : []).forEach(t => {
    if (!t || typeof t !== 'object') return;
    if (Array.isArray(t.doneLessons)) t.doneLessons = t.doneLessons.map(k => (mergeKeySlot(k) === slotId && rename(mergeKeyDate(k))) || k);
    if (t.pinnedSlot === slotId && t.pinned) {
      const to = rename(t.pinned);
      if (to) { t.pinnedSlot = mergeKeySlot(to); t.pinned = mergeKeyDate(to); }
    }
  }));
}
// Verlegen ändert die Schlüssel der Stundendaten (Regel 13). Das andere Gerät kennt nur die alten; seine Einträge lägen danach
// unter einem Termin, den es nicht mehr gibt. Darum zieht es hier jede Verlegung auch in Basis und anderem Gerät nach.
// Geht das nicht eindeutig (beide verlegen verschieden), wird nicht geraten: Abbruch, Fenster mit dem ganzen Stand.
function mergeNormalizeMoves(b, l, c) {
  const inBase = id => (b.lessonSlots || []).some(s => s.id === id);
  const find = (d, id) => (d.lessonSlots || []).find(s => s.id === id);
  (b.lessonSlots || []).forEach(s => {
    const sl = find(l, s.id), sc = find(c, s.id);
    if (!sl || !sc) return;
    if (s.specificDate) {
      const movedL = sl.specificDate && sl.specificDate !== s.specificDate, movedC = sc.specificDate && sc.specificDate !== s.specificDate;
      if (movedL && movedC && sl.specificDate !== sc.specificDate) throw new MergeUnsupportedError('Stunde auf beiden Geräten verschieden verlegt');
      const placeChangedOnce = x => x.block !== s.block || (x.part || 'full') !== (s.part || 'full');
      if (movedL !== movedC && placeChangedOnce(movedL ? sc : sl)) throw new MergeUnsupportedError('Stunde auf einem Gerät verlegt, auf dem anderen anders geändert');
      const to = movedL ? sl.specificDate : movedC ? sc.specificDate : null;
      if (to) [b, l, c].forEach(d => mergeRekey(d, s.id, date => (date === s.specificDate ? `${s.id}_${to}` : null)));
      return;
    }
    const movedL = sl.day !== s.day, movedC = sc.day !== s.day;
    if (movedL && movedC && sl.day !== sc.day) throw new MergeUnsupportedError('Stunde auf beiden Geräten verschieden verlegt');
    // Eine Seite verlegt den Tag, die andere Block, Hälfte oder Rhythmus: Die Frage „Platz im Stundenplan“ käme erst nach
    // dem Umziehen der Einträge – mit der falschen Antwort lägen sie an einem Tag ohne Stunde (AP8). Nicht raten.
    const placeChanged = x => x.block !== s.block || (x.part || 'full') !== (s.part || 'full') || x.recurring !== s.recurring || (x.startDate || null) !== (s.startDate || null);
    if (movedL !== movedC && placeChanged(movedL ? sc : sl)) throw new MergeUnsupportedError('Stunde auf einem Gerät verlegt, auf dem anderen anders geändert');
    if (!movedL && !movedC) return;
    const shift = (movedL ? sl.day : sc.day) - s.day;
    [b, ...(movedL && movedC ? [] : [movedL ? c : l])].forEach(d => mergeRekey(d, s.id, date => `${s.id}_${mergeAddDays(date, shift)}`));
  });
  [[l, c], [c, l]].forEach(([mover, other]) => {
    (mover.lessonSlots || []).filter(n => !inBase(n.id)).forEach(n => {
      // Stundenplanwechsel (splitSlotFrom): alte Stunde endet am Vortag, Einträge ab dem Wechsel gehören zur neuen
      if (n.validFrom) {
        const end = mergeAddDays(n.validFrom, -1);
        const fits = s => s.validUntil !== end && (find(mover, s.id) || {}).validUntil === end && (find(mover, s.id) || {}).groupId === n.groupId;
        // Neuere Versionen merken sich die alte Stunde (splitFrom). Ältere: Passt mehr als eine alte Stunde derselben
        // Klasse und hat das andere Gerät dort ab dem Wechsel etwas geändert, nie raten (AP7, Regel 84).
        let old = n.splitFrom ? (b.lessonSlots || []).find(s => s.id === n.splitFrom && fits(s)) : null;
        if (!n.splitFrom) {
          const cands = (b.lessonSlots || []).filter(fits);
          const changedAfter = s => Object.keys(other.lessonData || {}).some(k => mergeKeySlot(k) === s.id && k.slice(k.lastIndexOf('_') + 1) >= n.validFrom
            && JSON.stringify(other.lessonData[k]) !== JSON.stringify((b.lessonData || {})[k]));
          if (cands.length > 1) {
            if (cands.some(changedAfter)) throw new MergeUnsupportedError('Stundenplanwechsel mehrerer Stunden einer Klasse');
          } else old = cands[0] || null;
        }
        if (old) {
          const theirs = find(other, old.id);
          if (theirs && theirs.validUntil !== old.validUntil) throw new MergeUnsupportedError('Stundenplanwechsel auf beiden Geräten');
          const shift = n.day - old.day;
          [b, other].forEach(d => mergeRekey(d, old.id, date => {
            if (date < n.validFrom) return null;
            let to = mergeAddDays(date, shift);
            while (to < n.validFrom) to = mergeAddDays(to, 7);
            return `${n.id}_${to}`;
          }));
        }
      }
      // „Nur an diesem Tag“ (moveOccurrenceOnce): Der Ursprung bleibt nur Verweis, Einträge gehören zur verlegten Stunde
      if (n.movedFrom) {
        const { slotId, date } = n.movedFrom;
        if ((other.lessonSlots || []).some(x => !inBase(x.id) && x.movedFrom && x.movedFrom.slotId === slotId && x.movedFrom.date === date)) {
          throw new MergeUnsupportedError('Dieselbe Stunde auf beiden Geräten verlegt');
        }
        [b, other].forEach(d => mergeRekey(d, slotId, day => (day === date ? `${n.id}_${n.specificDate}` : null)));
      }
    });
  });
  // „Verlegung aufheben“ (revertMovedLesson): Die Kopie ist auf einer Seite weg, ihre Einträge liegen dort wieder am
  // Ursprung. Basis und andere Seite ziehen genauso um, dann treffen sich beide Einträge am alten Termin (AP6, Regel 84).
  [[l, c], [c, l]].forEach(([mover, other]) => {
    (b.lessonSlots || []).filter(x => x.movedFrom && x.specificDate && !find(mover, x.id) && find(other, x.id)).forEach(x => {
      const originKey = Object.keys(b.lessonData || {}).find(k => { const v = b.lessonData[k]; return v && v.movedTo && v.movedTo.slotId === x.id; });
      if (!originKey || !find(mover, mergeKeySlot(originKey))) return;   // kein Verweis, oder Ursprung auf der Seite gelöscht
      const mv = (mover.lessonData || {})[originKey];
      if (mv && mv.movedTo && mv.movedTo.slotId === x.id) return;       // Verweis noch da: nicht aufgehoben
      [b, other].forEach(d => {
        const marker = d.lessonData && d.lessonData[originKey];
        if (marker && marker.movedTo && marker.movedTo.slotId === x.id) delete d.lessonData[originKey];
        mergeRekey(d, x.id, date => (date === x.specificDate ? originKey : null));
      });
    });
  });
}
// Findet die Stunde nach dem Abgleich an diesem Datum noch statt? (Ferien und A/B-Woche spielen hier keine Rolle)
function mergeSlotFits(s, date) {
  if ((s.validUntil && date > s.validUntil) || (s.validFrom && date < s.validFrom)) return false;
  if (s.specificDate) return date === s.specificDate;
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7 === s.day;
}
// Was eine Seite eingetragen hat, muss erreichbar bleiben. Liegt es nach dem Abgleich auf keinem Termin mehr, nicht still wegräumen
function mergeCheckReachable(b, l, c, merged) {
  [l, c].forEach(side => Object.keys(side.lessonData || {}).forEach(k => {
    if (mergeEqual(side.lessonData[k], (b.lessonData || {})[k]) || mergeIsEmpty((merged.lessonData || {})[k])) return;
    const id = mergeKeySlot(k), date = mergeKeyDate(k);
    const own = (side.lessonSlots || []).find(s => s.id === id), now = (merged.lessonSlots || []).find(s => s.id === id);
    if (own && now && mergeSlotFits(own, date) && !mergeSlotFits(now, date)) throw new MergeUnsupportedError('Eintrag läge auf einem Termin, den es nicht mehr gibt');
  }));
}
// HA/Test ausgeschaltet, die andere Seite hat eine neue ergänzt: Sonst wäre die neue still nirgends fällig
function mergeKeepNewItemsOn(b, l, c, merged) {
  [['hwItems', 'hwEnabled'], ['testItems', 'testEnabled']].forEach(([items, flag]) => {
    Object.keys(merged.lessonData || {}).forEach(k => {
      const m = merged.lessonData[k];
      if (!m || !Array.isArray(m[items]) || m[flag] !== false) return;
      const was = ((b.lessonData || {})[k] || {})[items] || [];
      const addedOn = side => {
        const d = (side.lessonData || {})[k];
        return d && d[flag] !== false && (d[items] || []).some(i => !was.some(x => x.id === i.id) && m[items].some(x => x.id === i.id));
      };
      if (addedOn(l) || addedOn(c)) m[flag] = true;
    });
  });
}
// Einträge je Schüler: Fehlt im Ergebnis auffällig viel, hat vermutlich ein alter Stand die Cloud ersetzt. Dann nicht still anwenden.
function mergeCountEntries(d) {
  let n = 0;
  Object.values(d.students || {}).forEach(list => (list || []).forEach(s => {
    n += 1;
    ['grades', 'attendance', 'participation', 'homework', 'studentNotes'].forEach(f => { n += (s[f] || []).length; });
  }));
  return n;
}
const MERGE_MAX_SILENT_LOSS = 30;

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
    // Hier gelöscht: Das hat man eben selbst getan. In der Cloud gelöscht, hier unverändert: lieber einmal nachfragen,
    // eine alte Sicherung oder ein altes Gerät könnte die Klasse weggenommen haben.
    if (!changed && (deletedOn === 'local' || !((keep.students || {})[g.id] || []).length)) return;
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
function finishMerge(merged, blockPool = []) {
  // Block weg, aber eine Stunde darin (Regel 12): Die Stunde wäre unsichtbar, der Block bleibt also
  const blocks = merged.settings && merged.settings.blocks;
  if (Array.isArray(blocks)) {
    new Set((merged.lessonSlots || []).map(s => s.block)).forEach(num => {
      const lost = !blocks.some(x => x.num === num) && blockPool.find(x => x.num === num);
      if (lost) blocks.push(mergeClone(lost));
    });
  }
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
  // Cloud komplett leer (auf einem anderen Gerät geleert): kein Abgleich, sondern eine bewusste Entscheidung
  if ((b.groups || []).length && (l.groups || []).length && !(c.groups || []).length) throw new MergeUnsupportedError('Die Cloud ist leer');
  mergeNormalizeMoves(b, l, c);
  const pending = [];
  mergeRestoreDeleted(b, l, c, pending);
  const merged = mergeClone(l);
  // Stundendaten hängen an slotId_Datum: Für Fragen die Stunde beim Namen nennen
  const slotName = key => {
    const slot = [...(l.lessonSlots || []), ...(c.lessonSlots || [])].find(s => s.id === String(key).slice(0, String(key).lastIndexOf('_')));
    return slot ? `Stunde ${slot.subject || ''}`.trim() : 'Stunde';
  };
  // Klassenname vor die Schüler-Fragen: students ist nach Klasse aufgeteilt
  const groupName = gid => ((l.groups || []).concat(c.groups || []).find(g => g.id === gid) || {}).className || '';
  const ctx = { conflicts: [], title: '', what: '', slotName, groupName };
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
  mergeKeepNewItemsOn(b, l, c, merged);
  mergeVerify(b, l, c, merged);
  mergeCheckReachable(b, l, c, merged);
  const lost = mergeCountEntries(l) - mergeCountEntries(merged);
  if (lost > MERGE_MAX_SILENT_LOSS && lost > mergeCountEntries(l) * 0.1) throw new MergeUnsupportedError(`Viele Einträge fehlen in der Cloud (${lost})`);
  const blockPool = [l, c, b].flatMap(d => ((d.settings || {}).blocks) || []);
  return { merged, conflicts: ctx.conflicts, blockPool };
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

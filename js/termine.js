// ▸ Termine: Datum, Schultage, Ferien, Blöcke, wann eine Stunde stattfindet
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


// ─── Default blocks ──────────────────────────────────────────────────────
const DEFAULT_BLOCKS = [
  { num: 1, label: '1. Block', start: '07:45', end: '09:15' },
  { num: 2, label: '2. Block', start: '09:45', end: '11:15' },
  { num: 3, label: '3. Block', start: '11:45', end: '13:15' },
  { num: 4, label: '4. Block', start: '13:45', end: '15:15' }
];

const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
const DAY_SHORT = ['Mo','Di','Mi','Do','Fr'];

// Blöcke des Stundenplans. `num` ist die feste Kennung, auf die Stunden verweisen (nie umnummerieren).
// Immer nach Beginn sortiert (Kopie der Liste): Ein später angelegter früher Block („0. Stunde“) steht sonst
// am Ende, und „Nächste Stunde“ übersähe ihn (BUGS R5). Die Kennungen bleiben, wie sie sind (Regel 12).
function getBlocks() {
  const b = db.settings && db.settings.blocks;
  const list = b && b.length ? [...b] : DEFAULT_BLOCKS.map(x => ({ ...x })); // Kopie: die Konstante darf nie verändert werden
  const start = x => { const m = timeToMins(x.start); return m === null ? Infinity : m; };
  return list.sort((x, y) => start(x) - start(y));
}

// ─── Week helpers ────────────────────────────────────────────────────────
function getWeekDates(offset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon … 6=Sat

  // On weekends, automatically show the upcoming school week
  const adjustedNow = new Date(now);
  if (dayOfWeek === 6) adjustedNow.setDate(now.getDate() + 2); // Sa → Mo
  if (dayOfWeek === 0) adjustedNow.setDate(now.getDate() + 1); // So → Mo

  const day = adjustedNow.getDay() || 7; // make Sun=7 for Mon-based calc
  const monday = new Date(adjustedNow);
  monday.setDate(adjustedNow.getDate() - day + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({length: 5}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
function formatDate(d) {
  // Use LOCAL date components to avoid UTC-offset day-shift bug
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// 'YYYY-MM-DD' als lokales Datum (mittags, damit Zeitzone/Sommerzeit den Tag nie verschieben)
function parseDate(dateStr) { return new Date(dateStr + 'T12:00:00'); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
// Schultage = Mo–Fr. Sa/So → folgender Montag
// Ferien und freie Tage (BUGS Y8): db.settings.holidays = [{ id, label, from, until }] (YYYY-MM-DD, einschließlich).
// Fehlt bei Altdaten; kaputte Einträge werden übergangen, nie „repariert“ (Regel 48).
function holidayAt(dateStr) {
  const list = typeof db !== 'undefined' && db && db.settings && Array.isArray(db.settings.holidays) ? db.settings.holidays : [];
  return list.find(h => h && typeof h.from === 'string' && typeof h.until === 'string' && h.from <= dateStr && dateStr <= h.until) || null;
}
// Ferientag mit einer einmaligen Stunde (Nachschreiben, Vertretung) zählt als Schultag: Sitzplan, Tagesansicht und
// Dashboard müssen ihn zeigen, sonst landeten Einträge Wochen später (Review vor dem Live-Gang, R2/R4).
function isSchoolDay(d) {
  if (d.getDay() === 0 || d.getDay() === 6) return false;
  const dateStr = formatDate(d);
  return !holidayAt(dateStr) || db.lessonSlots.some(s => isOneOffSlot(s) && s.specificDate === dateStr);
}
// Höchstens ein gutes Jahr weiter suchen: Ein Tippfehler wie „bis 9999“ ließ die Schleife sonst Millionen Tage laufen (R8)
function nextSchoolDay(d) {
  let r = new Date(d);
  for (let i = 0; i < 400 && !isSchoolDay(r); i++) r = addDays(r, 1);
  return r;
}
// n Schultage weiter (n < 0: zurück), Wochenenden werden übersprungen
function addSchoolDays(d, n) {
  let r = new Date(d);
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n), guard = 0; left > 0 && guard < 400; guard++) { r = addDays(r, step); if (isSchoolDay(r)) left--; }
  return r;
}
// Fortlaufende Wochennummer seit dem Referenz-Montag 29.12.1969 – ohne Sprung am Jahreswechsel (KW 53)
function weekIndex(dateStr) {
  const d = parseDate(dateStr);
  const dayNo = Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); // Tage seit 01.01.1970 (Do)
  return Math.floor((dayNo + 3) / 7);
}
function sameWeekParity(dateStrA, dateStrB) { return (weekIndex(dateStrA) - weekIndex(dateStrB)) % 2 === 0; }

// ─── Wann findet eine Stunde statt? ──────────────────────────────────────
function isOneOffSlot(slot) { return slot.recurring === false || slot.recurring === 'none'; }
// Kennzeichen auf Kachel, Dashboard und im Stunden-Fenster (BUGS AA3). `substitute` setzt nur „Vertretung (einmalig)“;
// alte App-Versionen kennen es nicht und sehen eine normale einmalige Stunde.
function lessonKindLabel(slot) {
  if (!slot || !isOneOffSlot(slot)) return '';
  if (slot.movedFrom) { // „nur diese Woche“ verschoben oder am selben Platz geändert (z. B. anderer Raum)
    const orig = db.lessonSlots.find(s => s.id === slot.movedFrom.slotId);
    const samePlace = orig && slot.movedFrom.date === slot.specificDate && orig.block === slot.block;
    return samePlace ? 'geändert' : 'verlegt';
  }
  return slot.substitute ? 'Vertretung' : 'einmalig';
}
// Zweiwöchig ohne Startdatum (Altdaten ohne KW) wurde schon immer jede Woche angezeigt
function isABSlot(slot) { return slot.recurring === 'biweekly' && !!slot.startDate; }
// Gültigkeitszeitraum (BUGS M7): Stundenplanwechsel „ab dieser Woche“ beendet die alte Stunde (validUntil)
// und legt eine neue an (validFrom), damit frühere Wochen samt Notizen bleiben, wie sie waren.
// Beides fehlt bei den meisten Stunden = unbegrenzt. Ältere App-Versionen kennen die Felder nicht.
function slotValidOn(slot, dateStr) {
  return (!slot.validFrom || dateStr >= slot.validFrom) && (!slot.validUntil || dateStr <= slot.validUntil);
}
function slotRangesOverlap(a, b) {
  if (a.validUntil && b.validFrom && a.validUntil < b.validFrom) return false;
  if (b.validUntil && a.validFrom && b.validUntil < a.validFrom) return false;
  return true;
}
function slotOccursOn(slot, dateStr) {
  if (slot.day !== (parseDate(dateStr).getDay() + 6) % 7) return false;
  if (!slotValidOn(slot, dateStr)) return false;
  if (isOneOffSlot(slot)) return slot.specificDate === dateStr;   // einmalige Stunden auch in den Ferien
  if (holidayAt(dateStr)) return false;                           // regelmäßige fallen in den Ferien aus (Y8)
  if (isABSlot(slot)) return sameWeekParity(dateStr, slot.startDate);
  return true;
}
function partsOverlap(p, q) {
  p = p || 'full'; q = q || 'full';
  return p === 'full' || q === 'full' || p === q;
}
// Können zwei Stunden je am selben Tag im selben Block liegen?
function slotsShareDate(a, b) {
  if (a.day !== b.day || a.block !== b.block) return false;
  if (!slotRangesOverlap(a, b)) return false;
  if (isOneOffSlot(a)) return slotOccursOn(b, a.specificDate);
  if (isOneOffSlot(b)) return slotOccursOn(a, b.specificDate);
  if (isABSlot(a) && isABSlot(b)) return sameWeekParity(a.startDate, b.startDate);
  return true;
}
// ─── Pausenaufsicht (BUGS AA4) ────────────────────────────────────────────
// db.supervisions = [{ id, day, start, end, place, recurring: 'weekly'|'biweekly'|'none', startDate?, specificDate? }]
// Aufbau wie eine Stunde, damit dieselbe Regel gilt, ob sie stattfindet (slotOccursOn: A/B-Woche, einmalig, Ferien).
function supervisionList() { return Array.isArray(db.supervisions) ? db.supervisions.filter(x => x && typeof x === 'object') : []; }
function supervisionsOn(dateStr) {
  return supervisionList().filter(x => typeof x.day === 'number' && slotOccursOn(x, dateStr))
    .sort((a, b) => (timeToMins(a.start) ?? 0) - (timeToMins(b.start) ?? 0));
}
// Nach welchem Block liegt die Aufsicht? 0 = vor dem ersten, blocks.length = nach dem letzten
function supervisionGap(sup, blocks) {
  const start = timeToMins(sup.start) ?? 0;
  return blocks.filter(b => (timeToMins(b.start) ?? Infinity) < start).length;
}
function supervisionChip(sup) {
  const chip = document.createElement('div');
  chip.className = 'tt-supervision';
  chip.setAttribute('role', 'button');
  chip.tabIndex = 0;
  chip.setAttribute('aria-label', `Aufsicht ${sup.place || ''}, ${sup.start}–${sup.end}`.replace(' ,', ','));
  chip.innerHTML = `<span class="tt-sup-title">${escHtml(sup.place || 'Aufsicht')}</span><span class="tt-sup-time">${escHtml(sup.start || '')}–${escHtml(sup.end || '')}</span>`;
  chip.addEventListener('click', () => openSupervisionForm(sup.id));
  return chip;
}
// Pausenzeilen für das Raster: { gap → true }, nur wo an einem der Tage eine Aufsicht liegt
function supervisionGapsFor(dates, blocks) {
  const gaps = new Set();
  dates.forEach(d => supervisionsOn(formatDate(d)).forEach(x => gaps.add(supervisionGap(x, blocks))));
  return gaps;
}

// Stunden an einem Datum in einem Block. Eine einmalige Stunde (Vertretung) ersetzt an ihrem Tag
// die regelmäßige Stunde im selben Platz.
function lessonsAt(dateStr, blockNum) {
  const lessons = db.lessonSlots.filter(s => s.block === blockNum && slotOccursOn(s, dateStr));
  const oneOffs = lessons.filter(isOneOffSlot);
  if (!oneOffs.length) return lessons;
  return lessons.filter(s => isOneOffSlot(s) || !oneOffs.some(o => partsOverlap(o.part, s.part)));
}

function formatDateDE(d) { return d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}); }
function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
}
function isToday(d) {
  const t = new Date();
  return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();
}
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum = date.getUTCDay()||7;
  date.setUTCDate(date.getUTCDate()+4-dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date-yearStart)/86400000)+1)/7);
}
// ─── Get all recurring slots linked to a group ────────────────────────
function getGroupSlots(groupId) {
  return db.lessonSlots.filter(s => s.groupId === groupId);
}

// ─── Incoming items (HW / Tests assigned FROM other sessions TO this date) ──
// Welche Stunden gehören zur selben Klasse? Mit Klasse: alle Stunden der Klasse; ohne Klasse (freie
// Eingabe): alle freien Stunden mit demselben Fachnamen. Dieselbe Regel für Datumsvorschläge und
// Fälligkeit, sonst landet eine HA in einer Stunde, die sie nie anzeigt (BUGS M3).
function relatedSlots(slot) {
  if (!slot) return [];
  if (slot.groupId) return getGroupSlots(slot.groupId);
  const name = (slot.subject || '').trim().toLowerCase();
  return db.lessonSlots.filter(s => !s.groupId && (s.subject || '').trim().toLowerCase() === name);
}

// ─── Find all upcoming lesson dates for this subject ─────────────────────
// If the slot is group-linked, searches ALL slots of that group (correct multi-day support).
// Otherwise falls back to subject name matching.
// Nur Stunden, die wirklich stattfinden: kein Ausfall, nicht von einer Vertretung ersetzt (BUGS M4)
function findUpcomingLessonDates(slotId, fromDateStr, maxCount = 4) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  if (!currentSlot) return [];
  const ids = new Set(relatedSlots(currentSlot).map(s => s.id));

  const results = [];
  let d = parseDate(fromDateStr);
  for (let i = 1; i <= 70 && results.length < maxCount; i++) {   // über die Sommerferien (Y8)
    d = addDays(d, 1);
    if (!isSchoolDay(d)) continue;
    const dateStr = formatDate(d);
    const hit = lessonsOnDate(dateStr).find(l => ids.has(l.slot.id) && !l.ausfall);
    if (hit) results.push({ dateStr, slotId: hit.slot.id });
  }
  return results;
}
// Letzte Stunde der Klasse vor dieser (heute früher oder an einem früheren Tag), die stattgefunden hat
function previousLessonOfGroup(groupId, dateStr, beforeMins) {
  let d = parseDate(dateStr);
  for (let i = 0; i < 70; i++, d = addDays(d, -1)) {   // auch über die Sommerferien (Y8)
    const ds = formatDate(d);
    if (i > 0 && !isSchoolDay(d)) continue;
    const hits = lessonsOnDate(ds).filter(l => l.slot.groupId === groupId && !l.ausfall
      && (i > 0 || (l.range && l.range.end <= beforeMins)));
    if (hits.length) return hits[hits.length - 1];
  }
  return null;
}
// Ein Formatierer für alle Aufrufe, Ergebnis je Datum gemerkt: Große Tabellen rufen das für jede Zelle (AU14)
const WEEKDAY_SHORT_FMT = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
const weekdayShortCache = new Map();
function formatWeekdayShort(dateStr) {
  let t = weekdayShortCache.get(dateStr);
  if (t === undefined) {
    t = WEEKDAY_SHORT_FMT.format(parseDate(dateStr));
    if (weekdayShortCache.size > 2000) weekdayShortCache.clear();
    weekdayShortCache.set(dateStr, t);
  }
  return t;
}

// ─── Unterrichtsplanung (AD3) und Klassen-Ansicht im Stundenplan (AD4) ─────
// Pro Klasse eine Themenliste (group.plan). Themen hängen nicht an Daten, sondern verteilen sich auf die
// kommenden Stunden, die wirklich stattfinden – fällt eine aus oder sind Ferien, rutscht alles weiter.
// Erledigt wird pro Stunde (doneLessons = lessonData-Schlüssel); ein Thema kann mehrere Stunden lang sein.
// Datenmodell: { id, title, lessons?: n, pinned?: 'YYYY-MM-DD', pinnedSlot?: slotId, note?, doneLessons?: [key], done?: 'YYYY-MM-DD' }
// pinnedSlot: im Stunden-Fenster eingetippt (AH54), gehört zu genau dieser Stunde des Tages; fällt sie aus, rutscht das Thema weiter.
const isDateStr = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// Halbjahr (Einstellung) und Schuljahresende (Einstellung, sonst Tag vor den nächsten Sommerferien)
function schoolYearMarks(todayStr = formatDate(new Date())) {
  const hy = isDateStr(db.settings.halfYearEnd) && db.settings.halfYearEnd >= todayStr ? db.settings.halfYearEnd : null;
  let ye = isDateStr(db.settings.schoolYearEnd) && db.settings.schoolYearEnd >= todayStr ? db.settings.schoolYearEnd : null;
  if (!ye) {
    const summer = (Array.isArray(db.settings.holidays) ? db.settings.holidays : [])
      .filter(h => h && isDateStr(h.from) && /sommer/i.test(h.label || '') && h.from > todayStr)
      .sort((a, b) => a.from.localeCompare(b.from))[0];
    if (summer) ye = formatDate(addDays(parseDate(summer.from), -1));
  }
  return { halfYearEnd: hy, yearEnd: ye };
}
// Stunden der Klasse von … bis (inkl.), zeitlich sortiert, Ausfall markiert
function groupLessons(groupId, fromStr, untilStr) {
  const out = [];
  let d = parseDate(fromStr);
  for (let i = 0; i < 400 && formatDate(d) <= untilStr; i++, d = addDays(d, 1)) {
    if (!isSchoolDay(d)) continue;
    lessonsOnDate(formatDate(d)).forEach(l => { if (l.slot.groupId === groupId) out.push(l); });
  }
  return out;
}
function schoolYearLabel(d = new Date()) { const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}/${String(y + 1).slice(-2)}`; }

function timeToMins(t) {
  const [h, m] = String(t || '').split(':').map(Number);
  return isNaN(h) ? null : h * 60 + (m || 0);
}
// Beginn/Ende einer Stunde in Minuten; halbe Blöcke teilen den Block in der Mitte
function lessonTimeRange(block, part) {
  const start = timeToMins(block.start), end = timeToMins(block.end);
  if (start === null || end === null) return null;
  const mid = Math.round((start + end) / 2);
  if (part === 'first')  return { start, end: mid };
  if (part === 'second') return { start: mid, end };
  return { start, end };
}
// Eine einzelne „Hälfte“ in einer Einzelstunde (aus der Zeit mit Doppelstunden) zählt wie eine ganze: So zeigt sie
// der Stundenplan (AA2), und so müssen Restzeit und Cockpit rechnen – sonst „noch 22 min“ statt 45 (AH3b).
// `count` = Stunden im selben Block an diesem Tag.
function lessonPartIn(block, slot, count) {
  return count === 1 && blockDuration(block) <= 50 ? 'full' : slot.part;
}
function minsToTime(m) { return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }

// Alle Stunden eines Tages in zeitlicher Reihenfolge: [{ slot, block, dateStr, range, ausfall }]
function lessonsOnDate(dateStr) {
  const partOrder = { first: 0, full: 0, second: 1 };
  const result = [];
  getBlocks().forEach(block => {
    const slots = lessonsAt(dateStr, block.num);
    slots.sort((a, b) => partOrder[a.part || 'full'] - partOrder[b.part || 'full'])
      .forEach(slot => result.push({
        slot, block, dateStr,
        range: lessonTimeRange(block, lessonPartIn(block, slot, slots.length)),
        ausfall: !!(db.lessonData[slot.id + '_' + dateStr] || {}).ausfall,
      }));
  });
  return result;
}

// Nächste Stunde, die noch nicht begonnen hat und nicht ausfällt (bis zu 3 Wochen voraus)
function findNextLesson(now) {
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const todayStr = formatDate(now);
  let d = parseDate(todayStr);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {   // 10 Wochen: auch über die Sommerferien (Y8)
    if (!isSchoolDay(d)) continue;
    const dateStr = formatDate(d);
    const hit = lessonsOnDate(dateStr).find(l =>
      !l.ausfall && (dateStr !== todayStr || (l.range && l.range.start > nowMins)));
    if (hit) return hit;
  }
  return null;
}

function lessonTitle(slot) {
  const group = slot.groupId && db.groups.find(g => g.id === slot.groupId);
  return group ? { main: group.className, sub: group.subject } : { main: slot.subject || '', sub: '' };
}
// Beginn des laufenden Halbjahrs (AJ4): Tag nach dem eingestellten Halbjahresende, wenn es schon vorbei ist,
// sonst Beginn des Schuljahrs (1. August, wie beim Laden der Ferien). Ab dann zählt ein neues Klassenziel.
function schoolYearStart(todayStr = formatDate(new Date())) {
  const d = parseDate(todayStr);
  return `${d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1}-08-01`;
}
function halfYearStart(todayStr = formatDate(new Date())) {
  const yearStart = schoolYearStart(todayStr);
  const hy = db.settings.halfYearEnd;
  return isDateStr(hy) && hy >= yearStart && hy < todayStr ? formatDate(addDays(parseDate(hy), 1)) : yearStart;
}

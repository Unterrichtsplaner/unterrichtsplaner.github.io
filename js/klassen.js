// ▸ Klassen: Übersicht, Schülerliste, Klassennotizen, „auffällig“, Fehl-Hinweise, Geburtstage
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


// Name in Listen und Tabellen, passend zur Sortierung in den Einstellungen (BUGS I12). Unescaped.
// Überschriften (Profil, Schnellbewertung) zeigen immer „Vorname Nachname“.
function studentListName(s) {
  const first = s.firstName || '', last = s.lastName || '';
  if (!last || !first) return first || last;
  return (db.settings && db.settings.studentSortOrder) === 'lastName' ? `${last}, ${first}` : `${first} ${last}`;
}

function sortStudents(studentsArr) {
  const order = (db.settings && db.settings.studentSortOrder) || 'firstName';
  return [...studentsArr].sort((a, b) => {
    if (order === 'firstName') {
      const c = (a.firstName||'').localeCompare(b.firstName||'');
      return c !== 0 ? c : (a.lastName||'').localeCompare(b.lastName||'');
    } else {
      const c = (a.lastName||'').localeCompare(b.lastName||'');
      return c !== 0 ? c : (a.firstName||'').localeCompare(b.firstName||'');
    }
  });
}

// ─── Subject Groups ───────────────────────────────────────────────────────
// Ansicht (AH12: Liste · Kacheln · Groß) und Sortierung der Klassenübersicht. Gehen mit den Daten in die Cloud
// (Wunsch 03.11.: auf allen Geräten gleich), Standard wird nie gespeichert. Unbekannte Werte (neuere App) = Standard.
const CLASSES_VIEWS = ['list', 'tiles', 'large'], CLASSES_SORTS = ['subject', 'next', 'class', 'warnings'];
const classesViewSetting = () => CLASSES_VIEWS.includes(db.settings.classesView) ? db.settings.classesView : 'tiles';
const classesSortSetting = () => CLASSES_SORTS.includes(db.settings.classesSort) ? db.settings.classesSort : 'subject';
function setClassesView(mode) {
  if (!CLASSES_VIEWS.includes(mode)) mode = 'tiles';
  if (mode !== classesViewSetting()) {
    if (mode === 'tiles') delete db.settings.classesView; else db.settings.classesView = mode;
    saveDB();
  }
  renderSubjectGroups();
}
function setClassesSort(mode) {
  if (!CLASSES_SORTS.includes(mode)) mode = 'subject';
  if (mode !== classesSortSetting()) {
    if (mode === 'subject') delete db.settings.classesSort; else db.settings.classesSort = mode;
    saveDB();
  }
  renderSubjectGroups();
}
// Klassen nach Jahrgang, dann Name (5a, 7b, 10a, Q1)
function compareClassNames(a, b) {
  const numA = parseInt(a.className) || 999, numB = parseInt(b.className) || 999;
  if (numA !== numB) return numA - numB;
  return (a.className || '').localeCompare(b.className || '') || (a.subject || '').localeCompare(b.subject || '');
}
// Laufende oder nächste Stunde der Klasse ab jetzt (bis 10 Wochen, über die Ferien)
function currentOrNextLessonOfGroup(groupId, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  let d = parseDate(todayStr);
  for (let i = 0; i < 70; i++, d = addDays(d, 1)) {
    if (!isSchoolDay(d)) continue;
    const ds = formatDate(d);
    const hit = lessonsOnDate(ds).find(l => l.slot.groupId === groupId && !l.ausfall && (ds !== todayStr || (l.range && l.range.end > nowMins)));
    if (hit) return hit;
  }
  return null;
}
// Kurzform für die Meta-Zeile („Als Nächstes“): „jetzt · bis 09:15“ / „Heute · 3. Stunde · 09:40“ / „Morgen · …“ / Datum
function nextLessonLabelHTML(l, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  if (l.dateStr === todayStr && l.range && l.range.start <= nowMins) return `jetzt · bis ${minsToTime(l.range.end)}`;
  return lessonWhenParts({ ...l, slot: { ...l.slot, room: '' } }, now).html;
}
// Wann, relativ zu heute (AH14): laufend „jetzt“ mit Restzeit, sonst „Heute · 3. Stunde · 09:40“, „Morgen · …“ oder Datum
function lessonWhenParts(l, now) {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  const room = l.slot.room ? ' · ' + escHtml(l.slot.room) : '';
  if (l.dateStr === todayStr && l.range && l.range.start <= nowMins) return { now: true, html: `${escHtml(l.block.label)}${room} · noch ${l.range.end - nowMins} Min` };
  const day = l.dateStr === todayStr ? 'Heute' : l.dateStr === formatDate(addDays(parseDate(todayStr), 1)) ? 'Morgen' : escHtml(formatWeekdayShort(l.dateStr));
  return { now: false, html: `${day} · ${escHtml(l.block.label)}${l.dateStr === todayStr && l.range ? ' · ' + minsToTime(l.range.start) : ''}${room}` };
}
// Plakette (AH14): eckig, neutral mit Symbol; „auffällig“ über watchChipHTML (AH24 f)
const classChip = (iconName, text) => `<span class="ct-chip">${icon(iconName)}${text}</span>`;
// ─── „auffällig“ ruhig, rot nur Neues (AH24 f) ───────────────────────────────
// Die Plakette ist neutral; rot ist nur der Zusatz „N neu“: Warnungen, die man seit dem letzten Hinschauen (Liste
// aufgemacht, Klasse im Dashboard aufgeklappt) nicht gesehen hat. Gesehen merkt sich nur dieses Gerät (wie „Zuletzt
// geöffnet“), nie in db. Schlimmer geworden (mehr Fehltage) = neue Kennung = wieder neu.
const WARN_SEEN_KEY = 'warnings_seen';
const warningKey = w => `${w.student.id}_${w.type}_${w.count}`;
function writeWarnSeen(seen, warnings) {
  const current = new Set(warnings.map(warningKey));   // nur Kennungen offener Warnungen behalten (bleibt klein)
  try { localStorage.setItem(WARN_SEEN_KEY, JSON.stringify([...seen].filter(k => current.has(k)))); } catch (e) { /* gesperrt: dann eben ohne Merken */ }
}
// Beim ersten Mal (nach dem Update, auf einem neuen Gerät) gilt alles Vorhandene als gesehen, sonst wäre wieder alles rot
function warnSeenSet(warnings) {
  let list = null;
  try { list = JSON.parse(localStorage.getItem(WARN_SEEN_KEY)); } catch (e) { list = null; }
  if (Array.isArray(list)) return new Set(list);
  const seen = new Set(warnings.map(warningKey));
  if (db.groups.length) writeWarnSeen(seen, warnings);   // leeres Gerät: erst nach dem Laden der Daten festlegen
  return seen;
}
function markWarningsSeen(list) {
  const all = collectWarnings();
  const seen = warnSeenSet(all);
  list.forEach(w => seen.add(warningKey(w)));
  writeWarnSeen(seen, all);
}
const warningIsNew = (w, seen) => !seen.has(warningKey(w));
// Grund in einfachen Worten; bei Noten ohne Zahl (die Liste kann am Beamer aufgehen)
const warningReason = w => w.type === 'grade' ? 'Notenstand kritisch'
  : w.type === 'absences' ? `${w.count}× unentschuldigt gefehlt` : `${w.count}× Hausaufgaben vergessen`;
function watchChipHTML(g, list, seen) {
  if (!list || !list.length) return '';
  const n = new Set(list.map(w => w.student.id)).size;
  const neu = new Set(list.filter(w => warningIsNew(w, seen)).map(w => w.student.id)).size;
  return `<button type="button" class="ct-chip is-watch" data-group="${escHtml(g.id)}" aria-haspopup="dialog"
    aria-label="${n} auffällig${neu ? `, ${neu} neu` : ''}: Namen anzeigen">${icon('alert')}${n} auffällig${neu ? `<span class="neu">${neu} neu</span>` : ''}</button>`;
}
let watchPop = null;   // { btn, groupId }
function closeWatchPop() {
  const p = document.getElementById('watch-pop');
  if (p) p.remove();
  const was = watchPop;
  watchPop = null;
  // Gesehenes verliert sein Rot erst nach dem Zumachen (in der Liste steht „neu“ noch dran)
  if (was && document.getElementById('view-classes')?.classList.contains('active')) renderSubjectGroups();
}
function openWatchPop(btn, groupId) {
  // Wechsel zu einer anderen Klasse: nur die alte Liste weg, nicht neu zeichnen – sonst gäbe es die angetippte
  // Plakette nicht mehr, und die Liste stünde oben links (AR15). Neu gezeichnet wird beim endgültigen Schließen.
  document.getElementById('watch-pop')?.remove();
  watchPop = null;
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !btn) return;
  const all = collectWarnings();
  const seen = warnSeenSet(all);
  const list = all.filter(w => w.group === g);
  if (!list.length) return;
  const pop = document.createElement('div');
  pop.id = 'watch-pop';
  pop.className = 'watch-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', `${g.className} auffällig`);
  const fill = () => {
    const open = collectWarnings().filter(w => w.group === g);
    if (!open.length) { closeWatchPop(); return; }
    pop.innerHTML = `<h3>${escHtml(g.className)} · auffällig</h3>` + open.map(w => `<div class="watch-row">
        <button type="button" class="watch-who"><b>${escHtml(studentListName(w.student))}${warningIsNew(w, seen) ? '<span class="tag-neu">neu</span>' : ''}</b><span>${warningReason(w)}</span></button>
        <button type="button" class="btn-secondary watch-ack">Erledigt</button></div>`).join('');
    pop.querySelectorAll('.watch-row').forEach((row, i) => {
      const w = open[i];
      row.querySelector('.watch-who').addEventListener('click', () => {
        closeWatchPop();
        openStudentDetailFromDashboard(w.student.id, g.id, w.type);
      });
      row.querySelector('.watch-ack').addEventListener('click', () => { acknowledgeWarning(w.student.id, w.type, w.count); fill(); });
    });
  };
  document.body.appendChild(pop);
  watchPop = { btn, groupId };
  fill();
  if (!watchPop) return;
  markWarningsSeen(list);
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 320, h = pop.offsetHeight || 200;
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
  pop.style.top = (r.bottom + 6 + h > window.innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 6) + 'px';
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!coarse) try { pop.querySelector('button').focus({ preventScroll: true }); } catch (e) { /* nicht fokussierbar */ }
}

// Große Kachel, Mitte (A+ nach der Design-Prüfung, AH14): fester Stapel wann → Thema → zuletzt → Plaketten, ohne Etiketten
function classTileDetailsHTML(g, now, watchChip = '') {
  const todayStr = formatDate(now), nowMins = now.getHours() * 60 + now.getMinutes();
  const next = currentOrNextLessonOfGroup(g.id, now);
  if (!next) return `<div class="ct-main"><div class="ct-when is-none">Keine Stunde geplant</div>${watchChip ? `<div class="ct-chips">${watchChip}</div>` : ''}</div>`;
  const when = lessonWhenParts(next, now);
  let html = `<div class="ct-when">${when.now ? '<span class="ct-now">jetzt</span>' : icon('late')}${when.html}</div>`;
  // Thema nur, wenn die Klasse überhaupt plant; geplant, aber nicht für diese Stunde: leise sagen
  if (groupPlan(g).length) {
    const a = plannedTopicOf(g.id, next, todayStr);   // auch schon abgehakt (AQ27)
    html += a ? `<div class="ct-topic">${a.done ? '✓ ' : ''}${escHtml(a.topic.title)}${a.of > 1 ? `<small>Stunde ${a.unit} von ${a.of}</small>` : ''}</div>`
      : '<div class="ct-topic is-none">Kein Thema geplant</div>';
  }
  const prev = previousLessonOfGroup(g.id, todayStr, nowMins);
  const prevTopic = prev ? firstLine((db.lessonData[lessonKeyOf(prev)] || {}).done) : '';
  if (prevTopic) html += `<div class="ct-prev">Zuletzt: ${escHtml(prevTopic)}</div>`;
  const due = dueItemsFor(next.slot.id, next.dateStr);
  const more = items => items.length > 1 ? ` (+${items.length - 1})` : '';
  const chips = [watchChip,
    due.hw.length ? classChip('homework', `HA fällig: ${escHtml(due.hw[0].text)}${more(due.hw)}`) : '',
    due.tests.length ? classChip('test', `Test: ${escHtml(due.tests[0].text)}${more(due.tests)}`) : ''].join('');
  if (chips) html += `<div class="ct-chips">${chips}</div>`;
  return `<div class="ct-main">${html}</div>`;
}
// Auf die Minute genau (Restzeit, „jetzt“): Uhr-Takt zeichnet nur neu, wenn sich die Angaben ändern (AH3: nicht unter dem Finger)
let classesClockSig = '';
function classesClockSignature(now = new Date()) {
  if (classesViewSetting() !== 'large' && classesSortSetting() !== 'next') return '';
  return db.groups.map(g => { const l = currentOrNextLessonOfGroup(g.id, now); return l ? lessonWhenParts(l, now).html : '-'; }).join('|');
}

function renderSubjectGroups() {
  const classesView = classesViewSetting(), sort = classesSortSetting();
  classesClockSig = classesClockSignature();
  const sortSel = document.getElementById('classes-sort');
  if (sortSel) sortSel.value = sort;
  document.querySelectorAll('#classes-mode button').forEach(b => {
    const on = b.dataset.mode === classesView;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const container = document.getElementById('subject-groups-container');
  if (!db.groups.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">${icon('classes')}</div>
        <div class="empty-state-title">Noch keine Klassen</div>
        <div class="empty-state-desc">Klicke auf "+ Fach/Klasse" um deine erste Klasse hinzuzufügen.</div>
      </div>`;
    return;
  }
  container.innerHTML = '';

  // Klassen als Kacheln in Klassenfarbe (AH8, vorher Zeilen AE8): Man findet eine Klasse an Farbe und großem
  // Namen wieder wie im Stundenplan. Ganze Kachel öffnet die Klasse.
  const now = new Date();
  const todayStr = formatDate(now);
  // Auffällige Schüler je Klasse (nicht quittierte Warnungen, wie im Dashboard), in allen drei Ansichten (AH24 f)
  if (watchPop) { const p = document.getElementById('watch-pop'); if (p) p.remove(); watchPop = null; }
  const warnings = collectWarnings();
  const warnSeen = warnSeenSet(warnings);
  const warnByGroup = new Map();
  warnings.forEach(w => {
    if (!warnByGroup.has(w.group.id)) warnByGroup.set(w.group.id, []);
    warnByGroup.get(w.group.id).push(w);
  });
  const warnCount = g => new Set((warnByGroup.get(g.id) || []).map(w => w.student.id)).size;
  const watchChip = g => watchChipHTML(g, warnByGroup.get(g.id), warnSeen);
  const nextByGroup = new Map();
  if (sort === 'next') db.groups.forEach(g => nextByGroup.set(g.id, currentOrNextLessonOfGroup(g.id, now)));
  const nextKey = g => { const l = nextByGroup.get(g.id); return l ? l.dateStr + String(l.range ? l.range.start : 0).padStart(4, '0') : '9'; };

  // Sortierung: nach Fach in Abschnitten (Standard), sonst eine Liste mit einer Überschrift
  let sections;
  if (sort === 'subject') {
    const bySubject = {};
    db.groups.forEach(g => { const subj = g.subject || 'Ohne Fach'; (bySubject[subj] = bySubject[subj] || []).push(g); });
    sections = Object.keys(bySubject).sort((a, b) => a.localeCompare(b)).map(subj => ({ title: subj, groups: bySubject[subj].sort(compareClassNames) }));
  } else {
    const cmp = sort === 'next' ? (a, b) => nextKey(a).localeCompare(nextKey(b)) || compareClassNames(a, b)
      : sort === 'warnings' ? (a, b) => warnCount(b) - warnCount(a) || compareClassNames(a, b)
      : compareClassNames;
    sections = [{ title: { next: 'Als Nächstes', class: 'Nach Klasse', warnings: 'Auffällige zuerst' }[sort], groups: [...db.groups].sort(cmp) }];
  }

  sections.forEach(({ title, groups: sortedGroups }) => {
    const section = document.createElement('section');
    section.className = 'subject-section';
    section.innerHTML = `<h2 class="subject-heading">${escHtml(title)}<span>${sortedGroups.length} ${sortedGroups.length === 1 ? 'Klasse' : 'Klassen'}</span></h2>`;
    const list = document.createElement('div');
    list.className = 'class-list' + (classesView === 'list' ? ' is-list' : classesView === 'large' ? ' is-large' : '');

    sortedGroups.forEach(g => {
      const students = db.students[g.id] || [];
      const gradeCount = students.flatMap(s => periodList(s.grades, viewPeriod(todayStr))).filter(gr => !isNaN(gradeNumber(gr.value))).length;
      const groupAvg = calculateGroupAverage(g.id);   // Halbjahr wie in der Klassenansicht (Y7)
      const scale = gradeScale(g);
      // Wochentage aus dem Stundenplan; Vertretungen (L9) und beendete Stunden (M7) nicht
      const linkedSlots = db.lessonSlots.filter(s => s.groupId === g.id && !isOneOffSlot(s) && (!s.validUntil || s.validUntil >= todayStr));
      const scheduledDays = [...new Set(linkedSlots.map(s => s.day))].sort();
      const days = scheduledDays.map(d => DAY_SHORT[d]).join(', ');
      // „Als Nächstes“: statt der Tage die nächste Stunde; „Auffällige zuerst“: die Anzahl dazu
      const nextL = sort === 'next' ? nextByGroup.get(g.id) : null;
      const when = sort === 'next' ? (nextL ? `<span class="cr-next">${nextLessonLabelHTML(nextL, now)}</span>` : '<span class="cr-no-schedule">keine Stunde geplant</span>')
        : (days || '<span class="cr-no-schedule">Kein Stundenplan verknüpft</span>');
      const meta = [when, gradeCount + ' Noten'].join(' · ');

      const row = document.createElement('div');
      const cNotes = activeClassNotes(g, todayStr);
      row.style.setProperty('--card-color', safeColor(g.color));
      // Der Klassenname ist der Knopf (Tastatur, VoiceOver); die ganze Fläche öffnet per Klick mit. Keine Knöpfe in einem
      // Knopf: Die Kachel selbst hatte role="button", damit war ihr Inhalt für VoiceOver stumm (AH14)
      const nameBtn = `<button type="button" class="cr-name" aria-label="${escHtml(`Klasse ${g.className} ${g.subject || ''} öffnen`.replace(/\s+/g, ' ').trim())}">${escHtml(g.className)}</button>`;
      const notesBtn = `<button class="btn-icon cr-notes-btn" title="Notizen" aria-label="Notizen ${escHtml(g.className)}" onclick="event.stopPropagation();openClassNotes(${jsArg(g.id)})">${icon('pin')}</button>`;
      const editBtn = `<button class="btn-icon" title="Bearbeiten" aria-label="${escHtml(g.className)} bearbeiten" onclick="event.stopPropagation();openEditGroup(${jsArg(g.id)})">${icon('edit')}</button>`;
      const seatingBtn = `<button class="btn-secondary cr-seating-btn" title="Sitzplan" aria-label="Sitzplan ${escHtml(g.className)}" onclick="event.stopPropagation();openSeatingForGroup(${jsArg(g.id)})">${icon('seating')}<span>Sitzplan</span></button>`;
      const metaHTML = `<div class="cr-meta"><b>${escHtml([g.subject, g.year].filter(Boolean).join(' · '))}</b><small>${meta}${classTeacherText(g) ? ` · ${escHtml(classTeacherText(g))}` : ''}${classesView === 'list' && warnCount(g) ? ' ' + watchChip(g) : ''}</small></div>`;
      const numsHTML = `<div class="cr-nums">
            <span><em>${students.length}</em> Schüler</span>
            <span><em class="cr-avg" style="--grade:${gradeColor(groupAvg, scale)}">${formatGradeAverage(groupAvg)}</em> ${scale.higherIsBetter ? 'Pkt.' : 'Ø'}</span>
          </div>`;
      const notesHTML = cNotes.length ? classNotesInlineHTML(cNotes, 'cr-notes') : '';
      const avgHTML = `<em class="cr-avg" style="--grade:${gradeColor(groupAvg, scale)}">${formatGradeAverage(groupAvg)}</em>`;
      if (classesView === 'list') {
        // Zeile wie vor AH8 (AE8): gleiche Angaben in festen Spalten untereinander
        row.className = 'class-row' + (cNotes.length ? ' has-notes' : '');
        row.innerHTML = `${nameBtn}${metaHTML}${numsHTML}${notesHTML}
          <div class="cr-btns">${notesBtn}${seatingBtn}${editBtn}</div>`;
      } else if (classesView === 'large') {
        // A+ (AH14): links nur Fach und Tage, Mitte der Stapel, rechts Schülerzahl klein und Schnitt groß
        row.className = 'class-row class-tile is-large' + (cNotes.length ? ' has-notes' : '');
        row.innerHTML = `
        <div class="cr-head">${nameBtn}${notesBtn}${editBtn}</div>
        <div class="cr-meta"><small>${escHtml([g.subject, days, classTeacherText(g)].filter(Boolean).join(' · '))}</small></div>${notesHTML}
        ${classTileDetailsHTML(g, now, watchChip(g))}
        <div class="cr-foot"><div class="ct-score"><span>${students.length} Schüler</span><span><b>${avgHTML}</b> ${scale.higherIsBetter ? 'Pkt.' : 'Ø'}</span></div>${seatingBtn}</div>`;
      } else {
        row.className = 'class-row class-tile' + (cNotes.length ? ' has-notes' : '');
        // „auffällig“ und Klassennotizen als eine Reihe gleicher Plaketten, jede mit Symbol darin (sonst unterschiedlich eingerückt)
        const noteChips = cNotes.map(n => `<span class="ct-chip cn-chip">${icon('pin')}${escHtml(n.text.trim())}${isDateStr(n.until) ? ` <small>bis ${escHtml(formatDateDE(parseDate(n.until)))}</small>` : ''}</span>`).join('');
        const chipRow = warnCount(g) || cNotes.length
          ? `<div class="ct-chips${cNotes.length ? ' cr-notes' : ''}">${watchChip(g)}${noteChips}</div>` : '';
        row.innerHTML = `
        <div class="cr-head">${nameBtn}${notesBtn}${editBtn}</div>
        ${metaHTML}${chipRow}
        <div class="cr-foot">${numsHTML}${seatingBtn}</div>`;
      }
      row.addEventListener('click', () => openGroupStudents(g.id));
      const wc = row.querySelector('.ct-chip.is-watch');   // Antippen zeigt Namen, öffnet nicht die Klasse
      if (wc) wc.addEventListener('click', e => { e.stopPropagation(); if (watchPop && watchPop.btn === wc) closeWatchPop(); else openWatchPop(wc, g.id); });
      list.appendChild(row);
    });

    section.appendChild(list);
    container.appendChild(section);
  });
}

function openAddSubjectGroup() {
  editingGroupId = null;
  document.getElementById('group-modal-title').textContent = 'Klasse + Fach hinzufügen';
  // Meist kommt die nächste Klasse mit demselben Fach im selben Schuljahr: beides von der zuletzt angelegten (BUGS AA1).
  // Skala und Gewichtung bewusst nicht: Nach einem Oberstufenkurs hätte die 7. Klasse sonst unbemerkt Punkte.
  const last = db.groups[db.groups.length - 1];
  document.getElementById('new-group-class').value = '';
  document.getElementById('new-group-subject').value = last ? last.subject || '' : '';
  document.getElementById('new-group-year').value = last ? last.year || '' : '';
  document.getElementById('new-group-teacher').value = '';
  document.getElementById('weight-schularbeit').value = '50';
  document.getElementById('new-group-scale').value = '1-6';
  selectedGroupColor = nextGroupColors(1)[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  document.getElementById('btn-delete-group').style.display = 'none';
  updateGroupClassPreview();

  openModal('modal-add-group');
  setTimeout(() => document.getElementById('new-group-class').focus(), 80);
}

// Feld „Klasse“: mehrere auf einmal, getrennt durch Komma/Semikolon/Zeile, Buchstaben-Bereiche „7a-d“ / „7a-7d“
// (BUGS AA1). Alles andere bleibt ein Name, wie er ist („Q1 Leistungskurs“, „E-Phase“).
const CLASS_RANGE_MAX = 15;
function parseClassNames(text) {
  const names = [];
  String(text || '').split(/[,;\n]+/).map(t => t.trim()).filter(Boolean).forEach(token => {
    // Nur reine Klassenbezeichnungen („7a-d“, „10A–C“) aufklappen; „Ethik 7a-d“ ist ein Kursname (R1)
    const m = token.match(/^(\d{1,2})\s*([a-z])\s*[-–—]\s*(?:\1)?\s*([a-z])$/i);
    const from = m && m[2].toLowerCase().charCodeAt(0), to = m && m[3].toLowerCase().charCodeAt(0);
    if (m && to > from && to - from < CLASS_RANGE_MAX) {
      const upper = m[2] === m[2].toUpperCase();
      for (let c = from; c <= to; c++) {
        const letter = String.fromCharCode(c);
        names.push(m[1] + (upper ? letter.toUpperCase() : letter));
      }
    } else {
      names.push(token);
    }
  });
  return [...new Set(names)];
}
// Farben für neue Klassen: zuerst die gewählte, dann noch unbenutzte, damit man sie im Stundenplan unterscheidet
function nextGroupColors(n, first = null) {
  const used = new Set(db.groups.map(g => g.color));
  const start = Math.max(0, APP_COLORS.indexOf(first));
  const ordered = APP_COLORS.map((_, i) => APP_COLORS[(start + i) % APP_COLORS.length]);
  const pool = [...(first ? [first] : []), ...ordered.filter(c => c !== first && !used.has(c)), ...ordered.filter(c => c !== first && used.has(c))];
  return Array.from({ length: n }, (_, i) => pool[i % pool.length]);
}
// Vorschau unter dem Feld und Text des Knopfs, sobald mehr als eine Klasse entsteht
function updateGroupClassPreview() {
  const names = editingGroupId ? [] : parseClassNames(document.getElementById('new-group-class').value);
  const preview = document.getElementById('group-class-preview');
  const multi = names.length > 1;
  preview.textContent = multi ? `Legt ${names.length} Klassen an: ${names.join(', ')}` : '';
  preview.classList.toggle('hidden', !multi);
  document.getElementById('btn-save-group').textContent = multi ? `${names.length} Klassen anlegen` : 'Speichern';
}

function openEditGroup(id) {
  editingGroupId = id;
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  document.getElementById('group-modal-title').textContent = 'Klasse bearbeiten';
  document.getElementById('new-group-class').value = g.className;
  document.getElementById('new-group-subject').value = g.subject;
  document.getElementById('new-group-year').value = g.year || '';
  document.getElementById('new-group-teacher').value = g.classTeacher || '';
  
  document.getElementById('weight-schularbeit').value = g.schularbeitWeight !== undefined ? g.schularbeitWeight : 50;
  document.getElementById('new-group-scale').value = gradeScale(g).id;
  
  selectedGroupColor = g.color || APP_COLORS[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  const btnDelete = document.getElementById('btn-delete-group');
  btnDelete.style.display = 'block';
  btnDelete.onclick = () => { if (deleteGroup(id)) closeModal('modal-add-group'); };   // erst fragen, dann schließen (AR12)
  updateGroupClassPreview();

  openModal('modal-add-group');
}

function editCurrentGroup() { if (currentGroupId) openEditGroup(currentGroupId); }

// Klassenlehrer/in (AH51): nur der Name. „7b Mathe“ und „7b Physik“ sind getrennte Einträge derselben Klasse,
// darum reicht einmal Eintragen: Wer im selben Schuljahr noch keinen Namen hat, bekommt ihn mit; Vorhandenes bleibt.
const classTeacherText = g => (g && g.classTeacher ? `KL ${g.classTeacher}` : '');
function sameClassGroups(className, year) {
  const name = String(className || '').trim().toLowerCase();
  return db.groups.filter(g => String(g.className || '').trim().toLowerCase() === name && (g.year || '') === (year || ''));
}
function setClassTeacher(g, name) {
  if (name) g.classTeacher = name; else delete g.classTeacher;
  if (name) sameClassGroups(g.className, g.year).forEach(o => { if (!o.classTeacher) o.classTeacher = name; });
}
function saveSubjectGroup() {
  const className = document.getElementById('new-group-class').value.trim();
  // Beim Bearbeiten nie aufteilen: „Ethik 7a-d“ ist ein Name (R1)
  const classNames = editingGroupId ? [className] : parseClassNames(className);
  const subject   = document.getElementById('new-group-subject').value.trim();
  const year      = document.getElementById('new-group-year').value.trim();
  const teacher   = document.getElementById('new-group-teacher').value.trim();
  
  const weightInput = document.getElementById('weight-schularbeit').value.trim();
  const finalSchularbeitWeight = weightInput === '' ? 50 : Number(weightInput.replace(',', '.'));
  
  if (!className || !subject) { showToast('Bitte Klasse und Fach eingeben', 'error'); return; }
  if (isNaN(finalSchularbeitWeight) || finalSchularbeitWeight < 0 || finalSchularbeitWeight > 100) {
    showToast('Gewichtung muss zwischen 0 und 100 % liegen', 'error'); return;
  }
  const gradeScaleId = gradeScale({ gradeScale: document.getElementById('new-group-scale').value }).id;
  let addedGroupsMessage = '';
  if (editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      // Skalenwechsel: vorhandene Noten bleiben, wie sie sind (keine Umrechnung) – nur nach Rückfrage
      const hasGrades = (db.students[g.id] || []).some(st => (st.grades || []).length > 0);
      if (gradeScaleId !== gradeScale(g).id && hasGrades &&
          !confirm(`Notenskala auf „${GRADE_SCALES[gradeScaleId].label}“ umstellen?\n\nDie vorhandenen Noten werden nicht umgerechnet. Schnitte und Warnungen dieser Klasse stimmen erst wieder, wenn du die Noten selbst anpasst.`)) {
        return;
      }
      Object.assign(g, { className, subject, year, color: selectedGroupColor, schularbeitWeight: finalSchularbeitWeight });
      if (gradeScaleId !== gradeScale(g).id) g.gradeScale = gradeScaleId;
      setClassTeacher(g, teacher);
      // Farbe und Fach auf alle verknüpften Stunden übertragen
      db.lessonSlots.filter(s => s.groupId === g.id).forEach(s => {
        s.color = selectedGroupColor;
        s.subject = subject;
      });
    }
  } else {
    // Mehrere auf einmal (BUGS AA1). Klasse + Fach, die es schon gibt, nicht doppelt anlegen.
    const key = (c, f) => c.trim().toLowerCase() + '|' + f.trim().toLowerCase();
    const existing = new Set(db.groups.map(g => key(g.className || '', g.subject || '')));
    const fresh = classNames.filter(c => !existing.has(key(c, subject)));
    const skipped = classNames.filter(c => existing.has(key(c, subject)));
    if (!fresh.length) {
      showToast(`${skipped.join(', ')} ${subject} gibt es schon`, 'error');
      return;
    }
    const colors = nextGroupColors(fresh.length, selectedGroupColor);
    fresh.forEach((c, i) => {
      const id = uid();
      const known = sameClassGroups(c, year).find(o => o.classTeacher);   // vor dem Anlegen: neues Fach in bekannter Klasse
      const group = { id, className: c, subject, year, color: colors[i], schularbeitWeight: finalSchularbeitWeight, gradeScale: gradeScaleId };
      db.groups.push(group);
      setClassTeacher(group, teacher || (known ? known.classTeacher : ''));
      db.students[id] = [];
    });
    addedGroupsMessage = (fresh.length > 1 ? `${fresh.length} Klassen hinzugefügt ✓` : 'Klasse hinzugefügt ✓')
      + (skipped.length ? ` (${skipped.join(', ')} gab es schon)` : '');
  }
  saveDB();
  closeModal('modal-add-group');
  renderSubjectGroups();
  renderTimetable(); // Ensure timetable updates if colors changed
  renderNav();   // Schnellzugriff mit neuem Namen/Farbe (AR11)
  if (editingGroupId && currentGroupId === editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      setClassViewHeader(g);
      refreshStudentViews(g.id); // Schnitte/Farben nach Gewichtung oder Skala, auch in der offenen Tabelle (BUGS Q4)
    }
  }
  showToast(editingGroupId ? 'Geändert ✓' : addedGroupsMessage);
  editingGroupId = null;
}

function deleteGroup(id) {
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  const studentCount = (db.students[id] || []).length;
  const slotIds = new Set(getGroupSlots(id).map(s => s.id));
  if (!confirm(`Klasse ${g.className} (${g.subject}) mit ${studentCount} Schüler(n), allen Noten/Einträgen und ${slotIds.size} Stunde(n) im Stundenplan löschen?`)) return false;
  removeGroupData(id);
  saveDB();
  if (currentSeatingGroupId === id) currentSeatingGroupId = '';
  if (currentGroupId === id || currentOverviewGroupId === id) {
    currentOverviewGroupId = null;
    goBackToSubjects();
  } else {
    renderSubjectGroups();
  }
  renderTimetable();
  renderNav();
  showToast('Klasse gelöscht');
  return true;
}

// Klasse samt Abhängigem aus db entfernen (Regel 10), ohne Rückfrage und ohne Speichern. Auch für den Schuljahreswechsel (Y6).
function removeGroupData(id) {
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  const slotIds = new Set(getGroupSlots(id).map(s => s.id));
  const shared = studentAppOf(g).access;   // Schülerseite der Klasse mit weg (AJ1, Regel 10)
  if (shared) queueShareDeletion(shared.id);
  queueStudentShares(g);                    // und die persönlichen Seiten (AJ2)
  db.groups = db.groups.filter(x => x.id !== id);
  delete db.students[id];
  // Stunden der Klasse samt ihren Stundendaten (Schlüssel '<slotId>_<Datum>') entfernen
  db.lessonSlots = db.lessonSlots.filter(s => !slotIds.has(s.id));
  Object.keys(db.lessonData || {}).forEach(key => {
    if (slotIds.has(key.slice(0, key.lastIndexOf('_')))) delete db.lessonData[key];
  });
  todosOf().forEach(t => { if (t.groupId === id) delete t.groupId; });   // Merkzettel bleibt, nur ohne Klasse (AH18)
  if (Array.isArray(db.settings.quickLinks)) {   // Schnellzugriff der Klasse mit weg (AH48)
    db.settings.quickLinks = db.settings.quickLinks.filter(l => !(l && l.groupId === id));
    if (!db.settings.quickLinks.length) delete db.settings.quickLinks;
  }
}

// ─── Class Overview (Tabelle) ─────────────────────────────────────────────
let currentOverviewGroupId = null;
let currentOverviewTab = 'grades';

function openClassOverview(groupId) {
  openGroupStudents(groupId, 'grades');
}

let currentClassDashboardTab = 'students';

function switchClassDashboardTab(tabName) {
  if (tabName === 'studentapp' && !studentAppOn()) tabName = 'students';   // Schülerapp aus: Reiter gibt es nicht (AJ1, AR13)
  currentClassDashboardTab = tabName;
  overviewRenderedKey = null;   // neu geöffnet: neueste Spalte zeigen, nicht die alte Scroll-Stelle (AH24)
  document.querySelectorAll('#view-students .tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('overview-tab-' + tabName);
  if (activeBtn) activeBtn.classList.add('active');
  
  const studentsContainer = document.getElementById('students-container');
  const overviewContent = document.getElementById('overview-content');
  const addColBtn = document.getElementById('btn-add-overview-col');
  const actionBtn = document.getElementById('btn-student-actions');
  
  if (tabName === 'plan' || tabName === 'studentapp') {   // Unterrichtsplanung (AD3), Schülerapp (AJ1)
    studentsContainer.classList.add('hidden');
    overviewContent.classList.remove('hidden');
    if (addColBtn) addColBtn.classList.add('hidden');
    if (actionBtn) actionBtn.classList.add('hidden');
    if (isStudentEditMode) toggleStudentEditMode();
    const bar = document.getElementById('mass-delete-bar');
    if (bar) bar.classList.add('hidden');
    currentOverviewTab = tabName;
    currentOverviewGroupId = currentGroupId;
    if (tabName === 'plan') renderPlanTab(); else renderStudentAppTab();
    updateClassGradesButton();
    return;
  }
  if (tabName === 'students') {
    studentsContainer.classList.remove('hidden');
    overviewContent.classList.add('hidden');
    if (addColBtn) addColBtn.classList.add('hidden');
    if (actionBtn) actionBtn.classList.remove('hidden');
    renderStudents();
  } else {
    studentsContainer.classList.add('hidden');
    overviewContent.classList.remove('hidden');
    if (addColBtn) addColBtn.classList.remove('hidden');
    if (actionBtn) actionBtn.classList.add('hidden');
    
    if (isStudentEditMode) {
      toggleStudentEditMode(); // Turn it off safely
    }
    const massDeleteBar = document.getElementById('mass-delete-bar');
    if (massDeleteBar) massDeleteBar.classList.add('hidden');
    
    currentOverviewTab = tabName;
    currentOverviewGroupId = currentGroupId;
    renderOverviewTable();
  }
  updateClassGradesButton();
}

function switchOverviewTab(tabName) {
  switchClassDashboardTab(tabName);
}

// ─── Students ─────────────────────────────────────────────────────────────
function openGroupStudents(groupId, initialTab = 'students') {
  currentGroupId = groupId;
  currentOverviewGroupId = groupId;
  if (isStudentEditMode) {
    toggleStudentEditMode(); // safely turn off
  }
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  rememberSearchRecent({ kind: 'group', groupId });   // „Zuletzt geöffnet“ in der Suche (AH19)
  hideClassGrades();   // Beamer-Schutz: jede Klasse öffnet verborgen (AH24 c)
  setClassViewHeader(g);
  switchView('students');
  updateStudentAppTabVisibility();   // Reiter „Schülerapp“ nur, wenn sie an ist (AJ1)
  updatePeriodSelect();   // Halbjahr (Y7)
  switchClassDashboardTab(initialTab);
}

// Klasse groß, Fach klein wie in Stundenplan und Klassenkarten (BUGS I13); auch nach dem Bearbeiten (L7)
function setClassViewHeader(g) {
  document.getElementById('student-view-title').textContent = g.className;
  document.getElementById('student-view-subtitle').textContent = [g.subject, g.year, classTeacherText(g)].filter(Boolean).join(' · ');
}

// Nach dem Austausch der ganzen DB (Import, „Alle Daten löschen“, Cloud-Übernahme): gemerkte Klassen
// prüfen und die offene Ansicht mit den neuen Daten zeichnen (Regel 10).
function resetViewSelection() {
  const exists = id => !!id && (db.groups || []).some(g => g.id === id);
  if (!exists(currentSeatingGroupId)) currentSeatingGroupId = '';
  if (!exists(lastSeatingGroupId)) lastSeatingGroupId = '';
  if (!exists(currentOverviewGroupId)) currentOverviewGroupId = null;
  const active = document.querySelector('.view.active');
  const name = active ? active.id.replace('view-', '') : '';
  if (name === 'students') {
    if (exists(currentGroupId)) openGroupStudents(currentGroupId, currentClassDashboardTab);
    else goBackToSubjects();
  } else if (name === 'seating' && exists(currentSeatingGroupId)) {
    // Nur neu zeichnen: initSeatingPlan schlüge wieder die Klasse der laufenden Stunde vor (BUGS S2, E1)
    renderSeatingGroupSelect(); renderSeatingDateStrip(); renderSeatingPlan();
  } else if (name) {
    switchView(name);
  }
}

function goBackToSubjects() {
  currentGroupId = null;
  switchView('classes');
  renderSubjectGroups();
}

function renderStudents() {
  hideCounterHint();  // ihr Zähler wird gleich neu gezeichnet
  const container = document.getElementById('students-container');
  const students  = db.students[currentGroupId] || [];
  if (!students.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">${icon('student')}</div>
      <div class="empty-state-title">Noch keine Schüler</div>
      <div class="empty-state-desc">Einzeln anlegen oder eine Namensliste einfügen (z. B. aus Excel).</div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;justify-content:center;margin-top:var(--space-3)">
        <button class="btn-primary" onclick="openAddStudent()">Schüler hinzufügen</button>
        <button class="btn-secondary" onclick="openImportStudentsModal()">Liste einfügen</button>
      </div>
    </div>`;
    return;
  }
  // Schlichte Liste mit Kopfzeile statt einer Karte je Schüler (BUGS AE8)
  const showGrades = classGradesShown;   // Beamer-Schutz (AH24 c): Schnitt und Mitarbeit nur auf Knopfdruck
  container.innerHTML = (showGrades ? '' : gradesVeilHTML('Schnitte und Mitarbeit sind verborgen, damit am Beamer niemand mitliest.'))
    + `<div class="students-head${showGrades ? '' : ' is-veiled'}" aria-hidden="true">${isStudentEditMode ? '<span class="students-head-cb"></span>' : ''}
    <span class="students-head-main">Name</span>${showGrades ? `<span class="students-head-part">Mitarbeit ${PART_LEVELS.map(l => l.sign).join(' / ')}</span>` : ''}
    <span class="students-head-att">Fehlt F / E</span>${showGrades ? '<span class="students-head-avg">Ø</span>' : ''}</div>`;
  wireGradesVeil(container);
  const scale = gradeScale(currentGroupId);
  const todayStr = formatDate(new Date());
  const range = viewPeriod(todayStr);   // Halbjahr (Y7)
  sortStudents(students).forEach(s => {
    const avg = calculateStudentAverage(s, currentGroupId, range);
    const att = periodList(s.attendance, range), part = periodList(s.participation, range);
    const attUnexcused = att.filter(a => a.type==='abwesend').length;
    const attExcused = att.filter(a => a.type==='entschuldigt').length;
    const partN = partCounts(part);
    const hints = {
      participation: { title: 'Mitarbeit', lines: PART_LEVELS.map((l, i) => [partN[i], l.word]) },
      attendance: { title: 'Fehltage', lines: [[attUnexcused, 'unentschuldigt', 'danger'], [attExcused, 'entschuldigt', 'success']] },
    };
    const hintText = kind => `${hints[kind].title}: ` + hints[kind].lines.map(([n, label]) => `${n} ${label}`).join(', ');

    const grades = periodList(s.grades, range);
    const row = document.createElement('div');
    row.className = 'student-row';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.setAttribute('aria-label', `Schülerakte öffnen: ${studentListName(s)}`);
    row.innerHTML = `
      ${isStudentEditMode ? `<input type="checkbox" class="student-select-cb" data-id="${escHtml(s.id)}" onclick="event.stopPropagation(); updateMassDeleteBar()" style="margin-right: var(--space-3); width: 18px; height: 18px; cursor: pointer;">` : ''}
      <div class="student-info">
        <div class="student-name">${escHtml(studentListName(s))}</div>
        <div class="student-quick-notes">${[grades.length + ' Note' + (grades.length !== 1 ? 'n' : ''),
          (s.importantNote || '').trim() ? '<span class="sq-important">Wichtig</span>' : '', (s.notes || '').trim() ? 'Hinweis' : '', birthdayInfo(s, todayStr) ? 'Geburtstag' : ''].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="student-counters">
        ${showGrades ? `<div class="student-counter" data-kind="participation" role="button" tabindex="0" title="${hintText('participation')}" aria-label="${hintText('participation')}">
          <span class="student-counter-label">Mitarbeit</span>
          ${partCountsHTML(part).replace(/ <span class="sep">\/<\/span> /g, '<span class="sep">/</span>')}
        </div>` : ''}
        <div class="student-counter" data-kind="attendance" role="button" tabindex="0" title="${hintText('attendance')}" aria-label="${hintText('attendance')}">
          <span class="student-counter-label">Fehlt</span>
          <span${attUnexcused ? ' class="n-bad"' : ''}>${attUnexcused}</span><span class="sep">/</span><span>${attExcused}</span>
        </div>
      </div>
      ${!showGrades ? '' : avg!==null
        ? `<div class="student-grade-badge" style="color:${gradeColor(avg, scale)}">${formatGradeAverage(avg)}</div>`
        : `<div class="student-grade-badge student-grade-none">–</div>`}
    `;
    row.addEventListener('click', () => openStudentDetail(s.id, showGrades ? 'grades' : 'attendance'));   // verborgen: nicht auf „Noten“ öffnen
    row.querySelectorAll('.student-counter').forEach(el => {
      el.addEventListener('click', e => { e.stopPropagation(); onStudentCounterTap(el, s.id, hints); });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openStudentDetail(s.id, el.dataset.kind); }
      });
    });
    container.appendChild(row);
  });
  updateMassDeleteBar();
}

// ─── Zähler-Erklärung in der Schülerliste (BUGS H11) ─────────────────────
// Mit Maus steht die Erklärung schon im Tooltip (title) → Klick öffnet direkt die Schülerakte.
// Auf dem iPad gibt es kein Darüberfahren → erstes Antippen zeigt eine kleine Erklärung mit Weiter-Knopf.
let counterHintAnchor = null;

function canHover() {
  return !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
}

function onStudentCounterTap(el, studentId, hints) {
  const kind = el.dataset.kind;
  if (canHover()) { hideCounterHint(); openStudentDetail(studentId, kind); return; }
  if (counterHintAnchor === el) { hideCounterHint(); return; }
  showCounterHint(el, hints[kind], () => { hideCounterHint(); openStudentDetail(studentId, kind); });
}

function showCounterHint(anchor, { title, lines }, onOpen) {
  let hint = document.getElementById('counter-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'counter-hint';
    hint.className = 'counter-hint hidden';
    hint.setAttribute('role', 'tooltip');
    hint.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(hint);
  }
  // Gleiche Farben wie im Zähler, damit man die Zuordnung sieht
  hint.innerHTML = `<div class="counter-hint-title">${escHtml(title)}</div>
    <div class="counter-hint-text">${lines.map(([n, label, color]) =>
      `<div><b style="color:var(--${color})">${n}</b> ${escHtml(label)}</div>`).join('')}</div>
    <button class="btn-secondary counter-hint-open">Einträge ansehen</button>`;
  hint.querySelector('button').onclick = onOpen;
  hint.classList.remove('hidden');
  counterHintAnchor = anchor;
  // Unter dem Zähler, aber im Fenster bleiben
  const r = anchor.getBoundingClientRect();
  const w = hint.offsetWidth || 200, h = hint.offsetHeight || 100;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
  const top = (r.bottom + 6 + h > window.innerHeight) ? Math.max(8, r.top - h - 6) : r.bottom + 6;
  hint.style.left = left + 'px';
  hint.style.top = top + 'px';
}

function hideCounterHint() {
  counterHintAnchor = null;
  const hint = document.getElementById('counter-hint');
  if (hint) hint.classList.add('hidden');
}

function openStudentActionsModal() {
  openModal('modal-student-actions');
}

function toggleStudentEditMode() {
  isStudentEditMode = !isStudentEditMode;
  
  const btn = document.getElementById('btn-student-actions');
  if (btn) {
    if (isStudentEditMode) {
      btn.innerHTML = `<span style="font-size:12px; font-weight:600; font-family:inherit; padding:0 var(--space-1);">Fertig</span>`;
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-icon');
      btn.style.width = 'auto';
      btn.title = 'Bearbeiten beenden';
      btn.setAttribute('aria-label', 'Bearbeiten beenden');
      // Change onclick so it directly exits edit mode instead of opening modal
      btn.onclick = toggleStudentEditMode;
    } else {
      // Wieder wie in index.html: Listen-Symbol (der Stift sah aus wie „Klasse bearbeiten“, BUGS U9)
      btn.innerHTML = icon('list');
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-icon');
      btn.style.width = '';
      btn.title = 'Schüler hinzufügen, importieren …';
      btn.setAttribute('aria-label', 'Schüler hinzufügen, importieren und mehr');
      btn.onclick = openStudentActionsModal;
    }
  }
  
  renderStudents();
}

function updateMassDeleteBar() {
  const checkboxes = document.querySelectorAll('.student-select-cb:checked');
  const count = checkboxes.length;
  const bar = document.getElementById('mass-delete-bar');
  if (!bar) return;
  if (count > 0) {
    bar.classList.remove('hidden');
    document.getElementById('mass-delete-count').textContent = count;
  } else {
    bar.classList.add('hidden');
  }
}

function deleteSelectedStudents() {
  const checkboxes = document.querySelectorAll('.student-select-cb:checked');
  if (checkboxes.length === 0) return;
  if (!confirm(`Möchtest du wirklich ${checkboxes.length} Schüler endgültig löschen? Alle Noten und Einträge dieser Schüler werden unwiderruflich entfernt.`)) return;
  
  const idsToDelete = new Set(Array.from(checkboxes).map(cb => cb.getAttribute('data-id')));
  const removed = db.students[currentGroupId].filter(s => idsToDelete.has(s.id));
  db.students[currentGroupId] = db.students[currentGroupId].filter(s => !idsToDelete.has(s.id));
  cleanUpDeletedStudents(currentGroupId, removed); // auch Sitzplätze (BUGS Q10)
  
  
  saveDB();
  renderStudents();
  showToast(`${checkboxes.length} Schüler gelöscht ✓`);
}

function openImportStudentsModal() {
  const select = document.getElementById('import-from-group');
  select.innerHTML = '<option value="">-- Bitte wählen --</option>';
  db.groups.forEach(g => {
    if (g.id !== currentGroupId) {
      const opt = document.createElement('option');
      opt.value = g.id;
      opt.textContent = g.subject + ' (' + g.className + ')';
      select.appendChild(opt);
    }
  });
  document.getElementById('import-text').value = '';
  openModal('modal-import-students');
}

function importStudentsFromGroup() {
  const fromId = document.getElementById('import-from-group').value;
  if (!fromId) {
    showToast('Bitte wähle eine Klasse aus', 'error');
    return;
  }
  const skipDupsCheckbox = document.getElementById('import-skip-duplicates');
  const skipDups = skipDupsCheckbox ? skipDupsCheckbox.checked : false;
  const fromStudents = db.students[fromId] || [];
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  
  // Nur gegen Schüler prüfen, die schon vorher in der Klasse waren: zwei „Lukas Meier“ sind zwei Kinder (BUGS U4)
  const before = [...db.students[currentGroupId]];
  let count = 0;
  fromStudents.forEach(s => {
    if (skipDups) {
      const exists = before.some(existing => 
        existing.firstName === s.firstName && existing.lastName === s.lastName
      );
      if (exists) return;
    }
    db.students[currentGroupId].push({
      id: uid(), firstName: s.firstName, lastName: s.lastName, notes: s.notes, ...(s.importantNote ? { importantNote: s.importantNote } : {}), ...(s.birthday ? { birthday: s.birthday } : {}), grades: [], studentNotes: [], attendance: []
    });
    count++;
  });
  saveDB();
  closeModal('modal-import-students');
  renderStudents();
  showToast(count + ' Schüler importiert ✓');
}

function importStudentsFromText() {
  const text = document.getElementById('import-text').value.trim();
  if (!text) {
    showToast('Bitte gib mindestens einen Namen ein', 'error');
    return;
  }
  const skipDupsCheckbox = document.getElementById('import-skip-duplicates');
  const skipDups = skipDupsCheckbox ? skipDupsCheckbox.checked : false;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  
  // Doppelte nur gegen Schüler prüfen, die schon vorher in der Klasse waren: zwei „Lukas Meier“ in derselben
  // Liste sind zwei Kinder (BUGS Q14)
  const before = [...db.students[currentGroupId]];
  let count = 0;
  lines.forEach(line => {
    // Aus Excel kopiert: Spalten sind durch Tabs getrennt (Vorname | Nachname), sonst letztes Wort = Nachname.
    // „Nachname, Vorname“ (übliches Format in Schullisten): vor dem Komma steht der Nachname (BUGS Q7).
    let firstName, lastName;
    if (!line.includes('\t') && line.includes(',')) {
      const [last, ...rest] = line.split(',');
      lastName = last.trim();
      firstName = rest.join(' ').trim().replace(/\s+/g, ' ');
    } else {
      // Ein einzelner Name ist der Vorname (Wunsch 09.11.: Listen tippt man meist nur mit Vornamen)
      const parts = line.includes('\t') ? line.split('\t').map(c => c.trim()).filter(c => c) : line.split(/\s+/);
      lastName = parts.length > 1 ? parts.pop() : '';
      firstName = parts.join(' ');
    }
    if (firstName || lastName) {
      if (skipDups) {
        // Voller Name: Altdaten haben einen einzelnen Namen im Nachnamen (AR20)
        const full = x => `${x.firstName || ''} ${x.lastName || ''}`.trim().replace(/\s+/g, ' ').toLowerCase();
        const exists = before.some(existing => full(existing) === full({ firstName, lastName }));
        if (exists) return;
      }
      db.students[currentGroupId].push({
        id: uid(), firstName: firstName || '', lastName: lastName, notes: '', grades: [], studentNotes: [], attendance: []
      });
      count++;
    }
  });
  saveDB();
  closeModal('modal-import-students');
  renderStudents();
  showToast(count + ' Schüler importiert ✓');
}

function setStudentHintsVeiled(veiled, n = 0) {
  document.getElementById('student-hints-fields').classList.toggle('hidden', veiled);
  const veil = document.getElementById('student-hints-veil');
  veil.classList.toggle('hidden', !veiled);
  veil.querySelector('span').textContent = `${n} ${n === 1 ? 'Hinweis' : 'Hinweise'}, am Beamer verborgen`;
}
function openAddStudent() {
  setStudentHintsVeiled(false);
  editingStudentId = null;
  document.getElementById('student-modal-title').textContent = 'Schüler hinzufügen';
  ['new-student-first','new-student-last','new-student-important','new-student-notes','new-student-birthday'].forEach(id => document.getElementById(id).value = '');
  openModal('modal-add-student');
}

function saveStudent() {
  const firstName = document.getElementById('new-student-first').value.trim();
  const lastName  = document.getElementById('new-student-last').value.trim();
  const notes     = document.getElementById('new-student-notes').value.trim();
  const important = document.getElementById('new-student-important').value.trim(); // AD17
  const birthday  = document.getElementById('new-student-birthday').value; // AD6, YYYY-MM-DD oder leer
  // Ein Name genügt: der Import erlaubt Schüler mit nur einem Namen, die müssen bearbeitbar bleiben (BUGS L8)
  if (!firstName && !lastName) { showToast('Bitte einen Namen eingeben', 'error'); return; }
  if (birthday && !validBirthday(birthday)) { showToast('Der Geburtstag kann nicht stimmen. Bitte prüfen oder das Feld leeren', 'error'); return; }
  // Bearbeiten aus dem Schüler-Fenster: dessen Klasse (kann eine andere sein als die offene Klassenansicht, AH28)
  const gid = editingStudentId && editingStudentGroupId ? editingStudentGroupId : currentGroupId;
  if (!db.students[gid]) db.students[gid] = [];
  if (editingStudentId) {
    const s = db.students[gid].find(x => x.id === editingStudentId);
    if (s) {
      const oldStudent = { firstName: s.firstName, lastName: s.lastName };
      Object.assign(s, { firstName, lastName, notes });
      setImportantNote(s, important);
      if (birthday) s.birthday = birthday; else delete s.birthday; // kein leeres Feld an alle Schüler hängen
      renameAbsenceNotes(gid, oldStudent, s);
    }
  } else {
    db.students[gid].push({ id:uid(), firstName, lastName, notes, ...(important ? { importantNote: important } : {}), ...(birthday ? { birthday } : {}), grades:[], studentNotes:[], attendance:[] });
  }
  saveDB();
  closeModal('modal-add-student');
  refreshStudentViews(gid); // auch eine offene Tabelle (BUGS Q4)
  showToast(editingStudentId ? 'Schüler geändert ✓' : 'Schüler hinzugefügt ✓');
  editingStudentId = null;
  editingStudentGroupId = null;
}
const studentName = s => [s.firstName, s.lastName].filter(Boolean).join(' ');

// ─── Geburtstage (AD6) ──────────────────────────────────────────────────────
// Nur ein Datum, das als Geburtstag eines Kindes stimmen kann: Ein Datum aus diesem oder den letzten Jahren kam vom iPad,
// das beim Antippen des leeren Feldes „heute“ einträgt (AH7). Gespeicherte Werte bleiben, sie zählen nur nicht.
function validBirthday(b) {
  if (typeof b !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b) || isNaN(parseDate(b))) return false;
  const y = +b.slice(0, 4);
  return y >= 1900 && y <= new Date().getFullYear() - 3;
}
const isLeapYear = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
// Fällt der Geburtstag auf dateStr? 29.02. zählt in anderen Jahren am 28.02.
function birthdayOn(b, dateStr) {
  const md = b.slice(5), y = +dateStr.slice(0, 4);
  return md === dateStr.slice(5) || (md === '02-29' && !isLeapYear(y) && dateStr.slice(5) === '02-28');
}
// { when: 'today' | 'past', date, age } – 'past': Geburtstag an einem freien Tag (Wochenende, Ferien) seit dem
// letzten Schultag, damit er am nächsten Schultag nicht untergeht
function birthdayInfo(s, dateStr) {
  if (!s || !validBirthday(s.birthday) || !dateStr) return null;
  const year = +dateStr.slice(0, 4), born = +s.birthday.slice(0, 4);
  const age = born > 1900 && born < year ? year - born : null;
  if (birthdayOn(s.birthday, dateStr)) return { when: 'today', date: dateStr, age };
  let d = parseDate(dateStr);
  for (let i = 1; i <= 21; i++) {   // höchstens 3 Wochen zurück (lange Ferien: danach nicht mehr erwähnen)
    d = addDays(d, -1);
    if (isSchoolDay(d)) break;
    const ds = formatDate(d);
    if (birthdayOn(s.birthday, ds)) return { when: 'past', date: ds, age: born > 1900 && born < +ds.slice(0, 4) ? +ds.slice(0, 4) - born : null };
  }
  return null;
}

// ─── Hinweis „hat letzte Stunde unentschuldigt gefehlt“ in der nächsten Stunde (BUGS E4) ─────
// Bei nur einem Namen („Max“) ohne führendes Leerzeichen, sonst findet removeAbsenceNote den Hinweis nie (BUGS L4)
function absenceNoteText(s) { return `${[s.firstName, s.lastName].filter(Boolean).join(' ')} hat letzte Stunde unentschuldigt gefehlt`; }
// Nächste Stunde der Klasse nach dateStr, die wirklich stattfindet (A/B-Woche, Vertretung, Ausfall)
const ABSENCE_NOTE_DAYS = 70;   // Hinweis eintragen und wieder finden: gleich weit, auch über die Sommerferien (Y8, AS11)
function nextLessonOfGroup(groupId, dateStr) {
  let d = parseDate(dateStr);
  for (let i = 0; i < ABSENCE_NOTE_DAYS; i++) {   // auch über die Sommerferien (Y8)
    d = addDays(d, 1);
    if (!isSchoolDay(d)) continue;
    const hit = lessonsOnDate(formatDate(d)).find(l => l.slot.groupId === groupId && !l.ausfall);
    if (hit) return { slotId: hit.slot.id, dateStr: hit.dateStr };
  }
  return null;
}
function addAbsenceNote(groupId, dateStr, s) {
  const next = nextLessonOfGroup(groupId, dateStr);
  if (!next) return;
  const key = next.slotId + '_' + next.dateStr;
  if (!db.lessonData[key]) db.lessonData[key] = {};
  const note = absenceNoteText(s);
  const lines = (db.lessonData[key].notes || '').split('\n');
  if (!lines.includes(note)) db.lessonData[key].notes = [...lines.filter(l => l.trim()), note].join('\n');
}
// Entfernt den Hinweis aus allen Stunden der Klasse in den 4 Wochen danach – so wird er auch gefunden,
// wenn sich der Stundenplan seit dem Eintragen geändert hat (Ausfall, Vertretung).
function removeAbsenceNote(groupId, dateStr, s) {
  // Fehlt ein gleichnamiger Schüler am selben Tag weiter unentschuldigt, gilt der Hinweis auch für ihn (BUGS Q10)
  const text = absenceNoteText(s);
  const twin = (db.students[groupId] || []).some(x => x !== s && absenceNoteText(x) === text
    && (x.attendance || []).some(a => a.date === dateStr && a.type === 'abwesend'));
  if (twin) return;
  // Hinweise zu anderen, weiter unentschuldigten Fehltagen (auch gleichnamiger Schüler) bleiben stehen (AS5)
  const keep = new Set();
  (db.students[groupId] || []).filter(x => absenceNoteText(x) === text).forEach(x => (x.attendance || [])
    .filter(a => a && a.type === 'abwesend' && a.date !== dateStr && isDateStr(a.date))
    .forEach(a => { const next = nextLessonOfGroup(groupId, a.date); if (next) keep.add(next.slotId + '_' + next.dateStr); }));
  replaceAbsenceNoteLines(groupId, dateStr, s, null, keep);
}
// Hinweis-Zeilen dieses Schülers in den Stunden der Klasse bis 4 Wochen nach dateStr ersetzen (newText) oder
// entfernen (null). Zeilenweise, nie per replace auf dem ganzen Text (Regel 25).
function replaceAbsenceNoteLines(groupId, dateStr, s, newText, keep = null) {
  const notes = [absenceNoteText(s)];
  // Ältere Versionen schrieben nur den Vornamen – den nur entfernen, wenn er in der Klasse eindeutig ist
  if (s.firstName && (db.students[groupId] || []).filter(x => x.firstName === s.firstName).length === 1) {
    notes.push(`${s.firstName} hat letzte Stunde unentschuldigt gefehlt`);
  }
  const slotIds = new Set(db.lessonSlots.filter(slot => slot.groupId === groupId).map(slot => slot.id));
  const until = formatDate(addDays(parseDate(dateStr), ABSENCE_NOTE_DAYS));   // so weit wie beim Eintragen (AS11)
  Object.keys(db.lessonData).forEach(key => {
    const sep = key.lastIndexOf('_');
    const slotId = key.slice(0, sep), keyDate = key.slice(sep + 1);
    if (!slotIds.has(slotId) || keyDate <= dateStr || keyDate > until || (keep && keep.has(key))) return;
    const entry = db.lessonData[key];
    if (!entry || !entry.notes) return;
    const lines = entry.notes.split('\n');
    const kept = newText === null
      ? lines.filter(l => !notes.includes(l.trim()))
      : lines.map(l => notes.includes(l.trim()) ? newText : l);
    if (kept.join('\n') !== lines.join('\n')) entry.notes = kept.join('\n').trim();
  });
}
// Schüler umbenannt: offene Hinweise auf den neuen Namen umschreiben, sonst bleiben sie beim Entfernen stehen (BUGS Q10)
function renameAbsenceNotes(groupId, oldStudent, s) {
  const newText = absenceNoteText(s);
  if (absenceNoteText(oldStudent) === newText) return;
  (s.attendance || []).filter(a => a.type === 'abwesend')
    .forEach(a => replaceAbsenceNoteLines(groupId, a.date, oldStudent, newText));
}
// Gelöschte Schüler: Hinweise, Sitzplätze und quittierte Warnungen mit aufräumen (Regel 10, BUGS Q10)
function cleanUpDeletedStudents(groupId, removed) {
  const remaining = db.students[groupId] || [];
  removed.forEach(s => (s.attendance || []).filter(a => a.type === 'abwesend')
    .forEach(a => {
      const twin = remaining.some(x => absenceNoteText(x) === absenceNoteText(s)
        && (x.attendance || []).some(b => b.date === a.date && b.type === 'abwesend'));
      if (!twin) replaceAbsenceNoteLines(groupId, a.date, s, null);
    }));
  const ids = new Set(removed.map(s => s.id));
  removed.forEach(s => { const a = studentAccessOf(s); if (a) queueShareDeletion(a.id); });   // persönliche Seite mit weg (AJ2)
  const group = db.groups.find(g => g.id === groupId);
  if (group && group.seatingPlan) group.seatingPlan = group.seatingPlan.filter(item => !ids.has(item.studentId));
  const ack = db.acknowledgedWarnings;
  if (ack) Object.keys(ack).forEach(k => { if (ids.has(k.split('_')[0])) delete ack[k]; });
}

// Nach Änderungen im Notenformular alles neu zeichnen, was gerade sichtbar ist und Noten zeigt
function refreshGradeViews(s, groupId) {
  const win = document.getElementById('modal-seating-student');
  // Nur, wenn das Fenster genau diesen Schüler zeigt: „Rückgängig“ kommt oft, wenn schon der nächste offen ist (AS3)
  if (win && !win.classList.contains('hidden') && profileGroupId === groupId && getCurrentStudent() === s) renderGradesList(s);
  refreshStudentViews(groupId);
}

// Nach jeder Änderung an Schülern einer Klasse (Noten, Anwesenheit, Mitarbeit, HA): alle offenen
// Ansichten dieser Klasse neu zeichnen, egal von wo die Änderung kam (BUGS L1).
function refreshStudentViews(groupId) {
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (active('view-students') && currentGroupId === groupId) {
    const overview = document.getElementById('overview-content');
    if (overview && !overview.classList.contains('hidden') && currentOverviewGroupId === groupId) renderOverviewTable();
    else renderStudents();
  }
  if (active('view-seating') && currentSeatingGroupId === groupId) renderSeatingPlan();
  if (active('view-dashboard')) renderDashboard();
  const lessonSlot = !document.getElementById('modal-lesson').classList.contains('hidden')
    && db.lessonSlots.find(s => s.id === activeLessonId);
  if (lessonSlot && lessonSlot.groupId === groupId) renderLessonAbsent(lessonSlot, activeLessonDate);
  // Offenes Schüler-Fenster: Zentrale, „Heute: …“ und gedrückte Knöpfe oben passend zu „Mehr“ (AS10)
  const ctx = window.currentSeatingStudent;
  if (ctx && profileGroupId === groupId && !document.getElementById('modal-seating-student').classList.contains('hidden')) {
    const cur = getCurrentStudent();
    if (cur) markSeatingStudentState(cur, ctx.dateStr);
  }
}
// ── Klassennotizen (AD15): kurze Notizen pro Klasse („schon unterrichtet“, „auf Klassenfahrt“), wahlweise „gilt bis“.
// Sichtbar in Klassenliste, Dashboard, Stundenplan (Symbol) und Stunden-Fenster – nie im Sitzplan (Beamer).
function classNotesOf(g) {
  return g && Array.isArray(g.classNotes) ? g.classNotes.filter(n => n && typeof n.text === 'string' && n.text.trim()) : [];
}
function classNoteActive(n, dateStr) { return !isDateStr(n.until) || n.until >= dateStr; }
function activeClassNotes(g, dateStr = formatDate(new Date())) {
  return classNotesOf(g).filter(n => classNoteActive(n, dateStr));
}
function classNotesInlineHTML(notes, cls) {
  return `<div class="cn-inline ${cls}">${icon('pin')}<span class="cn-inline-list">${notes.map(n =>
    `<span class="cn-chip">${escHtml(n.text.trim())}${isDateStr(n.until) ? ` <small>bis ${escHtml(formatDateDE(parseDate(n.until)))}</small>` : ''}</span>`).join('')}</span></div>`;
}
function refreshClassNoteViews() {
  const active = id => document.getElementById(id)?.classList.contains('active');
  if (active('view-classes')) renderSubjectGroups();
  if (active('view-dashboard')) renderDashboard();
  if (active('view-timetable')) renderTimetable();
  const slot = activeLessonId && db.lessonSlots.find(s => s.id === activeLessonId);
  if (slot && !document.getElementById('modal-lesson').classList.contains('hidden')) renderLessonClassNotes(slot, activeLessonDate, true);
}
// Klassennotizen im Stunden-Fenster: lesen und gleich eintragen (AH9), Ändern/Löschen/„gilt bis“ im Fenster „Notizen“.
// Wird auch bei offenem Fenster neu gezeichnet (refreshClassNoteViews): Eingetipptes bleibt stehen.
function renderLessonClassNotes(slot, dateStr, keepTyped = false) { fillLessonClassNotes(slot, dateStr, keepTyped); layoutLessonCards(); }
function fillLessonClassNotes(slot, dateStr, keepTyped) {
  const box = document.getElementById('lesson-class-notes');
  if (!box) return;
  const g = slot.groupId && db.groups.find(x => x.id === slot.groupId);
  const typed = keepTyped ? document.getElementById('lesson-class-note-input')?.value || '' : '';   // neues Fenster: leer
  box.classList.toggle('hidden', !g);
  if (!g) { box.innerHTML = ''; return; }
  const notes = activeClassNotes(g, dateStr);
  const veiled = lessonPrivateVeiled && notes.length;
  box.innerHTML = `<div class="notes-section-header"><span class="notes-section-icon">${icon('pin')}</span><span class="notes-section-label">Notiz für die Klasse</span></div>`
    + (veiled ? lessonVeilHTML(notes.length, 'Notiz', 'Notizen')
      : notes.length ? `<div class="lcn-row">${classNotesInlineHTML(notes, 'lcn-notes')}<button type="button" class="btn-secondary lcn-btn">Ändern</button></div>` : '')
    + `<div class="lcn-add"><input type="text" id="lesson-class-note-input" class="entry-input" placeholder="z. B. Buch vergessen" aria-label="Neue Notiz für die Klasse" />`
    + `<button type="button" class="btn-secondary btn-circle lcn-add-btn" aria-label="Notiz für die Klasse hinzufügen">${icon('plus')}</button></div>`;
  const input = box.querySelector('#lesson-class-note-input');
  input.value = typed;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addLessonClassNote(); } });
  box.querySelector('.lcn-add-btn').addEventListener('click', () => addLessonClassNote());
  box.querySelector('.lc-veil-btn')?.addEventListener('click', showLessonPrivate);
  const btn = box.querySelector('.lcn-btn');
  if (btn) btn.addEventListener('click', () => openClassNotes(g.id));
}
// Eingetippte Klassennotiz übernehmen (auch beim Schließen des Stunden-Fensters, storeLessonForm). Gilt ab heute.
function addLessonClassNote() {
  const input = document.getElementById('lesson-class-note-input');
  const text = input ? input.value.trim() : '';
  if (!text) return false;
  const slot = activeLessonId && db.lessonSlots.find(s => s.id === activeLessonId);
  const g = slot && slot.groupId && db.groups.find(x => x.id === slot.groupId);
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
  if (!Array.isArray(g.classNotes)) g.classNotes = [];
  g.classNotes.push({ id: uid(), text, date: formatDate(new Date()) });
  input.value = '';
  saveDB();
  refreshClassNoteViews();
  return true;
}

// ── Fenster „Notizen“ ──
let classNotesCtx = null;   // { groupId, note } – note = bearbeitete Notiz per Referenz (Regel 8), null = neue
function classNotesGroup() { return (classNotesCtx && db.groups.find(g => g.id === classNotesCtx.groupId)) || null; }
function openClassNotes(groupId) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  classNotesCtx = { groupId, note: null };
  document.getElementById('class-notes-title').textContent = 'Notizen ' + [g.className, g.subject].filter(Boolean).join(' ');
  resetClassNoteForm();
  renderClassNotesList();
  openModal('modal-class-notes');
}
function resetClassNoteForm() {
  if (classNotesCtx) classNotesCtx.note = null;
  document.getElementById('class-note-text').value = '';
  document.getElementById('class-note-until').value = '';
  document.getElementById('class-note-until').min = formatDate(new Date());
  document.getElementById('class-note-label').textContent = 'Neue Notiz';
  document.getElementById('btn-class-note-save').textContent = 'Hinzufügen';
  document.getElementById('btn-class-note-cancel').classList.add('hidden');
}
function editClassNote(note) {
  if (!classNotesCtx) return;
  // Angefangene neue Notiz erst übernehmen, sonst überschreibt das Formular sie still (AQ28, Regel 27)
  if (!classNotesCtx.note && classNoteFormDirty() && !saveClassNoteFromForm()) return;
  classNotesCtx.note = note;
  document.getElementById('class-note-text').value = note.text;
  document.getElementById('class-note-until').value = isDateStr(note.until) ? note.until : '';
  document.getElementById('class-note-label').textContent = 'Notiz ändern';
  document.getElementById('btn-class-note-save').textContent = 'Speichern';
  document.getElementById('btn-class-note-cancel').classList.remove('hidden');
  renderClassNotesList();
  document.getElementById('class-note-text').focus();
}
function cancelClassNoteEdit() { resetClassNoteForm(); renderClassNotesList(); }
function classNoteFormDirty() {
  const text = document.getElementById('class-note-text').value.trim();
  const until = document.getElementById('class-note-until').value;
  const n = classNotesCtx && classNotesCtx.note;
  return n ? (text !== n.text || until !== (isDateStr(n.until) ? n.until : '')) : !!text;
}
function saveClassNoteFromForm() {
  const g = classNotesGroup();
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
  const text = document.getElementById('class-note-text').value.trim();
  const until = document.getElementById('class-note-until').value;
  if (!text) { showToast('Bitte einen Text eingeben', 'error'); return false; }
  if (!Array.isArray(g.classNotes)) g.classNotes = [];
  const n = classNotesCtx.note;
  if (n) {
    if (!g.classNotes.includes(n)) { showToast('Diese Notiz gibt es nicht mehr (z. B. durch Sync)', 'error'); return false; }
    n.text = text;
    if (isDateStr(until)) n.until = until; else delete n.until;
  } else {
    g.classNotes.push({ id: uid(), text, date: formatDate(new Date()), ...(isDateStr(until) ? { until } : {}) });
  }
  saveDB();
  resetClassNoteForm();
  renderClassNotesList();
  refreshClassNoteViews();
  return true;
}
// Texte aus anderen Klassen zum Antippen („schon unterrichtet“ bei 18 Klassen nicht 18-mal tippen)
function classNoteSuggestions(g) {
  if (!g) return [];
  const today = formatDate(new Date());
  const own = new Set(activeClassNotes(g, today).map(n => n.text.trim().toLowerCase()));
  const seen = new Map();
  db.groups.forEach(x => {
    if (x === g) return;
    activeClassNotes(x, today).forEach(n => {
      const t = n.text.trim(), k = t.toLowerCase();
      if (own.has(k) || t.length > 40) return;
      const e = seen.get(k) || { t, count: 0, date: '', until: null };
      e.count++;
      if ((n.date || '') >= e.date) { e.date = n.date || ''; e.until = isDateStr(n.until) ? n.until : null; } // „gilt bis“ der neuesten übernehmen
      seen.set(k, e);
    });
  });
  return [...seen.values()].sort((a, b) => b.count - a.count || b.date.localeCompare(a.date)).slice(0, 4).map(e => ({ text: e.t, until: e.until }));
}
function addSuggestedClassNote({ text, until }) {
  const g = classNotesGroup();
  if (!g) { showToast('Diese Klasse gibt es nicht mehr (z. B. durch Sync)', 'error'); return; }
  if (!Array.isArray(g.classNotes)) g.classNotes = [];
  g.classNotes.push({ id: uid(), text, date: formatDate(new Date()), ...(until ? { until } : {}) });
  saveDB();
  renderClassNotesList();
  refreshClassNoteViews();
}
function deleteClassNote(note) {
  const g = classNotesGroup();
  const list = g && Array.isArray(g.classNotes) ? g.classNotes : [];
  const i = list.indexOf(note);
  if (i < 0) { renderClassNotesList(); return; }   // inzwischen weg (z. B. Sync): nichts löschen
  list.splice(i, 1);
  if (classNotesCtx.note === note) resetClassNoteForm();
  saveDB();
  renderClassNotesList();
  refreshClassNoteViews();
  const gid = g.id;
  showUndoToast('Notiz gelöscht', () => {
    const gg = db.groups.find(x => x.id === gid);
    if (!gg) return;
    if (!Array.isArray(gg.classNotes)) gg.classNotes = [];
    if (gg.classNotes.some(n => n.id === note.id)) return;
    gg.classNotes.splice(Math.min(i, gg.classNotes.length), 0, note);
    saveDB();
    refreshClassNoteViews();
    if (classNotesCtx && classNotesCtx.groupId === gid && !document.getElementById('modal-class-notes').classList.contains('hidden')) renderClassNotesList();
  });
}
function renderClassNotesList() {
  const box = document.getElementById('class-notes-list');
  const g = classNotesGroup();
  const today = formatDate(new Date());
  const notes = classNotesOf(g);
  const current = notes.filter(n => classNoteActive(n, today));
  const expired = notes.filter(n => !classNoteActive(n, today));
  const editing = classNotesCtx && classNotesCtx.note;
  const item = (n, isExp) => `<li class="cn-item${isExp ? ' is-expired' : ''}${editing === n ? ' is-editing' : ''}">
      <button type="button" class="cn-text" aria-label="Notiz ändern: ${escHtml(n.text)}"><span>${escHtml(n.text)}</span>${isDateStr(n.until)
        ? `<small>${isExp ? 'galt' : 'gilt'} bis ${escHtml(formatDateLong(n.until))}</small>` : ''}</button>
      <button type="button" class="btn-icon cn-del" title="Löschen" aria-label="Notiz löschen: ${escHtml(n.text)}">${icon('trash')}</button></li>`;
  box.innerHTML = (current.length ? `<ul class="cn-list">${current.map(n => item(n, false)).join('')}</ul>` : '<p class="cn-empty">Noch keine Notiz.</p>')
    + (expired.length ? `<p class="cn-sub">Abgelaufen</p><ul class="cn-list">${expired.map(n => item(n, true)).join('')}</ul>` : '');
  const all = [...current, ...expired];
  box.querySelectorAll('.cn-item').forEach((li, i) => {
    li.querySelector('.cn-text').addEventListener('click', () => editClassNote(all[i]));
    li.querySelector('.cn-del').addEventListener('click', () => deleteClassNote(all[i]));
  });
  const sugBox = document.getElementById('class-note-suggestions');
  const sugg = classNoteSuggestions(g);
  sugBox.innerHTML = sugg.length ? '<span class="cn-sugg-label">Aus anderen Klassen:</span>'
    + sugg.map(x => `<button type="button" class="cn-suggest">${icon('plus')}${escHtml(x.text)}${x.until ? ` <small>bis ${escHtml(formatDateDE(parseDate(x.until)))}</small>` : ''}</button>`).join('') : '';
  sugBox.classList.toggle('hidden', !sugg.length);
  sugBox.querySelectorAll('.cn-suggest').forEach((b, i) => b.addEventListener('click', () => addSuggestedClassNote(sugg[i])));
}
// Schließen (✕, Fertig, Escape, daneben tippen): Eingetipptes übernehmen statt verwerfen (Regel 27)
function closeClassNotes() {
  if (classNotesCtx && classNoteFormDirty() && document.getElementById('class-note-text').value.trim()) saveClassNoteFromForm();
  closeModal('modal-class-notes');
  classNotesCtx = null;
}

// Welche Einträge eine quittierte Warnung meinte. Nur die Anzahl zu merken reichte nicht: Eintrag gelöscht und
// neuer angelegt = gleiche Anzahl, die neue Fehlzeit blieb unsichtbar (BUGS R14).
// Warnungen zählen das laufende Halbjahr (Y7). Was quittiert wurde, merkt sich db unter `<id>_<art>`; im 2. Halbjahr
// unter eigenem Namen, sonst hielte der höhere Stand aus dem 1. Halbjahr neue Warnungen zurück. Im 1. Halbjahr und
// ohne Stichtag bleibt der alte Name, damit Quittiertes gültig bleibt (auch für ältere App-Versionen).
function warningAckBase(studentId, type, range = runningHalf()) {
  return `${studentId}_${type}` + (range && range.key === 'h2' ? `_h2-${range.from}` : '');
}
function warningSignature(s, type, range = runningHalf()) {
  const parts = type === 'absences' ? periodList(s.attendance, range).filter(a => a.type === 'abwesend').map(a => a.date)
    : type === 'homework' ? periodList(s.homework, range).map(h => h.date + '|' + (h.note || ''))
    : periodList(s.grades, range).map(g => (g.date || '') + '|' + g.value);
  const str = parts.sort().join(';');
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
// Noch quittiert? Anzahl nicht gestiegen und (falls gemerkt) dieselben Einträge
// Quittung aus einem früheren Schuljahr gilt nicht mehr (AR2): Der Name im 1. Halbjahr hat kein Schuljahr
function warningAckFresh(ack, base) {
  const at = ack[`${base}_at`];
  return !isDateStr(at) || schoolYearStart(at) === schoolYearStart();
}
function warningAcknowledged(ack, s, type, count) {
  const base = warningAckBase(s.id, type);
  if (!warningAckFresh(ack, base)) return false;
  const n = ack[base];
  if (!(count <= (n || 0))) return false;
  // Weniger als beim Quittieren (z. B. ein Fehltag nachträglich entschuldigt): Es ist besser geworden (BUGS U6)
  if (type !== 'grade' && count < n) return true;
  const sig = ack[`${base}_sig`];
  return !sig || sig === warningSignature(s, type);
}

function collectWarnings() {
  const ack = db.acknowledgedWarnings || {};
  const warnAbsences = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  const warnHomework = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  const warnGrade    = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  const warnPoints   = db.settings.warnPoints !== undefined ? db.settings.warnPoints : 5; // Oberstufe: unter x Punkten
  const warnings = [];

  const range = runningHalf();   // laufendes Halbjahr (Y7)
  db.groups.forEach(group => {
    (db.students[group.id] || []).forEach(s => {
      const name = `${escHtml(s.firstName)} ${escHtml(s.lastName)}`;
      const unexcused = periodList(s.attendance, range).filter(a => a.type === 'abwesend').length;
      if (warnAbsences > 0 && unexcused >= warnAbsences && !warningAcknowledged(ack, s, 'absences', unexcused)) {
        warnings.push({ student: s, group, type: 'absences', count: unexcused,
          title: 'Zu viele unentschuldigte Fehlzeiten', desc: `${name} hat ${unexcused === 1 ? 'eine unentschuldigte Fehlzeit' : unexcused + ' unentschuldigte Fehlzeiten'}.` });
      }
      const hwCount = periodList(s.homework, range).length;
      if (warnHomework > 0 && hwCount >= warnHomework && !warningAcknowledged(ack, s, 'homework', hwCount)) {
        warnings.push({ student: s, group, type: 'homework', count: hwCount,
          title: 'Oft Hausaufgaben vergessen', desc: `${name} hat ${hwCount === 1 ? 'einmal' : hwCount + '-mal'} die Hausaufgaben vergessen.` });
      }
      const grades = periodList(s.grades, range);
      if (grades.length > 0) {
        const avg = calculateStudentAverage(s, group.id, range);
        const points = gradeScale(group).higherIsBetter;
        const critical = avg !== null && (points ? warnPoints > 0 && avg < warnPoints : warnGrade > 0 && avg >= warnGrade);
        // Quittiert und seitdem nicht schlechter geworden (z. B. Note zum Besseren korrigiert): bleibt quittiert (BUGS U6)
        const ackAvg = ack[`${warningAckBase(s.id, 'grade', range)}_avg`];
        const notWorse = ack[warningAckBase(s.id, 'grade', range)] !== undefined && typeof ackAvg === 'number'
          && warningAckFresh(ack, warningAckBase(s.id, 'grade', range))
          && (points ? avg >= ackAvg : avg <= ackAvg);
        if (critical && !notWorse && !warningAcknowledged(ack, s, 'grade', grades.length)) {
          warnings.push({ student: s, group, type: 'grade', count: grades.length, avg,   // avg nur intern, nie angezeigt (AS8)
            title: 'Kritischer Notenstand',
            desc: `${name}: Notenstand kritisch.` });   // nie die Zahl: das Dashboard kann am Beamer offen sein (AS8, Regel 78)
        }
      }
    });
  });
  return warnings;
}

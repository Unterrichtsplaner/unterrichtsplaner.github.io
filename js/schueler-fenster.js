// ▸ Schüler-Fenster: Schülerzentrale, schnelle Note, Profil-Listen
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


// ─── Student Detail ───────────────────────────────────────────────────────
// Profil = Schüler-Fenster mit aufgeklapptem „Mehr zu …“ (AH28; früher eigenes Fenster mit Reitern). Gehört zur
// Klasse der Klassenansicht; Datum oben = heute bzw. letzter Schultag.
function openStudentDetail(studentId, initialTab = 'grades') {
  if (!(db.students[currentGroupId] || []).some(x => x.id === studentId)) return;
  rememberSearchRecent({ kind: 'student', groupId: currentGroupId, studentId });   // AH19
  openSeatingStudentModal(studentId, currentGroupId, profileDefaultDate(), { more: true, focus: initialTab });
}
// Alle Listen im offenen Schülerprofil neu zeichnen (z. B. nach „Rückgängig“)
function renderStudentDetailLists(s) {
  renderStudentAppSection(s);   // Schülerapp Stufe 2a (AJ2)
  renderGradesList(s);
  renderStudentNotesList(s);
  renderAttendanceList(s);
  renderStudentParticipationList(s);
  renderStudentHomeworkList(s);
}
function refreshOpenProfile(s) {
  if (document.getElementById('modal-seating-student').classList.contains('hidden')) return;
  const cur = getCurrentStudent();
  if (cur && cur === s) renderStudentDetailLists(s);
}
// Datumsfelder im Profil: heute, am Wochenende der letzte Schultag – meist trägt man für den Tag selbst ein
function profileDefaultDate(now = new Date()) {
  return formatDate(isSchoolDay(now) ? now : addSchoolDays(now, -1));
}
function resetProfileDates() {
  const d = profileDefaultDate();
  ['new-att-date', 'new-hw-student-date', 'new-student-note-date'].forEach(id => { document.getElementById(id).value = d; });
}

// Früher Reiter im Profil; heute springt es zum Abschnitt unter „Mehr zu …“ (AH28)
function switchStudentTab(tab) {
  setSeatingStudentMore(true);
  const more = document.getElementById('sw-more');
  if (more) more.dataset.focus = tab;
  const sec = document.getElementById('sw-sec-' + tab);
  if (sec && sec.scrollIntoView) try { sec.scrollIntoView({ block: 'start' }); } catch (e) { /* jsdom */ }
}

function openGradeFormForCurrentStudentDetailed() {
  const s = getCurrentStudent();
  if (!s) return;
  refreshSeatingStudentDay();   // über Nacht offen (AS2)
  const ctx = window.currentSeatingStudent;
  openGradeForm(s.id, profileGroupId, -1, (ctx && ctx.studentId === s.id && ctx.dateStr) || '');   // Tag oben im Fenster (AR6, N7)
}

function getCurrentStudent() { return (db.students[profileGroupId]||[]).find(x => x.id === currentStudentId); }

function renderGradesList(s) {
  const range = viewPeriod();   // Halbjahr wie in der Klassenansicht (Y7)
  const grades = periodList(s.grades, range);
  const scale = gradeScale(profileGroupId);
  const summary = document.getElementById('grades-summary');
  if (!grades.length) {
    summary.innerHTML = `<span style="color:var(--text-muted);font-size:13px">${range ? `Keine Noten im ${PERIOD_NAMES[range.key]}.` : 'Noch keine Noten.'}</span>`;
  } else {
    const byType = {};
    grades.forEach(g => {
      const v = gradeNumber(g.value);
      if (isNaN(v)) return;
      if (!byType[g.type]) byType[g.type]=[];
      byType[g.type].push(v);
    });
    const rawAvg = calculateStudentAverage(s, profileGroupId, range);
    summary.innerHTML = `
      <div class="grade-summary-item" style="margin-right:var(--space-4)">
        <div class="grade-avg-display" style="color:${gradeColor(rawAvg, scale)}">${formatGradeAverage(rawAvg)}</div>
        <div class="grade-avg-label">${range ? `Ø ${PERIOD_NAMES[range.key]}` : scale.higherIsBetter ? 'Ø Punkte' : 'Ø Gesamt'}</div>
      </div>
      ${Object.entries(byType).map(([type,vals]) => {
        const ta = vals.reduce((a,b)=>a+b,0)/vals.length;
        return `<div class="grade-summary-item">
          <div style="font-size:14px;font-weight:700;color:${gradeColor(ta, scale)}">${formatGradeAverage(ta)}</div>
          <div class="grade-avg-label">${escHtml(gradeTypeName(type))} (${vals.length})</div>
        </div>`;
      }).join('')}`;
  }
  const list = document.getElementById('grades-list');
  list.innerHTML = '';
  if (!grades.length) { list.innerHTML='<div class="entry-empty">Noten erscheinen hier.</div>'; return; }
  [...grades].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach((g,i) => {
    const color = gradeColor(gradeNumber(g.value), scale);
    const el = document.createElement('div');
    el.className = 'grade-item';
    el.style.cursor = 'pointer';
    el.title = 'Klicken zum Bearbeiten';
    // Beim Antippen per Referenz im aktuellen Stand suchen: Ist die DB inzwischen ersetzt (Import, Cloud), stimmt ein
    // beim Zeichnen gemerkter Index nicht mehr und öffnete eine andere Note (BUGS Q5, Regel 9)
    el.onclick = () => {
      const cur = getCurrentStudent();
      const idx = cur && cur.id === s.id ? (cur.grades || []).indexOf(g) : -1;
      if (idx === -1) {
        showToast('Die Liste war veraltet und wurde neu geladen. Bitte noch einmal tippen', 'error');
        if (cur) renderGradesList(cur);
        return;
      }
      openGradeForm(s.id, profileGroupId, idx);
    };
    el.innerHTML = `
      <div class="grade-value" style="color:${color}">${escHtml(gradeText(g.value))}</div>
      <div class="grade-type-badge">${escHtml(gradeTypeName(g.type))}</div>
      <div class="grade-label">${escHtml(g.note||'')}</div>
      <div class="grade-date">${g.date ? formatDateShort(g.date) : ''}</div>
      <div style="color:var(--text-muted); font-size:16px;">✎</div>`;
    list.appendChild(el);
  });
}


function renderStudentNotesList(s) {
  const notes = s.studentNotes||[];
  const list  = document.getElementById('student-notes-list');
  list.innerHTML = '';
  if (!notes.length) { list.innerHTML='<div class="entry-empty">Noch keine Anmerkungen.</div>'; return; }
  [...notes].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(n => {
    list.appendChild(createEntryItem(n.text, n.date, () => deleteStudentNote(n)));
  });
}

// Löscht per Objekt-Referenz (die Anzeige ist sortiert, das Original nicht). Nach einem Sync ist die
// Referenz nicht mehr in der Liste → es wird nichts gelöscht.
function deleteStudentNote(note) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.studentNotes||[]).indexOf(note);
  if (idx === -1) { renderStudentNotesList(s); return; }
  s.studentNotes.splice(idx,1); saveDB(); renderStudentNotesList(s); refreshStudentViews(profileGroupId);   // Notizzettel auf der Karte (AS10)
  offerProfileUndo('Anmerkung gelöscht', s, 'studentNotes', note);
}
// Ein Tipp aufs ✕ löscht sofort – deshalb „Rückgängig“ wie im Sitzplan (BUGS U3, Regel 45)
function offerProfileUndo(msg, s, list, entry, after) {
  const groupId = profileGroupId;
  showUndoToast(msg, () => restoreSeatingEntry(groupId, s, list, entry, after));
}

function addStudentNote() {
  const text = document.getElementById('new-student-note-text').value.trim();
  const date = document.getElementById('new-student-note-date').value;
  if (!text) return;
  const s = getCurrentStudent(); if (!s) return;
  if (!s.studentNotes) s.studentNotes=[];
  s.studentNotes.push({ text, date: date||formatDate(new Date()) });
  saveDB(); renderStudentNotesList(s); refreshStudentViews(profileGroupId);
  document.getElementById('new-student-note-text').value='';
  document.getElementById('new-student-note-date').value=profileDefaultDate();
}

function renderAttendanceList(s) {
  const att  = periodList(s.attendance, viewPeriod());   // Halbjahr (Y7)
  const list = document.getElementById('attendance-list');
  list.innerHTML='';
  if (!att.length) { list.innerHTML='<div class="entry-empty">Keine Einträge.</div>'; return; }
  // Wie in Tabelle und Auswahl: „Unentschuldigt“, „Entschuldigt“ grün, „Zu spät“ (BUGS U10)
  const typeColors = { abwesend:'var(--danger)', entschuldigt:'var(--success)', 'zuspät':'var(--warning)' };
  const typeNames = { abwesend:'Unentschuldigt', entschuldigt:'Entschuldigt', 'zuspät':'Zu spät' };
  [...att].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach(a => {
    const el = document.createElement('div');
    el.className='entry-item';
    el.innerHTML=`
      <span style="color:${typeColors[a.type]||'inherit'};font-weight:600;min-width:86px;font-size:12px">${escHtml(typeNames[a.type] || a.type)}</span>
      <span class="entry-item-text">${escHtml(a.note||'')}</span>
      <span class="entry-item-date">${a.date?formatDateShort(a.date):''}</span>
      <button class="entry-item-delete" aria-label="Löschen">✕</button>`;
    el.querySelector('.entry-item-delete').onclick = () => deleteAttendance(a);
    list.appendChild(el);
  });
}

function addAttendanceEntry() {
  const date = document.getElementById('new-att-date').value;
  const type = document.getElementById('new-att-type').value;
  const note = document.getElementById('new-att-note').value.trim();
  if (!date) { showToast('Bitte Datum wählen', 'error'); return; }
  const s = getCurrentStudent(); if (!s) return;
  if (!s.attendance) s.attendance=[];
  // Fehlen, entschuldigt und „zu spät“ schließen sich am selben Tag aus. Ein nachgetragener Grund („Attest“)
  // ersetzt das „Unentschuldigt“ aus dem Sitzplan, statt einen zweiten Eintrag anzulegen (BUGS Q2).
  const existing = s.attendance.find(a => a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  const wasUnexcused = !!existing && existing.type === 'abwesend';
  if (existing) {
    existing.type = type;
    if (note) existing.note = note;
  } else {
    s.attendance.push({ id: uid(), date, type, note });
  }
  if (wasUnexcused && type !== 'abwesend') removeAbsenceNote(profileGroupId, date, s);
  if (!wasUnexcused && type === 'abwesend') addAbsenceNote(profileGroupId, date, s); // wie im Sitzplan (BUGS L3, Regel 25)
  saveDB(); revealPeriodOf(date); renderAttendanceList(s); refreshStudentViews(profileGroupId);   // AR7
  if (existing) showToast('Eintrag vom ' + formatDateShort(date) + ' geändert');
  document.getElementById('new-att-date').value=profileDefaultDate();
  document.getElementById('new-att-note').value='';
}

function deleteAttendance(a) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.attendance||[]).indexOf(a);
  if (idx === -1) { renderAttendanceList(s); return; }
  // Schülerdetail gehört zu profileGroupId (getCurrentStudent), nicht zur Klassenübersicht
  const groupId = profileGroupId;
  if (a.type === 'abwesend') removeAbsenceNote(groupId, a.date, s);
  s.attendance.splice(idx,1); saveDB(); renderAttendanceList(s); refreshStudentViews(groupId);
  offerProfileUndo('Fehlzeit gelöscht', s, 'attendance', a, a.type === 'abwesend' ? () => addAbsenceNote(groupId, a.date, s) : null);
}

function renderStudentParticipationList(s) {
  const pList = periodList(s.participation, viewPeriod());   // Halbjahr (Y7)
  const list = document.getElementById('participation-list');
  if (!list) return;
  list.innerHTML = '';
  if (!pList.length) { list.innerHTML = '<div class="entry-empty">Keine Einträge.</div>'; return; }
  // Gesichter wie überall (Sitzplan, Tabelle), statt „Hervorragende/Moderate Mitarbeit“ (AH28)
  [...pList].sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach(p => {
    const el = document.createElement('div');
    el.className = 'entry-item';
    el.innerHTML = `
      <span class="entry-face" role="img" aria-label="${escHtml(partLevel(p.value)?.word || 'Mitarbeit')}">${partSignHTML(p.value)}</span>
      <span class="entry-item-text">${p.label ? escHtml(p.label) : ''}</span>
      <span class="entry-item-date">${p.date ? formatDateShort(p.date) : ''}</span>
      <button class="entry-item-delete" aria-label="Löschen">✕</button>`;
    el.querySelector('.entry-item-delete').onclick = () => deleteParticipation(p);
    list.appendChild(el);
  });
}

function deleteParticipation(p) {
  const s = getCurrentStudent(); if (!s) return;
  const idx = (s.participation||[]).indexOf(p);
  if (idx === -1) { renderStudentParticipationList(s); return; }
  s.participation.splice(idx, 1); saveDB(); renderStudentParticipationList(s); refreshStudentViews(profileGroupId);
  offerProfileUndo('Mitarbeit gelöscht', s, 'participation', p);
}

function renderStudentHomeworkList(s) {
  const list = document.getElementById('student-homework-list');
  if (!list) return;
  // Die Bemerkung ist der Spaltentitel in der HA-Tabelle: vorhandene Titel vorschlagen (BUGS Q15)
  const titles = document.getElementById('hw-column-titles');
  if (titles) {
    const group = db.groups.find(g => g.id === profileGroupId);
    const labels = new Set([...(group && group.homeworkEvents || []).map(e => e.label || ''),
      ...(db.students[profileGroupId] || []).flatMap(st => (st.homework || []).map(h => h.note || ''))]);
    labels.delete('');
    titles.innerHTML = [...labels].sort().map(l => `<option value="${escHtml(l)}"></option>`).join('');
  }
  const hw = periodList(s.homework, viewPeriod());   // Halbjahr (Y7)
  if (!hw.length) {
    list.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Keine Hausaufgaben vergessen.</span>';
    return;
  }
  const sorted = [...hw].sort((a,b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.map((h) => {
    return `<div class="entry-item">
      <div class="entry-date-badge">${formatDateLong(h.date)}</div>
      <div style="flex:1; margin-left:var(--space-3);">
        <div style="font-weight:600; color:var(--warning); font-size:14px;">Hausaufgabe vergessen</div>
        ${h.note ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${escHtml(h.note)}</div>` : ''}
      </div>
      <button class="btn-icon btn-danger-icon" aria-label="Löschen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;
  }).join('');
  // Per Closure mit dem Eintrag, nicht per Inline-Handler (Regel 9)
  list.querySelectorAll('.btn-danger-icon').forEach((btn, i) => { btn.onclick = () => deleteStudentHomework(sorted[i].id); });
}

function addStudentHomework() {
  const date = document.getElementById('new-hw-student-date').value;
  const note = document.getElementById('new-hw-student-note').value.trim();
  if (!date) { showToast('Bitte Datum wählen', 'error'); return; }
  const s = getCurrentStudent(); if (!s) return;
  if (!s.homework) s.homework = [];
  // Gleicher Tag + gleiche Spalte gibt es schon (z. B. im Sitzplan eingetragen): sonst zählte er doppelt (BUGS U1)
  if (s.homework.some(h => h.date === date && (h.note || '') === note)) {
    showToast('Für den ' + formatDateShort(date) + ' ist das schon eingetragen', 'error');
    return;
  }
  s.homework.push({ id: uid(), date: date, note: note });
  saveDB();
  revealPeriodOf(date);   // AR7
  renderStudentHomeworkList(s);
  refreshStudentViews(profileGroupId);
  document.getElementById('new-hw-student-date').value = profileDefaultDate();
  document.getElementById('new-hw-student-note').value = '';
}

function deleteStudentHomework(id) {
  const s = getCurrentStudent(); if (!s) return;
  const entry = (s.homework || []).find(h => h.id === id);
  if (!entry) { renderStudentHomeworkList(s); return; }
  s.homework.splice(s.homework.indexOf(entry), 1);
  saveDB();
  renderStudentHomeworkList(s);
  refreshStudentViews(profileGroupId);
  offerProfileUndo('Eintrag gelöscht', s, 'homework', entry);
}

function deleteCurrentStudent() {
  if (!confirm('Schüler wirklich löschen?')) return;
  const removed = (db.students[profileGroupId]||[]).filter(s=>s.id===currentStudentId);
  db.students[profileGroupId]=(db.students[profileGroupId]||[]).filter(s=>s.id!==currentStudentId);
  cleanUpDeletedStudents(profileGroupId, removed);
  saveDB(); closeModal('modal-seating-student'); refreshStudentViews(profileGroupId); renderSubjectGroups();
  showToast('Schüler gelöscht');
}

function openEditStudent() {
  const s = getCurrentStudent(); if (!s) return;
  editingStudentId = s.id;
  document.getElementById('student-modal-title').textContent = 'Schüler bearbeiten';
  document.getElementById('new-student-first').value = s.firstName;
  document.getElementById('new-student-last').value  = s.lastName;
  document.getElementById('new-student-notes').value = s.notes||'';
  document.getElementById('new-student-important').value = s.importantNote||'';
  document.getElementById('new-student-birthday').value = validBirthday(s.birthday) ? s.birthday : '';
  editingStudentGroupId = profileGroupId;
  // Hinweise nur, wenn sie im Schüler-Fenster schon eingeblendet waren (AS9, Regel 67); die Felder behalten ihren Wert
  const n = [s.importantNote, s.notes].filter(x => String(x || '').trim()).length;
  setStudentHintsVeiled(n > 0 && !swShown, n);
  closeModal('modal-seating-student');
  openModal('modal-add-student');
}

// Dateien mit Schülerdaten sind unverschlüsselt (Regel 70): vor dem Herunterladen darauf hinweisen (AU3)
async function confirmUnencryptedFile(what) {
  return (await askChoice('Datei mit Schülerdaten', `${what} enthält Schülerdaten unverschlüsselt. Sicher aufbewahren, nicht über private Mail verschicken.`,
    [{ label: 'Herunterladen', value: 'ok', primary: true }])) === 'ok';
}
async function exportCurrentStudent() {
  const s = getCurrentStudent();
  if (!s) return;
  if (!(await confirmUnencryptedFile('Die Schülerakte (mit Hinweisen und Notizen)'))) return;
  if (getCurrentStudent() !== s) return;   // inzwischen anderer Schüler oder neuer Stand (Regel 43)
  exportCurrentStudentFile();
}
function exportCurrentStudentFile() {
  const s = getCurrentStudent();
  if (!s) return;
  // Das Profil gehört zu profileGroupId (getCurrentStudent), nicht zur zuletzt geöffneten Tabelle
  const group = db.groups.find(g => g.id === profileGroupId);
  const subjName = group ? (group.subject + ' ' + group.className) : 'Unbekannte Klasse';
  const points = gradeScale(group).higherIsBetter;
  
  let txt = `SCHÜLERAKTE: ${s.firstName} ${s.lastName}\n`;
  txt += `Klasse/Fach: ${subjName}\n`;
  txt += `Exportiert am: ${new Date().toLocaleDateString('de-DE')}\n`;
  txt += `=================================================\n\n`;
  
  if (s.importantNote) {
    txt += `=== WICHTIG ===\n${s.importantNote}\n\n`;
  }
  if (s.notes) {
    txt += `=== ALLGEMEINE NOTIZEN ===\n${s.notes}\n\n`;
  }
  
  // Einträge ohne Datum (Altdaten) dürfen den Export nicht abbrechen
  const byDate = (a,b) => (a.date||'').localeCompare(b.date||'');
  const dateStr = d => d ? formatDateLong(d) : 'ohne Datum';

  // Sicherung: immer alle Noten; der Schnitt über alle, dazu je Halbjahr, wenn eins eingestellt ist (Y7)
  const avgText = r => { const a = calculateStudentAverage(s, profileGroupId, r); return a === null ? '-' : points ? formatGradeAverage(a) + ' Punkte' : formatGradeAverage(a, 2); };
  const halves = halfYearSplit() ? `, 1. Halbjahr: ${avgText(periodRange('h1'))}, 2. Halbjahr: ${avgText(periodRange('h2'))}` : '';
  txt += `=== NOTEN (Schnitt aller Noten: ${avgText(null)}${halves}) ===\n`;
  if (s.grades && s.grades.length > 0) {
    const sortedGrades = [...s.grades].sort(byDate);
    sortedGrades.forEach(g => {
      txt += `${dateStr(g.date)} | ${g.note || gradeTypeName(g.type)} | ${gradeCategory(g.type) === 'schularbeit' ? 'Klassenarbeit' : 'Sonstige Leistung'} | ${points ? 'Punkte' : 'Note'}: ${gradeText(g.value)}\n`;
    });
  } else {
    txt += `Keine Noten eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== MITARBEIT ===\n`;
  if (s.participation && s.participation.length > 0) {
    const sortedPart = [...s.participation].sort(byDate);
    sortedPart.forEach(p => {
      const l = partLevel(p.value);
      const valStr = `(${l ? l.sign : p.value || '?'})`;
      const desc = p.label || (l ? `Mitarbeit ${l.word}` : 'Mitarbeit');
      txt += `${dateStr(p.date)} | ${desc} | ${valStr}\n`;
    });
  } else {
    txt += `Keine Mitarbeit eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== ANWESENHEIT ===\n`;
  if (s.attendance && s.attendance.length > 0) {
    const attLabels = { abwesend: 'Unentschuldigt', entschuldigt: 'Entschuldigt', 'zuspät': 'Zu spät' };
    const sortedAtt = [...s.attendance].sort(byDate);
    sortedAtt.forEach(a => {
      const valStr = attLabels[a.type] || a.type || '';
      txt += `${dateStr(a.date)} | ${valStr}${a.note ? ' | ' + a.note : ''}\n`;
    });
  } else {
    txt += `Keine Fehltage eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== HAUSAUFGABEN VERGESSEN ===\n`;
  if (s.homework && s.homework.length > 0) {
    [...s.homework].sort(byDate).forEach(h => { txt += `${dateStr(h.date)}${h.note ? ' | ' + h.note : ''}\n`; });
  } else {
    txt += `Keine vergessenen Hausaufgaben eingetragen.\n`;
  }
  txt += `\n`;

  txt += `=== VERHALTENSNOTIZEN ===\n`;
  if (s.studentNotes && s.studentNotes.length > 0) {
    const sortedNotes = [...s.studentNotes].sort(byDate);
    sortedNotes.forEach(n => {
      txt += `${dateStr(n.date)}:\n${n.text || ''}\n---\n`;
    });
  } else {
    txt += `Keine Verhaltensnotizen eingetragen.\n`;
  }
  
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Akte_${s.firstName}_${s.lastName}_${subjName.replace(/\s+/g,'_')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Schülerakte wurde heruntergeladen ✓');
}
// Offenes Schüler-Fenster beim Zurückkommen und im Minutentakt auf den neuen Tag stellen (AS2)
const refreshSeatingStudentDayIfVisible = () => { if (!document.hidden) refreshSeatingStudentDay(); };

// Schülernotizen „aus den letzten Stunden“ (AM1): von heute und aus den letzten 2 Stunden der Klasse vor dateStr
// (Ausfall und Ferien zählen nicht). Liefert den ersten Tag, der dazugehört; ohne frühere Stunden nur dateStr.
function recentNotesSince(groupId, dateStr) {
  let d = addDays(parseDate(dateStr), -1), found = 0, since = dateStr;
  for (let i = 0; i < 70 && found < 2; i++, d = addDays(d, -1)) {   // über die Sommerferien (Regel 17)
    if (!isSchoolDay(d)) continue;
    const ds = formatDate(d);
    const n = lessonsOnDate(ds).filter(l => l.slot.groupId === groupId && !l.ausfall).length;
    if (n) { found += n; since = ds; }
  }
  return since;
}
// Neueste zuerst; kaputte Einträge (ohne Text/Datum) fallen weg
function recentStudentNotes(s, since, dateStr) {
  return (s.studentNotes || []).filter(n => n && typeof n.text === 'string' && n.text.trim() && isDateStr(n.date) && n.date >= since && n.date <= dateStr)
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Schülerzentrale (AM1) oben im Schüler-Fenster: Hinweise, Notizen aus den letzten Stunden, Mitarbeit auf einen Blick.
// Inhalte wie der Beamer-Schutz (Regel 16, 67): mit Schutz erst nach „Anzeigen“ (swShown, nie gespeichert), ohne sofort.
// Verborgen steht nur, WAS es gibt (Hinweis, Anzahl Notizen, Mitarbeit), nie der Text oder eine Wertung.
function renderSwHub(s) {
  const box = document.getElementById('sw-hub');
  const ctx = window.currentSeatingStudent;
  if (!box || !ctx) return;
  const hint = (s.notes || '').trim(), important = (s.importantNote || '').trim();
  const notes = recentStudentNotes(s, recentNotesSince(ctx.groupId, ctx.dateStr), ctx.dateStr);
  const range = viewPeriod();   // Halbjahr wie in der Klassenansicht (Y7)
  const partN = partCounts(periodList(s.participation, range).filter(p => p && !p.label));
  const last = lastParticipation(s, 5);
  const hasPart = partN.some(n => n) || last.length;
  box.hidden = !hint && !important && !notes.length && !hasPart;
  box.innerHTML = '';
  if (box.hidden) return;
  const protectedView = classGradesProtected();
  const open = !protectedView || swShown;
  if (!open) {
    const tag = (ic, text, cls = '') => `<span class="sw-hub-tag${cls}">${icon(ic)}${text}</span>`;
    box.innerHTML = `<div class="sw-hub-closed"><div class="sw-hub-tags">`
      + (important ? tag('alert', 'Wichtiger Hinweis', ' is-important') : hint ? tag('info', 'Hinweis') : '')
      + (notes.length ? tag('sticky', notes.length === 1 ? '1 Notiz' : `${notes.length} Notizen`) : '')
      + (hasPart ? tag('participation', 'Mitarbeit') : '')
      + `</div><button type="button" class="btn-secondary sw-hub-show">Anzeigen</button></div>`;
    box.querySelector('.sw-hub-show').addEventListener('click', () => revealSeatingStudent());
    return;
  }
  const label = text => `<div class="sw-label">${text}</div>`;
  let html = '';
  if (hint || important) html += `<div class="sw-hub-hint${important ? ' is-important' : ''}">${label(important ? `${icon('alert')}Wichtiger Hinweis` : `${icon('info')}Hinweis`)}`
    + `${important ? `<b>${escHtml(important)}</b>` : ''}${hint ? `<span>${escHtml(hint)}</span>` : ''}</div>`;
  if (notes.length) html += `<div class="sw-hub-notes">${label(`${icon('sticky')}Notizen aus den letzten Stunden`)}<ul>`
    + notes.map(n => `<li><small>${escHtml(n.date === ctx.dateStr ? (ctx.dateStr === formatDate(new Date()) ? 'Heute' : formatWeekdayShort(n.date)) : formatWeekdayShort(n.date))}</small><span>${escHtml(n.text)}</span></li>`).join('')
    + `</ul></div>`;
  if (hasPart) html += `<div class="sw-hub-part">${label(`${icon('participation')}Mitarbeit ${range ? `im ${PERIOD_NAMES[range.key]}` : 'bisher'}`)}`
    + `<div class="sw-hub-counts">${PART_LEVELS.map((l, i) => `<span class="sw-hub-count${i === PART_LEVELS.length - 1 && partN[i] ? ' n-bad' : ''}">${partSignHTML(l.value)}<b>${partN[i]}</b></span>`).join('')}</div>`
    + (last.length ? `<div class="sw-hub-last"><small>Zuletzt</small>${last.map(p => partSignHTML(p.value)).join('')}</div>` : '') + `</div>`;
  if (protectedView) html += `<button type="button" class="link-btn sw-hub-hide">Verbergen</button>`;
  box.innerHTML = html;
  const hide = box.querySelector('.sw-hub-hide');
  if (hide) hide.addEventListener('click', () => hideSeatingStudent());
}
function renderSeatingStudentHint(show) {
  const box = document.getElementById('seating-student-hint');
  const ctx = window.currentSeatingStudent;
  if (!box || !ctx) return;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  if (!s) return;
  renderSwHub(s);
  const text = (s.notes || '').trim();
  const important = (s.importantNote || '').trim();   // AD17
  if ((text || important) && !show) {
    box.innerHTML = `<div class="seating-hint-hidden${important ? ' is-important' : ''}"><span>${important ? 'Wichtiger Hinweis vorhanden (verborgen)' : 'Hinweis vorhanden (verborgen)'}</span>
      <button type="button" class="btn-secondary seating-reveal-btn" onclick="renderSeatingStudentHint(true)">Anzeigen</button></div>`;
    return;
  }
  // Lesen statt offener Eingabefelder (AH28): erst „Ändern“ zeigt die Felder – kein versehentliches Tippen am Beamer
  if (show === 'view') {
    box.innerHTML = (important ? `<div class="sw-hint is-important"><small>${icon('alert')}Wichtig</small>${escHtml(important)}</div>` : '')
      + (text ? `<div class="sw-hint"><small>Sonstiges</small>${escHtml(text)}</div>` : '')
      + (!important && !text ? '<div class="sw-hint-empty">Kein Hinweis</div>' : '')
      + `<button type="button" class="btn-secondary sw-hint-edit">${icon('edit')}${important || text ? 'Ändern' : 'Hinweis eintragen'}</button>`;
    box.querySelector('.sw-hint-edit').addEventListener('click', () => {
      renderSeatingStudentHint(true);
      try { box.querySelector('textarea').focus(); } catch (e) { /* egal */ }
    });
    return;
  }
  box.innerHTML = `<label class="seating-hint-label is-important" for="seating-student-important-input">${icon('alert')}Wichtig</label>
    <textarea id="seating-student-important-input" class="form-input seating-hint-input" rows="1"
      placeholder="z. B. Diabetes, Allergie, Nachteilsausgleich …"></textarea>
    <label class="seating-hint-label" for="seating-student-hint-input">Sonstiges</label>
    <textarea id="seating-student-hint-input" class="form-input seating-hint-input" rows="2"
      placeholder="z. B. mag Fußball, sitzt gern am Fenster …"></textarea>`;
  box.querySelector('#seating-student-important-input').value = s.importantNote || '';
  box.querySelector('#seating-student-hint-input').value = s.notes || '';
  box.querySelectorAll('textarea').forEach(ta => ta.addEventListener('change', commitSeatingStudentHint));
}
// Wichtiger Hinweis (AD17): leer = Feld weg, damit nicht jeder Schüler ein leeres Feld trägt
function setImportantNote(s, value) {
  if (value) s.importantNote = value; else delete s.importantNote;
}
function commitSeatingStudentHint() {
  const ta = document.getElementById('seating-student-hint-input');
  const taImp = document.getElementById('seating-student-important-input');
  const ctx = window.currentSeatingStudent;
  if (!ta || !ctx) return;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  const value = ta.value.trim();
  const impValue = taImp ? taImp.value.trim() : (s ? (s.importantNote || '').trim() : '');
  if (!s) { if (value || impValue) showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Hinweis nicht gespeichert', 'error'); return; }
  if (value === (s.notes || '').trim() && impValue === (s.importantNote || '').trim()) return;
  s.notes = value;
  setImportantNote(s, impValue);
  saveDB();
  refreshStudentViews(ctx.groupId);
  renderSwHub(s);
}

// Notiz zum Schüler direkt im Sitzplan (AH10), landet bei den Anmerkungen im Profil (studentNotes). Vorhandene
// Notizen nur auf Knopfdruck (Beamer, Regel 67); was man eben selbst getippt hat, bleibt sichtbar. Nie gespeichert.
let seatingNotesFresh = [];
function commitSeatingStudentForm() { addSeatingStudentNote(); addStudentNote(); commitSeatingStudentHint(); }
function renderSeatingStudentNotes() {
  const box = document.getElementById('seating-student-notes');
  const ctx = window.currentSeatingStudent;
  if (!box || !ctx) return;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  if (!s) { box.innerHTML = ''; return; }
  // Unter dem Feld nur, was eben getippt wurde (verborgen, AH28); offen steht es oben in der Zentrale (AM1)
  renderSwToday(s, ctx.dateStr);
  renderSwHub(s);
  const hubOpen = !classGradesProtected() || swShown;
  const visible = hubOpen ? [] : (s.studentNotes || []).filter(n => seatingNotesFresh.includes(n));
  box.innerHTML = visible.length ? `<ul class="seating-notes">${visible.map(n =>
      `<li><small>${n.date ? escHtml(formatDateShort(n.date)) : ''}</small>${escHtml(n.text)}</li>`).join('')}</ul>` : '';
}
function addSeatingStudentNote() {
  refreshSeatingStudentDay();   // AS2: Notiz mit dem neuen Tag, nie verworfen
  const input = document.getElementById('seating-student-note-input');
  const ctx = window.currentSeatingStudent;
  const text = input ? input.value.trim() : '';
  if (!text || !ctx) return false;
  const s = (db.students[ctx.groupId] || []).find(x => x.id === ctx.studentId);
  if (!s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Notiz nicht gespeichert', 'error'); return false; }
  if (!Array.isArray(s.studentNotes)) s.studentNotes = [];
  const note = { text, date: ctx.dateStr || formatDate(new Date()) };
  s.studentNotes.push(note);
  seatingNotesFresh.push(note);
  input.value = '';
  saveDB();
  refreshStudentViews(ctx.groupId);
  renderSeatingStudentNotes();
  refreshOpenProfile(s);
  return true;
}

// Schüler-Fenster über Nacht offen (AS2): Ist seit dem Öffnen ein neuer Tag, das Fenster auf den neuen Tag stellen und
// melden. Liefert true, wenn umgestellt wurde – Ein-Tipp-Knöpfe speichern dann nichts (man tippt nach dem Hinweis neu).
function refreshSeatingStudentDay(now = new Date()) {
  const ctx = window.currentSeatingStudent;
  if (!ctx || ctx.fixedDate || !ctx.openedOn || ctx.openedOn === formatDate(now)) return false;
  if (document.getElementById('modal-seating-student').classList.contains('hidden')) return false;
  let dateStr = profileDefaultDate(now);
  if (document.getElementById('view-seating')?.classList.contains('active')) {
    if (refreshSeatingDate(now)) { renderSeatingDateStrip(); renderSeatingPlan(); }
    dateStr = currentSeatingDateStr || dateStr;
  }
  const note = document.getElementById('seating-student-note-input');
  const typed = note ? note.value : '';
  openSeatingStudentModal(ctx.studentId, ctx.groupId, dateStr, { keep: true });
  if (note) note.value = typed;   // Eingetipptes nie verwerfen (Regel 27)
  showToast(`Neuer Tag: Einträge gelten jetzt für ${formatWeekdayShort(dateStr)}`);
  return true;
}
function setSeatingAbsence(type) {
  if (!window.currentSeatingStudent) return;
  if (refreshSeatingStudentDay()) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];
  
  const existingIdx = s.attendance.findIndex(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
  if (existingIdx !== -1 && s.attendance[existingIdx].type === type) {
    if (type === 'abwesend') {
      removeAbsenceNote(groupId, dateStr, s);
    }
    const [removed] = s.attendance.splice(existingIdx, 1);
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showUndoToast('Fehlzeit entfernt', () => restoreSeatingEntry(groupId, s, 'attendance', removed,
      () => { if (removed.type === 'abwesend') addAbsenceNote(groupId, removed.date, s); }));
    return;
  }
  
  const wasAbwesend = s.attendance.some(a => a.date === dateStr && a.type === 'abwesend');
  if (wasAbwesend && type !== 'abwesend') {
    removeAbsenceNote(groupId, dateStr, s);
  }
  // Fehlen und „zu spät“ schließen sich am selben Tag aus. Ein vorhandener Eintrag wird umgestellt,
  // damit sein Grund („Arztattest“, „Bus“) bleibt (Regel 50, BUGS Q11, W3).
  const keep = s.attendance.find(a => a.date === dateStr && DAY_ATTENDANCE_TYPES.includes(a.type));
  s.attendance = s.attendance.filter(a => a === keep || a.date !== dateStr || !DAY_ATTENDANCE_TYPES.includes(a.type));
  
  if (keep) keep.type = type;
  else s.attendance.push({ id: uid(), date: dateStr, type: type, note: '' });

  // If unexcused, add note to next lesson
  if (type === 'abwesend') addAbsenceNote(groupId, dateStr, s);

  saveDB();
  refreshStudentViews(groupId);
  closeModal('modal-seating-student');
  showToast(type === 'abwesend' ? 'Unentschuldigt eingetragen' : 'Entschuldigt eingetragen');
}

// BUGS H8: „zu spät“ direkt aus der Schnellbewertung; zweiter Klick nimmt es zurück
function setSeatingLate() {
  if (!window.currentSeatingStudent) return;
  if (refreshSeatingStudentDay()) return;   // AS2
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];

  const existing = s.attendance.find(a => a.date === dateStr && a.type === 'zuspät');
  if (existing) {
    s.attendance.splice(s.attendance.indexOf(existing), 1);
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showUndoToast('„Zu spät“ entfernt', () => restoreSeatingEntry(groupId, s, 'attendance', existing));
    return;
  }

  // Wer zu spät kommt, fehlt nicht: ein Fehlen am selben Tag wird ersetzt
  if (s.attendance.some(a => a.date === dateStr && a.type === 'abwesend')) {
    removeAbsenceNote(groupId, dateStr, s);
  }
  // Vorhandenen Eintrag umstellen, damit sein Grund bleibt (Regel 50, W3)
  const keep = s.attendance.find(a => a.date === dateStr && DAY_ATTENDANCE_TYPES.includes(a.type));
  s.attendance = s.attendance.filter(a => a === keep || a.date !== dateStr || !DAY_ATTENDANCE_TYPES.includes(a.type));
  if (keep) keep.type = 'zuspät';
  else s.attendance.push({ id: uid(), date: dateStr, type: 'zuspät', note: '' });
  saveDB();
  refreshStudentViews(groupId);
  closeModal('modal-seating-student');
  showToast('Zu spät eingetragen', 'warning');
}

function setSeatingHomework() {
  if (!window.currentSeatingStudent) return;
  if (refreshSeatingStudentDay()) return;   // AS2
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];
  
  // Nur den Eintrag ohne Bemerkung; einer mit Bemerkung gehört zu einer Spalte der Tabelle (BUGS Q8)
  const existingIdx = s.homework.findIndex(h => h.date === dateStr && !h.note);
  const labelled = s.homework.find(h => h.date === dateStr && h.note);
  if (existingIdx === -1 && labelled) {
    showToast(`Steht schon in der HA-Spalte „${labelled.note}“. Bitte in der Tabelle ändern`, 'error');
    return;
  }
  if (existingIdx === -1) {
    s.homework.push({ id: uid(), date: dateStr, note: '' });
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showToast('Hausaufgabe vergessen eingetragen', 'warning');
  } else {
    const [removed] = s.homework.splice(existingIdx, 1);
    saveDB();
    refreshStudentViews(groupId);
    closeModal('modal-seating-student');
    showUndoToast('Hausaufgaben-Eintrag entfernt', () => restoreSeatingEntry(groupId, s, 'homework', removed));
  }
}


// Schüler-Fenster (AH28): Sitzplan, Stunde und Klassenansicht/Profil öffnen dasselbe Fenster. opts.more = „Mehr zu …“
// gleich offen (Profil), opts.focus = Abschnitt, opts.keep = Zustand wie vorher (nach dem Notenformular).
let swShown = false;   // Noten, Mitarbeit, Notizen, Hinweise unter „Mehr“ eingeblendet – nie gespeichert (Regel 16, 67)
function openSeatingStudentModal(studentId, groupId, dateStr, opts = {}) {
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  if (!s) return;
  const prev = window.currentSeatingStudent;
  const same = opts.keep && prev && prev.studentId === studentId && prev.groupId === groupId;
  const moreWasOpen = !document.getElementById('sw-more').hidden;
  document.getElementById('seating-student-title').textContent = `${s.firstName} ${s.lastName}`;
  // Klasse · Fach · Tag: Der Tag gilt für alles oben im Fenster (Mitarbeit, Fehlzeit, HA, Note, Notiz; AH28)
  const sg = db.groups.find(x => x.id === groupId);
  document.getElementById('seating-student-sub').textContent = [sg && sg.className, sg && sg.subject, formatWeekdayShort(dateStr)].filter(Boolean).join(' · ');

  // Tag des Öffnens (AS2): Über Nacht offen, gilt am neuen Tag der neue Tag – außer aus einer Stunde geöffnet (fixedDate)
  window.currentSeatingStudent = { studentId, groupId, dateStr,
    openedOn: same && prev.openedOn && opts.keepDay ? prev.openedOn : formatDate(new Date()),
    fixedDate: !!(opts.fixedDate || (same && prev.fixedDate)) };
  profileGroupId = groupId;
  currentStudentId = studentId;
  // QR-Knopf oben (AJ2e): schneller Weg zum Code, nur mit persönlichen Seiten der Klasse
  const codeBtn = document.getElementById('sw-code-btn');
  if (codeBtn) {
    codeBtn.classList.toggle('hidden', !(sg && personalActive(sg)));
    codeBtn.onclick = () => showStudentCode(groupId, studentId);
  }
  // Beamer: aus dem Sitzplan nur, wenn dort die Noten eingeblendet sind; aus der Klassenansicht wie dort (AH24 c)
  const fromClassView = document.getElementById('view-students').classList.contains('active') && currentGroupId === groupId;
  const fromSeating = document.getElementById('view-seating').classList.contains('active');   // sonst gilt der Sitzplan-Schalter nie (W1)
  if (!same) swShown = fromClassView ? classGradesShown : fromSeating && seatingShowGrades;

  const range = viewPeriod();   // Halbjahr wie in der Klassenansicht (Y7)
  const partN = partCounts(periodList(s.participation, range));
  document.getElementById('seating-student-participation-summary').innerHTML = `${range ? `Mitarbeit im ${PERIOD_NAMES[range.key]}` : 'Mitarbeit bisher'}: ` +
    PART_LEVELS.map((l, i) => `<span>${partSignHTML(l.value)} ${partN[i]}</span>`).join(' · ');

  closeSeatingGradePad();
  closeSeatingMenu();
  renderStudentDetailLists(s);
  resetProfileDates();
  renderSeatingStudentHint('view');
  if (!same) {
    seatingNotesFresh = [];
    // Angefangenes darf nie beim nächsten Schüler landen (W2)
    ['new-att-note', 'new-hw-student-note', 'new-student-note-text'].forEach(id => { document.getElementById(id).value = ''; });
  }
  document.getElementById('seating-student-note-input').value = '';
  renderSeatingStudentNotes();
  markSeatingStudentState(s, dateStr);
  setSeatingStudentVeil();
  setSeatingStudentMore(same ? moreWasOpen : !!opts.more, s);

  openModal('modal-seating-student');
  if (opts.focus && opts.more) switchStudentTab(opts.focus);
}
function setSeatingStudentVeil() {
  const more = document.getElementById('sw-more');
  if (more) more.classList.toggle('is-veiled', !swShown);
}
function revealSeatingStudent() { setSeatingStudentShown(true); }
function hideSeatingStudent() { setSeatingStudentShown(false); }
// Ein Schalter für alles Private im Fenster: Zentrale oben und „Mehr“ (AM1)
function setSeatingStudentShown(on) {
  swShown = on;
  setSeatingStudentVeil();
  renderSeatingStudentNotes();   // zeichnet auch die Zentrale neu
}

// Was heute schon eingetragen ist, ist markiert – ein zweites Tippen nimmt es zurück (BUGS N6)
// Was an diesem Tag schon eingetragen ist (AH34). Nur Arten und Anzahl, nie Notenwerte oder Notiztexte (Regel 67).
function renderSwToday(s, dateStr) {
  const box = document.getElementById('sw-today');
  if (!box) return;
  const words = [];
  if ((s.participation || []).some(p => p.date === dateStr && !p.label)) words.push('Mitarbeit');
  const absence = { abwesend: 'Fehlt', entschuldigt: 'Entschuldigt', 'zuspät': 'Zu spät' };
  (s.attendance || []).filter(a => a.date === dateStr && absence[a.type]).forEach(a => words.push(absence[a.type]));
  if ((s.homework || []).some(h => h.date === dateStr)) words.push('HA fehlt');
  const count = (n, one, many) => { if (n) words.push(`${n} ${n === 1 ? one : many}`); };
  count((s.grades || []).filter(g => g.date === dateStr).length, 'Note', 'Noten');
  count((s.studentNotes || []).filter(n => n.date === dateStr).length, 'Notiz', 'Notizen');
  const day = dateStr === formatDate(new Date()) ? 'Heute' : `Am ${formatDateDE(parseDate(dateStr))}`;
  box.textContent = words.length ? `${day}: ${words.join(' · ')}` : `${day} noch nichts eingetragen`;
}
function markSeatingStudentState(s, dateStr) {
  renderSwToday(s, dateStr);
  renderSwHub(s);   // Mitarbeit-Bilanz oben (AM1)
  const set = new Set();
  (s.participation || []).filter(p => p.date === dateStr && !p.label).forEach(p => set.add(p.value)); // wie addParticipationSmiley
  (s.attendance || []).filter(a => a.date === dateStr).forEach(a => set.add(a.type));
  if ((s.homework || []).some(h => h.date === dateStr)) set.add('homework');
  document.querySelectorAll('#modal-seating-student [data-action]').forEach(btn => {
    const on = set.has(btn.dataset.action);
    btn.classList.toggle('is-set', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// Noten unter „Mehr zu …“ zeigt dieselbe Liste wie früher das Profil (renderGradesList, AH28); „Anzeigen“ blendet sie ein
function revealSeatingStudentGrades() { revealSeatingStudent(); }

// „Mehr zu …“ (AH28): Hinweise, Noten, Bilanz und der Weg ins Profil – zu beim Öffnen, damit oben das Schnelle bleibt
function setSeatingStudentMore(open, s) {
  const more = document.getElementById('sw-more');
  const btn = document.getElementById('sw-more-btn');
  if (!more || !btn) return;
  more.hidden = !open;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (s) document.getElementById('sw-more-label').textContent = `Mehr zu ${s.firstName || 'diesem Schüler'}`;
}
function toggleSeatingStudentMore() {
  const more = document.getElementById('sw-more');
  setSeatingStudentMore(more.hidden);
}

// ─── Note schnell geben (AH28) ───────────────────────────────────────────────
// Schüler antippen → „Note geben“ → Zahl antippen = gespeichert. Art als Chips (je Klasse auf dem Gerät gemerkt, nie in
// db), Titel nur wahlweise und nur für diese eine Note. Datum = Tag des Fensters. Rückgängig im Hinweis (Regel 45).
const QUICK_GRADE_TYPES = [['muendlich', 'Mündlich'], ['test', 'Test'], ['mitarbeit', 'Mitarbeit'], ['projekt', 'Referat'], ['sonstig', 'Sonstiges']];
const QUICK_GRADE_KEY = 'quick_grade_type';
function quickGradeType(groupId) {
  try {
    const t = (JSON.parse(localStorage.getItem(QUICK_GRADE_KEY)) || {})[groupId];
    return QUICK_GRADE_TYPES.some(([k]) => k === t) ? t : 'muendlich';
  } catch (e) { return 'muendlich'; }
}
function rememberQuickGradeType(groupId, type) {
  try {
    const all = JSON.parse(localStorage.getItem(QUICK_GRADE_KEY)) || {};
    all[groupId] = type;
    localStorage.setItem(QUICK_GRADE_KEY, JSON.stringify(all));
  } catch (e) { /* gesperrt: dann eben Mündlich */ }
}
// Knöpfe der Notentafel: 1–6 mit Tendenz (drei Reihen) bzw. 15 … 0 Punkte (zwei Reihen à 8)
function quickGradeValues(scale) {
  if (scale.higherIsBetter) return [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(n => ({ val: String(n), label: String(n), main: true }));
  const n = [1, 2, 3, 4, 5, 6];
  return [...n.map(x => ({ val: x + '+', label: x + '+' })), ...n.map(x => ({ val: String(x), label: String(x), main: true })),
    ...n.map(x => ({ val: x + '-', label: x + '−' }))];
}
function quickGradePadHTML(groupId, withTitle) {
  const scale = gradeScale(groupId);
  const type = quickGradeType(groupId);
  const vals = quickGradeValues(scale);
  return `<div id="sw-grade-pad" class="sw-pad">
    <div class="sw-chips" role="group" aria-label="Art der Note">${QUICK_GRADE_TYPES.map(([k, label]) =>
      `<button type="button" data-type="${k}" class="${k === type ? 'on' : ''}" aria-pressed="${k === type}">${label}</button>`).join('')}</div>
    ${withTitle ? '<input type="text" id="sw-grade-title" class="entry-input sw-grade-title" placeholder="Titel, z. B. Vokabeltest" aria-label="Titel der Note" list="gf-column-titles" />' : ''}
    <div class="sw-grid${scale.higherIsBetter ? ' is-points' : ''}" role="group" aria-label="Note antippen = speichern">${vals.map(v =>
      `<button type="button" data-val="${escHtml(v.val)}" class="${v.main ? 'is-main' : ''}" aria-label="Note ${escHtml(v.label)}">${escHtml(v.label)}</button>`).join('')}</div>
    <div class="sw-pad-foot">${withTitle ? '' : '<button type="button" id="sw-grade-title-btn" class="btn-secondary sw-pad-title">+ Titel</button>'}<span>Antippen = gespeichert</span><button type="button" class="btn-secondary sw-pad-cancel">Abbrechen</button></div>
  </div>`;
}
function openSeatingGradePad(withTitle = false) {
  const ctx = window.currentSeatingStudent;
  const box = document.getElementById('sw-grade-slot');
  if (!ctx || !box) return;
  if (withTitle) fillGradeTitleList(ctx.groupId);   // AR10
  const title = document.getElementById('sw-grade-title');
  const keepTitle = title ? title.value : '';
  box.innerHTML = quickGradePadHTML(ctx.groupId, withTitle);
  box.hidden = false;
  document.getElementById('sw-grade-btn').setAttribute('aria-expanded', 'true');
  const pad = box.querySelector('#sw-grade-pad');
  if (withTitle) { const t = pad.querySelector('#sw-grade-title'); t.value = keepTitle; try { t.focus(); } catch (e) { /* egal */ } }
  pad.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
    rememberQuickGradeType(ctx.groupId, b.dataset.type);
    pad.querySelectorAll('[data-type]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
  }));
  pad.querySelector('#sw-grade-title-btn')?.addEventListener('click', () => openSeatingGradePad(true));
  pad.querySelectorAll('[data-val]').forEach(b => b.addEventListener('click', () => giveQuickGrade(b.dataset.val)));
  pad.querySelector('.sw-pad-cancel').addEventListener('click', closeSeatingGradePad);
}
function closeSeatingGradePad() {
  const box = document.getElementById('sw-grade-slot');
  if (box) { box.innerHTML = ''; box.hidden = true; }
  document.getElementById('sw-grade-btn')?.setAttribute('aria-expanded', 'false');
}
// „…“: Seltenes (Name/Geburtstag/Hinweise ändern, Export, Löschen) nicht mehr groß im Fenster (AH28)
function toggleSeatingMenu() {
  const menu = document.getElementById('sw-menu');
  if (!menu) return;
  menu.hidden = !menu.hidden;
  document.getElementById('sw-menu-btn').setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
}
function closeSeatingMenu() {
  const menu = document.getElementById('sw-menu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  document.getElementById('sw-menu-btn').setAttribute('aria-expanded', 'false');
}
function seatingMenuAction(action) {
  if (action === 'edit') { commitSeatingStudentForm(); openEditStudent(); }
  else if (action === 'export') exportCurrentStudent();
  else if (action === 'delete') deleteCurrentStudent();
}
function giveQuickGrade(val) {
  if (refreshSeatingStudentDay()) return;   // AS2
  const ctx = window.currentSeatingStudent;
  if (!ctx) return;
  const { studentId, groupId, dateStr } = ctx;
  const s = (db.students[groupId] || []).find(x => x.id === studentId);
  if (!s) { showToast('Diesen Schüler gibt es nicht mehr (z. B. durch Sync). Note nicht gespeichert', 'error'); return; }
  const parsed = parseGradeInput(val, gradeScale(groupId));
  if (!parsed) return;
  const type = document.querySelector('#sw-grade-pad .sw-chips .on')?.dataset.type || quickGradeType(groupId);
  const titleEl = document.getElementById('sw-grade-title');
  const entry = { type, value: parsed.value, date: dateStr || profileDefaultDate(), note: titleEl ? titleEl.value.trim() : '' };
  if (!Array.isArray(s.grades)) s.grades = [];
  s.grades.push(entry);
  saveDB();
  revealPeriodOf(entry.date);   // sonst verschwände die Note im gezeigten Halbjahr (AR7)
  refreshGradeViews(s, groupId);
  closeModal('modal-seating-student');
  const typeName = (QUICK_GRADE_TYPES.find(([k]) => k === type) || [])[1] || gradeTypeName(type);
  showUndoToast(`${studentListName(s)}: ${gradeText(entry.value)} (${entry.note || typeName})`, () => {
    // Inzwischen ersetzte DB (Abgleich): Das Objekt gehört zum alten Stand, ein Löschen dort täte nichts (Regel 32)
    const i = (db.students[groupId] || []).includes(s) ? (s.grades || []).indexOf(entry) : -1;
    if (i === -1) { showToast('Nicht mehr möglich: Die Daten wurden inzwischen ersetzt', 'error'); return; }
    s.grades.splice(i, 1);
    saveDB();
    refreshGradeViews(s, groupId);
  });
}

function openGradeFormForCurrentStudent() {
  refreshSeatingStudentDay();   // AS2: Formular zeigt dann gleich den neuen Tag
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  if (studentId && groupId) {
    openGradeForm(studentId, groupId, -1, dateStr || ''); // Datum wie Anwesenheit/Mitarbeit (BUGS N7)
  }
}

// ─── Global Grade Form ────────────────────────────────────────────────────
let profileGroupId = null;          // Klasse des offenen Schüler-Fensters (AH28), unabhängig von der Klassenansicht
let editingStudentGroupId = null;   // Klasse beim Bearbeiten aus dem Schüler-Fenster

function addParticipationSmiley(type) {
  if (refreshSeatingStudentDay()) return;   // AS2
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId].find(x => x.id === studentId);
  if (!s) return;
  
  if (!s.participation) s.participation = [];
  
  // Nur den Eintrag ohne Titel: einer mit Titel („Referat“) gehört zu einer Spalte der Tabelle (BUGS Q8)
  const existingIdx = s.participation.findIndex(p => p.date === dateStr && !p.label);
  if (existingIdx !== -1) {
    if (s.participation[existingIdx].value === type) {
      const [removed] = s.participation.splice(existingIdx, 1);
      saveDB();
      refreshStudentViews(groupId);
      showUndoToast('Mitarbeit entfernt', () => restoreSeatingEntry(groupId, s, 'participation', removed));
      closeModal('modal-seating-student');
      return;
    } else {
      s.participation[existingIdx].value = type;
    }
  } else {
    s.participation.push({ id: uid(), date: dateStr, value: type });
  }
  
  saveDB();
  refreshStudentViews(groupId);
  // Angefangene Fehlzeit/HA unter „Mehr“: Fenster offen lassen, sonst wäre sie still weg (AS6, Regel 27)
  if (seatingStudentDraft()) {
    markSeatingStudentState(s, dateStr);
    renderStudentDetailLists(s);
    showToast('Mitarbeit gespeichert. Fehlzeit oder HA ist noch nicht eingetragen');
    return;
  }
  showToast('Mitarbeit gespeichert');
  closeModal('modal-seating-student');
}
const seatingStudentDraft = () => ['new-att-note', 'new-hw-student-note'].some(id => document.getElementById(id)?.value.trim());
// Eintrag wiederherstellen, sofern der Schüler noch da ist (Sync kann die DB inzwischen ersetzt haben)
function restoreSeatingEntry(groupId, s, list, entry, after) {
  if (!(db.students[groupId] || []).includes(s)) { showToast('Nicht mehr möglich: Die Daten wurden inzwischen ersetzt', 'error'); return; }
  if (!s[list]) s[list] = [];
  // Inzwischen neu eingetragen (z. B. „Entschuldigt“ statt des entfernten „Unentschuldigt“): nicht zwei Einträge
  // für denselben Tag anlegen (Regel 50, BUGS W4)
  const clash = list === 'attendance' ? DAY_ATTENDANCE_TYPES.includes(entry.type)
      && s.attendance.some(a => a.date === entry.date && DAY_ATTENDANCE_TYPES.includes(a.type))
    : list === 'participation' ? s.participation.some(p => p.date === entry.date && (p.label || '') === (entry.label || ''))
    : list === 'homework' ? s.homework.some(h => h.date === entry.date && (h.note || '') === (entry.note || ''))
    : false;
  if (clash) { showToast('Nicht wiederhergestellt: Für den ' + formatDateShort(entry.date) + ' gibt es schon einen Eintrag', 'error'); return; }
  s[list].push(entry);
  if (after) after();
  saveDB();
  refreshStudentViews(groupId);
  refreshOpenProfile(s);
  showToast('Wiederhergestellt');
}
// Notizen übernimmt das Schließen (commitSeatingStudentForm). Ein angefangener Grund oder eine HA-Spalte wäre ein neuer
// Eintrag, den man noch nicht bestätigt hat: fragen statt raten.
function leaveSeatingStudentWindow() {
  if (seatingStudentDraft() && !confirm('Du hast eine Fehlzeit oder Hausaufgabe angefangen, aber noch nicht eingetragen.\n\nVerwerfen?')) return;
  closeModal('modal-seating-student');
}

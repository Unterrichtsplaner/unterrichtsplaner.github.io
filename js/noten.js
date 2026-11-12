// ▸ Noten: Halbjahre, Schnitte, Notenskala, Tabellen der Klassenansicht, Spalten, Notenformular, Mitarbeit
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.

// ─── Mitarbeit in vier Stufen (BUGS AH52) ───────────────────────────────
// Gespeichert wird das Wort (`value`), angezeigt das Zeichen. Die drei alten Werte behalten ihre Bedeutung,
// nur „neutral“ heißt jetzt „wenig“; alte Einträge brauchen keine Umrechnung. Reihenfolge: beste zuerst.
const PART_LEVELS = [
  { value: 'excellent', sign: '++', word: 'sehr gut', tone: 4 },
  { value: 'positive',  sign: '+',  word: 'gut',      tone: 3 },
  { value: 'neutral',   sign: '−',  word: 'wenig',    tone: 2 },
  { value: 'negative',  sign: '−−', word: 'schwach',  tone: 1 },
];
function partLevel(value) { return PART_LEVELS.find(l => l.value === value) || null; }
// Zeichen als farbiges Feld; Unbekanntes (neuere App-Version) roh und escaped (Regel 3)
function partSignHTML(value) {
  const l = partLevel(value);
  return l ? `<span class="part-sign p${l.tone}">${l.sign}</span>` : escHtml(value || '');
}
// Anzahl je Stufe, in der Reihenfolge von PART_LEVELS
function partCounts(list) {
  return PART_LEVELS.map(l => (list || []).filter(p => p && p.value === l.value).length);
}
// „2 / 3 / 1 / 0“ wie in den anderen Zusammenfassungen (Regel 76): nur „schwach“ rot
function partCountsHTML(list) {
  const c = partCounts(list), last = c.length - 1;
  return c.map((n, i) => `<span${i === last && n ? ' class="n-bad"' : ''}>${n}</span>`).join(' <span class="sep">/</span> ');
}
// „Mitarbeit: 2 sehr gut, 3 gut, 1 wenig, 0 schwach“ (Titel, VoiceOver)
function partCountsText(list) {
  const c = partCounts(list);
  return PART_LEVELS.map((l, i) => `${c[i]} ${l.word}`).join(', ');
}

// ─── Halbjahre (Y7) ────────────────────────────────────────────────────────
// Stichtag ist das Halbjahresende aus den Einstellungen (AD4), aber nur, wenn es in dieses Schuljahr gehört.
// Zeitraum = { key, from, to } (to null = offen) oder null = alles (kein Stichtag oder „Schuljahr“: wie bisher, nichts fällt weg).
// Welcher Zeitraum gezeigt wird, ist Ansichtszustand (Regel 19): nur in dieser Variable, nie in db, Standard vor dem
// Stichtag 1. Halbjahr, danach Schuljahr. Klassenansicht, Schüler-Fenster, Sitzplan und Bericht folgen ihm; die
// Warnungen zählen immer das laufende Halbjahr (runningHalf).
let periodChoice = null;   // null = Standard, sonst 'h1' | 'h2' | 'year'
const PERIOD_NAMES = { h1: '1. Halbjahr', h2: '2. Halbjahr', year: 'Schuljahr', all: 'Alle Jahre' };
// Nur ein Stichtag desselben Schuljahrs (AR4): Wer im Juli schon das nächste Halbjahresende einträgt, verliert sonst alle Noten
function halfYearSplit(todayStr = formatDate(new Date())) {
  const hy = db.settings.halfYearEnd;
  return isDateStr(hy) && schoolYearStart(hy) === schoolYearStart(todayStr) ? hy : null;
}
// „Schuljahr“ beginnt am 1. August (AR3); „Alle Jahre“ (null) nur für Klassen ohne Schuljahreswechsel mit alten Einträgen
function periodRange(key, todayStr = formatDate(new Date())) {
  const hy = halfYearSplit(todayStr);
  if (!hy || key === 'all') return null;
  if (key === 'year') return { key, from: schoolYearStart(hy), to: null };
  return key === 'h1' ? { key, from: schoolYearStart(hy), to: hy } : { key: 'h2', from: formatDate(addDays(parseDate(hy), 1)), to: null };
}
function periodKey(todayStr = formatDate(new Date())) {
  const hy = halfYearSplit(todayStr);
  if (!hy) return 'year';
  return periodChoice || (todayStr <= hy ? 'h1' : 'year');
}
const viewPeriod = (todayStr = formatDate(new Date())) => periodRange(periodKey(todayStr), todayStr);
function runningHalf(todayStr = formatDate(new Date())) {
  const hy = halfYearSplit(todayStr);
  return hy ? periodRange(todayStr <= hy ? 'h1' : 'h2', todayStr) : null;
}
function groupHasOlderEntries(groupId) {
  const range = periodRange('year');
  if (!range || !groupId) return false;
  return (db.students[groupId] || []).some(s => s && ['grades', 'attendance', 'participation', 'homework']
    .some(k => (Array.isArray(s[k]) ? s[k] : []).some(x => x && isDateStr(x.date) && x.date < range.from)));
}
// Einträge ohne gültiges Datum zählen immer (lieber sichtbar als still weg, Regel 7)
const inPeriod = (dateStr, range) => !range || !isDateStr(dateStr) || (dateStr >= range.from && (!range.to || dateStr <= range.to));
const periodList = (list, range) => (Array.isArray(list) ? list : []).filter(x => x && inPeriod(x.date, range));
// Neuer Eintrag außerhalb des gezeigten Halbjahrs: auf „Schuljahr“ stellen, statt ihn scheinbar verschwinden zu lassen
function revealPeriodOf(dateStr) {
  if (inPeriod(dateStr, viewPeriod())) return;
  periodChoice = inPeriod(dateStr, periodRange('year')) ? 'year' : 'all';
  overviewRenderedKey = null;
  updatePeriodSelect();
  showToast('Zeitraum auf „Schuljahr“ gestellt, damit der neue Eintrag zu sehen ist');
}
function setPeriodChoice(key) {
  periodChoice = PERIOD_NAMES[key] ? key : null;
  overviewRenderedKey = null;   // andere Spalten: neueste zeigen
  refreshPeriodViews();
}
// Alles, was dem Umschalter folgt, neu zeichnen
function refreshPeriodViews() {
  updatePeriodSelect();
  if (currentGroupId) refreshStudentViews(currentGroupId);   // Sitzplan und Schüler-Fenster zeichnen beim Öffnen neu
}
function updatePeriodSelect() {
  const sel = document.getElementById('period-select'), pick = document.getElementById('period-pick');
  if (!sel || !pick) return;
  const has = !!halfYearSplit();   // ohne Halbjahresende in den Einstellungen gibt es nichts umzuschalten
  pick.classList.toggle('hidden', !has);
  if (!has) return;
  // Handy: kurze Namen, sonst verdrängt der Umschalter den Klassennamen im Kopf (Y7, im Browser bei 375 px gemessen)
  const narrow = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
  const SHORT = { h1: '1. Hj', h2: '2. Hj', year: 'Jahr', all: 'Alle' };
  [...sel.options].forEach(o => { o.textContent = narrow ? SHORT[o.value] : PERIOD_NAMES[o.value]; });
  // „Alle Jahre“ nur, wenn die Klasse Einträge aus früheren Schuljahren hat (kein Schuljahreswechsel, AR3)
  const all = sel.querySelector('option[value="all"]');
  if (all) all.hidden = periodKey() !== 'all' && !groupHasOlderEntries(currentGroupId);
  sel.value = periodKey();
}

// Teil-Durchschnitte nach Gewichtungs-Kategorie (siehe gradeCategory), jeweils null wenn keine Noten.
function calculateGradeCategoryAverages(student, range = viewPeriod()) {
  const sums = { schularbeit: 0, sonstige: 0 }, counts = { schularbeit: 0, sonstige: 0 };
  periodList(student && student.grades, range).forEach(gr => {
    const v = gradeNumber(gr.value);
    if (isNaN(v)) return;
    const cat = gradeCategory(gr.type);
    sums[cat] += v;
    counts[cat]++;
  });
  return {
    schularbeit: counts.schularbeit ? sums.schularbeit / counts.schularbeit : null,
    sonstige: counts.sonstige ? sums.sonstige / counts.sonstige : null,
  };
}

// Anteil der Schularbeiten in Prozent (0–100), Standard 50
function getSchularbeitWeight(group) {
  const w = parseFloat(group && group.schularbeitWeight);
  return isNaN(w) ? 50 : Math.min(100, Math.max(0, w));
}

function calculateStudentAverage(student, groupId, range = viewPeriod()) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !student || !student.grades || student.grades.length === 0) return null;

  const wSchularbeit = getSchularbeitWeight(g);
  const wSonstige = 100 - wSchularbeit;
  const { schularbeit: avgSchularbeit, sonstige: avgSonstige } = calculateGradeCategoryAverages(student, range);

  // 100 % bzw. 0 %: Die andere Art zählt laut Tabelle nicht, also bildet sie auch allein keinen Schnitt (AR8)
  if (wSchularbeit === 100) return avgSchularbeit === null ? null : smoothAverage(avgSchularbeit);
  if (wSchularbeit === 0) return avgSonstige === null ? null : smoothAverage(avgSonstige);
  if (avgSchularbeit !== null && avgSonstige !== null) {
    return smoothAverage((avgSchularbeit * wSchularbeit + avgSonstige * wSonstige) / 100);
  } else if (avgSchularbeit !== null) {
    return smoothAverage(avgSchularbeit);
  } else if (avgSonstige !== null) {
    return smoothAverage(avgSonstige);
  }
  return null;
}
// Kommazahlen sind im Computer nur ungefähr: 4,5 kommt als 4,4999999… heraus. Auf 12 Stellen glätten, damit Grenzen
// (Warnung ab 4,5) und Runden (2,15 → 2,2) stimmen (AR1).
const smoothAverage = x => (typeof x === 'number' && isFinite(x) ? Number(x.toPrecision(12)) : x);

// Klassenschnitt = Mittel der Schülerschnitte (Schüler ohne Noten zählen nicht)
function calculateGroupAverage(groupId, range = viewPeriod()) {
  const avgs = (db.students[groupId] || []).map(s => calculateStudentAverage(s, groupId, range)).filter(a => a !== null);
  return avgs.length ? smoothAverage(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
}
// ─── Beamer-Schutz in der Klassenansicht (AH24 c, Regel 16/67) ───────────────
// Schnitte, Noten-Tabelle und Mitarbeit nur auf Knopfdruck. Nie gespeichert; weg beim Öffnen einer Klasse,
// beim Verlassen der Klassenansicht und beim Verlassen der App.
let classGradesShown = false;
const CLASS_GRADE_TABS = ['students', 'grades', 'participation'];
function updateClassGradesButton() {
  const b = document.getElementById('btn-class-grades');
  const tab = currentClassDashboardTab;
  if (b) {
    b.classList.toggle('hidden', !CLASS_GRADE_TABS.includes(tab) || !classGradesProtected());
    const label = classGradesShown ? 'Noten verbergen' : 'Noten anzeigen';
    b.setAttribute('aria-pressed', String(classGradesShown));
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = icon(classGradesShown ? 'eye-off' : 'eye') + `<span class="btn-label">${classGradesShown ? 'Verbergen' : 'Noten zeigen'}</span>`;
  }
  updateOverviewAddButtons();
}
function rerenderClassTab() {
  if (!document.getElementById('view-students').classList.contains('active')) return;
  if (currentClassDashboardTab === 'students') renderStudents();
  else if (currentClassDashboardTab === 'studentapp') renderStudentAppTab();
  else if (currentClassDashboardTab !== 'plan') renderOverviewTable();
}
// Einstellung (AH24 c): Beamer-Schutz abschaltbar; Standard an, gespeichert wird nur „aus“ (classGradesProtect: false)
const classGradesProtected = () => db.settings.classGradesProtect !== false;
function hideClassGrades() {
  classGradesShown = !classGradesProtected();   // ohne Schutz: alles sofort sichtbar
  updateClassGradesButton();
}
function toggleClassGrades() {
  classGradesShown = !classGradesShown;
  updateClassGradesButton();
  rerenderClassTab();
}
function showClassGrades() { if (!classGradesShown) toggleClassGrades(); }
function gradesVeilHTML(text, big = false) {
  return `<div class="grades-veil${big ? ' grades-veil-big' : ''}">${icon('eye-off')}<span>${escHtml(text)}</span><button type="button" class="btn-secondary">Anzeigen</button></div>`;
}
function wireGradesVeil(container) {
  const b = container.querySelector('.grades-veil button');
  if (b) b.addEventListener('click', showClassGrades);
}

// Notentabelle ruhig (AH24 d): nur schwache Noten farbig – 1–3 in Schriftfarbe, 4 orange, 5–6 (Punkte unter 5) rot
// mit Fläche. Farbe der Skala kommt weiter aus gradeColor (Regel 1).
function gradeInk(val, scale) {
  const c = gradeColor(val, scale);
  if (c === 'var(--grade-5)') return 'var(--danger)';
  if (c === 'var(--grade-4)' || c === 'var(--text-muted)') return c;
  return 'var(--text-primary)';
}
const gradeIsWeak = (val, scale) => gradeColor(val, scale) === 'var(--grade-5)';

// Kopfknöpfe der Tabellen (AH24 e): Noten „+ Neue Spalte“ (Fenster: Titel, Art), sonst „+ Heute“ ohne Fenster
// und „Andere Spalte …“ für andere Tage
function updateOverviewAddButtons() {
  const add = document.getElementById('btn-add-overview-col'), other = document.getElementById('btn-add-overview-other');
  if (!add || !other) return;
  const tab = currentClassDashboardTab;
  const tableTab = ['grades', 'participation', 'attendance', 'homework'].includes(tab);
  const veiled = (tab === 'grades' || tab === 'participation') && !classGradesShown;
  add.classList.toggle('hidden', !tableTab || veiled);
  other.classList.toggle('hidden', !tableTab || veiled || tab === 'grades');
  const today = tab !== 'grades';
  add.setAttribute('aria-label', today ? 'Spalte für heute' : 'Neue Spalte');
  add.innerHTML = '+<span class="btn-label">' + (today ? ' Heute' : ' Neue Spalte') + '</span>';
}
function addOverviewColumn() {
  if (currentOverviewTab === 'grades') { openAddColumnModal(); return; }
  addTodayColumn();
}
function addTodayColumn() {
  const tab = currentOverviewTab;
  const field = { participation: 'participationEvents', attendance: 'attendanceEvents', homework: 'homeworkEvents' }[tab];
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  if (!field || !group) return;
  const date = profileDefaultDate();   // am Wochenende/in den Ferien der letzte Schultag (Regel 58)
  const key = tab === 'attendance' ? date : `${date}_`;
  if (overviewColumnKeys(group, db.students[currentOverviewGroupId] || []).has(key)) showToast('Die Spalte für heute gibt es schon');
  else { (group[field] = group[field] || []).push({ date, label: '' }); saveDB(); }
  revealPeriodOf(date);
  overviewRenderedKey = null;   // neueste Spalte zeigen
  renderOverviewTable();
}

// Spaltenkopf der Tabellen: Wochentag + Datum ohne Jahr (schmalere Spalten), Spalte von heute markiert (AH24)
function overviewDateHead(dateStr) { return escHtml(formatWeekdayShort(dateStr)); }
// Kopf einer Tabellenspalte: oben das Datum, darunter Art und Titel; alle Reiter gleich (AH40). tagHTML ist fertiges Markup.
// Passen nicht alle Spalten, wird die Breite so gewählt, dass nur ganze Spalten zu sehen sind; null = alle passen (AH40)
function overviewColWidth(free, cols, base) {
  const fit = Math.floor(free / base);
  return fit >= 1 && cols > fit ? free / fit : null;
}
function fitOverviewColumns() {
  const wrap = document.querySelector('#overview-content .overview-table-wrapper');
  const table = wrap && wrap.querySelector('table');
  if (!table || !wrap.clientWidth) return;
  table.style.removeProperty('--ov-col');
  const css = getComputedStyle(wrap);
  const [base, name, sum] = ['--ov-col', '--ov-name', '--ov-sum'].map(v => Number(css.getPropertyValue(v).trim().replace(/px$/, '')));
  if (!base || !name || !sum) return;   // schmal: rechnet style.css selbst (zwei Spalten)
  const width = overviewColWidth(wrap.clientWidth - name - sum, table.querySelectorAll('thead th').length - 2, base);
  if (width) table.style.setProperty('--ov-col', width + 'px');
}
function overviewColHead(dateStr, label, tagHTML = '') {
  const title = label ? `<span class="col-title" title="${escHtml(label)}">${escHtml(label)}</span>` : '';
  return `<div class="col-date">${overviewDateHead(dateStr)}</div>${tagHTML || title ? `<div class="col-sub">${tagHTML}${title}</div>` : ''}`;
}
const overviewTodayClass = dateStr => dateStr === formatDate(new Date()) ? ' class="ov-today"' : '';
// Welche Tabelle zuletzt gezeichnet wurde: gleiche Tabelle = Scroll-Stelle behalten (AH23), neue = neueste Spalte zeigen
let overviewRenderedKey = null;
function renderOverviewTable() {
  closeParticipationPicker();   // hängt an einer Zelle, die gleich ersetzt wird
  if (!currentOverviewGroupId) return;
  if (currentOverviewTab === 'plan') { renderPlanTab(); return; } // Planung ist keine Tabelle
  if (currentOverviewTab === 'studentapp') { renderStudentAppTab(); return; } // Schülerapp (AJ1) auch nicht
  const content = document.getElementById('overview-content');
  // Hat ein Feld der alten Tabelle noch den Fokus, entfernte das Ersetzen es, und der Browser feuerte dabei sein
  // change mitten im Ersetzen (NotFoundError). Deshalb vorher den Fokus nehmen: Eine laufende Eingabe wird dabei
  // übernommen (change zeichnet selbst neu, danach zeichnen wir mit dem neuen Stand). Ein Feld, das Enter/Tab
  // schon per change übernommen hat, verliert vorher seinen Handler, sonst käme es doppelt.
  const focused = document.activeElement;
  if (focused && focused.tagName === 'INPUT' && content.contains(focused)) {
    if (focused === overviewCommittedInput) focused.onchange = null;
    overviewCommittedInput = null;
    focused.blur();
  }
  if ((currentOverviewTab === 'grades' || currentOverviewTab === 'participation') && !classGradesShown) {
    content.innerHTML = gradesVeilHTML(currentOverviewTab === 'grades'
      ? 'Die Noten sind verborgen, damit am Beamer niemand mitliest.'
      : 'Die Mitarbeit ist verborgen, damit am Beamer niemand mitliest.', true);
    wireGradesVeil(content);
    overviewRenderedKey = null;   // beim Anzeigen: neueste Spalte zeigen
    return;
  }
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];
  // Neu zeichnen ersetzt den Scrollbereich: Stelle merken, sonst springt die Tabelle nach jedem Eintrag an den Anfang (AH23)
  const renderKey = currentOverviewGroupId + '|' + currentOverviewTab;
  const oldWrap = content.querySelector('.overview-table-wrapper');
  const keepScroll = oldWrap && overviewRenderedKey === renderKey
    ? { left: oldWrap.scrollLeft, top: oldWrap.scrollTop, outer: content.scrollTop } : null;
  
  if (!students.length) {
    content.innerHTML = '<div class="empty-state" style="padding:var(--space-5);text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
    return;
  }

  const sortedStudents = sortStudents(students);
  const range = viewPeriod();   // Halbjahr (Y7): nur Spalten und Einträge aus dem gewählten Zeitraum
  const inRange = ev => inPeriod(ev.date, range);
  let html = '<div class="overview-table-wrapper"><table class="overview-table"><thead><tr><th class="ov-name-col">Schüler</th>';

  if (currentOverviewTab === 'grades') {
    const gradeEvents = gradeColumns(group, sortedStudents).filter(inRange);

    html += '<th class="ov-sum-col">Ø</th>';
    const weight = getSchularbeitWeight(group);
    gradeEvents.forEach(ev => {
      const type = ev.type || 'test';
      const weighted = gradeCategory(type) === 'schularbeit';
      const typeTitle = weighted ? `${gradeTypeName(type)}: zählt ${weight} % der Note` : `${gradeTypeName(type)}: Sonstige, zählt ${100 - weight} % der Note`;
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)}, ${jsArg(type)}, ${ev.nth})">`
        + overviewColHead(ev.date, ev.label || gradeTypeName(type), `<span class="col-type${weighted ? ' weighted' : ''}" title="${escHtml(typeTitle)}">${escHtml(gradeTypeShort(type))}</span>`) + '</th>';
    });
    html += '</tr></thead><tbody>';

    const scale = gradeScale(currentOverviewGroupId);
    sortedStudents.forEach(s => {
      const rawAvg = calculateStudentAverage(s, currentOverviewGroupId);
      const avg = formatGradeAverage(rawAvg);
      
      const nameDisplay = escHtml(studentListName(s));
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${nameDisplay}">${nameDisplay}</span></td>`;
      html += `<td class="ov-sum-col" style="font-weight:700;color:${gradeInk(rawAvg, scale)};text-align:center;">${avg}</td>`;
      
      gradeEvents.forEach(ev => {
        const grade = findColumnGrade(s, ev);
        const val = grade ? grade.value : '';
        const num = val ? gradeNumber(val) : NaN;
        const weak = !isNaN(num) && gradeIsWeak(num, scale);
        html += `<td class="ov-grade-cell${weak ? ' ov-grade-weak' : ''}"><input type="text" enterkeyhint="next" class="form-input ov-grade-input" style="font-weight:${weak ? 700 : 600}; color:${val ? gradeInk(num, scale) : 'inherit'}" value="${escHtml(gradeText(val))}" placeholder="–" onchange="updateInlineGrade(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label)}, this.value, ${jsArg(ev.type)}, ${ev.nth})" /></td>`;
      });
      html += `</tr>`;
    });
    
    // Bottom average row
    html += '<tr><td class="ov-name-col" style="font-weight:700;">Durchschnitt</td>';
    const groupAvg = calculateGroupAverage(currentOverviewGroupId);
    html += `<td class="ov-sum-col" style="font-weight:700;color:${gradeInk(groupAvg, scale)};text-align:center;">${formatGradeAverage(groupAvg)}</td>`;

    gradeEvents.forEach(ev => {
      let sum = 0, count = 0;
      sortedStudents.forEach(s => {
        const grade = findColumnGrade(s, ev);
        if (grade) {
          const val = gradeNumber(grade.value);
          if (!isNaN(val)) { sum += val; count++; }
        }
      });
      const colAvg = count > 0 ? sum / count : null;
      html += `<td style="font-weight:700;color:${gradeInk(colAvg, scale)};text-align:center;">${formatGradeAverage(colAvg)}</td>`;
    });
    html += `</tr>`;
    
  } else if (currentOverviewTab === 'participation') {
    const partEventsMap = new Map();
    (group.participationEvents || []).forEach(ev => partEventsMap.set(`${ev.date}_${ev.label}`, { date: ev.date, label: ev.label }));
    sortedStudents.forEach(s => {
      (s.participation || []).forEach(p => {
        if (!p.label) p.label = '';
        partEventsMap.set(`${p.date}_${p.label}`, { date: p.date, label: p.label });
      });
    });
    const partDates = Array.from(partEventsMap.values()).filter(inRange).sort((a,b) => a.date.localeCompare(b.date));
    
    html += `<th class="ov-sum-col ov-part-head" title="Mitarbeit: ${PART_LEVELS.map(l => l.word).join(' / ')}">${PART_LEVELS.map(l => l.sign).join('<span class="sep">/</span>')}</th>`;
    partDates.forEach(ev => {
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})">${overviewColHead(ev.date, ev.label)}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      
      const shown = partDates.map(ev => (s.participation||[]).find(x => x.date === ev.date && (x.label||'') === (ev.label||''))).filter(Boolean);
      // Wie im Reiter Schüler: Schrägstriche, nur „schwach“ rot (AH24, AH52)
      html += `<td class="ov-sum-col ov-sum">${partCountsHTML(shown)}</td>`;

      partDates.forEach(ev => {
        const pIdx = (s.participation||[]).findIndex(x => x.date === ev.date && (x.label||'') === (ev.label||''));
        const val = pIdx !== -1 ? s.participation[pIdx].value : '';
        // Antippen öffnet die Auswahl; leer ist ein leiser Strich (AH24), Stufen als Zeichen (AH52)
        const lvl = partLevel(val);
        const label = `Mitarbeit ${studentListName(s)}, ${formatWeekdayShort(ev.date)}: ${lvl ? lvl.word : (val || 'keine')}`;
        html += `<td class="ov-part-cell">
          <button type="button" class="ov-part-btn" aria-label="${escHtml(label)}" onclick="openParticipationPicker(this, ${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')})">${val ? partSignHTML(val) : '<span class="ov-empty" aria-hidden="true">–</span>'}</button>
        </td>`;
      });
      html += `</tr>`;
    });

  } else if (currentOverviewTab === 'attendance') {
    // Eine Spalte pro Tag; die Bezeichnung einer angelegten Spalte steht dabei (BUGS L2)
    const attEventsMap = new Map();
    (group.attendanceEvents || []).forEach(ev => {
      const col = attEventsMap.get(ev.date);
      if (!col) attEventsMap.set(ev.date, { date: ev.date, label: ev.label || '' });
      else if (!col.label) col.label = ev.label || '';
    });
    sortedStudents.forEach(s => {
      (s.attendance || []).forEach(a => { if (!attEventsMap.has(a.date)) attEventsMap.set(a.date, { date: a.date, label: '' }); });
    });
    const attDates = Array.from(attEventsMap.values()).filter(inRange).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th class="ov-sum-col" title="Fehltage unentschuldigt (F) / entschuldigt (E), ohne zu spät (Z)"><span class="ov-wide-only">Fehlt </span>F / E</th>';
    attDates.forEach(ev => {
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})">${overviewColHead(ev.date, ev.label)}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      // Wie im Reiter Schüler: F / E, nur unentschuldigte rot (AH24)
      const missF = periodList(s.attendance, range).filter(a => a.type === 'abwesend').length;
      const missE = periodList(s.attendance, range).filter(a => a.type === 'entschuldigt').length;
      html += `<td class="ov-sum-col ov-sum"><span${missF ? ' class="n-bad"' : ''}>${missF}</span> <span class="sep">/</span> <span>${missE}</span></td>`;

      attDates.forEach(ev => {
        const aIdx = (s.attendance||[]).findIndex(x => x.date === ev.date);
        const status = aIdx !== -1 ? s.attendance[aIdx].type : ''; // 'abwesend', 'entschuldigt', 'zuspät'
        const displayVal = ATTENDANCE_SHORT[status] || '';
        // Antippen schaltet weiter – → F → E → Z → – (AH24 e); am Laptop F/E/Z/Entf tippbar
        const label = `Fehlzeit ${studentListName(s)}, ${formatWeekdayShort(ev.date)}: ${{ abwesend: 'fehlt', entschuldigt: 'entschuldigt', 'zuspät': 'zu spät' }[status] || 'da'}`;
        html += `<td class="ov-cycle-cell"><button type="button" class="ov-cycle-btn${status === 'abwesend' ? ' is-bad' : ''}" data-kind="att" data-sid="${escHtml(s.id)}" data-date="${escHtml(ev.date)}" aria-label="${escHtml(label)}" onclick="cycleInlineAttendance(${jsArg(s.id)}, ${jsArg(ev.date)})">${displayVal}</button></td>`;
      });
      html += `</tr>`;
    });
  } else if (currentOverviewTab === 'homework') {
    const hwEventsMap = new Map();
    (group.homeworkEvents || []).forEach(ev => hwEventsMap.set(`${ev.date}_${ev.label||''}`, { date: ev.date, label: ev.label||'' }));
    sortedStudents.forEach(s => {
      (s.homework || []).forEach(h => hwEventsMap.set(`${h.date}_${h.note||''}`, { date: h.date, label: h.note||'' }));
    });
    const hwDates = Array.from(hwEventsMap.values()).filter(inRange).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th class="ov-sum-col" title="Wie oft die Hausaufgaben gefehlt haben">Vergessen</th>';
    hwDates.forEach(ev => {
      html += `<th${overviewTodayClass(ev.date)} style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal(${jsArg(ev.date)}, ${jsArg(ev.label)})">${overviewColHead(ev.date, ev.label)}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td class="ov-name-col ov-name" role="button" tabindex="0" onclick="openQuickRatingFromTable(${jsArg(s.id)})"><span class="ov-name-text" title="${escHtml(studentListName(s))}">${escHtml(studentListName(s))}</span></td>`;
      const totalMissed = periodList(s.homework, range).length;
      html += `<td class="ov-sum-col" style="text-align:center;font-weight:600;color:${totalMissed ? 'var(--danger)' : 'var(--text-muted)'};">${totalMissed}</td>`;

      hwDates.forEach(ev => {
        const hIdx = (s.homework||[]).findIndex(x => x.date === ev.date && (x.note||'') === (ev.label||''));
        const hasMissed = hIdx !== -1;
        const label = `Hausaufgabe ${studentListName(s)}, ${formatWeekdayShort(ev.date)}: ${hasMissed ? 'vergessen' : 'da'}`;
        html += `<td class="ov-cycle-cell"><button type="button" class="ov-cycle-btn is-bad" data-kind="hw" data-sid="${escHtml(s.id)}" data-date="${escHtml(ev.date)}" data-label="${escHtml(ev.label || '')}" aria-label="${escHtml(label)}" onclick="cycleInlineHomework(${jsArg(s.id)}, ${jsArg(ev.date)}, ${jsArg(ev.label||'')})">${hasMissed ? 'X' : ''}</button></td>`;
      });
      html += `</tr>`;
    });
  }

  html += '</tbody></table></div>';
  // Erklärzeile auf jedem Reiter, damit die Tabelle überall an derselben Stelle beginnt (AH40)
  const legend = {
    grades: '<span>Antippen zum Eintragen</span><span>Ø = Schnitt mit Gewichtung</span>',
    participation: `<span class="ov-hint-wide">Antippen wählt:</span>${PART_LEVELS.map(l => `<span>${partSignHTML(l.value)} ${l.word}</span>`).join('')}`,
    attendance: '<span class="ov-hint-wide">Antippen schaltet weiter:</span><span class="ov-hint-wide">leer = da</span><span><b>F</b> fehlt</span><span><b>E</b> entschuldigt</span><span><b>Z</b> zu spät</span>',
    homework: '<span>Antippen: <b>X</b> = Hausaufgabe vergessen</span>',
  }[currentOverviewTab];
  content.innerHTML = `<div class="ov-legend">${legend}</div>` + html;
  const wrapEl = content.querySelector('.overview-table-wrapper');
  if (wrapEl) {
    wrapEl.addEventListener('scroll', () => {   // Wischen schließt die Auswahl; das späte Scroll-Ereignis vom Springen zur neuesten Spalte nicht
      if (ovPartPicker && (wrapEl.scrollLeft !== ovPartPicker.left || wrapEl.scrollTop !== ovPartPicker.top)) closeParticipationPicker();
    }, { passive: true });
    const tableEl = wrapEl.querySelector('table');
    tableEl.style.setProperty('--ov-cols', tableEl.querySelectorAll('thead th').length - 2);   // für die Mindestbreite (AH40)
    fitOverviewColumns();
    if (keepScroll) { wrapEl.scrollLeft = keepScroll.left; wrapEl.scrollTop = keepScroll.top; content.scrollTop = keepScroll.outer; }
    else wrapEl.scrollLeft = wrapEl.scrollWidth;   // neu geöffnet: neueste Spalte (rechts) zeigen (AH24)
  }
  overviewRenderedKey = renderKey;
  restoreOverviewFocus(content);
}

// Neu zeichnen nimmt der Zelle, in die man gerade tippt/tabbt, den Fokus (auf dem iPad geht die Tastatur zu).
// Deshalb merken wir uns beim Antippen bzw. bei Tab, wohin der Fokus soll, und setzen ihn nach dem Zeichnen
// wieder an dieselbe Stelle (BUGS Q3). Enter hat seine eigene Behandlung (L6).
let overviewFocusTarget = null; // { row, col, at }
let overviewCommittedInput = null; // Feld, dessen Eingabe Enter/Tab gerade per change übernimmt
function overviewCellPos(el) {
  const cell = el && el.closest('#overview-content td');
  if (!cell) return null;
  const rows = [...document.querySelectorAll('#overview-content tbody tr')];
  const row = rows.indexOf(cell.parentElement);
  return row === -1 ? null : { row, col: [...cell.parentElement.children].indexOf(cell), at: Date.now() };
}
function restoreOverviewFocus(content) {
  const t = overviewFocusTarget;
  overviewFocusTarget = null;
  if (!t || Date.now() - t.at > 1000) return;
  const row = content.querySelectorAll('tbody tr')[t.row];
  const el = row && row.children[t.col] && row.children[t.col].querySelector('input, button');
  if (!el) return;
  el.focus();
  if (el.select) el.select();
}

// Schnellbewertung aus der Tabelle: Datum erst beim Tippen bestimmen – die Tabelle kann über Nacht offen
// gewesen sein (Regel 24); am Wochenende der nächste Schultag (Regel 17, BUGS S4)
function openQuickRatingFromTable(studentId) {
  // Heute bzw. letzter Schultag (Wochenende, Ferien) – nie ein Tag in der Zukunft (Regel 58, R3)
  openSeatingStudentModal(studentId, currentOverviewGroupId, profileDefaultDate());
}

// ─── Inline Updates ────────────────────────────────────────────────────────
// Kürzel in der Anwesenheits-Tabelle (Eingabe und Anzeige)
const ATTENDANCE_SHORT = { abwesend: 'F', entschuldigt: 'E', 'zuspät': 'Z' };
// Pro Schüler und Tag höchstens einer dieser Einträge
const DAY_ATTENDANCE_TYPES = ['abwesend', 'entschuldigt', 'zuspät'];

function updateInlineGrade(studentId, date, label, value, type = 'test', nth = 0) {
  value = value.trim();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.grades) s.grades = [];

  const grade = findColumnGrade(s, { date, label, type, nth });
  // Weitere Spalte gleichen Namens (nth > 0), aber in den vorigen fehlt noch etwas: Die Note landete nach dem
  // Neuzeichnen in der ersten Spalte (BUGS U7)
  if (!grade && value && nth > 0 && !findColumnGrade(s, { date, label, type, nth: nth - 1 })) {
    showToast('Bitte zuerst die erste Spalte „' + label + '“ ausfüllen. Gleichnamige Spalten füllen sich von links', 'error');
    renderOverviewTable();
    return;
  }

  if (!value) {
    if (grade) s.grades.splice(s.grades.indexOf(grade), 1);
  } else {
    const scale = gradeScale(currentOverviewGroupId);
    // Wie im Notenformular: Text ohne Ziffern („+“, „n. b.“) bleibt stehen und zählt nicht (BUGS B, Q13)
    const parsed = parseGradeInput(value, scale);
    if (!parsed) {
      showToast(scale.inputError, 'error');
      renderOverviewTable(); // Reset input
      return;
    }
    if (parsed.number === null) showToast(`„${parsed.value}“ gespeichert, zählt nicht im Schnitt`);
    const finalValue = parsed.value;
    if (grade) {
      grade.value = finalValue; // Typ gehört zur Spalte und bleibt (BUGS K4)
    } else {
      s.grades.push({ type: type, value: finalValue, date: date, note: label });
    }
  }
  saveDB();
  renderOverviewTable(); // Rerender to update averages and colors
}

// Mitarbeit in der Tabelle (AH24 e): Antippen öffnet eine kleine Auswahl ++ + − −− leer neben dem Feld (AH52)
let ovPartPicker = null;   // { btn, left, top }: Scroll-Stelle der Tabelle beim Öffnen
function closeParticipationPicker() {
  const p = document.getElementById('ov-part-pop');
  if (p) p.remove();
  ovPartPicker = null;
}
function openParticipationPicker(btn, studentId, date, label) {
  closeParticipationPicker();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s || !btn) return;
  const cur = (s.participation || []).find(p => p.date === date && (p.label || '') === (label || ''));
  const curVal = cur ? cur.value : '';
  const opts = [...PART_LEVELS.map(l => [l.value, partSignHTML(l.value), l.word]), ['', 'leer', 'leer']];
  const pop = document.createElement('div');
  pop.id = 'ov-part-pop';
  pop.className = 'ov-part-pop';
  pop.setAttribute('role', 'group');
  pop.setAttribute('aria-label', `Mitarbeit ${studentListName(s)}, ${formatWeekdayShort(date)}`);
  pop.innerHTML = opts.map(([v, face, name]) => `<button type="button" class="${curVal === v ? 'on' : ''}${v ? '' : ' is-clear'}" data-val="${v}" aria-label="${name}">${face}</button>`).join('');
  document.body.appendChild(pop);
  pop.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    closeParticipationPicker();
    setInlineParticipation(studentId, date, label, b.dataset.val || null);
  }));
  const r = btn.getBoundingClientRect();
  const w = pop.offsetWidth || 220, h = pop.offsetHeight || 60;
  const left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8));
  const top = r.bottom + 4 + h > window.innerHeight - 8 ? r.top - h - 4 : r.bottom + 4;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
  const wrap = btn.closest('.overview-table-wrapper');
  ovPartPicker = { btn, left: wrap ? wrap.scrollLeft : 0, top: wrap ? wrap.scrollTop : 0 };
  // Mit Tastatur den Fokus in die Auswahl, mit dem Finger nicht (sonst steht ein Fokusrahmen da)
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const focusEl = pop.querySelector('button.on') || pop.querySelector('button');
  if (!coarse) try { focusEl.focus({ preventScroll: true }); } catch (e) { /* nicht fokussierbar */ }
}
function setInlineParticipation(studentId, date, label, value) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.participation) s.participation = [];
  const cur = s.participation.find(p => p.date === date && (p.label || '') === (label || ''));
  if (value) {
    if (cur) cur.value = value;
    else s.participation.push({ id: uid(), date, label: label || '', value });
  } else if (cur) {
    s.participation.splice(s.participation.indexOf(cur), 1);
    const gid = currentOverviewGroupId;
    showUndoToast(`Mitarbeit am ${formatWeekdayShort(date)} entfernt`, () => restoreSeatingEntry(gid, s, 'participation', cur));
  } else return;
  saveDB();
  renderOverviewTable();
}

// Fehlzeiten/HA per Antippen (AH24 e). Umschalten behält den Eintrag samt Grund (Regel 50); Entfernen bietet
// „Rückgängig“ (Regel 45)
const ATT_CYCLE = ['', 'F', 'E', 'Z'];
function setAttendanceWithUndo(studentId, date, letter) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  const before = (s.attendance || []).find(a => a.date === date);
  updateInlineAttendance(studentId, date, letter);
  if (before && !letter && !(s.attendance || []).includes(before)) {
    const gid = currentOverviewGroupId;
    showUndoToast(`Fehlzeit am ${formatWeekdayShort(date)} entfernt`, () => restoreSeatingEntry(gid, s, 'attendance', before,
      () => { if (before.type === 'abwesend') addAbsenceNote(gid, date, s); }));
  }
}
function cycleInlineAttendance(studentId, date) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  const cur = (s.attendance || []).find(a => a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  const next = ATT_CYCLE[(ATT_CYCLE.indexOf(cur ? ATTENDANCE_SHORT[cur.type] : '') + 1) % ATT_CYCLE.length];
  setAttendanceWithUndo(studentId, date, next);
}
function cycleInlineHomework(studentId, date, label) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  const cur = (s.homework || []).find(h => h.date === date && (h.note || '') === (label || ''));
  if (!cur) { updateInlineHomework(studentId, date, label, 'X'); return; }
  updateInlineHomework(studentId, date, label, '');
  const gid = currentOverviewGroupId;
  showUndoToast(`Hausaufgabe am ${formatWeekdayShort(date)} entfernt`, () => restoreSeatingEntry(gid, s, 'homework', cur));
}

function updateInlineAttendance(studentId, date, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];
  // Doppelte Tageseinträge aus Altdaten (Q2, W4, Q6) zu einem zusammenfassen, Gründe bleiben (AR14, Regel 50)
  const day = s.attendance.filter(a => a && a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  const wasUnexcusedAny = day.some(a => a.type === 'abwesend');
  if (day.length > 1) {
    const notes = [...new Set(day.map(a => String(a.note || '').trim()).filter(Boolean))];
    day[0].note = notes.join(' / ');
    day.slice(1).forEach(a => s.attendance.splice(s.attendance.indexOf(a), 1));
  }
  const idx = s.attendance.findIndex(a => a.date === date && DAY_ATTENDANCE_TYPES.includes(a.type));
  
  const status = Object.keys(ATTENDANCE_SHORT).find(t => ATTENDANCE_SHORT[t] === value) || null;

  // Nur ein leeres Feld löscht. Ein Tippfehler („U“ statt „E“) darf den Eintrag samt Grund nicht still entfernen (BUGS K5).
  if (value && !status) {
    showToast('Bitte F, E oder Z eingeben (leer = Eintrag löschen)', 'error');
    renderOverviewTable(); // Eingabe zurücksetzen
    return;
  }
  const wasUnexcused = wasUnexcusedAny;
  if (!status) {
    if (idx !== -1) s.attendance.splice(idx, 1);
  } else {
    if (idx !== -1) {
      s.attendance[idx].type = status;
    } else {
      s.attendance.push({ id: uid(), date, type: status, note: '' });
    }
  }
  // Hinweis „… hat letzte Stunde unentschuldigt gefehlt“ wie im Sitzplan pflegen (BUGS L3, Regel 25)
  if (wasUnexcused && status !== 'abwesend') removeAbsenceNote(currentOverviewGroupId, date, s);
  if (!wasUnexcused && status === 'abwesend') addAbsenceNote(currentOverviewGroupId, date, s);
  saveDB();
  renderOverviewTable();
}

function updateInlineHomework(studentId, date, label, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];

  const idx = s.homework.findIndex(h => h.date === date && (h.note||'') === (label||''));
  // Nur ein leeres Feld löscht (Regel 36, BUGS Q9)
  if (value && value !== 'X' && value !== 'HA') {
    showToast('Bitte X eingeben (leer = Eintrag löschen)', 'error');
    renderOverviewTable(); // Eingabe zurücksetzen
    return;
  }
  if (value) {
    if (idx === -1) s.homework.push({ date: date, id: uid(), note: label||'' });
  } else {
    if (idx !== -1) s.homework.splice(idx, 1);
  }
  saveDB();
  renderOverviewTable();
}

// Notentyp in einer Auswahlliste setzen. Fehlt er dort (Spalten-Dialog kennt nur Test/KA, Altdaten „klausur“),
// wird er vorübergehend ergänzt – sonst liest das Feld '' und das Speichern löscht den Typ (BUGS K3).
function setGradeTypeSelect(select, type) {
  select.querySelectorAll('option[data-extra]').forEach(o => o.remove());
  if (![...select.options].some(o => o.value === type)) {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = gradeTypeName(type);
    opt.dataset.extra = '1';
    select.appendChild(opt);
  }
  select.value = type;
}

// Spalten der Notentabelle: Datum + Titel + Typ (BUGS K4). Noten ohne Titel heißen wie ihr Typ.
// Hat ein Schüler mehrere Noten in derselben Spalte, bekommt jede weitere eine eigene (nth = 1, 2, …),
// statt unsichtbar mitzuzählen.
function gradeColumnLabel(g) { return g.note ?? gradeTypeLabel(g.type); }
function gradeColumnType(type) { return type || 'test'; }
function gradeInColumn(g, col) {
  return g.date === col.date && gradeColumnLabel(g) === col.label && gradeColumnType(g.type) === gradeColumnType(col.type);
}
function findColumnGrade(s, col) {
  let n = col.nth || 0;
  return (s.grades || []).find(g => gradeInColumn(g, col) && n-- === 0) || null;
}
function gradeColumns(group, students) {
  const cols = new Map();
  const keyOf = (date, label, type, nth) => JSON.stringify([date, label, gradeColumnType(type), nth]);
  (group.gradeEvents || []).forEach(ev => {
    cols.set(keyOf(ev.date, ev.label, ev.type, 0), { date: ev.date, label: ev.label, type: gradeColumnType(ev.type), nth: 0 });
  });
  students.forEach(s => {
    const seen = {};
    (s.grades || []).forEach(g => {
      const label = gradeColumnLabel(g);
      const base = keyOf(g.date, label, g.type, 0);
      const nth = seen[base] = base in seen ? seen[base] + 1 : 0;
      const key = keyOf(g.date, label, g.type, nth);
      if (!cols.has(key)) cols.set(key, { date: g.date, label, type: gradeColumnType(g.type), nth });
    });
  });
  return [...cols.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Column Management ───────────────────────────────────────────────────
let editingColumnCtx = null;

function openAddColumnModal() {
  editingColumnCtx = null;
  document.getElementById('column-modal-title').textContent = 'Neue Spalte';
  document.getElementById('btn-delete-column').classList.add('hidden');
  document.getElementById('new-col-date').value = profileDefaultDate();   // Wochenende/Ferien: letzter Schultag (AR5)
  document.getElementById('new-col-label').value = '';
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    setGradeTypeSelect(document.getElementById('new-col-type'), 'test');
  } else {
    document.getElementById('new-col-type-group').style.display = 'none';
  }
  
  openModal('modal-add-column');
  setTimeout(() => document.getElementById('new-col-label').focus(), 80);
}

function openEditColumnModal(oldDate, oldLabel, oldType, nth = 0) {
  editingColumnCtx = { oldDate, oldLabel, oldType: gradeColumnType(oldType), nth };
  document.getElementById('column-modal-title').textContent = 'Spalte bearbeiten';
  document.getElementById('btn-delete-column').classList.remove('hidden');
  document.getElementById('new-col-date').value = oldDate;
  document.getElementById('new-col-label').value = oldLabel;
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    setGradeTypeSelect(document.getElementById('new-col-type'), oldType || 'test');
  } else {
    document.getElementById('new-col-type-group').style.display = 'none';
  }
  
  openModal('modal-add-column');
}

function saveOverviewColumn() {
  const newDate = document.getElementById('new-col-date').value;
  if (!newDate) { showToast('Bitte Datum wählen', 'error'); return; }
  const newLabel = document.getElementById('new-col-label').value.trim();
  const type = document.getElementById('new-col-type').value;

  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];

  // Zwei Notenspalten mit gleichem Datum, Titel und Typ würden verschmelzen (BUGS K4)
  if (currentOverviewTab === 'grades') {
    const ctx = editingColumnCtx;
    const same = (c, d, l, t) => c.date === d && c.label === l && c.type === gradeColumnType(t);
    const clash = gradeColumns(group, students).some(c => c.nth === 0 && same(c, newDate, newLabel, type)
      && !(ctx && same(c, ctx.oldDate, ctx.oldLabel, ctx.oldType)));
    if (clash) { showToast('Diese Spalte gibt es schon (gleiches Datum, gleicher Titel und Typ)', 'error'); return; }
  } else {
    // Mitarbeit/HA: Spalte = Datum + Titel, Anwesenheit: Datum. Eine zweite Spalte gleichen Schlüssels ließe
    // Einträge verschmelzen (doppelt zählen, nur einer löschbar; BUGS Q6)
    const keyOf = (d, l) => currentOverviewTab === 'attendance' ? d : `${d}_${l || ''}`;
    const newKey = keyOf(newDate, newLabel);
    const ctx = editingColumnCtx;
    if (!ctx || keyOf(ctx.oldDate, ctx.oldLabel) !== newKey) {
      if (overviewColumnKeys(group, students).has(newKey)) {
        showToast('Diese Spalte gibt es schon (gleiches Datum' + (currentOverviewTab === 'attendance' ? ')' : ' und gleicher Titel)'), 'error');
        return;
      }
    }
  }

  if (!editingColumnCtx) {
    // Add logic
    if (currentOverviewTab === 'grades') {
      if (!group.gradeEvents) group.gradeEvents = [];
      group.gradeEvents.push({ date: newDate, label: newLabel, type: type });
    } else if (currentOverviewTab === 'participation') {
      if (!group.participationEvents) group.participationEvents = [];
      group.participationEvents.push({ date: newDate, label: newLabel });
    } else if (currentOverviewTab === 'attendance') {
      if (!group.attendanceEvents) group.attendanceEvents = [];
      group.attendanceEvents.push({ date: newDate, label: newLabel });
    } else if (currentOverviewTab === 'homework') {
      if (!group.homeworkEvents) group.homeworkEvents = [];
      group.homeworkEvents.push({ date: newDate, label: newLabel });
    }
  } else {
    // Edit logic
    const { oldDate, oldLabel, oldType, nth } = editingColumnCtx;
    let events = [];
    if (currentOverviewTab === 'grades') events = group.gradeEvents || [];
    if (currentOverviewTab === 'participation') events = group.participationEvents || [];
    if (currentOverviewTab === 'attendance') events = group.attendanceEvents || [];
    if (currentOverviewTab === 'homework') events = group.homeworkEvents || [];
    
    const evIdx = events.findIndex(e => e.date === oldDate && e.label === oldLabel
      && (currentOverviewTab !== 'grades' || gradeColumnType(e.type) === oldType));
    if (evIdx !== -1) {
      events[evIdx].date = newDate;
      events[evIdx].label = newLabel;
      if (currentOverviewTab === 'grades') events[evIdx].type = type;
    } else {
      const newEv = { date: newDate, label: newLabel };
      if (currentOverviewTab === 'grades') newEv.type = type;
      events.push(newEv);
      if (currentOverviewTab === 'grades') group.gradeEvents = events;
      if (currentOverviewTab === 'participation') group.participationEvents = events;
      if (currentOverviewTab === 'attendance') group.attendanceEvents = events;
      if (currentOverviewTab === 'homework') group.homeworkEvents = events;
    }

    students.forEach(s => {
      if (currentOverviewTab === 'grades') {
        const grade = findColumnGrade(s, { date: oldDate, label: oldLabel, type: oldType, nth });
        if (grade) { grade.date = newDate; grade.note = newLabel; grade.type = type; }
      } else if (currentOverviewTab === 'participation') {
        const pIdx = (s.participation||[]).findIndex(p => p.date === oldDate && (p.label||'') === (oldLabel||''));
        if (pIdx !== -1) { s.participation[pIdx].date = newDate; s.participation[pIdx].label = newLabel; }
      } else if (currentOverviewTab === 'attendance') {
        const aIdx = (s.attendance||[]).findIndex(a => a.date === oldDate);
        if (aIdx !== -1) {
          const a = s.attendance[aIdx];
          // Fehl-Hinweis wandert mit in die Stunde nach dem neuen Datum (Regel 25, BUGS U5)
          if (a.type === 'abwesend' && newDate !== oldDate) removeAbsenceNote(currentOverviewGroupId, oldDate, s);
          a.date = newDate;
          if (a.type === 'abwesend' && newDate !== oldDate) addAbsenceNote(currentOverviewGroupId, newDate, s);
        }
      } else if (currentOverviewTab === 'homework') {
        const hIdx = (s.homework||[]).findIndex(h => h.date === oldDate && (h.note||'') === (oldLabel||''));
        if (hIdx !== -1) { s.homework[hIdx].date = newDate; s.homework[hIdx].note = newLabel; }
      }
    });
  }

  saveDB();
  closeModal('modal-add-column');
  revealPeriodOf(newDate);
  renderOverviewTable();
}

// Schlüssel der vorhandenen Spalten im aktuellen Reiter (außer Noten): angelegte Spalten und Einträge
function overviewColumnKeys(group, students) {
  const keys = new Set();
  const tab = currentOverviewTab;
  if (tab === 'attendance') {
    (group.attendanceEvents || []).forEach(e => keys.add(e.date));
    students.forEach(st => (st.attendance || []).forEach(a => keys.add(a.date)));
  } else if (tab === 'participation') {
    (group.participationEvents || []).forEach(e => keys.add(`${e.date}_${e.label || ''}`));
    students.forEach(st => (st.participation || []).forEach(p => keys.add(`${p.date}_${p.label || ''}`)));
  } else if (tab === 'homework') {
    (group.homeworkEvents || []).forEach(e => keys.add(`${e.date}_${e.label || ''}`));
    students.forEach(st => (st.homework || []).forEach(h => keys.add(`${h.date}_${h.note || ''}`)));
  }
  return keys;
}

// Spalte samt ihren Einträgen löschen, nach Rückfrage mit Anzahl (BUGS L5). Gelöscht wird per Referenz.
function deleteOverviewColumn() {
  const ctx = editingColumnCtx;
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  if (!ctx || !group) return;
  const tab = currentOverviewTab;
  const students = db.students[currentOverviewGroupId] || [];
  const { oldDate: date, oldLabel: label, oldType, nth } = ctx;
  const sameLabel = (a, b) => (a || '') === (b || '');
  const COLUMN_KINDS = {
    grades: {
      list: 'grades', events: 'gradeEvents', nouns: ['Note', 'Noten'],
      entries: s => { const g = findColumnGrade(s, { date, label, type: oldType, nth }); return g ? [g] : []; },
      isEvent: e => e.date === date && e.label === label && gradeColumnType(e.type) === oldType,
    },
    attendance: {
      list: 'attendance', events: 'attendanceEvents', nouns: ['Fehlzeit', 'Fehlzeiten'],
      entries: s => (s.attendance || []).filter(a => a.date === date),
      isEvent: e => e.date === date,
    },
    participation: {
      list: 'participation', events: 'participationEvents', nouns: ['Mitarbeit-Eintrag', 'Mitarbeit-Einträge'],
      entries: s => (s.participation || []).filter(p => p.date === date && sameLabel(p.label, label)),
      isEvent: e => e.date === date && sameLabel(e.label, label),
    },
    homework: {
      list: 'homework', events: 'homeworkEvents', nouns: ['Eintrag', 'Einträge'],
      entries: s => (s.homework || []).filter(h => h.date === date && sameLabel(h.note, label)),
      isEvent: e => e.date === date && sameLabel(e.label, label),
    },
  };
  const kind = COLUMN_KINDS[tab];
  if (!kind) return;
  const found = students.map(s => [s, kind.entries(s)]);
  const n = found.reduce((sum, [, list]) => sum + list.length, 0);
  const title = formatDateShort(date) + (label ? ` „${label}“` : '');
  const msg = n
    ? `Spalte ${title} löschen?\n\nDamit werden ${n} ${n === 1 ? kind.nouns[0] : kind.nouns[1]} gelöscht. Das lässt sich nicht rückgängig machen.`
    : `Leere Spalte ${title} löschen?`;
  if (!confirm(msg)) return;

  found.forEach(([s, list]) => list.forEach(entry => {
    const arr = s[kind.list];
    const idx = arr.indexOf(entry);
    if (idx === -1) return;
    arr.splice(idx, 1);
    if (tab === 'attendance' && entry.type === 'abwesend') removeAbsenceNote(currentOverviewGroupId, entry.date, s);
  }));
  if (group[kind.events]) group[kind.events] = group[kind.events].filter(e => !kind.isEvent(e));
  saveDB();
  editingColumnCtx = null;
  closeModal('modal-add-column');
  renderOverviewTable();
  showToast('Spalte gelöscht');
}
let currentGradeFormCtx = null; // { studentId, groupId, grade } – grade = Objekt-Referenz (null = neue Note)

// Vorhandene Titel der Klasse vorschlagen (BUGS U2); auch für die schnelle Note im Schüler-Fenster (AR10)
function fillGradeTitleList(groupId) {
  const group = db.groups.find(g => g.id === groupId);
  const titles = new Set([...(group && group.gradeEvents || []).map(e => e.label || ''),
    ...(db.students[groupId] || []).flatMap(st => (st.grades || []).map(g => g.note || ''))]);
  titles.delete('');
  document.getElementById('gf-column-titles').innerHTML = [...titles].sort().map(t => `<option value="${escHtml(t)}"></option>`).join('');
}
function openGradeForm(studentId, groupId, gradeIdx, defaultDateStr = '', defaultLabel = '') {
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  // Referenz statt Index merken: der Index kann sich verschieben, solange das Formular offen ist
  currentGradeFormCtx = { studentId, groupId, grade: (gradeIdx >= 0 && s.grades && s.grades[gradeIdx]) || null };

  // Hide the quick student modal if it's open, so they don't overlap awkwardly
  const seatingModal = document.getElementById('modal-seating-student');
  if (!seatingModal.classList.contains('hidden')) {
    commitSeatingStudentForm(); // eingetippten Hinweis/Notiz sichern, bevor das Fenster (ohne closeModal) verschwindet
    seatingModal.classList.add('hidden');
    currentGradeFormCtx.wasSeatingModalOpen = true;
    currentGradeFormCtx.returnFocus = modalReturnFocus['modal-seating-student'] || null;   // Auslöser merken (W14)
  }


  fillGradeTitleList(groupId);

  const scale = gradeScale(groupId);
  document.getElementById('gf-value-label').textContent = scale.inputLabel;
  document.getElementById('gf-value').placeholder = scale.placeholder;

  const btnDelete = document.getElementById('gf-btn-delete');
  if (currentGradeFormCtx.grade) {
    const g = currentGradeFormCtx.grade;
    document.getElementById('grade-form-title').textContent = 'Note bearbeiten';
    setGradeTypeSelect(document.getElementById('gf-type'), g.type || 'test');
    document.getElementById('gf-value').value = gradeText(g.value || ''); // mit Komma wie überall (BUGS U10)
    document.getElementById('gf-date').value = g.date || formatDate(new Date());
    document.getElementById('gf-label').value = g.note || '';
    btnDelete.style.display = 'block';
  } else {
    document.getElementById('grade-form-title').textContent = 'Neue Note';
    setGradeTypeSelect(document.getElementById('gf-type'), 'test');
    document.getElementById('gf-value').value = '';
    document.getElementById('gf-date').value = defaultDateStr || formatDate(new Date());
    document.getElementById('gf-label').value = defaultLabel || '';
    btnDelete.style.display = 'none';
  }
  gradeFormSnapshot = gradeFormState(); // Vergleich für „Verwerfen?“ (BUGS S7)
  openModal('modal-grade-form');
}

// Abbrechen, ✕, Escape, daneben tippen: eine eingetippte Note nicht still verwerfen (Regel 27, BUGS S7)
function cancelGradeForm() {
  if (gradeFormSnapshot !== null && gradeFormState() !== gradeFormSnapshot && !confirm('Die Note ist noch nicht gespeichert.\n\nVerwerfen?')) return;
  closeGradeForm();
}
function gradeFormState() {
  return ['gf-type', 'gf-value', 'gf-date', 'gf-label'].map(id => document.getElementById(id).value).join('\u0000');
}
function closeGradeForm() {
  closeModal('modal-grade-form');
  // Kontext sofort vergessen: closeGradeForm wird auch aufgerufen, wenn das Formular gar nicht offen ist
  // (z. B. aus dem Dashboard) – sonst öffnet sich später ein altes Schüler-Fenster erneut (BUGS E5)
  const ctx = currentGradeFormCtx;
  currentGradeFormCtx = null;
  if (ctx) {
    if (ctx.wasSeatingModalOpen && window.currentSeatingStudent) {
      const { studentId, groupId } = ctx;
      // Fenster wieder öffnen, „Mehr“ und „Anzeigen“ wie vorher (AH28)
      openSeatingStudentModal(studentId, groupId, window.currentSeatingStudent.dateStr, { keep: true, keepDay: true });
      if (ctx.returnFocus) modalReturnFocus['modal-seating-student'] = ctx.returnFocus;   // Schließen führt zum Auslöser zurück (W14)
    }
  }
}

// Notenformular: Note der offenen Form im aktuellen db-Stand suchen (per Referenz, nie per Index)
function findGradeFormTarget() {
  if (!currentGradeFormCtx) return null;
  const { studentId, groupId, grade } = currentGradeFormCtx;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return null;
  const idx = grade ? (s.grades || []).indexOf(grade) : -1;
  return { s, groupId, idx, isEdit: !!grade };
}

function saveGradeFromForm() {
  const target = findGradeFormTarget();
  if (!target) { showToast('Schüler nicht gefunden, Note nicht gespeichert', 'error'); return; }
  const { s, groupId, idx, isEdit } = target;
  if (isEdit && idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync). Bitte neu öffnen', 'error'); return; }

  const type = document.getElementById('gf-type').value;
  const value = document.getElementById('gf-value').value.trim();
  const dateStr = document.getElementById('gf-date').value;
  const label = document.getElementById('gf-label').value.trim();

  if (!value) { showToast('Bitte einen Wert eingeben', 'error'); return; }
  if (!dateStr) { showToast('Bitte ein Datum wählen', 'error'); return; } // sonst Spalte ohne Kopf (BUGS Q12)
  const scale = gradeScale(groupId);
  const parsed = parseGradeInput(value, scale);
  if (!parsed) { showToast(scale.inputError, 'error'); return; }

  if (!s.grades) s.grades = [];
  const entry = { type, value: parsed.value, date: dateStr, note: label };
  // Note ohne Titel bleibt ohne Titel: sonst wandert sie in der Tabelle in eine andere Spalte (Titel '' statt Typ)
  if (isEdit && !label && s.grades[idx].note === undefined) delete entry.note;
  if (isEdit) {
    s.grades[idx] = entry;
    showToast('Note aktualisiert');
  } else {
    s.grades.push(entry);
    showToast('Note hinzugefügt');
  }

  saveDB();
  closeGradeForm();
  revealPeriodOf(dateStr);
  refreshGradeViews(s, groupId);
}

function deleteGradeFromForm() {
  const target = findGradeFormTarget();
  if (!target || !target.isEdit) return;
  const { s, groupId, idx } = target;
  if (idx === -1) { showToast('Diese Note gibt es nicht mehr (z. B. durch Sync). Bitte neu öffnen', 'error'); return; }

  const [removed] = s.grades.splice(idx, 1);
  saveDB();
  closeGradeForm();
  refreshGradeViews(s, groupId);
  // „Löschen“ steht direkt neben „Abbrechen“: Rückgängig statt endgültig (BUGS U3)
  showUndoToast('Note gelöscht', () => restoreSeatingEntry(groupId, s, 'grades', removed));
}

// ─── Notenskala pro Klasse (BUGS H7) ─────────────────────────────────────
// group.gradeScale: fehlt/unbekannt = '1-6' (auch alle bestehenden Klassen), '0-15' = Punkte (Oberstufe).
// Bei Punkten gilt „höher = besser“. Alles, was Noten prüft, färbt oder bewertet, fragt die Skala der Klasse.
const GRADE_SCALES = {
  '1-6':  { id: '1-6',  min: 1, max: 6,  higherIsBetter: false, integer: false, unit: '',       label: 'Noten 1–6',
            inputLabel: 'Note / Wert (z. B. 1, 2,5, 2-, +)', placeholder: 'z. B. 1 oder +',
            inputError: 'Bitte eine Note zwischen 1 und 6 eingeben (z. B. 2, 2,5 oder 2-)' },
  '0-15': { id: '0-15', min: 0, max: 15, higherIsBetter: true,  integer: true,  unit: 'Punkte', label: 'Punkte 0–15 (Oberstufe)',
            inputLabel: 'Punkte (0–15) oder Text wie +', placeholder: 'z.B. 11',
            inputError: 'Bitte ganze Punkte zwischen 0 und 15 eingeben (z. B. 11)' },
};
// Skala zu einer Klasse (Objekt oder ID)
function gradeScale(groupOrId) {
  const g = typeof groupOrId === 'string' ? db.groups.find(x => x.id === groupOrId) : groupOrId;
  return GRADE_SCALES[g && g.gradeScale] || GRADE_SCALES['1-6'];
}
// Schnitt zur Anzeige ('–' ohne Noten); Punkte und Noten mit 1 Nachkomma
// Anzeige mit deutschem Komma (BUGS I14). Gespeichert und gerechnet wird weiter mit Punkt.
function formatGradeAverage(avg, digits = 1) {
  if (avg === null || avg === undefined || isNaN(avg)) return '–';
  // Kaufmännisch runden (,x5 immer auf), nicht toFixed: 2,15 liegt intern bei 2,1499… (AR1)
  const f = 10 ** digits, scaled = Number((smoothAverage(avg) * f).toPrecision(12));
  return (Math.sign(scaled) * Math.round(Math.abs(scaled)) / f).toFixed(digits).replace('.', ',');
}
// Gespeicherten Notenwert anzeigen: '2.5' → '2,5'; Tendenzen ('2-') und Text ('+') bleiben
function gradeText(value) {
  const v = String(value ?? '');
  return GRADE_INPUT_RE.test(v.trim()) ? v.replace('.', ',') : v;   // Text wie „n. b.“ bleibt, wie er ist (AR9)
}

function gradeColor(val, scale = GRADE_SCALES['1-6']) {
  if (val === null || val === undefined || isNaN(val)) return 'var(--text-muted)';
  if (scale.higherIsBetter) {
    // 15–13 = sehr gut … unter 5 Punkten = Unterkurs
    if (val>=12.5) return 'var(--grade-1)'; if (val>=9.5) return 'var(--grade-2)';
    if (val>=6.5) return 'var(--grade-3)'; if (val>=5) return 'var(--grade-4)';
    return 'var(--grade-5)';
  }
  if (val<=1.5) return 'var(--grade-1)'; if (val<=2.5) return 'var(--grade-2)';
  if (val<=3.5) return 'var(--grade-3)'; if (val<=4.5) return 'var(--grade-4)';
  return 'var(--grade-5)';
}

// Achtung: gradeTypeLabel ist auch Schlüssel. Noten ohne Titel werden über `g.note ?? gradeTypeLabel(g.type)`
// ihrer Spalte zugeordnet; ein neuer Text würde bestehende Noten aus der Tabelle werfen. Für die Anzeige gradeTypeName.
function gradeTypeLabel(type) {
  return {schularbeit:'Klassenarbeit',klausur:'Klausur',test:'Test',muendlich:'Mündlich',mitarbeit:'Mitarbeit',
          projekt:'Projekt',hausaufgabe:'HA',sonstig:'Sonstiges'}[type] || type;
}

// Name des Notentyps für die Anzeige. „Mitarbeitsnote“, damit sie nicht mit den Mitarbeit-Smileys verwechselt wird (BUGS I16)
function gradeTypeName(type) {
  return type === 'mitarbeit' ? 'Mitarbeitsnote' : gradeTypeLabel(type);
}

// Kürzel für den Spaltenkopf der Notentabelle
function gradeTypeShort(type) {
  return {schularbeit:'KA',klausur:'KL',test:'Test',muendlich:'Mdl',mitarbeit:'MA',
          projekt:'Proj',hausaufgabe:'HA',sonstig:'Sonst'}[type] || type;
}

// Zentrale Zuordnung für die Gewichtung (Klasse → schularbeitWeight): diese Typen zählen als
// „Schularbeit“, alle anderen als „Sonstige“. 'klausur' kommt nur in Altdaten vor.
const SCHULARBEIT_GRADE_TYPES = ['schularbeit', 'klausur'];
function gradeCategory(type) {
  return SCHULARBEIT_GRADE_TYPES.includes(type) ? 'schularbeit' : 'sonstige';
}

// Zahlenwert einer gespeicherten Note, z. B. '2.0' → 2, '2-' → 2 (Tendenz zählt nicht), '+' → NaN
const GRADE_INPUT_RE = /^(\d+(?:[.,]\d+)?)\s*([+-]?)$/;
function gradeNumber(value) {
  const m = String(value ?? '').trim().match(GRADE_INPUT_RE);
  return m ? parseFloat(m[1].replace(',', '.')) : NaN;
}

// Nutzereingabe → { value (zu speichern), number (zählt im Schnitt, sonst null) } oder null = ungültig.
// 1–6: '2,5' → '2.5'; '2-'/'2+' bleiben als Tendenz stehen und zählen als 2; Text wie '+' zählt nicht.
// Punkte: nur ganze Zahlen 0–15, keine Tendenzen.
function parseGradeInput(input, scale = GRADE_SCALES['1-6']) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  const m = s.match(GRADE_INPUT_RE);
  if (!m) return /\d/.test(s) ? null : { value: s, number: null };
  const number = parseFloat(m[1].replace(',', '.'));
  if (number < scale.min || number > scale.max) return null;
  if (scale.integer) return (m[2] || !Number.isInteger(number)) ? null : { value: String(number), number };
  const tendency = m[2];
  // Bis zu zwei Nachkommastellen (1,75), sonst eine (2.0): nicht still auf 1,8 runden (BUGS U8)
  const rounded = Math.round(number * 100) / 100;
  const value = tendency ? String(Math.round(number * 10) / 10) + tendency
    : (Number.isInteger(rounded * 10) ? rounded.toFixed(1) : rounded.toFixed(2));
  return { value, number };
}

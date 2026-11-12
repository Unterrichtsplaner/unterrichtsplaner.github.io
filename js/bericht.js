// ▸ Klassen-Bericht (PDF und Excel)
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


// ─── Klassen-Bericht als PDF und Excel (AD1) ──────────────────────────────
// Sicherung zum Ausdrucken bzw. Weiterbearbeiten: je Klasse Noten (alle Einzelnoten + Schnitte), Fehlzeiten,
// Mitarbeit, fehlende HA. Keine Hinweise/Inhalte (Entscheidung 02.11.). Die Dateien sind unverschlüsselt.
function classReportData(g, range = viewPeriod()) {   // Zeitraum wie in der Klassenansicht (Y7)
  // „Nachname, Vorname“ → nach Nachname sortiert, sonst wirkt die Liste ungeordnet (AR21)
  const key = s => `${s.lastName || ''} ${s.firstName || ''}`.trim();
  const students = (db.students[g.id] || []).filter(Boolean).slice().sort((a, b) => key(a).localeCompare(key(b), 'de'));
  const cols = gradeColumns(g, students).filter(c => inPeriod(c.date, range));
  const count = (list, pred) => periodList(list, range).filter(pred).length;
  return {
    g, cols, scale: gradeScale(g), weight: getSchularbeitWeight(g), groupAvg: calculateGroupAverage(g.id, range),
    period: range ? PERIOD_NAMES[range.key] : '',
    rows: students.map(s => {
      const parts = calculateGradeCategoryAverages(s, range);
      return {
        name: [s.lastName, s.firstName].filter(Boolean).join(', '),
        grades: cols.map(c => { const gr = findColumnGrade(s, c); return gr ? gr.value : null; }),
        ka: parts.schularbeit, so: parts.sonstige, avg: calculateStudentAverage(s, g.id, range),
        f: count(s.attendance, a => a.type === 'abwesend'), e: count(s.attendance, a => a.type === 'entschuldigt'),
        z: count(s.attendance, a => a.type === 'zuspät'),
        part: partCounts(periodList(s.participation, range)), ha: periodList(s.homework, range).length,   // Mitarbeit je Stufe wie PART_LEVELS (AH52)
      };
    }),
  };
}
const reportColTitle = c => [formatDateDE(parseDate(c.date)), c.label, gradeTypeShort(c.type)].filter(Boolean);
// Schuljahr des Berichts aus den Daten (AR16): Im August gehören die Einträge noch zum alten Jahr
function reportSchoolYear(g, todayStr = formatDate(new Date())) {
  let latest = '';
  (db.students[g.id] || []).forEach(st => YEAR_LISTS.forEach(f => (Array.isArray(st && st[f]) ? st[f] : []).forEach(x => {
    if (x && isDateStr(x.date) && x.date <= todayStr && x.date > latest) latest = x.date;
  })));
  return schoolYearLabel(parseDate(latest || todayStr));
}

// ── Fenster ──
let classReportGroupIds = null;  // null = alle wählbar (Einstellungen), sonst feste Klasse (Klassenansicht)
function openClassReport(groupId = null) {
  if (!db.groups.length) { showToast('Noch keine Klassen', 'error'); return; }
  classReportGroupIds = groupId ? [groupId] : null;
  const list = document.getElementById('class-report-list');
  const groups = groupId ? db.groups.filter(g => g.id === groupId)
    : db.groups.slice().sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || (a.className || '').localeCompare(b.className || '', undefined, { numeric: true }));
  list.innerHTML = groups.map(g => `<label class="print-check"><input type="checkbox" value="${escHtml(g.id)}" checked${groupId ? ' disabled' : ''} />
    ${escHtml(g.className)} ${escHtml(g.subject || '')} <small>· ${(db.students[g.id] || []).length} Schüler</small></label>`).join('');
  document.getElementById('class-report-all').classList.toggle('hidden', !!groupId);
  openModal('modal-class-report');
}
function classReportSelection() {
  const ids = [...document.querySelectorAll('#class-report-list input:checked')].map(i => i.value);
  return db.groups.filter(g => ids.includes(g.id));
}
function toggleClassReportAll() {
  const boxes = [...document.querySelectorAll('#class-report-list input')];
  const on = !boxes.every(b => b.checked);
  boxes.forEach(b => { b.checked = on; });
}
function reportFileStem(groups) {
  const part = groups.length === 1 ? `${groups[0].className}_${groups[0].subject || ''}` : 'alle_Klassen';
  const range = viewPeriod();   // Zeitraum im Dateinamen (Y7)
  return `Klassenbericht_${part}_${range ? PERIOD_NAMES[range.key] + '_' : ''}${formatDate(new Date())}`.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/_+/g, '_');
}

// ── PDF (Druckansicht) ──
const REPORT_GRADE_COLS = 12; // mehr Notenspalten → weitere Tabelle darunter, damit nichts abgeschnitten wird
function buildClassReportPrint(groups) {
  const fmt = v => formatGradeAverage(v, 2);
  const teacher = db.settings.teacherName || '', school = db.settings.school || '';
  const pages = groups.map(g => {
    const d = classReportData(g);
    const pts = d.scale.higherIsBetter;
    const head = `<div class="rp-head"><div><div class="rp-title">${escHtml(g.className)} <span>${escHtml(g.subject || '')}</span></div>
      <div class="rp-sub">Klassen-Bericht · Schuljahr ${escHtml(reportSchoolYear(g))}${d.period ? ' · ' + escHtml(d.period) : ''}${g.year ? ' · ' + escHtml(g.year) : ''} · Klassenarbeiten zählen ${d.weight} %</div></div>
      <div class="rp-meta">${school ? `<strong>${escHtml(school)}</strong><br>` : ''}${teacher ? escHtml(teacher) + '<br>' : ''}Stand ${escHtml(formatDateLong(formatDate(new Date())))}</div></div>`;
    if (!d.rows.length) return `<section class="rp-page">${head}<p class="rp-empty">Keine Schüler.</p></section>`;
    const overview = `<table class="rp-table"><thead><tr><th class="rp-name">Name</th><th>Ø Klassen&shy;arbeiten</th><th>Ø Sonstige</th><th>Ø Gesamt${pts ? ' (Pkt.)' : ''}</th>
        <th>Fehlt unentsch.</th><th>Fehlt entsch.</th><th>Zu spät</th><th>Mitarbeit ${PART_LEVELS.map(l => l.sign).join(' / ')}</th><th>HA fehlt</th></tr></thead><tbody>`
      + d.rows.map(r => `<tr><td class="rp-name">${escHtml(r.name)}</td><td>${fmt(r.ka)}</td><td>${fmt(r.so)}</td><td class="rp-avg">${fmt(r.avg)}</td>
        <td>${r.f}</td><td>${r.e}</td><td>${r.z}</td><td>${r.part.join(' / ')}</td><td>${r.ha}</td></tr>`).join('')
      + `<tr class="rp-sum"><td class="rp-name">Klassenschnitt</td><td></td><td></td><td class="rp-avg">${fmt(d.groupAvg)}</td><td colspan="5"></td></tr></tbody></table>`;
    let grades = '';
    for (let i = 0; i < d.cols.length; i += REPORT_GRADE_COLS) {
      const part = d.cols.slice(i, i + REPORT_GRADE_COLS);
      grades += `<table class="rp-table rp-grades"><thead><tr><th class="rp-name">Name</th>${part.map(c => `<th>${reportColTitle(c).map(escHtml).join('<br>')}</th>`).join('')}</tr></thead><tbody>`
        + d.rows.map(r => `<tr><td class="rp-name">${escHtml(r.name)}</td>${part.map((c, k) => `<td>${r.grades[i + k] === null ? '' : escHtml(gradeText(r.grades[i + k]))}</td>`).join('')}</tr>`).join('')
        + '</tbody></table>';
    }
    const cls = escHtml(`${g.className} ${g.subject || ''}`.trim());   // auch auf Folgeseiten erkennbar
    return `<section class="rp-page">${head}<h3 class="rp-h">Überblick · ${cls}</h3>${overview}${d.cols.length ? `<h3 class="rp-h">Einzelnoten · ${cls}</h3>${grades}` : '<p class="rp-empty">Noch keine Noten.</p>'}</section>`;
  });
  document.getElementById('print-area').innerHTML = `<div class="rp">${pages.join('')}</div>`;
}
function printClassReport() {
  const groups = classReportSelection();
  if (!groups.length) { showToast('Bitte mindestens eine Klasse wählen', 'error'); return; }
  buildClassReportPrint(groups);
  closeModal('modal-class-report');
  const prev = document.title;
  document.title = reportFileStem(groups);   // Vorschlag als Dateiname beim „Als PDF sichern“
  window.print();
  document.title = prev;
}
// ── Excel (.xlsx, selbst erzeugt: Zip ohne Kompression + SpreadsheetML) ──
function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosTime, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosTime, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  all.forEach(p => { out.set(p, pos); pos += p.length; });
  return out;
}
const xmlEsc = v => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colLetter = n => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; };
// Zelle: Zahl als Zahl (rechnet in Excel weiter), sonst Text; style 1 = fett, 2 = zwei Nachkommastellen
function xlsxCell(ref, v, style = 0) {
  if (v === null || v === undefined || v === '') return '';
  const st = style ? ` s="${style}"` : '';
  if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${Math.round(v * 100) / 100}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
}
function gradeCellValue(v) { return typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? parseFloat(v) : v; } // „2.5“ → 2,5; „2-“, „+“ bleiben Text
function classReportSheetXML(g) {
  const d = classReportData(g);
  const pts = d.scale.higherIsBetter;
  const header = ['Name', 'Ø Klassenarbeiten', 'Ø Sonstige', `Ø Gesamt${pts ? ' (Punkte)' : ''}`, 'Fehlt unentschuldigt', 'Fehlt entschuldigt', 'Zu spät',
    ...PART_LEVELS.map(l => `Mitarbeit ${l.word}`), 'HA fehlt', ...d.cols.map(c => reportColTitle(c).join(' '))];
  const rows = [
    [[`Klassen-Bericht ${g.className} ${g.subject || ''} · Schuljahr ${reportSchoolYear(g)}${d.period ? ' · ' + d.period : ''}`, 1]],
    [[`Stand ${formatDateLong(formatDate(new Date()))}${db.settings.teacherName ? ' · ' + db.settings.teacherName : ''}${db.settings.school ? ' · ' + db.settings.school : ''} · Klassenarbeiten zählen ${d.weight} %`, 0]],
    [],
    header.map(h => [h, 1]),
    ...d.rows.map(r => [[r.name, 0], [r.ka, 2], [r.so, 2], [r.avg, 2], [r.f, 0], [r.e, 0], [r.z, 0], ...r.part.map(n => [n, 0]), [r.ha, 0],
      ...r.grades.map(v => [gradeCellValue(v), 0])]),
    [['Klassenschnitt', 1], [null], [null], [d.groupAvg, 2]],
  ];
  const sheetRows = rows.map((cells, i) => `<row r="${i + 1}">${cells.map(([v, st], k) => xlsxCell(colLetter(k) + (i + 1), v, st)).join('')}</row>`).join('');
  const cols = `<cols><col min="1" max="1" width="26" customWidth="1"/><col min="2" max="${header.length}" width="13" customWidth="1"/></cols>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="4" topLeftCell="B5" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
    + `${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;
}
function buildClassReportXLSX(groups) {
  const used = new Set();
  const sheetName = g => {
    let base = `${g.className} ${g.subject || ''}`.replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 28) || 'Klasse';
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${base} ${n++}`;
    used.add(name.toLowerCase());
    return name;
  };
  const names = groups.map(sheetName);
  const ns = 'http://schemas.openxmlformats.org/';
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="${ns}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${groups.map((g, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${ns}package/2006/relationships"><Relationship Id="rId1" Type="${ns}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${ns}spreadsheetml/2006/main" xmlns:r="${ns}officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xmlEsc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${ns}package/2006/relationships">${groups.map((g, i) => `<Relationship Id="rId${i + 1}" Type="${ns}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${groups.length + 1}" Type="${ns}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${ns}spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
    ...groups.map((g, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: classReportSheetXML(g) })),
  ];
  return zipStore(files);
}
function downloadClassReportXLSX() {
  const groups = classReportSelection();
  if (!groups.length) { showToast('Bitte mindestens eine Klasse wählen', 'error'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buildClassReportXLSX(groups)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = reportFileStem(groups) + '.xlsx';
  a.click();
  closeModal('modal-class-report');
  showToast('Excel-Datei gespeichert ✓');
}

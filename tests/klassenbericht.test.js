// Klassen-Bericht als PDF und Excel (AD1)
const fs = require('fs');
const path = require('path');
const { loadApp, app } = require('./helpers/load-app');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const st = (id, first, last, extra = {}) => ({ id, firstName: first, lastName: last, grades: [], attendance: [], participation: [], homework: [], studentNotes: [], ...extra });
function sampleDB() {
  return {
    settings: { teacherName: 'Frau Muster', school: 'Gymnasium Beispielstadt', blocks: null, studentSortOrder: 'lastName' },
    lessonSlots: [], lessonData: {},
    groups: [
      { id: 'g1', subject: 'Mathe', className: '7a', color: '#3d63dd', schularbeitWeight: 50 },
      { id: 'g2', subject: 'Physik', className: 'Q1/LK', color: '#22c55e', schularbeitWeight: 40, gradeScale: '0-15' },
    ],
    students: {
      g1: [
        st('a', 'Anna', 'Becker', {
          grades: [{ type: 'schularbeit', value: '2.0', date: '2026-10-05', note: 'KA 1' }, { type: 'test', value: '2-', date: '2026-10-12', note: 'Vokabeln' },
                   { type: 'muendlich', value: '1.5', date: '2026-10-20', note: '' }],
          attendance: [{ id: 'x1', date: '2026-10-01', type: 'abwesend' }, { id: 'x2', date: '2026-10-02', type: 'entschuldigt' }, { id: 'x3', date: '2026-10-03', type: 'zuspät' }],
          participation: [{ id: 'p1', date: '2026-10-01', value: 'positive' }, { id: 'p2', date: '2026-10-02', value: 'negative' }],
          homework: [{ id: 'h1', date: '2026-10-05', note: '' }],
          notes: 'hörgeschädigt',                  // Hinweise gehören NICHT in den Bericht
        }),
        st('b', 'Ben', 'Adam', { grades: [{ type: 'schularbeit', value: '4.0', date: '2026-10-05', note: 'KA 1' }] }),
      ],
      g2: [st('c', 'Cem', 'Yilmaz', { grades: [{ type: 'schularbeit', value: '12', date: '2026-10-05', note: 'Klausur 1' }] })],
    },
  };
}
// Zip lesen (nur „gespeichert“, wie die App schreibt)
function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = {};
  let p = 0;
  while (dv.getUint32(p, true) === 0x04034b50) {
    const method = dv.getUint16(p + 8, true), crc = dv.getUint32(p + 14, true), size = dv.getUint32(p + 18, true);
    const nameLen = dv.getUint16(p + 26, true), extra = dv.getUint16(p + 28, true);
    const name = new TextDecoder().decode(bytes.slice(p + 30, p + 30 + nameLen));
    const data = bytes.slice(p + 30 + nameLen + extra, p + 30 + nameLen + extra + size);
    files[name] = { method, crc, data, text: new TextDecoder().decode(data) };
    p += 30 + nameLen + extra + size;
  }
  return { files, centralAt: p, centralSig: dv.getUint32(p, true) };
}
const wellFormed = xml => !new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror');

beforeAll(() => { localStorage.setItem('lehrerapp_v3', JSON.stringify(sampleDB())); loadApp(); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 10, 0));
  app('db = ' + JSON.stringify(sampleDB()));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  document.getElementById('toast-container').innerHTML = '';
  window.print = vi.fn();
});
afterEach(() => vi.useRealTimers());

describe('Daten je Klasse', () => {
  it('Schnitte über die App-Rechnung, Zählungen, Notenspalten; keine Hinweise', () => {
    const d = app('classReportData(db.groups[0])');
    expect(d.rows.map(r => r.name)).toEqual(['Adam, Ben', 'Becker, Anna']);   // Sortierung wie eingestellt
    const anna = d.rows[1];
    expect(anna).toMatchObject({ f: 1, e: 1, z: 1, pos: 1, neg: 1, neu: 0, ha: 1 });
    expect(anna.avg).toBe(app('calculateStudentAverage(db.students.g1[0], "g1")'));
    expect(d.cols.map(c => app('reportColTitle')(c).join(' '))).toEqual(['05.10. KA 1 KA', '12.10. Vokabeln Test', '20.10. Mdl']);
    expect(anna.grades).toEqual(['2.0', '2-', '1.5']);
    expect(JSON.stringify(d)).not.toContain('hörgeschädigt');
  });
});

describe('Excel (.xlsx)', () => {
  it('CRC32 stimmt (Prüfwert „123456789“)', () => {
    expect(app('crc32(new TextEncoder().encode("123456789"))')).toBe(0xCBF43926);
  });

  it('gültiges Zip mit allen Teilen, CRC je Datei richtig, XML wohlgeformt', () => {
    const bytes = app('buildClassReportXLSX(db.groups)');
    const { files, centralSig } = unzip(bytes);
    expect(Object.keys(files)).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']);
    expect(centralSig).toBe(0x02014b50);
    for (const [name, f] of Object.entries(files)) {
      expect(f.method, name).toBe(0);
      expect(f.crc, name).toBe(app('crc32')(f.data));
      expect(wellFormed(f.text), name).toBe(true);
    }
  });

  it('Blattnamen gültig (kein „/“), Zahlen als Zahlen, Tendenz als Text, Klassenschnitt', () => {
    const { files } = unzip(app('buildClassReportXLSX(db.groups)'));
    expect(files['xl/workbook.xml'].text).toMatch(/<sheet name="7a Mathe" sheetId="1"/);
    expect(files['xl/workbook.xml'].text).toMatch(/<sheet name="Q1 LK Physik" sheetId="2"/);
    const s1 = files['xl/worksheets/sheet1.xml'].text;
    expect(s1).toContain('Klassen-Bericht 7a Mathe · Schuljahr 2026/27');
    expect(s1).toMatch(/<c r="A5" t="inlineStr"[^>]*><is><t xml:space="preserve">Adam, Ben<\/t>/);
    expect(s1).toMatch(/<c r="L6"><v>2<\/v><\/c>/);                       // KA 1 bei Anna: Zahl
    expect(s1).toMatch(/<c r="M6" t="inlineStr"><is><t xml:space="preserve">2-<\/t>/); // Tendenz bleibt Text
    expect(s1).toMatch(/<c r="E6"><v>1<\/v><\/c>/);                       // Fehlt unentschuldigt
    expect(s1).toContain('Klassenschnitt');
    expect(files['xl/worksheets/sheet2.xml'].text).toContain('Ø Gesamt (Punkte)');
  });

  it('gleiche Blattnamen werden eindeutig', () => {
    app(`db.groups.push({ id: 'g3', subject: 'Mathe', className: '7a', color: '#000', schularbeitWeight: 50 }); db.students.g3 = []`);
    const { files } = unzip(app('buildClassReportXLSX(db.groups)'));
    expect(files['xl/workbook.xml'].text).toMatch(/name="7a Mathe 2"/);
  });

  it('Sonderzeichen in Namen werden sauber kodiert (kein kaputtes XML)', () => {
    app(`db.students.g1[0].lastName = 'Bäcker & <Söhne> "X"'; db.students.g1[0].firstName = '\\u0007Anna'`);
    const { files } = unzip(app('buildClassReportXLSX([db.groups[0]])'));
    expect(wellFormed(files['xl/worksheets/sheet1.xml'].text)).toBe(true);
    expect(files['xl/worksheets/sheet1.xml'].text).toContain('Bäcker &amp; &lt;Söhne&gt; &quot;X&quot;, Anna');
  });

  it('Herunterladen: Dateiname mit Klasse und Datum, Fenster schließt', () => {
    const clicks = [];
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicks.push(this.download); };
    URL.createObjectURL = URL.createObjectURL || (() => 'blob:x');
    try {
      app('openClassReport("g1")');
      app('downloadClassReportXLSX()');
    } finally { HTMLAnchorElement.prototype.click = orig; }
    expect(clicks).toEqual(['Klassenbericht_7a_Mathe_2026-11-02.xlsx']);
    expect(document.getElementById('modal-class-report').classList.contains('hidden')).toBe(true);
  });
});

describe('PDF (Druckansicht)', () => {
  it('eine Seite je Klasse, Überblick + Einzelnoten, Kopf mit Schule und Lehrkraft', () => {
    app('openClassReport(); printClassReport()');
    expect(window.print).toHaveBeenCalled();
    const area = document.getElementById('print-area');
    expect(area.querySelectorAll('.rp-page')).toHaveLength(2);
    expect(area.textContent).toContain('Gymnasium Beispielstadt');
    expect(area.textContent).toContain('Frau Muster');
    expect(area.querySelector('.rp-page').textContent).toMatch(/Überblick.*Einzelnoten/s);
    expect(area.querySelector('.rp-grades').textContent).toContain('2-');
    expect(area.textContent).not.toContain('hörgeschädigt');
  });

  it('viele Notenspalten: weitere Tabelle statt abgeschnitten', () => {
    const grades = Array.from({ length: 15 }, (_, i) => ({ type: 'test', value: '3.0', date: `2026-09-${String(i + 1).padStart(2, '0')}`, note: 'T' + i }));
    app(`db.students.g1[1].grades = ${JSON.stringify(grades)}`);
    app('buildClassReportPrint([db.groups[0]])');
    const tables = document.querySelectorAll('#print-area .rp-grades');
    expect(tables.length).toBe(2);                         // 15+ Spalten → 12 + Rest
    expect(tables[0].querySelectorAll('thead th').length).toBe(13);   // Name + 12
  });

  it('nichts gewählt: Hinweis, kein Druck', () => {
    app('openClassReport()');
    document.querySelectorAll('#class-report-list input').forEach(b => { b.checked = false; });
    app('printClassReport()');
    expect(window.print).not.toHaveBeenCalled();
    expect(document.getElementById('toast-container').textContent).toContain('mindestens eine Klasse');
  });

  it('Daten werden nie als HTML ausgeführt', () => {
    app(`db.groups[0].className = '<img src=x onerror="window.__xssR=1">'; db.students.g1[0].lastName = '<b>X</b>'`);
    app('buildClassReportPrint(db.groups)');
    expect(document.querySelector('#print-area img')).toBeNull();
    expect(document.querySelector('#print-area b')).toBeNull();
    expect(window.__xssR).toBeUndefined();
  });
});

describe('Fenster und Knöpfe', () => {
  it('Einstellungen: alle Klassen wählbar; Klassenansicht: nur diese Klasse', () => {
    app('openClassReport()');
    expect([...document.querySelectorAll('#class-report-list input')].map(i => [i.value, i.checked, i.disabled])).toEqual([['g1', true, false], ['g2', true, false]]);
    app('toggleClassReportAll()');
    expect(app('classReportSelection()').length).toBe(0);
    app('closeModal("modal-class-report"); openClassReport("g2")');
    expect([...document.querySelectorAll('#class-report-list input')].map(i => [i.value, i.disabled])).toEqual([['g2', true]]);
    expect(document.getElementById('class-report-all').classList.contains('hidden')).toBe(true);
  });

  it('Knopf in den Einstellungen und im Klassen-Menü; Hinweis auf unverschlüsselte Datei; Datenschutzhinweis', () => {
    expect(HTML).toMatch(/onclick="openClassReport\(\)"><i data-icon="printer"><\/i>Klassen-Bericht \(PDF\/Excel\)/);
    expect(HTML).toMatch(/openClassReport\(currentGroupId\)/);
    expect(document.getElementById('modal-class-report').textContent).toMatch(/unverschlüsselt/);
    expect(HTML).toMatch(/Klassen-Bericht \(PDF\/Excel\), Notenexport \(CSV\) – sind <strong>nicht<\/strong> verschlüsselt/);
  });
});

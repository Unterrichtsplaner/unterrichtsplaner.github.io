/* ═══ app.js – LehrerApp v3 ═══ */

// ─── Default blocks ──────────────────────────────────────────────────────
const DEFAULT_BLOCKS = [
  { num: 1, label: '1. Block', start: '07:45', end: '09:15' },
  { num: 2, label: '2. Block', start: '09:45', end: '11:15' },
  { num: 3, label: '3. Block', start: '11:45', end: '13:15' },
  { num: 4, label: '4. Block', start: '13:45', end: '15:15' }
];

const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag'];
const DAY_SHORT = ['Mo','Di','Mi','Do','Fr'];

const APP_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e',
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16',
  '#22c55e','#14b8a6','#06b6d4','#3b82f6',
  '#64748b'
];
const AVATAR_COLORS = [
  ['#6366f1','#312e81'],['#ec4899','#831843'],
  ['#f59e0b','#78350f'],['#22c55e','#14532d'],['#06b6d4','#164e63'],
  ['#3b82f6','#1e3a8a'],['#f97316','#7c2d12'],
];

// ─── State ───────────────────────────────────────────────────────────────
let db = loadDB();
let currentWeekOffset = 0;
let activeLessonId    = null;
let activeLessonDate  = null;
let isStudentEditMode = false;
let nextLessonDate    = null; // computed when opening lesson detail
let editingSlotId     = null;
let currentGroupId    = null;
let currentStudentId  = null;
let editingStudentId  = null;
let editingGroupId    = null;
let selectedLessonColor = APP_COLORS[0];
let selectedGroupColor  = APP_COLORS[0];

// ─── DB ──────────────────────────────────────────────────────────────────
function loadDB() {
  try {
    const raw = localStorage.getItem('lehrerapp_v3');
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return {
    settings: { teacherName:'', school:'', blocks: null },
    lessonSlots: [],
    lessonData: {}, // key: slotId_YYYY-MM-DD
    groups: [],
    students: {},
  };
}
function saveDB(skipCloudSync = false) {
  if (!db.settings) db.settings = {};
  db.settings.lastModified = Date.now();
  localStorage.setItem('lehrerapp_v3', JSON.stringify(db));
  
  // Automatischer Cloud-Hintergrundsync (Autosave)
  if (!skipCloudSync && typeof SyncManager !== 'undefined' && SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword) {
    if (window.syncTimeout) clearTimeout(window.syncTimeout);
    window.syncTimeout = setTimeout(() => {
      triggerSyncInternal();
    }, 3000); // 3 Sekunden Verzögerung nach der letzten Eingabe
  }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

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

function getBlocks() {
  const b = db.settings && db.settings.blocks;
  if (b && b.length) {
    if (b.length === 5 && b[0].start === '08:00' && b[1].start === '09:45') {
      db.settings.blocks = DEFAULT_BLOCKS;
      saveDB();
      return DEFAULT_BLOCKS;
    }
    return b;
  }
  return DEFAULT_BLOCKS;
}

// ─── Navigation ──────────────────────────────────────────────────────────
function switchView(name) {
  if (name !== 'seating' && typeof seatingEditMode !== 'undefined' && seatingEditMode) {
    toggleSeatingEditMode();
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const viewEl = document.getElementById('view-' + name);
  const navEl = document.getElementById('nav-' + name);
  if (viewEl) viewEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  if (name === 'dashboard') renderDashboard();
  if (name === 'seating') initSeatingPlan();
  if (name === 'classes') renderSubjectGroups();
  if (name === 'timetable') renderTimetable();
}
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function openSeatingForGroup(groupId) {
  closeModal('modal-lesson');
  currentSeatingGroupId = groupId;
  switchView('seating');
}

function openSeatingForActiveLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (slot && slot.groupId) {
    openSeatingForGroup(slot.groupId);
  }
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
function formatDateDE(d) { return d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'}); }
function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-AT',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
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
function navigateWeek(dir) { currentWeekOffset += dir; renderTimetable(); }
function goToCurrentWeek()  { currentWeekOffset = 0;   renderTimetable(); }
function jumpToDate(dateStr) {
  if (!dateStr) return;
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const adjustedNow = new Date(now);
  if (dayOfWeek === 6) adjustedNow.setDate(now.getDate() + 2);
  if (dayOfWeek === 0) adjustedNow.setDate(now.getDate() + 1);
  
  const mondayNow = new Date(adjustedNow);
  mondayNow.setDate(mondayNow.getDate() - ((mondayNow.getDay() + 6) % 7));
  mondayNow.setHours(0,0,0,0);

  const mondayTarget = new Date(targetDate);
  mondayTarget.setDate(mondayTarget.getDate() - ((mondayTarget.getDay() + 6) % 7));
  mondayTarget.setHours(0,0,0,0);
  currentWeekOffset = Math.round((mondayTarget - mondayNow) / 86400000 / 7);
  renderTimetable();
}

// ─── Timetable Render ────────────────────────────────────────────────────
function renderTimetable() {
  const dates = getWeekDates(currentWeekOffset);
  const grid  = document.getElementById('timetable-grid');
  const blocks = getBlocks();

  const weekNo = getWeekNumber(dates[0]);
  document.getElementById('week-label').textContent =
    `KW ${weekNo}  ·  ${formatDateDE(dates[0])} – ${formatDateDE(dates[4])} ${dates[0].getFullYear()}`;

  // "Heute" button + week-label only glow on the current week
  const heuteBtn = document.querySelector('button[onclick="goToCurrentWeek()"]');
  const weekLabel = document.getElementById('week-label');
  const isCurrentWeek = currentWeekOffset === 0;
  if (heuteBtn) heuteBtn.classList.toggle('active', isCurrentWeek);
  if (weekLabel) weekLabel.classList.toggle('active', isCurrentWeek);

  grid.innerHTML = '';
  
  // Calculate dynamic square cell size that fits the screen
  const wrapper = grid.parentElement;
  const availW = wrapper.clientWidth - 48; // padding 24+24
  const availH = wrapper.clientHeight - 48;
  
  const daysW = availW - 84 - 60; // 84px for time label, 60px for 5 gaps of 12px
  const maxCellW = daysW / 5;
  
  const blocksH = availH - 60 - (blocks.length * 12); // ~60px header, gaps
  const maxCellH = blocksH / blocks.length;
  
  let cellSize = Math.min(maxCellW, maxCellH);
  if (cellSize < 80) cellSize = 80;
  
  const actualContentWidth = 84 + 12 + (5 * cellSize);
  const extraSpace = Math.max(0, availW - actualContentWidth);
  const extraGap = extraSpace / 4; // distribute across the 4 gaps between the 5 days
  
  grid.style.margin = '0';
  wrapper.style.overflow = 'hidden';
  grid.style.justifyContent = 'start';
  
  // 11 columns: Time, gap, Mo, gap, Tu, gap, We, gap, Th, gap, Fr
  grid.style.gridTemplateColumns = `84px 12px ${cellSize}px ${extraGap}px ${cellSize}px ${extraGap}px ${cellSize}px ${extraGap}px ${cellSize}px ${extraGap}px ${cellSize}px`;
  grid.style.gridTemplateRows = `auto repeat(${blocks.length}, ${cellSize}px)`;
  grid.style.rowGap = '12px';
  grid.style.columnGap = '0px';

  // Header row
  const corner = document.createElement('div');
  corner.className = 'tt-corner';
  corner.style.gridColumn = '1';
  grid.appendChild(corner);
  
  dates.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'tt-day-header' + (isToday(d) ? ' today' : '');
    el.innerHTML = `<div>${DAY_SHORT[i]}</div><div style="font-size:10px;font-weight:400;margin-top:1px">${formatDateDE(d)}</div>`;
    el.style.gridColumn = (3 + i * 2).toString();
    grid.appendChild(el);
  });

  // Block rows
  blocks.forEach(block => {
    const timeEl = document.createElement('div');
    timeEl.className = 'tt-time-label';
    timeEl.innerHTML = `<div class="tt-time-block-name">${escHtml(block.label)}</div>
      <div class="tt-time-block-range">${escHtml(block.start)}<br>${escHtml(block.end)}</div>`;
    timeEl.style.gridColumn = '1';
    grid.appendChild(timeEl);

    dates.forEach((d, dayIdx) => {
      const dateStr = formatDate(d);
      const cell = document.createElement('div');
      cell.className = 'tt-cell';
      cell.style.gridColumn = (3 + dayIdx * 2).toString();

      const lessons = db.lessonSlots.filter(s => {
        if (s.day !== dayIdx || s.block !== block.num) return false;
        if (s.recurring === true || s.recurring === 'weekly') return true;
        if (s.recurring === 'biweekly') return (weekNo % 2) === ((s.startWeek || weekNo) % 2);
        return s.specificDate === dateStr;
      });

      const renderLessonHTML = (lesson, extraClasses = '') => {
        const key  = lesson.id + '_' + dateStr;
        const data = db.lessonData[key] || {};
        const isAusfall = !!data.ausfall;
        const incoming = getIncomingItems(lesson.id, dateStr);
        const activeHW   = (data.hwItems||[]).filter(i => !i.targetDate || i.targetDate === dateStr);
        const hasHW      = (data.hwEnabled && activeHW.length > 0) || incoming.hw.length > 0;
        const activeTest = (data.testItems||[]).filter(i => !i.targetDate || i.targetDate === dateStr);
        const hasTest    = (data.testEnabled && activeTest.length > 0) || incoming.tests.length > 0;

        const indicators = [];
        if (hasHW)   indicators.push({ label:'HA',   color:'#f59e0b' });
        if (hasTest) indicators.push({ label:'Test',  color:'#ef4444' });
        if (data.notes) indicators.push({ label:'Notiz', color:'#64748b' });

        let displayMain, displaySub;
        if (lesson.groupId) {
          const group = db.groups.find(g => g.id === lesson.groupId);
          if (group) { displayMain = group.subject; displaySub  = group.className; }
          else { displayMain = lesson.subject; displaySub  = null; }
        } else { displayMain = lesson.subject; displaySub  = null; }

        return `<div class="tt-lesson${isAusfall?' ausfall-lesson':''} ${extraClasses}"
               style="background:${hexToRgba(lesson.color,0.15)};color:${lesson.color}"
               onclick="openLessonDetail('${lesson.id}','${dateStr}')">
            <div>
              ${displaySub ? `<div class="tt-lesson-class">${escHtml(displaySub)}</div>` : ''}
              <div class="tt-lesson-name">${escHtml(displayMain)}</div>
              ${lesson.room?`<div class="tt-lesson-room">${escHtml(lesson.room)}</div>`:''}
            </div>
            <div class="tt-lesson-indicators">
              ${indicators.map(ind =>
                `<span class="tt-indicator" style="background:${hexToRgba(ind.color,0.2)};color:${ind.color}">${ind.label}</span>`
              ).join('')}
            </div>
          </div>`;
      };

      const renderEmptyHTML = (part) => {
        return `<div class="tt-empty-cell" title="${DAYS[dayIdx]}, ${block.label} – Klicken zum Hinzufügen"
                     onclick="openAddLessonSlot(${dayIdx}, ${block.num}, '${dateStr}', '${part}')">
                  <span class="tt-add-icon">+</span>
                </div>`;
      };

      if (lessons.length === 0) {
        cell.innerHTML = renderEmptyHTML('full');
      } else if (lessons.length === 1 && (!lessons[0].part || lessons[0].part === 'full')) {
        cell.innerHTML = renderLessonHTML(lessons[0]);
      } else {
        // Split block
        const first = lessons.find(l => l.part === 'first');
        const second = lessons.find(l => l.part === 'second');
        cell.innerHTML = `<div class="tt-split-container">
          <div class="tt-split-half">${first ? renderLessonHTML(first) : renderEmptyHTML('first')}</div>
          <div class="tt-split-half">${second ? renderLessonHTML(second) : renderEmptyHTML('second')}</div>
        </div>`;
      }
      grid.appendChild(cell);
    });
  });
}

function hexToRgba(hex, alpha) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Get all recurring slots linked to a group ────────────────────────
function getGroupSlots(groupId) {
  return db.lessonSlots.filter(s => s.groupId === groupId);
}

// ─── Incoming items (HW / Tests assigned FROM other sessions TO this date) ──
function getIncomingItems(slotId, targetDateStr) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  const result = { hw: [], tests: [] };

  // Determine which slot IDs count as "same class"
  let siblingIds;
  if (currentSlot && currentSlot.groupId) {
    // All slots sharing the same group (covers Mon + Wed of the same class)
    siblingIds = new Set(getGroupSlots(currentSlot.groupId).map(s => s.id));
  } else {
    // No group link – only look at this exact slot
    siblingIds = new Set([slotId]);
  }

  Object.entries(db.lessonData).forEach(([key, data]) => {
    const [keySlotId, fromDate] = key.split('_'); // UIDs have no underscores; date is YYYY-MM-DD
    if (!siblingIds.has(keySlotId)) return;
    if (fromDate === targetDateStr) return; // skip self
    (data.hwItems || []).forEach(item => {
      if (item.targetDate === targetDateStr) result.hw.push({ ...item, from: fromDate });
    });
    (data.testItems || []).forEach(item => {
      if (item.targetDate === targetDateStr) result.tests.push({ ...item, from: fromDate });
    });
  });
  return result;
}

// ─── Fill block selector ──────────────────────────────────────────────────
function fillBlockSelector() {
  const sel = document.getElementById('new-lesson-block');
  sel.innerHTML = '';
  getBlocks().forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.num;
    opt.textContent = `${b.label}  (${b.start} – ${b.end})`;
    sel.appendChild(opt);
  });
}

// ─── Fill group selector in lesson modal ──────────────────────────────────
function fillGroupSelector(selectedGroupId = '') {
  const sel = document.getElementById('new-lesson-group');
  sel.innerHTML = '<option value="">— Freie Eingabe (keine Verknüpfung) —</option>';
  db.groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.className} – ${g.subject}${g.year ? ' (' + g.year + ')' : ''}`;
    if (g.id === selectedGroupId) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.value = selectedGroupId; // Force reset to avoid browser state retention
}

function onLessonGroupChange() {
  const groupId = document.getElementById('new-lesson-group').value;
  const preview     = document.getElementById('lesson-group-preview');
  const subjectField = document.getElementById('lesson-subject-field');

  if (!groupId) {
    // No group selected: show free text field, hide preview
    preview.classList.add('hidden');
    subjectField.classList.remove('hidden');
    return;
  }

  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;

  // Show preview, hide free text field
  document.getElementById('lesson-preview-class').textContent   = g.className;
  document.getElementById('lesson-preview-subject').textContent = g.subject;
  preview.classList.remove('hidden');
  subjectField.classList.add('hidden');

  // Keep subject field value in sync for saveLessonSlot fallback
  document.getElementById('new-lesson-subject').value = `${g.subject} ${g.className}`;

  // Inherit group color
  if (g.color) {
    selectedLessonColor = g.color;
    renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });
  }
}

let currentSpecificDate = null;

// ─── Add / Edit lesson slot ───────────────────────────────────────────────
function openAddLessonSlot(preDay = null, preBlock = null, specificDateStr = null, part = 'full') {
  const radios = document.getElementsByName('new-lesson-part');
  for(let r of radios) {
    r.disabled = false;
    r.parentElement.style.opacity = '1';
    r.parentElement.title = '';
    
    if (r.value === part) r.checked = true;
    
    if (part !== 'full' && r.value !== part) {
      r.disabled = true;
      r.parentElement.style.opacity = '0.4';
      r.parentElement.title = 'Diese Hälfte ist bereits belegt';
    }
  }
  currentSpecificDate = specificDateStr;
  editingSlotId = null;
  document.getElementById('add-lesson-title').textContent = 'Stunde hinzufügen';
  document.getElementById('btn-delete-lesson').classList.add('hidden');
  document.getElementById('new-lesson-subject').value = '';
  document.getElementById('new-lesson-day').value = preDay !== null ? preDay : '0';
  
  fillGroupSelector('');
  
  // Reset preview: show free text, hide preview
  const preview = document.getElementById('lesson-group-preview');
  const subjectField = document.getElementById('lesson-subject-field');
  if (preview) preview.classList.add('hidden');
  if (subjectField) subjectField.classList.remove('hidden');

  fillBlockSelector();
  if (preBlock !== null) document.getElementById('new-lesson-block').value = preBlock;
  document.getElementById('new-lesson-room').value = '';
  document.getElementById('new-lesson-recurring').value = 'weekly';
  selectedLessonColor = APP_COLORS[0];
  renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });
  openModal('modal-add-lesson');
  setTimeout(() => document.getElementById('new-lesson-subject').focus(), 80);
}

function openEditLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot) return;
  currentSpecificDate = slot.specificDate || null;
  closeModal('modal-lesson');
  editingSlotId = slot.id;
  document.getElementById('add-lesson-title').textContent = 'Stunde bearbeiten';
  document.getElementById('btn-delete-lesson').classList.remove('hidden');
  document.getElementById('new-lesson-subject').value = slot.subject;
  document.getElementById('new-lesson-day').value = slot.day;
  fillGroupSelector(slot.groupId || '');
  fillBlockSelector();
  document.getElementById('new-lesson-block').value = slot.block;
  document.getElementById('new-lesson-room').value = slot.room || '';
  if (slot.recurring === 'biweekly') document.getElementById('new-lesson-recurring').value = 'biweekly';
  else if (slot.recurring === false || slot.recurring === 'none') document.getElementById('new-lesson-recurring').value = 'none';
  else document.getElementById('new-lesson-recurring').value = 'weekly';
  selectedLessonColor = slot.color || APP_COLORS[0];
  renderColorPicker('lesson-color-picker', APP_COLORS, val => { selectedLessonColor = val; });

  const radios = document.getElementsByName('new-lesson-part');
  const partner = db.lessonSlots.find(s => s.id !== slot.id && s.day === slot.day && s.block === slot.block && s.part && s.part !== 'full');
  
  for(let r of radios) {
    r.disabled = false;
    r.parentElement.style.opacity = '1';
    r.parentElement.title = '';
    
    if(r.value === (slot.part || 'full')) r.checked = true;
    
    if (partner) {
      if (r.value === 'full' || r.value === partner.part) {
         r.disabled = true;
         r.parentElement.style.opacity = '0.4';
         r.parentElement.title = 'Dieser Platz ist bereits belegt';
      }
    }
  }

  // Sync preview state
  if (slot.groupId) {
    const g = db.groups.find(x => x.id === slot.groupId);
    if (g) {
      document.getElementById('lesson-preview-class').textContent   = g.className;
      document.getElementById('lesson-preview-subject').textContent = g.subject;
      document.getElementById('lesson-group-preview').classList.remove('hidden');
      document.getElementById('lesson-subject-field').classList.add('hidden');
    }
  } else {
    document.getElementById('lesson-group-preview').classList.add('hidden');
    document.getElementById('lesson-subject-field').classList.remove('hidden');
  }

  openModal('modal-add-lesson');
}

function saveLessonSlot() {
  let subject     = document.getElementById('new-lesson-subject').value.trim();
  const day       = parseInt(document.getElementById('new-lesson-day').value);
  const block     = parseInt(document.getElementById('new-lesson-block').value);
  const room      = document.getElementById('new-lesson-room').value.trim();
  const recurringVal = document.getElementById('new-lesson-recurring').value;
  const groupId   = document.getElementById('new-lesson-group').value || null;
  let part = 'full';
  const radios = document.getElementsByName('new-lesson-part');
  for(let r of radios) if(r.checked) part = r.value;

  if (groupId) {
    const g = db.groups.find(x => x.id === groupId);
    if (g) subject = g.subject;
  }
  if (!subject) { showToast('Bitte Fach/Klasse eingeben', 'error'); return; }

  // --- Overlap Validation ---
  const existingLessons = db.lessonSlots.filter(s => {
    if (editingSlotId && s.id === editingSlotId) return false;
    if (s.day !== day || s.block !== block) return false;
    return true; 
  });
  
  if (part === 'full' && existingLessons.length > 0) {
    showToast('Block ist bereits belegt! Ganzer Block nicht möglich.', 'error');
    return;
  }
  
  if (part !== 'full') {
    const conflicting = existingLessons.find(s => s.part === 'full' || s.part === part || !s.part);
    if (conflicting) {
      showToast('Dieser Platz ist im Block bereits belegt!', 'error');
      return;
    }
  }
  // --------------------------

  let recurring = false, startWeek = null, specificDate = null;
  let startWeekDate = null;
  
  if (currentSpecificDate) {
    const parts = currentSpecificDate.split('-');
    startWeekDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
  } else {
    startWeekDate = getWeekDates(currentWeekOffset)[0];
  }
  const targetDateStr = currentSpecificDate || formatDate(startWeekDate);
  
  if (recurringVal === 'weekly') {
    recurring = 'weekly';
  } else if (recurringVal === 'biweekly') {
    recurring = 'biweekly';
    startWeek = getWeekNumber(startWeekDate);
  } else {
    recurring = false;
    specificDate = targetDateStr;
  }

  if (editingSlotId) {
    const slot = db.lessonSlots.find(s => s.id === editingSlotId);
    if (slot) Object.assign(slot, { subject, day, block, room, recurring, startWeek, specificDate, color: selectedLessonColor, groupId, part });
    showToast('Stunde gespeichert ✓');
  } else {
    db.lessonSlots.push({ id: uid(), day, block, subject, room, color: selectedLessonColor, recurring, startWeek, specificDate, groupId, part });
    showToast('Stunde hinzugefügt ✓');
  }
  saveDB();
  closeModal('modal-add-lesson');
  renderTimetable();
  editingSlotId = null;
}

function deleteLessonSlotFromEdit() {
  if (!editingSlotId) return;
  if (!confirm('Diese Unterrichtsstunde komplett löschen?')) return;
  db.lessonSlots = db.lessonSlots.filter(s => s.id !== editingSlotId);
  Object.keys(db.lessonData).forEach(k => {
    if (k.startsWith(editingSlotId + '_')) delete db.lessonData[k];
  });
  saveDB();
  editingSlotId = null;
  closeModal('modal-add-lesson');
  renderTimetable();
  showToast('Stunde gelöscht');
}

// ─── Find all upcoming lesson dates for this subject ─────────────────────
// If the slot is group-linked, searches ALL slots of that group (correct multi-day support).
// Otherwise falls back to subject name matching.
function findUpcomingLessonDates(slotId, fromDateStr, maxCount = 4) {
  const currentSlot = db.lessonSlots.find(s => s.id === slotId);
  if (!currentSlot) return [];

  let relatedSlots;
  if (currentSlot.groupId) {
    relatedSlots = getGroupSlots(currentSlot.groupId);
  } else {
    relatedSlots = db.lessonSlots.filter(s =>
      s.subject.trim().toLowerCase() === currentSlot.subject.trim().toLowerCase()
    );
  }
  if (!relatedSlots.length) return [];

  const from = new Date(fromDateStr + 'T12:00:00');
  const results = [];
  const seenDates = new Set();

  for (let i = 1; i <= 60 && results.length < maxCount; i++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + i);
    const localDay = (candidate.getDay() + 6) % 7; // Mon=0 … Fri=4

    for (const slot of relatedSlots) {
      if (slot.day === localDay) {
        if (slot.recurring === 'biweekly') {
          const weekNo = getWeekNumber(candidate);
          if ((weekNo % 2) !== ((slot.startWeek || weekNo) % 2)) continue;
        } else if (slot.recurring === false || slot.recurring === 'none') {
          if (slot.specificDate !== formatDate(candidate)) continue;
        }

        const dateStr = formatDate(candidate);
        if (!seenDates.has(dateStr)) {
          seenDates.add(dateStr);
          results.push({ dateStr, slotId: slot.id });
        }
      }
    }
  }
  return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

// ─── Lesson Detail ───────────────────────────────────────────────────────
let currentLessonDataKey = null;

function openLessonDetail(slotId, dateStr) {
  const slot = db.lessonSlots.find(s => s.id === slotId);
  if (!slot) return;

  activeLessonId   = slotId;
  activeLessonDate = dateStr;
  currentLessonDataKey = slotId + '_' + dateStr;

  // ── ALWAYS reset form fields to avoid bleed from previous lesson ──
  document.getElementById('lesson-done-text').value  = '';
  document.getElementById('lesson-notes-text').value = '';
  document.getElementById('new-hw-text').value   = '';
  document.getElementById('new-hw-date').value   = '';
  document.getElementById('new-test-text').value = '';
  document.getElementById('new-test-date').value = '';
  document.getElementById('hw-date-chips').innerHTML   = '';
  document.getElementById('test-date-chips').innerHTML = '';

  // ── Show Absent Students ──
  const absentContainer = document.getElementById('lesson-absent-container');
  const absentList = document.getElementById('lesson-absent-list');
  absentContainer.classList.add('hidden');
  absentList.innerHTML = '';
  if (slot.groupId && db.students[slot.groupId]) {
    const absent = db.students[slot.groupId].filter(s => 
      (s.attendance || []).some(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'))
    );
    if (absent.length > 0) {
      absentList.innerHTML = absent.map(s => `• ${escHtml(s.firstName)} ${escHtml(s.lastName)}`).join('<br>');
      absentContainer.classList.remove('hidden');
    }
  }

  // ── Find upcoming lesson dates (all slots with same subject) ──
  _upcomingDates = findUpcomingLessonDates(slotId, dateStr);
  populateDateChips('hw-date-chips',   _upcomingDates, 'hw');
  populateDateChips('test-date-chips', _upcomingDates, 'test');
  // Pre-fill date inputs with the nearest upcoming date
  if (_upcomingDates.length) {
    document.getElementById('new-hw-date').value   = _upcomingDates[0].dateStr;
    document.getElementById('new-test-date').value = _upcomingDates[0].dateStr;
  }

  // ── Load stored data for this specific lesson+date ──
  const data     = db.lessonData[currentLessonDataKey] || {};
  const incoming = getIncomingItems(slotId, dateStr);

  // ── Header ──
  const blocks = getBlocks();
  const block  = blocks.find(b => b.num === slot.block) || blocks[0];
  const d = new Date(dateStr + 'T12:00:00');
  document.getElementById('lesson-color-dot').style.background = slot.color || '#6366f1';
  document.getElementById('lesson-modal-title').textContent = slot.subject;
  document.getElementById('lesson-modal-subtitle').textContent =
    `${DAYS[slot.day]}  ·  ${block ? block.label + ' (' + block.start + '–' + block.end + ')' : ''}  ·  ${d.toLocaleDateString('de-AT',{day:'2-digit',month:'long',year:'numeric'})}${slot.room ? '  ·  ' + slot.room : ''}`;

  if (slot.groupId) {
    document.getElementById('lesson-seating-link-container').classList.remove('hidden');
  } else {
    document.getElementById('lesson-seating-link-container').classList.add('hidden');
  }

  // Next lesson banner (first upcoming)
  if (_upcomingDates.length) {
    document.getElementById('next-lesson-banner').classList.remove('hidden');
    const labels = _upcomingDates.slice(0,2).map(u => formatDateLong(u.dateStr)).join(' · ');
    document.getElementById('next-lesson-text').textContent = `Nächste Stunden: ${labels}`;
  } else {
    document.getElementById('next-lesson-banner').classList.add('hidden');
  }

  // ── Fill in data ──
  document.getElementById('lesson-done-text').value  = data.done  || '';
  document.getElementById('lesson-notes-text').value = data.notes || '';

  // HW
  const hwEnabled = !!(data.hwEnabled && (data.hwItems||[]).length) || incoming.hw.length > 0;
  setToggle('hw-toggle', 'hw-section-body', hwEnabled);
  renderHWItems(data.hwItems || [], incoming.hw);

  // Test
  const testEnabled = !!(data.testEnabled && (data.testItems||[]).length) || incoming.tests.length > 0;
  setToggle('test-toggle', 'test-section-body', testEnabled);
  renderTestItems(data.testItems || [], incoming.tests);

  // Ausfall
  updateAusfallDisplay(!!data.ausfall);

  openModal('modal-lesson');
}

function setToggle(checkboxId, bodyId, value) {
  document.getElementById(checkboxId).checked = value;
  document.getElementById(bodyId).classList.toggle('hidden', !value);
}

function toggleSection(type) {
  const cb   = document.getElementById(type + '-toggle');
  const body = document.getElementById(type + '-section-body');
  body.classList.toggle('hidden', !cb.checked);
}

// ─── Populate date chips (next upcoming lessons) ───────────────────────────
let _upcomingDates = []; // module-level cache for current detail

function populateDateChips(containerId, upcoming, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!upcoming.length) return;

  const label = document.createElement('div');
  label.style.cssText = 'font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px';
  label.textContent = 'Nächste Stunden – Datum auswählen:';
  container.appendChild(label);

  const chipRow = document.createElement('div');
  chipRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  container.appendChild(chipRow);

  upcoming.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.className = 'next-lesson-chip' + (idx === 0 ? ' chip-active' : '');
    btn.textContent = formatDateLong(item.dateStr);
    btn.onclick = () => {
      document.getElementById('new-' + type + '-date').value = item.dateStr;
      chipRow.querySelectorAll('.next-lesson-chip').forEach(b => b.classList.remove('chip-active'));
      btn.classList.add('chip-active');
    };
    chipRow.appendChild(btn);
  });
}

// ─── HW & Test Item Rendering ─────────────────────────────────────────────
function renderHWItems(items, incoming) {
  renderItemList('hw-items-list', items, 'hw', incoming, 'hw-incoming-list');
}

function renderTestItems(items, incoming) {
  renderItemList('test-items-list', items, 'test', incoming, 'test-incoming-list');
}

function renderItemList(listId, items, type, incoming, incomingId) {
  const list = document.getElementById(listId);
  list.innerHTML = '';

  if (!items.length) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:12px;padding:4px 0">Noch keine Einträge.</div>`;
  } else {
    items.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'entry-item';
      const targetLabel = item.targetDate ? `<span class="entry-item-target">${formatDateLong(item.targetDate)}</span>` : '';
      el.innerHTML = `
        <span class="entry-item-text">${escHtml(item.text)}</span>
        ${targetLabel}
        <button class="entry-item-delete" onclick="removeItem('${type}', ${i})">✕</button>
      `;
      list.appendChild(el);
    });
  }

  // Incoming items
  const incomingEl = document.getElementById(incomingId);
  if (incoming && incoming.length) {
    incomingEl.classList.remove('hidden');
    incomingEl.innerHTML = `<div class="incoming-title">Fällig heute (von früheren Stunden)</div>`;
    incoming.forEach(item => {
      const div = document.createElement('div');
      div.className = 'incoming-item';
      div.textContent = item.text + (item.from ? ` (von ${formatDateLong(item.from)})` : '');
      incomingEl.appendChild(div);
    });
  } else {
    incomingEl.classList.add('hidden');
    incomingEl.innerHTML = '';
  }
}

function addHWItem() {
  const text       = document.getElementById('new-hw-text').value.trim();
  const targetDate = document.getElementById('new-hw-date').value;
  if (!text) return;
  const data = ensureLessonData();
  if (!data.hwItems) data.hwItems = [];
  data.hwItems.push({ id: uid(), text, targetDate });
  data.hwEnabled = true;
  saveDB();
  // Reset ONLY the text field, keep the date for quick follow-up entries
  document.getElementById('new-hw-text').value = '';
  renderHWItems(data.hwItems, getIncomingItems(activeLessonId, activeLessonDate).hw);
  renderTimetable();
}

function addTestItem() {
  const text       = document.getElementById('new-test-text').value.trim();
  const targetDate = document.getElementById('new-test-date').value;
  if (!text) return;
  const data = ensureLessonData();
  if (!data.testItems) data.testItems = [];
  data.testItems.push({ id: uid(), text, targetDate });
  data.testEnabled = true;
  saveDB();
  // Reset ONLY the text field, keep the date for quick follow-up entries
  document.getElementById('new-test-text').value = '';
  renderTestItems(data.testItems, getIncomingItems(activeLessonId, activeLessonDate).tests);
  renderTimetable();
}

function removeItem(type, idx) {
  const data = ensureLessonData();
  const key  = type + 'Items';
  if (data[key]) { data[key].splice(idx, 1); saveDB(); }
  const incoming = getIncomingItems(activeLessonId, activeLessonDate);
  if (type === 'hw')   renderHWItems(data.hwItems || [], incoming.hw);
  if (type === 'test') renderTestItems(data.testItems || [], incoming.tests);
  renderTimetable();
}

function ensureLessonData() {
  if (!db.lessonData[currentLessonDataKey])
    db.lessonData[currentLessonDataKey] = {};
  return db.lessonData[currentLessonDataKey];
}

function saveLessonDataAndClose() {
  const data = ensureLessonData();
  data.done      = document.getElementById('lesson-done-text').value;
  data.notes     = document.getElementById('lesson-notes-text').value;
  data.hwEnabled = document.getElementById('hw-toggle').checked;
  data.testEnabled = document.getElementById('test-toggle').checked;
  saveDB();
  renderTimetable();
  closeModal('modal-lesson');
  showToast('Gespeichert ✓');
}

// ─── Ausfall ──────────────────────────────────────────────────────────────
function toggleAusfall() {
  const data = ensureLessonData();
  data.ausfall = !data.ausfall;
  saveDB();
  updateAusfallDisplay(data.ausfall);
  renderTimetable();
}

function updateAusfallDisplay(isAusfall) {
  document.getElementById('lesson-ausfall-badge').classList.toggle('hidden', !isAusfall);
  document.getElementById('lesson-ausfall-overlay').classList.toggle('hidden', !isAusfall);
  const form = document.getElementById('lesson-notes-form');
  form.style.opacity        = isAusfall ? '0.32' : '1';
  form.style.pointerEvents  = isAusfall ? 'none' : '';
  const btn = document.getElementById('btn-ausfall-bottom');
  if (btn) {
    if (isAusfall) {
      btn.style.background = 'var(--danger-soft)';
      btn.style.color = 'var(--danger)';
      btn.style.borderColor = 'rgba(239,68,68,.35)';
      btn.textContent = 'Stunde wiederherstellen';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--danger)';
      btn.style.borderColor = 'var(--danger-soft)';
      btn.textContent = 'Stunde entfällt';
    }
  }
}

// ─── Color Picker (fixed: stores hex on dataset, no rgb comparison) ───────
function renderColorPicker(containerId, colors, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const currentColor = containerId === 'lesson-color-picker' ? selectedLessonColor : selectedGroupColor;
  colors.forEach(color => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (color === currentColor ? ' selected' : '');
    sw.style.background = color;
    sw.style.setProperty('--swatch-color', color);
    sw.dataset.color = color;
    sw.onclick = () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      onSelect(color);
    };
    container.appendChild(sw);
  });
}

// ─── Subject Groups ───────────────────────────────────────────────────────
function renderSubjectGroups() {
  const container = document.getElementById('subject-groups-container');
  if (!db.groups.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-title">Noch keine Klassen</div>
        <div class="empty-state-desc">Klicke auf "+ Fach/Klasse" um deine erste Klasse hinzuzufügen.</div>
      </div>`;
    return;
  }
  container.innerHTML = '';

  // Group by Subject
  const groupsBySubject = {};
  db.groups.forEach(g => {
    const subj = g.subject || 'Ohne Fach';
    if (!groupsBySubject[subj]) groupsBySubject[subj] = [];
    groupsBySubject[subj].push(g);
  });

  // Sort subjects alphabetically
  const subjects = Object.keys(groupsBySubject).sort((a, b) => a.localeCompare(b));

  subjects.forEach(subj => {
    // Create Section Container
    const section = document.createElement('div');
    section.className = 'subject-section';
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.gap = '12px';

    // Add Subject Header
    const header = document.createElement('div');
    header.style.paddingBottom = '8px';
    header.style.borderBottom = '2px solid var(--border)';
    header.style.fontSize = '18px';
    header.style.fontWeight = '700';
    header.style.color = 'var(--text-primary)';
    header.style.marginTop = '16px';
    header.textContent = subj;
    section.appendChild(header);

    // Create Grid for cards
    const grid = document.createElement('div');
    grid.className = 'subject-groups-grid';

    // Sort groups within subject chronologically by grade
    const sortedGroups = groupsBySubject[subj].sort((a, b) => {
      const numA = parseInt(a.className) || 999;
      const numB = parseInt(b.className) || 999;
      if (numA !== numB) return numA - numB;
      return (a.className || '').localeCompare(b.className || '');
    });

    sortedGroups.forEach(g => {
      const students = db.students[g.id] || [];
      const grades = students.flatMap(s => s.grades||[]).map(gr => parseFloat(gr.value)).filter(v => !isNaN(v));
      const avg = grades.length ? (grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1) : '–';

      // Linked timetable slots → show which days this class meets
      const linkedSlots = db.lessonSlots.filter(s => s.groupId === g.id && s.recurring);
      const scheduledDays = [...new Set(linkedSlots.map(s => s.day))].sort();
      const dayBadges = scheduledDays.map(d =>
        `<span class="sgc-day-badge">${DAY_SHORT[d]}</span>`
      ).join('');

      const card = document.createElement('div');
      card.className = 'subject-group-card';
      card.style.setProperty('--card-color', g.color || 'var(--accent)');
      card.innerHTML = `
        <button class="sgc-permanent-edit-btn" title="Bearbeiten" onclick="event.stopPropagation();openEditGroup('${g.id}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin:auto;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <div class="sgc-class">${escHtml(g.className)}</div>
        <div class="sgc-subject">${escHtml(g.subject)}</div>
        ${g.year ? `<div class="sgc-year">${escHtml(g.year)}</div>` : ''}
        <div class="sgc-days">${dayBadges || '<span class="sgc-no-schedule">Kein Stundenplan verknüpft</span>'}</div>
        <div class="sgc-stats">
          <div class="sgc-stat"><div class="sgc-stat-value">${students.length}</div><div class="sgc-stat-label">Schüler</div></div>
          <div class="sgc-stat"><div class="sgc-stat-value" style="color:${gradeColor(parseFloat(avg))}">${avg}</div><div class="sgc-stat-label">Ø Note</div></div>
          <div class="sgc-stat"><div class="sgc-stat-value">${grades.length}</div><div class="sgc-stat-label">Noten</div></div>
        </div>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button class="btn-primary" style="flex:1; justify-content:center;" onclick="event.stopPropagation();openSeatingForGroup('${g.id}')">🪑 Sitzplan</button>
        </div>`;
      card.addEventListener('click', () => openGroupStudents(g.id));
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function openAddSubjectGroup() {
  editingGroupId = null;
  document.getElementById('group-modal-title').textContent = 'Klasse + Fach hinzufügen';
  ['new-group-class','new-group-subject','new-group-year'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('weight-schularbeit').value = '50';
  selectedGroupColor = APP_COLORS[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  document.getElementById('btn-delete-group').style.display = 'none';

  openModal('modal-add-group');
  setTimeout(() => document.getElementById('new-group-class').focus(), 80);
}

function openEditGroup(id) {
  editingGroupId = id;
  const g = db.groups.find(x => x.id === id);
  if (!g) return;
  document.getElementById('group-modal-title').textContent = 'Klasse bearbeiten';
  document.getElementById('new-group-class').value = g.className;
  document.getElementById('new-group-subject').value = g.subject;
  document.getElementById('new-group-year').value = g.year || '';
  
  document.getElementById('weight-schularbeit').value = g.schularbeitWeight !== undefined ? g.schularbeitWeight : 50;
  
  selectedGroupColor = g.color || APP_COLORS[0];
  renderColorPicker('group-color-picker', APP_COLORS, v => { selectedGroupColor = v; });

  const subjects = [...new Set(db.groups.map(g => g.subject).filter(Boolean))].sort();
  document.getElementById('subject-suggestions').innerHTML = subjects.map(s => `<option value="${escHtml(s)}">`).join('');

  const btnDelete = document.getElementById('btn-delete-group');
  btnDelete.style.display = 'block';
  btnDelete.onclick = () => {
    closeModal('modal-add-group');
    deleteGroup(id);
  };

  openModal('modal-add-group');
}

function editCurrentGroup() { if (currentGroupId) openEditGroup(currentGroupId); }

function saveSubjectGroup() {
  const className = document.getElementById('new-group-class').value.trim();
  const subject   = document.getElementById('new-group-subject').value.trim();
  const year      = document.getElementById('new-group-year').value.trim();
  
  const schularbeitWeight = parseFloat(document.getElementById('weight-schularbeit').value);
  const finalSchularbeitWeight = isNaN(schularbeitWeight) ? 50 : schularbeitWeight;
  
  if (!className || !subject) { showToast('Bitte Klasse und Fach eingeben', 'error'); return; }
  if (editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      Object.assign(g, { className, subject, year, color: selectedGroupColor, schularbeitWeight: finalSchularbeitWeight });
      // Update color on all linked lesson slots
      db.lessonSlots.filter(s => s.groupId === g.id).forEach(s => {
        s.color = selectedGroupColor;
      });
    }
  } else {
    const id = uid();
    db.groups.push({ id, className, subject, year, color: selectedGroupColor, schularbeitWeight: finalSchularbeitWeight });
    db.students[id] = [];
  }
  saveDB();
  closeModal('modal-add-group');
  renderSubjectGroups();
  renderTimetable(); // Ensure timetable updates if colors changed
  if (editingGroupId && currentGroupId === editingGroupId) {
    const g = db.groups.find(x => x.id === editingGroupId);
    if (g) {
      document.getElementById('student-view-title').textContent = g.subject;
      document.getElementById('student-view-subtitle').textContent = `Klasse ${g.className}${g.year?' · '+g.year:''}`;
    }
  }
  showToast(editingGroupId ? 'Geändert ✓' : 'Klasse hinzugefügt ✓');
  editingGroupId = null; renderClasses();
}

function calculateStudentAverage(student, groupId) {
  const g = db.groups.find(x => x.id === groupId);
  if (!g || !student || !student.grades || student.grades.length === 0) return null;

  const wSchularbeit = g.schularbeitWeight !== undefined ? parseFloat(g.schularbeitWeight) : 50;
  const wSonstige = 100 - wSchularbeit;

  let sumSchularbeit = 0, countSchularbeit = 0;
  let sumSonstige = 0, countSonstige = 0;

  student.grades.forEach(gr => {
    const v = parseFloat(gr.value);
    if (!isNaN(v)) {
      if (gr.type === 'schularbeit' || gr.type === 'klausur') {
        sumSchularbeit += v;
        countSchularbeit++;
      } else {
        sumSonstige += v;
        countSonstige++;
      }
    }
  });

  const avgSchularbeit = countSchularbeit > 0 ? sumSchularbeit / countSchularbeit : null;
  const avgSonstige = countSonstige > 0 ? sumSonstige / countSonstige : null;

  if (avgSchularbeit !== null && avgSonstige !== null) {
    return (avgSchularbeit * wSchularbeit + avgSonstige * wSonstige) / 100;
  } else if (avgSchularbeit !== null) {
    return avgSchularbeit;
  } else if (avgSonstige !== null) {
    return avgSonstige;
  }
  return null;
}

function deleteGroup(id) {
  if (!confirm('Klasse und alle Daten löschen?')) return;
  db.groups = db.groups.filter(g => g.id !== id);
  delete db.students[id];
  saveDB();
  renderSubjectGroups();
  showToast('Klasse gelöscht');
}

// ─── Class Overview (Tabelle) ─────────────────────────────────────────────
let currentOverviewGroupId = null;
let currentOverviewTab = 'grades';

function openClassOverview(groupId) {
  openGroupStudents(groupId, 'grades');
}

let currentClassDashboardTab = 'students';

function switchClassDashboardTab(tabName) {
  currentClassDashboardTab = tabName;
  document.querySelectorAll('#view-students .tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('overview-tab-' + tabName);
  if (activeBtn) activeBtn.classList.add('active');
  
  const studentsContainer = document.getElementById('students-container');
  const overviewContent = document.getElementById('overview-content');
  const addColBtn = document.getElementById('btn-add-overview-col');
  const actionBtn = document.getElementById('btn-student-actions');
  
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
}

function switchOverviewTab(tabName) {
  switchClassDashboardTab(tabName);
}
function renderOverviewTable() {
  if (!currentOverviewGroupId) return;
  const content = document.getElementById('overview-content');
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const students = db.students[currentOverviewGroupId] || [];
  
  if (!students.length) {
    content.innerHTML = '<div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
    return;
  }

  const sortedStudents = sortStudents(students);
  let html = '<div class="overview-table-wrapper"><table class="overview-table"><thead><tr><th style="position:sticky;left:0;background:var(--bg-elevated);z-index:2;min-width:140px;">Schüler</th>';

  if (currentOverviewTab === 'grades') {
    const gradeEventsMap = new Map();
    (group.gradeEvents || []).forEach(ev => gradeEventsMap.set(`${ev.date}_${ev.label}`, { date: ev.date, label: ev.label, type: ev.type }));
    sortedStudents.forEach(s => {
      (s.grades || []).forEach((g, idx) => {
        const key = `${g.date}_${g.note ?? gradeTypeLabel(g.type)}`;
        if (!gradeEventsMap.has(key)) gradeEventsMap.set(key, { date: g.date, label: g.note ?? gradeTypeLabel(g.type), type: g.type });
      });
    });
    const gradeEvents = Array.from(gradeEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Ø</th>';
    gradeEvents.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal('${ev.date}', '${escHtml(ev.label)}', '${ev.type || 'test'}')"><div>${formatDateShort(ev.date)}</div><div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      const rawAvg = calculateStudentAverage(s, currentOverviewGroupId);
      const avg = rawAvg !== null ? rawAvg.toFixed(1) : '–';
      
      const nameDisplay = (db.settings.studentSortOrder==='lastName') ? escHtml(s.lastName)+', '+escHtml(s.firstName) : escHtml(s.firstName)+' '+escHtml(s.lastName);
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal('${s.id}', '${currentOverviewGroupId}', '${formatDate(new Date())}')">${nameDisplay}</td>`;
      html += `<td style="font-weight:700;color:${gradeColor(parseFloat(avg))};text-align:center;">${avg}</td>`;
      
      gradeEvents.forEach(ev => {
        const matchingGradeIdx = (s.grades||[]).findIndex(g => g.date === ev.date && (g.note ?? gradeTypeLabel(g.type)) === ev.label);
        const val = matchingGradeIdx !== -1 ? s.grades[matchingGradeIdx].value : '';
        const evType = ev.type || 'test';
        html += `<td style="padding:4px;"><input type="text" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:600; color:${val ? gradeColor(parseFloat(val)) : 'inherit'}" value="${val}" placeholder="-" onchange="updateInlineGrade('${s.id}', '${ev.date}', '${escHtml(ev.label)}', this.value, '${evType}')" /></td>`;
      });
      html += `</tr>`;
    });
    
    // Bottom average row
    html += '<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:700;">Durchschnitt</td>';
    let totalSum = 0, totalCount = 0;
    sortedStudents.forEach(s => {
      const sAvg = calculateStudentAverage(s, currentOverviewGroupId);
      if (sAvg !== null) { totalSum += sAvg; totalCount++; }
    });
    const totalAvg = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : '–';
    html += `<td style="font-weight:700;color:${gradeColor(parseFloat(totalAvg))};text-align:center;">${totalAvg}</td>`;

    gradeEvents.forEach(ev => {
      let sum = 0, count = 0;
      sortedStudents.forEach(s => {
        const matchingGradeIdx = (s.grades||[]).findIndex(g => g.date === ev.date && (g.note ?? gradeTypeLabel(g.type)) === ev.label);
        if (matchingGradeIdx !== -1) {
          const val = parseFloat(s.grades[matchingGradeIdx].value);
          if (!isNaN(val)) { sum += val; count++; }
        }
      });
      const avg = count > 0 ? (sum / count).toFixed(1) : '–';
      html += `<td style="font-weight:700;color:${gradeColor(parseFloat(avg))};text-align:center;">${avg}</td>`;
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
    const partDates = Array.from(partEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Bilanz</th>';
    partDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal('${ev.date}', '${escHtml(ev.label)}')"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal('${s.id}', '${currentOverviewGroupId}', '${formatDate(new Date())}')">${escHtml(s.lastName)}, ${escHtml(s.firstName)}</td>`;
      
      let pos = 0, neu = 0, neg = 0;
      partDates.forEach(ev => {
        const pIdx = (s.participation||[]).findIndex(x => x.date === ev.date && (x.label||'') === (ev.label||''));
        const val = pIdx !== -1 ? s.participation[pIdx].value : '';
        if (val === 'positive') pos++;
        else if (val === 'neutral') neu++;
        else if (val === 'negative') neg++;
      });
      html += `<td style="text-align:center; font-size:12px; font-weight:600; white-space:nowrap;">
        <span style="color:var(--success)">${pos}</span> : <span style="color:var(--warning)">${neu}</span> : <span style="color:var(--danger)">${neg}</span>
      </td>`;

      partDates.forEach(ev => {
        const pIdx = (s.participation||[]).findIndex(x => x.date === ev.date && (x.label||'') === (ev.label||''));
        const val = pIdx !== -1 ? s.participation[pIdx].value : '';
        // Inline Cycler
        let emoji = '➖';
        if (val === 'positive') emoji = '😊';
        else if (val === 'neutral') emoji = '😐';
        else if (val === 'negative') emoji = '☹️';
        html += `<td style="text-align:center; padding:4px;">
          <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="cycleInlineParticipation('${s.id}', '${ev.date}', '${escHtml(ev.label||'')}')">${emoji}</button>
        </td>`;
      });
      html += `</tr>`;
    });

  } else if (currentOverviewTab === 'attendance') {
    const attEventsMap = new Map();
    (group.attendanceEvents || []).forEach(ev => attEventsMap.set(`${ev.date}_${ev.label}`, { date: ev.date, label: ev.label }));
    sortedStudents.forEach(s => {
      (s.attendance || []).forEach(a => attEventsMap.set(`${a.date}_`, { date: a.date, label: '' }));
    });
    const attDates = Array.from(attEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Summe</th>';
    attDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal('${ev.date}', '${escHtml(ev.label)}')"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal('${s.id}', '${currentOverviewGroupId}', '${formatDate(new Date())}')">${escHtml(s.lastName)}, ${escHtml(s.firstName)}</td>`;
      const totalMissed = (s.attendance||[]).filter(a => a.type === 'abwesend' || a.type === 'entschuldigt').length;
      html += `<td style="text-align:center;font-weight:600;">${totalMissed}</td>`;

      attDates.forEach(ev => {
        const aIdx = (s.attendance||[]).findIndex(x => x.date === ev.date);
        const status = aIdx !== -1 ? s.attendance[aIdx].type : ''; // 'abwesend', 'entschuldigt'
        let displayVal = '';
        if (status === 'abwesend') displayVal = 'F';
        else if (status === 'entschuldigt') displayVal = 'E';

        html += `<td style="padding:4px;"><input type="text" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:600; color:${status==='abwesend' ? 'var(--danger)' : 'inherit'}" value="${displayVal}" placeholder="-" onchange="updateInlineAttendance('${s.id}', '${ev.date}', this.value)" /></td>`;
      });
      html += `</tr>`;
    });
  } else if (currentOverviewTab === 'homework') {
    const hwEventsMap = new Map();
    (group.homeworkEvents || []).forEach(ev => hwEventsMap.set(`${ev.date}_${ev.label||''}`, { date: ev.date, label: ev.label||'' }));
    sortedStudents.forEach(s => {
      (s.homework || []).forEach(h => hwEventsMap.set(`${h.date}_${h.note||''}`, { date: h.date, label: h.note||'' }));
    });
    const hwDates = Array.from(hwEventsMap.values()).sort((a,b) => a.date.localeCompare(b.date));
    
    html += '<th>Summe</th>';
    hwDates.forEach(ev => {
      html += `<th style="cursor:pointer;" title="Klicken zum Bearbeiten" onclick="openEditColumnModal('${ev.date}', '${escHtml(ev.label)}')"><div>${formatDateShort(ev.date)}</div>${ev.label ? `<div style="font-weight:400;font-size:11px;">${escHtml(ev.label)}</div>` : ''}</th>`;
    });
    html += '</tr></thead><tbody>';

    sortedStudents.forEach(s => {
      html += `<tr><td style="position:sticky;left:0;background:var(--bg-card);font-weight:500;cursor:pointer;color:var(--accent);" onclick="openSeatingStudentModal('${s.id}', '${currentOverviewGroupId}', '${formatDate(new Date())}')">${escHtml(s.lastName)}, ${escHtml(s.firstName)}</td>`;
      const totalMissed = (s.homework||[]).length;
      html += `<td style="text-align:center;font-weight:600;color:var(--danger);">${totalMissed}</td>`;

      hwDates.forEach(ev => {
        const hIdx = (s.homework||[]).findIndex(x => x.date === ev.date && (x.note||'') === (ev.label||''));
        const hasMissed = hIdx !== -1;
        html += `<td style="padding:4px;"><input type="text" class="form-input" style="width:100%; text-align:center; padding:6px; font-weight:800; color:var(--danger);" value="${hasMissed ? 'X' : ''}" placeholder="-" onchange="updateInlineHomework('${s.id}', '${ev.date}', '${escHtml(ev.label||'')}', this.value)" /></td>`;
      });
      html += `</tr>`;
    });
  }

  html += '</tbody></table></div>';
  content.innerHTML = html;
}

// ─── Inline Updates ────────────────────────────────────────────────────────
function updateInlineGrade(studentId, date, label, value, type = 'test') {
  value = value.trim();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.grades) s.grades = [];

  const idx = s.grades.findIndex(g => g.date === date && (g.note ?? gradeTypeLabel(g.type)) === label);
  
  if (!value) {
    if (idx !== -1) s.grades.splice(idx, 1);
  } else {
    let numVal = parseFloat(value);
    // Validation
    if (isNaN(numVal) || numVal < 1 || numVal > 6) {
      showToast('Bitte eine Note zwischen 1 und 6 eingeben', 'error');
      renderOverviewTable(); // Reset input
      return;
    }
    const finalValue = numVal.toFixed(1);
    if (idx !== -1) {
      s.grades[idx].value = finalValue;
      if (type) s.grades[idx].type = type; // Update type if it was changed
    } else {
      s.grades.push({ type: type, value: finalValue, date: date, note: label });
    }
  }
  saveDB();
  renderOverviewTable(); // Rerender to update averages and colors
}

function cycleInlineParticipation(studentId, date, label) {
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.participation) s.participation = [];

  const idx = s.participation.findIndex(p => p.date === date && (p.label||'') === (label||''));
  const currentVal = idx !== -1 ? s.participation[idx].value : null;

  let nextVal;
  if (!currentVal) nextVal = 'positive';
  else if (currentVal === 'positive') nextVal = 'neutral';
  else if (currentVal === 'neutral') nextVal = 'negative';
  else nextVal = null; // reset

  if (nextVal) {
    if (idx !== -1) s.participation[idx].value = nextVal;
    else s.participation.push({ date, label, value: nextVal });
  } else {
    if (idx !== -1) s.participation.splice(idx, 1);
  }
  saveDB();
  renderOverviewTable(); // Render to update Ratio instantly
}

function updateInlineAttendance(studentId, date, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];

  const idx = s.attendance.findIndex(a => a.date === date);
  
  let status = null;
  if (value === 'F') status = 'abwesend';
  else if (value === 'E') status = 'entschuldigt';

  if (!status) {
    if (idx !== -1) s.attendance.splice(idx, 1);
  } else {
    if (idx !== -1) {
      s.attendance[idx].type = status;
    } else {
      s.attendance.push({ date, type: status, note: '' });
    }
  }
  saveDB();
  renderOverviewTable();
}

function updateInlineHomework(studentId, date, label, value) {
  value = value.trim().toUpperCase();
  const s = db.students[currentOverviewGroupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];

  const idx = s.homework.findIndex(h => h.date === date && (h.note||'') === (label||''));
  if (value === 'X' || value === 'HA') {
    if (idx === -1) s.homework.push({ date: date, id: uid(), note: label||'' });
  } else {
    if (idx !== -1) s.homework.splice(idx, 1);
  }
  saveDB();
  renderOverviewTable();
}

// ─── Column Management ───────────────────────────────────────────────────
let editingColumnCtx = null;

function openAddColumnModal() {
  editingColumnCtx = null;
  document.getElementById('column-modal-title').textContent = 'Neue Spalte';
  document.getElementById('new-col-date').value = formatDate(new Date());
  document.getElementById('new-col-label').value = '';
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    document.getElementById('new-col-type').value = 'test';
  } else {
    document.getElementById('new-col-type-group').style.display = 'none';
  }
  
  openModal('modal-add-column');
  setTimeout(() => document.getElementById('new-col-label').focus(), 80);
}

function openEditColumnModal(oldDate, oldLabel, oldType) {
  editingColumnCtx = { oldDate, oldLabel };
  document.getElementById('column-modal-title').textContent = 'Spalte bearbeiten';
  document.getElementById('new-col-date').value = oldDate;
  document.getElementById('new-col-label').value = oldLabel;
  
  if (currentOverviewTab === 'grades') {
    document.getElementById('new-col-type-group').style.display = 'block';
    document.getElementById('new-col-type').value = oldType || 'test';
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
    const { oldDate, oldLabel } = editingColumnCtx;
    let events = [];
    if (currentOverviewTab === 'grades') events = group.gradeEvents || [];
    if (currentOverviewTab === 'participation') events = group.participationEvents || [];
    if (currentOverviewTab === 'attendance') events = group.attendanceEvents || [];
    if (currentOverviewTab === 'homework') events = group.homeworkEvents || [];
    
    const evIdx = events.findIndex(e => e.date === oldDate && e.label === oldLabel);
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
        const gIdx = (s.grades||[]).findIndex(g => g.date === oldDate && (g.note ?? gradeTypeLabel(g.type)) === oldLabel);
        if (gIdx !== -1) { s.grades[gIdx].date = newDate; s.grades[gIdx].note = newLabel; s.grades[gIdx].type = type; }
      } else if (currentOverviewTab === 'participation') {
        const pIdx = (s.participation||[]).findIndex(p => p.date === oldDate && (p.label||'') === (oldLabel||''));
        if (pIdx !== -1) { s.participation[pIdx].date = newDate; s.participation[pIdx].label = newLabel; }
      } else if (currentOverviewTab === 'attendance') {
        const aIdx = (s.attendance||[]).findIndex(a => a.date === oldDate);
        if (aIdx !== -1) { s.attendance[aIdx].date = newDate; }
      } else if (currentOverviewTab === 'homework') {
        const hIdx = (s.homework||[]).findIndex(h => h.date === oldDate);
        if (hIdx !== -1) { s.homework[hIdx].date = newDate; }
      }
    });
  }

  saveDB();
  closeModal('modal-add-column');
  renderOverviewTable();
}

function editOverviewColumns() {
  if (confirm("Möchtest du alle explizit angelegten Spalten für diesen Bereich entfernen? (Bereits eingetragene Daten bei Schülern bleiben erhalten!)")) {
    const group = db.groups.find(g => g.id === currentOverviewGroupId);
    if (currentOverviewTab === 'grades') group.gradeEvents = [];
    if (currentOverviewTab === 'participation') group.participationEvents = [];
    if (currentOverviewTab === 'attendance') group.attendanceEvents = [];
    if (currentOverviewTab === 'homework') group.homeworkEvents = [];
    saveDB();
    renderOverviewTable();
  }
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
  document.getElementById('student-view-title').textContent = g.subject;
  document.getElementById('student-view-subtitle').textContent = `Klasse ${g.className}${g.year?' · '+g.year:''}`;
  switchView('students');
  switchClassDashboardTab(initialTab);
}

function goBackToSubjects() {
  currentGroupId = null;
  switchView('classes');
  renderSubjectGroups();
}

function renderStudents() {
  const container = document.getElementById('students-container');
  const students  = db.students[currentGroupId] || [];
  if (!students.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👤</div>
      <div class="empty-state-title">Noch keine Schüler</div>
      <div class="empty-state-desc">Klicke auf "+ Schüler" um Schüler hinzuzufügen.</div>
    </div>`;
    return;
  }
  container.innerHTML = '';
  sortStudents(students).forEach(s => {
    const avg = calculateStudentAverage(s, currentGroupId);
    const initials = (s.firstName[0]||'') + (s.lastName[0]||'');
    const avatarIdx = (s.firstName.charCodeAt(0)+s.lastName.charCodeAt(0)) % AVATAR_COLORS.length;
    const [fg,bg] = AVATAR_COLORS[avatarIdx];
    const attUnexcused = (s.attendance||[]).filter(a => a.type==='abwesend').length;
    const attExcused = (s.attendance||[]).filter(a => a.type==='entschuldigt').length;
    const partPos = (s.participation||[]).filter(p => p.value==='positive').length;
    const partNeutral = (s.participation||[]).filter(p => p.value==='neutral').length;
    const partNeg = (s.participation||[]).filter(p => p.value==='negative').length;

    const grades = s.grades || [];
    const row = document.createElement('div');
    row.className = 'student-row';
    row.innerHTML = `
      ${isStudentEditMode ? `<input type="checkbox" class="student-select-cb" data-id="${s.id}" onclick="event.stopPropagation(); updateMassDeleteBar()" style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">` : ''}
      <div class="student-avatar" style="background:${bg};color:${fg}">${escHtml(initials.toUpperCase())}</div>
      <div class="student-info">
        <div class="student-name">${(db.settings.studentSortOrder==='lastName') ? escHtml(s.lastName)+', '+escHtml(s.firstName) : escHtml(s.firstName)+' '+escHtml(s.lastName)}</div>
        <div class="student-quick-notes">${s.notes ? escHtml(s.notes) : grades.length+' Note'+(grades.length!==1?'n':'')}</div>
      </div>
      <div style="display:flex; flex-direction:row; align-items:center; font-size:12px; color:var(--text-muted); gap: 12px; margin-right: 8px;">
        <div title="Mitarbeit (Positiv : Neutral : Negativ)" onclick="event.stopPropagation(); openStudentDetail('${s.id}', 'participation')" style="background:var(--bg-elevated); padding:4px 8px; border-radius:6px; display:flex; gap:4px; align-items:center; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='var(--bg-elevated)'">
          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.7; margin-right:4px;">Mitarbeit</span>
          <span style="color:var(--success); font-weight:700;">${partPos}</span>
          <span style="opacity:0.5">:</span>
          <span style="color:var(--warning); font-weight:700;">${partNeutral}</span>
          <span style="opacity:0.5">:</span>
          <span style="color:var(--danger); font-weight:700;">${partNeg}</span>
        </div>
        <div title="Fehltage (Unentschuldigt / Entschuldigt)" onclick="event.stopPropagation(); openStudentDetail('${s.id}', 'attendance')" style="background:var(--bg-elevated); padding:4px 8px; border-radius:6px; display:flex; gap:4px; align-items:center; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='var(--bg-elevated)'">
          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; opacity:0.7; margin-right:4px;">Fehlt</span>
          <span style="color:var(--danger); font-weight:700;" title="Unentschuldigt">${attUnexcused}</span>
          <span style="opacity:0.5">/</span>
          <span style="color:var(--success); font-weight:700;" title="Entschuldigt">${attExcused}</span>
        </div>
      </div>
      ${avg!==null
        ? `<div class="student-grade-badge" style="background:${hexToRgba(gradeColor(avg),0.15)};color:${gradeColor(avg)}">${avg.toFixed(1)}</div>`
        : `<div class="student-grade-badge" style="background:var(--bg-elevated);color:var(--text-muted)">–</div>`}
    `;
    row.addEventListener('click', () => openStudentDetail(s.id));
    container.appendChild(row);
  });
  updateMassDeleteBar();
}

function openStudentActionsModal() {
  openModal('modal-student-actions');
}

function toggleStudentEditMode() {
  isStudentEditMode = !isStudentEditMode;
  
  const btn = document.getElementById('btn-student-actions');
  if (btn) {
    if (isStudentEditMode) {
      btn.innerHTML = `<span style="font-size:12px; font-weight:600; font-family:inherit; padding:0 4px;">Fertig</span>`;
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-icon');
      btn.style.width = 'auto';
      btn.title = 'Bearbeiten beenden';
      // Change onclick so it directly exits edit mode instead of opening modal
      btn.onclick = toggleStudentEditMode;
    } else {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-icon');
      btn.style.width = '';
      btn.title = 'Aktionen';
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
  db.students[currentGroupId] = db.students[currentGroupId].filter(s => !idsToDelete.has(s.id));
  
  // Also clean up any seating plan layout data for these students
  if (db.groups) {
    const group = db.groups.find(g => g.id === currentGroupId);
    if (group && group.seatingPlan) {
      group.seatingPlan = group.seatingPlan.filter(item => !idsToDelete.has(item.studentId));
    }
  }
  
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
  
  let count = 0;
  fromStudents.forEach(s => {
    if (skipDups) {
      const exists = db.students[currentGroupId].some(existing => 
        existing.firstName === s.firstName && existing.lastName === s.lastName
      );
      if (exists) return;
    }
    db.students[currentGroupId].push({
      id: uid(), firstName: s.firstName, lastName: s.lastName, notes: s.notes, grades: [], studentNotes: [], attendance: []
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
  
  let count = 0;
  lines.forEach(line => {
    const parts = line.split(' ');
    const lastName = parts.pop();
    const firstName = parts.join(' ');
    if (lastName) {
      if (skipDups) {
        const exists = db.students[currentGroupId].some(existing => 
          existing.firstName === (firstName || '') && existing.lastName === lastName
        );
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

function openAddStudent() {
  editingStudentId = null;
  document.getElementById('student-modal-title').textContent = 'Schüler hinzufügen';
  ['new-student-first','new-student-last','new-student-notes'].forEach(id => document.getElementById(id).value = '');
  openModal('modal-add-student');
}

function saveStudent() {
  const firstName = document.getElementById('new-student-first').value.trim();
  const lastName  = document.getElementById('new-student-last').value.trim();
  const notes     = document.getElementById('new-student-notes').value.trim();
  if (!firstName || !lastName) { showToast('Bitte Vor- und Nachname eingeben', 'error'); return; }
  if (!db.students[currentGroupId]) db.students[currentGroupId] = [];
  if (editingStudentId) {
    const s = db.students[currentGroupId].find(x => x.id === editingStudentId);
    if (s) Object.assign(s, { firstName, lastName, notes });
  } else {
    db.students[currentGroupId].push({ id:uid(), firstName, lastName, notes, grades:[], studentNotes:[], attendance:[] });
  }
  saveDB();
  closeModal('modal-add-student');
  renderStudents();
  showToast(editingStudentId ? 'Schüler geändert ✓' : 'Schüler hinzugefügt ✓');
  editingStudentId = null;
}

// ─── Student Detail ───────────────────────────────────────────────────────
function openStudentDetail(studentId, initialTab = 'grades') {
  const s = (db.students[currentGroupId]||[]).find(x => x.id === studentId);
  if (!s) return;
  currentStudentId = studentId;
  const group = db.groups.find(g => g.id === currentGroupId);
  document.getElementById('sdetail-name').textContent = s.lastName + ', ' + s.firstName;
  document.getElementById('sdetail-group').textContent = group ? `${group.subject} · Klasse ${group.className}` : '';
  renderGradesList(s);
  renderStudentNotesList(s);
  renderAttendanceList(s);
  renderStudentParticipationList(s);
  renderStudentHomeworkList(s);
  switchStudentTab(initialTab);
  openModal('modal-student-detail');
}

function switchStudentTab(tab) {
  document.querySelectorAll('#modal-student-detail .tab-btn').forEach((b,i) => {
    b.classList.toggle('active', ['grades','participation','attendance','homework','notes'][i] === tab);
  });
  ['grades','participation','attendance','homework','notes'].forEach(t => {
    const el = document.getElementById('student-tab-'+t);
    if (el) {
      el.classList.toggle('active', t===tab);
      el.classList.toggle('hidden', t!==tab);
    }
  });
}

function openGradeFormForCurrentStudentDetailed() {
  const s = getCurrentStudent();
  if (!s) return;
  openGradeForm(s.id, currentGroupId, -1);
}

function getCurrentStudent() { return (db.students[currentGroupId]||[]).find(x => x.id === currentStudentId); }

function renderGradesList(s) {
  const grades = s.grades||[];
  const summary = document.getElementById('grades-summary');
  if (!grades.length) {
    summary.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Noch keine Noten.</span>';
  } else {
    const byType = {};
    grades.forEach(g => { if (!byType[g.type]) byType[g.type]=[]; byType[g.type].push(parseFloat(g.value)); });
    const all = grades.map(g => parseFloat(g.value)).filter(v => !isNaN(v));
    const avg = all.length ? (all.reduce((a,b)=>a+b,0)/all.length).toFixed(1) : '–';
    summary.innerHTML = `
      <div class="grade-summary-item" style="margin-right:16px">
        <div class="grade-avg-display" style="color:${gradeColor(parseFloat(avg))}">${avg}</div>
        <div class="grade-avg-label">Ø Gesamt</div>
      </div>
      ${Object.entries(byType).map(([type,vals]) => {
        const ta = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);
        return `<div class="grade-summary-item">
          <div style="font-size:15px;font-weight:700;color:${gradeColor(parseFloat(ta))}">${ta}</div>
          <div class="grade-avg-label">${gradeTypeLabel(type)} (${vals.length})</div>
        </div>`;
      }).join('')}`;
  }
  const list = document.getElementById('grades-list');
  list.innerHTML = '';
  if (!grades.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Noten erscheinen hier.</div>'; return; }
  [...grades].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach((g,i) => {
    const originalIdx = s.grades.indexOf(g);
    const color = gradeColor(parseFloat(g.value));
    const el = document.createElement('div');
    el.className = 'grade-item';
    el.style.cursor = 'pointer';
    el.title = 'Klicken zum Bearbeiten';
    el.onclick = () => openGradeForm(s.id, currentGroupId, originalIdx);
    el.innerHTML = `
      <div class="grade-value" style="color:${color}">${g.value}</div>
      <div class="grade-type-badge">${gradeTypeLabel(g.type)}</div>
      <div class="grade-label">${escHtml(g.note||g.label||'')}</div>
      <div class="grade-date">${g.date ? formatDateShort(g.date) : ''}</div>
      <div style="color:var(--text-muted); font-size:16px;">✎</div>`;
    list.appendChild(el);
  });
}

function addGradeEntry() {
  const type  = document.getElementById('new-grade-type').value;
  const value = document.getElementById('new-grade-value').value;
  const label = document.getElementById('new-grade-label').value.trim();
  const date  = document.getElementById('new-grade-date').value;
  if (!value || isNaN(parseFloat(value))) { showToast('Bitte gültige Note eingeben', 'error'); return; }
  const s = getCurrentStudent();
  if (!s) return;
  if (!s.grades) s.grades = [];
  s.grades.push({ type, value: parseFloat(value).toFixed(1), label, date });
  saveDB(); renderGradesList(s); renderStudents();
  ['new-grade-value','new-grade-label','new-grade-date'].forEach(id => document.getElementById(id).value='');
  showToast('Note eingetragen ✓');
}

function deleteGrade(idx) {
  const s = getCurrentStudent(); if (!s) return;
  s.grades.splice(idx,1); saveDB(); renderGradesList(s); renderStudents();
}

function renderStudentNotesList(s) {
  const notes = s.studentNotes||[];
  const list  = document.getElementById('student-notes-list');
  list.innerHTML = '';
  if (!notes.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Noch keine Anmerkungen.</div>'; return; }
  [...notes].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach((n,i) => {
    list.appendChild(createEntryItem(n.text, n.date, () => { s.studentNotes.splice(i,1); saveDB(); renderStudentNotesList(s); }));
  });
}

function addStudentNote() {
  const text = document.getElementById('new-student-note-text').value.trim();
  const date = document.getElementById('new-student-note-date').value;
  if (!text) return;
  const s = getCurrentStudent(); if (!s) return;
  if (!s.studentNotes) s.studentNotes=[];
  s.studentNotes.push({ text, date: date||formatDate(new Date()) });
  saveDB(); renderStudentNotesList(s); renderStudents();
  document.getElementById('new-student-note-text').value='';
  document.getElementById('new-student-note-date').value='';
}

function renderAttendanceList(s) {
  const att  = s.attendance||[];
  const list = document.getElementById('attendance-list');
  list.innerHTML='';
  if (!att.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Keine Einträge.</div>'; return; }
  const typeColors = { abwesend:'var(--danger)', entschuldigt:'var(--warning)', 'zuspät':'var(--text-secondary)' };
  [...att].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).forEach((a,i) => {
    const el = document.createElement('div');
    el.className='entry-item';
    el.innerHTML=`
      <span style="color:${typeColors[a.type]||'inherit'};font-weight:600;min-width:86px;font-size:12px">${a.type.charAt(0).toUpperCase()+a.type.slice(1)}</span>
      <span class="entry-item-text">${escHtml(a.note||'')}</span>
      <span class="entry-item-date">${a.date?formatDateShort(a.date):''}</span>
      <button class="entry-item-delete" onclick="deleteAttendance(${i})">✕</button>`;
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
  s.attendance.push({ date, type, note });
  saveDB(); renderAttendanceList(s); renderStudents();
  document.getElementById('new-att-date').value='';
  document.getElementById('new-att-note').value='';
}

function deleteAttendance(idx) {
  const s = getCurrentStudent(); if (!s) return;
  const a = s.attendance[idx];
  if (a.type === 'abwesend' && typeof currentOverviewGroupId !== 'undefined' && currentOverviewGroupId) {
    removeNextLessonNote(currentOverviewGroupId, a.date, `${s.firstName} hat letzte Stunde unentschuldigt gefehlt`);
  }
  s.attendance.splice(idx,1); saveDB(); renderAttendanceList(s);
}

function renderStudentParticipationList(s) {
  const pList = s.participation || [];
  const list = document.getElementById('participation-list');
  if (!list) return;
  list.innerHTML = '';
  if (!pList.length) { list.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:6px 0">Keine Einträge.</div>'; return; }
  const valColors = { 'positive':'var(--success)', 'neutral':'var(--warning)', 'negative':'var(--danger)' };
  const valLabels = { 'positive':'+', 'neutral':'=', 'negative':'-' };
  const textLabels = { 'positive':'Hervorragende Mitarbeit', 'neutral':'Moderate Mitarbeit', 'negative':'Schlechte Mitarbeit' };
  [...pList].sort((a,b) => (b.date||'').localeCompare(a.date||'')).forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'entry-item';
    const desc = p.label || textLabels[p.value] || 'Mitarbeit';
    el.innerHTML = `
      <span style="color:${valColors[p.value]||'inherit'};font-weight:800;font-size:16px;min-width:30px;text-align:center;">${valLabels[p.value]||p.value}</span>
      <span class="entry-item-text">${desc}</span>
      <span class="entry-item-date">${p.date ? formatDateShort(p.date) : ''}</span>
      <button class="entry-item-delete" onclick="deleteParticipation(${i})">×</button>`;
    list.appendChild(el);
  });
}

function deleteParticipation(idx) {
  const s = getCurrentStudent(); if (!s) return;
  s.participation.splice(idx, 1); saveDB(); renderStudentParticipationList(s);
}

function renderStudentHomeworkList(s) {
  const list = document.getElementById('student-homework-list');
  if (!list) return;
  const hw = s.homework || [];
  if (!hw.length) {
    list.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Keine Hausaufgaben vergessen.</span>';
    return;
  }
  const sorted = [...hw].sort((a,b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.map((h) => {
    return `<div class="entry-item">
      <div class="entry-date-badge">${formatDateLong(h.date)}</div>
      <div style="flex:1; margin-left:12px;">
        <div style="font-weight:600; color:var(--warning); font-size:14px;">Hausaufgabe vergessen</div>
        ${h.note ? `<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${escHtml(h.note)}</div>` : ''}
      </div>
      <button class="btn-icon btn-danger-icon" onclick="deleteStudentHomework('${h.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;
  }).join('');
}

function addStudentHomework() {
  const date = document.getElementById('new-hw-student-date').value;
  const note = document.getElementById('new-hw-student-note').value.trim();
  if (!date) { showToast('Bitte Datum wählen', 'error'); return; }
  const s = getCurrentStudent(); if (!s) return;
  if (!s.homework) s.homework = [];
  s.homework.push({ id: uid(), date: date, note: note });
  saveDB();
  renderStudentHomeworkList(s);
  if (typeof renderOverviewTable === 'function') renderOverviewTable();
  document.getElementById('new-hw-student-date').value = '';
  document.getElementById('new-hw-student-note').value = '';
}

function deleteStudentHomework(id) {
  const s = getCurrentStudent(); if (!s) return;
  if (!s.homework) return;
  s.homework = s.homework.filter(h => h.id !== id);
  saveDB();
  renderStudentHomeworkList(s);
  if (typeof renderOverviewTable === 'function') renderOverviewTable();
}

function deleteCurrentStudent() {
  if (!confirm('Schüler wirklich löschen?')) return;
  db.students[currentGroupId]=(db.students[currentGroupId]||[]).filter(s=>s.id!==currentStudentId);
  saveDB(); closeModal('modal-student-detail'); renderStudents(); renderSubjectGroups();
  showToast('Schüler gelöscht');
}

function openEditStudent() {
  const s = getCurrentStudent(); if (!s) return;
  editingStudentId = s.id;
  document.getElementById('student-modal-title').textContent = 'Schüler bearbeiten';
  document.getElementById('new-student-first').value = s.firstName;
  document.getElementById('new-student-last').value  = s.lastName;
  document.getElementById('new-student-notes').value = s.notes||'';
  closeModal('modal-student-detail');
  openModal('modal-add-student');
}

function exportCurrentStudent() {
  const s = getCurrentStudent();
  if (!s) return;
  const group = db.groups.find(g => g.id === currentOverviewGroupId);
  const subjName = group ? (group.subject + ' ' + group.className) : 'Unbekannte Klasse';
  
  let txt = `SCHÜLERAKTE: ${s.firstName} ${s.lastName}\n`;
  txt += `Klasse/Fach: ${subjName}\n`;
  txt += `Exportiert am: ${new Date().toLocaleDateString('de-DE')}\n`;
  txt += `=================================================\n\n`;
  
  if (s.notes) {
    txt += `=== ALLGEMEINE NOTIZEN ===\n${s.notes}\n\n`;
  }
  
  const avg = calculateStudentAverage(s, currentOverviewGroupId);
  txt += `=== NOTEN (Aktueller Schnitt: ${avg !== null ? avg.toFixed(2) : '-'}) ===\n`;
  if (s.grades && s.grades.length > 0) {
    const sortedGrades = [...s.grades].sort((a,b) => a.date.localeCompare(b.date));
    sortedGrades.forEach(g => {
      txt += `${formatDateLong(g.date)} | ${g.label} | ${g.type === 'schularbeit' ? 'Klassenarbeit' : 'Sonstige Leistung'} | Note: ${g.value}\n`;
    });
  } else {
    txt += `Keine Noten eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== MITARBEIT ===\n`;
  if (s.participation && s.participation.length > 0) {
    const textLabels = { 'positive':'Hervorragende Mitarbeit', 'neutral':'Moderate Mitarbeit', 'negative':'Schlechte Mitarbeit' };
    const sortedPart = [...s.participation].sort((a,b) => a.date.localeCompare(b.date));
    sortedPart.forEach(p => {
      let valStr = p.value === 'positive' ? '(+)' : (p.value === 'negative' ? '(-)' : '(o)');
      let desc = p.label || textLabels[p.value] || 'Mitarbeit';
      txt += `${formatDateLong(p.date)} | ${desc} | ${valStr}\n`;
    });
  } else {
    txt += `Keine Mitarbeit eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== ANWESENHEIT ===\n`;
  if (s.attendance && s.attendance.length > 0) {
    const sortedAtt = [...s.attendance].sort((a,b) => a.date.localeCompare(b.date));
    sortedAtt.forEach(a => {
      let valStr = a.type === 'abwesend' ? 'Unentschuldigt' : 'Entschuldigt';
      txt += `${formatDateLong(a.date)} | ${a.label} | ${valStr}\n`;
    });
  } else {
    txt += `Keine Fehltage eingetragen.\n`;
  }
  txt += `\n`;
  
  txt += `=== VERHALTENSNOTIZEN ===\n`;
  if (s.studentNotes && s.studentNotes.length > 0) {
    const sortedNotes = [...s.studentNotes].sort((a,b) => a.date.localeCompare(b.date));
    sortedNotes.forEach(n => {
      txt += `${formatDateLong(n.date)} | ${n.label}:\n${n.text}\n---\n`;
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

function toggleSidebar(e) {
  if (e) e.stopPropagation();
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}

function collapseSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('collapsed')) {
    sidebar.classList.add('collapsed');
  }
}

let currentThemeAccent = db.settings.themeAccent || '#6366f1';
let currentThemeBg = db.settings.themeBg || '#0f1117';
let currentThemeMode = db.settings.theme || 'dark'; // db.settings.theme stores the mode
let currentThemeCard = db.settings.themeCard || '#1e2130';

function selectThemeAccent(el, color) {
  document.querySelectorAll('.settings-swatch-accent').forEach(s => s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  currentThemeAccent = color;
  applyThemePreview();
}

function selectThemeBg(el, bg, mode, card) {
  document.querySelectorAll('.settings-swatch-bg').forEach(s => s.classList.remove('selected'));
  if (el) el.classList.add('selected');
  currentThemeBg = bg;
  currentThemeMode = mode;
  currentThemeCard = card;
  applyThemePreview();
}

// ─── Settings ─────────────────────────────────────────────────────────────
function openSettings() {
  document.getElementById('settings-teacher-name').value = db.settings.teacherName||'';
  document.getElementById('settings-school').value       = db.settings.school||'';
  document.getElementById('settings-seating-buffer').value = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
  document.getElementById('settings-warn-absences').value = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  document.getElementById('settings-warn-homework').value = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  document.getElementById('settings-warn-grade').value = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;
  
  currentThemeAccent = db.settings.themeAccent || '#6366f1';
  document.querySelectorAll('.settings-swatch-accent').forEach(s => {
    s.classList.remove('selected');
    if (s.dataset.color === currentThemeAccent) s.classList.add('selected');
  });

  currentThemeBg = db.settings.themeBg || '#0f1117';
  currentThemeMode = db.settings.theme || 'dark';
  currentThemeCard = db.settings.themeCard || '#1e2130';
  document.querySelectorAll('.settings-swatch-bg').forEach(s => {
    s.classList.remove('selected');
    if (s.dataset.color === currentThemeBg) s.classList.add('selected');
  });

  let radVal = db.settings.themeRadius !== undefined ? db.settings.themeRadius : 8;
  if (radVal > 12) radVal = 12; // Clamp max radius to 12
  document.getElementById('settings-radius').value       = radVal;
  document.getElementById('settings-radius-val').textContent = radVal + 'px';
  document.getElementById('settings-sort-order').value = db.settings.studentSortOrder || 'firstName';
  renderBlocksEditor();
  openModal('modal-settings');
}

function applyThemePreview() {
  const radEl = document.getElementById('settings-radius');
  document.documentElement.setAttribute('data-theme', currentThemeMode);

  const accent = document.querySelector('.settings-swatch-accent.selected') ? currentThemeAccent : (db.settings.themeAccent || '#6366f1');
  const bg = document.querySelector('.settings-swatch-bg.selected') ? currentThemeBg : (db.settings.themeBg || null);
  const card = document.querySelector('.settings-swatch-bg.selected') ? currentThemeCard : (db.settings.themeCard || null);
  let rad = radEl ? parseInt(radEl.value) : db.settings.themeRadius;
  if (rad > 12) rad = 12; // Clamp max radius to 12

  if (bg) { 
    document.documentElement.style.setProperty('--bg-primary', bg); 
    document.documentElement.style.setProperty('--sidebar-bg', bg);
    document.documentElement.style.setProperty('--bg-secondary', bg);
  }
  else { 
    document.documentElement.style.removeProperty('--bg-primary'); 
    document.documentElement.style.removeProperty('--sidebar-bg');
    document.documentElement.style.removeProperty('--bg-secondary');
  }
  
  if (card) { 
    document.documentElement.style.setProperty('--bg-card', card); 
    document.documentElement.style.setProperty('--bg-elevated', card);
  }
  else { 
    document.documentElement.style.removeProperty('--bg-card'); 
    document.documentElement.style.removeProperty('--bg-elevated');
  }
  
  if (accent) { document.documentElement.style.setProperty('--accent', accent); document.documentElement.style.setProperty('--text-accent', accent); }
  else { document.documentElement.style.removeProperty('--accent'); document.documentElement.style.removeProperty('--text-accent'); }

  if (rad !== undefined && rad !== null && !isNaN(rad)) {
    document.documentElement.style.setProperty('--radius-sm', Math.max(0, rad - 2) + 'px');
    document.documentElement.style.setProperty('--radius-md', rad + 'px');
    document.documentElement.style.setProperty('--radius-lg', (rad + 4) + 'px');
    document.documentElement.style.setProperty('--radius-xl', (rad + 10) + 'px');
  } else {
    document.documentElement.style.removeProperty('--radius-sm');
    document.documentElement.style.removeProperty('--radius-md');
    document.documentElement.style.removeProperty('--radius-lg');
    document.documentElement.style.removeProperty('--radius-xl');
  }

  // Safari SVG currentColor repaint hack
  setTimeout(() => {
    document.querySelectorAll('svg').forEach(svg => {
      const old = svg.style.display;
      svg.style.display = 'none';
      svg.offsetHeight; // force reflow
      svg.style.display = old;
    });
  }, 10);
}

function renderBlocksEditor() {
  const editor = document.getElementById('blocks-editor');
  editor.innerHTML = '';
  const blocks = getBlocks();
  blocks.forEach((b, i) => {
    const row = document.createElement('div');
    row.className = 'block-row';
    row.innerHTML = `
      <input class="block-name-input" type="text" value="${escHtml(b.label)}" placeholder="Name" data-bidx="${i}" data-field="label" />
      <input class="block-time-input" type="time" value="${b.start}" data-bidx="${i}" data-field="start" />
      <span class="block-sep">–</span>
      <input class="block-time-input" type="time" value="${b.end}" data-bidx="${i}" data-field="end" />
      <button class="block-delete-btn" onclick="deleteBlockRow(${i})">✕</button>
    `;
    editor.appendChild(row);
  });
}

function addBlockRow() {
  const blocks = getBlocks();
  blocks.push({ num: blocks.length + 1, label: `${blocks.length+1}. Block`, start: '08:00', end: '09:30' });
  db.settings.blocks = blocks;
  renderBlocksEditor();
}

function deleteBlockRow(idx) {
  const blocks = getBlocks();
  if (blocks.length <= 1) { showToast('Mindestens ein Block nötig', 'error'); return; }
  blocks.splice(idx, 1);
  blocks.forEach((b,i) => b.num = i+1);
  db.settings.blocks = blocks;
  renderBlocksEditor();
}

function saveSettings() {
  db.settings.teacherName = document.getElementById('settings-teacher-name').value.trim();
  db.settings.school      = document.getElementById('settings-school').value.trim();
  db.settings.seatingBufferMins = parseInt(document.getElementById('settings-seating-buffer').value) || 0;
  db.settings.warnAbsences = parseInt(document.getElementById('settings-warn-absences').value) || 3;
  db.settings.warnHomework = parseInt(document.getElementById('settings-warn-homework').value) || 3;
  db.settings.warnGrade = parseFloat(document.getElementById('settings-warn-grade').value) || 4.5;
  db.settings.theme       = currentThemeMode;
  db.settings.themeBg     = currentThemeBg;
  db.settings.themeCard   = currentThemeCard;
  db.settings.themeAccent = currentThemeAccent;
  db.settings.themeRadius = parseInt(document.getElementById('settings-radius').value);
  db.settings.studentSortOrder = document.getElementById('settings-sort-order').value;

  // Read block editor values
  const blocks = getBlocks().map((b,i) => ({ ...b }));
  document.querySelectorAll('.block-name-input, .block-time-input').forEach(input => {
    const idx   = parseInt(input.dataset.bidx);
    const field = input.dataset.field;
    if (!isNaN(idx) && field && blocks[idx]) blocks[idx][field] = input.value;
  });
  db.settings.blocks = blocks;

  saveDB();
  closeModal('modal-settings');
  renderTimetable();
  showToast('Einstellungen gespeichert ✓');
}

function exportGradesCSV() {
  if (!currentGroupId) return;
  const g = db.groups.find(x => x.id === currentGroupId);
  if (!g) return;
  
  const students = db.students[g.id] || [];
  let csvContent = "\uFEFFNachname;Vorname;Muendlich;Schriftlich;Gesamtnote\n"; // \uFEFF is BOM for Excel to read UTF-8 correctly
  
  sortStudents(students).forEach(s => {
    const grades = s.grades || [];
    
    // Mündlich: muendlich, mitarbeit
    const oralGrades = grades.filter(gr => gr.type === 'muendlich' || gr.type === 'mitarbeit').map(gr => parseFloat(gr.value)).filter(v => !isNaN(v));
    const oralAvg = oralGrades.length ? (oralGrades.reduce((a,b)=>a+b,0)/oralGrades.length).toFixed(2).replace('.', ',') : '';
    
    // Schriftlich: schularbeit, test
    const writtenGrades = grades.filter(gr => gr.type === 'schularbeit' || gr.type === 'test').map(gr => parseFloat(gr.value)).filter(v => !isNaN(v));
    const writtenAvg = writtenGrades.length ? (writtenGrades.reduce((a,b)=>a+b,0)/writtenGrades.length).toFixed(2).replace('.', ',') : '';
    
    // Gesamt
    const rAvg = calculateStudentAverage(s, g.id);
    const totalAvg = rAvg !== null ? rAvg.toFixed(2).replace('.', ',') : '';
    
    csvContent += `"${s.lastName || ''}";"${s.firstName || ''}";"${oralAvg}";"${writtenAvg}";"${totalAvg}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Noten_${g.className}_${g.subject}_${formatDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Noten als CSV exportiert ✓');
}

function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));
  const now = new Date();
  const dateStr = formatDate(now);
  const timeStr = String(now.getHours()).padStart(2, '0') + '-' + String(now.getMinutes()).padStart(2, '0');
  a.download = `Unterrichtsplaner_Backup_${dateStr}_${timeStr}.json`; 
  a.click();
  
  db.settings.lastBackupTimestamp = Date.now();
  saveDB();
  
  showToast('Daten erfolgreich gesichert! ✓');
}
function importDataClick() { document.getElementById('import-file-input').click(); }
function importData(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.lessonSlots && parsed.groups && parsed.students) {
        db = parsed; saveDB(); renderTimetable(); renderSubjectGroups(); closeModal('modal-settings');
        showToast('Importiert ✓');
      } else { showToast('Ungültiges Format','error'); }
    } catch { showToast('Fehler beim Importieren','error'); }
  };
  reader.readAsText(file); event.target.value='';
}
function clearAllData() {
  if (!confirm('ACHTUNG: Wirklich alle Daten löschen?')) return;
  localStorage.removeItem('lehrerapp_v3'); db = loadDB();
  renderTimetable(); renderSubjectGroups(); closeModal('modal-settings');
  a.href = url;
  a.download = `lehrerapp_export_${formatDate(new Date())}.json`;
  a.click();
}

// ─── Seating Plan ─────────────────────────────────────────────────────────
let currentSeatingGroupId = '';
let currentSeatingDateStr = '';
let activeSeatingGroups = null;
let lastSeatingGroupId = '';
let lastSeatingDateStr = '';

function getSuggestedSeatingGroupId() {
  const now = new Date();
  const dayIdx = (now.getDay() + 6) % 7; // Mon=0, Sun=6
  if (dayIdx > 4) return null; // Weekend
  
  const h = now.getHours();
  const m = now.getMinutes();
  const currentTotalMins = h * 60 + m;
  
  const blocks = getBlocks();
  const weekNo = getWeekNumber(now);
  const dateStr = formatDate(now);
  
  let activeBlockNum = null;
  for (let b of blocks) {
    if (!b.start || !b.end) continue;
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    
    const buffer = db.settings.seatingBufferMins !== undefined ? db.settings.seatingBufferMins : 5;
    
    // Check if current time is within [startMins - buffer, endMins]
    if (currentTotalMins >= startMins - buffer && currentTotalMins <= endMins) {
      activeBlockNum = b.num;
      break;
    }
  }
  
  if (activeBlockNum === null) return null;
  
  const activeSlot = db.lessonSlots.find(s => {
    if (s.day !== dayIdx || s.block !== activeBlockNum) return false;
    if (s.recurring === true || s.recurring === 'weekly') return true;
    if (s.recurring === 'biweekly') return (weekNo % 2) === ((s.startWeek || weekNo) % 2);
    return s.specificDate === dateStr;
  });
  
  if (activeSlot && activeSlot.groupId) {
    return activeSlot.groupId;
  }
  return null;
}

function initSeatingPlan() {
  if (!currentSeatingDateStr) currentSeatingDateStr = formatDate(new Date());
  
  const suggestedGroupId = getSuggestedSeatingGroupId();
  if (suggestedGroupId) {
    currentSeatingGroupId = suggestedGroupId;
  }
  
  renderSeatingGroupSelect();
  renderSeatingDateStrip();
  renderSeatingPlan();
}

function renderSeatingGroupSelect() {
  const menu = document.getElementById('seating-group-menu');
  const label = document.getElementById('seating-group-current-label');
  if (!menu || !label) return;
  menu.innerHTML = '';
  
  if (!currentSeatingGroupId && db.groups.length > 0) {
    currentSeatingGroupId = db.groups[0].id;
  }
  
  const activeGroup = db.groups.find(g => g.id === currentSeatingGroupId);
  if (activeGroup) {
    label.textContent = activeGroup.className;
  } else {
    label.textContent = 'Klasse';
  }
  
  const grouped = {};
  db.groups.forEach(g => {
    const subject = g.subject || 'Ohne Fach';
    if (!grouped[subject]) grouped[subject] = [];
    grouped[subject].push(g);
  });
  
  const sortedSubjects = Object.keys(grouped).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));
  
  sortedSubjects.forEach(subject => {
    const header = document.createElement('div');
    header.style.fontSize = '10px';
    header.style.fontWeight = '700';
    header.style.color = 'var(--text-muted)';
    header.style.textTransform = 'uppercase';
    header.style.padding = '6px 10px 2px';
    header.style.textAlign = 'center';
    header.style.letterSpacing = '0.5px';
    header.textContent = subject;
    menu.appendChild(header);
    
    const classes = grouped[subject].sort((a,b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
    
    classes.forEach(g => {
      const item = document.createElement('div');
      item.style.padding = '6px 12px';
      item.style.fontSize = '13px';
      item.style.fontWeight = '600';
      item.style.borderRadius = '8px';
      item.style.cursor = 'pointer';
      item.style.textAlign = 'center';
      item.style.transition = 'all var(--transition)';
      item.style.color = g.id === currentSeatingGroupId ? 'var(--text-accent)' : 'var(--text-primary)';
      item.style.background = g.id === currentSeatingGroupId ? 'var(--accent-soft)' : 'transparent';
      item.textContent = `Klasse ${g.className}`;
      
      item.onmouseover = () => {
        if (g.id !== currentSeatingGroupId) item.style.background = 'var(--bg-card-hover)';
      };
      item.onmouseout = () => {
        if (g.id !== currentSeatingGroupId) item.style.background = 'transparent';
      };
      
      item.onclick = (e) => {
        e.stopPropagation();
        currentSeatingGroupId = g.id;
        menu.classList.add('hidden');
        renderSeatingGroupSelect();
        renderSeatingPlan();
      };
      
      menu.appendChild(item);
    });
  });
}

function toggleCustomGroupDropdown(event) {
  event.stopPropagation();
  const menu = document.getElementById('seating-group-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Close dropdown on click outside
document.addEventListener('click', () => {
  const menu = document.getElementById('seating-group-menu');
  if (menu && !menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
  }
});

function renderSeatingDateStrip() {
  const container = document.getElementById('seating-date-strip');
  if (!container) return;
  container.innerHTML = '';
  
  const baseDate = currentSeatingDateStr ? new Date(currentSeatingDateStr) : new Date();
  
  const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  for(let i = -2; i <= 2; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dStr = formatDate(d);
    
    const chip = document.createElement('div');
    chip.className = 'date-chip';
    if (dStr === currentSeatingDateStr) chip.classList.add('active');
    
    const dayLabel = days[d.getDay()];
    const dateNum = d.getDate();
    
    chip.innerHTML = `<span class="date-chip-day">${dayLabel}</span><span class="date-chip-date">${dateNum}</span>`;
    chip.onclick = () => {
      currentSeatingDateStr = dStr;
      renderSeatingDateStrip();
      renderSeatingPlan();
    };
    container.appendChild(chip);
  }
}

function onHiddenDateChange(val) {
  if (val) {
    currentSeatingDateStr = val;
    renderSeatingDateStrip();
    renderSeatingPlan();
  }
}

let seatingEditMode = false;
function toggleSeatingEditMode() {
  seatingEditMode = !seatingEditMode;
  const btn = document.getElementById('btn-seating-edit');
  if (seatingEditMode) {
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    btn.style.background = 'var(--success, #10b981)';
    btn.style.color = 'white';
    btn.style.border = 'none';
  } else {
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.border = '';
  }
  renderSeatingPlan();
}

function toggleSeatingSettings(e) {
  if (e) e.stopPropagation();
  const popup = document.getElementById('seating-settings-popup');
  if (popup) popup.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  const popup = document.getElementById('seating-settings-popup');
  if (popup && !popup.classList.contains('hidden') && !e.target.closest('#seating-settings-popup') && !e.target.closest('button[title="Raster-Größe einstellen"]')) {
    popup.classList.add('hidden');
  }
});

function saveSeatingGrid() {
  const groupId = currentSeatingGroupId;
  if (!groupId) return;
  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;
  g.seatingCols = parseInt(document.getElementById('seating-cols').value) || 10;
  let rows = parseInt(document.getElementById('seating-rows').value) || 5;
  if (rows > 6) rows = 6;
  g.seatingRows = rows;
  saveDB();
  renderSeatingPlan();
}

function renderSeatingPlan() {
  const groupId = currentSeatingGroupId;
  const dateStr = currentSeatingDateStr;
  const canvas = document.getElementById('seating-canvas');
  const emptyState = document.getElementById('seating-empty');

  if (canvas) {
    if (seatingEditMode) {
      canvas.classList.add('edit-mode');
    } else {
      canvas.classList.remove('edit-mode');
    }
    const showGridAlways = !!db.settings.showSeatingGridAlways;
    canvas.classList.toggle('show-grid-always', showGridAlways);
    const showGridChk = document.getElementById('seating-show-grid-always');
    if (showGridChk) showGridChk.checked = showGridAlways;
  }

  if (lastSeatingGroupId !== groupId || lastSeatingDateStr !== dateStr) {
    activeSeatingGroups = null;
    lastSeatingGroupId = groupId;
    lastSeatingDateStr = dateStr;
  }

  // clear old elements
  canvas.querySelectorAll('.seating-card').forEach(c => c.remove());
  canvas.querySelectorAll('.seating-grid-cell').forEach(c => c.remove());
  canvas.querySelectorAll('.teacher-desk').forEach(c => c.remove());

  if (!groupId) {
    emptyState.classList.remove('hidden');
    return;
  }

  const g = db.groups.find(x => x.id === groupId);
  if (!g) return;

  const cols = g.seatingCols || 10;
  const rows = g.seatingRows || 5;
  document.getElementById('seating-cols').value = cols;
  document.getElementById('seating-rows').value = rows;

  const students = db.students[groupId] || [];
  if (!students.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Reset canvas size temporarily to get an accurate width without old scrollbars
  canvas.style.minWidth = '0px';
  canvas.style.minHeight = '0px';
  
  const wrapper = document.getElementById('seating-canvas-wrapper');
  const containerWidth = (wrapper ? wrapper.clientWidth : canvas.parentElement.clientWidth) - 40;
  const containerHeight = (wrapper ? wrapper.clientHeight : canvas.parentElement.clientHeight) - 40;
  
  // Square cells: use the smaller of the two to keep cells perfectly square
  const maxCellW = containerWidth / cols;
  const maxCellH = containerHeight / rows;
  const cellSize = Math.floor(Math.min(maxCellW, maxCellH));
  const cellWidth = cellSize;
  const cellHeight = cellSize;

  const isCompact = cellSize < 100;
  const gridWidth = cols * cellWidth;
  const gridHeight = rows * cellHeight;

  // Canvas wraps the grid exactly - no padding gap
  const offsetX = 0;
  const offsetY = 0;

  canvas.style.minWidth = gridWidth + 'px';
  canvas.style.maxWidth = gridWidth + 'px';
  canvas.style.minHeight = gridHeight + 'px';
  canvas.style.maxHeight = gridHeight + 'px';
  canvas.parentElement.style.overflow = 'hidden';

  // Draw Grid Cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'seating-grid-cell' + (c % 2 === 1 ? ' thick-border' : '');
      cell.style.left = (offsetX + c * cellWidth) + 'px';
      cell.style.top = (offsetY + r * cellHeight) + 'px';
      cell.style.width = cellWidth + 'px';
      cell.style.height = cellHeight + 'px';
      canvas.appendChild(cell);
    }
  }

  // Occupied matrix to find next free spot if a student has no coords
  const occupied = Array(rows).fill(null).map(() => Array(cols).fill(false));
  students.forEach(s => {
    if (s.gridX !== undefined && s.gridX < cols && s.gridY !== undefined && s.gridY < rows) {
      occupied[s.gridY][s.gridX] = true;
    }
  });

  students.forEach((s) => {
    const grades = (s.grades||[]).map(gr => parseFloat(gr.value)).filter(v => !isNaN(v));
    const avg = grades.length ? (grades.reduce((a,b)=>a+b,0)/grades.length).toFixed(1) : '–';
    
    // check absence, hw and participation
    const absence = (s.attendance||[]).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    const forgotHw = (s.homework||[]).some(h => h.date === dateStr);
    const participation = (s.participation||[]).find(p => p.date === dateStr);

    const card = document.createElement('div');
    card.className = 'seating-card';
    if (absence) {
      card.classList.add(absence.type === 'abwesend' ? 'is-absent-unexcused' : 'is-absent-excused');
    }
    if (forgotHw) {
      card.classList.add('forgot-hw');
    }
    card.dataset.id = s.id;
    
    // Position
    let gx = s.gridX;
    let gy = s.gridY;
    
    // Assign next free slot if out of bounds or not set
    if (gx === undefined || gy === undefined || gx >= cols || gy >= rows) {
      let found = false;
      for (let r = 0; r < rows && !found; r++) {
        for (let c = 0; c < cols && !found; c++) {
          if (!occupied[r][c]) {
            gx = c; gy = r;
            occupied[r][c] = true;
            found = true;
          }
        }
      }
      if (!found) { gx = 0; gy = 0; } // Fallback overlapping
    }
    
    s.gridX = gx;
    s.gridY = gy;

    // Set dataset for grid pos
    card.dataset.gridX = gx;
    card.dataset.gridY = gy;
    
    const maxCardSize = Math.min(cellWidth, cellHeight);
    const padding = Math.min(10, maxCardSize * 0.1);
    const cardSize = maxCardSize - (padding * 2);

    const centerX = offsetX + gx * cellWidth + (cellWidth - cardSize) / 2;
    const centerY = offsetY + gy * cellHeight + (cellHeight - cardSize) / 2;

    card.style.left = centerX + 'px';
    card.style.top = centerY + 'px';
    card.style.width = cardSize + 'px';
    card.style.height = cardSize + 'px';

    if (isCompact) card.classList.add('compact');

    let partHtml = '';
    if (participation) {
      const valLabels = { 'positive':'<span style="color:var(--success)">+</span>', 'neutral':'<span style="color:var(--warning)">=</span>', 'negative':'<span style="color:var(--danger)">-</span>' };
      partHtml = `<div style="position:absolute; top:-6px; right:-6px; font-size:16px; font-weight:800; background:var(--bg-elevated); padding:0 6px; border-radius:8px; border:2px solid var(--border); box-shadow:0 2px 6px rgba(0,0,0,0.3); line-height:1.2; z-index:10;">${valLabels[participation.value] || participation.value}</div>`;
    }

    card.innerHTML = `
      <div class="sc-name" style="font-size:13px; margin-top:2px;">${escHtml(s.firstName)}</div>
      <div class="sc-gpa" style="color:${gradeColor(parseFloat(avg))}">${avg}</div>
      ${forgotHw ? '<div class="sc-hw-note">Keine HA</div>' : ''}
      ${partHtml}
    `;

    if (seatingEditMode) {
      makeDraggable(card, s.id, groupId, cellWidth, cellHeight, cols, rows, offsetX);
      card.classList.add('draggable-mode');
    } else {
      card.addEventListener('click', (e) => {
        openSeatingStudentModal(s.id, groupId, dateStr);
      });
    }

    // Re-apply active groups if any
    if (activeSeatingGroups && activeSeatingGroups[s.id]) {
      const gInfo = activeSeatingGroups[s.id];
      card.classList.add('grouped');
      card.style.borderColor = gInfo.color;
      card.style.boxShadow = `0 0 10px ${gInfo.color}80, inset 0 0 5px ${gInfo.color}30`;
      
      const badge = document.createElement('div');
      badge.className = 'seating-group-badge';
      badge.textContent = gInfo.groupName;
      badge.style.backgroundColor = gInfo.color;
      card.appendChild(badge);
    }

    canvas.appendChild(card);
  });

  // Render Teacher Desk
  if (g) {
    const tdX = g.teacherDeskX !== undefined ? g.teacherDeskX : Math.floor(cols/2) - 1;
    const tdY = g.teacherDeskY !== undefined ? g.teacherDeskY : rows - 1;

    const tDesk = document.createElement('div');
    tDesk.className = 'teacher-desk';
    const maxCardSize = Math.min(cellWidth, cellHeight);
    const padding = Math.min(10, maxCardSize * 0.1);
    const cardSize = maxCardSize - (padding * 2);

    const centerX = offsetX + tdX * cellWidth + (cellWidth * 2 - (cardSize * 2 + padding * 2)) / 2;
    const centerY = offsetY + tdY * cellHeight + (cellHeight - cardSize) / 2;

    tDesk.style.left = centerX + 'px';
    tDesk.style.top = centerY + 'px';
    tDesk.style.width = (cardSize * 2 + padding * 2) + 'px';
    tDesk.style.height = cardSize + 'px';
    tDesk.innerHTML = 'Lehrerpult';

    if (seatingEditMode) {
      makeDraggable(tDesk, 'teacherDesk', groupId, cellWidth, cellHeight, cols, rows, offsetX, 2);
      tDesk.classList.add('draggable-mode');
    }
    
    canvas.appendChild(tDesk);
  }
}

// ─── Seating Plan Live Features: Randomizer & Groups ──────────────────────
let lastSelectedRandomStudentId = null;
const groupColors = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4',
  '#ec4899', '#eab308', '#6366f1', '#14b8a6', '#84cc16', '#a855f7'
];

function startSeatingRandomizer() {
  const groupId = currentSeatingGroupId;
  const dateStr = currentSeatingDateStr;
  if (!groupId) {
    showToast('Keine Klasse ausgewählt', 'error');
    return;
  }
  
  const students = db.students[groupId] || [];
  const presentStudents = students.filter(s => {
    const absence = (s.attendance || []).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    return !absence;
  });

  if (presentStudents.length === 0) {
    showToast('Keine anwesenden Schüler in dieser Klasse!', 'error');
    return;
  }

  const modal = document.getElementById('modal-seating-randomizer');
  const nameEl = document.getElementById('random-student-name');
  
  nameEl.textContent = 'Auswahl läuft...';
  modal.classList.remove('hidden');

  document.querySelectorAll('.seating-card').forEach(card => {
    card.classList.remove('random-highlight', 'random-winner');
  });

  let duration = 2000;
  let start = Date.now();
  let delay = 50;
  
  function tick() {
    const elapsed = Date.now() - start;
    const index = Math.floor(Math.random() * presentStudents.length);
    const candidate = presentStudents[index];
    
    document.querySelectorAll('.seating-card').forEach(card => {
      card.classList.toggle('random-highlight', card.dataset.id === candidate.id);
    });

    if (elapsed < duration) {
      delay = 50 + Math.pow(elapsed / duration, 2) * 300;
      setTimeout(tick, delay);
    } else {
      let finalStudent = candidate;
      if (presentStudents.length > 1 && candidate.id === lastSelectedRandomStudentId) {
        const otherStudents = presentStudents.filter(s => s.id !== lastSelectedRandomStudentId);
        finalStudent = otherStudents[Math.floor(Math.random() * otherStudents.length)];
      }
      
      lastSelectedRandomStudentId = finalStudent.id;
      window.currentRandomStudent = { studentId: finalStudent.id, groupId, dateStr };

      document.querySelectorAll('.seating-card').forEach(card => {
        card.classList.remove('random-highlight');
        if (card.dataset.id === finalStudent.id) {
          card.classList.add('random-winner');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      nameEl.textContent = finalStudent.firstName + ' ' + finalStudent.lastName;
    }
  }

  tick();
}

function openSeatingGroupModal() {
  if (!currentSeatingGroupId) {
    showToast('Keine Klasse ausgewählt', 'error');
    return;
  }
  openModal('modal-seating-groups');
}

function generateSeatingGroups() {
  const groupId = currentSeatingGroupId;
  const dateStr = currentSeatingDateStr;
  
  const size = parseInt(document.getElementById('seating-group-size').value) || 3;
  const method = document.getElementById('seating-group-method').value;

  const students = db.students[groupId] || [];
  const presentStudents = students.filter(s => {
    const absence = (s.attendance || []).find(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
    return !absence;
  });

  if (presentStudents.length === 0) {
    showToast('Keine anwesenden Schüler zum Einteilen!', 'error');
    return;
  }

  clearSeatingGroups(false);

  let groups = [];
  if (method === 'random') {
    const shuffled = [...presentStudents].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += size) {
      groups.push(shuffled.slice(i, i + size));
    }
  } else if (method === 'proximity') {
    const ungrouped = [...presentStudents];
    
    while (ungrouped.length > 0) {
      const current = ungrouped.shift();
      const currentGroup = [current];
      
      while (currentGroup.length < size && ungrouped.length > 0) {
        let bestIndex = -1;
        let minDist = Infinity;
        
        for (let i = 0; i < ungrouped.length; i++) {
          const candidate = ungrouped[i];
          const dist = Math.sqrt(
            Math.pow((current.gridX || 0) - (candidate.gridX || 0), 2) +
            Math.pow((current.gridY || 0) - (candidate.gridY || 0), 2)
          );
          if (dist < minDist) {
            minDist = dist;
            bestIndex = i;
          }
        }
        
        if (bestIndex !== -1) {
          currentGroup.push(ungrouped.splice(bestIndex, 1)[0]);
        }
      }
      
      groups.push(currentGroup);
    }
  }

  activeSeatingGroups = {};
  groups.forEach((group, groupIndex) => {
    const color = groupColors[groupIndex % groupColors.length];
    const groupName = `G${groupIndex + 1}`;
    group.forEach(student => {
      activeSeatingGroups[student.id] = { color, groupName };
    });
  });

  renderSeatingPlan();
  closeModal('modal-seating-groups');
  showToast(`${groups.length} Gruppen gebildet!`);
}

function clearSeatingGroups(showMsg = true) {
  activeSeatingGroups = null;
  document.querySelectorAll('.seating-card.grouped').forEach(card => {
    card.classList.remove('grouped');
    card.style.borderColor = '';
    card.style.boxShadow = '';
    card.querySelectorAll('.seating-group-badge').forEach(b => b.remove());
  });
  if (showMsg) {
    closeModal('modal-seating-groups');
    showToast('Gruppen aufgehoben');
  }
}

function onToggleShowGridAlways(checked) {
  if (!db.settings) db.settings = {};
  db.settings.showSeatingGridAlways = checked;
  saveDB();
  renderSeatingPlan();
}

function removeNextLessonNote(groupId, dateStr, noteString) {
  const relatedSlots = db.lessonSlots.filter(slot => slot.groupId === groupId);
  if (!relatedSlots.length) return;
  const from = new Date(dateStr + 'T12:00:00');
  let nextLesson = null;
  for (let i = 1; i <= 28 && !nextLesson; i++) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + i);
    const localDay = (candidate.getDay() + 6) % 7;
    for (const slot of relatedSlots) {
      if (slot.day === localDay) {
        nextLesson = { dateStr: candidate.toISOString().split('T')[0], slotId: slot.id };
        break;
      }
    }
  }
  if (nextLesson) {
    const key = nextLesson.slotId + '_' + nextLesson.dateStr;
    if (db.lessonData[key] && db.lessonData[key].notes) {
      db.lessonData[key].notes = db.lessonData[key].notes.replace(noteString, '').replace(/^\n+|\n+$/g, '').replace(/\n\n+/g, '\n').trim();
    }
  }
}

function setSeatingAbsence(type) {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.attendance) s.attendance = [];
  
  const existingIdx = s.attendance.findIndex(a => a.date === dateStr && (a.type === 'abwesend' || a.type === 'entschuldigt'));
  if (existingIdx !== -1 && s.attendance[existingIdx].type === type) {
    if (type === 'abwesend') {
      removeNextLessonNote(groupId, dateStr, `${s.firstName} hat letzte Stunde unentschuldigt gefehlt`);
    }
    s.attendance.splice(existingIdx, 1);
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Eintrag entfernt');
    return;
  }
  
  // Remove existing
  const wasAbwesend = s.attendance.some(a => a.date === dateStr && a.type === 'abwesend');
  if (wasAbwesend && type !== 'abwesend') {
    removeNextLessonNote(groupId, dateStr, `${s.firstName} hat letzte Stunde unentschuldigt gefehlt`);
  }
  s.attendance = s.attendance.filter(a => a.date !== dateStr || (a.type !== 'abwesend' && a.type !== 'entschuldigt'));
  
  // Add new
  s.attendance.push({ id: uid(), date: dateStr, type: type, note: '' });

  // If unexcused, add note to next lesson
  if (type === 'abwesend') {
    const relatedSlots = db.lessonSlots.filter(slot => slot.groupId === groupId && slot.recurring);
    if (relatedSlots.length > 0) {
      const from = new Date(dateStr + 'T12:00:00');
      let nextLesson = null;
      for (let i = 1; i <= 28 && !nextLesson; i++) {
        const candidate = new Date(from);
        candidate.setDate(from.getDate() + i);
        const localDay = (candidate.getDay() + 6) % 7;
        for (const slot of relatedSlots) {
          if (slot.day === localDay) {
            nextLesson = { dateStr: candidate.toISOString().split('T')[0], slotId: slot.id };
            break;
          }
        }
      }
      if (nextLesson) {
        const key = nextLesson.slotId + '_' + nextLesson.dateStr;
        if (!db.lessonData[key]) db.lessonData[key] = {};
        const note = `${s.firstName} hat letzte Stunde unentschuldigt gefehlt`;
        if (!db.lessonData[key].notes) {
          db.lessonData[key].notes = note;
        } else if (!db.lessonData[key].notes.includes(note)) {
          db.lessonData[key].notes += '\n' + note;
        }
      }
    }
  }

  saveDB();
  renderSeatingPlan();
  closeModal('modal-seating-student');
  showToast(type === 'abwesend' ? 'Unentschuldigt eingetragen' : 'Entschuldigt eingetragen');
}

function setSeatingHomework() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;
  if (!s.homework) s.homework = [];
  
  const existingIdx = s.homework.findIndex(h => h.date === dateStr);
  if (existingIdx === -1) {
    s.homework.push({ id: uid(), date: dateStr, note: '' });
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Hausaufgabe vergessen eingetragen', 'warning');
  } else {
    s.homework.splice(existingIdx, 1);
    saveDB();
    renderSeatingPlan();
    closeModal('modal-seating-student');
    showToast('Eintrag entfernt');
  }
}

function makeDraggable(el, studentId, groupId, cellWidth, cellHeight, maxCols, maxRows, offsetX = 0, widthCells = 1) {
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  function dragStart(e) {
    if (e.target.closest('.sc-absent-toggle')) return;
    isDragging = true;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    startX = clientX;
    startY = clientY;
    initialLeft = parseFloat(el.style.left) || 0;
    initialTop = parseFloat(el.style.top) || 0;
    el.classList.add('dragging');

    document.addEventListener('mousemove', drag, {passive: false});
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchmove', drag, {passive: false});
    document.addEventListener('touchend', dragEnd);
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    if (Math.abs(clientX - startX) > 3 || Math.abs(clientY - startY) > 3) {
      el.dataset.dragged = 'true';
    }

    const currentX = initialLeft + (clientX - startX);
    const currentY = initialTop + (clientY - startY);
    el.style.left = currentX + 'px';
    el.style.top = currentY + 'px';
  }

  function dragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    el.classList.remove('dragging');

    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('touchend', dragEnd);
    
    if (el.dataset.dragged) {
      // Calculate closest grid snap relative to centered grid
      const centerX = parseFloat(el.style.left) + (el.offsetWidth / 2);
      const centerY = parseFloat(el.style.top) + (el.offsetHeight / 2);
      
      let gridX = Math.floor((centerX - offsetX) / cellWidth);
      let gridY = Math.floor(centerY / cellHeight);
      
      // Clamp bounds
      if (gridX < 0) gridX = 0; if (gridX + widthCells > maxCols) gridX = maxCols - widthCells;
      if (gridY < 0) gridY = 0; if (gridY >= maxRows) gridY = maxRows - 1;

      if (studentId === 'teacherDesk') {
        const g = db.groups.find(x => x.id === groupId);
        if (g) {
          g.teacherDeskX = gridX;
          g.teacherDeskY = gridY;
          saveDB();
          renderSeatingPlan();
        }
      } else {
        const s = db.students[groupId].find(x => x.id === studentId);
        if (s) {
          const otherStudent = db.students[groupId].find(x => x.id !== studentId && x.gridX === gridX && x.gridY === gridY);
          if (otherStudent) {
            otherStudent.gridX = s.gridX;
            otherStudent.gridY = s.gridY;
          }
          s.gridX = gridX;
          s.gridY = gridY;
          saveDB();
          renderSeatingPlan();
        }
      }
    }
  }

  el.addEventListener('mousedown', dragStart);
  el.addEventListener('touchstart', dragStart, {passive: false});
}


function openSeatingStudentModal(studentId, groupId, dateStr) {
  const s = db.students[groupId].find(x => x.id === studentId);
  if (!s) return;
  document.getElementById('seating-student-title').textContent = `${s.firstName} ${s.lastName}`;
  document.getElementById('seating-student-date-label').textContent = `Mitarbeit am ${formatDateDE(new Date(dateStr+'T12:00:00'))}`;
  
  // Save context for smiley buttons
  window.currentSeatingStudent = { studentId, groupId, dateStr };

  // Render participation summary
  const partPos = (s.participation||[]).filter(p => p.value==='positive').length;
  const partNeutral = (s.participation||[]).filter(p => p.value==='neutral').length;
  const partNeg = (s.participation||[]).filter(p => p.value==='negative').length;
  document.getElementById('seating-student-participation-summary').innerHTML = `
    <span style="color:var(--success)">${partPos}</span> : 
    <span style="color:var(--warning)">${partNeutral}</span> : 
    <span style="color:var(--danger)">${partNeg}</span>
  `;

  // Render grades
  const gradesContainer = document.getElementById('seating-student-grades');
  gradesContainer.innerHTML = '';
  if (!s.grades || !s.grades.length) {
    gradesContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:10px;">Keine Noten vorhanden</div>';
  } else {
    // Sort chronologically (descending)
    const sortedGrades = s.grades.map((g, idx) => ({...g, _origIdx: idx})).sort((a,b) => b.date.localeCompare(a.date));
    sortedGrades.forEach(g => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); padding:8px 12px; border-radius:8px; font-size:13px;';
      const valColor = gradeColor(parseFloat(g.value));
      el.innerHTML = `
        <div style="display:flex; flex-direction:column; flex:1;">
          <span style="font-weight:600; color:var(--text-primary)">${escHtml(g.note ?? gradeTypeLabel(g.type))}</span>
          <span style="font-size:11px; color:var(--text-muted)">${formatDateShort(g.date)}</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="font-weight:800; font-size:15px; color:${valColor}">${g.value}</div>
          <button class="btn-icon" style="padding:4px;" onclick="openGradeForm('${studentId}', '${groupId}', ${g._origIdx})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>
      `;
      gradesContainer.appendChild(el);
    });
  }

  openModal('modal-seating-student');
}

function openGradeFormForCurrentStudent() {
  const { studentId, groupId } = window.currentSeatingStudent;
  if (studentId && groupId) {
    openGradeForm(studentId, groupId, -1);
  }
}

// ─── Global Grade Form ────────────────────────────────────────────────────
let currentGradeFormCtx = null; // { studentId, groupId, gradeIdx }

function openGradeForm(studentId, groupId, gradeIdx, defaultDateStr = '', defaultLabel = '') {
  currentGradeFormCtx = { studentId, groupId, gradeIdx };
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;

  // Hide the quick student modal if it's open, so they don't overlap awkwardly
  const seatingModal = document.getElementById('modal-seating-student');
  if (!seatingModal.classList.contains('hidden')) {
    seatingModal.classList.add('hidden');
    currentGradeFormCtx.wasSeatingModalOpen = true;
  }

  // Also hide the detailed student modal from the classes view
  const detailModal = document.getElementById('modal-student-detail');
  if (detailModal && !detailModal.classList.contains('hidden')) {
    detailModal.classList.add('hidden');
    currentGradeFormCtx.wasDetailModalOpen = true;
  }

  const btnDelete = document.getElementById('gf-btn-delete');
  if (gradeIdx >= 0 && s.grades && s.grades[gradeIdx]) {
    const g = s.grades[gradeIdx];
    document.getElementById('grade-form-title').textContent = 'Note bearbeiten';
    document.getElementById('gf-type').value = g.type || 'test';
    document.getElementById('gf-value').value = g.value || '';
    document.getElementById('gf-date').value = g.date || formatDate(new Date());
    document.getElementById('gf-label').value = g.note || g.label || '';
    btnDelete.style.display = 'block';
  } else {
    document.getElementById('grade-form-title').textContent = 'Neue Note';
    document.getElementById('gf-type').value = 'test';
    document.getElementById('gf-value').value = '';
    document.getElementById('gf-date').value = defaultDateStr || formatDate(new Date());
    document.getElementById('gf-label').value = defaultLabel || '';
    btnDelete.style.display = 'none';
  }
  openModal('modal-grade-form');
}

function closeGradeForm() {
  closeModal('modal-grade-form');
  if (currentGradeFormCtx) {
    if (currentGradeFormCtx.wasSeatingModalOpen) {
      const { studentId, groupId } = currentGradeFormCtx;
      // Re-open underlying modal
      openSeatingStudentModal(studentId, groupId, window.currentSeatingStudent.dateStr);
    }
    if (currentGradeFormCtx.wasDetailModalOpen) {
      const detailModal = document.getElementById('modal-student-detail');
      if (detailModal) detailModal.classList.remove('hidden');
    }
  }
}

function saveGradeFromForm() {
  if (!currentGradeFormCtx) return;
  const { studentId, groupId, gradeIdx } = currentGradeFormCtx;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s) return;

  const type = document.getElementById('gf-type').value;
  const value = document.getElementById('gf-value').value.trim();
  const dateStr = document.getElementById('gf-date').value;
  const label = document.getElementById('gf-label').value.trim();

  if (!value) { showToast('Bitte einen Wert eingeben', 'error'); return; }

  const numVal = parseFloat(value);
  const finalValue = !isNaN(numVal) ? numVal.toFixed(1) : value;

  if (!s.grades) s.grades = [];

  if (gradeIdx >= 0 && gradeIdx < s.grades.length) {
    s.grades[gradeIdx] = { type, value: finalValue, date: dateStr, note: label };
    showToast('Note aktualisiert');
  } else {
    s.grades.push({ type, value: finalValue, date: dateStr, note: label });
    showToast('Note hinzugefügt');
  }

  saveDB();
  closeGradeForm();
  
  if (!document.getElementById('view-overview').classList.contains('hidden')) {
    renderOverviewTable();
  }
  const detailModal = document.getElementById('modal-student-detail');
  if (detailModal && !detailModal.classList.contains('hidden')) {
    renderGradesList(s);
    renderStudents();
    if (typeof renderDashboard === 'function') renderDashboard();
  }
}

function deleteGradeFromForm() {
  if (!currentGradeFormCtx) return;
  const { studentId, groupId, gradeIdx } = currentGradeFormCtx;
  const s = db.students[groupId]?.find(x => x.id === studentId);
  if (!s || gradeIdx < 0) return;

  s.grades.splice(gradeIdx, 1);
  saveDB();
  showToast('Note gelöscht');
  closeGradeForm();

  if (!document.getElementById('view-overview').classList.contains('hidden')) {
    renderOverviewTable();
  }
}

// ─── Lesson Quick Access ──────────────────────────────────────────────────
function openClassOverviewFromLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !slot.groupId) return;
  closeModal('modal-lesson');
  openClassOverview(slot.groupId);
}

function openQuickStudentListFromLesson() {
  const slot = db.lessonSlots.find(s => s.id === activeLessonId);
  if (!slot || !slot.groupId) return;
  
  const students = db.students[slot.groupId] || [];
  const listContainer = document.getElementById('lesson-students-list');
  listContainer.innerHTML = '';
  
  if (!students.length) {
    listContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);">Keine Schüler in dieser Klasse.</div>';
  } else {
    const sorted = sortStudents(students);
    sorted.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:12px 16px; border-bottom:1px solid var(--border); cursor:pointer; font-weight:500;';
      row.textContent = `${s.lastName}, ${s.firstName}`;
      row.onclick = () => {
        closeModal('modal-lesson-students');
        openSeatingStudentModal(s.id, slot.groupId, activeLessonDate);
      };
      listContainer.appendChild(row);
    });
  }
  openModal('modal-lesson-students');
}

function addParticipationSmiley(type) {
  const { studentId, groupId, dateStr } = window.currentSeatingStudent;
  const s = db.students[groupId].find(x => x.id === studentId);
  if (!s) return;
  
  if (!s.participation) s.participation = [];
  
  // check if a smiley already exists for this date, if so, override it, else push new
  const existingIdx = s.participation.findIndex(p => p.date === dateStr);
  if (existingIdx !== -1) {
    if (s.participation[existingIdx].value === type) {
      s.participation.splice(existingIdx, 1);
      saveDB();
      renderSeatingPlan();
      showToast('Eintrag entfernt');
      closeModal('modal-seating-student');
      return;
    } else {
      s.participation[existingIdx].value = type;
    }
  } else {
    s.participation.push({ id: uid(), date: dateStr, value: type });
  }
  
  saveDB();
  renderSeatingPlan();
  showToast('Mitarbeit gespeichert');
  closeModal('modal-seating-student');
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function createEntryItem(text, date, onDelete) {
  const el = document.createElement('div');
  el.className = 'entry-item';
  el.innerHTML = `
    <span class="entry-item-text">${escHtml(text)}</span>
    <span class="entry-item-date">${date ? formatDateShort(date) : ''}</span>
    <button class="entry-item-delete">✕</button>`;
  el.querySelector('.entry-item-delete').onclick = onDelete;
  return el;
}

function openModal(id)  { const m = document.getElementById(id); if(m) m.classList.remove('hidden'); }
function closeModal(id) { const m = document.getElementById(id); if(m) m.classList.add('hidden'); }
function closeModalOnOverlay(event, id) { if (event.target === document.getElementById(id)) closeModal(id); }

function showToast(msg, type='success') {
  const t = Object.assign(document.createElement('div'), { className:`toast ${type}`, textContent: msg });
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => { t.style.cssText='opacity:0;transition:opacity .3s'; setTimeout(()=>t.remove(),300); }, 2500);
}

function escHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str||''));
  return d.innerHTML;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr+'T00:00:00').toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function gradeColor(val) {
  if (isNaN(val)) return 'var(--text-muted)';
  if (val<=1.5) return 'var(--grade-1)'; if (val<=2.5) return 'var(--grade-2)';
  if (val<=3.5) return 'var(--grade-3)'; if (val<=4.5) return 'var(--grade-4)';
  return 'var(--grade-5)';
}

function gradeTypeLabel(type) {
  return {schularbeit:'Schularbeit',test:'Test',muendlich:'Mündlich',mitarbeit:'Mitarbeit',
          projekt:'Projekt',hausaufgabe:'HA',sonstig:'Sonstiges'}[type] || type;
}

// ─── Keyboard ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-lesson','modal-add-lesson','modal-add-group','modal-add-student','modal-student-detail','modal-settings']
      .forEach(m => closeModal(m));
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    if (document.activeElement.id === 'new-hw-text')   addHWItem();
    if (document.activeElement.id === 'new-test-text') addTestItem();
    if (document.activeElement.id === 'new-att-note')  addAttendanceEntry();
    if (document.activeElement.id === 'new-student-note-text') addStudentNote();
  }
});

document.addEventListener('focusin', e => {
  if (e.target.type === 'date' && !e.target.value) e.target.value = formatDate(new Date());
});

// Fix for iOS Safari keyboard scroll bug in fixed modals
document.addEventListener('focusout', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }, 50);
  }
});

// ─── Custom Form Dropdowns ────────────────────────────────────────────────
function makeCustomFormDropdown(selectEl) {
  if (selectEl.dataset.customDropdownInitialized) return;
  selectEl.dataset.customDropdownInitialized = 'true';
  selectEl.style.display = 'none';

  const container = document.createElement('div');
  container.className = 'custom-form-dropdown';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-form-dropdown-trigger';
  
  const label = document.createElement('span');
  label.style.flex = '1';
  label.style.textAlign = 'left';
  label.style.overflow = 'hidden';
  label.style.textOverflow = 'ellipsis';
  label.style.whiteSpace = 'nowrap';

  const svg = document.createElement('div');
  svg.style.flexShrink = '0';
  svg.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6; margin-left: 8px;"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  trigger.appendChild(label);
  trigger.appendChild(svg);

  const menu = document.createElement('div');
  menu.className = 'custom-form-dropdown-menu';

  container.appendChild(trigger);
  container.appendChild(menu);

  selectEl.parentNode.insertBefore(container, selectEl.nextSibling);

  function renderMenu() {
    menu.innerHTML = '';
    let selectedText = '...';
    
    const renderOption = (opt) => {
      const item = document.createElement('div');
      item.className = 'custom-form-dropdown-item';
      item.textContent = opt.textContent;
      item.dataset.value = opt.value;
      if (selectEl.value === opt.value) {
        item.classList.add('selected');
        selectedText = opt.textContent;
      }
      item.onclick = (e) => {
        e.stopPropagation();
        selectEl.value = opt.value;
        selectEl.dispatchEvent(new Event('change', { bubbles: true }));
        menu.classList.remove('show');
        renderMenu(); // Re-render to update selected state
        
        // Execute inline onchange if present
        if (typeof selectEl.onchange === 'function') {
           selectEl.onchange();
        }
      };
      return item;
    };

    Array.from(selectEl.children).forEach(child => {
      if (child.tagName === 'OPTGROUP') {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'custom-form-dropdown-optgroup';
        groupLabel.textContent = child.label;
        menu.appendChild(groupLabel);
        Array.from(child.children).forEach(opt => {
          menu.appendChild(renderOption(opt));
        });
      } else if (child.tagName === 'OPTION') {
        menu.appendChild(renderOption(child));
      }
    });

    label.textContent = selectedText;
  }

  // Initial render
  renderMenu();

  trigger.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isShowing = menu.classList.contains('show');
    document.querySelectorAll('.custom-form-dropdown-menu.show').forEach(m => m.classList.remove('show'));
    const seatingMenu = document.getElementById('seating-group-menu');
    if (seatingMenu) seatingMenu.classList.add('hidden'); // Close seating menu
    if (!isShowing) menu.classList.add('show');
  };

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      menu.classList.remove('show');
    }
  });

  // Watch for DOM changes (e.g. innerHTML updates)
  const observer = new MutationObserver(() => {
    renderMenu();
  });
  observer.observe(selectEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });

  // Override value setter to update UI programmatically
  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  if (originalDescriptor && !selectEl.dataset.valueOverridden) {
    Object.defineProperty(selectEl, 'value', {
      get: function() { return originalDescriptor.get.call(this); },
      set: function(val) {
        originalDescriptor.set.call(this, val);
        renderMenu();
      }
    });
    selectEl.dataset.valueOverridden = 'true';
  }
}

function initAllCustomDropdowns() {
  document.querySelectorAll('select.form-input').forEach(makeCustomFormDropdown);
}

// ─── Init ─────────────────────────────────────────────────────────────────
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  applyThemePreview();
  renderTimetable();
  renderSubjectGroups();
  initAllCustomDropdowns();
}



// ─── PWA Update Logic ───────────────────────────────────────────────────
function forceAppUpdate() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
        showToast('App wird aktualisiert...', 'success');
        setTimeout(() => {
          window.location.reload(true);
        }, 800);
      });
    });
  } else {
    window.location.reload(true);
  }
}
// ─── Resize Observer for Smart Fit ────────────────────────────────────────
let seatingResizeTimeout;
const mainContentObserver = new ResizeObserver(() => {
  const viewSeating = document.getElementById('view-seating');
  if (viewSeating && viewSeating.classList.contains('active')) {
    clearTimeout(seatingResizeTimeout);
    seatingResizeTimeout = setTimeout(() => {
      renderSeatingPlan();
    }, 150);
  }
});
const mainContentNode = document.getElementById('main-content');
if (mainContentNode) mainContentObserver.observe(mainContentNode);

// ─── Dashboard & Warnungen ─────────────────────────────────────────────
function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  if (!db.acknowledgedWarnings) db.acknowledgedWarnings = {};

  const warnAbsences = db.settings.warnAbsences !== undefined ? db.settings.warnAbsences : 3;
  const warnHomework = db.settings.warnHomework !== undefined ? db.settings.warnHomework : 3;
  const warnGrade    = db.settings.warnGrade !== undefined ? db.settings.warnGrade : 4.5;

  let warnings = [];

  db.groups.forEach(group => {
    const students = db.students[group.id] || [];
    students.forEach(s => {
      // 1. Absences
      const unexcused = (s.attendance || []).filter(a => a.type === 'abwesend').length;
      if (unexcused >= warnAbsences && unexcused > (db.acknowledgedWarnings[`${s.id}_absences`] || 0)) {
        warnings.push({
          student: s,
          group: group,
          type: 'absences',
          title: 'Zu viele unentschuldigte Fehlzeiten',
          desc: `${escHtml(s.firstName)} ${escHtml(s.lastName)} hat ${unexcused} unentschuldigte Fehlzeiten.`,
          count: unexcused
        });
      }

      // 2. Homework
      const hwCount = (s.homework || []).length;
      if (hwCount >= warnHomework && hwCount > (db.acknowledgedWarnings[`${s.id}_homework`] || 0)) {
        warnings.push({
          student: s,
          group: group,
          type: 'homework',
          title: 'Oft Hausaufgaben vergessen',
          desc: `${escHtml(s.firstName)} ${escHtml(s.lastName)} hat ${hwCount}-mal die Hausaufgaben vergessen.`,
          count: hwCount
        });
      }

      // 3. Grades
      const grades = s.grades || [];
      if (grades.length > 0) {
        const avg = calculateStudentAverage(s, group.id);
        if (avg !== null && avg >= warnGrade && grades.length > (db.acknowledgedWarnings[`${s.id}_grade`] || 0)) {
          warnings.push({
            student: s,
            group: group,
            type: 'grade',
            title: 'Kritischer Notenstand',
            desc: `${escHtml(s.firstName)} ${escHtml(s.lastName)} steht aktuell auf ${avg.toFixed(2)}.`,
            count: grades.length
          });
        }
      }
    });
  });

  if (warnings.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px; color:var(--text-muted);">
        <div style="font-size:48px; margin-bottom:16px;">🎉</div>
        <h3 style="margin-bottom:8px; font-weight:600; color:var(--text-primary);">Alles im grünen Bereich!</h3>
        <p>Aktuell gibt es keine aktiven Warnungen.</p>
      </div>`;
    return;
  }

  // Render warnings
  let html = `<h2 style="margin-bottom:20px;">Aktuelle Warnungen (${warnings.length})</h2><div style="display:flex; flex-direction:column; gap:16px;">`;
  warnings.forEach(w => {
    let icon = '⚠️';
    let color = 'var(--warning)';
    if (w.type === 'absences') { icon = '🛑'; color = 'var(--danger)'; }
    else if (w.type === 'grade') { icon = '📉'; color = 'var(--danger)'; }
    else if (w.type === 'homework') { icon = '📝'; color = 'var(--warning)'; }

    html += `
      <div style="background:var(--bg-elevated); border-left: 4px solid ${color}; padding:16px; border-radius:var(--radius); display:flex; justify-content:space-between; align-items:center; gap: 16px; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-card-hover)'" onmouseout="this.style.background='var(--bg-elevated)'">
        <div style="flex:1; cursor:pointer;" onclick="openStudentDetailFromDashboard('${w.student.id}', '${w.group.id}', '${w.type}')" title="Zum Schülerprofil springen">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span style="font-size:20px;">${icon}</span>
            <span style="font-weight:600; color:var(--text-primary); font-size:15px;">${w.title}</span>
            <span style="font-size:12px; background:var(--bg-secondary); padding:2px 6px; border-radius:4px; color:var(--text-secondary); white-space:nowrap;">${escHtml(w.group.className)} - ${escHtml(w.group.subject)}</span>
          </div>
          <div style="color:var(--text-secondary); font-size:14px; margin-left:36px; line-height:1.4;">
            ${w.desc}
          </div>
        </div>
        <div>
          <button class="btn-secondary" onclick="acknowledgeWarning('${w.student.id}', '${w.type}', ${w.count})" style="font-size:13px; padding:6px 12px; min-width:80px;">Erledigt</button>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

window.acknowledgeWarning = function(studentId, type, count) {
  if (!db.acknowledgedWarnings) db.acknowledgedWarnings = {};
  db.acknowledgedWarnings[`${studentId}_${type}`] = count;
  saveDB();
  renderDashboard();
};

window.openStudentDetailFromDashboard = function(studentId, groupId, type) {
  closeModal('modal-settings');
  closeGradeForm();
  switchView('classes');
  openGroupStudents(groupId);
  openStudentDetail(studentId);
  if (type === 'absences') {
    switchStudentTab('attendance');
  } else if (type === 'grade') {
    switchStudentTab('grades');
  } else if (type === 'homework') {
    switchStudentTab('notes');
  }
};

window.jumpToStudentDetailFromSeating = function() {
  if (!window.currentSeatingStudent) return;
  const { studentId, groupId } = window.currentSeatingStudent;
  closeModal('modal-seating-student');
  switchView('classes');
  openGroupStudents(groupId);
  openStudentDetail(studentId);
};


// ─── Timer & Stopwatch ───────────────────────────────────────────────────
let timerInterval = null;
let timerSeconds = 300; // 5 mins default
let timerIsRunning = false;

function updateTimerDisplay() {
  const el = document.getElementById('timer-display');
  if (!el) return;
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const s = (timerSeconds % 60).toString().padStart(2, '0');
  el.textContent = m + ':' + s;
}

function adjustTimer(mins) {
  if (timerIsRunning) return;
  timerSeconds += mins * 60;
  if (timerSeconds < 0) timerSeconds = 0;
  updateTimerDisplay();
}

function toggleTimer() {
  const btn = document.getElementById('btn-timer-toggle');
  if (timerIsRunning) {
    clearInterval(timerInterval);
    timerIsRunning = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  } else {
    if (timerSeconds <= 0) return;
    timerIsRunning = true;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerIsRunning = false;
        btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        showToast('Timer abgelaufen!');
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerIsRunning = false;
  timerSeconds = 300;
  document.getElementById('btn-timer-toggle').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  updateTimerDisplay();
}

let stopwatchInterval = null;
let stopwatchMs = 0;
let stopwatchIsRunning = false;
let stopwatchLastTick = 0;

function updateStopwatchDisplay() {
  const el = document.getElementById('stopwatch-display');
  if (!el) return;
  const totalSeconds = Math.floor(stopwatchMs / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((stopwatchMs % 1000) / 100).toString();
  el.textContent = m + ':' + s + '.' + ms;
}

function toggleStopwatch() {
  const btn = document.getElementById('btn-stopwatch-toggle');
  if (stopwatchIsRunning) {
    clearInterval(stopwatchInterval);
    stopwatchIsRunning = false;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  } else {
    stopwatchIsRunning = true;
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    stopwatchLastTick = Date.now();
    stopwatchInterval = setInterval(() => {
      const now = Date.now();
      stopwatchMs += (now - stopwatchLastTick);
      stopwatchLastTick = now;
      updateStopwatchDisplay();
    }, 100);
  }
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchIsRunning = false;
  stopwatchMs = 0;
  document.getElementById('btn-stopwatch-toggle').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  updateStopwatchDisplay();
}


// ─── Cloud Sync (E2EE) Implementation ──────────────────────────────────────

// Initialisiert die Synchronisierung beim Laden der App
function initSync() {
  // 1. Initialisiere den SyncManager mit der fest verbauten FIREBASE_CONFIG
  if (typeof FIREBASE_CONFIG !== 'undefined') {
    const success = SyncManager.init(FIREBASE_CONFIG);
    if (success) {
      // Wenn das Passwort im sessionStorage liegt (z.B. nach Page Reload), wiederherstellen
      const savedPassword = sessionStorage.getItem('sync_master_password');
      if (savedPassword) {
        SyncManager.setMasterPassword(savedPassword);
        const passInput = document.getElementById('sync-master-password');
        if (passInput) passInput.value = savedPassword;
      }
    }
  }

  // 2. Setze Callbacks im SyncManager
  SyncManager.callbacks.onAuthStateChanged = (user) => {
    updateSyncUI();
    if (user && SyncManager.masterPassword) {
      // Automatischer Hintergrund-Sync bei Login
      triggerSyncInternal();
    }
  };

  SyncManager.callbacks.onSyncStatusChanged = (status) => {
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;
    if (status === 'checking') {
      badge.textContent = 'Status: Prüfe...';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
    } else if (status === 'synced') {
      badge.textContent = 'Status: Synchronisiert';
      badge.style.background = 'var(--success-soft)';
      badge.style.color = 'var(--success)';
    } else if (status === 'conflict') {
      badge.textContent = 'Status: Konflikt!';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else if (status === 'error') {
      badge.textContent = 'Status: Fehler!';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else {
      badge.textContent = 'Status: Bereit';
      badge.style.background = 'var(--bg-card)';
      badge.style.color = 'var(--text-primary)';
    }
  };

  SyncManager.callbacks.onConflictDetected = (conflictInfo) => {
    // Öffne das Konflikt-Modal und fülle die Zeiten aus
    const isLocalNewer = conflictInfo.localTimestamp > conflictInfo.cloudTimestamp;
    
    const localTime = new Date(conflictInfo.localTimestamp).toLocaleString('de-DE') + (isLocalNewer ? ' (aktueller)' : '');
    const cloudTime = new Date(conflictInfo.cloudTimestamp).toLocaleString('de-DE') + (!isLocalNewer ? ' (aktueller)' : '');
    
    document.getElementById('conflict-local-time').textContent = localTime;
    document.getElementById('conflict-cloud-time').textContent = cloudTime;
    
    // Speichere die Konflikt-Informationen global
    window.currentConflict = conflictInfo;
    
    openModal('modal-sync-conflict');
  };

  // 3. UI updaten
  updateSyncUI();
}

// Aktualisiert das UI basierend auf Firebase- und Auth-Status
function updateSyncUI() {
  const userStatus = document.getElementById('sync-user-status');
  const loginForm = document.getElementById('sync-login-form');
  const loggedInPanel = document.getElementById('sync-logged-in-panel');
  const cryptoSection = document.getElementById('sync-crypto-section');
  const lastTimeEl = document.getElementById('sync-last-time');

  if (!userStatus) return; // Falls DOM noch nicht bereit

  // Benutzer angemeldet?
  if (SyncManager.currentUser) {
    userStatus.textContent = `Angemeldet als: ${SyncManager.currentUser.email}`;
    loginForm.classList.add('hidden');
    loggedInPanel.classList.remove('hidden');
    cryptoSection.classList.remove('hidden');
    
    // Letzter Sync-Zeitpunkt anzeigen
    if (db.syncSettings && db.syncSettings.lastSyncedCloudTimestamp) {
      const d = new Date(db.syncSettings.lastSyncedCloudTimestamp);
      lastTimeEl.textContent = `Zuletzt synchronisiert: ${d.toLocaleString('de-DE')}`;
    } else {
      lastTimeEl.textContent = 'Noch nie synchronisiert';
    }
  } else {
    userStatus.textContent = 'Nicht angemeldet';
    loginForm.classList.remove('hidden');
    loggedInPanel.classList.add('hidden');
    cryptoSection.classList.add('hidden');
  }
}

// E-Mail Login
function loginEmail() {
  const email = document.getElementById('sync-email').value.trim();
  const password = document.getElementById('sync-password').value.trim();
  if (!email || !password) return;

  SyncManager.loginWithEmail(email, password)
    .then(() => {
      showToast('Erfolgreich eingeloggt ✓');
      document.getElementById('sync-email').value = '';
      document.getElementById('sync-password').value = '';
    })
    .catch(err => {
      alert('Fehler beim Login: ' + err.message);
    });
}

// E-Mail Registrierung
function registerEmail() {
  const email = document.getElementById('sync-email').value.trim();
  const password = document.getElementById('sync-password').value.trim();
  if (!email || !password) return;

  if (password.length < 6) {
    alert('Das Passwort muss mindestens 6 Zeichen lang sein.');
    return;
  }

  SyncManager.registerWithEmail(email, password)
    .then(() => {
      showToast('Registrierung erfolgreich! Angemeldet ✓');
      document.getElementById('sync-email').value = '';
      document.getElementById('sync-password').value = '';
    })
    .catch(err => {
      alert('Fehler bei der Registrierung: ' + err.message);
    });
}

// Google Login
function loginGoogle() {
  SyncManager.loginWithGoogle()
    .then(() => {
      showToast('Erfolgreich mit Google angemeldet ✓');
    })
    .catch(err => {
      alert('Fehler bei der Google-Anmeldung: ' + err.message);
    });
}

// Logout
function logoutSync() {
  SyncManager.logout()
    .then(() => {
      sessionStorage.removeItem('sync_master_password');
      const passInput = document.getElementById('sync-master-password');
      if (passInput) passInput.value = '';
      showToast('Ausgeloggt.');
    });
}

// Master-Passwort ändern
function updateMasterPassword(pwd) {
  SyncManager.setMasterPassword(pwd);
  sessionStorage.setItem('sync_master_password', pwd);
}

// Triggert den Sync-Prozess
function triggerManualSync() {
  if (!SyncManager.masterPassword) {
    alert('Bitte gib zuerst dein Master-Passwort ein.');
    return;
  }
  triggerSyncInternal();
}

// Führt den eigentlichen Sync im Hintergrund durch
async function triggerSyncInternal() {
  if (!SyncManager.isInitialized || !SyncManager.currentUser || !SyncManager.masterPassword) return;

  try {
    const localDataString = JSON.stringify(db);
    const localTimestamp = db.settings.lastModified || Date.now();
    const lastSynced = (db.syncSettings && db.syncSettings.lastSyncedCloudTimestamp) || 0;

    const result = await SyncManager.sync(localDataString, localTimestamp, lastSynced);

    if (result.status === 'sync_done') {
      if (result.action === 'pulled' && result.data) {
        // Daten aus der Cloud geladen und erfolgreich entschlüsselt -> übernehmen!
        const parsed = JSON.parse(result.data);
        if (parsed.settings) {
          db = parsed;
          if (!db.syncSettings) db.syncSettings = {};
          db.syncSettings.lastSyncedCloudTimestamp = result.cloudTimestamp;
          
          // Design-Einstellungen anwenden
          updateAppliedThemeFromDB();
          
          // Lokales Speichern
          localStorage.setItem('lehrerapp_v3', JSON.stringify(db));
          
          showToast('Daten erfolgreich aus der Cloud synchronisiert! ✓');
          
          // Ansichten aktualisieren
          renderTimetable();
          renderSubjectGroups();
        }
      } else {
        // Erfolgreicher Upload
        if (!db.syncSettings) db.syncSettings = {};
        db.syncSettings.lastSyncedCloudTimestamp = result.cloudTimestamp;
        saveDB(true);
        showToast('Daten erfolgreich in die Cloud geladen! ✓');
      }
      updateSyncUI();
    } else if (result.status === 'no_change') {
      if (!db.syncSettings) db.syncSettings = {};
      db.syncSettings.lastSyncedCloudTimestamp = result.cloudTimestamp;
      saveDB(true);
      showToast('Daten bereits auf dem neuesten Stand.');
      updateSyncUI();
    }
  } catch (error) {
    console.error("Fehler beim Sync:", error);
    showToast('❌ Sync-Fehler: ' + error.message);
  }
}

// Löst Konflikte
async function resolveConflict(decision) {
  const conflict = window.currentConflict;
  if (!conflict) return;

  if (decision === 'pull') {
    if (!confirm("Bist du dir sicher, dass du die Version aus der Cloud laden willst?\n\n⚠️ Alle deine lokalen Änderungen, die du auf diesem Gerät offline gemacht hast, gehen dabei verloren!")) return;
  } else if (decision === 'push') {
    if (!confirm("Bist du dir sicher, dass du deine lokale Version hochladen willst?\n\n⚠️ Der Speicherstand in der Cloud wird komplett überschrieben. Änderungen von anderen Geräten gehen verloren!")) return;
  } else if (decision === 'backup') {
    if (!confirm("Möchtest du eine Sicherheitskopie deiner lokalen Daten auf deinem PC speichern und danach den Speicherstand aus der Cloud laden?")) return;
  }

  closeModal('modal-sync-conflict');

  try {
    if (decision === 'pull') {
      // Cloud-Version übernehmen
      const decrypted = CryptoHelper.decrypt(conflict.cloudPayload.encryptedData, SyncManager.masterPassword);
      const parsed = JSON.parse(decrypted);
      
      db = parsed;
      if (!db.syncSettings) db.syncSettings = {};
      db.syncSettings.lastSyncedCloudTimestamp = conflict.cloudTimestamp;
      
      // Design-Einstellungen anwenden
      updateAppliedThemeFromDB();
      
      saveDB(true);
      showToast('Cloud-Version geladen und lokale Änderungen verworfen.');
      renderTimetable();
      renderSubjectGroups();
      updateSyncUI();
      
    } else if (decision === 'push') {
      // Lokale Version erzwingen (Cloud überschreiben)
      const localDataString = JSON.stringify(db);
      const now = Date.now();
      
      await SyncManager.saveToCloud(localDataString, now);
      
      if (!db.syncSettings) db.syncSettings = {};
      db.syncSettings.lastSyncedCloudTimestamp = now;
      db.settings.lastModified = now;
      saveDB(true);
      
      showToast('Cloud-Version erfolgreich mit lokalem Stand überschrieben.');
      updateSyncUI();
      
    } else if (decision === 'backup') {
      // Sicherheitskopie exportieren und dann Cloud laden
      exportData(); // Ruft den Standard-Export auf
      
      // Und dann Cloud laden (wie 'pull')
      const decrypted = CryptoHelper.decrypt(conflict.cloudPayload.encryptedData, SyncManager.masterPassword);
      const parsed = JSON.parse(decrypted);
      
      db = parsed;
      if (!db.syncSettings) db.syncSettings = {};
      db.syncSettings.lastSyncedCloudTimestamp = conflict.cloudTimestamp;
      
      // Design-Einstellungen anwenden
      updateAppliedThemeFromDB();
      
      saveDB(true);
      showToast('Backup gespeichert und Cloud-Version geladen.');
      renderTimetable();
      renderSubjectGroups();
      updateSyncUI();
    }
  } catch (e) {
    alert('Fehler bei der Konfliktlösung: ' + e.message);
  }
}

// Hilfsfunktion zum Aktualisieren des Themes aus den Einstellungen in der DB
function updateAppliedThemeFromDB() {
  if (db.settings) {
    currentThemeAccent = db.settings.themeAccent || '#6366f1';
    currentThemeBg     = db.settings.themeBg || '#0f1117';
    currentThemeMode   = db.settings.theme || 'dark';
    currentThemeCard   = db.settings.themeCard || '#1e2130';
    applyThemePreview();
  }
}

// Starte Sync-Initialisierung beim Laden
initSync();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateStudentAverage,
    get db() { return db; },
    set db(v) { db = v; }
  };
}

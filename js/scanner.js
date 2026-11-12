// ▸ Plus-Konto: Einlöse-Codes der Schülerapp mit der Kamera lesen (BUGS AV1 Stufe 2)
// ▸ Alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html (Regel 99): hier nur Deklarationen.

// Die Kamera läuft nur, solange das Fenster „Plusse einlösen“ offen ist. Die Bilder bleiben im Gerät: Jedes Bild wird nur
// nach einem QR-Code durchsucht, nichts gespeichert und nichts gesendet. Die Bibliothek (lib/jsQR.js, Apache-2.0) wird erst
// beim ersten Scannen geladen; der Service Worker hat sie im Cache, offline geht es also auch.
// Was ein Code bewirkt, entscheidet redeemFromCode (js/schuelerapp-planer.js), mit Rückfrage und „Rückgängig“.
let plusScan = null;   // { stream, timer, busy, last: { text, at }, done: Set, canvas } – nur Ansicht, nie in db
let jsQRLoading = null;
const PLUS_SCAN_EVERY_MS = 200, PLUS_SCAN_SAME_MS = 4000;

function loadJsQR() {
  if (typeof jsQR === 'function') return Promise.resolve(true);
  if (!jsQRLoading) {
    jsQRLoading = new Promise(resolve => {
      const tag = document.createElement('script');
      tag.src = 'lib/jsQR.js';
      tag.onload = () => resolve(typeof jsQR === 'function');
      tag.onerror = () => { jsQRLoading = null; resolve(false); };
      document.head.appendChild(tag);
    });
  }
  return jsQRLoading;
}
function setPlusScanStatus(text, kind = '') {
  const el = document.getElementById('plus-scan-status');
  if (!el) return;
  el.textContent = text;
  el.className = 'plus-scan-status' + (kind ? ' is-' + kind : '');
}
// Sitzplan-Leiste: Knopf nur, wenn die gezeigte Klasse persönliche Seiten hat
function updateSeatingRedeemButton() {
  const btn = document.getElementById('btn-tool-redeem');
  if (!btn) return;
  const g = db.groups.find(x => x.id === currentSeatingGroupId);
  btn.classList.toggle('hidden', !(g && personalActive(g)));
}
async function openPlusScanner() {
  if (plusScan) return;
  plusScan = { stream: null, timer: null, busy: false, last: null, done: new Set(), canvas: null };
  const video = document.getElementById('plus-scan-video');
  video.hidden = true;
  setPlusScanStatus('Kamera startet …');
  openModal('modal-plus-scan');
  const ready = await loadJsQR();
  if (!plusScan) return;   // inzwischen geschlossen
  const fallback = 'Einlösen geht auch im Schüler-Fenster (Mehr → Schülerapp → Plusse einlösen).';
  if (!ready) { setPlusScanStatus('Das Lesen der Codes lässt sich gerade nicht laden. ' + fallback, 'error'); return; }
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    setPlusScanStatus('Dieses Gerät gibt hier keine Kamera frei. ' + fallback, 'error');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    if (!plusScan) { stream.getTracks().forEach(t => t.stop()); return; }
    plusScan.stream = stream;
    video.srcObject = stream;
    video.hidden = false;
    await video.play().catch(() => {});
    setPlusScanStatus('Halte den Code aus der App des Schülers vor die Kamera.');
    plusScanLoop();
  } catch (e) {
    if (!plusScan) return;
    setPlusScanStatus((e && e.name === 'NotAllowedError'
      ? 'Die Kamera ist für den Planer nicht erlaubt. Du kannst sie in den Einstellungen des Geräts erlauben. '
      : 'Die Kamera lässt sich gerade nicht starten. ') + fallback, 'error');
  }
}
function plusScanLoop() {
  if (!plusScan) return;
  plusScan.timer = setTimeout(async () => {
    if (!plusScan) return;
    if (!plusScan.busy) {
      const text = readPlusScanFrame();
      if (text) await handleScannedCode(text);
    }
    plusScanLoop();
  }, PLUS_SCAN_EVERY_MS);
}
// Ein Bild der Kamera nach einem QR-Code durchsuchen (verkleinert, das reicht für einen Handy-Bildschirm)
function readPlusScanFrame() {
  const video = document.getElementById('plus-scan-video');
  if (!plusScan || !video || video.readyState < 2 || !video.videoWidth || typeof jsQR !== 'function') return null;
  const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
  const w = Math.round(video.videoWidth * scale), h = Math.round(video.videoHeight * scale);
  const canvas = plusScan.canvas || (plusScan.canvas = document.createElement('canvas'));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
  return hit && hit.data ? hit.data : null;
}
// Derselbe Code bleibt meist eine Weile im Bild. Eben eingelöst: still übergehen (sonst stünde gleich „schon eingelöst“ da,
// als hätte es nicht geklappt). Abgelehnt oder abgebrochen: erst nach PLUS_SCAN_SAME_MS wieder.
async function handleScannedCode(text) {
  if (!plusScan || plusScan.done.has(text)) return;
  const now = Date.now();
  if (plusScan.last && plusScan.last.text === text && now - plusScan.last.at < PLUS_SCAN_SAME_MS) return;
  plusScan.busy = true;
  plusScan.last = { text, at: now };
  try {
    const r = await redeemFromCode(text);
    if (plusScan && r.kind === 'ok') plusScan.done.add(text);
    if (plusScan) setPlusScanStatus(r.msg, r.kind === 'ok' ? 'ok' : r.kind === 'error' ? 'error' : '');
  } catch (e) {
    if (plusScan) setPlusScanStatus('Das hat nicht geklappt. Versuch es noch einmal.', 'error');
  } finally {
    if (plusScan) { plusScan.busy = false; plusScan.last = { text, at: Date.now() }; }
  }
}
function stopPlusScanner() {
  if (!plusScan) return;
  clearTimeout(plusScan.timer);
  if (plusScan.stream) plusScan.stream.getTracks().forEach(t => t.stop());
  const video = document.getElementById('plus-scan-video');
  if (video) { if (video.srcObject) { try { video.pause(); } catch (e) { /* ältere Browser */ } } video.srcObject = null; video.hidden = true; }
  plusScan = null;
}
function closePlusScanner() {
  stopPlusScanner();
  closeModal('modal-plus-scan');
}

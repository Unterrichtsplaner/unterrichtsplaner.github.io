
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
    btn.textContent = '▶';
  } else {
    if (timerSeconds <= 0) return;
    timerIsRunning = true;
    btn.textContent = '⏸';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerIsRunning = false;
        btn.textContent = '▶';
        showToast('Timer abgelaufen!');
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerIsRunning = false;
  timerSeconds = 300;
  document.getElementById('btn-timer-toggle').textContent = '▶';
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
    btn.textContent = '▶';
  } else {
    stopwatchIsRunning = true;
    btn.textContent = '⏸';
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
  document.getElementById('btn-stopwatch-toggle').textContent = '▶';
  updateStopwatchDisplay();
}

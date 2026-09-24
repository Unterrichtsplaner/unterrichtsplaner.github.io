// Timer und Stoppuhr im Sitzplan richten sich nach der Uhr, nicht nach gezählten Ticks (BUGS G6).
// War das iPad gesperrt, feuern Intervalle nicht (oder gedrosselt) – ein Tick-Zähler geht dann nach.
const { loadApp, app } = require('./helpers/load-app');

const display = () => document.getElementById('timer-display').textContent;
const toggleLabel = () => document.getElementById('btn-timer-toggle').getAttribute('aria-label');

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-21T09:00:00'));
  loadApp();
});
afterAll(() => vi.useRealTimers());
beforeEach(() => { app('resetTimer()'); app('resetStopwatch()'); });

describe('G6: Timer', () => {
  it('läuft normal herunter', () => {
    app('toggleTimer()');
    vi.advanceTimersByTime(10_000);
    expect(display()).toBe('04:50');
  });

  it('geht nicht nach, wenn Intervalle ausgesetzt haben (iPad gesperrt)', () => {
    app('toggleTimer()');
    // 3 Minuten vergehen, aber kein einziger Tick feuert
    vi.setSystemTime(Date.now() + 3 * 60_000);
    vi.advanceTimersByTime(1000);
    expect(display()).toBe('01:59');
  });

  it('ist die Zeit im Hintergrund abgelaufen: steht auf 00:00 und hält an', () => {
    app('toggleTimer()');
    vi.setSystemTime(Date.now() + 10 * 60_000);
    vi.advanceTimersByTime(1000);
    expect(display()).toBe('00:00');
    expect(app('timerIsRunning')).toBe(false);
    expect(toggleLabel()).toBe('Timer starten');
  });

  it('Pause hält die Restzeit fest, Weiterlaufen zählt von dort', () => {
    app('toggleTimer()');
    vi.advanceTimersByTime(30_000);
    app('toggleTimer()');
    expect(toggleLabel()).toBe('Timer starten');
    vi.setSystemTime(Date.now() + 60_000);  // pausiert: zählt nicht
    vi.advanceTimersByTime(5000);
    expect(display()).toBe('04:30');
    app('toggleTimer()');
    expect(toggleLabel()).toBe('Timer anhalten');
    vi.advanceTimersByTime(10_000);
    expect(display()).toBe('04:20');
  });

  it('beim Zurückholen der App sofort richtig (nicht erst beim nächsten Tick)', () => {
    app('toggleTimer()');
    vi.setSystemTime(Date.now() + 2 * 60_000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(display()).toBe('03:00');
  });
});

describe('G6: Stoppuhr', () => {
  it('zählt die echte Zeit, auch wenn Ticks ausfallen', () => {
    app('toggleStopwatch()');
    expect(document.getElementById('btn-stopwatch-toggle').getAttribute('aria-label')).toBe('Stoppuhr anhalten');
    vi.setSystemTime(Date.now() + 90_000);
    vi.advanceTimersByTime(100);
    expect(document.getElementById('stopwatch-display').textContent).toBe('01:30.1');
  });
});

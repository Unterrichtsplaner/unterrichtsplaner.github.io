// ▸ Cloud: Anmeldung, Abgleich, Konflikte, Sync-Anzeige, Konto
// ▸ Teil von app.js (aufgeteilt, BUGS Y12): alle Dateien teilen sich den globalen Bereich, Reihenfolge wie in index.html.


// „Passwort anzeigen“ (Auge) an den Master-Passwort-Feldern (`data-reveal`). Nie gespeichert: Schließen der
// Einstellungen und Verlassen der App verbergen es wieder – am Pult soll es niemand sehen.
function setPasswordVisible(input, show) {
  input.type = show ? 'text' : 'password';
  // Als Textfeld schaltet iOS sonst Großbuchstabe, Autokorrektur und Rechtschreibprüfung ein (AU9, Lücke in AO1)
  input.setAttribute('autocapitalize', 'none');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  const btn = input.parentElement.querySelector('.password-reveal');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(show));
  btn.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort anzeigen');
  btn.title = btn.getAttribute('aria-label');
  btn.innerHTML = icon(show ? 'eye-off' : 'eye');
}
function hideAllPasswords() {
  document.querySelectorAll('input[data-reveal]').forEach(input => { if (input.type !== 'password') setPasswordVisible(input, false); });
}
function setupPasswordReveal() {
  document.querySelectorAll('input[data-reveal]').forEach(input => {
    if (input.parentElement.classList.contains('password-field')) return;
    const wrap = document.createElement('div');
    wrap.className = 'password-field';
    if (input.style.marginTop) { wrap.style.marginTop = input.style.marginTop; input.style.marginTop = ''; }
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-reveal';
    // Fokus bleibt im Feld: sonst löste das Antippen `change` aus und übernähme das Passwort vorzeitig
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', () => setPasswordVisible(input, input.type === 'password'));
    wrap.appendChild(btn);
    setPasswordVisible(input, false);
  });
}


// ─── Cloud Sync (E2EE) Implementation ──────────────────────────────────────

// Das Master-Passwort bleibt auf diesem Gerät gespeichert (localStorage). Früher nur im sessionStorage:
// dann fehlte es nach jedem Neustart, und der Sync lief still nicht (BUGS K7). Die Schülerdaten liegen
// auf dem Gerät ohnehin unverschlüsselt, das Passwort schützt nur die Kopie in der Cloud.
const MASTER_PASSWORD_KEY = 'sync_master_password';
function loadSavedMasterPassword() {
  try {
    let pwd = localStorage.getItem(MASTER_PASSWORD_KEY);
    if (!pwd) {
      pwd = sessionStorage.getItem(MASTER_PASSWORD_KEY); // aus einer älteren Version übernehmen
      if (pwd) storeMasterPassword(pwd);
    }
    return pwd || '';
  } catch (e) {
    return '';
  }
}
// Ein zweimal eingegebenes neues Master-Passwort gilt auch nach einem Neustart als bestätigt. Sonst wartete der
// erste Upload in die leere Cloud still auf eine Bestätigung, die längst gegeben war (BUGS T2).
const MASTER_PASSWORD_CONFIRMED_KEY = 'sync_master_password_confirmed';
function storeMasterPassword(pwd) {
  try {
    if (localStorage.getItem(MASTER_PASSWORD_KEY) !== pwd) localStorage.removeItem(MASTER_PASSWORD_CONFIRMED_KEY);
    sessionStorage.removeItem(MASTER_PASSWORD_KEY);
    if (pwd) localStorage.setItem(MASTER_PASSWORD_KEY, pwd);
    else localStorage.removeItem(MASTER_PASSWORD_KEY);
  } catch (e) { /* kein Speicher: gilt dann nur bis zum Neustart */ }
}

// Initialisiert die Synchronisierung beim Laden der App
function initSync() {
  // 1. Initialisiere den SyncManager mit der fest verbauten FIREBASE_CONFIG
  if (typeof FIREBASE_CONFIG !== 'undefined') {
    const success = SyncManager.init(FIREBASE_CONFIG);
    if (success) {
      // Gespeichertes Passwort wiederherstellen, auch nach einem Neustart der App
      const savedPassword = loadSavedMasterPassword();
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
    } else if (user) {
      // Angemeldet, aber (noch) kein Master-Passwort auf diesem Gerät: Bescheid geben (BUGS K7)
      showToast('Cloud-Sync pausiert: bitte Master-Passwort in den Einstellungen eingeben', 'error');
    }
  };

  // Zurück in der App bzw. wieder online: gleich abgleichen, nicht erst bei der nächsten Eingabe.
  // Sonst trägt man morgens auf dem iPad ein, was abends am Laptop geändert wurde → Konflikt (BUGS K6).
  // Beim Verlassen (iPad zuklappen, App wechseln) eine noch wartende Eingabe sofort übertragen: Im Hintergrund
  // läuft der 3-s-Timer nicht, und am nächsten Morgen gäbe es sonst einen Konflikt (BUGS P8).
  // (Das Verlassen selbst behandelt onAppHidden, auch ohne Cloud-Sync.)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) triggerSyncInternal(); });
  window.addEventListener('online', () => { updateSyncIndicator(); triggerSyncInternal(); });
  window.addEventListener('offline', () => updateSyncIndicator());

  SyncManager.callbacks.onSyncStatusChanged = (status) => {
    noteSyncStatus(status);   // kleine Anzeige in Leiste und Dashboard (AN1)
    const badge = document.getElementById('sync-status-badge');
    if (!badge) return;
    if (status === 'checking') {
      badge.textContent = 'Status: Prüfe …';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
    } else if (status === 'synced') {
      badge.textContent = 'Status: Synchronisiert';
      badge.style.background = 'var(--success-soft)';
      badge.style.color = 'var(--success)';
    } else if (status === 'conflict') {
      badge.textContent = 'Status: Konflikt';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else if (status === 'confirm_password') {
      badge.textContent = 'Status: Wartet auf Bestätigung des Master-Passworts';
      badge.style.background = 'var(--warning-soft)';
      badge.style.color = 'var(--warning)';
    } else if (status === 'error') {
      badge.textContent = 'Status: Fehler';
      badge.style.background = 'var(--danger-soft)';
      badge.style.color = 'var(--danger)';
    } else {
      badge.textContent = 'Status: Bereit';
      badge.style.background = 'var(--bg-card)';
      badge.style.color = 'var(--text-primary)';
    }
  };

  // Konflikte meldet triggerSyncInternal selbst (showSyncConflict), erst nachdem es geprüft hat, dass die
  // DB während des Syncs nicht ersetzt wurde. Über den Rückruf des SyncManagers ging das Fenster auch für
  // eine inzwischen geleerte DB auf, und „Dieses Gerät hochladen“ leerte die Cloud (BUGS P4).
  SyncManager.callbacks.onConflictDetected = null;

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
  updateSyncAttention();
  updateSyncIndicator();

  // Benutzer angemeldet?
  const clearEverywhere = document.getElementById('btn-clear-everywhere');
  if (clearEverywhere) clearEverywhere.classList.toggle('hidden', !SyncManager.currentUser);
  if (!SyncManager.currentUser && accountDeleteChoice) cancelDeleteAccount();
  if (SyncManager.currentUser) {
    userStatus.textContent = `Angemeldet als: ${SyncManager.currentUser.email}`;
    loginForm.classList.add('hidden');
    loggedInPanel.classList.remove('hidden');
    cryptoSection.classList.remove('hidden');
    
    // Letzter Abgleich dieses Geräts. Die Versionskennung der Cloud ist die Uhrzeit des Geräts, das zuletzt
    // hochgeladen hat – nach einem Abgleich stand dort sonst z. B. „vor 10 Tagen“ (BUGS P10).
    const ss = db.syncSettings;
    if (ss && ss.lastSyncCheck) {
      lastTimeEl.textContent = `Zuletzt synchronisiert: ${new Date(ss.lastSyncCheck).toLocaleString('de-DE')}`;
    } else if (ss && ss.lastSyncedCloudTimestamp) {
      lastTimeEl.textContent = `Cloud-Stand vom ${new Date(ss.lastSyncedCloudTimestamp).toLocaleString('de-DE')}`;
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
      // Auch ein gelöschtes Konto (BUGS Z2) landet hier; Firebase unterscheidet das nicht immer von einem falschen Passwort
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err && err.code)) {
        alert('Anmeldung fehlgeschlagen: E-Mail oder Passwort stimmen nicht, oder das Konto wurde gelöscht.\n\nDie Daten auf diesem Gerät sind davon nicht betroffen.');
      } else {
        alert('Fehler beim Login: ' + err.message);
      }
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
      showToast('Konto angelegt, du bist angemeldet ✓');
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

// Logout. Die Daten bleiben sonst auf dem Gerät; am geteilten PC landeten sie beim nächsten Konto (BUGS T6).
async function logoutSync() {
  let answer = 'keep';
  if (!isLocalDBEmpty()) {
    const unsynced = isLocalDBChanged();
    answer = await askChoice('Abmelden',
      'Sollen deine Daten (Klassen, Schüler, Noten) auf diesem Gerät bleiben?\n\n'
      + 'Eigenes Gerät: behalten. Geteiltes oder fremdes Gerät: löschen. In der Cloud bleiben sie erhalten.'
      + (unsynced ? '\n\n⚠️ Die letzten Änderungen sind noch nicht in der Cloud. Beim Löschen gehen sie verloren.' : ''),
      [{ label: 'Abmelden, Daten behalten', value: 'keep', primary: true },
       { label: 'Abmelden und Daten von diesem Gerät löschen', value: 'delete', danger: true }]);
    if (!answer) return;
    if (answer === 'delete' && unsynced && !confirm('Wirklich löschen? Die letzten Änderungen sind nicht in der Cloud und gehen verloren.\n\nTipp: Vorher „Jetzt synchronisieren“.')) return;
  }
  await SyncManager.logout();
  forgetCloudLogin();
  if (answer === 'delete') {
    wipeLocalData();
    showToast('Abgemeldet, Daten auf diesem Gerät gelöscht.');
  } else {
    showToast('Ausgeloggt.');
  }
}

// Nach dem Abmelden: Master-Passwort und Kontowahl dieses Geräts vergessen
function forgetCloudLogin() {
  storeMasterPassword('');
  SyncManager.setMasterPassword('');
  foreignAccountAccepted = '';
  updateSyncAttention();
  const passInput = document.getElementById('sync-master-password');
  if (passInput) passInput.value = '';
}

// ─── Cloud-Konto löschen (BUGS Z2) ────────────────────────────────────────
// Cloud-Daten und Anmelde-Konto löschen (Recht auf Löschung, Nutzer hört auf). Firebase verlangt dafür eine
// frische Anmeldung; die passiert vorher, damit nicht die Cloud leer ist, das Konto aber bleibt.
let accountDeleteChoice = null;   // 'keep' | 'delete': Daten auf diesem Gerät behalten oder löschen
let accountDeletePending = '';   // uid: Cloud-Daten schon gelöscht, Anmelde-Konto noch nicht (AP12)
let accountDeleting = false;      // eigene Löschung läuft: die Markierung in der Cloud ist kein fremdes Ereignis
async function startDeleteAccount() {
  if (!SyncManager.currentUser) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    alert('Dafür braucht es eine Internetverbindung. Es wurde nichts gelöscht.');
    return;
  }
  const hasData = !isLocalDBEmpty();
  const answer = await askChoice('Cloud-Konto löschen',
    `Deine Daten in der Cloud und dein Anmelde-Konto (${SyncManager.currentUser.email || 'Cloud-Konto'}) werden endgültig gelöscht. `
    + 'Deine anderen Geräte können danach nicht mehr synchronisieren; was dort gespeichert ist, bleibt dort.'
    + (hasData ? '\n\nSollen die Daten auf DIESEM Gerät bleiben? Tipp: Vorher exportieren.' : ''),
    hasData
      ? [{ label: 'Konto löschen, Daten auf diesem Gerät behalten', value: 'keep', primary: true },
         { label: 'Konto und Daten auf diesem Gerät löschen', value: 'delete', danger: true }]
      : [{ label: 'Konto löschen', value: 'keep', danger: true }]);
  if (!answer || !SyncManager.currentUser) return;
  accountDeleteChoice = answer;
  const pwGroup = document.getElementById('sync-delete-account-password-group');
  pwGroup.classList.toggle('hidden', !SyncManager.usesPasswordLogin());
  document.getElementById('sync-delete-account-group').classList.remove('hidden');
  if (SyncManager.usesPasswordLogin()) document.getElementById('sync-delete-account-password').focus();
}
function cancelDeleteAccount() {
  accountDeletePending = '';
  accountDeleteChoice = null;
  document.getElementById('sync-delete-account-group').classList.add('hidden');
  document.getElementById('sync-delete-account-password').value = '';
}
async function confirmDeleteAccount() {
  const choice = accountDeleteChoice;
  if (!choice || !SyncManager.currentUser) return;
  const password = document.getElementById('sync-delete-account-password').value;
  if (SyncManager.usesPasswordLogin() && !password) { showToast('Bitte das Anmelde-Passwort eingeben', 'error'); return; }
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  if (choice === 'delete' && isLocalDBChanged() && !isLocalDBEmpty()
      && !confirm('Die letzten Änderungen auf diesem Gerät sind nicht in der Cloud. Sie gehen beim Löschen verloren.\n\nTrotzdem löschen?')) return;
  syncRunning = true;
  accountDeleting = true;
  try {
    try {
      await SyncManager.reauthenticate(password);
    } catch (e) {
      const wrong = ['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(e && e.code);
      const half = accountDeletePending === SyncManager.currentUser.uid;
      alert((wrong ? '❌ Das Anmelde-Passwort stimmt nicht.' : '❌ Anmeldung nicht bestätigt: ' + e.message)
        + (half ? '\n\nDeine Cloud-Daten sind schon gelöscht, nur das Anmelde-Konto noch nicht. Bitte noch einmal versuchen.' : '\n\nEs wurde nichts gelöscht.'));
      return;
    }
    try {
      // vorher: nach dem Löschen des Kontos darf niemand mehr ihre Dokumente löschen (AJ1, AT5)
      if (!(await deleteAllStudentShares())) throw new Error('Die Seiten der Schülerapp ließen sich nicht alle löschen (keine Verbindung?)');
      await SyncManager.deleteAccount();
    } catch (e) {
      if (e && e.name === 'AccountHalfDeletedError') {   // Markierung steht, Anmelde-Konto nicht gelöscht: Formular bleibt offen (AP12)
        accountDeletePending = SyncManager.currentUser ? SyncManager.currentUser.uid : '';
        alert('❌ Deine Cloud-Daten sind schon gelöscht, nur das Anmelde-Konto noch nicht.\n\n'
          + 'Bitte mit Internet noch einmal „Konto endgültig löschen“ tippen. Die Daten auf diesem Gerät sind unverändert.');
        return;
      }
      alert('❌ Das Konto konnte nicht gelöscht werden: ' + e.message
        + '\n\nBitte noch einmal versuchen. Die Daten auf diesem Gerät sind unverändert.');
      return;
    }
    accountDeletePending = '';
    cancelDeleteAccount();
    forgetCloudLogin();
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    if (choice === 'delete') {
      wipeLocalData();
    } else if (db.syncSettings) {
      // Kein Sync-Stand mehr: Mit einem neuen Konto zählen die Daten wie „nie synchronisiert“
      delete db.syncSettings;
      persistDB();
    }
    try { await SyncManager.logout(); } catch (e) { /* Konto ist ohnehin weg */ }
    SyncManager.updateStatus('idle');
    updateSyncUI();
    showToast(choice === 'delete' ? 'Cloud-Konto und Daten auf diesem Gerät gelöscht.' : 'Cloud-Konto gelöscht. Die Daten auf diesem Gerät bleiben.');
  } finally {
    syncRunning = false;
    accountDeleting = false;
    syncQueued = false; // ohne Konto gibt es nichts mehr abzugleichen
  }
}

// Das Konto wurde auf einem anderen Gerät gelöscht (Markierung in der Cloud) oder Firebase kennt es nicht mehr:
// abmelden, Daten bleiben – statt eines rätselhaften Sync-Fehlers nach jeder Eingabe (BUGS Z2).
async function handleAccountDeleted() {
  const user = SyncManager.currentUser;
  if (accountDeleting || !user || accountDeletePending === user.uid) return;   // eigene, noch nicht fertige Löschung (AP12)
  // Gibt es das Anmelde-Konto noch, ist eine Löschung nicht fertig geworden: anbieten, sie abzuschließen (AP12)
  let stillThere = false;
  if (typeof user.reload === 'function') { try { await user.reload(); stillThere = true; } catch (e) { stillThere = false; } }
  if (stillThere) {
    const answer = await askChoice('Konto löschen nicht fertig',
      'Deine Cloud-Daten sind gelöscht, das Anmelde-Konto gibt es aber noch. Das Löschen ist nicht fertig geworden.\n\nJetzt abschließen?',
      [{ label: 'Jetzt abschließen', value: 'finish', primary: true }]);
    if (answer === 'finish' && SyncManager.currentUser === user) { accountDeletePending = user.uid; startDeleteAccount(); return; }
  }
  if (SyncManager.currentUser !== user) return;
  try { await SyncManager.logout(); } catch (e) { /* ohnehin abgemeldet */ }
  forgetCloudLogin();
  if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
  SyncManager.updateStatus('idle');
  updateSyncUI();
  alert('Dein Cloud-Konto wurde gelöscht (z. B. auf einem anderen Gerät).\n\n'
    + 'Die Daten auf diesem Gerät bleiben erhalten, der Cloud-Sync ist aus und du bist abgemeldet.');
}
const ACCOUNT_GONE_CODES = ['auth/user-not-found', 'auth/user-token-expired', 'auth/user-disabled'];

// Master-Passwort übernehmen (onchange, nicht bei jedem Tastendruck).
// Direkt danach wird synchronisiert – dabei prüft der SyncManager, ob das Passwort
// die Cloud-Daten entschlüsseln kann, bevor irgendetwas hochgeladen wird.
function updateMasterPassword(pwd) {
  cancelNewCloudPassword();
  SyncManager.setMasterPassword(pwd);
  storeMasterPassword(pwd);
  updateSyncAttention();
  if (pwd && SyncManager.currentUser) triggerSyncInternal({ manual: true });
}

// Falsches Passwort wieder vergessen, damit kein weiterer Sync damit läuft.
function rejectMasterPassword() {
  SyncManager.setMasterPassword('');
  storeMasterPassword('');
  const passInput = document.getElementById('sync-master-password');
  if (passInput) passInput.value = '';
  updateSyncAttention();
}

// Erstes Master-Passwort (Cloud noch leer): erst hochladen, wenn es ein zweites Mal gleich eingegeben wurde.
// Sonst verschlüsselt ein Tippfehler die Cloud, und kein Gerät kommt mehr an die Daten (BUGS K8).
let confirmedNewCloudPassword = '';
function showNewPasswordConfirm() {
  const group = document.getElementById('sync-master-password-confirm-group');
  if (!group) return;
  group.classList.remove('hidden');
  updateSyncAttention();
  updateSyncIndicator();   // AP14
}
function cancelNewCloudPassword() {
  const group = document.getElementById('sync-master-password-confirm-group');
  if (!group) return;
  group.classList.add('hidden');
  document.getElementById('sync-master-password-confirm').value = '';
  updateSyncAttention();
  updateSyncIndicator();   // AP14
}
function confirmNewMasterPassword(pwd) {
  if (!pwd) return;
  cancelNewCloudPassword();
  if (pwd !== SyncManager.masterPassword) {
    rejectMasterPassword();
    alert('❌ Die beiden Passwörter stimmen nicht überein.\n\nEs wurde nichts hochgeladen. Bitte das Master-Passwort neu festlegen.');
    return;
  }
  rememberNewCloudPasswordConfirmed(pwd);
  triggerSyncInternal({ manual: true });
}
function rememberNewCloudPasswordConfirmed(pwd) {
  confirmedNewCloudPassword = pwd;
  try { if (localStorage.getItem(MASTER_PASSWORD_KEY) === pwd) localStorage.setItem(MASTER_PASSWORD_CONFIRMED_KEY, '1'); } catch (e) { /* gilt dann bis zum Neustart */ }
}
function newCloudPasswordConfirmed() {
  const pwd = SyncManager.masterPassword;
  if (!pwd) return false;
  if (confirmedNewCloudPassword === pwd) return true;
  try {
    return localStorage.getItem(MASTER_PASSWORD_CONFIRMED_KEY) === '1' && localStorage.getItem(MASTER_PASSWORD_KEY) === pwd;
  } catch (e) { return false; }
}

// ─── Master-Passwort vergessen oder ändern (BUGS P9) ──────────────────────
// Ohne diesen Weg war ein vergessenes Master-Passwort eine Sackgasse: jeder Sync meldete „falsches Passwort“.
// Die Cloud wird mit den Daten dieses Geräts und einem neuen, zweimal eingegebenen Passwort überschrieben.
async function startCloudPasswordReset() {
  if (!SyncManager.currentUser) return;
  if (isLocalDBEmpty()) {
    alert('Auf diesem Gerät sind keine Daten. Die Cloud damit zu überschreiben, würde alles löschen.\n\nBitte auf dem Gerät ausführen, auf dem deine Daten sind.');
    return;
  }
  // Daten eines anderen Kontos (T6) gingen sonst ohne Frage in diese Cloud (AP3)
  if (hasForeignAccountData() && !(await acceptForeignAccountData())) return;
  const answer = await askChoice('Master-Passwort neu festlegen',
    'Die Cloud wird mit den Daten DIESES Geräts und einem neuen Master-Passwort überschrieben.\n\n'
    + 'Was nur in der Cloud liegt (Änderungen anderer Geräte, die hier noch fehlen), geht dabei verloren. '
    + 'Kennst du das alte Passwort noch, vorher „Jetzt synchronisieren“.\n\nAndere Geräte fragen danach nach dem neuen Passwort.',
    [{ label: 'Neues Passwort festlegen', value: 'reset', danger: true }]);
  if (answer !== 'reset') return;
  document.getElementById('sync-reset-group').classList.remove('hidden');
  document.getElementById('sync-reset-password').focus();
}
function cancelCloudPasswordReset() {
  document.getElementById('sync-reset-group').classList.add('hidden');
  document.getElementById('sync-reset-password').value = '';
  document.getElementById('sync-reset-password-confirm').value = '';
}
async function confirmCloudPasswordReset() {
  const pwd = document.getElementById('sync-reset-password').value;
  const again = document.getElementById('sync-reset-password-confirm').value;
  if (!pwd) { showToast('Bitte ein neues Master-Passwort eingeben', 'error'); return; }
  if (pwd !== again) {
    alert('❌ Die beiden Passwörter stimmen nicht überein.\n\nEs wurde nichts geändert.');
    return;
  }
  if (isLocalDBEmpty()) { alert('Auf diesem Gerät sind keine Daten. Es wurde nichts geändert.'); return; }
  if (hasForeignAccountData()) { cancelCloudPasswordReset(); startCloudPasswordReset(); return; }   // AP3
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  syncRunning = true;
  const dbAtStart = db;
  const localModified = db.settings.lastModified;
  try {
    const written = JSON.stringify(db);
    const newTimestamp = await SyncManager.overwriteCloud(written, pwd);
    storeMasterPassword(pwd);
    rememberNewCloudPasswordConfirmed(pwd);
    cancelNewCloudPassword();
    const passInput = document.getElementById('sync-master-password');
    if (passInput) passInput.value = pwd;
    if (window.currentConflict) { window.currentConflict = null; closeModal('modal-sync-conflict'); }
    if (db === dbAtStart) { markSynced(newTimestamp, localModified); saveSyncBase(newTimestamp, written); } // sonst: DB inzwischen ersetzt (Regel 32); Basis: AP11
    SyncManager.updateStatus('synced'); // sonst stand noch „Konflikt!“ da (BUGS T9)
    cancelCloudPasswordReset();
    updateSyncAttention();
    updateSyncUI();
    warnIfCloudNearlyFull();
    showToast('Cloud mit neuem Master-Passwort gespeichert ✓');
  } catch (e) {
    if (e.name === 'CloudChangedError') alert('Gerade hat ein anderes Gerät hochgeladen. Es wurde nichts geändert. Bitte noch einmal versuchen.');
    else if (e.name === 'CloudTooLargeError') showSyncProblem(e, true);
    else alert('Fehler: ' + e.message);
  } finally {
    syncRunning = false;
    if (syncQueued) { syncQueued = false; triggerSyncInternal(); }
  }
}

// Anmelde-Passwort (Firebase-Konto) vergessen: Mail zum Zurücksetzen
async function resetLoginPassword() {
  const email = document.getElementById('sync-email').value.trim();
  if (!email) { showToast('Bitte zuerst die E-Mail-Adresse eingeben', 'error'); return; }
  try {
    await SyncManager.sendLoginPasswordReset(email);
    alert('📧 Falls es zu ' + email + ' ein Konto gibt, kommt gleich eine E-Mail zum Zurücksetzen des Anmelde-Passworts.\n\nDas Master-Passwort ist davon nicht betroffen.');
  } catch (e) {
    alert('Fehler: ' + e.message);
  }
}

// Angemeldet, aber der Sync läuft nicht (kein Master-Passwort, oder es wartet auf Bestätigung):
// Punkt am Menüpunkt „Einstellungen“, sonst fällt das niemandem auf (BUGS K7).
function syncNeedsAttention() {
  if (!SyncManager.isInitialized || !SyncManager.currentUser) return false;
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  return !SyncManager.masterPassword || !!(confirmGroup && !confirmGroup.classList.contains('hidden'));
}
// ─── Sync-Stand klein und immer sichtbar (AN1) ─────────────────────────────
// iPad/Laptop: zweite Zeile unter „Einstellungen“ in der Leiste (eingeklappt nur ein Punkt bei Problemen), Handy: im
// Dashboard neben dem Zahnrad und ein Punkt am Dashboard-Menüpunkt bei Problemen. Ohne Cloud-Anmeldung nichts.
// Letzter erfolgreicher Kontakt nur auf dem Gerät (`sync_last_ok`, nie in db): Ein Abgleich ohne Änderungen schreibt
// lastSyncCheck nicht, das Gerät war trotzdem auf dem neuesten Stand.
let syncStatusNow = 'idle';
const SYNC_LAST_OK_KEY = 'sync_last_ok';
function noteSyncStatus(status) {
  syncStatusNow = status;
  if (status === 'synced') { try { localStorage.setItem(SYNC_LAST_OK_KEY, String(Date.now())); } catch (e) { /* privat: nur ohne Merken */ } }
  updateSyncIndicator();
}
function lastSyncOkTime() {
  let t = 0;
  try { t = Number(localStorage.getItem(SYNC_LAST_OK_KEY)) || 0; } catch (e) { t = 0; }
  const check = Number(db.syncSettings && db.syncSettings.lastSyncCheck) || 0;
  return Math.max(t, check) || null;
}
// „heute 10:42“, „gestern 18:05“, „Mo., 09.11.“
function syncWhenText(ts, now = new Date()) {
  if (!ts) return '';
  const d = new Date(ts), ds = formatDate(d), today = formatDate(now);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (ds === today) return `heute ${time}`;
  if (ds === formatDate(addDays(parseDate(today), -1))) return `gestern ${time}`;
  return formatWeekdayShort(ds);
}
// Zustand für die Anzeige: { kind: ok|busy|offline|wait|problem, icon, head, detail, short, long } oder null (ohne Cloud).
// Leiste zweizeilig (head / detail, sonst abgeschnitten), Handy kurz (short), Titel und VoiceOver ganz (long).
function syncStateInfo(now = new Date()) {
  if (typeof SyncManager === 'undefined' || !SyncManager.currentUser) return null;
  const when = syncWhenText(lastSyncOkTime(), now);
  const changed = isLocalDBChanged();
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const st = (kind, icon, head, detail, short) => ({ kind, icon, head, detail, short, long: detail ? `${head} · ${detail}` : head });
  // Erst „wiederholen“, dann „fehlt“: Das offene Wiederholungsfeld zählt sonst als „Passwort fehlt“ (AP14)
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  if (SyncManager.masterPassword && confirmGroup && !confirmGroup.classList.contains('hidden')) return st('problem', 'alert', 'Sync wartet', 'Passwort wiederholen', 'Sync wartet');
  if (syncNeedsAttention()) return st('problem', 'alert', 'Sync pausiert', 'Passwort fehlt', 'Sync pausiert');
  if (hasForeignAccountData()) return st('problem', 'alert', 'Sync pausiert', 'anderes Konto', 'Sync pausiert');   // T6-Frage offen oder abgebrochen
  if (window.currentConflict || syncStatusNow === 'conflict') return st('problem', 'alert', 'Abgleich offen', 'wartet auf dich', 'Abgleich offen');
  if (syncStatusNow === 'confirm_password') return st('problem', 'alert', 'Sync wartet', 'Passwort wiederholen', 'Sync wartet');
  if (syncStatusNow === 'error') return changed ? st('problem', 'alert', 'Sync-Fehler', 'Änderungen nur hier', 'Sync-Fehler')
    : st('wait', 'alert', 'Sync-Fehler', `Stand ${when || 'unbekannt'}`, 'Sync-Fehler');
  if (offline) return changed ? st('wait', 'cloud-up', 'Offline', 'Änderungen warten', 'Offline · wartet')
    : st('offline', 'cloud', 'Offline', when ? `Stand ${when}` : '', 'Offline');
  if (syncStatusNow === 'checking' || changed) return st('busy', 'refresh', 'Abgleich …', '', 'Abgleich …');
  // „Abgeglichen“ statt „Synchronisiert“: In der 160 px schmalen Leiste wurde das lange Wort auf dem iPad abgeschnitten
  return st('ok', 'check', 'Abgeglichen', when, when ? when.replace(/^heute /, '') : 'Abgeglichen');
}
function updateSyncIndicator() {
  const info = syncStateInfo();
  const kinds = ['ok', 'busy', 'offline', 'wait', 'problem'];
  const alertish = !!info && (info.kind === 'wait' || info.kind === 'problem');
  const fill = (id, html) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !info;
    kinds.forEach(k => el.classList.toggle('is-' + k, !!info && info.kind === k));
    el.innerHTML = info ? html : '';
    if (info) el.title = info.long; else el.removeAttribute('title');
  };
  if (info) {
    fill('nav-sync-state', `${icon(info.icon)}<span class="ss-head">${escHtml(info.head)}</span>${info.detail ? `<span class="ss-detail">${escHtml(info.detail)}</span>` : ''}`);
    fill('dash-sync-state', `${icon(info.icon)}<span>${escHtml(info.short)}</span>`);
  } else { fill('nav-sync-state', ''); fill('dash-sync-state', ''); }
  const nav = document.getElementById('nav-settings');
  if (nav) {
    nav.setAttribute('aria-label', info ? `Einstellungen, ${info.long}` : 'Einstellungen');
    kinds.forEach(k => nav.classList.toggle('sync-' + k, !!info && info.kind === k));
    nav.classList.toggle('has-sync', !!info);   // feste Höhe, sonst springt „Einstellungen“ bei jedem Zustand
  }
  // Handy: Punkt am Dashboard-Menüpunkt nur, wenn etwas nicht stimmt (offline mit Wartendem, Fehler)
  document.getElementById('nav-dashboard')?.classList.toggle('sync-alert', alertish);
}
// Einstellungen aus der Leiste: bei einem Sync-Problem gleich „Daten & Cloud“
function openSettingsFromNav() {
  openSettings();
  const info = syncStateInfo();
  if (info && (info.kind === 'wait' || info.kind === 'problem')) showSettingsPane('data');
}

function updateSyncAttention() {
  const needs = syncNeedsAttention();
  const confirmGroup = document.getElementById('sync-master-password-confirm-group');
  const title = needs && SyncManager.masterPassword && confirmGroup && !confirmGroup.classList.contains('hidden')
    ? 'Cloud-Sync wartet: Master-Passwort in den Einstellungen bitte noch einmal eingeben'
    : needs ? 'Cloud-Sync pausiert: Master-Passwort in den Einstellungen eingeben' : '';
  // Menüpunkt (iPad/Laptop) und Zahnrad im Dashboard (Handy, AH21)
  document.querySelector('#modal-settings .set-rail [data-pane="data"]')?.classList.toggle('needs-attention', needs);
  ['nav-settings', 'btn-settings-dashboard'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('needs-attention', needs);
    if (title) btn.title = title; else btn.removeAttribute('title');
  });
}

// Triggert den Sync-Prozess
function triggerManualSync() {
  if (!SyncManager.masterPassword) {
    alert('Bitte gib zuerst dein Master-Passwort ein.');
    return;
  }
  if (window.currentConflict) {
    openModal('modal-sync-conflict');
    return;
  }
  triggerSyncInternal({ manual: true });
}

// Enthält dieses Gerät überhaupt Daten? (Neues Gerät oder nach „Alle Daten löschen“)
function isLocalDBEmpty() {
  const hasStudents = db.students && Object.values(db.students).some(list => list && list.length);
  // Aufsichten und Ferien sind auch Eingaben: Ein Gerät nur damit darf beim Anmelden nicht still überschrieben werden (R7)
  const hasOther = (Array.isArray(db.supervisions) && db.supervisions.length > 0)
    || (db.settings && Array.isArray(db.settings.holidays) && db.settings.holidays.length > 0)
    || todosOf().length > 0;   // Merkzettel (AH18)
  return !(db.groups && db.groups.length) && !(db.lessonSlots && db.lessonSlots.length) && !hasStudents && !hasOther;
}

// Letzter gemeinsamer Stand mit der Cloud DIESES Kontos, sonst null. Ein anderes Konto (Abmelden, mit
// zweitem Konto anmelden) zählt wie „nie synchronisiert“: Konflikt statt stillem Pull (BUGS P7).
// Alte Stände ohne `uid` gelten als zum angemeldeten Konto gehörig.
function syncBaseline() {
  const s = db.syncSettings;
  if (!s || s.lastSyncedCloudTimestamp === undefined || s.lastSyncedCloudTimestamp === null) return null;
  const user = SyncManager.currentUser;
  if (s.uid && user && s.uid !== user.uid) return null;
  return s;
}

// Leer UND nie synchronisiert: neues Gerät, „Alle Daten löschen“, unlesbarer Speicherstand. So ein Gerät
// lädt nie hoch, sonst wäre die Cloud leer (A2, K1). Wer dagegen alle Klassen einzeln gelöscht hat, hat einen
// Sync-Stand – diese Löschung soll in die Cloud, sonst kämen die Schülerdaten zurück (BUGS P6).
function isFreshEmptyDB() {
  return isLocalDBEmpty() && !syncBaseline();
}

// Hat der Nutzer seit dem letzten erfolgreichen Sync etwas geändert?
// Verglichen wird nur auf Gleichheit – die Uhrzeit anderer Geräte spielt keine Rolle.
function isLocalDBChanged() {
  const s = db.syncSettings || {};
  return !('syncedLocalModified' in s) || s.syncedLocalModified !== db.settings.lastModified;
}

// Merkt sich, welcher lokale und welcher Cloud-Stand zuletzt übereinstimmten.
function markSynced(cloudTimestamp, localModified) {
  if (!db.syncSettings) db.syncSettings = {};
  db.syncSettings.lastSyncedCloudTimestamp = cloudTimestamp;
  db.syncSettings.syncedLocalModified = localModified;
  db.syncSettings.lastSyncCheck = Date.now();
  if (SyncManager.currentUser) db.syncSettings.uid = SyncManager.currentUser.uid;
  delete db.syncSettings.pendingUpload;
  persistDB();
}

// Prüfsumme eines Datenstands (für den versuchten Upload, BUGS T4)
async function contentHash(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Vergleichbarer Inhalt eines Stands: ohne Änderungszeitpunkt und Sync-Metadaten.
function comparableContent(data) {
  const copy = migrateDB(JSON.parse(JSON.stringify(data)));
  delete copy.syncSettings;
  if (copy.settings) delete copy.settings.lastModified;
  return JSON.stringify(copy);
}

// Stimmt der Cloud-Stand inhaltlich mit dem lokalen überein? Dann ist ein „Konflikt“ keiner.
function cloudMatchesLocal(cloudDataString, localDataString) {
  try {
    return comparableContent(JSON.parse(cloudDataString)) === comparableContent(JSON.parse(localDataString));
  } catch (e) {
    return false;
  }
}

// Warnt, wenn die Cloud-Sicherung sich dem Firestore-Limit nähert (höchstens einmal pro Sitzung).
let cloudSizeWarned = false;
function warnIfCloudNearlyFull() {
  const size = SyncManager.lastUploadSize;
  if (cloudSizeWarned || !size || size < CLOUD_WARN_BYTES) return;
  cloudSizeWarned = true;
  alert(`⚠️ Die Cloud-Sicherung ist zu ${Math.round(size / CLOUD_MAX_BYTES * 100)} % voll.\n\nAb 100 % werden Änderungen nicht mehr in die Cloud übertragen. Bitte bald eine Sicherung exportieren und nicht mehr benötigte Klassen löschen.`);
}

// Fehler, die der Nutzer selbst beheben muss (Cloud voll, App veraltet): als Hinweisfenster,
// beim automatischen Sync aber nur einmal pro Sitzung, sonst käme es nach jeder Eingabe.
let syncProblemShown = false;
function showSyncProblem(error, manual) {
  if (!manual && syncProblemShown) return;
  syncProblemShown = true;
  alert('❌ ' + error.message);
}

// Übernimmt einen entschlüsselten Cloud-Stand komplett als lokale Daten.
function applyCloudData(dataString, cloudTimestamp) {
  const parsed = JSON.parse(dataString);
  if (!parsed || !parsed.settings || !parsed.groups || !parsed.students) {
    throw new Error('Die Cloud-Daten haben ein unerwartetes Format und wurden nicht übernommen.');
  }
  const newDB = migrateDB(parsed);
  db = newDB;
  markSynced(cloudTimestamp, db.settings.lastModified);
  saveSyncBase(cloudTimestamp, dataString);
  replaceDB(newDB);
}

// Immer nur ein Sync gleichzeitig. Wird währenddessen ein weiterer angefordert,
// läuft er direkt im Anschluss.
let syncRunning = false;
let syncQueued = false;
let syncAfterModalClose = false; // Cloud-Stand wartet, bis alle Eingabefenster zu sind (BUGS P1)
let syncSlowNoticeMs = 30000;

// Dauert ein Sync ungewöhnlich lange, nur Bescheid geben – nicht abbrechen. Ein abgebrochener Sync schrieb
// trotzdem in die Cloud, ohne dass das Gerät es sich merkte → Konflikt mit den eigenen Daten, und die Sperre
// war frei für einen zweiten, parallelen Sync (BUGS P5).
function noticeSlowSync(promise) {
  const timer = setTimeout(() => showToast('Der Sync dauert ungewöhnlich lange. Bitte Internetverbindung prüfen.', 'error'), syncSlowNoticeMs);
  return promise.finally(() => clearTimeout(timer));
}

// Offene Fenster, deren Inhalt aus `db` stammt (Stunde, Klasse, Schüler, Note, Rückfrage …). Ein Cloud-Stand, der
// jetzt `db` ersetzt, passt nicht mehr zu ihren Feldern; beim Schließen würde z. B. das Stunden-Fenster die
// Notizen des anderen Geräts mit seinen leeren Feldern überschreiben (BUGS P1). Unveränderte Einstellungen werden
// nach dem Pull neu befüllt (replaceDB), der Konflikt-Dialog ist Teil des Syncs.
// Einstellungen zählen nur mit, wenn dort etwas eingetippt ist: Sonst ersetzte der Pull die Eingaben still (BUGS T5).
function inputModalOpen() {
  return [...document.querySelectorAll('.modal-overlay:not(.hidden)')]
    .some(m => m.id === 'modal-settings' ? settingsDirty() : m.id !== 'modal-sync-conflict' && m.id !== 'modal-whats-new' && m.id !== 'modal-seating-today' && m.id !== 'modal-search');   // Suche liest nur (AH19)
}
function syncAfterModalsClosed() {
  if (!syncAfterModalClose || inputModalOpen()) return;
  syncAfterModalClose = false;
  triggerSyncInternal();
}

// Eine Eingabe wartet noch auf den Autosave-Timer: sofort übertragen (App wird verlassen, BUGS P8)
function flushPendingSync() {
  if (!window.syncTimeout) return;
  clearTimeout(window.syncTimeout);
  window.syncTimeout = null;
  triggerSyncInternal();
}

// App wird verlassen (iPad zuklappen, App wechseln). Beendet iOS die App danach, wäre ein offenes Formular
// verloren: Eingetipptes im Stunden-Fenster deshalb schon jetzt übernehmen, das Fenster bleibt offen (BUGS T3).
function onAppHidden() {
  hideAllPasswords();
  if (classGradesShown) { hideClassGrades(); rerenderClassTab(); }
  dashboardOpenGroups.clear();   // „Auffällig“ nach der Pause wieder zugeklappt (AS8)   // Beamer-Schutz: nach der Pause wieder verborgen (AH24 c)
  // Sitzplan genauso: Noten/Verlauf und ein aufgedecktes Schüler-Fenster sind beim Zurückkommen wieder verborgen (AS1)
  if (seatingShowGrades || seatingShowTrend) {
    hideSeatingGrades();
    if (document.getElementById('view-seating')?.classList.contains('active')) renderSeatingPlan();
  }
  if (!document.getElementById('modal-lesson').classList.contains('hidden')) storeLessonForm();
  if (!document.getElementById('modal-seating-student').classList.contains('hidden')) {
    commitSeatingStudentForm();
    if (swShown) setSeatingStudentShown(false);
  }
  if (!document.getElementById('modal-lesson-topic').classList.contains('hidden')) storeLessonTopicForm();
  flushPendingSync();
  if (saPendingAt) sendStudentAppsNow();   // Schülerseiten: was noch wartet, jetzt (AK3) – über einen Abgleich (AT7)
}

// Auf diesem Gerät liegen Daten, die mit einem anderen Konto synchronisiert wurden (BUGS T6). Vor dem ersten
// Abgleich fragen: Sonst landen z. B. am geteilten PC die Schüler von Lehrkraft A im Konto von Lehrkraft B.
let foreignAccountAccepted = '';   // uid, für die der Nutzer „übernehmen“ gewählt hat
let foreignAccountDeclined = '';   // uid, für die er abgebrochen hat: Autosync schweigt, „Jetzt synchronisieren“ fragt wieder
let foreignAccountAsking = false;
function hasForeignAccountData() {
  const s = db.syncSettings, user = SyncManager.currentUser;
  return !!(s && s.uid && user && s.uid !== user.uid && !isLocalDBEmpty() && foreignAccountAccepted !== user.uid);
}
async function askAboutForeignAccountData() {
  if (foreignAccountAsking) return;
  foreignAccountAsking = true;
  const user = SyncManager.currentUser;
  const answer = await askChoice('Daten eines anderen Kontos',
    `Die Daten auf diesem Gerät wurden bisher mit einem anderen Cloud-Konto abgeglichen, nicht mit ${user.email || 'diesem'}.\n\n`
    + '„In dieses Konto übernehmen“ nur, wenn es deine eigenen Daten sind (z. B. Kontowechsel).\n'
    + '„Vom Gerät löschen“: Die Daten verschwinden von diesem Gerät, im anderen Konto bleiben sie erhalten. '
    + 'Danach wird die Cloud dieses Kontos geladen.'
    + (isLocalDBChanged() ? '\n\n⚠️ Die letzten Änderungen auf diesem Gerät sind noch nicht in der anderen Cloud.' : ''),
    [{ label: 'In dieses Konto übernehmen', value: 'adopt' },
     { label: 'Vom Gerät löschen', value: 'discard', danger: true }]);
  foreignAccountAsking = false;
  if (SyncManager.currentUser !== user) return; // inzwischen abgemeldet
  if (answer === 'adopt') {
    foreignAccountAccepted = user.uid;
    triggerSyncInternal({ manual: true });
  } else if (answer === 'discard') {
    wipeLocalData();
    triggerSyncInternal({ manual: true });
  } else {
    foreignAccountDeclined = user.uid;
  }
}

// Vor dem absichtlichen Überschreiben der Cloud: Daten eines anderen Kontos nur nach Zustimmung (AP3).
// true = keine fremden Daten oder „übernehmen“ gewählt.
async function acceptForeignAccountData() {
  if (!hasForeignAccountData()) return true;
  const user = SyncManager.currentUser;
  const answer = await askChoice('Daten eines anderen Kontos',
    `Die Daten auf diesem Gerät wurden bisher mit einem anderen Cloud-Konto abgeglichen, nicht mit ${user.email || 'diesem'}.\n\n`
    + 'Mit dem neuen Passwort kämen sie in die Cloud dieses Kontos. Das nur, wenn es deine eigenen Daten sind (z. B. Kontowechsel).',
    [{ label: 'In dieses Konto übernehmen', value: 'adopt', danger: true }]);
  if (answer !== 'adopt' || SyncManager.currentUser !== user) return false;
  foreignAccountAccepted = user.uid;
  return true;
}

function showSyncConflict(conflictInfo) {
  // Bewusst kein „(aktueller)“: Die Uhren verschiedener Geräte sind nicht vergleichbar.
  const fmt = ts => ts ? new Date(ts).toLocaleString('de-DE') : 'Unbekannt';
  document.getElementById('conflict-local-time').textContent = 'geändert ' + fmt(db.settings.lastModified);
  document.getElementById('conflict-cloud-time').textContent = 'geändert ' + fmt(conflictInfo.cloudTimestamp);
  document.getElementById('conflict-title-text').textContent = 'Zwei Stände';
  document.getElementById('conflict-questions').classList.add('hidden');
  document.getElementById('conflict-whole').classList.remove('hidden');
  fillConflictDifferences(conflictInfo);
  // Solange der Konflikt offen ist, pausiert der automatische Sync (siehe triggerSyncInternal)
  window.currentConflict = conflictInfo;
  openModal('modal-sync-conflict');
}
// Was sich unterscheidet, ohne Namen und Werte (Y10). Klappt es nicht, bleibt das Fenster ohne Liste benutzbar.
function fillConflictDifferences(conflictInfo) {
  const box = document.getElementById('conflict-differences');
  let lines = [];
  try { lines = describeDifferences(db, migrateDB(JSON.parse(conflictInfo.cloudData))); } catch (e) { lines = []; }
  box.classList.toggle('hidden', !lines.length);
  box.innerHTML = lines.length ? `<strong>Das unterscheidet sich:</strong><ul>${lines.map(l => `<li>${escHtml(l)}</li>`).join('')}</ul>` : '';
}

// ─── Drei-Wege-Abgleich: Speicher und Ablauf (AH4) ───────────────────────────
// Der letzte gemeinsame Stand („Basis“) und die Stände vor einem Zusammenführen liegen in IndexedDB: nicht in db, nicht in
// der Cloud, und localStorage wäre dafür zu knapp. Fehlt etwas oder passt die Basis nicht zur Versionskennung, gibt es
// einfach das Fenster mit dem ganzen Stand; darum darf jeder Schritt hier scheitern, ohne Daten zu gefährden.
const IDB_TIMEOUT_MS = 10000;
function idbRequest(mode, run) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB fehlt')); return; }
    // Der Speicher kann hängen (ältere iPads). Ohne Zeitgrenze bliebe der ganze Sync bis zum Neuladen stehen.
    const timer = setTimeout(() => reject(new Error('Speicher antwortet nicht')), IDB_TIMEOUT_MS);
    const finish = (fn, value) => { clearTimeout(timer); fn(value); };
    try {
      const open = indexedDB.open('lehrerapp_sync', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => finish(reject, open.error);
      open.onsuccess = () => {
        try {
          const idb = open.result;
          const tx = idb.transaction('kv', mode);
          const req = run(tx.objectStore('kv'));
          tx.oncomplete = () => { idb.close(); finish(resolve, req && req.result); };
          tx.onerror = tx.onabort = () => { idb.close(); finish(reject, tx.error); };
        } catch (e) { finish(reject, e); }
      };
    } catch (e) { finish(reject, e); }
  });
}
let syncStore = {
  get: key => idbRequest('readonly', st => st.get(key)),
  put: (key, value) => idbRequest('readwrite', st => st.put(value, key)),
  clear: () => idbRequest('readwrite', st => st.clear()),
};
const MERGE_BACKUPS_KEY = 'merge_backups', MERGE_BACKUPS_MAX = 3;
let syncBaseSaved = null;   // zuletzt gespeicherte Kennung: Ein Abgleich ohne Änderung schreibt nicht jedes Mal Megabytes
async function saveSyncBase(cloudTimestamp, dataString) {
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  if (!uid || !dataString) return;
  const mark = `${uid}|${cloudTimestamp}`;
  if (syncBaseSaved === mark) return;
  try {
    await syncStore.put(`base_${uid}`, { cloudTimestamp, data: dataString });
    syncBaseSaved = mark;
  } catch (e) { syncBaseSaved = null; console.warn('Gemeinsamer Stand nicht gespeichert:', e.message); }
}
async function readSyncBase(cloudTimestamp) {
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  const rec = uid ? await syncStore.get(`base_${uid}`) : null;
  return rec && rec.cloudTimestamp === cloudTimestamp ? rec.data : null;
}
async function keepMergeBackup(localDataString, cloudDataString, kind = '') {
  const list = (await syncStore.get(MERGE_BACKUPS_KEY)) || [];
  // Dieselben Stände nur einmal, sonst schieben wiederholte offene Fragen ältere aus der Liste
  if (list[0] && list[0].local === localDataString && list[0].cloud === cloudDataString) return;
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  list.unshift({ time: Date.now(), uid, local: localDataString, cloud: cloudDataString, ...(kind ? { kind } : {}) });
  // Der Stand vor dem Schuljahreswechsel (Y6) bleibt, auch wenn danach mehrere Abgleiche kommen
  const kept = list.slice(0, MERGE_BACKUPS_MAX), year = list.find(x => x.kind === 'newYear');
  if (year && !kept.includes(year)) kept.push(year);
  await syncStore.put(MERGE_BACKUPS_KEY, kept);
}
// Nur Stände dieses Kontos anbieten (Abmelden und anderes Konto: Regel 15 gilt auch hier)
async function mergeBackupsOfAccount() {
  const uid = SyncManager.currentUser && SyncManager.currentUser.uid;
  let list = null;
  try { list = await syncStore.get(MERGE_BACKUPS_KEY); } catch (e) { list = null; }
  return (list || []).filter(x => !x.uid || x.uid === uid);
}
// Zusammenführen vorbereiten. Liefert { merged, conflicts } oder null = Fenster mit dem ganzen Stand.
async function prepareMerge(conflictInfo, localDataString, lastSynced) {
  // Auch für das Fenster mit dem ganzen Stand: Dort verwirft man eine Seite
  let backedUp = false;
  try { await keepMergeBackup(localDataString, conflictInfo.cloudData); backedUp = true; } catch (e) { console.warn('Sicherheitsnetz nicht gespeichert:', e.message); }
  if (!backedUp) return null;   // ohne Sicherheitsnetz kein Zusammenführen
  try {
    const baseString = await readSyncBase(lastSynced);
    if (!baseString) return null;
    const parse = str => {
      const d = JSON.parse(str);
      if (!d || !d.settings || !d.groups || !d.students) throw new Error('Unerwartetes Format');
      return migrateDB(d);
    };
    return mergeDB(parse(baseString), parse(localDataString), parse(conflictInfo.cloudData));
  } catch (e) {
    console.warn('Zusammenführen nicht möglich:', e.message);
    return null;
  }
}
// Ergebnis übernehmen: Es gilt als „auf dem Stand der Cloud, lokal geändert“. Der nächste Sync lädt es also auf dem normalen
// Weg hoch (Transaktion, verlorene Antwort); war die Cloud inzwischen weiter, wird von dort aus neu zusammengeführt.
// false: nicht gespeichert (Meldung kam von persistDB), der Stand bleibt wie er war.
async function applyMergedDB(out, conflictInfo) {
  const merged = out.merged;
  finishMerge(merged, out.blockPool);
  const fresh = migrateDB(merged);
  fresh.syncSettings = { ...(db.syncSettings || {}), lastSyncedCloudTimestamp: conflictInfo.cloudTimestamp };
  delete fresh.syncSettings.pendingUpload;
  if (SyncManager.currentUser) fresh.syncSettings.uid = SyncManager.currentUser.uid;
  fresh.settings.lastModified = Math.max(Date.now(), (db.settings.lastModified || 0) + 1);
  // Erst tauschen, dann auf den Speicher warten: Ein await davor ließe eine Lücke, in der Getipptes verloren ginge (Regel 32).
  // Geht das Speichern der Basis schief, passt sie nicht zur Kennung, und es bleibt beim Fenster mit dem ganzen Stand.
  const previous = db;
  db = fresh;
  if (!persistDB()) { db = previous; return false; }   // sonst käme hoch, was das Gerät selbst nicht gespeichert hat
  const saved = saveSyncBase(conflictInfo.cloudTimestamp, conflictInfo.cloudData);
  replaceDB(fresh);
  SyncManager.updateStatus('synced');
  await saved;
  return true;
}
const MERGE_DONE_TEXT = 'Änderungen von diesem Gerät und aus der Cloud zusammengeführt';
async function handleSyncConflict(conflictInfo, at) {
  const out = await prepareMerge(conflictInfo, at.localDataString, at.lastSynced);
  if (db !== at.dbAtStart || db.settings.lastModified !== at.localModified) { syncQueued = true; return; }   // Regel 32
  // Während des Wartens ging ein Eingabefenster auf: Es zeigt den alten Stand und schriebe ihn beim Schließen zurück (P1)
  if (inputModalOpen()) { syncAfterModalClose = true; return; }
  if (!out) { showSyncConflict(conflictInfo); return; }
  if (!out.conflicts.length) {
    if (!await applyMergedDB(out, conflictInfo)) return;
    syncQueued = true;
    showToast(MERGE_DONE_TEXT);
    return;
  }
  showMergeQuestions(conflictInfo, out, at);
}
// Einzelne Fragen statt eines ganzen Stands. Gelöscht gegen geändert steht auf „Behalten“, bis man anders entscheidet.
function showMergeQuestions(conflictInfo, out, at) {
  const answers = out.conflicts.map(q => (q.kind === 'delete' ? 'keep' : null));
  const list = document.getElementById('conflict-question-list');
  list.innerHTML = out.conflicts.map((q, i) => {
    const [a, b] = q.kind === 'delete' ? ['Behalten', 'Löschen'] : [`Dieses Gerät: ${q.localText}`, `Cloud: ${q.cloudText}`];
    const note = q.kind === 'delete' ? (q.deletedOn === 'cloud' ? 'In der Cloud gelöscht, auf diesem Gerät geändert' : 'Auf diesem Gerät gelöscht, in der Cloud geändert') : q.what;
    return `<div class="conflict-q" data-i="${i}"><div class="conflict-q-head"><b>${escHtml(q.title)}</b>${note ? `<span>${escHtml(note)}</span>` : ''}</div>
      <div class="conflict-q-choice" role="group" aria-label="${escHtml(q.title)}"><button type="button" class="btn-secondary" data-side="a" aria-pressed="false">${escHtml(a)}</button><button type="button" class="btn-secondary" data-side="b" aria-pressed="false">${escHtml(b)}</button></div></div>`;
  }).join('');
  const applyBtn = document.getElementById('conflict-apply');
  const show = () => {
    list.querySelectorAll('.conflict-q').forEach(row => {
      const i = Number(row.dataset.i), q = out.conflicts[i];
      const on = answers[i] === null ? null : (answers[i] === 'keep' || answers[i] === 'local') ? 'a' : 'b';
      row.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('is-chosen', btn.dataset.side === on);
        btn.setAttribute('aria-pressed', btn.dataset.side === on ? 'true' : 'false');
      });
      row.dataset.kind = q.kind;
    });
    applyBtn.disabled = answers.some(x => x === null);
  };
  list.querySelectorAll('.conflict-q').forEach(row => {
    const i = Number(row.dataset.i), del = out.conflicts[i].kind === 'delete';
    row.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      answers[i] = btn.dataset.side === 'a' ? (del ? 'keep' : 'local') : (del ? 'delete' : 'cloud');
      show();
    }));
  });
  // „Alle“ gilt nur für Werte. Löschen entscheidet man einzeln, es bleibt beim Behalten, bis man anders wählt.
  const setAll = side => { out.conflicts.forEach((q, i) => { if (q.kind === 'value') answers[i] = side; }); show(); };
  document.getElementById('conflict-all-local').onclick = () => setAll('local');
  document.getElementById('conflict-all-cloud').onclick = () => setAll('cloud');
  document.getElementById('conflict-whole-link').onclick = () => showSyncConflict(conflictInfo);
  applyBtn.onclick = () => confirmMergeAnswers(conflictInfo, out, answers, at);
  document.getElementById('conflict-title-text').textContent = out.conflicts.length === 1 ? 'Eine Frage zum Abgleich' : `${out.conflicts.length} Fragen zum Abgleich`;
  document.getElementById('conflict-whole').classList.add('hidden');
  document.getElementById('conflict-questions').classList.remove('hidden');
  show();
  window.currentConflict = conflictInfo;
  openModal('modal-sync-conflict');
}
async function confirmMergeAnswers(conflictInfo, out, answers, at) {
  if (window.currentConflict !== conflictInfo) return;
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }
  closeModal('modal-sync-conflict');
  window.currentConflict = null;
  // Inzwischen anderer Stand (anderes Fenster, ersetzte DB): Die Antworten gehören zum alten, also neu prüfen (Regel 32)
  if (inputModalOpen()) { syncAfterModalClose = true; return; }   // neu prüfen, sobald es zu ist (P1)
  if (db === at.dbAtStart && db.settings.lastModified === at.localModified) {
    out.conflicts.forEach((q, i) => q.apply(answers[i]));
    if (!await applyMergedDB(out, conflictInfo)) return;
    showToast(MERGE_DONE_TEXT);
  }
  triggerSyncInternal();
}
// Einstellungen: Stand vor dem letzten Zusammenführen zurückholen. Zählt wie das Laden einer Sicherung (BUGS K9).
async function refreshMergeRestoreButton() {
  const row = document.getElementById('merge-restore-row');
  if (!row) return;
  // Mit Cloud gibt es (ab dem zweiten Tag) auch Cloud-Sicherungen (Z4): dann immer anbieten
  const cloudOn = !!(SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword);
  row.classList.toggle('hidden', !cloudOn && !(await mergeBackupsOfAccount()).length);
  const hint = document.getElementById('cloud-versions-hint');
  if (hint) hint.classList.toggle('hidden', !(cloudOn && SyncManager.versionsProblem === 'rules'));
}
async function restoreMergeBackup() {
  const list = await mergeBackupsOfAccount();
  // Cloud-Sicherungen der letzten 14 Tage dazu (Z4); ohne Anmeldung oder Netz nur die Stände dieses Geräts
  let cloudList = [];
  if (SyncManager.isInitialized && SyncManager.currentUser && SyncManager.masterPassword && typeof SyncManager.listCloudVersions === 'function') {
    try { cloudList = await SyncManager.listCloudVersions(); } catch (e) { cloudList = []; }
  }
  if (!list.length && !cloudList.length) { showToast('Es gibt keinen früheren Stand', 'error'); return; }
  const whenOf = x => new Date(x.time).toLocaleString('de-DE') + (x.kind === 'newYear' ? ' (vor dem neuen Schuljahr)' : x.kind === 'restore' ? ' (vor dem Zurückholen)' : '');
  const cloudWhen = v => new Date(v.savedAt).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  // Ein Fehler fällt oft erst nach dem nächsten Abgleich auf: darum auch die älteren Stände
  const options = [...list.map((x, i) => ({ label: 'Auf diesem Gerät: ' + whenOf(x), value: 'l' + i })),
    ...cloudList.map(v => ({ label: 'Cloud-Sicherung: ' + cloudWhen(v), value: 'c' + v.day }))];
  options[0].primary = true;
  const pick = options.length === 1 ? options[0].value : await askChoice('Früheren Stand zurückholen',
    'Welchen Zeitpunkt möchtest du zurückholen? Die Cloud sichert den Stand vom Beginn jedes Tages, 14 Tage lang.', options);
  if (!pick) return;
  let dataString = null;
  if (pick[0] === 'c') {
    const v = cloudList.find(x => x.day === pick.slice(1));
    if (!v) return;
    const ok = await askChoice('Cloud-Sicherung', `Stand vom ${cloudWhen(v)}. Er ersetzt alle Daten auf diesem Gerät und danach auch in der Cloud.`,
      [{ label: 'Wiederherstellen', value: 'yes', primary: true }]);
    if (!ok) return;
    const dbAtStart = db;
    try { dataString = await SyncManager.readCloudVersion(v.day); } catch (e) {
      showToast(e && e.name === 'WrongPasswordError' ? 'Diese Sicherung ist mit einem früheren Master-Passwort verschlüsselt' : 'Die Sicherung ließ sich gerade nicht laden. Bitte mit Internet noch einmal versuchen', 'error');
      return;
    }
    if (db !== dbAtStart) return;   // inzwischen ersetzt (Regel 32)
  } else {
    const last = list[Number(pick.slice(1))];
    if (!last) return;
    const single = last.kind === 'newYear' || last.kind === 'restore';   // dort gab es nur einen Stand
    const side = single
      ? await askChoice('Früheren Stand zurückholen', `Vom ${whenOf(last)}. Er ersetzt alle Daten auf diesem Gerät und danach auch in der Cloud.`,
        [{ label: 'Wiederherstellen', value: 'local', primary: true }])
      : await askChoice('Stand vor dem Zusammenführen', `Vom ${whenOf(last)}. Der gewählte Stand ersetzt alle Daten auf diesem Gerät und danach auch in der Cloud.`,
        [{ label: 'Stand dieses Geräts', value: 'local', primary: true }, { label: 'Stand aus der Cloud', value: 'cloud' }]);
    if (!side) return;
    dataString = last[side];
  }
  const parsed = JSON.parse(dataString);
  // Den jetzigen Stand vorher ins Sicherheitsnetz: falsch gewählt lässt sich so wieder zurückholen
  try { const nowString = JSON.stringify(db); await keepMergeBackup(nowString, nowString, 'restore'); } catch (e) { console.warn('Sicherheitsnetz nicht gespeichert:', e.message); }
  const syncSettings = db.syncSettings;
  delete parsed.syncSettings;
  const before = db;
  db = migrateDB(parsed);
  if (syncSettings) db.syncSettings = syncSettings;
  keepLiveShareAccess(before, db);   // AT6
  saveDB();
  replaceDB(db);
  closeModal('modal-settings');
  showToast('Früherer Stand wiederhergestellt ✓');
}

// Führt den eigentlichen Sync im Hintergrund durch
async function triggerSyncInternal({ manual = false } = {}) {
  if (!SyncManager.isInitialized || !SyncManager.currentUser || !SyncManager.masterPassword) return;
  // Offener Konflikt: Nutzer muss erst entscheiden, sonst würde das Modal ständig neu aufgehen.
  if (window.currentConflict) return;
  // Offene Frage „anderes Fenster“: Der Stand dieses Fensters ist nicht gespeichert und soll nicht in die Cloud (BUGS T1)
  if (foreignWriteAsking) return;
  if (syncRunning) { syncQueued = true; return; }
  if (hasForeignAccountData()) {
    if (manual || foreignAccountDeclined !== SyncManager.currentUser.uid) askAboutForeignAccountData();
    return;
  }
  syncRunning = true;

  try {
    // Schnappschuss des lokalen Stands zum Zeitpunkt des Syncs
    const dbAtStart = db;
    const localDataString = JSON.stringify(db);
    const localModified = db.settings.lastModified;
    const baseline = syncBaseline();
    const freshEmpty = isFreshEmptyDB();

    const result = await noticeSlowSync(SyncManager.sync(localDataString, {
      localChanged: !baseline || isLocalDBChanged(),
      localIsEmpty: freshEmpty,
      lastSyncedCloudTimestamp: baseline ? baseline.lastSyncedCloudTimestamp : undefined,
      sameAsLocal: cloudData => cloudMatchesLocal(cloudData, localDataString),
      canCreateCloud: newCloudPasswordConfirmed(),
      ownUpload: ownPendingUpload(localModified),
      onBeforeUpload: async () => {
        // Diesen Upload merken: Kommt er an, die Antwort aber nicht, erkennt der nächste Sync ihn wieder (BUGS T4)
        const hash = await contentHash(localDataString);
        if (db !== dbAtStart) return;
        if (!db.syncSettings) db.syncSettings = {};
        db.syncSettings.pendingUpload = { hash, localModified, uid: SyncManager.currentUser.uid };
        persistDB();
      },
    }));
    if (result.recovered && db === dbAtStart) {
      markSynced(result.recovered.cloudTimestamp, result.recovered.localModified);
      saveSyncBase(result.recovered.cloudTimestamp, result.recovered.data);
    }
    if (['uploaded', 'pulled', 'no_change'].includes(result.status)) syncErrorShown = false;
    // Schülerapp (AJ1): Klassenseiten nach jedem erfolgreichen Sync auffrischen (schreibt nur bei Änderung)
    if (['uploaded', 'pulled', 'no_change'].includes(result.status)) { const f = saForceAfterSync; saForceAfterSync = false; publishStudentApps(f); }

    if (db !== dbAtStart) {
      // Während des Syncs wurde die ganze DB ersetzt („Alle Daten löschen“, Import, Cloud-Übernahme).
      // Das Ergebnis gehört zum alten Stand; in die neue DB geschrieben, würde sie als „synchron“
      // gelten und beim nächsten Mal die Cloud überschreiben (BUGS K1). Auch keinen Konflikt melden:
      // „Dieses Gerät hochladen“ lüde die neue, evtl. leere DB hoch (BUGS P4). Einfach neu prüfen.
      syncQueued = true;
    } else if ((result.status === 'pulled' || result.status === 'conflict') && !freshEmpty && inputModalOpen()) {
      // Erst übernehmen bzw. fragen, wenn alle Eingabefenster zu sind (BUGS P1)
      syncAfterModalClose = true;
      if (manual) showToast('Neuer Stand in der Cloud. Wird übernommen, sobald das Fenster geschlossen ist.');
    } else if (result.status === 'conflict') {
      await handleSyncConflict(result, { dbAtStart, localDataString, localModified, lastSynced: baseline ? baseline.lastSyncedCloudTimestamp : undefined });
    } else if (result.status === 'pulled') {
      if (db.settings.lastModified !== localModified) {
        // Während des Downloads wurde lokal etwas eingetragen – nicht überschreiben!
        // Der nächste Durchlauf erkennt das als Konflikt und fragt nach.
        syncQueued = true;
      } else {
        applyCloudData(result.data, result.cloudTimestamp);
        showToast('Stand aus der Cloud übernommen ✓');
      }
    } else if (result.status === 'uploaded') {
      // Nur den hochgeladenen Stand als synchron markieren; Eingaben während des Uploads
      // bleiben „geändert“ und gehen mit dem nächsten Sync hoch.
      markSynced(result.cloudTimestamp, localModified);
      saveSyncBase(result.cloudTimestamp, localDataString);
      if (manual) showToast('In die Cloud hochgeladen ✓');
      warnIfCloudNearlyFull();
      updateSyncUI();
    } else if (result.status === 'no_change') {
      // Beide Seiten inhaltsgleich – auch wenn die Kennungen abweichen (siehe cloudMatchesLocal)
      if (db.settings.lastModified === localModified) {
        markSynced(result.cloudTimestamp, localModified);
        saveSyncBase(result.cloudTimestamp, localDataString);
      }
      if (manual) showToast('Daten bereits auf dem neuesten Stand.');
      updateSyncUI();
    } else if (result.status === 'offline') {
      if (manual) showToast('Offline. Sync folgt, sobald wieder Internet da ist.', 'error');
    } else if (result.status === 'confirm_password') {
      showNewPasswordConfirm();
      // Auch beim Autosave einmal sagen: Bis zur Bestätigung geht nichts in die Cloud (BUGS T2)
      if (manual || !confirmHintShown) showToast('Cloud-Sync wartet: Master-Passwort in den Einstellungen bitte noch einmal eingeben', 'error');
      confirmHintShown = true;
    }
  } catch (error) {
    console.error("Fehler beim Sync:", error);
    if (error.name === 'WrongPasswordError') {
      rejectMasterPassword();
      alert('❌ Falsches Master-Passwort.\n\nEs passt nicht zu den Daten in der Cloud. Es wurde nichts hochgeladen. Bitte gib das Passwort erneut ein.\n\n'
        + 'Wurde das Master-Passwort auf einem anderen Gerät geändert? Dann hier das neue eingeben.');
    } else if (error.name === 'CloudReadError') {
      // Gerade nicht lesbar, aber kein falsches Passwort: Passwort bleibt, kein Alarm, später neu versuchen (Regel 15)
      if (manual || !syncErrorShown) { syncErrorShown = true; showToast('❌ ' + error.message, 'error'); }
    } else if (error.name === 'CloudChangedError') {
      // Ein anderes Gerät war schneller – einfach neu prüfen.
      syncQueued = true;
    } else if (error.name === 'AccountDeletedError' || ACCOUNT_GONE_CODES.includes(error.code)) {
      handleAccountDeleted();
    } else if (error.name === 'CloudTooLargeError' || error.name === 'UnsupportedFormatError') {
      showSyncProblem(error, manual);
    } else if (manual || !syncErrorShown) {
      // Automatisch höchstens einmal, bis wieder ein Sync klappt – sonst kam nach jeder Eingabe ein roter Toast (BUGS T7)
      syncErrorShown = true;
      showToast(isConnectionError(error)
        ? '❌ Keine Verbindung zur Cloud. Deine Daten sind auf diesem Gerät gespeichert. Sync folgt später.'
        : '❌ Sync-Fehler: ' + error.message, 'error');
    }
  } finally {
    syncRunning = false;
    if (syncQueued) {
      syncQueued = false;
      triggerSyncInternal({ manual });
    }
  }
}

let syncErrorShown = false;
let confirmHintShown = false;
function isConnectionError(error) {
  return ['unavailable', 'deadline-exceeded', 'auth/network-request-failed'].includes(error && error.code)
    || /offline|network|failed to fetch|internet/i.test(String(error && error.message));
}

// Früherer Upload dieses Geräts, dessen Antwort nie ankam (BUGS T4)
function ownPendingUpload(localModified) {
  const p = db.syncSettings && db.syncSettings.pendingUpload;
  const user = SyncManager.currentUser;
  if (!p || !user || p.uid !== user.uid) return null;
  return {
    matches: async cloudData => (await contentHash(cloudData)) === p.hash,
    localChangedSince: localModified !== p.localModified,
    localModified: p.localModified,
  };
}

// Löst Konflikte
async function resolveConflict(decision) {
  const conflict = window.currentConflict;
  if (!conflict) return;
  if (syncRunning) { showToast('Gerade läuft ein Sync. Bitte gleich noch einmal versuchen', 'error'); return; }

  if (decision === 'push' && isFreshEmptyDB()) {
    // Z. B. „Alle Daten löschen“, während der Dialog offen war: Hochladen würde die Cloud leeren (BUGS P4)
    alert('Auf diesem Gerät sind keine Daten (mehr). Hochladen würde die Cloud für alle Geräte leeren.\n\nBitte „Cloud laden“ wählen.');
    return;
  }
  if (decision === 'pull') {
    if (!confirm("Bist du dir sicher, dass du die Version aus der Cloud laden willst?\n\n⚠️ Alle deine lokalen Änderungen, die du auf diesem Gerät offline gemacht hast, gehen dabei verloren!")) return;
  } else if (decision === 'push') {
    if (!confirm("Bist du dir sicher, dass du deine lokale Version hochladen willst?\n\n⚠️ Der Speicherstand in der Cloud wird komplett überschrieben. Änderungen von anderen Geräten gehen verloren!")) return;
  } else if (decision === 'backup') {
    if (!confirm("Möchtest du eine Sicherheitskopie deiner lokalen Daten auf deinem PC speichern und danach den Speicherstand aus der Cloud laden?")) return;
  }

  closeModal('modal-sync-conflict');
  window.currentConflict = null;

  try {
    if (decision === 'pull') {
      applyCloudData(conflict.cloudData, conflict.cloudTimestamp);
      SyncManager.updateStatus('synced'); // sonst stand noch „Konflikt!“ da (BUGS T9)
      showToast('Cloud-Version geladen und lokale Änderungen verworfen.');

    } else if (decision === 'push') {
      // Lokale Version erzwingen – aber nur über genau den Cloud-Stand, den der Nutzer gesehen hat.
      // Sync-Sperre: Ein paralleler Sync läse noch den alten Cloud-Stand und zeigte denselben Konflikt erneut (BUGS T8)
      syncRunning = true;
      try {
        const dbAtStart = db;
        const localModified = db.settings.lastModified;
        const uploaded = JSON.stringify(db);
        const newTimestamp = await SyncManager.saveToCloud(uploaded, conflict.cloudTimestamp);
        if (db === dbAtStart) {
          markSynced(newTimestamp, localModified); // sonst: DB inzwischen ersetzt (BUGS K1)
          saveSyncBase(newTimestamp, uploaded);
        }
      } finally {
        syncRunning = false;
      }
      SyncManager.updateStatus('synced');
      if (syncQueued) { syncQueued = false; triggerSyncInternal(); }
      showToast('Cloud mit dem Stand dieses Geräts überschrieben ✓');
      warnIfCloudNearlyFull();
      updateSyncUI();

    } else if (decision === 'backup') {
      exportData(); // Ruft den Standard-Export auf
      applyCloudData(conflict.cloudData, conflict.cloudTimestamp);
      SyncManager.updateStatus('synced');
      showToast('Backup gespeichert und Cloud-Version geladen.');
    }
  } catch (e) {
    if (e.name === 'CloudChangedError') {
      alert('In der Zwischenzeit hat ein anderes Gerät neue Daten hochgeladen. Es wird neu geprüft.');
      triggerSyncInternal({ manual: true });
    } else if (e.name === 'CloudTooLargeError') {
      showSyncProblem(e, true);
    } else {
      alert('Fehler bei der Konfliktlösung: ' + e.message);
    }
  }
}

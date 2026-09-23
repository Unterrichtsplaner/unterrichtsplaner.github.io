/**
 * SyncManager - Verwaltet die Firebase-Synchronisierung, Authentifizierung und E2EE
 *
 * Grundprinzip: Die Cloud hält genau EINEN verschlüsselten Datenstand plus einen Zeitstempel
 * (`lastModified`), der nur als Versionskennung dient. Verglichen wird nur auf Gleichheit,
 * nie auf größer/kleiner – so spielen abweichende Uhren verschiedener Geräte keine Rolle.
 */

// Wird geworfen, wenn das Master-Passwort die Cloud-Daten nicht entschlüsseln kann.
class WrongPasswordError extends Error {
  constructor() {
    super('Das Master-Passwort passt nicht zu den Daten in der Cloud.');
    this.name = 'WrongPasswordError';
  }
}

// Wird geworfen, wenn ein anderes Gerät die Cloud zwischen Lesen und Schreiben verändert hat.
class CloudChangedError extends Error {
  constructor() {
    super('Die Cloud-Daten wurden zwischenzeitlich von einem anderen Gerät geändert.');
    this.name = 'CloudChangedError';
  }
}

/**
 * Reine Entscheidungslogik (ohne Netzwerk, dadurch testbar).
 * @param {Object} s
 * @param {boolean} s.hasCloud        - Gibt es überhaupt einen Cloud-Stand?
 * @param {*}       s.cloudTimestamp  - Versionskennung des Cloud-Stands
 * @param {*}       s.lastSyncedCloudTimestamp - Versionskennung beim letzten erfolgreichen Sync dieses Geräts
 * @param {boolean} s.localChanged    - Hat der Nutzer seit dem letzten Sync lokal etwas geändert?
 * @param {boolean} s.localIsEmpty    - Enthält dieses Gerät gar keine Daten (neues Gerät / zurückgesetzt)?
 * @returns {'upload'|'pull'|'conflict'|'none'}
 */
function decideSync({ hasCloud, cloudTimestamp, lastSyncedCloudTimestamp, localChanged, localIsEmpty }) {
  if (!hasCloud) {
    // Einen leeren Stand laden wir nie hoch – das wäre nur Rauschen.
    return localIsEmpty ? 'none' : 'upload';
  }
  const cloudChanged = cloudTimestamp !== lastSyncedCloudTimestamp;
  if (!cloudChanged) return localChanged ? 'upload' : 'none';
  // Cloud hat sich verändert:
  if (localIsEmpty || !localChanged) return 'pull';
  return 'conflict';
}

const SyncManager = {
  auth: null,
  db: null,
  currentUser: null,
  config: null,
  masterPassword: '',
  isInitialized: false,

  // Event-Callbacks, die von app.js registriert werden können
  callbacks: {
    onAuthStateChanged: null,
    onSyncStatusChanged: null,
    onConflictDetected: null // Wird aufgerufen, wenn ein Konflikt vorliegt
  },

  /**
   * Initialisiert Firebase mit einer Konfiguration.
   * @param {Object} config - Die Firebase-Konfigurationsdaten
   */
  init(config) {
    if (!config || !config.apiKey) {
      console.log('SyncManager: Keine Firebase-Konfiguration vorhanden. Sync deaktiviert.');
      this.isInitialized = false;
      return false;
    }

    try {
      this.config = config;
      // Falls bereits eine App initialisiert ist, löschen wir sie nicht, sondern verwenden sie
      if (firebase.apps.length === 0) {
        firebase.initializeApp(config);
      }

      this.auth = firebase.auth();
      this.db = firebase.firestore();

      // Firestore Offline-Support aktivieren
      this.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        console.warn("Firestore Persistence konnte nicht aktiviert werden:", err.code);
      });

      // Auth-State-Listener
      this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        console.log("SyncManager: Auth-Status geändert:", user ? user.email : "Ausgeloggt");
        if (this.callbacks.onAuthStateChanged) {
          this.callbacks.onAuthStateChanged(user);
        }
      });

      this.isInitialized = true;
      console.log('SyncManager: Firebase erfolgreich initialisiert.');
      return true;
    } catch (error) {
      console.error('SyncManager: Fehler bei der Initialisierung:', error);
      this.isInitialized = false;
      return false;
    }
  },

  /**
   * Setzt das Master-Passwort für die Verschlüsselung.
   */
  setMasterPassword(password) {
    this.masterPassword = password;
  },

  /**
   * Registrierung mit E-Mail und Passwort
   */
  async registerWithEmail(email, password) {
    if (!this.isInitialized) throw new Error("Firebase ist nicht initialisiert.");
    return this.auth.createUserWithEmailAndPassword(email, password);
  },

  /**
   * Login mit E-Mail und Passwort
   */
  async loginWithEmail(email, password) {
    if (!this.isInitialized) throw new Error("Firebase ist nicht initialisiert.");
    return this.auth.signInWithEmailAndPassword(email, password);
  },

  /**
   * Login mit Google (Popup-Methode)
   */
  async loginWithGoogle() {
    if (!this.isInitialized) throw new Error("Firebase ist nicht initialisiert.");
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.auth.signInWithPopup(provider);
  },

  /**
   * Logout
   */
  async logout() {
    if (!this.isInitialized) return;
    this.masterPassword = '';
    return this.auth.signOut();
  },

  _docRef() {
    return this.db.collection('users_data').doc(this.currentUser.uid);
  },

  /**
   * Holt den aktuellen Cloud-Datensatz direkt vom Server (nie aus dem Offline-Cache,
   * sonst würden Entscheidungen auf veralteten Daten getroffen).
   * @returns {Object|null} { encryptedData, lastModified }
   */
  async getCloudData() {
    if (!this.isInitialized || !this.currentUser) return null;
    const doc = await this._docRef().get({ source: 'server' });
    return doc.exists ? doc.data() : null;
  },

  /**
   * Entschlüsselt einen Cloud-Datensatz; wirft WrongPasswordError bei falschem Passwort.
   */
  decryptPayload(cloudPayload) {
    try {
      return CryptoHelper.decrypt(cloudPayload.encryptedData, this.masterPassword);
    } catch (e) {
      throw new WrongPasswordError();
    }
  },

  /**
   * Speichert Daten verschlüsselt in der Cloud – aber nur, wenn die Cloud noch auf dem
   * erwarteten Stand ist (Firestore-Transaktion). Sonst CloudChangedError.
   * @param {string} rawDataString - Die unverschlüsselten JSON-Daten als String
   * @param {*} expectedCloudTimestamp - Versionskennung, die in der Cloud stehen muss (null = Cloud muss leer sein)
   * @returns {number} die neue Versionskennung in der Cloud
   */
  async saveToCloud(rawDataString, expectedCloudTimestamp) {
    if (!this.isInitialized || !this.currentUser) throw new Error("Nicht angemeldet.");
    if (!this.masterPassword) {
      throw new Error("Master-Passwort fehlt. Verschlüsselung nicht möglich.");
    }

    const encrypted = CryptoHelper.encrypt(rawDataString, this.masterPassword);
    const docRef = this._docRef();

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const current = snap.exists ? snap.data().lastModified : null;
      if (current !== expectedCloudTimestamp) throw new CloudChangedError();

      // Neue Kennung muss sich vom alten Stand unterscheiden, auch wenn die Uhr hinterherhinkt.
      let newTimestamp = Date.now();
      if (typeof current === 'number' && newTimestamp <= current) newTimestamp = current + 1;

      tx.set(docRef, { encryptedData: encrypted, lastModified: newTimestamp });
      return newTimestamp;
    });
  },

  /**
   * Führt die Synchronisation aus. Lädt nie etwas hoch, bevor nicht bewiesen ist,
   * dass das Master-Passwort die bestehenden Cloud-Daten entschlüsseln kann.
   *
   * @param {string} localDataString - Lokaler unverschlüsselter Datenstring
   * @param {Object} local
   * @param {boolean} local.localChanged
   * @param {boolean} local.localIsEmpty
   * @param {*} local.lastSyncedCloudTimestamp
   * @returns {Object} { status: 'uploaded'|'pulled'|'conflict'|'no_change'|'offline'|'no_user', ... }
   */
  async sync(localDataString, { localChanged, localIsEmpty, lastSyncedCloudTimestamp }) {
    if (!this.isInitialized || !this.currentUser) {
      return { status: 'no_user' };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { status: 'offline' };
    }

    this.updateStatus('checking');

    try {
      const cloudPayload = await this.getCloudData();
      const hasCloud = !!cloudPayload;
      const cloudTimestamp = hasCloud ? cloudPayload.lastModified : null;

      // Passwort-Probe: Ohne erfolgreiche Entschlüsselung geht nichts weiter.
      const cloudData = hasCloud ? this.decryptPayload(cloudPayload) : null;

      const action = decideSync({ hasCloud, cloudTimestamp, lastSyncedCloudTimestamp, localChanged, localIsEmpty });

      if (action === 'upload') {
        const newTimestamp = await this.saveToCloud(localDataString, cloudTimestamp);
        this.updateStatus('synced');
        return { status: 'uploaded', cloudTimestamp: newTimestamp };
      }

      if (action === 'pull') {
        this.updateStatus('synced');
        return { status: 'pulled', data: cloudData, cloudTimestamp };
      }

      if (action === 'conflict') {
        console.warn("SyncManager: Konflikt erkannt! Cloud:", cloudTimestamp, "Basis:", lastSyncedCloudTimestamp);
        this.updateStatus('conflict');
        const conflict = { cloudTimestamp, cloudPayload, cloudData };
        if (this.callbacks.onConflictDetected) this.callbacks.onConflictDetected(conflict);
        return { status: 'conflict', ...conflict };
      }

      this.updateStatus('synced');
      return { status: 'no_change', cloudTimestamp };

    } catch (error) {
      console.error("SyncManager: Fehler beim Sync:", error);
      this.updateStatus('error');
      throw error;
    }
  },

  updateStatus(status) {
    if (this.callbacks.onSyncStatusChanged) {
      this.callbacks.onSyncStatusChanged(status);
    }
  }
};

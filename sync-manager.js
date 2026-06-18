/**
 * SyncManager - Verwaltet die Firebase-Synchronisierung, Authentifizierung und E2EE
 */
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
      let app;
      if (firebase.apps.length === 0) {
        app = firebase.initializeApp(config);
      } else {
        app = firebase.app();
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

  /**
   * Holt den aktuellen Cloud-Datensatz ab (Metadaten oder das gesamte Paket)
   */
  async getCloudData() {
    if (!this.isInitialized || !this.currentUser) return null;
    
    const docRef = this.db.collection('users_data').doc(this.currentUser.uid);
    const doc = await docRef.get();
    
    if (doc.exists) {
      return doc.data(); // Enthält { encryptedData, lastModified }
    }
    return null;
  },

  /**
   * Speichert Daten in der Cloud (Verschlüsselt mit dem Master-Passwort)
   * @param {string} rawDataString - Die unverschlüsselten JSON-Daten als String
   * @param {number} timestamp - Der Zeitstempel dieser Änderung (lokal)
   */
  async saveToCloud(rawDataString, timestamp) {
    if (!this.isInitialized || !this.currentUser) return false;
    if (!this.masterPassword) {
      throw new Error("Master-Passwort fehlt. Verschlüsselung nicht möglich.");
    }

    try {
      // 1. Daten lokal verschlüsseln
      const encrypted = CryptoHelper.encrypt(rawDataString, this.masterPassword);

      // 2. In Firestore speichern
      const docRef = this.db.collection('users_data').doc(this.currentUser.uid);
      await docRef.set({
        encryptedData: encrypted,
        lastModified: timestamp
      });

      console.log("SyncManager: Erfolgreich in der Cloud gespeichert. Zeitstempel:", timestamp);
      return true;
    } catch (error) {
      console.error("SyncManager: Fehler beim Speichern in der Cloud:", error);
      throw error;
    }
  },

  /**
   * Führt die Synchronisation aus und prüft auf Konflikte.
   * @param {string} localDataString - Lokaler unverschlüsselter Datenstring
   * @param {number} localTimestamp - Lokaler Zeitstempel der letzten Änderung
   * @param {number} lastSyncedCloudTimestamp - Zeitstempel des letzten erfolgreichen Syncs
   * @returns {Object} { status: 'sync_done'|'conflict'|'no_user'|'no_change', data: ... }
   */
  async sync(localDataString, localTimestamp, lastSyncedCloudTimestamp) {
    if (!this.isInitialized || !this.currentUser) {
      return { status: 'no_user' };
    }

    this.updateStatus('checking');

    try {
      // 1. Cloud-Daten abrufen
      const cloudPayload = await this.getCloudData();

      // Fall A: Noch keine Daten in der Cloud vorhanden
      if (!cloudPayload) {
        console.log("SyncManager: Keine Cloud-Daten vorhanden. Initialer Upload...");
        await this.saveToCloud(localDataString, localTimestamp);
        this.updateStatus('synced');
        return { status: 'sync_done', cloudTimestamp: localTimestamp };
      }

      const cloudTimestamp = cloudPayload.lastModified;

      // Fall B: Cloud-Daten sind identisch mit unserem letzten bekannten Sync-Stand
      // oder wir haben keine lokalen Änderungen seitdem
      if (cloudTimestamp === lastSyncedCloudTimestamp) {
        if (localTimestamp > lastSyncedCloudTimestamp) {
          // Wir haben neuere lokale Änderungen -> Hochladen
          console.log("SyncManager: Lokale Änderungen vorhanden. Upload...");
          await this.saveToCloud(localDataString, localTimestamp);
          this.updateStatus('synced');
          return { status: 'sync_done', cloudTimestamp: localTimestamp };
        } else {
          // Keine Änderungen auf beiden Seiten
          this.updateStatus('synced');
          return { status: 'no_change', cloudTimestamp: cloudTimestamp };
        }
      }

      // Fall C: Jemand anderes hat in der Cloud Änderungen vorgenommen (cloudTimestamp > lastSyncedCloudTimestamp)
      if (cloudTimestamp > lastSyncedCloudTimestamp) {
        // Haben wir AUCH lokale Änderungen vorgenommen?
        if (localTimestamp > lastSyncedCloudTimestamp) {
          // KONFLIKT! Beide Seiten haben Änderungen vorgenommen.
          console.warn("SyncManager: Konflikt erkannt! Cloud-Stand:", cloudTimestamp, "Lokal-Stand:", localTimestamp, "Basis:", lastSyncedCloudTimestamp);
          this.updateStatus('conflict');
          
          if (this.callbacks.onConflictDetected) {
            // Callback zur UI-Behandlung aufrufen
            this.callbacks.onConflictDetected({
              localTimestamp,
              cloudTimestamp,
              cloudPayload
            });
          }
          return { 
            status: 'conflict', 
            localTimestamp, 
            cloudTimestamp,
            cloudPayload 
          };
        } else {
          // Nur die Cloud ist neuer. Wir übernehmen die Cloud-Daten.
          console.log("SyncManager: Cloud-Daten sind neuer. Herunterladen...");
          const decrypted = CryptoHelper.decrypt(cloudPayload.encryptedData, this.masterPassword);
          this.updateStatus('synced');
          return { status: 'sync_done', action: 'pulled', data: decrypted, cloudTimestamp: cloudTimestamp };
        }
      }

      // Fall D: Lokale Daten sind neuer, und in der Cloud gab es keine Zwischenänderungen 
      // (das sollte theoretisch durch Fall B abgedeckt sein, aber zur Sicherheit)
      if (localTimestamp > cloudTimestamp) {
        console.log("SyncManager: Lokale Daten sind neuer als die Cloud. Upload...");
        await this.saveToCloud(localDataString, localTimestamp);
        this.updateStatus('synced');
        return { status: 'sync_done', cloudTimestamp: localTimestamp };
      }

      this.updateStatus('synced');
      return { status: 'no_change', cloudTimestamp: cloudTimestamp };

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

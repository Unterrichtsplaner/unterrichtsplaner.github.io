// Minimale Firebase-Attrappe (compat-API), gerade genug für sync-manager.js.
// Die „Cloud“ ist ein einfaches Objekt; Tests können hineinschauen und hineinschreiben
// (z. B. um ein zweites Gerät zu simulieren).
function createFakeFirebase() {
  const cloud = {
    store: {},       // uid -> { encryptedData, lastModified }
    reads: 0,
    writes: 0,
    onNextRead: null, // einmaliger Hook nach dem nächsten Lesen (für Wettlauf-Szenarien)
    shares: {},       // Schülerapp (AJ1): id -> Dokument der Sammlung `shares`
    shareWrites: 0,
    shareDenied: false, // true: wie fehlende Firestore-Regeln (permission-denied)
    shareUid: null,     // gesetzt: Löschen nur für Dokumente dieses Besitzers (wie die Regel)
    shareListDenied: false, // true: alte Regeln ohne „list“ für den Besitzer (BC2)
    versions: {},     // Cloud-Sicherungen (Z4): uid -> { docId -> Dokument } im Unterordner `versions`
    versionWrites: 0,
    versionsDenied: false, // true: Regel für `versions` fehlt noch
  };

  const denied = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
  const shareRef = (id) => ({
    id,
    async get() {
      const d = cloud.shares[id];
      return { exists: !!d, data: () => (d ? { ...d } : undefined) };
    },
    async set(data) {
      if (cloud.shareDenied) throw denied();
      // Regel: Besitzer bleibt gleich (firestore.rules)
      if (cloud.shares[id] && cloud.shares[id].owner !== data.owner) throw denied();
      cloud.shares[id] = { ...data };
      cloud.shareWrites++;
    },
    async delete() {
      if (cloud.shareDenied) throw denied();
      if (cloud.shareUid && cloud.shares[id] && cloud.shares[id].owner !== cloud.shareUid) throw denied();   // nur der Besitzer
      delete cloud.shares[id];
    },
  });

  const snapshot = (uid) => {
    const d = cloud.store[uid];
    return { exists: !!d, data: () => (d ? { ...d } : undefined) };
  };

  const versionRef = (uid, id) => ({
    id,
    async get() {
      if (cloud.versionsDenied) throw denied();
      const d = (cloud.versions[uid] || {})[id];
      return { exists: !!d, data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined) };
    },
    async set(data) {
      if (cloud.versionsDenied) throw denied();
      (cloud.versions[uid] = cloud.versions[uid] || {})[id] = JSON.parse(JSON.stringify(data));
      cloud.versionWrites++;
    },
    async delete() {
      if (cloud.versionsDenied) throw denied();
      if (cloud.versions[uid]) delete cloud.versions[uid][id];
    },
  });

  const docRef = (uid) => ({
    uid,
    collection: (name) => ({
      doc: (id) => versionRef(uid, id),
      async get() {   // alle Sicherungen auflisten (AY4)
        if (cloud.versionsDenied) throw denied();
        const docs = Object.keys(cloud.versions[uid] || {}).map(id => ({ id, data: () => JSON.parse(JSON.stringify(cloud.versions[uid][id])) }));
        return { docs, empty: !docs.length, size: docs.length };
      },
    }),
    async get() {
      cloud.reads++;
      const snap = snapshot(uid);
      if (cloud.onNextRead) { const hook = cloud.onNextRead; cloud.onNextRead = null; await hook(); }
      return snap;
    },
  });

  const firestore = {
    enablePersistence: () => Promise.resolve(),
    collection: (name) => (name === 'shares' ? {
      doc: (id) => shareRef(id),
      // Auflisten nur der eigenen (Regel: list, wenn owner == Anmeldung, BC2)
      where: (field, op, value) => ({
        async get() {
          if (cloud.shareDenied || cloud.shareListDenied || field !== 'owner' || op !== '==') throw denied();
          const docs = Object.keys(cloud.shares).filter(id => cloud.shares[id].owner === value).map(id => ({ id, data: () => ({ ...cloud.shares[id] }) }));
          return { docs, empty: !docs.length, size: docs.length };
        },
      }),
    } : { doc: (uid) => docRef(uid) }),
    async runTransaction(fn) {
      const pending = [];
      const tx = {
        get: async (ref) => snapshot(ref.uid),
        set: (ref, data) => pending.push([ref.uid, data]),
      };
      const result = await fn(tx);
      pending.forEach(([uid, data]) => { cloud.store[uid] = data; cloud.writes++; });
      return result;
    },
  };

  const auth = {
    onAuthStateChanged() {},
    signOut: async () => {},
  };

  const firebase = {
    apps: [],
    initializeApp() { this.apps.push({}); },
    auth: () => auth,
    firestore: () => firestore,
  };
  firebase.auth.GoogleAuthProvider = function () {};
  firebase.auth.EmailAuthProvider = { credential: (email, password) => ({ email, password }) };

  return { firebase, cloud };
}

module.exports = { createFakeFirebase };

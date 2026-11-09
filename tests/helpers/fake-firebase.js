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
      cloud.shares[id] = { ...data };
      cloud.shareWrites++;
    },
    async delete() {
      if (cloud.shareDenied) throw denied();
      delete cloud.shares[id];
    },
  });

  const snapshot = (uid) => {
    const d = cloud.store[uid];
    return { exists: !!d, data: () => (d ? { ...d } : undefined) };
  };

  const docRef = (uid) => ({
    uid,
    async get() {
      cloud.reads++;
      const snap = snapshot(uid);
      if (cloud.onNextRead) { const hook = cloud.onNextRead; cloud.onNextRead = null; await hook(); }
      return snap;
    },
  });

  const firestore = {
    enablePersistence: () => Promise.resolve(),
    collection: (name) => (name === 'shares' ? { doc: (id) => shareRef(id) } : { doc: (uid) => docRef(uid) }),
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

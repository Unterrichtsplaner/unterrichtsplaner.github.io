// Minimale Firebase-Attrappe (compat-API), gerade genug für sync-manager.js.
// Die „Cloud“ ist ein einfaches Objekt; Tests können hineinschauen und hineinschreiben
// (z. B. um ein zweites Gerät zu simulieren).
function createFakeFirebase() {
  const cloud = {
    store: {},       // uid -> { encryptedData, lastModified }
    reads: 0,
    writes: 0,
    onNextRead: null // einmaliger Hook nach dem nächsten Lesen (für Wettlauf-Szenarien)
  };

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
    collection: () => ({ doc: (uid) => docRef(uid) }),
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

// Schülerapp (BUGS AJ1): Zugang, Verschlüsselung und Link. Gemeinsam für den Planer (index.html) und die
// Schülerseite (schueler.html), darum ohne Zugriff auf `db`.
//
// Ein Zugang = zufällige Kennung (Dokument `shares/<id>` in Firestore) + zufälliger Schlüssel (AES-GCM, 256 Bit).
// Der Schlüssel steht nur im Link hinter „#“ und geht so nie an einen Server: Firestore und GitHub sehen nur
// verschlüsselte Bytes. Wer den Link hat, kann lesen; ein neuer Zugang macht den alten unbrauchbar.
// Ein neues Format braucht eine neue Nummer (FORMAT), alte Schülerseiten melden dann „neuere Version“ (Regel 15).
const StudentShare = (() => {
  const FORMAT = 1;

  function b64u(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64u(text) {
    let s = String(text).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }
  const random = n => crypto.getRandomValues(new Uint8Array(n));
  const ID_RE = /^[A-Za-z0-9_-]{22}$/, KEY_RE = /^[A-Za-z0-9_-]{43}$/;

  function newAccess() { return { id: b64u(random(16)), key: b64u(random(32)) }; }
  function isAccess(a) { return !!a && typeof a === 'object' && ID_RE.test(a.id) && KEY_RE.test(a.key); }

  const importKey = (key, usage) => crypto.subtle.importKey('raw', fromB64u(key), 'AES-GCM', false, [usage]);

  async function encrypt(obj, key) {
    const iv = random(12);
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(key, 'encrypt'),
      new TextEncoder().encode(JSON.stringify(obj)));
    return { format: FORMAT, iv: b64u(iv), data: b64u(new Uint8Array(data)) };
  }

  async function decrypt(doc, key) {
    if (!doc || doc.format !== FORMAT) {
      const e = new Error(doc && doc.format > FORMAT ? 'Diese Seite braucht eine neuere Version.' : 'Unbekanntes Format');
      e.name = 'ShareFormatError';
      throw e;
    }
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64u(doc.iv) }, await importKey(key, 'decrypt'), fromB64u(doc.data));
    return JSON.parse(new TextDecoder().decode(plain));
  }

  // base: volle Adresse der Schülerseite ohne „#“
  function linkFor(access, base) { return `${base}#${access.id}.${access.key}`; }
  function parseHash(hash) {
    const m = /^#?([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(String(hash || '').trim());
    return m ? { id: m[1], key: m[2] } : null;
  }

  return { FORMAT, newAccess, isAccess, encrypt, decrypt, linkFor, parseHash };
})();

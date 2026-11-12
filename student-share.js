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

  // Sticker (AJ2b): Symbole (Linien, 24er-Raster) und Farben, gleich in Planer und Schülerseite. Gespeichert wird nur der Name
  // des Symbols bzw. die Nummer der Farbe; Unbekanntes zeigt den Stern (ältere/neuere Version).
  const STICKER_ICONS = {
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    bubble: '<path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    ask: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><circle cx="12" cy="17" r=".8" fill="currentColor"/>',
    hands: '<path d="M7 11l3-3a2 2 0 0 1 3 0l4 4"/><path d="M3 12l4 4 3-1 3 3 3-1 4-4"/><path d="M14 9l3-3 4 4"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
    rocket: '<path d="M12 15l-3-3c1.5-5 4.5-8 9-9-1 4.5-4 7.5-9 9"/><path d="M9 12l-4 1 2-4 3-.5M12 15l-1 4 4-2 .5-3"/><circle cx="15" cy="8" r="1.4"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-9-1 2-2 3-3 3 0-2-1-3-2-4 0 4-3 6-3 10a6 6 0 0 0 6 6z"/>',
    medal: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11.5L6 3h4l2 5 2-5h4l-2.5 8.5"/>',
    puzzle: '<path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z"/>',
    plus: '<path d="M12 6v12M6 12h12"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    crane: '<rect x="2.5" y="7" width="19" height="7" rx="1"/><path d="M7 7l-3.5 7M12.5 7l-3.5 7M18 7l-3.5 7"/><path d="M5 14v6M19 14v6"/>',
    // Laden (AV1): Angebote wie Sitzplatz, Partner, Song, keine TÜ, eine 1
    seat: '<path d="M7 3v8h10V3"/><path d="M5 11h14v3H5z"/><path d="M7 14v7M17 14v7"/>',
    pair: '<circle cx="8" cy="8" r="3"/><circle cx="16.5" cy="8" r="3"/><path d="M2.5 20c0-3.2 2.4-5.4 5.5-5.4s5.5 2.2 5.5 5.4M13.5 15.2c.9-.4 1.9-.6 3-.6 3.1 0 5 2.2 5 5.4"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    skip: '<path d="M6 3h9l4 4v14H6z"/><path d="M9.5 11.5l5 5M14.5 11.5l-5 5"/>',
    one: '<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.2L13 7v10.5"/>',
    gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-1.5-3-5-3.5-5-1.2C7 8 9.5 8 12 8zM12 8c1.5-3 5-3.5 5-1.2C17 8 14.5 8 12 8z"/>',
  };
  const STICKER_COLORS = ['#ff8a3d', '#2fb37a', '#e84d8a', '#3a8ee6', '#14a3b8', '#e0a800'];   // Nr. 4 Türkis statt Lila (Wunsch 09.11.)
  const stickerSvg = icon => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STICKER_ICONS[icon] || STICKER_ICONS.star}</svg>`;
  const stickerColor = c => STICKER_COLORS[Number(c)] || STICKER_COLORS[0];

  return { FORMAT, newAccess, isAccess, encrypt, decrypt, linkFor, parseHash, STICKER_ICONS, STICKER_COLORS, stickerSvg, stickerColor };
})();

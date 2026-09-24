/**
 * Hilfsobjekt für Ende-zu-Ende-Verschlüsselung (E2EE) im Frontend
 *
 * Cloud-Formate (Feld `format` im Firestore-Dokument):
 *   (fehlt) = v1, alt: CryptoJS-Passphrase-Modus (MD5, 1 Iteration). Nur noch lesen.
 *   2       = v2: gzip → AES-256-GCM, Schlüssel per PBKDF2-SHA256 (`iterations`, `salt`), `iv` je Upload neu.
 * Neuere Formate kann diese Version nicht lesen → UnsupportedFormatError (nicht mit falschem Passwort verwechseln!).
 */

class UnsupportedFormatError extends Error {
  constructor(format) {
    super('Die Cloud-Daten stammen von einer neueren App-Version (Format ' + format + '). Bitte die App aktualisieren.');
    this.name = 'UnsupportedFormatError';
  }
}

const CLOUD_FORMAT = 2;
const PBKDF2_ITERATIONS = 300000;

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function pipeBytes(bytes, transform) {
  const stream = new ReadableStream({ start(c) { c.enqueue(bytes); c.close(); } }).pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const CryptoHelper = {
  // Zuletzt abgeleiteter Schlüssel. PBKDF2 ist absichtlich langsam; so wird er pro Sync nicht doppelt berechnet.
  _keyCache: null, // { password, salt (base64), iterations, key }

  async _deriveKey(password, saltB64, iterations) {
    const c = this._keyCache;
    if (c && c.password === password && c.salt === saltB64 && c.iterations === iterations) return c.key;
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: base64ToBytes(saltB64), iterations, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    this._keyCache = { password, salt: saltB64, iterations, key };
    return key;
  },

  /**
   * Verschlüsselt (v2). Liefert die Felder für das Firestore-Dokument (ohne lastModified).
   * @returns {Promise<{format, encryptedData, salt, iv, iterations, compression}>}
   */
  async encryptPayload(dataText, password) {
    if (!password) throw new Error('Kein Master-Passwort angegeben.');

    // Salz des zuletzt verwendeten Schlüssels weiterverwenden (spart eine Ableitung); der IV ist immer neu.
    const c = this._keyCache;
    const salt = (c && c.password === password && c.iterations === PBKDF2_ITERATIONS)
      ? c.salt : bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
    const key = await this._deriveKey(password, salt, PBKDF2_ITERATIONS);

    let plain = new TextEncoder().encode(dataText);
    // Ältere Browser ohne CompressionStream schreiben unkomprimiert (dann greift eher das Größenlimit).
    const compression = typeof CompressionStream !== 'undefined' ? 'gzip' : 'none';
    if (compression === 'gzip') plain = await pipeBytes(plain, new CompressionStream('gzip'));

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
    return {
      format: CLOUD_FORMAT,
      encryptedData: bytesToBase64(cipher),
      salt,
      iv: bytesToBase64(iv),
      iterations: PBKDF2_ITERATIONS,
      compression,
    };
  },

  /**
   * Entschlüsselt ein Cloud-Dokument (v1 oder v2).
   * @throws {UnsupportedFormatError} bei unbekanntem Format
   * @throws {Error} bei falschem Passwort oder beschädigten Daten
   */
  async decryptPayload(payload, password) {
    if (!password) throw new Error('Kein Master-Passwort angegeben.');
    const format = payload.format === undefined ? 1 : payload.format;
    if (format === 1) return this.decryptLegacy(payload.encryptedData, password);
    if (format !== 2) throw new UnsupportedFormatError(format);

    let plain;
    try {
      const key = await this._deriveKey(password, payload.salt, payload.iterations);
      plain = new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(payload.iv) }, key, base64ToBytes(payload.encryptedData)));
    } catch (e) {
      throw new Error('Entschlüsselung fehlgeschlagen. Überprüfe dein Master-Passwort.');
    }
    if (payload.compression === 'gzip') {
      if (typeof DecompressionStream === 'undefined') {
        throw new UnsupportedFormatError('2/gzip – dieser Browser kann nicht entpacken');
      }
      plain = await pipeBytes(plain, new DecompressionStream('gzip'));
    }
    return new TextDecoder().decode(plain);
  },

  /**
   * Altes Format v1 (CryptoJS). Wird nur noch in Tests zum Nachstellen alter Geräte verwendet.
   */
  encryptLegacy(dataText, password) {
    if (!password) throw new Error('Kein Master-Passwort angegeben.');
    const packet = { data: dataText, check: 'LEHRER_APP_VALID_E2EE', timestamp: Date.now() };
    return CryptoJS.AES.encrypt(JSON.stringify(packet), password).toString();
  },

  decryptLegacy(cipherText, password) {
    try {
      const decryptedString = CryptoJS.AES.decrypt(cipherText, password).toString(CryptoJS.enc.Utf8);
      if (!decryptedString) throw new Error('leer');
      const packet = JSON.parse(decryptedString);
      if (packet.check !== 'LEHRER_APP_VALID_E2EE') throw new Error('Prüfwert falsch');
      return packet.data;
    } catch (error) {
      throw new Error('Entschlüsselung fehlgeschlagen. Überprüfe dein Master-Passwort.');
    }
  }
};

/**
 * Hilfsobjekt für Ende-zu-Ende-Verschlüsselung (E2EE) im Frontend
 */
const CryptoHelper = {
  /**
   * Verschlüsselt einen String mit einem Passwort.
   * Verpackt die Daten in ein Verifizierungsobjekt, um später das Passwort prüfen zu können.
   * @param {string} dataText - Die zu verschlüsselnden JSON-Daten als String.
   * @param {string} password - Das Master-Passwort.
   * @returns {string} Der verschlüsselte Base64-String.
   */
  encrypt(dataText, password) {
    if (!password) {
      throw new Error('Kein Master-Passwort angegeben.');
    }
    
    const packet = {
      data: dataText,
      check: 'LEHRER_APP_VALID_E2EE',
      timestamp: Date.now()
    };
    
    const packetString = JSON.stringify(packet);
    const encrypted = CryptoJS.AES.encrypt(packetString, password).toString();
    return encrypted;
  },

  /**
   * Entschlüsselt einen String mit einem Passwort.
   * Überprüft das Verifizierungsobjekt auf Korrektheit des Passworts.
   * @param {string} cipherText - Der verschlüsselte String.
   * @param {string} password - Das Master-Passwort.
   * @returns {string} Der entschlüsselte Original-String.
   * @throws {Error} Wenn das Passwort falsch ist oder die Entschlüsselung fehlschlägt.
   */
  decrypt(cipherText, password) {
    if (!password) {
      throw new Error('Kein Master-Passwort angegeben.');
    }
    
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, password);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Falsches Passwort oder beschädigte Daten.');
      }
      
      const packet = JSON.parse(decryptedString);
      if (packet.check !== 'LEHRER_APP_VALID_E2EE') {
        throw new Error('Ungültiger Entschlüsselungsschlüssel.');
      }
      
      return packet.data;
    } catch (error) {
      throw new Error('Entschlüsselung fehlgeschlagen. Überprüfe dein Master-Passwort.');
    }
  }
};

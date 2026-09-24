// Lokaler Dev-Server (server.js): liefert nur App-Dateien aus (BUGS G11).
const http = require('http');
const { createServer } = require('../server.js');

let server, port;
beforeAll(async () => {
  server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
afterAll(() => new Promise(resolve => server.close(resolve)));

// Roh-Anfrage, damit der Pfad nicht vorher normalisiert wird
function get(rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: rawPath, method: 'GET' }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
}

describe('Dev-Server', () => {
  it('liefert index.html und App-Dateien', async () => {
    expect(await get('/')).toBe(200);
    expect(await get('/app.js?v=1')).toBe(200);
    expect(await get('/lib/crypto-js.min.js')).toBe(200);
  });

  it('liefert nichts aus .git oder anderen versteckten Ordnern', async () => {
    expect(await get('/.git/config')).toBe(403);
    expect(await get('/.git/HEAD')).toBe(403);
    expect(await get('/%2egit/config')).toBe(403);
  });

  it('kommt nicht aus dem Projektordner heraus', async () => {
    expect(await get('/../package.json')).toBe(403);
    expect(await get('/%2e%2e/%2e%2e/etc/passwd')).toBe(403);
    expect(await get('/..%2f..%2fetc%2fpasswd')).toBe(403);
  });

  it('auch nicht über einen Nachbarordner mit gleichem Namensanfang', async () => {
    const name = require('path').basename(require('path').join(__dirname, '..'));
    expect(await get(`/../${name}-kopie/x.js`)).toBe(403);
  });

  it('unbekannte Datei → 404', async () => {
    expect(await get('/gibtsnicht.js')).toBe(404);
  });
});

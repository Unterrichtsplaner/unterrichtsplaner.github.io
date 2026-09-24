const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Liefert nur Dateien innerhalb des Projektordners aus, keine versteckten (.git, .claude …).
function resolveSafePath(url) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(url.split('?')[0]);
  } catch (e) {
    return null;
  }
  if (urlPath.includes('\0')) return null;
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.resolve(ROOT, '.' + path.posix.normalize('/' + urlPath));
  const rel = path.relative(ROOT, filePath);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  // Rohpfad prüfen: normalize würde „/../x“ still zu „/x“ machen
  const segments = urlPath.split(/[\\/]/);
  if (segments.some(seg => seg.startsWith('.'))) return null;
  return filePath;
}

function createServer() {
  return http.createServer((req, res) => {
    const filePath = resolveSafePath(req.url);
    if (!filePath) {
      res.statusCode = 403;
      res.end('Access Denied');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT' || err.code === 'EISDIR') {
          res.statusCode = 404;
          res.end('Seite nicht gefunden');
        } else {
          res.statusCode = 500;
          res.end(`Interner Fehler: ${err.code}`);
        }
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, private' // Caching verhindern für Dev-Mode
        });
        res.end(content, 'utf-8');
      }
    });
  });
}

module.exports = { createServer };

// Nur beim Start per `npm run serve`, nicht wenn ein Test die Datei lädt
if (require.main === module) {
  const server = createServer();

  server.listen(PORT, () => {
    console.log('\n==================================================');
    console.log(`  Lehrer-App läuft auf: http://localhost:${PORT}`);
    console.log('  Beenden mit: STRG + C');
    console.log('==================================================\n');
  });
}

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

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

const server = http.createServer((req, res) => {
  // Verhindere URL-Manipulation für Sicherheit
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/') safeUrl = '/index.html';
  
  const filePath = path.join(__dirname, safeUrl);
  
  // Sicherheit: Verhindere Zugriff außerhalb des aktuellen Ordners
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Access Denied');
    return;
  }
  
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
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

server.listen(PORT, () => {
  console.log('\n==================================================');
  console.log(`  Lehrer-App läuft auf: http://localhost:${PORT}`);
  console.log('  Beenden mit: STRG + C');
  console.log('==================================================\n');
});

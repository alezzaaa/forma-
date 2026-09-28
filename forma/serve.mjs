/** Serve the prebuilt app. No npm dependencies or external services required. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.env.GET_DRESSD_PORT || process.env.FORMA_PORT || 4173);
const host = '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json; charset=utf-8' };
try { await stat(resolve(root, 'index.html')); }
catch { console.error('Build non trovata. Esegui npm install e npm run build, poi riprova.'); process.exit(1); }
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('GET_DRESSD_PORT deve essere un numero tra 1024 e 65535.');
  process.exit(1);
}
const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  let filename;
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', `http://${host}:${port}`).pathname);
    filename = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filename.startsWith(root + sep)) throw new Error('Invalid path');
  } catch { res.writeHead(400); res.end('Richiesta non valida'); return; }
  try {
    const content = await readFile(filename);
    res.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('File non trovato'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `La porta ${port} è occupata. Se GET DRESSD è già aperta, visita http://${host}:${port}. Altrimenti chiudi il programma che la usa.` : error.message);
  process.exit(1);
});
server.listen(port, host, () => {
  const url = `http://${host}:${port}`;
  console.log(`\n  GET DRESSD — Il tuo stile, ogni giorno.\n\n  Apri ${url}\n  Lascia questa finestra aperta. Ctrl+C per chiudere.\n`);
  if (process.argv.includes('--no-open')) return;
  const command = process.platform === 'darwin' ? ['open', [url]] : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  try { const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' }); child.on('error', () => {}); child.unref(); } catch { /* The printed URL is always available. */ }
});
process.on('SIGINT', () => server.close(() => process.exit(0)));

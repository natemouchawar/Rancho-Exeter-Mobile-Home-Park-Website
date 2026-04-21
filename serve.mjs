import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// ─── Minimal .env loader (so local dev can read MAILERLITE_API_KEY etc) ───
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
  console.log('[serve] loaded .env');
}

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// Map URL paths (e.g. /api/subscribe) to handler modules (api/subscribe.mjs).
// Same handler file Vercel runs in production — no drift.
const API_ROUTES = {
  '/api/subscribe': path.join(__dirname, 'api', 'subscribe.mjs'),
};

async function invokeApiHandler(handlerPath, req, res) {
  try {
    const mod = await import(pathToFileURL(handlerPath).href);
    const handler = mod.default || mod.handler;
    if (typeof handler !== 'function') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Handler export missing.' }));
      return;
    }
    await handler(req, res);
  } catch (err) {
    console.error('[serve] api handler error', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    if (!res.writableEnded) {
      res.end(JSON.stringify({ ok: false, error: 'Internal server error.' }));
    }
  }
}

function tryServeStatic(urlPath, res) {
  const filePath = path.join(__dirname, urlPath);
  // Guard against path traversal escaping the project root.
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return true;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
  return true;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // API routes
  if (API_ROUTES[urlPath]) {
    invokeApiHandler(API_ROUTES[urlPath], req, res);
    return;
  }

  // Root → index.html
  if (urlPath === '/') {
    tryServeStatic('/index.html', res);
    return;
  }

  // Direct static file hit
  if (tryServeStatic(urlPath, res)) return;

  // Clean-URL fallback: /join → /join.html (mirrors Vercel cleanUrls behavior)
  if (!path.extname(urlPath) && tryServeStatic(urlPath + '.html', res)) return;

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

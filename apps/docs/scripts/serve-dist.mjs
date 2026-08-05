#!/usr/bin/env node
/** Minimal static file server for previewing the production build locally, with SPA fallback to index.html. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../dist/docs/browser');
const PORT = Number(process.env.PORT ?? 4300);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function resolveFile(urlPath) {
  const candidate = path.join(ROOT, decodeURIComponent(urlPath.split('?')[0]));
  try {
    const stats = await stat(candidate);
    if (stats.isFile()) return candidate;
  } catch {
    // fall through to SPA fallback
  }
  return path.join(ROOT, 'index.html');
}

const server = createServer(async (req, res) => {
  const filePath = await resolveFile(req.url ?? '/');
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found. Did you run `pnpm run build` first?');
  }
});

server.listen(PORT, () => {
  console.log(`[serve-dist] Serving apps/docs/dist/docs/browser at http://localhost:${PORT}`);
});

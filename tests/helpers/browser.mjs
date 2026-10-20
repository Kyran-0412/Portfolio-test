// Shared setup for browser tests: a small static server for the repo and Chromium.
// Google Fonts are blocked (no network needed); installed fonts are used instead.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch {
  playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright'));
}

const root = new URL('../..', import.meta.url).pathname;
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.png': 'image/png',
};

export async function start() {
  const server = createServer(async (req, res) => {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!path.startsWith(root)) return res.writeHead(403).end();
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  }).listen(0);
  await new Promise((r) => server.once('listening', r));

  const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Failed downloads (fonts offline, a deliberately bad link) are not page bugs.
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.route(/fonts\.(googleapis|gstatic)\.com|\.invalid\//, (r) => r.abort());

  return {
    base: `http://localhost:${server.address().port}`,
    page,
    errors,
    close: async () => { await browser.close(); server.close(); },
  };
}

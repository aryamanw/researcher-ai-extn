import { chromium } from 'playwright';
import { mkdirSync, createReadStream, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

// Chromium blocks ES module imports (`<script type="module">`) on file:// pages
// via CORS, so the harness must be served over http:// instead.
const MIME_TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serveRepoRoot() {
  const server = createServer((req, res) => {
    const filePath = path.join(repoRoot, decodeURIComponent(req.url.split('?')[0]));
    if (!filePath.startsWith(repoRoot) || !existsSync(filePath)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  mkdirSync('store-assets', { recursive: true });
  const server = await serveRepoRoot();
  const { port } = server.address();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`http://127.0.0.1:${port}/scripts/screenshots/sidepanel-harness.html`);
  await page.waitForSelector('#results .result');
  await page.screenshot({ path: 'store-assets/screenshot-sidepanel.png' });

  await page.goto(`http://127.0.0.1:${port}/scripts/screenshots/options-harness.html`);
  await page.waitForSelector('#frame select[name="provider"]');
  await page.screenshot({ path: 'store-assets/screenshot-options.png' });

  await browser.close();
  server.close();
}

main();

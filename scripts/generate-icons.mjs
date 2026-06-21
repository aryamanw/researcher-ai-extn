import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SIZES = [16, 48, 128];

function iconHtml(size) {
  const radius = Math.round(size * 0.1875);
  const fontSize = Math.round(size * 0.59375);
  return `<!DOCTYPE html><html><head><style>
    html, body { margin: 0; padding: 0; }
    .icon {
      width: ${size}px;
      height: ${size}px;
      background: oklch(25% 0.01 250);
      border-radius: ${radius}px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon span {
      font-family: -apple-system, "Segoe UI", Roboto, system-ui, sans-serif;
      font-weight: 700;
      font-size: ${fontSize}px;
      line-height: 1;
      color: oklch(98% 0.005 250);
    }
  </style></head><body><div class="icon"><span>R</span></div></body></html>`;
}

async function main() {
  mkdirSync('icons', { recursive: true });
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(iconHtml(size));
    await page.screenshot({ path: `icons/icon${size}.png`, omitBackground: false });
    await page.close();
  }
  await browser.close();
}

main();

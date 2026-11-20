import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173/docs/';
const output = path.join(os.tmpdir(), 'research-companion-landing-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const readState = page => page.locator('[data-reading-text]').evaluateAll(nodes =>
  nodes.map(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      text: node.textContent,
      x: Math.round(rect.x + scrollX), y: Math.round(rect.y + scrollY),
      opacity: style.opacity, filter: style.filter,
    };
  })
);

try {
  for (const width of [320, 390, 768, 1280, 1440, 1920]) {
    console.log(`Checking landing at ${width}px`);
    const context = await browser.newContext({
      viewport: { width, height: width === 1280 ? 800 : width >= 1440 ? 900 : 844 },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.hero-copy').count(), 1, 'Missing readable hero');
    assert.equal(await page.locator('.lamp-text').count(), 0, 'Old prose overlay remains');
    assert.equal(await page.locator('[data-result]').count(), 2);
    assert.equal(await page.locator('[data-example-label]').isVisible(), true);
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth + 1), true, `Overflow: ${width}`);
    const copy = await page.locator('.hero-copy').boundingBox();
    const demo = await page.locator('#demo').boundingBox();
    assert.ok(copy && demo);
    assert.ok(copy.x + copy.width <= demo.x + 1 || copy.y + copy.height <= demo.y + 1,
      'Marketing copy overlaps the demo');
    if (width >= 1280) {
      assert.equal(await page.locator('h1, .hero-copy .actions, [data-result]').evaluateAll(nodes =>
        [nodes[0], nodes[1], nodes[2]].every(node => {
          const rect = node.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= innerHeight;
        })), true, 'Headline, actions, and first result must fit in the first screen');
    }
    for (const link of await page.locator('.demo-source a, [data-result] a').all()) {
      assert.ok((await link.boundingBox()).height >= 44, 'Demo links need 44px touch targets');
    }
    await page.locator('#demo').scrollIntoViewIfNeeded();
    const before = await readState(page);
    assert.ok(before.length >= 4, 'Missing reading-text hooks');
    for (const item of before) {
      assert.equal(item.opacity, '1');
      assert.equal(item.filter, 'none');
    }
    await page.mouse.move(10, 10);
    const headline = await page.locator('h1').boundingBox();
    if (headline && headline.y >= 0) {
      await page.mouse.move(headline.x + headline.width / 2, headline.y + 10);
    }
    assert.deepEqual(await readState(page), before, 'Pointer movement changes reading');
    const play = page.locator('[data-demo-play]');
    assert.equal(await play.isVisible(), true, 'GSAP failed to load; motion QA is blocked');
    await play.click();
    await page.waitForFunction(() => document.querySelector('#demo').dataset.playing === 'true');
    assert.equal(await play.getAttribute('aria-disabled'), 'true');
    assert.deepEqual(await readState(page), before, 'Replay moves or fades reading text');
    try {
      await page.waitForFunction(() => document.querySelector('#demo').dataset.playing === 'false');
    } catch (error) {
      console.error('Replay diagnostic', await page.evaluate(() => ({
        visibility: document.visibilityState,
        playing: document.querySelector('#demo').dataset.playing,
        ticker: window.gsap.ticker.time,
        timelines: window.gsap.globalTimeline.getChildren().map(animation => ({
          time: animation.time(), duration: animation.duration(), paused: animation.paused(),
        })),
      })));
      throw error;
    }
    assert.deepEqual(await readState(page), before);
    await play.click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('[data-demo-play]').hidden);
    assert.deepEqual(await readState(page), before, 'Reduced motion loses the resting view');
    assert.equal(await page.locator('#demo').getAttribute('data-playing'), 'false');
    assert.equal(await page.locator('#demo').evaluate(node => node === document.activeElement),
      true, 'Hiding the focused replay control must preserve focus in the demo');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('[data-demo-play]').hidden);
    // Capture a resting initial view, without full-page fixed-position artifacts.
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    await page.screenshot({ path: path.join(output, `landing-${width}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
  }

  for (const mode of ['no-js', 'no-gsap']) {
    const context = await browser.newContext({
      javaScriptEnabled: mode !== 'no-js', viewport: { width: 390, height: 844 },
    });
    if (mode === 'no-gsap') {
      await context.route('https://cdnjs.cloudflare.com/**', route => route.abort());
    }
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').isVisible(), true);
    for (const result of await page.locator('[data-result] a').all()) {
      assert.equal(await result.isVisible(), true);
      assert.match(await result.getAttribute('href'), /^https:\/\//);
    }
    assert.equal(await page.locator('[data-demo-play]').isVisible(), false);
    await page.locator('#install').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#install').isVisible(), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(`Landing regressions passed. Review screenshots in ${output}`);
} finally {
  await browser.close();
}

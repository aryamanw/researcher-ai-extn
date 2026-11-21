import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173/docs/';
const output = path.join(os.tmpdir(), 'research-companion-landing-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const idle = page => page.waitForFunction(() => document.querySelector('#demo').dataset.playing === 'false');
const reading = page => page.locator('#demo [data-reading-text]').evaluateAll(nodes => nodes.map(node => {
  const rect = node.getBoundingClientRect();
  const css = getComputedStyle(node);
  return { text: node.textContent, x: Math.round(rect.x + scrollX), y: Math.round(rect.y + scrollY), opacity: css.opacity, filter: css.filter };
}));

try {
  const mobile = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const offscreen = await mobile.newPage();
  await offscreen.goto(base, { waitUntil: 'networkidle' });
  await offscreen.evaluate(() => {
    const root = document.querySelector('#demo');
    window.scrollTo({ top: root.offsetTop + root.offsetHeight - 8, behavior: 'instant' });
  });
  const start = await offscreen.evaluate(() => performance.now());
  await offscreen.waitForFunction(time => performance.now() - time > 2300, start);
  assert.equal(await offscreen.locator('[data-flow-track]').evaluate(node => node.getBoundingClientRect().bottom < 0), true);
  assert.equal(await offscreen.locator('#demo').getAttribute('data-autoplay'), 'pending', 'Autoplay must wait until its connection track is on screen');
  await offscreen.locator('[data-demo-navigation]').scrollIntoViewIfNeeded();
  await offscreen.waitForFunction(() => document.querySelector('#demo').dataset.playing === 'true');
  // Simulate the external visibility signal while exercising the real page handler.
  await offscreen.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await offscreen.locator('#demo').getAttribute('data-phase'), '2');
  assert.doesNotMatch(await offscreen.locator('[data-demo-status]').textContent(), /playing/i);
  await mobile.close();
  console.log('Autoplay visibility and background interruption passed');

  // A visible autoplay must work without any third-party animation request.
  const first = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await first.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const initial = await first.newPage();
  await initial.goto(base, { waitUntil: 'networkidle' });
  assert.ok(await initial.evaluate(() => Boolean(window.gsap)), 'Landing motion must load from its own origin');
  await initial.waitForFunction(() => {
    const signal = document.querySelector('[data-flow-signal]');
    return signal && getComputedStyle(signal).opacity === '1' && new DOMMatrixReadOnly(getComputedStyle(signal).transform).m41 > 20;
  });
  const signalX = await initial.locator('[data-flow-signal]').evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
  assert.equal(await initial.locator('[data-flow-signal]').evaluate(node => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth && Boolean(hit?.closest('.demo-flow'));
  }), true, 'The moving signal must be on screen and clear of opaque reading panes');
  await initial.waitForFunction(x => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-flow-signal]')).transform).m41 > x + 25, signalX);
  await idle(initial);
  assert.equal(await initial.locator('#demo').getAttribute('data-autoplay'), 'complete', 'The demo must play without a click');
  await first.close();
  console.log('Visible, first-party autoplay passed');

  for (const width of [320, 390, 768, 1280, 1440, 1920]) {
    console.log(`Checking interactions at ${width}px`);
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 800 : width >= 1440 ? 900 : 844 }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'complete');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Overflow: ${width}`);
    if (width >= 1280) {
      assert.equal(await page.locator('h1, .hero-copy .actions, [data-result]').evaluateAll(nodes => [nodes[0], nodes[1], nodes[2]].every(node => {
        const rect = node.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight;
      })), true, 'Headline, actions and first result must fit in the first screen');
    }
    await page.locator('[data-demo-navigation]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#demo').dataset.autoplay === 'complete');
    await idle(page);
    assert.doesNotMatch(await page.locator('[data-demo-status]').textContent(), /playing/i);
    const before = await reading(page);
    for (const text of before) { assert.equal(text.opacity, '1'); assert.equal(text.filter, 'none'); }
    await page.locator('[data-demo-play]').click();
    assert.equal(await page.locator('#demo').getAttribute('data-playing'), 'true');
    assert.deepEqual(await reading(page), before, 'Replay must keep reading text stationary and opaque');
    await page.locator('[data-demo-step="1"]').click();
    assert.equal(await page.locator('#demo').getAttribute('data-phase'), '1');
    assert.equal(await page.locator('[data-demo-step="1"]').getAttribute('aria-pressed'), 'true');
    await idle(page);
    await page.locator('[data-demo-step="2"]').click();
    assert.equal(await page.locator('#demo').getAttribute('data-phase'), '2');
    assert.deepEqual(await reading(page), before);

    await page.locator('[data-example="climate"]').click();
    assert.equal(await page.locator('[data-source-link]').getAttribute('href'), 'https://science.nasa.gov/climate-change/evidence/');
    assert.equal(await page.locator('[data-example="climate"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-demo-step="2"]').click();
    await idle(page);
    await page.locator('[data-example="space"]').click();
    assert.equal(await page.locator('[data-source-link]').getAttribute('href'), 'https://science.nasa.gov/exoplanets/');
    assert.equal(await page.locator('[data-result] a').first().getAttribute('href'), 'https://exoplanetarchive.ipac.caltech.edu/');
    await page.locator('[data-demo-step="2"]').click();
    await idle(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

    await page.locator('[data-demo-play]').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#demo').dataset.motion === 'off');
    await idle(page);
    await page.locator('[data-example="ai"]').click();
    assert.equal(await page.locator('#demo').getAttribute('data-playing'), 'false');
    const reduced = await reading(page);
    await page.mouse.move(15, 15);
    assert.deepEqual(await reading(page), reduced);
    await page.locator('[data-motion-toggle]').click();
    assert.equal(await page.locator('[data-motion-toggle]').getAttribute('aria-pressed'), 'true', 'Explicit motion opt-in must work when the OS reduces motion');
    await page.locator('[data-motion-toggle]').click();
    assert.equal(await page.locator('#demo').getAttribute('data-motion'), 'off');
    await idle(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => document.querySelector('#demo').dataset.motion === 'on');
    await page.locator('[data-motion-toggle]').click();
    for (const selector of ['.hero-copy .button-primary', '[data-demo-play]', '[data-example="ai"]']) {
      const control = page.locator(selector);
      await control.hover();
      assert.equal(await control.evaluate(node => getComputedStyle(node).transform), 'none', 'Motion off must also stop hover movement');
    }
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    for (const control of await page.locator('#demo button, .demo-source a, [data-result] a').all()) {
      assert.ok((await control.boundingBox()).height >= 44, 'Demo controls need 44px touch targets');
    }
    await page.locator('[data-provider="openai"]').click();
    assert.match(await page.locator('[data-provider-note]').textContent(), /OpenAI/);
    assert.equal(await page.locator('[data-provider="openai"]').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-scroll-progress]')).transform).a > .95);
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: path.join(output, `landing-${width}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
  }

  for (const mode of ['no-js', 'no-gsap']) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', viewport: { width: 390, height: 844 } });
    if (mode === 'no-gsap') await context.route('**/vendor/gsap.min.js*', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').isVisible(), true);
    assert.equal(await page.locator('[data-result] a').count(), 2);
    assert.equal(await page.locator('[data-example-label]').isVisible(), true);
    if (mode === 'no-gsap') {
      await page.locator('[data-example="space"]').click();
      assert.equal(await page.locator('[data-source-link]').getAttribute('href'), 'https://science.nasa.gov/exoplanets/');
      await page.locator('[data-demo-step="1"]').click();
      assert.equal(await page.locator('#demo').getAttribute('data-phase'), '1');
      await page.locator('[data-provider="anthropic"]').click();
      assert.match(await page.locator('[data-provider-note]').textContent(), /Anthropic/);
    }
    await page.locator('#install').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#install').isVisible(), true);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(`Landing autoplay, interaction, accessibility and fallback checks passed. Screenshots: ${output}`);
} finally { await browser.close(); }

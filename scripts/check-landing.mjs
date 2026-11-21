import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://127.0.0.1:4173/docs/';
const output = path.join(os.tmpdir(), 'research-companion-landing-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const fillScale = page => page.locator('[data-flow-fill]').evaluate(node => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
const readState = page => page.locator('#demo [data-reading-text]').evaluateAll(nodes => nodes.map(node => {
  const r = node.getBoundingClientRect(), css = getComputedStyle(node);
  return { text: node.textContent, x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), opacity: css.opacity, filter: css.filter };
}));
const scrollTo = async (page, top) => {
  await page.evaluate(value => window.scrollTo({ top: Math.max(0, value), behavior: 'instant' }), top);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.waitForFunction(() => !window.ScrollTrigger?.getAll().some(trigger => trigger.getTween()?.isActive()));
};

try {
  for (const width of [320, 390, 768, 1280, 1440, 1920]) {
    console.log(`Checking scroll motion at ${width}px`);
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 800 : width >= 1440 ? 900 : 844 }, reducedMotion: 'no-preference' });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.getByRole('button', { name: /replay|play demo/i }).count(), 0, 'There must be no replay/player control');
    assert.ok(await page.evaluate(() => Boolean(window.gsap && window.ScrollTrigger)), 'Scroll motion must load from this site');
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'complete');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.equal(await page.locator('.install-steps').evaluate(list => list.lastElementChild.getBoundingClientRect().bottom <= list.nextElementSibling.getBoundingClientRect().top), true, 'Installation instructions must not overlap the following text');
    assert.equal(await page.locator('[data-section-rule]').evaluateAll(rules => rules.every(rule => rule.previousElementSibling.getBoundingClientRect().bottom <= rule.getBoundingClientRect().top)), true, 'Decorative rules must stay below heading text');
    if (width >= 1280) {
      assert.equal(await page.locator('h1, .hero-copy .actions, [data-result]').evaluateAll(nodes => [nodes[0], nodes[1], nodes[2]].every(node => {
        const r = node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
      })), true, 'Headline, actions and first result must fit the first screen');
    }
    const geometry = await page.locator('[data-flow-track]').evaluate(node => ({ top: node.getBoundingClientRect().top + scrollY, height: innerHeight }));
    const early = Math.max(0, geometry.top - geometry.height * .68);
    const late = Math.max(early + 100, geometry.top - geometry.height * .25);
    await scrollTo(page, early);
    const before = await readState(page), a = await fillScale(page);
    await scrollTo(page, late);
    await page.waitForFunction(value => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-flow-fill]')).transform).a > value + .2, a);
    const b = await fillScale(page);
    assert.ok(b > a + .2, 'Scrolling forward must advance the connection');
    assert.deepEqual(await readState(page), before, 'Scroll decoration must not move or fade demo reading text');
    await scrollTo(page, early);
    await page.waitForFunction(value => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-flow-fill]')).transform).a < value - .2, b);
    assert.ok(await fillScale(page) < b - .2, 'Scrolling back must reverse the connection');
    assert.equal(await page.locator('[data-demo-status]').textContent().then(text => /playing|replay/i.test(text)), false);

    await page.locator('[data-example="climate"]').click();
    assert.equal(await page.locator('[data-source-link]').getAttribute('href'), 'https://science.nasa.gov/climate-change/evidence/');
    await page.locator('[data-example="space"]').click();
    assert.equal(await page.locator('[data-result] a').first().getAttribute('href'), 'https://exoplanetarchive.ipac.caltech.edu/');

    const headingTop = await page.locator('#how-it-works h2').evaluate(node => node.getBoundingClientRect().top + scrollY - Number(window.gsap.getProperty(node, 'y')));
    await scrollTo(page, headingTop - geometry.height * .94);
    const startY = await page.locator('#how-it-works h2').evaluate(node => Number(window.gsap.getProperty(node, 'y')));
    await scrollTo(page, headingTop - geometry.height * .45);
    await page.waitForFunction(() => Number(window.gsap.getProperty(document.querySelector('#how-it-works h2'), 'y')) < 4);
    assert.ok(startY > 8, 'Section headings must visibly animate with scroll');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#demo').dataset.motion === 'off');
    assert.equal(await page.locator('#demo').getAttribute('data-phase'), '2');
    const reduced = await fillScale(page);
    await scrollTo(page, early);
    assert.equal(await fillScale(page), reduced, 'Reduced motion must leave a complete, stable example');
    await page.locator('[data-example="ai"]').click();
    assert.match(await page.locator('[data-source-link]').textContent(), /Annotated/);
    for (const control of await page.locator('#demo button, .demo-source a, [data-result] a').all()) assert.ok((await control.boundingBox()).height >= 44);
    await page.locator('[data-motion-toggle]').click();
    assert.equal(await page.locator('[data-motion-toggle]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-motion-toggle]').click();
    await page.locator('.hero-copy .button-primary').hover();
    assert.equal(await page.locator('.hero-copy .button-primary').evaluate(node => getComputedStyle(node).transform), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    await page.locator('[data-provider="openai"]').click();
    assert.match(await page.locator('[data-provider-note]').textContent(), /OpenAI/);
    await scrollTo(page, 0);
    await page.screenshot({ path: path.join(output, `landing-${width}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    await context.close();
  }

  for (const mode of ['no-js', 'no-gsap', 'no-scroll-plugin']) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', viewport: { width: 390, height: 844 } });
    if (mode === 'no-gsap') await context.route('**/vendor/gsap.min.js*', route => route.abort());
    if (mode === 'no-scroll-plugin') await context.route('**/vendor/ScrollTrigger.min.js*', route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('h1').isVisible(), true);
    assert.equal(await page.locator('[data-result] a').count(), 2);
    assert.equal(await page.getByRole('button', { name: /replay|play demo/i }).count(), 0);
    if (mode !== 'no-js') {
      await page.locator('[data-example="space"]').click();
      assert.equal(await page.locator('[data-source-link]').getAttribute('href'), 'https://science.nasa.gov/exoplanets/');
      await page.locator('[data-provider="gemini"]').click();
      assert.match(await page.locator('[data-provider-note]').textContent(), /Gemini/);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Scroll-driven motion, reverse scrolling, no-replay UI, interactions and fallbacks passed.');
} finally { await browser.close(); }

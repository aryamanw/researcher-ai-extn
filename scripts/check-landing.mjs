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
const readState = page => page.locator('.demo-source [data-reading-text]').evaluateAll(nodes => nodes.map(node => {
  const r = node.getBoundingClientRect(), surface = node.closest('.demo-source').getBoundingClientRect(), css = getComputedStyle(node);
  return { text: node.textContent, x: Math.round(r.x - surface.x), y: Math.round(r.y - surface.y), opacity: css.opacity, filter: css.filter };
}));
const scrollTo = async (page, top) => {
  await page.evaluate(value => window.scrollTo({ top: Math.max(0, value), behavior: 'instant' }), top);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.waitForFunction(() => !window.ScrollTrigger?.getAll().some(trigger => trigger.getTween()?.isActive()));
};

try {
  for (const width of [320, 390, 640, 768, 1100, 1280, 1440, 1920]) {
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
    assert.equal(await page.locator('.connection-field').count(), 1, 'The hero must contain the animated research composition');
    assert.equal(await page.locator('.paper-title').evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1)), true, 'Document lettering must fit its paper');
    const floatY = await page.locator('.field-origin').evaluate(node => Number(gsap.getProperty(node, 'y')));
    await page.waitForFunction(initial => Math.abs(Number(gsap.getProperty(document.querySelector('.field-origin'), 'y')) - initial) > 2, floatY);
    await scrollTo(page, 280);
    assert.ok(await page.locator('[data-field-space]').evaluate(node => Number(gsap.getProperty(node, 'y'))) < -5, 'The large hero composition must visibly respond to scrolling');
    await scrollTo(page, 0);
    if (width >= 1280) {
      const field = await page.locator('.connection-field').boundingBox();
      await page.mouse.move(field.x + field.width * .8, field.y + field.height * .35);
      await page.waitForFunction(() => Number(gsap.getProperty(document.querySelector('[data-field-space]'), 'rotationY')) > 1);
      await page.mouse.move(1, 1);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.equal(await page.locator('.install-steps').evaluate(list => list.lastElementChild.getBoundingClientRect().bottom <= list.nextElementSibling.getBoundingClientRect().top), true, 'Installation instructions must not overlap the following text');
    assert.equal(await page.locator('[data-section-rule]').evaluateAll(rules => rules.filter(rule => rule.getClientRects().length).every(rule => rule.previousElementSibling.getBoundingClientRect().bottom <= rule.getBoundingClientRect().top)), true, 'Decorative rules must stay below heading text');
    if (width >= 1280) {
      assert.equal(await page.locator('h1, .hero-copy .actions, .connection-field').evaluateAll(nodes => [nodes[0], nodes[1], nodes[2]].every(node => {
        const r = node.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
      })), true, 'Headline, actions and animated composition must fit the first screen');
    }
    const geometry = await page.evaluate(() => { const story = ScrollTrigger.getById('demo-scroll'); return { start: story.start, end: story.end, height: innerHeight }; });
    const early = geometry.start + (geometry.end - geometry.start) * .05;
    const late = geometry.start + (geometry.end - geometry.start) * .92;
    await scrollTo(page, early);
    const before = await readState(page), a = await fillScale(page);
    await scrollTo(page, late);
    await page.waitForFunction(value => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-flow-fill]')).transform).a > value + .2, a);
    const b = await fillScale(page);
    assert.ok(b > a + .2, 'Scrolling forward must advance the connection');
    assert.deepEqual(await readState(page), before, 'Scroll decoration must not move or fade demo reading text');
    if (width >= 1280) {
      assert.equal(await page.locator('.demo-results').evaluate(node => node.inert), false);
      const endTop = await page.locator('#demo').evaluate(node => node.getBoundingClientRect().top);
      await scrollTo(page, geometry.start + (geometry.end - geometry.start) * .7);
      assert.ok(Math.abs(await page.locator('#demo').evaluate(node => node.getBoundingClientRect().top) - endTop) < 2, 'The desktop demo must stay in view as the narrative advances');
      const link = page.locator('[data-result] a').first();
      await link.focus();
      await scrollTo(page, early);
      assert.equal(await link.evaluate(node => node === document.activeElement && getComputedStyle(node.closest('.demo-results')).opacity === '1'), true, 'Reversing the story must not hide a focused result');
      await page.locator('[data-example="ai"]').focus();
      assert.equal(await page.locator('.demo-results').evaluate(node => node.inert), true, 'Results must leave the tab order while their scroll reveal is hidden');
      await scrollTo(page, geometry.start + (geometry.end - geometry.start) * .281);
      assert.equal(await page.locator('.demo-results').evaluate(node => node.inert), true, 'Almost invisible result links must stay out of the tab order during the reveal');
      await scrollTo(page, geometry.start + (geometry.end - geometry.start) * .4);
      assert.equal(await page.locator('.demo-results').evaluate(node => getComputedStyle(node).opacity), '1', 'Reading surfaces must stay fully opaque during the entrance');
      assert.equal(await page.locator('.connection-sketch').evaluate(node => getComputedStyle(node).visibility), 'hidden', 'The decorative sketch must leave before source text enters');
    }
    await scrollTo(page, early);
    await page.waitForFunction(value => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-flow-fill]')).transform).a < value - .2, b);
    assert.ok(await fillScale(page) < b - .2, 'Scrolling back must reverse the connection');
    assert.equal(await page.locator('[data-demo-status]').textContent().then(text => /playing|replay/i.test(text)), false);

    await page.locator('[data-example="climate"]').click();
    assert.equal(await page.locator('[data-source-link]').getAttribute('href'), 'https://science.nasa.gov/climate-change/evidence/');
    await page.locator('[data-example="space"]').click();
    assert.equal(await page.locator('[data-result] a').first().getAttribute('href'), 'https://exoplanetarchive.ipac.caltech.edu/');

    const headingTop = await page.locator('#workflow-title').evaluate(node => node.getBoundingClientRect().top + scrollY - Number(window.gsap.getProperty(node, 'y')));
    await scrollTo(page, headingTop - geometry.height * .94);
    const startY = await page.locator('#workflow-title').evaluate(node => Number(window.gsap.getProperty(node, 'y')));
    await scrollTo(page, headingTop - geometry.height * .45);
    await page.waitForFunction(() => Number(window.gsap.getProperty(document.querySelector('#workflow-title'), 'y')) < 4);
    assert.ok(startY > 8, 'Section headings must visibly animate with scroll');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('#demo').dataset.motion === 'off');
    assert.equal(await page.locator('#demo').getAttribute('data-phase'), '2');
    assert.equal(await page.evaluate(() => ScrollTrigger.getAll().length), 0, 'Reduced motion must stop every owned scroll animation');
    const still = await page.locator('.field-origin').evaluate(node => getComputedStyle(node).transform);
    const reduced = await fillScale(page);
    await scrollTo(page, early);
    assert.equal(await fillScale(page), reduced, 'Reduced motion must leave a complete, stable example');
    assert.equal(await page.locator('.field-origin').evaluate(node => getComputedStyle(node).transform), still, 'The hero must stay still when motion is disabled');
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

  const resizeContext = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'no-preference' });
  const resizePage = await resizeContext.newPage();
  await resizePage.goto(base, { waitUntil: 'networkidle' });
  await resizePage.waitForFunction(() => document.documentElement.dataset.intro === 'complete');
  await resizePage.locator('[data-example="space"]').click();
  const triggerCount = await resizePage.evaluate(() => ScrollTrigger.getAll().length);
  for (const height of [740, 800, 600, 800]) {
    await resizePage.setViewportSize({ width: 1100, height });
    await resizePage.waitForFunction(height => getComputedStyle(document.querySelector('.demo-sticky')).position === (height >= 800 ? 'sticky' : 'static'), height);
    const range = await resizePage.evaluate(() => { const t = ScrollTrigger.getById('demo-scroll'); return { start: t.start, end: t.end }; });
    await scrollTo(resizePage, range.start + (range.end - range.start) * .8);
    if (height >= 800) assert.ok(await resizePage.locator('#demo').evaluate(node => node.getBoundingClientRect().bottom) <= height - 8, 'The longest example must fit inside the sticky viewport');
    else assert.equal(await resizePage.locator('.demo-results').evaluate(node => node.inert || getComputedStyle(node).visibility === 'hidden'), false, 'A short viewport must expose the static results');
    assert.equal(await resizePage.evaluate(() => ScrollTrigger.getAll().length), triggerCount, 'Responsive changes must not duplicate scroll triggers');
  }
  await resizeContext.close();

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

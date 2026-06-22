# Chrome Web Store Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Research Companion Chrome extension submittable to the Chrome Web Store as an **unlisted** item — icons, screenshots, privacy policy, listing copy, and a clean upload package.

**Architecture:** Generate visual assets (icons, screenshots) programmatically with Playwright (already present in `node_modules`, just needs to be a declared devDependency) by rendering small static HTML harnesses and screenshotting them — no design tool, no new heavyweight deps. Host the privacy policy as a static page via GitHub Pages on the existing `aryamanw/researcher-ai-extn` repo. Package the extension for upload with the system `zip` binary, explicitly listing included paths (no new dependency).

**Tech Stack:** Playwright (devDependency, screenshot-driven asset generation), Node `fs`/`zlib`-free PNG header parsing for tests, system `zip` CLI, GitHub Pages.

## Global Constraints

- Listing visibility: **Unlisted** (installable via direct link only, not searchable).
- Icons: generated programmatically, not supplied externally.
- Privacy policy: hosted on **GitHub Pages** off the existing repo.
- Screenshots: captured automatically via Playwright, sized exactly **1280×800** px (Chrome Web Store spec).
- No new runtime dependencies for the extension itself — all new tooling (Playwright, zip) is dev/build-only and must not ship inside the extension package.
- Match existing code style: ES modules, no semicolon-free style changes, existing test patterns in `tests/` (Vitest, `describe`/`it`).
- Don't touch unrelated files. Every change must trace to making the store submission possible.

---

## File Structure

- `manifest.json` — modify: add `icons` and `action.default_icon`.
- `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` — create: generated icon assets, committed to the repo (final assets, not throwaway build output).
- `scripts/generate-icons.mjs` — create: Playwright script that renders the icon mark at each required size and writes the PNGs above.
- `tests/icons.test.js` — create: verifies each PNG's pixel dimensions by reading its IHDR header bytes directly (no image library needed).
- `scripts/screenshots/sidepanel-harness.html` — create: static page that imports the real `renderResults`/`renderHistoryList` exports and renders them with fixed sample data, framed at 1280×800.
- `scripts/screenshots/options-harness.html` — create: static page that imports the real `renderSettingsToForm`/`syncKeyFieldVisibility` exports with fixed sample settings, framed at 1280×800.
- `scripts/capture-screenshots.mjs` — create: Playwright script that opens both harnesses and saves `store-assets/screenshot-sidepanel.png` and `store-assets/screenshot-options.png`.
- `tests/store-assets.test.js` — create: verifies both screenshot PNGs are exactly 1280×800.
- `docs/privacy-policy.md` — create: the privacy policy content, written for GitHub Pages rendering.
- `docs/chrome-web-store-listing.md` — create: all the copy/text needed to fill in the Chrome Web Store developer dashboard by hand (single-purpose statement, descriptions, permission justifications, data-usage disclosures) — this is reference content, not code.
- `scripts/package-extension.sh` — create: builds `dist/content.bundled.js` then zips exactly the runtime files into `research-companion-v<version>.zip` at the repo root, excluding dev/test/doc files.
- `package.json` — modify: add `playwright` devDependency and `generate:icons`, `capture:screenshots`, `package` npm scripts.
- `README.md` — modify: add a short "Chrome Web Store packaging" section pointing at the new scripts and listing doc.

---

### Task 1: Install Playwright as a devDependency

**Files:**
- Modify: `package.json`
- Test: manual command check (no app test — this is tooling installation)

**Interfaces:**
- Produces: `playwright` import available to later tasks' `.mjs` scripts via `import { chromium } from 'playwright'`.

- [ ] **Step 1: Install the package and pin it in `package.json`**

```bash
npm install --save-dev playwright
```

Expected: `package.json` now lists `"playwright": "^1.61.0"` (or whatever version resolves) under `devDependencies`, and `package-lock.json` is updated.

- [ ] **Step 2: Download the Chromium browser binary Playwright needs**

```bash
npx playwright install chromium
```

Expected: command prints a download/already-installed confirmation, exits 0.

- [ ] **Step 3: Verify Playwright can launch and screenshot something**

```bash
node -e "
import('playwright').then(async ({ chromium }) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<body style=\"background:red\"></body>');
  await page.screenshot({ path: '/tmp/playwright-smoke.png' });
  await browser.close();
  console.log('ok');
});
"
```

Expected output: `ok`, and `/tmp/playwright-smoke.png` exists.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add playwright devDependency for asset generation"
```

---

### Task 2: Generate extension icons (16/48/128px)

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` (generated output, committed)
- Test: `tests/icons.test.js`

**Interfaces:**
- Consumes: `chromium` from `playwright` (Task 1).
- Produces: three PNG files at `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`, each square at its named size. Later tasks (Task 3 manifest wiring) reference these exact paths.

- [ ] **Step 1: Write the failing dimension test**

Create `tests/icons.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

function pngDimensions(path) {
  const buf = readFileSync(path);
  // PNG IHDR chunk: width is bytes 16-19, height is bytes 20-23, both big-endian.
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('extension icons', () => {
  it.each([16, 48, 128])('icons/icon%d.png is exactly %dx%d', (size) => {
    const { width, height } = pngDimensions(`icons/icon${size}.png`);
    expect(width).toBe(size);
    expect(height).toBe(size);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/icons.test.js`
Expected: FAIL — `ENOENT: no such file or directory, open 'icons/icon16.png'`

- [ ] **Step 3: Write the icon generator script**

Create `scripts/generate-icons.mjs`:

```js
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
```

- [ ] **Step 4: Add the npm script**

Modify `package.json` `scripts` block to add:

```json
"generate:icons": "node scripts/generate-icons.mjs"
```

- [ ] **Step 5: Run the generator**

Run: `npm run generate:icons`
Expected: no errors; `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` exist.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/icons.test.js`
Expected: PASS — all 3 cases green.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-icons.mjs icons/icon16.png icons/icon48.png icons/icon128.png tests/icons.test.js package.json
git commit -m "feat: generate extension icons programmatically"
```

---

### Task 3: Wire icons into the manifest

**Files:**
- Modify: `manifest.json`
- Test: `tests/manifestIcons.test.js`

**Interfaces:**
- Consumes: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` (Task 2).
- Produces: `manifest.json` with valid `icons` and `action.default_icon` fields — this is what the Chrome Web Store reviewer checks for first.

- [ ] **Step 1: Write the failing test**

Create `tests/manifestIcons.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import manifest from '../manifest.json' with { type: 'json' };

describe('manifest icons', () => {
  it('declares 16/48/128 icon paths', () => {
    expect(manifest.icons).toEqual({
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    });
  });

  it('declares the same icons on the toolbar action', () => {
    expect(manifest.action.default_icon).toEqual(manifest.icons);
  });

  it('every declared icon file exists on disk', () => {
    Object.values(manifest.icons).forEach((path) => {
      expect(existsSync(path)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/manifestIcons.test.js`
Expected: FAIL — `manifest.icons` is `undefined`.

- [ ] **Step 3: Update the manifest**

Modify `manifest.json` — add `icons` as a top-level key, and `default_icon` inside `action`:

```json
{
  "manifest_version": 3,
  "name": "Research Companion",
  "version": "0.1.0",
  "description": "Suggests similar webpages, reports, and articles to what you're currently reading.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "permissions": ["sidePanel", "scripting", "storage", "activeTab", "identity"],
  "host_permissions": [
    "https://api.anthropic.com/*",
    "https://api.openai.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://openrouter.ai/*",
    "https://api.search.brave.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Research Companion",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "options_page": "options/options.html"
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/manifestIcons.test.js`
Expected: PASS — all 3 cases green.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: all previously-passing test files still pass, plus the 2 new files.

- [ ] **Step 6: Commit**

```bash
git add manifest.json tests/manifestIcons.test.js
git commit -m "feat: wire generated icons into manifest"
```

---

### Task 4: Sidepanel screenshot harness and capture script

**Files:**
- Create: `scripts/screenshots/sidepanel-harness.html`
- Create: `scripts/capture-screenshots.mjs`
- Test: `tests/store-assets.test.js` (covers both screenshots; written once, extended in Task 5)

**Interfaces:**
- Consumes: `renderResults`, `renderHistoryList` exported from `sidepanel/sidepanelPage.js` (signatures: `renderResults(container, results, { provider, showProvider })`, `renderHistoryList(container, entries, onSelect)` — confirmed in that file).
- Produces: `store-assets/screenshot-sidepanel.png`, exactly 1280×800.

- [ ] **Step 1: Write the failing test (covers sidepanel screenshot only for now)**

Create `tests/store-assets.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

function pngDimensions(path) {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('chrome web store screenshots', () => {
  it('screenshot-sidepanel.png is exactly 1280x800', () => {
    const { width, height } = pngDimensions('store-assets/screenshot-sidepanel.png');
    expect(width).toBe(1280);
    expect(height).toBe(800);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/store-assets.test.js`
Expected: FAIL — `ENOENT` on `store-assets/screenshot-sidepanel.png`.

- [ ] **Step 3: Write the sidepanel harness page**

Create `scripts/screenshots/sidepanel-harness.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Research Companion</title>
  <link rel="stylesheet" href="../../src/styles/tokens.css" />
  <link rel="stylesheet" href="../../sidepanel/sidepanel.css" />
  <style>
    html, body {
      width: 1280px;
      height: 800px;
      margin: 0;
      background: oklch(94% 0.006 250);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #frame {
      width: 400px;
      height: 760px;
      background: var(--bg, #fff);
      overflow: auto;
      box-shadow: 0 0 0 1px oklch(85% 0.006 250);
    }
  </style>
</head>
<body>
  <div id="frame">
    <header class="panel-header">
      <h1>Research Companion</h1>
    </header>
    <main id="results" aria-live="polite"></main>
    <section class="history">
      <h2>History</h2>
      <ul id="history-list"></ul>
    </section>
  </div>

  <script type="module">
    import { renderResults, renderHistoryList } from '../../sidepanel/sidepanelPage.js';

    const sampleResults = [
      {
        title: 'The Hidden Cost of Notification Overload',
        url: 'https://example.com/notification-overload',
        snippet: 'A look at how constant interruptions reshape attention spans and what designers can do about it.',
        relevance: 'Covers the same attention-fragmentation research cited in the article you were reading.',
      },
      {
        title: 'Why Deep Work Is Getting Harder to Protect',
        url: 'https://example.com/deep-work-protect',
        snippet: 'Knowledge workers report shrinking blocks of uninterrupted focus time over the last decade.',
        relevance: 'Extends the productivity argument with longitudinal survey data.',
      },
      {
        title: 'A Short History of the Browser Tab',
        url: 'https://example.com/browser-tab-history',
        snippet: 'Tabs were meant to reduce window clutter — instead they became their own kind of clutter.',
        relevance: 'Related background on the UI pattern discussed in the source page.',
      },
    ];

    const sampleHistory = [
      { id: '1', sourcePage: { title: 'The Attention Economy, Revisited' } },
      { id: '2', sourcePage: { title: 'How Slack Changed Office Communication' } },
    ];

    renderResults(document.getElementById('results'), sampleResults, { provider: 'anthropic', showProvider: true });
    renderHistoryList(document.getElementById('history-list'), sampleHistory, () => {});
  </script>
</body>
</html>
```

- [ ] **Step 4: Write the capture script**

Create `scripts/capture-screenshots.mjs`:

```js
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  mkdirSync('store-assets', { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(`file://${path.join(__dirname, 'screenshots', 'sidepanel-harness.html')}`);
  await page.waitForSelector('#results .result');
  await page.screenshot({ path: 'store-assets/screenshot-sidepanel.png' });

  await browser.close();
}

main();
```

- [ ] **Step 5: Add the npm script**

Modify `package.json` `scripts` block to add:

```json
"capture:screenshots": "node scripts/capture-screenshots.mjs"
```

- [ ] **Step 6: Run the capture script and the test**

Run: `npm run capture:screenshots && npx vitest run tests/store-assets.test.js`
Expected: script exits 0, `store-assets/screenshot-sidepanel.png` exists, test PASSes.

- [ ] **Step 7: Commit**

```bash
git add scripts/screenshots/sidepanel-harness.html scripts/capture-screenshots.mjs tests/store-assets.test.js package.json
git commit -m "feat: capture side panel screenshot for store listing"
```

---

### Task 5: Options page screenshot harness

**Files:**
- Create: `scripts/screenshots/options-harness.html`
- Modify: `scripts/capture-screenshots.mjs`
- Modify: `tests/store-assets.test.js`

**Interfaces:**
- Consumes: `renderSettingsToForm(form, settings)`, `syncKeyFieldVisibility(form)` exported from `options/optionsPage.js` (confirmed field names: `provider`, `model`, `anthropicKey`, `openaiKey`, `geminiKey`, `braveSearchKey`, `resultsCount`).
- Produces: `store-assets/screenshot-options.png`, exactly 1280×800.

- [ ] **Step 1: Extend the test for the options screenshot**

Modify `tests/store-assets.test.js`, add a second case inside the existing `describe` block:

```js
  it('screenshot-options.png is exactly 1280x800', () => {
    const { width, height } = pngDimensions('store-assets/screenshot-options.png');
    expect(width).toBe(1280);
    expect(height).toBe(800);
  });
```

- [ ] **Step 2: Run test to verify the new case fails**

Run: `npx vitest run tests/store-assets.test.js`
Expected: 1 PASS (sidepanel, from Task 4) + 1 FAIL (`ENOENT` on `screenshot-options.png`).

- [ ] **Step 3: Write the options harness page**

Create `scripts/screenshots/options-harness.html` — reuses the real `options.html` markup so the field structure (`name="..."` attributes, `.key-field` wrappers) matches exactly what `optionsPage.js` expects:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Research Companion Settings</title>
  <link rel="stylesheet" href="../../src/styles/tokens.css" />
  <link rel="stylesheet" href="../../options/options.css" />
  <style>
    html, body {
      width: 1280px;
      height: 800px;
      margin: 0;
      background: oklch(94% 0.006 250);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      box-sizing: border-box;
      padding: 40px;
    }
    #frame {
      width: 640px;
      background: var(--bg, #fff);
      box-shadow: 0 0 0 1px oklch(85% 0.006 250);
      padding: 24px;
    }
  </style>
</head>
<body>
  <div id="frame">
    <header class="page-header">
      <h1>Research Companion Settings</h1>
    </header>
    <form id="settings-form">
      <label>
        LLM provider
        <select name="provider">
          <option value="">-- choose --</option>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="gemini">Gemini</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </label>
      <label>
        Model (optional, uses provider default if blank)
        <input type="text" name="model" />
      </label>
      <fieldset>
        <legend>Provider credentials</legend>
        <p class="field-hint">Stored only on this device. Never sent anywhere except the provider you select above.</p>
        <label class="key-field" data-provider="anthropic">
          Anthropic API key
          <div class="key-input-row">
            <input type="password" name="anthropicKey" />
            <button type="button" class="key-toggle" data-target="anthropicKey" data-label="Anthropic API key">Show</button>
          </div>
        </label>
        <label class="key-field" data-provider="openai">
          OpenAI API key
          <div class="key-input-row">
            <input type="password" name="openaiKey" />
            <button type="button" class="key-toggle" data-target="openaiKey" data-label="OpenAI API key">Show</button>
          </div>
        </label>
        <label class="key-field" data-provider="gemini">
          Gemini API key
          <div class="key-input-row">
            <input type="password" name="geminiKey" />
            <button type="button" class="key-toggle" data-target="geminiKey" data-label="Gemini API key">Show</button>
          </div>
        </label>
        <div class="key-field" data-provider="openrouter">
          <p class="field-hint">OpenRouter uses sign-in, not a pasted key.</p>
          <div class="openrouter-row">
            <button type="button" id="connect-openrouter" class="button-primary">Connect to OpenRouter</button>
            <span id="openrouter-status"></span>
          </div>
        </div>
      </fieldset>
      <label>
        Brave Search API key
        <div class="key-input-row">
          <input type="password" name="braveSearchKey" />
          <button type="button" class="key-toggle" data-target="braveSearchKey" data-label="Brave Search API key">Show</button>
        </div>
      </label>
      <label>
        Number of results
        <input type="number" name="resultsCount" min="1" max="20" />
      </label>
    </form>
  </div>

  <script type="module">
    import { renderSettingsToForm, syncKeyFieldVisibility } from '../../options/optionsPage.js';

    const sampleSettings = {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      apiKeys: {
        anthropic: 'sk-ant-sample0000000000000000000',
        openai: '',
        gemini: '',
      },
      braveSearchKey: 'BSA-sample0000000000000000000',
      resultsCount: 8,
    };

    const form = document.getElementById('settings-form');
    renderSettingsToForm(form, sampleSettings);
    syncKeyFieldVisibility(form);
  </script>
</body>
</html>
```

- [ ] **Step 4: Extend the capture script**

Modify `scripts/capture-screenshots.mjs` — add a second capture in `main()`, before `await browser.close();`:

```js
  await page.goto(`file://${path.join(__dirname, 'screenshots', 'options-harness.html')}`);
  await page.waitForSelector('#frame select[name="provider"]');
  await page.screenshot({ path: 'store-assets/screenshot-options.png' });
```

- [ ] **Step 5: Run the capture script and the full test file**

Run: `npm run capture:screenshots && npx vitest run tests/store-assets.test.js`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/screenshots/options-harness.html scripts/capture-screenshots.mjs tests/store-assets.test.js
git commit -m "feat: capture settings page screenshot for store listing"
```

---

### Task 6: Privacy policy page (GitHub Pages)

**Files:**
- Create: `docs/privacy-policy.md`
- Modify: `README.md`

**Interfaces:**
- Produces: a privacy policy at a stable URL (`https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html` once Pages is enabled) — Task 8's listing doc references this exact URL.

- [ ] **Step 1: Write the privacy policy content**

Create `docs/privacy-policy.md`:

```markdown
# Privacy Policy — Research Companion

**Last updated: 2026-06-21**

Research Companion is a Chrome extension that finds webpages, reports, and articles related to the page you are currently reading. This policy explains what data the extension touches and where it goes.

## What the extension reads

When you click the toolbar icon, the extension reads the visible article text of the **current tab only**. It does not run in the background and does not read any other tab. It never reads pages you have not explicitly clicked the icon on.

## Where your data goes

- **Page content** you analyze is sent to the LLM provider you configured (Anthropic, OpenAI, Google Gemini, or OpenRouter) to generate search queries and relevance notes, and to Brave Search to find related pages. It is sent directly from your browser to that provider's API — it does not pass through any server operated by the developer of this extension.
- **API keys / OAuth tokens** you enter or connect in Settings are stored only in `chrome.storage.local` on your device. They are never transmitted anywhere except as the Authorization credential on requests to the provider they belong to.
- **History** of past analyses (the source page's title/URL and the results found) is stored only in `chrome.storage.local` on your device, capped at the 50 most recent sessions. It is never uploaded anywhere.

## What the developer does not collect

The developer of this extension does not operate any backend server, does not receive analytics, and does not collect, store, or have access to your page content, API keys, or history. Everything stays on your device except the direct, on-demand calls described above to the LLM/search providers you chose.

## Third-party providers

Your use of Anthropic, OpenAI, Google Gemini, OpenRouter, and Brave Search through this extension is subject to those providers' own privacy policies and terms, since your requests go directly to them using your own credentials.

## Data retention and deletion

All data this extension stores lives in your browser's local extension storage. Uninstalling the extension, or clearing its storage via `chrome://extensions`, deletes it. Removing a provider's key/connection in Settings deletes that credential immediately.

## Changes to this policy

If this policy changes, the "Last updated" date above will change and the new version will be published at the same URL.

## Contact

Questions about this policy can be sent to aryaman158@gmail.com.
```

- [ ] **Step 2: Enable GitHub Pages for this repo (manual, one-time)**

This is a GitHub repository setting, not a code change:
1. Go to `https://github.com/aryamanw/researcher-ai-extn/settings/pages`.
2. Under "Build and deployment" → "Source", choose "Deploy from a branch".
3. Branch: `main`, folder: `/docs`.
4. Save. GitHub will publish `docs/privacy-policy.md` at `https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html`.

Expected: after a minute, that URL loads the rendered policy (GitHub Pages auto-renders `.md` files via Jekyll when no `_config.yml` disables it).

- [ ] **Step 3: Link the policy from the README**

Modify `README.md`, add after the "Manual smoke test" section:

```markdown
## Privacy policy

https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html
```

- [ ] **Step 4: Verify the page is live**

Run: `curl -sI https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html | head -1`
Expected: `HTTP/2 200` (may take a few minutes after first enabling Pages — retry if you see 404).

- [ ] **Step 5: Commit**

```bash
git add docs/privacy-policy.md README.md
git commit -m "docs: add privacy policy for Chrome Web Store submission"
```

---

### Task 7: Packaging script for store upload

**Files:**
- Create: `scripts/package-extension.sh`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `npm run build` (existing, bundles `dist/content.bundled.js`), `manifest.json` (Task 3, now has icons).
- Produces: `research-companion-v<version>.zip` at the repo root — the file uploaded to the Chrome Web Store developer dashboard.

- [ ] **Step 1: Write the packaging script**

Create `scripts/package-extension.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run build

VERSION=$(node -p "require('./package.json').version")
OUT="research-companion-v${VERSION}.zip"

rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  background.js \
  icons \
  options \
  sidepanel \
  src \
  dist/content.bundled.js \
  -x '*.test.js' '**/*.test.js'

echo "Packaged $OUT"
unzip -l "$OUT"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/package-extension.sh
```

- [ ] **Step 3: Add the npm script**

Modify `package.json` `scripts` block to add:

```json
"package": "bash scripts/package-extension.sh"
```

- [ ] **Step 4: Ignore the generated zip**

Modify `.gitignore`, add:

```
research-companion-v*.zip
```

- [ ] **Step 5: Run it and verify contents**

Run: `npm run package`
Expected output ends with a file listing from `unzip -l` containing exactly: `manifest.json`, `background.js`, `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`, `options/*`, `sidepanel/*`, `src/**` (no `*.test.js` files), `dist/content.bundled.js`. No `node_modules`, `tests/`, `docs/`, `fixtures/`, `.git`, `store-assets/`, or `scripts/` entries.

- [ ] **Step 6: Sanity-check the zip loads as an unpacked extension**

```bash
mkdir -p /tmp/research-companion-unzipped
unzip -o research-companion-v*.zip -d /tmp/research-companion-unzipped
```

Then in Chrome: `chrome://extensions` → enable Developer mode → "Load unpacked" → select `/tmp/research-companion-unzipped`.
Expected: extension loads with no manifest errors and the toolbar icon shows the generated "R" mark instead of a puzzle-piece placeholder.

- [ ] **Step 7: Commit**

```bash
git add scripts/package-extension.sh package.json .gitignore
git commit -m "feat: add extension packaging script for store upload"
```

---

### Task 8: Chrome Web Store listing copy and permission justifications

**Files:**
- Create: `docs/chrome-web-store-listing.md`

**Interfaces:**
- Produces: reference content for the human-only steps in Task 9 (this is not code — there is no programmatic API used here, it's text to paste into the dashboard).

- [ ] **Step 1: Write the listing reference doc**

Create `docs/chrome-web-store-listing.md`:

```markdown
# Chrome Web Store listing — Research Companion

Reference copy for the Developer Dashboard (https://chrome.google.com/webstore/devconsole). Listing visibility: **Unlisted**.

## Store listing tab

**Short description (132 char max):**
> Reads the article you're on and finds related webpages, reports, and articles via the side panel.

**Detailed description:**
> Research Companion is a side-panel research assistant for anyone deep in an article, report, or blog post.
>
> Click the toolbar icon and it reads the page you're currently on, then searches the web for related coverage, source material, and alternate perspectives — each result comes with a one-line note explaining why it's relevant. Past sessions are saved locally so reopening the panel never repeats a search.
>
> You bring your own API keys (Anthropic, OpenAI, Google Gemini, or OpenRouter via sign-in) and a Brave Search API key — there is no backend server, and your page content and credentials never pass through any server operated by the developer.
>
> Built for a focused reading workflow: no chat UI, no notifications, no auto-triggering. It only runs when you click the icon, and it never competes with the page you're reading for attention.

**Category:** Productivity

**Language:** English

## Privacy practices tab

**Single purpose description:**
> Reads the user's currently active tab on demand (only when the user clicks the toolbar icon) to find and display related webpages, reports, and articles in the side panel.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `sidePanel` | Displays search results and history in Chrome's native side panel UI, the extension's primary surface. |
| `scripting` | Injects a one-shot content script into the active tab, only after the user clicks the toolbar icon, to extract the readable article text needed to generate search queries. |
| `storage` | Persists the user's provider/API key settings and past research session history locally via `chrome.storage.local`. Never synced or transmitted elsewhere. |
| `activeTab` | Grants temporary access to the tab the user is looking at only after they click the icon — used together with `scripting` so the extension never reads tabs the user hasn't explicitly engaged with. |
| `identity` | Used solely for the OpenRouter "Connect" OAuth (PKCE) flow via `chrome.identity.launchWebAuthFlow`, so users can authenticate without manually pasting an API key. |
| Host permissions (`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, `openrouter.ai`, `api.search.brave.com`) | The extension calls these APIs directly from the browser using the user's own credentials to generate search queries, run the web search, and write relevance notes. No other domains are contacted. |

**Are you using remote code?** No — all JavaScript ships inside the extension package; nothing is fetched and executed at runtime.

**Data usage — what is collected:**
- Website content: Yes — the text of the page the user is actively viewing, read only on explicit click, used transiently to generate search queries and is not retained by the developer.
- Personal communications: No
- Location: No
- Financial/health/personal info: No
- Authentication information: Yes — user-supplied API keys / OAuth tokens, stored only in local browser storage, used only to call the provider the user selected.

**Privacy policy URL:**
> https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html

## Graphic assets tab

- **Screenshots:** `store-assets/screenshot-sidepanel.png`, `store-assets/screenshot-options.png` (both 1280×800, generated by `npm run capture:screenshots`).
- **Icon:** the dashboard reuses the 128×128 icon from the uploaded package (`icons/icon128.png`); no separate upload needed.
- **Promotional tiles:** not required for unlisted items — skip.

## Distribution tab

- **Visibility:** Unlisted.
- **Regions:** All regions (default) unless you want to restrict further.
```

- [ ] **Step 2: Commit**

```bash
git add docs/chrome-web-store-listing.md
git commit -m "docs: add Chrome Web Store listing copy and permission justifications"
```

---

### Task 9: Manual submission (human-only, not automatable)

These steps cannot be scripted — they require a Google account, payment, and the Chrome Web Store review process. Listed here so nothing gets missed.

- [ ] **Step 1:** Register as a Chrome Web Store developer at https://chrome.google.com/webstore/devconsole (one-time $5 registration fee), if not already done.
- [ ] **Step 2:** Run `npm run package` to produce `research-companion-v0.1.0.zip`.
- [ ] **Step 3:** In the Developer Dashboard, create a new item, upload the zip.
- [ ] **Step 4:** Fill in the "Store listing" tab using `docs/chrome-web-store-listing.md`.
- [ ] **Step 5:** Fill in the "Privacy practices" tab using the same doc; paste the GitHub Pages privacy policy URL.
- [ ] **Step 6:** Upload `store-assets/screenshot-sidepanel.png` and `store-assets/screenshot-options.png` on the "Store listing" tab's screenshots section.
- [ ] **Step 7:** On the "Deployment" / "Distribution" tab, set visibility to **Unlisted**.
- [ ] **Step 8:** Submit for review.
- [ ] **Step 9:** Once approved, save the unlisted item's store URL somewhere durable (e.g. the README) for sharing.

---

## Self-Review

**Spec coverage:**
- Icons → Tasks 2, 3.
- Screenshots → Tasks 4, 5.
- Privacy policy required for third-party data sharing + stored credentials → Task 6.
- Listing copy / permission justifications / data disclosure → Task 8.
- Clean upload package excluding dev files → Task 7.
- Actual submission (account, payment, dashboard, unlisted visibility) → Task 9.
- No remote code, no eval, restrictive CSP → already true today (verified via grep before writing this plan), no task needed.

**Placeholder scan:** no "TBD"/"add appropriate" phrasing; every step has literal file content or an exact command with expected output.

**Type/interface consistency:** `renderResults(container, results, { provider, showProvider })`, `renderHistoryList(container, entries, onSelect)`, `renderSettingsToForm(form, settings)`, `syncKeyFieldVisibility(form)` are used in Tasks 4–5 exactly as they're defined in `sidepanel/sidepanelPage.js` and `options/optionsPage.js` today — confirmed by reading both files before writing this plan. Settings field names (`provider`, `model`, `anthropicKey`, `openaiKey`, `geminiKey`, `braveSearchKey`, `resultsCount`) match `gatherSettingsFromForm`/`renderSettingsToForm`.

# Research Companion Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 Chrome extension that, on demand, extracts the article you're reading, generates search queries via an LLM, searches the web via Brave Search, reranks/explains results via the LLM, and shows them in a side panel — fully client-side, no backend.

**Architecture:** Side panel page orchestrates the full pipeline directly (extraction request → LLM → search → LLM rerank → render), since it persists while open, unlike the short-lived MV3 background service worker. The service worker only opens the side panel on icon click and hosts the OpenRouter OAuth flow. A small `src/lib/` module tree (storage, extraction, LLM provider clients, search client, pipeline) is shared by background/side panel/options pages as native ES modules; only the content script is bundled (via esbuild) because Chrome content scripts can't use ES imports natively.

**Tech Stack:** Plain JavaScript (ES modules), Vitest + jsdom for tests, esbuild (content script bundling only), `@mozilla/readability` for article extraction, Node >=20.

## Global Constraints

- Platform: Chrome Manifest V3 only.
- No backend server — every API call (LLM, search, OAuth) is made directly from the extension using the user's own credentials.
- Storage: `chrome.storage.local` only, never `chrome.storage.sync` (keys/tokens/history must not leave the machine via Chrome Sync).
- Language: plain JavaScript (ES modules) — no TypeScript, no UI framework.
- esbuild is used ONLY to bundle `src/content/contentEntry.js` → `dist/content.bundled.js`. Background, side panel, and options pages load native ES modules directly — no bundling.
- Test framework: Vitest with `environment: 'jsdom'`.
- Node >=20 (native `globalThis.crypto` Web Crypto API required for PKCE).
- History capped at 50 entries, oldest evicted first.
- Runtime dependency: `@mozilla/readability` only. No other runtime dependencies.
- LLM providers supported: Anthropic, OpenAI, Gemini (API key), OpenRouter (OAuth PKCE).
- Search provider: Brave Search API only.

---

## File Structure

```
package.json
vitest.config.js
manifest.json
background.js
sidepanel/
  sidepanel.html
  sidepanelPage.js     (testable render + orchestration functions)
  main.js              (DOM bootstrap, not unit tested)
options/
  options.html
  optionsPage.js       (testable form <-> settings functions)
  main.js              (DOM bootstrap, not unit tested)
src/
  content/
    contentEntry.js    (bundled by esbuild into dist/content.bundled.js)
  lib/
    storage.js
    extraction.js
    pipeline.js
    llm/
      anthropic.js
      openai.js
      gemini.js
      openrouter.js
      index.js
    search/
      brave.js
    oauth/
      openrouterOAuth.js
tests/
  storage.test.js
  extraction.test.js
  pipeline.test.js
  contentEntry.test.js
  background.test.js
  llm/
    anthropic.test.js
    openai.test.js
    gemini.test.js
    openrouter.test.js
    index.test.js
  search/
    brave.test.js
  oauth/
    openrouterOAuth.test.js
  options/
    optionsPage.test.js
  sidepanel/
    sidepanelPage.test.js
fixtures/
  article.html
  blog.html
  pdf-viewer.html
  paywall.html
dist/                  (generated, gitignored)
```

---

### Task 1: Project scaffold (package.json, Vitest, esbuild, manifest, .gitignore)

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `manifest.json`
- Modify: `.gitignore`
- Test: `tests/sanity.test.js`

**Interfaces:**
- Produces: `npm test` (runs Vitest), `npm run build` (runs esbuild against `src/content/contentEntry.js`, created in Task 4 — this task only wires the script, doesn't run it).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "researcher-ai-extn",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "build": "esbuild src/content/contentEntry.js --bundle --outfile=dist/content.bundled.js --format=iife"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "jsdom": "^25.0.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "@mozilla/readability": "^0.5.0"
  }
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 3: Create `manifest.json`**

```json
{
  "manifest_version": 3,
  "name": "Research Companion",
  "version": "0.1.0",
  "description": "Suggests similar webpages, reports, and articles to what you're currently reading.",
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
    "default_title": "Research Companion"
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "options_page": "options/options.html"
}
```

- [ ] **Step 4: Update `.gitignore`**

Add to the existing `.gitignore`:

```
node_modules/
dist/
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 6: Write a sanity test**

```js
// tests/sanity.test.js
import { describe, it, expect } from 'vitest';

describe('project scaffold', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object');
  });
});
```

- [ ] **Step 7: Run tests to verify the harness works**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.js manifest.json .gitignore tests/sanity.test.js
git commit -m "chore: scaffold project tooling (vitest, esbuild, manifest)"
```

---

### Task 2: Storage module

**Files:**
- Create: `src/lib/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Produces:
  - `getSettings(): Promise<Settings>` — `Settings = { provider: string|null, model: string|null, apiKeys: { anthropic: string, openai: string, gemini: string }, openrouterToken: string, braveSearchKey: string, resultsCount: number }`
  - `saveSettings(settings: Settings): Promise<void>`
  - `getHistory(): Promise<HistoryEntry[]>` — `HistoryEntry = { id: string, timestamp: number, sourcePage: { title: string, url: string }, results: Array<{ title, url, snippet, relevance }> }`
  - `addHistoryEntry(entry: HistoryEntry): Promise<HistoryEntry[]>` (returns updated, capped-at-50 history)
- Consumes: `chrome.storage.local.get` / `chrome.storage.local.set` (global `chrome`, mocked in tests).

- [ ] **Step 1: Write failing tests**

```js
// tests/storage.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, saveSettings, getHistory, addHistoryEntry } from '../src/lib/storage.js';

function mockChromeStorage(initial = {}) {
  const store = { ...initial };
  global.chrome = {
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve({ [key]: store[key] })),
        set: vi.fn((obj) => {
          Object.assign(store, obj);
          return Promise.resolve();
        }),
      },
    },
  };
  return store;
}

describe('getSettings', () => {
  beforeEach(() => mockChromeStorage());

  it('returns defaults when nothing is stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual({
      provider: null,
      model: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
  });

  it('merges stored settings over defaults', async () => {
    mockChromeStorage({ settings: { provider: 'anthropic', resultsCount: 5 } });
    const settings = await getSettings();
    expect(settings.provider).toBe('anthropic');
    expect(settings.resultsCount).toBe(5);
    expect(settings.braveSearchKey).toBe('');
  });
});

describe('saveSettings', () => {
  it('persists settings under the settings key', async () => {
    mockChromeStorage();
    await saveSettings({ provider: 'openai' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: { provider: 'openai' },
    });
  });
});

describe('history', () => {
  beforeEach(() => mockChromeStorage());

  it('returns an empty array when no history exists', async () => {
    expect(await getHistory()).toEqual([]);
  });

  it('adds an entry to the front of history', async () => {
    const entry1 = { id: '1', timestamp: 1, sourcePage: { title: 'A', url: 'a.com' }, results: [] };
    const entry2 = { id: '2', timestamp: 2, sourcePage: { title: 'B', url: 'b.com' }, results: [] };
    await addHistoryEntry(entry1);
    const updated = await addHistoryEntry(entry2);
    expect(updated).toEqual([entry2, entry1]);
  });

  it('caps history at 50 entries, evicting the oldest', async () => {
    for (let i = 0; i < 50; i++) {
      await addHistoryEntry({ id: String(i), timestamp: i, sourcePage: { title: 't', url: 'u' }, results: [] });
    }
    const overflow = { id: '50', timestamp: 50, sourcePage: { title: 't', url: 'u' }, results: [] };
    const updated = await addHistoryEntry(overflow);
    expect(updated).toHaveLength(50);
    expect(updated[0].id).toBe('50');
    expect(updated.find((e) => e.id === '0')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/storage.test.js`
Expected: FAIL — `src/lib/storage.js` does not exist.

- [ ] **Step 3: Implement `src/lib/storage.js`**

```js
const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const MAX_HISTORY_ENTRIES = 50;

const DEFAULT_SETTINGS = {
  provider: null,
  model: null,
  apiKeys: { anthropic: '', openai: '', gemini: '' },
  openrouterToken: '',
  braveSearchKey: '',
  resultsCount: 8,
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getHistory() {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  return stored[HISTORY_KEY] || [];
}

export async function addHistoryEntry(entry) {
  const history = await getHistory();
  const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
  await chrome.storage.local.set({ [HISTORY_KEY]: updated });
  return updated;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/storage.test.js`
Expected: PASS — all 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.js tests/storage.test.js
git commit -m "feat: add chrome.storage.local settings and history module"
```

---

### Task 3: Article extraction module + fixtures

**Files:**
- Create: `src/lib/extraction.js`
- Create: `fixtures/article.html`
- Create: `fixtures/blog.html`
- Create: `fixtures/pdf-viewer.html`
- Create: `fixtures/paywall.html`
- Test: `tests/extraction.test.js`

**Interfaces:**
- Produces: `extractArticle(doc: Document, url: string): { title: string, url: string, text: string, confidence: 'high'|'low' }`
- Consumes: `@mozilla/readability`'s `Readability` class.

- [ ] **Step 1: Create fixture `fixtures/article.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Why Tidal Energy Is Finally Getting Investment</title></head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <header><h1>Why Tidal Energy Is Finally Getting Investment</h1></header>
  <article>
    <p>For decades, tidal energy was the perpetual "next big thing" in renewables, promising predictable power generation tied to the moon's gravitational pull but never quite reaching commercial scale.</p>
    <p>That is starting to change. Several governments have announced new funding rounds for tidal demonstration projects, citing improvements in turbine durability and falling installation costs as key drivers.</p>
    <p>Unlike wind and solar, tidal currents are highly predictable years in advance, which utility operators say makes it easier to integrate into grid planning without expensive storage buildouts.</p>
    <p>Still, critics point out that the capital costs of marine-rated turbines remain far higher than onshore wind, and that environmental review timelines for coastal installations can stretch into years.</p>
    <p>Industry analysts expect the next two years to be a proving ground: if a handful of flagship projects deliver on cost projections, tidal could finally move from pilot programs into mainstream procurement.</p>
  </article>
  <footer>Copyright 2026</footer>
</body>
</html>
```

- [ ] **Step 2: Create fixture `fixtures/blog.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Notes on Debugging Distributed Systems</title></head>
<body>
  <header><h1>Notes on Debugging Distributed Systems</h1></header>
  <main>
    <article>
      <p>Every distributed systems outage I've debugged eventually comes down to the same root cause: an assumption about ordering that held in testing but broke under real network conditions.</p>
      <p>The most useful habit I've built is writing down, before looking at any logs, what I expect the system to be doing right now. That forces me to surface the assumption before I go hunting for evidence.</p>
      <p>Distributed tracing helps, but only if the trace IDs propagate consistently across every hop, including the ones your team doesn't own, like a managed queue or a third-party webhook.</p>
      <p>When in doubt, reproduce the failure at the smallest possible scale: two nodes, one message, one network partition. Most "it's complicated" bugs turn out to be two-node bugs wearing a disguise.</p>
    </article>
  </main>
  <aside>Related posts...</aside>
</body>
</html>
```

- [ ] **Step 3: Create fixture `fixtures/pdf-viewer.html`**

```html
<!DOCTYPE html>
<html>
<head><title>document.pdf</title></head>
<body>
  <embed type="application/pdf" src="document.pdf" width="100%" height="100%" />
</body>
</html>
```

- [ ] **Step 4: Create fixture `fixtures/paywall.html`**

```html
<!DOCTYPE html>
<html>
<head><title>Subscribe to keep reading</title></head>
<body>
  <article>
    <p>Markets opened lower today as investors weighed new inflation data against expectations of a rate hold.</p>
  </article>
  <div class="paywall">
    <p>You've reached your free article limit. Subscribe to continue reading.</p>
  </div>
</body>
</html>
```

- [ ] **Step 5: Write failing tests**

```js
// tests/extraction.test.js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { extractArticle } from '../src/lib/extraction.js';

function loadFixture(name) {
  const html = readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf-8');
  return new JSDOM(html).window.document;
}

describe('extractArticle', () => {
  it('extracts high-confidence text from a news article', () => {
    const doc = loadFixture('article.html');
    const result = extractArticle(doc, 'https://example.com/article');
    expect(result.confidence).toBe('high');
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.title).toContain('Tidal Energy');
    expect(result.url).toBe('https://example.com/article');
  });

  it('extracts high-confidence text from a blog post', () => {
    const doc = loadFixture('blog.html');
    const result = extractArticle(doc, 'https://example.com/blog');
    expect(result.confidence).toBe('high');
    expect(result.text.length).toBeGreaterThan(200);
  });

  it('returns low confidence for a PDF viewer shell with no article text', () => {
    const doc = loadFixture('pdf-viewer.html');
    const result = extractArticle(doc, 'https://example.com/document.pdf');
    expect(result.confidence).toBe('low');
    expect(result.text).toBe('');
  });

  it('returns low confidence for a paywalled stub with too little text', () => {
    const doc = loadFixture('paywall.html');
    const result = extractArticle(doc, 'https://example.com/paywalled');
    expect(result.confidence).toBe('low');
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run tests/extraction.test.js`
Expected: FAIL — `src/lib/extraction.js` does not exist.

- [ ] **Step 7: Implement `src/lib/extraction.js`**

```js
import { Readability } from '@mozilla/readability';

const MIN_TEXT_LENGTH = 200;

export function extractArticle(doc, url) {
  const clone = doc.cloneNode(true);
  let article = null;
  try {
    article = new Readability(clone).parse();
  } catch {
    article = null;
  }

  const text = article?.textContent?.trim() || '';
  if (text.length < MIN_TEXT_LENGTH) {
    return { title: doc.title || '', url, text: '', confidence: 'low' };
  }

  return {
    title: article.title || doc.title || '',
    url,
    text,
    confidence: 'high',
  };
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/extraction.test.js`
Expected: PASS — all 4 tests passed.

- [ ] **Step 9: Commit**

```bash
git add src/lib/extraction.js fixtures/ tests/extraction.test.js
git commit -m "feat: add readability-based article extraction"
```

---

### Task 4: Content script entry point + build

**Files:**
- Create: `src/content/contentEntry.js`
- Test: `tests/contentEntry.test.js`

**Interfaces:**
- Consumes: `extractArticle(doc, url)` from Task 3 (`../lib/extraction.js`).
- Produces: on execution, sends `chrome.runtime.sendMessage({ type: 'EXTRACTION_RESULT', payload: <extraction result> })`. This message shape is relied on by Task 12 (side panel).

- [ ] **Step 1: Write a failing test**

```js
// tests/contentEntry.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('contentEntry', () => {
  beforeEach(() => {
    document.title = 'Test Page';
    document.body.innerHTML = `
      <article>
        <p>${'This is a long enough paragraph to pass the extraction confidence threshold. '.repeat(5)}</p>
      </article>
    `;
    global.chrome = { runtime: { sendMessage: vi.fn() } };
    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/page' },
      writable: true,
    });
  });

  it('extracts the page and sends the result via chrome.runtime.sendMessage', async () => {
    await import('../src/content/contentEntry.js');
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
    const [message] = chrome.runtime.sendMessage.mock.calls[0];
    expect(message.type).toBe('EXTRACTION_RESULT');
    expect(message.payload.confidence).toBe('high');
    expect(message.payload.url).toBe('https://example.com/page');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contentEntry.test.js`
Expected: FAIL — `src/content/contentEntry.js` does not exist.

- [ ] **Step 3: Implement `src/content/contentEntry.js`**

```js
import { extractArticle } from '../lib/extraction.js';

const result = extractArticle(document, location.href);
chrome.runtime.sendMessage({ type: 'EXTRACTION_RESULT', payload: result });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/contentEntry.test.js`
Expected: PASS — 1 test passed.

Note: each test file that imports `contentEntry.js` must use dynamic `import()` inside the test (as above), since the module executes its side effect (sending the message) at import time. Importing it more than once per test run from a static `import` at the top of the file would only run it once due to module caching — the dynamic import pattern here is correct and sufficient since this is the only test file importing it.

- [ ] **Step 5: Build the content script bundle**

Run: `npm run build`
Expected: `dist/content.bundled.js` is created with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/content/contentEntry.js tests/contentEntry.test.js
git commit -m "feat: add content script entry point for page extraction"
```

---

### Task 5: LLM provider clients (Anthropic, OpenAI, Gemini, OpenRouter)

**Files:**
- Create: `src/lib/llm/anthropic.js`
- Create: `src/lib/llm/openai.js`
- Create: `src/lib/llm/gemini.js`
- Create: `src/lib/llm/openrouter.js`
- Test: `tests/llm/anthropic.test.js`
- Test: `tests/llm/openai.test.js`
- Test: `tests/llm/gemini.test.js`
- Test: `tests/llm/openrouter.test.js`

**Interfaces:**
- Produces: each module exports `complete({ apiKey: string, model: string|null, prompt: string }): Promise<string>` — identical signature across all four, relied on by Task 6.

- [ ] **Step 1: Write failing test for Anthropic**

```js
// tests/llm/anthropic.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/anthropic.js';

afterEach(() => vi.unstubAllGlobals());

describe('anthropic complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'hello from claude' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'claude-3-5-sonnet-20241022', prompt: 'hi' });

    expect(result).toBe('hello from claude');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('key123');
    expect(JSON.parse(options.body).messages[0].content).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('Anthropic API error: 401');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/llm/anthropic.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/llm/anthropic.js`**

```js
export async function complete({ apiKey, model, prompt }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/llm/anthropic.test.js`
Expected: PASS — 2 tests passed.

- [ ] **Step 5: Write failing test for OpenAI**

```js
// tests/llm/openai.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/openai.js';

afterEach(() => vi.unstubAllGlobals());

describe('openai complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello from gpt' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'gpt-4o-mini', prompt: 'hi' });

    expect(result).toBe('hello from gpt');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer key123');
    expect(JSON.parse(options.body).messages[0].content).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('OpenAI API error: 401');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/llm/openai.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 7: Implement `src/lib/llm/openai.js`**

```js
export async function complete({ apiKey, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/llm/openai.test.js`
Expected: PASS — 2 tests passed.

- [ ] **Step 9: Write failing test for Gemini**

```js
// tests/llm/gemini.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/gemini.js';

afterEach(() => vi.unstubAllGlobals());

describe('gemini complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello from gemini' }] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'gemini-1.5-flash', prompt: 'hi' });

    expect(result).toBe('hello from gemini');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
    expect(url).toContain('key=key123');
    expect(JSON.parse(options.body).contents[0].parts[0].text).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('Gemini API error: 401');
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run tests/llm/gemini.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 11: Implement `src/lib/llm/gemini.js`**

```js
export async function complete({ apiKey, model, prompt }) {
  const modelName = model || 'gemini-1.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run tests/llm/gemini.test.js`
Expected: PASS — 2 tests passed.

- [ ] **Step 13: Write failing test for OpenRouter**

```js
// tests/llm/openrouter.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/openrouter.js';

afterEach(() => vi.unstubAllGlobals());

describe('openrouter complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello from openrouter' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'openai/gpt-4o-mini', prompt: 'hi' });

    expect(result).toBe('hello from openrouter');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer key123');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('OpenRouter API error: 401');
  });
});
```

- [ ] **Step 14: Run test to verify it fails**

Run: `npx vitest run tests/llm/openrouter.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 15: Implement `src/lib/llm/openrouter.js`**

```js
export async function complete({ apiKey, model, prompt }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run tests/llm/openrouter.test.js`
Expected: PASS — 2 tests passed.

- [ ] **Step 17: Run the full LLM test suite together**

Run: `npx vitest run tests/llm`
Expected: PASS — 8 tests passed across 4 files.

- [ ] **Step 18: Commit**

```bash
git add src/lib/llm/anthropic.js src/lib/llm/openai.js src/lib/llm/gemini.js src/lib/llm/openrouter.js tests/llm/
git commit -m "feat: add Anthropic, OpenAI, Gemini, and OpenRouter completion clients"
```

---

### Task 6: LLM provider registry

**Files:**
- Create: `src/lib/llm/index.js`
- Test: `tests/llm/index.test.js`

**Interfaces:**
- Consumes: `complete({ apiKey, model, prompt })` from each of the four provider modules (Task 5).
- Produces: `getCompletion(settings: Settings, prompt: string): Promise<string>` — relied on by Task 12 (side panel). `settings` is the shape from Task 2's `getSettings()`.

- [ ] **Step 1: Write failing tests**

```js
// tests/llm/index.test.js
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/llm/anthropic.js', () => ({ complete: vi.fn().mockResolvedValue('anthropic-result') }));
vi.mock('../../src/lib/llm/openai.js', () => ({ complete: vi.fn().mockResolvedValue('openai-result') }));
vi.mock('../../src/lib/llm/gemini.js', () => ({ complete: vi.fn().mockResolvedValue('gemini-result') }));
vi.mock('../../src/lib/llm/openrouter.js', () => ({ complete: vi.fn().mockResolvedValue('openrouter-result') }));

import { getCompletion } from '../../src/lib/llm/index.js';
import { complete as anthropicComplete } from '../../src/lib/llm/anthropic.js';
import { complete as openrouterComplete } from '../../src/lib/llm/openrouter.js';

describe('getCompletion', () => {
  it('routes to the configured provider with its API key', async () => {
    const settings = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKeys: { anthropic: 'a-key', openai: '', gemini: '' },
      openrouterToken: '',
    };
    const result = await getCompletion(settings, 'hello');
    expect(result).toBe('anthropic-result');
    expect(anthropicComplete).toHaveBeenCalledWith({ apiKey: 'a-key', model: 'claude-3-5-sonnet-20241022', prompt: 'hello' });
  });

  it('uses openrouterToken instead of apiKeys for the openrouter provider', async () => {
    const settings = {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: 'or-token',
    };
    const result = await getCompletion(settings, 'hello');
    expect(result).toBe('openrouter-result');
    expect(openrouterComplete).toHaveBeenCalledWith({ apiKey: 'or-token', model: 'openai/gpt-4o-mini', prompt: 'hello' });
  });

  it('throws when no provider is configured', async () => {
    const settings = { provider: null, model: null, apiKeys: {}, openrouterToken: '' };
    await expect(getCompletion(settings, 'hello')).rejects.toThrow('No provider configured: null');
  });

  it('throws when the configured provider has no API key', async () => {
    const settings = { provider: 'openai', model: null, apiKeys: { openai: '' }, openrouterToken: '' };
    await expect(getCompletion(settings, 'hello')).rejects.toThrow('No API key/token configured for provider: openai');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/llm/index.test.js`
Expected: FAIL — `src/lib/llm/index.js` does not exist.

- [ ] **Step 3: Implement `src/lib/llm/index.js`**

```js
import { complete as anthropicComplete } from './anthropic.js';
import { complete as openaiComplete } from './openai.js';
import { complete as geminiComplete } from './gemini.js';
import { complete as openrouterComplete } from './openrouter.js';

const PROVIDERS = {
  anthropic: anthropicComplete,
  openai: openaiComplete,
  gemini: geminiComplete,
  openrouter: openrouterComplete,
};

export async function getCompletion(settings, prompt) {
  const { provider, model } = settings;
  const completeFn = PROVIDERS[provider];
  if (!completeFn) {
    throw new Error(`No provider configured: ${provider}`);
  }

  const apiKey = provider === 'openrouter' ? settings.openrouterToken : settings.apiKeys?.[provider];

  if (!apiKey) {
    throw new Error(`No API key/token configured for provider: ${provider}`);
  }

  return completeFn({ apiKey, model, prompt });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/llm/index.test.js`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/index.js tests/llm/index.test.js
git commit -m "feat: add LLM provider registry/dispatcher"
```

---

### Task 7: Brave Search client

**Files:**
- Create: `src/lib/search/brave.js`
- Test: `tests/search/brave.test.js`

**Interfaces:**
- Produces: `search({ apiKey: string, query: string, count?: number }): Promise<Array<{ title: string, url: string, snippet: string }>>` — relied on by Task 8 (pipeline) and Task 12 (side panel).

- [ ] **Step 1: Write failing tests**

```js
// tests/search/brave.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { search } from '../../src/lib/search/brave.js';

afterEach(() => vi.unstubAllGlobals());

describe('brave search', () => {
  it('sends the expected request and maps results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Result 1', url: 'https://a.com', description: 'desc 1' },
            { title: 'Result 2', url: 'https://b.com', description: 'desc 2' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await search({ apiKey: 'key123', query: 'tidal energy' });

    expect(results).toEqual([
      { title: 'Result 1', url: 'https://a.com', snippet: 'desc 1' },
      { title: 'Result 2', url: 'https://b.com', snippet: 'desc 2' },
    ]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain('q=tidal+energy');
    expect(options.headers['x-subscription-token']).toBe('key123');
  });

  it('returns an empty array when there are no web results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const results = await search({ apiKey: 'key123', query: 'no results here' });
    expect(results).toEqual([]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(search({ apiKey: 'bad', query: 'x' })).rejects.toThrow('Brave Search API error: 403');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/search/brave.test.js`
Expected: FAIL — `src/lib/search/brave.js` does not exist.

- [ ] **Step 3: Implement `src/lib/search/brave.js`**

```js
export async function search({ apiKey, query, count = 10 }) {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-subscription-token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.web?.results || [];
  return results.map((r) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.description || '',
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/search/brave.test.js`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/brave.js tests/search/brave.test.js
git commit -m "feat: add Brave Search API client"
```

---

### Task 8: Pipeline orchestration module

**Files:**
- Create: `src/lib/pipeline.js`
- Test: `tests/pipeline.test.js`

**Interfaces:**
- Consumes: `llmClient.complete(prompt: string): Promise<string>` and `searchClient.search(query: string): Promise<Array<{title,url,snippet}>>` — both injected by the caller (Task 12 wires these to Task 6's `getCompletion` and Task 7's `search`).
- Produces: `runPipeline({ pageTitle, pageUrl, articleText, llmClient, searchClient, resultsCount }): Promise<Array<{ title: string, url: string, snippet: string, relevance: string }>>` — relied on by Task 12.

- [ ] **Step 1: Write failing tests**

```js
// tests/pipeline.test.js
import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/lib/pipeline.js';

function makeLlmClient(responses) {
  let call = 0;
  return { complete: vi.fn(async () => responses[call++]) };
}

describe('runPipeline', () => {
  it('generates queries, searches, dedupes, and reranks', async () => {
    const llmClient = makeLlmClient([
      JSON.stringify({ topic: 'tidal energy', queries: ['tidal energy investment', 'marine turbine costs'] }),
      JSON.stringify([
        { title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1', relevance: 'Same funding angle' },
      ]),
    ]);
    const searchClient = {
      search: vi
        .fn()
        .mockResolvedValueOnce([{ title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1' }])
        .mockResolvedValueOnce([{ title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1' }]),
    };

    const results = await runPipeline({
      pageTitle: 'Why Tidal Energy Is Finally Getting Investment',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      searchClient,
      resultsCount: 8,
    });

    expect(results).toEqual([
      { title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1', relevance: 'Same funding angle' },
    ]);
    expect(searchClient.search).toHaveBeenCalledWith('tidal energy investment');
    expect(searchClient.search).toHaveBeenCalledWith('marine turbine costs');
  });

  it('excludes the source page URL from candidates', async () => {
    const llmClient = makeLlmClient([
      JSON.stringify({ topic: 't', queries: ['q1'] }),
      JSON.stringify([{ title: 'Other', url: 'https://other.com', snippet: 's', relevance: 'r' }]),
    ]);
    const searchClient = {
      search: vi.fn().mockResolvedValue([
        { title: 'Self', url: 'https://example.com/article', snippet: 's' },
        { title: 'Other', url: 'https://other.com', snippet: 's' },
      ]),
    };

    await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      searchClient,
      resultsCount: 8,
    });

    const rerankPromptArg = llmClient.complete.mock.calls[1][0];
    expect(rerankPromptArg).not.toContain('https://example.com/article');
  });

  it('returns an empty array when search finds no candidates', async () => {
    const llmClient = makeLlmClient([JSON.stringify({ topic: 't', queries: ['q1'] })]);
    const searchClient = { search: vi.fn().mockResolvedValue([]) };

    const results = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      searchClient,
      resultsCount: 8,
    });

    expect(results).toEqual([]);
    expect(llmClient.complete).toHaveBeenCalledTimes(1);
  });

  it('throws when the LLM does not return valid queries JSON', async () => {
    const llmClient = makeLlmClient(['not json']);
    const searchClient = { search: vi.fn() };

    await expect(
      runPipeline({
        pageTitle: 't',
        pageUrl: 'https://example.com/article',
        articleText: 'a'.repeat(300),
        llmClient,
        searchClient,
        resultsCount: 8,
      })
    ).rejects.toThrow('Could not parse JSON from topic/query generation response');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/pipeline.test.js`
Expected: FAIL — `src/lib/pipeline.js` does not exist.

- [ ] **Step 3: Implement `src/lib/pipeline.js`**

```js
const MAX_ARTICLE_CHARS = 12000;

function buildQueryPrompt({ title, text }) {
  const trimmedText = text.slice(0, MAX_ARTICLE_CHARS);
  return [
    'You are helping a researcher find similar webpages, reports, and articles.',
    `Page title: ${title}`,
    `Page content:\n${trimmedText}`,
    '',
    'Identify the core topic of this page and generate 2 to 4 web search queries',
    'that would surface similar webpages, reports, or articles.',
    'Respond with ONLY valid JSON in this exact shape, no other text:',
    '{"topic": "string", "queries": ["string", "string"]}',
  ].join('\n');
}

function buildRerankPrompt({ title, pageUrl, candidates, resultsCount }) {
  const filteredCandidates = candidates.filter((c) => c.url !== pageUrl);
  return [
    'You are helping a researcher evaluate search results found while reading the page below.',
    `Page title: ${title}`,
    '',
    `Candidate results (JSON): ${JSON.stringify(filteredCandidates)}`,
    '',
    `Select the ${resultsCount} most relevant, distinct candidates (drop duplicates and irrelevant ones).`,
    'For each, write a one-sentence explanation of why it is relevant to the page above.',
    'Respond with ONLY valid JSON in this exact shape, no other text:',
    '[{"title": "string", "url": "string", "snippet": "string", "relevance": "string"}]',
  ].join('\n');
}

function parseJsonResponse(raw, context) {
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) {
    throw new Error(`Could not parse JSON from ${context} response`);
  }
  return JSON.parse(match[0]);
}

function dedupeByUrl(candidates) {
  const seen = new Set();
  const deduped = [];
  for (const candidate of candidates) {
    if (!candidate.url || seen.has(candidate.url)) continue;
    seen.add(candidate.url);
    deduped.push(candidate);
  }
  return deduped;
}

export async function runPipeline({ pageTitle, pageUrl, articleText, llmClient, searchClient, resultsCount = 8 }) {
  const queryPrompt = buildQueryPrompt({ title: pageTitle, text: articleText });
  const queryRaw = await llmClient.complete(queryPrompt);
  const { queries } = parseJsonResponse(queryRaw, 'topic/query generation');

  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('LLM did not return any search queries');
  }

  const searchResultsByQuery = await Promise.all(queries.map((query) => searchClient.search(query)));
  const candidates = dedupeByUrl(searchResultsByQuery.flat()).filter((candidate) => candidate.url !== pageUrl);

  if (candidates.length === 0) {
    return [];
  }

  const rerankPrompt = buildRerankPrompt({ title: pageTitle, pageUrl, candidates, resultsCount });
  const rerankRaw = await llmClient.complete(rerankPrompt);
  const ranked = parseJsonResponse(rerankRaw, 'reranking');

  if (!Array.isArray(ranked)) {
    throw new Error('LLM did not return a ranked results array');
  }

  return ranked;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/pipeline.test.js`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline.js tests/pipeline.test.js
git commit -m "feat: add pipeline orchestration (query generation, search, rerank)"
```

---

### Task 9: OpenRouter OAuth (PKCE)

**Files:**
- Create: `src/lib/oauth/openrouterOAuth.js`
- Test: `tests/oauth/openrouterOAuth.test.js`

**Interfaces:**
- Produces:
  - `generateCodeVerifier(): string`
  - `generateCodeChallenge(verifier: string): Promise<string>`
  - `buildAuthUrl({ callbackUrl: string, codeChallenge: string }): string`
  - `exchangeCodeForKey({ code: string, codeVerifier: string }): Promise<string>`
  - `connectOpenRouter(launchWebAuthFlow: (options: { url: string, interactive: boolean }) => Promise<string>): Promise<string>` (returns the OpenRouter API key) — relied on by Task 10 (background).
- Consumes: global `crypto` (Web Crypto), global `chrome.identity.getRedirectURL()`, global `fetch`.

**Note:** the actual browser OAuth popup (`chrome.identity.launchWebAuthFlow`'s real UI) cannot be exercised in Vitest — it's covered by the manual smoke test in Task 13. Everything else (PKCE generation, URL building, code exchange, and `connectOpenRouter`'s orchestration with an injected `launchWebAuthFlow`) is unit tested here.

- [ ] **Step 1: Write failing tests**

```js
// tests/oauth/openrouterOAuth.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  exchangeCodeForKey,
  connectOpenRouter,
} from '../../src/lib/oauth/openrouterOAuth.js';

afterEach(() => vi.unstubAllGlobals());

describe('generateCodeVerifier', () => {
  it('returns a non-empty url-safe string', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThan(20);
    expect(verifier).not.toMatch(/[+/=]/);
  });
});

describe('generateCodeChallenge', () => {
  it('returns a url-safe sha256 digest of the verifier', async () => {
    const challenge = await generateCodeChallenge('test-verifier');
    expect(typeof challenge).toBe('string');
    expect(challenge.length).toBeGreaterThan(20);
    expect(challenge).not.toMatch(/[+/=]/);
  });
});

describe('buildAuthUrl', () => {
  it('builds the OpenRouter auth URL with callback and challenge params', () => {
    const url = buildAuthUrl({ callbackUrl: 'https://abc.chromiumapp.org/', codeChallenge: 'chal123' });
    expect(url).toContain('https://openrouter.ai/auth?');
    expect(url).toContain('callback_url=https%3A%2F%2Fabc.chromiumapp.org%2F');
    expect(url).toContain('code_challenge=chal123');
    expect(url).toContain('code_challenge_method=S256');
  });
});

describe('exchangeCodeForKey', () => {
  it('posts the code and verifier and returns the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ key: 'or-key-123' }) });
    vi.stubGlobal('fetch', fetchMock);

    const key = await exchangeCodeForKey({ code: 'auth-code', codeVerifier: 'verifier-abc' });

    expect(key).toBe('or-key-123');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/auth/keys');
    expect(JSON.parse(options.body)).toEqual({
      code: 'auth-code',
      code_verifier: 'verifier-abc',
      code_challenge_method: 'S256',
    });
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(exchangeCodeForKey({ code: 'bad', codeVerifier: 'v' })).rejects.toThrow(
      'OpenRouter key exchange failed: 400'
    );
  });

  it('throws when the response has no key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(exchangeCodeForKey({ code: 'c', codeVerifier: 'v' })).rejects.toThrow(
      'OpenRouter key exchange response missing key'
    );
  });
});

describe('connectOpenRouter', () => {
  beforeEach(() => {
    global.chrome = { identity: { getRedirectURL: () => 'https://abc.chromiumapp.org/' } };
  });

  it('runs the full flow: build url, launch auth, exchange code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ key: 'or-key-456' }) })
    );
    const launchWebAuthFlow = vi.fn(async (options) => {
      expect(options.url).toContain('https://openrouter.ai/auth?');
      return 'https://abc.chromiumapp.org/?code=auth-code-789';
    });

    const key = await connectOpenRouter(launchWebAuthFlow);

    expect(key).toBe('or-key-456');
    expect(launchWebAuthFlow).toHaveBeenCalledTimes(1);
  });

  it('throws when the redirect has no code', async () => {
    const launchWebAuthFlow = vi.fn(async () => 'https://abc.chromiumapp.org/?error=access_denied');
    await expect(connectOpenRouter(launchWebAuthFlow)).rejects.toThrow(
      'OpenRouter authorization did not return a code'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/oauth/openrouterOAuth.test.js`
Expected: FAIL — `src/lib/oauth/openrouterOAuth.js` does not exist.

- [ ] **Step 3: Implement `src/lib/oauth/openrouterOAuth.js`**

```js
const AUTH_URL = 'https://openrouter.ai/auth';
const KEY_EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
}

export async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthUrl({ callbackUrl, codeChallenge }) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('callback_url', callbackUrl);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeCodeForKey({ code, codeVerifier }) {
  const response = await fetch(KEY_EXCHANGE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter key exchange failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.key) {
    throw new Error('OpenRouter key exchange response missing key');
  }
  return data.key;
}

export async function connectOpenRouter(launchWebAuthFlow) {
  const callbackUrl = chrome.identity.getRedirectURL();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const authUrl = buildAuthUrl({ callbackUrl, codeChallenge });

  const redirectUrl = await launchWebAuthFlow({ url: authUrl, interactive: true });
  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) {
    throw new Error('OpenRouter authorization did not return a code');
  }

  return exchangeCodeForKey({ code, codeVerifier });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/oauth/openrouterOAuth.test.js`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/oauth/openrouterOAuth.js tests/oauth/openrouterOAuth.test.js
git commit -m "feat: add OpenRouter OAuth PKCE flow"
```

---

### Task 10: Background service worker

**Files:**
- Create: `background.js`
- Test: `tests/background.test.js`

**Interfaces:**
- Consumes: `connectOpenRouter` (Task 9), `getSettings`/`saveSettings` (Task 2).
- Produces: registers `chrome.action.onClicked` (opens side panel) and `chrome.runtime.onMessage` handling for `{ type: 'CONNECT_OPENROUTER' }`, responding with `{ ok: true }` or `{ ok: false, error: string }` — relied on by Task 11 (options page).

- [ ] **Step 1: Write failing tests**

```js
// tests/background.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/lib/oauth/openrouterOAuth.js', () => ({
  connectOpenRouter: vi.fn(),
}));
vi.mock('../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { connectOpenRouter } from '../src/lib/oauth/openrouterOAuth.js';
import { getSettings, saveSettings } from '../src/lib/storage.js';

function setupChromeMock() {
  const listeners = { onClicked: [], onMessage: [] };
  global.chrome = {
    action: {
      onClicked: { addListener: (fn) => listeners.onClicked.push(fn) },
    },
    sidePanel: { open: vi.fn() },
    runtime: {
      onMessage: { addListener: (fn) => listeners.onMessage.push(fn) },
      lastError: undefined,
    },
    identity: {
      launchWebAuthFlow: vi.fn(),
    },
  };
  return listeners;
}

describe('background.js', () => {
  let listeners;

  beforeEach(async () => {
    vi.resetModules();
    listeners = setupChromeMock();
    await import('../background.js');
  });

  it('opens the side panel when the action icon is clicked', () => {
    const onClicked = listeners.onClicked[0];
    onClicked({ id: 42 });
    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ tabId: 42 });
  });

  it('connects OpenRouter and saves the token on CONNECT_OPENROUTER message', async () => {
    connectOpenRouter.mockResolvedValue('new-or-key');
    getSettings.mockResolvedValue({ provider: null, openrouterToken: '' });

    const onMessage = listeners.onMessage[0];
    const sendResponse = vi.fn();
    const keepAlive = onMessage({ type: 'CONNECT_OPENROUTER' }, {}, sendResponse);

    expect(keepAlive).toBe(true);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

    expect(saveSettings).toHaveBeenCalledWith({ provider: null, openrouterToken: 'new-or-key' });
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it('responds with an error when the OAuth flow fails', async () => {
    connectOpenRouter.mockRejectedValue(new Error('user cancelled'));

    const onMessage = listeners.onMessage[0];
    const sendResponse = vi.fn();
    onMessage({ type: 'CONNECT_OPENROUTER' }, {}, sendResponse);

    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());
    expect(sendResponse).toHaveBeenCalledWith({ ok: false, error: 'user cancelled' });
  });

  it('ignores unrelated message types', () => {
    const onMessage = listeners.onMessage[0];
    const sendResponse = vi.fn();
    const keepAlive = onMessage({ type: 'SOMETHING_ELSE' }, {}, sendResponse);
    expect(keepAlive).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/background.test.js`
Expected: FAIL — `background.js` does not exist.

- [ ] **Step 3: Implement `background.js`**

```js
import { connectOpenRouter } from './src/lib/oauth/openrouterOAuth.js';
import { saveSettings, getSettings } from './src/lib/storage.js';

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

function launchWebAuthFlow(options) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(options, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'Auth flow cancelled'));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'CONNECT_OPENROUTER') return false;

  connectOpenRouter(launchWebAuthFlow)
    .then(async (key) => {
      const settings = await getSettings();
      await saveSettings({ ...settings, openrouterToken: key });
      sendResponse({ ok: true });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/background.test.js`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add background.js tests/background.test.js
git commit -m "feat: add background service worker (icon click + OpenRouter connect handler)"
```

---

### Task 11: Settings (options) page

**Files:**
- Create: `options/options.html`
- Create: `options/optionsPage.js`
- Create: `options/main.js`
- Test: `tests/options/optionsPage.test.js`

**Interfaces:**
- Consumes: `getSettings`/`saveSettings` (Task 2).
- Produces: `gatherSettingsFromForm(form: HTMLFormElement): Settings`, `renderSettingsToForm(form: HTMLFormElement, settings: Settings): void`, `initOptionsPage(form, connectButton, statusEl): Promise<void>` — exported from `optionsPage.js` for testing; `main.js` wires real DOM elements (not unit tested, covered by Task 13's manual smoke test).

- [ ] **Step 1: Create `options/options.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Research Companion Settings</title>
</head>
<body>
  <h1>Research Companion Settings</h1>

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
      <legend>API keys</legend>
      <label>Anthropic API key <input type="password" name="anthropicKey" /></label>
      <label>OpenAI API key <input type="password" name="openaiKey" /></label>
      <label>Gemini API key <input type="password" name="geminiKey" /></label>
    </fieldset>

    <fieldset>
      <legend>OpenRouter</legend>
      <button type="button" id="connect-openrouter">Connect to OpenRouter</button>
      <span id="openrouter-status"></span>
    </fieldset>

    <label>
      Brave Search API key
      <input type="password" name="braveSearchKey" />
    </label>

    <label>
      Number of results
      <input type="number" name="resultsCount" min="1" max="20" />
    </label>
  </form>

  <script type="module" src="./main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write failing tests for `optionsPage.js`**

```js
// tests/options/optionsPage.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { getSettings, saveSettings } from '../../src/lib/storage.js';
import { gatherSettingsFromForm, renderSettingsToForm, initOptionsPage } from '../../options/optionsPage.js';

function buildForm() {
  document.body.innerHTML = `
    <form id="settings-form">
      <select name="provider">
        <option value="">-- choose --</option>
        <option value="anthropic">Anthropic</option>
      </select>
      <input type="text" name="model" />
      <input type="password" name="anthropicKey" />
      <input type="password" name="openaiKey" />
      <input type="password" name="geminiKey" />
      <input type="password" name="braveSearchKey" />
      <input type="number" name="resultsCount" />
    </form>
    <button type="button" id="connect-openrouter">Connect</button>
    <span id="openrouter-status"></span>
  `;
  return document.getElementById('settings-form');
}

describe('gatherSettingsFromForm', () => {
  it('reads form fields into a settings object', () => {
    const form = buildForm();
    form.provider.value = 'anthropic';
    form.model.value = 'claude-3-5-sonnet-20241022';
    form.anthropicKey.value = 'a-key';
    form.braveSearchKey.value = 'b-key';
    form.resultsCount.value = '10';

    const settings = gatherSettingsFromForm(form);

    expect(settings).toEqual({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKeys: { anthropic: 'a-key', openai: '', gemini: '' },
      braveSearchKey: 'b-key',
      resultsCount: 10,
    });
  });

  it('defaults resultsCount to 8 when blank or invalid', () => {
    const form = buildForm();
    form.resultsCount.value = '';
    expect(gatherSettingsFromForm(form).resultsCount).toBe(8);
  });
});

describe('renderSettingsToForm', () => {
  it('populates form fields from a settings object', () => {
    const form = buildForm();
    renderSettingsToForm(form, {
      provider: 'anthropic',
      model: 'm1',
      apiKeys: { anthropic: 'a-key', openai: 'o-key', gemini: 'g-key' },
      braveSearchKey: 'b-key',
      resultsCount: 5,
    });

    expect(form.provider.value).toBe('anthropic');
    expect(form.model.value).toBe('m1');
    expect(form.anthropicKey.value).toBe('a-key');
    expect(form.braveSearchKey.value).toBe('b-key');
    expect(form.resultsCount.value).toBe('5');
  });
});

describe('initOptionsPage', () => {
  beforeEach(() => {
    global.chrome = { runtime: { sendMessage: vi.fn() } };
  });

  it('loads settings into the form and reflects openrouter connection status', async () => {
    getSettings.mockResolvedValue({
      provider: 'openrouter',
      model: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: 'or-token',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    expect(statusEl.textContent).toBe('OpenRouter: connected');
  });

  it('shows not connected when there is no openrouter token', async () => {
    getSettings.mockResolvedValue({
      provider: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    expect(statusEl.textContent).toBe('OpenRouter: not connected');
  });

  it('saves settings on form change', async () => {
    getSettings.mockResolvedValue({
      provider: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');
    await initOptionsPage(form, connectButton, statusEl);

    form.braveSearchKey.value = 'new-key';
    form.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());

    expect(saveSettings.mock.calls.at(-1)[0].braveSearchKey).toBe('new-key');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/options/optionsPage.test.js`
Expected: FAIL — `options/optionsPage.js` does not exist.

- [ ] **Step 4: Implement `options/optionsPage.js`**

```js
import { getSettings, saveSettings } from '../src/lib/storage.js';

export function gatherSettingsFromForm(form) {
  return {
    provider: form.provider.value || null,
    model: form.model.value || null,
    apiKeys: {
      anthropic: form.anthropicKey.value,
      openai: form.openaiKey.value,
      gemini: form.geminiKey.value,
    },
    braveSearchKey: form.braveSearchKey.value,
    resultsCount: Number(form.resultsCount.value) || 8,
  };
}

export function renderSettingsToForm(form, settings) {
  form.provider.value = settings.provider || '';
  form.model.value = settings.model || '';
  form.anthropicKey.value = settings.apiKeys?.anthropic || '';
  form.openaiKey.value = settings.apiKeys?.openai || '';
  form.geminiKey.value = settings.apiKeys?.gemini || '';
  form.braveSearchKey.value = settings.braveSearchKey || '';
  form.resultsCount.value = settings.resultsCount ?? 8;
}

export async function initOptionsPage(form, connectButton, statusEl) {
  const settings = await getSettings();
  renderSettingsToForm(form, settings);
  statusEl.textContent = settings.openrouterToken ? 'OpenRouter: connected' : 'OpenRouter: not connected';

  form.addEventListener('change', async () => {
    const current = await getSettings();
    await saveSettings({ ...current, ...gatherSettingsFromForm(form) });
  });

  connectButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CONNECT_OPENROUTER' }, (response) => {
      statusEl.textContent = response?.ok
        ? 'OpenRouter: connected'
        : `OpenRouter: connection failed (${response?.error || 'unknown error'})`;
    });
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/options/optionsPage.test.js`
Expected: PASS — 7 tests passed.

- [ ] **Step 6: Create `options/main.js` (bootstrap, not unit tested)**

```js
import { initOptionsPage } from './optionsPage.js';

const form = document.getElementById('settings-form');
const connectButton = document.getElementById('connect-openrouter');
const statusEl = document.getElementById('openrouter-status');

initOptionsPage(form, connectButton, statusEl);
```

- [ ] **Step 7: Commit**

```bash
git add options/
git commit -m "feat: add settings page (provider keys, OpenRouter connect, search key)"
```

---

### Task 12: Side panel UI

**Files:**
- Create: `sidepanel/sidepanel.html`
- Create: `sidepanel/sidepanelPage.js`
- Create: `sidepanel/main.js`
- Test: `tests/sidepanel/sidepanelPage.test.js`

**Interfaces:**
- Consumes: `getSettings`/`addHistoryEntry`/`getHistory` (Task 2), `runPipeline` (Task 8), `getCompletion` (Task 6), `search` (Task 7), `chrome.scripting.executeScript`/`chrome.runtime.onMessage` (the `EXTRACTION_RESULT` message from Task 4's content script).
- Produces: render functions (`renderLoading`, `renderSetupPrompt`, `renderNoContent`, `renderNoResults`, `renderError`, `renderResults`, `renderHistoryList`) and `analyzeActiveTab(...)` — used by `main.js`.

- [ ] **Step 1: Create `sidepanel/sidepanel.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Research Companion</title>
</head>
<body>
  <h1>Research Companion</h1>
  <div id="results"></div>

  <h2>History</h2>
  <ul id="history-list"></ul>

  <script type="module" src="./main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write failing tests for the render functions**

```js
// tests/sidepanel/sidepanelPage.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  getHistory: vi.fn(),
  addHistoryEntry: vi.fn(),
}));
vi.mock('../../src/lib/pipeline.js', () => ({ runPipeline: vi.fn() }));
vi.mock('../../src/lib/llm/index.js', () => ({ getCompletion: vi.fn() }));
vi.mock('../../src/lib/search/brave.js', () => ({ search: vi.fn() }));

import { getSettings, addHistoryEntry } from '../../src/lib/storage.js';
import { runPipeline } from '../../src/lib/pipeline.js';
import {
  renderLoading,
  renderSetupPrompt,
  renderNoContent,
  renderNoResults,
  renderError,
  renderResults,
  renderHistoryList,
  requestExtraction,
  analyzeActiveTab,
} from '../../sidepanel/sidepanelPage.js';

describe('render functions', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renderLoading shows the given status text', () => {
    renderLoading(container, 'Reading page...');
    expect(container.textContent).toContain('Reading page...');
  });

  it('renderSetupPrompt links to settings', () => {
    renderSetupPrompt(container);
    expect(container.querySelector('#open-settings')).not.toBeNull();
  });

  it('renderNoContent shows the no-content message', () => {
    renderNoContent(container);
    expect(container.textContent).toContain("Couldn't find readable content");
  });

  it('renderNoResults shows the no-results message', () => {
    renderNoResults(container);
    expect(container.textContent).toContain('No similar results found');
  });

  it('renderError shows the message and wires a retry button', () => {
    const onRetry = vi.fn();
    renderError(container, 'Something broke', onRetry);
    container.querySelector('#retry-button').click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renderResults renders each result with title, snippet, and relevance', () => {
    renderResults(container, [
      { title: 'A', url: 'https://a.com', snippet: 'snip', relevance: 'because reasons' },
    ]);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('snip');
    expect(container.textContent).toContain('because reasons');
    expect(container.querySelector('a').href).toBe('https://a.com/');
  });

  it('renderHistoryList renders entries and wires click selection', () => {
    const onSelect = vi.fn();
    renderHistoryList(
      container,
      [{ id: '1', sourcePage: { title: 'Past page', url: 'https://past.com' } }],
      onSelect
    );
    container.querySelector('li').click();
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});

describe('requestExtraction', () => {
  it('resolves with the EXTRACTION_RESULT payload after injecting the content script', async () => {
    const listeners = [];
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: (fn) => listeners.push(fn),
          removeListener: (fn) => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          },
        },
      },
      scripting: {
        executeScript: vi.fn().mockImplementation(async () => {
          listeners[0]({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'X', confidence: 'high' } });
          return [];
        }),
      },
    };

    const result = await requestExtraction(7);

    expect(result).toEqual({ title: 'T', url: 'U', text: 'X', confidence: 'high' });
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['dist/content.bundled.js'],
    });
  });
});

describe('analyzeActiveTab', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: { onMessage: { addListener: vi.fn(), removeListener: vi.fn() } },
      scripting: { executeScript: vi.fn() },
    };
  });

  it('returns not-configured when no provider/search key is set', async () => {
    getSettings.mockResolvedValue({ provider: null, braveSearchKey: '' });

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'not-configured' });
  });

  it('renders no-content when extraction confidence is low', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k' });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: '', confidence: 'low' } });
    });
    const renderNoContentFn = vi.fn();

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn,
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'no-content' });
    expect(renderNoContentFn).toHaveBeenCalledTimes(1);
  });

  it('runs the pipeline, renders results, and saves history on success', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } });
    });
    const results = [{ title: 'R', url: 'https://r.com', snippet: 's', relevance: 'rel' }];
    runPipeline.mockResolvedValue(results);
    const renderResultsFn = vi.fn();

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn,
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'success', results });
    expect(renderResultsFn).toHaveBeenCalledWith(results);
    expect(addHistoryEntry).toHaveBeenCalledTimes(1);
    expect(addHistoryEntry.mock.calls[0][0].sourcePage).toEqual({ title: 'T', url: 'U' });
  });

  it('renders no-results when the pipeline returns an empty array', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } });
    });
    runPipeline.mockResolvedValue([]);
    const renderNoResultsFn = vi.fn();

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn: vi.fn(),
      renderNoResultsFn,
    });

    expect(outcome).toEqual({ status: 'no-results' });
    expect(renderNoResultsFn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/sidepanel/sidepanelPage.test.js`
Expected: FAIL — `sidepanel/sidepanelPage.js` does not exist.

- [ ] **Step 4: Implement `sidepanel/sidepanelPage.js`**

```js
import { getSettings, addHistoryEntry } from '../src/lib/storage.js';
import { runPipeline } from '../src/lib/pipeline.js';
import { getCompletion } from '../src/lib/llm/index.js';
import { search as braveSearch } from '../src/lib/search/brave.js';

export function renderLoading(container, statusText) {
  container.innerHTML = `<p class="status">${statusText}</p>`;
}

export function renderSetupPrompt(container) {
  container.innerHTML =
    '<p class="setup-prompt">Set up a provider and Brave Search key in <a href="/options/options.html" id="open-settings">Settings</a> to get started.</p>';
}

export function renderNoContent(container) {
  container.innerHTML = '<p class="status">Couldn\'t find readable content on this page.</p>';
}

export function renderNoResults(container) {
  container.innerHTML = '<p class="status">No similar results found.</p>';
}

export function renderError(container, message, onRetry) {
  container.innerHTML = `<p class="error">${message}</p><button id="retry-button">Retry</button>`;
  container.querySelector('#retry-button').addEventListener('click', onRetry);
}

export function renderResults(container, results) {
  container.innerHTML = results
    .map(
      (r) => `
      <article class="result">
        <a href="${r.url}" target="_blank" rel="noopener">${r.title}</a>
        <p class="snippet">${r.snippet}</p>
        <p class="relevance">${r.relevance}</p>
      </article>`
    )
    .join('');
}

export function renderHistoryList(container, entries, onSelect) {
  container.innerHTML = entries.map((entry) => `<li data-id="${entry.id}">${entry.sourcePage.title}</li>`).join('');
  container.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => onSelect(li.dataset.id));
  });
}

export function requestExtraction(tabId) {
  return new Promise((resolve, reject) => {
    const listener = (message) => {
      if (message.type === 'EXTRACTION_RESULT') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    chrome.scripting.executeScript({ target: { tabId }, files: ['dist/content.bundled.js'] }).catch((error) => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(error);
    });
  });
}

export async function analyzeActiveTab({ tabId, renderStatus, renderResultsFn, renderNoContentFn, renderNoResultsFn }) {
  const settings = await getSettings();
  if (!settings.provider || !settings.braveSearchKey) {
    return { status: 'not-configured' };
  }

  renderStatus('Reading page...');
  const extraction = await requestExtraction(tabId);
  if (extraction.confidence === 'low') {
    renderNoContentFn();
    return { status: 'no-content' };
  }

  renderStatus('Searching...');
  const llmClient = { complete: (prompt) => getCompletion(settings, prompt) };
  const searchClient = { search: (query) => braveSearch({ apiKey: settings.braveSearchKey, query }) };

  renderStatus('Ranking results...');
  const results = await runPipeline({
    pageTitle: extraction.title,
    pageUrl: extraction.url,
    articleText: extraction.text,
    llmClient,
    searchClient,
    resultsCount: settings.resultsCount,
  });

  if (results.length === 0) {
    renderNoResultsFn();
    return { status: 'no-results' };
  }

  renderResultsFn(results);
  await addHistoryEntry({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    sourcePage: { title: extraction.title, url: extraction.url },
    results,
  });

  return { status: 'success', results };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/sidepanel/sidepanelPage.test.js`
Expected: PASS — 14 tests passed.

- [ ] **Step 6: Create `sidepanel/main.js` (bootstrap, not unit tested)**

```js
import {
  analyzeActiveTab,
  renderLoading,
  renderSetupPrompt,
  renderResults,
  renderNoContent,
  renderNoResults,
  renderError,
  renderHistoryList,
} from './sidepanelPage.js';
import { getHistory } from '../src/lib/storage.js';

const resultsContainer = document.getElementById('results');
const historyContainer = document.getElementById('history-list');

async function run() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const outcome = await analyzeActiveTab({
      tabId: tab.id,
      renderStatus: (text) => renderLoading(resultsContainer, text),
      renderResultsFn: (results) => renderResults(resultsContainer, results),
      renderNoContentFn: () => renderNoContent(resultsContainer),
      renderNoResultsFn: () => renderNoResults(resultsContainer),
    });
    if (outcome.status === 'not-configured') {
      renderSetupPrompt(resultsContainer);
    }
  } catch (error) {
    renderError(resultsContainer, error.message, run);
  }

  const history = await getHistory();
  renderHistoryList(historyContainer, history, (id) => {
    const entry = history.find((h) => h.id === id);
    if (entry) renderResults(resultsContainer, entry.results);
  });
}

run();
```

- [ ] **Step 7: Commit**

```bash
git add sidepanel/
git commit -m "feat: add side panel UI (pipeline orchestration, results, history)"
```

---

### Task 13: Manual smoke test (load unpacked extension end-to-end)

**Files:**
- Create: `README.md` (setup + smoke test instructions)

This task has no automated test — it's the manual verification step from the TRD, covering the OAuth popup UI and real-world page extraction that can't be exercised by Vitest.

- [ ] **Step 1: Build the content script bundle**

Run: `npm run build`
Expected: `dist/content.bundled.js` created with no errors.

- [ ] **Step 2: Write `README.md`**

```markdown
# Research Companion

A Chrome extension that suggests similar webpages, reports, and articles to whatever you're currently reading.

## Setup

1. `npm install`
2. `npm run build` (bundles the content script into `dist/content.bundled.js`)
3. Open `chrome://extensions`, enable "Developer mode", click "Load unpacked", and select this project's root folder.
4. Click the extension's "Details" → "Extension options" (or right-click the toolbar icon → Options) to open Settings.
5. Connect a provider: click "Connect to OpenRouter", or paste an Anthropic/OpenAI/Gemini API key.
6. Paste a Brave Search API key.
7. Select the connected provider from the "LLM provider" dropdown and save.

## Manual smoke test

Run through this checklist after any change to `sidepanel/`, `background.js`, or `src/lib/`:

- [ ] Visit a real news article or blog post. Click the toolbar icon.
- [ ] Side panel opens and shows "Reading page...", then "Searching...", then "Ranking results...".
- [ ] Results appear with title, snippet, and a relevance note; clicking a result opens it in a new tab.
- [ ] Close and reopen the side panel; the History list shows the page you just analyzed.
- [ ] Click a history entry; its saved results re-render without a new network call (check the Network tab in DevTools — no new fetches to the LLM/search APIs).
- [ ] Visit a PDF (e.g. any `.pdf` URL) or a heavily paywalled page. Click the icon. Confirm "Couldn't find readable content on this page" appears instead of an error.
- [ ] In Settings, clear the Brave Search key, save, reopen the side panel on an article. Confirm the setup prompt appears instead of attempting analysis.
- [ ] In Settings, click "Connect to OpenRouter". Confirm the OAuth popup opens, approving it returns to the extension, and the status updates to "OpenRouter: connected".
```

- [ ] **Step 3: Run the full automated test suite**

Run: `npm test`
Expected: PASS — all tests across all files pass (storage, extraction, contentEntry, llm/*, search/brave, pipeline, oauth, background, options/optionsPage, sidepanel/sidepanelPage).

- [ ] **Step 4: Walk through the manual smoke test checklist in `README.md` against a real Chrome profile**

This requires real API keys (at least one LLM provider + Brave Search) and loading the unpacked extension as described in the README. Check off each item as verified.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: add setup instructions and manual smoke test checklist"
```

---

## Self-Review

**Spec coverage:**
- On-demand analysis (icon click) → Task 10 (`chrome.action.onClicked`) + Task 12 (`analyzeActiveTab`).
- Topic-aware discovery from full readable text → Task 3 (extraction) + Task 8 (pipeline's query prompt).
- Web-wide search via Brave → Task 7.
- Relevance explanations → Task 8 (rerank prompt + JSON shape).
- Side panel UI → Task 12.
- Multi-provider LLM support (Anthropic/OpenAI/Gemini API key, OpenRouter OAuth) → Task 5, 6, 9.
- Local history, capped at 50 → Task 2.
- Settings page → Task 11.
- Error handling table from TRD (no content / LLM failure / no search results / not configured) → Task 12's `analyzeActiveTab` states, all covered.
- Testing approach (extraction fixtures, mocked pipeline logic, manual smoke test, no E2E automation) → Tasks 3, 5-12, 13.

No spec requirement found without a corresponding task.

**Placeholder scan:** no "TBD"/"TODO" strings; every step has complete, runnable code; no "similar to Task N" shortcuts — provider modules in Task 5 are each written out in full despite their structural similarity, since the engineer may implement them out of order.

**Type/signature consistency check:**
- `Settings` shape from Task 2 (`provider`, `model`, `apiKeys.{anthropic,openai,gemini}`, `openrouterToken`, `braveSearchKey`, `resultsCount`) is used identically in Task 6 (`getCompletion`), Task 11 (`gatherSettingsFromForm`/`renderSettingsToForm`), and Task 12 (`analyzeActiveTab`).
- `complete({ apiKey, model, prompt })` signature is identical across all four Task 5 modules and consumed identically in Task 6.
- `runPipeline`'s `llmClient`/`searchClient` injected interfaces (`{ complete(prompt) }` / `{ search(query) }`) match exactly what Task 12 constructs from Task 6/Task 7.
- `HistoryEntry` shape (`id`, `timestamp`, `sourcePage: {title,url}`, `results`) matches between Task 2's storage tests and Task 12's `addHistoryEntry` call.
- The `EXTRACTION_RESULT` message shape (`{ type, payload: { title, url, text, confidence } }`) matches between Task 4 (sender) and Task 12 (receiver in `requestExtraction`).

No inconsistencies found.

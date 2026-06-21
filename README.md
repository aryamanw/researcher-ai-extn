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

## Privacy policy

https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html

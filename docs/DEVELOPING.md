# Developing Research Companion

## Setup

```sh
npm install
npm run build   # bundles the content script into dist/content.bundled.js
npm test
```

Then load the project root as an unpacked extension: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the repo root.

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

## Chrome Web Store packaging

To prepare a release for the Chrome Web Store: run `npm run generate:icons` to regenerate icon assets (icon16.png, icon48.png, icon128.png), `npm run capture:screenshots` to regenerate store preview images (screenshot-sidepanel.png and screenshot-options.png), and `npm run package` to build and zip the extension into `research-companion-v{version}.zip`. For all listing copy, permission justifications, and submission guidelines, see [chrome-web-store-listing.md](chrome-web-store-listing.md).

## Cutting a GitHub release

1. Bump `version` in `package.json`.
2. Commit and push to `main`.
3. Tag the commit `vX.Y.Z` (matching `package.json`'s version) and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The [Release workflow](../.github/workflows/release.yml) runs the test suite, verifies the tag matches `package.json`, builds, and attaches `research-companion-vX.Y.Z.zip` to a new [GitHub Release](https://github.com/aryamanw/researcher-ai-extn/releases) automatically.

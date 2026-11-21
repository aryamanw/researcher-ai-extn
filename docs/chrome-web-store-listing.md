# Chrome Web Store listing: Research Companion

Copy-paste reference for the Developer Dashboard (https://chrome.google.com/webstore/devconsole). Visibility: **Public**. Package: `npm run package` produces `research-companion-vX.Y.Z.zip` (manifest version must match `package.json`; the script checks this and verifies every referenced file is in the zip; the zip also ships LICENSE and THIRD_PARTY_NOTICES.md for the bundled Readability license).

Requirements verified against developer.chrome.com/docs/webstore/images: only the 128x128 store icon (inside the zip) and at least one screenshot are mandatory. The small promo tile (440x280) is optional, but listings without one are ranked after listings that have one, so upload it. The marquee (1400x560) is optional and only needed to be featured.

## Store listing tab

**Name** (from manifest, max 75): `Research Companion`

**Summary** (from manifest `description`, max 132; this one is 79 chars):
> Suggests similar webpages, reports, and articles to what you're currently reading.

**Detailed description:**
```
Research Companion is a side-panel research assistant for anyone deep in an article, report, or blog post.

Click the toolbar icon and it reads the page you're on, then uses your chosen AI provider's built-in web search to find related coverage, source material, and alternate perspectives. Each result comes with a one-line note explaining why it's relevant. Past sessions are saved locally so reopening the panel never repeats a search.

HOW IT WORKS
- Click the toolbar icon (or press Alt+Shift+R to re-run). Nothing happens until you do.
- The readable text of the current tab is extracted in your browser and sent directly to the provider you picked: Anthropic, OpenAI, Google Gemini, OpenRouter, DeepSeek, Kimi, xAI, Ollama Cloud, Together AI, Hugging Face, Cerebras, or OpenCode Zen. Providers without built-in web search (Ollama Cloud, Together AI, Hugging Face, Cerebras, OpenCode Zen) use your own Exa or Tavily search key; only the AI-written search queries go to Exa or Tavily, never the page text or URL.
- Related pages appear in the side panel, ranked by relevance.

BRING YOUR OWN KEY
You use your own API key for any supported provider, or sign in with OpenRouter. There is no developer-run backend, no account, no analytics, and no ads. Your page content and credentials never pass through any server operated by the developer. You pay your provider directly for usage.

PRIVATE BY DESIGN
- Runs only when you click. No background reading of tabs, no auto-triggering.
- API keys and history stay in local browser storage on your device.
- No tracking, no data sale. Page text goes only to the provider you select.

Requires an API key from a supported provider (plus a free Exa or Tavily key for providers without built-in search), or an OpenRouter account.

Privacy policy: https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html
Terms: https://aryamanw.github.io/researcher-ai-extn/terms.html
```

**Category:** Productivity (Workflow & Planning). **Language:** English.

## Graphic assets tab

| Asset | Required | File |
|---|---|---|
| Store icon 128x128 | Yes | `icons/icon128.png` (taken from the zip) |
| Screenshots 1280x800 (1 to 5) | Yes, at least 1 | `store-assets/screenshot-sidepanel.png`, `store-assets/screenshot-options.png` |
| Small promo tile 440x280 | No (improves placement) | `store-assets/promo-small-440x280.png` |
| Marquee 1400x560 | No | none |

Regenerate all with `node scripts/capture-screenshots.mjs` (needs `npx playwright install chromium-headless-shell` once). Sources are in `scripts/screenshots/`. Chrome wants full-bleed screenshots with no padding; the current ones show the UI centered on grey, which is accepted but a real side-panel-next-to-article screenshot would convert better.

## Privacy practices tab

**Single purpose description:**
> Reads the page in the user's active tab, only when the user clicks the toolbar icon or presses the shortcut, and uses the user's chosen AI provider's web search to show related webpages, reports, and articles in the side panel.

**Permission justifications** (these match `manifest.json` exactly):

| Permission | Justification |
|---|---|
| `sidePanel` | Shows the results and history in Chrome's side panel, the extension's only UI surface. `chrome.sidePanel.open` is called when the user clicks the toolbar icon or uses the keyboard shortcut. |
| `scripting` | Calls `chrome.scripting.executeScript` once, after the user's click, to inject a bundled content script into the active tab that extracts the readable article text used to find related pages. |
| `activeTab` | Grants temporary access to only the tab the user is viewing, only after they click the icon or use the shortcut, so `scripting` can run without any broad host permission for web pages. |
| `storage` | Saves the user's provider, model, API keys, result count, and past research history in `chrome.storage.local` on the device. Nothing is synced or sent to the developer. |
| `identity` | Used only for `chrome.identity.launchWebAuthFlow` and `getRedirectURL` in the OpenRouter "Connect" sign-in (OAuth PKCE), so users can authorize OpenRouter without pasting a key. |
| Host permissions: `https://api.anthropic.com/*`, `https://api.openai.com/*`, `https://generativelanguage.googleapis.com/*`, `https://openrouter.ai/*` | The extension calls these LLM provider APIs directly from the browser, with the user's own credentials, to run web search and write relevance notes. The user selects one provider; no other domains are contacted. There is no developer server. |
| `optional_host_permissions` (DeepSeek, Kimi, xAI, Ollama Cloud, Together AI, Hugging Face, Cerebras, OpenCode Zen, Exa, Tavily API hosts) | Requested at runtime only when the user selects that provider or search service in Settings; lets the extension call that service's API with the user's own key. |

**Remote code:** No, I am not using remote code. All JavaScript ships in the package (CSP: `script-src 'self'; object-src 'self'`); the extension only sends data to and reads JSON from the provider APIs above.

**Data usage (check these):**
- Website content: YES. The title and readable text (first 12,000 characters) of the page the user is viewing are sent to the user's chosen LLM provider on explicit click to generate results. The page URL is not sent.
- Authentication information: YES. User-supplied API keys / OpenRouter key, stored locally and sent only to the matching provider.
- Not collected: Personally identifiable information, Health information, Financial and payment information, Personal communications, Location, Web history, User activity.

Why "Web history" stays unchecked: the side panel keeps a local list of past searches (page title + URL) in `chrome.storage.local`, but it never leaves the device and the URL is not sent to the provider. Chrome's disclosure covers data the item collects or transmits; the privacy policy describes the local history explicitly.

**Certifications (check all three):**
1. I do not sell or transfer user data to third parties, outside of the approved use cases. (Sending page content to the user's chosen provider is the user-directed, core function.)
2. I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
3. I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html (includes the Chrome Web Store Limited Use affirmation; terms at https://aryamanw.github.io/researcher-ai-extn/terms.html)

## Distribution tab

- **Visibility:** Public
- **Regions:** All regions (default)
- **Pricing:** Free (no in-app purchases)
- **Support URL:** https://github.com/aryamanw/researcher-ai-extn/issues
- **Homepage URL** (also `homepage_url` in the manifest): https://aryamanw.github.io/researcher-ai-extn/
- **Terms of service URL (optional, put in description/support):** https://aryamanw.github.io/researcher-ai-extn/terms.html
- **Contact email:** set and verify in Account settings (required before publishing).

## Test instructions (Privacy practices tab, "Test instructions" field)

Reviewers can't use the extension without a provider key. Create an **Anthropic** API key with a low monthly spend limit (for example $5) at https://console.anthropic.com/settings/keys, paste it in place of `<TEST_KEY_HERE>` **only in the dashboard field** (never commit it), and revoke it once the review is approved.

```
Research Companion needs an AI provider key to work. There is no account or login for the extension itself.

1. Right-click the toolbar icon and choose Options.
2. LLM provider: choose "Anthropic". Anthropic API key: paste <TEST_KEY_HERE> (spend-limited test key, revoked after review). Settings save automatically.
3. Open any article, for example https://en.wikipedia.org/wiki/Reading_(process).
4. Click the Research Companion toolbar icon. The side panel opens, reads the page, and lists related pages, each with a "Why this" note. Alt+Shift+R (Option+Shift+R on Mac) re-runs the search.
5. Past searches appear under History in the panel; "Clear" deletes them. "Remove saved keys" in Options deletes the stored key.

The extension reads the tab only after you click the icon. There is no backend; requests go directly from the browser to the selected provider.
```

## Pre-submit checklist

- [ ] `npm test` and `npm run package` pass; upload the zip.
- [ ] Sidepanel hint text matches the manifest shortcut (Alt+Shift+R).
- [ ] Privacy policy and terms URLs return 200 **with the new content** (push to `main` first; GitHub Pages deploys from `/docs`).
- [ ] Developer account: contact email verified, 2-step verification on.
- [ ] Screenshots uploaded, promo tile uploaded, test instructions filled, "Public" selected, then Submit for review.

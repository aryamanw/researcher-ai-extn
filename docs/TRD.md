# TRD: Research Companion Chrome Extension

**Status:** Approved for planning
**Date:** 2026-06-20
**Companion docs:** [PRD.md](./PRD.md), [APP-FLOW.md](./APP-FLOW.md)

## Platform

- Chrome Extension, Manifest V3.
- No backend server. All API calls (LLM, search) made directly from the extension using the user's own credentials.

## Architecture decision: side panel orchestrates directly

MV3 background service workers are short-lived and can be terminated mid-task, which is risky for a multi-step pipeline (extract → LLM call → search call → LLM rerank) that can take several seconds.

**Chosen approach:** the side panel page — which persists for as long as it's open — does all orchestration: requests page extraction, calls the LLM, calls the search API, calls the LLM again for reranking, and renders results. The background service worker's role is reduced to opening the side panel and handling the OpenRouter OAuth redirect.

Rejected alternative: background service worker orchestrates the pipeline and pushes results to the side panel via messaging. Rejected because MV3's service worker lifecycle adds failure modes (worker killed mid-pipeline) without a corresponding benefit for a manually-triggered, foreground-only flow.

## Components

### `manifest.json`
- `manifest_version: 3`
- Permissions: `sidePanel`, `scripting`, `storage`, `activeTab`, `identity` (for OAuth)
- No broad host permissions — content script is injected on demand via `chrome.scripting.executeScript`, scoped to `activeTab`.

### Content script (`content.js`)
- Injected on demand (icon click), not persistently running on every page.
- Extracts: page title, URL, and main readable article text using a readability-style algorithm (strip nav/ads/sidebars/scripts, keep article body).
- Returns extracted data to the caller; returns a low-confidence/empty signal if no substantial article content is found.

### Side panel (`sidepanel.html` / `sidepanel.js`)
Owns the full pipeline:
1. Request extraction from the active tab's content script.
2. If extraction is empty/low-confidence → show "Couldn't find readable content on this page", stop.
3. Call configured LLM: prompt to identify the core topic and generate 2-4 search queries.
4. Call Brave Search API with each query; merge and dedupe candidates by URL.
5. Call configured LLM again: rank candidates, write a one-line relevance note for each, drop irrelevant ones.
6. Render final list (title, source domain, snippet, relevance note, link).
7. Write session to `chrome.storage.local` history (capped at 50, oldest evicted).
8. Render a history view (list of past sessions) accessible from the same panel; selecting a past session re-renders its stored results without re-fetching.

### Background service worker (`background.js`)
- `chrome.action.onClicked` → `chrome.sidePanel.open({ tabId })`.
- Hosts the OpenRouter OAuth PKCE flow via `chrome.identity.launchWebAuthFlow`: initiates the flow, captures the redirect, exchanges the code for a key, stores it via `chrome.storage.local`.
- No pipeline/orchestration logic.

### Settings page (`options.html` / `options.js`)
- LLM provider connection:
  - OpenRouter: "Connect" button triggers OAuth flow (no key pasting).
  - Anthropic / OpenAI / Gemini: plain text input to paste an API key.
  - Dropdown to select which *connected* provider/model the pipeline should use.
- Brave Search API key: plain text input.
- Results-count preference (default 8).
- If no provider or no search key is configured, the side panel shows a setup prompt linking here instead of attempting the pipeline.

### Storage (`chrome.storage.local`)
Used (not `storage.sync`, to keep keys/tokens off Chrome Sync):
- `settings`: { provider, model, apiKeys: {...}, braveSearchKey, resultsCount }
- `openrouterToken`: OAuth token from the PKCE exchange
- `history`: array of session entries (see APP-FLOW.md for shape), capped at 50

## Auth & API key management

- **OpenRouter:** OAuth PKCE via `chrome.identity.launchWebAuthFlow`. Public-client flow — no backend required to complete the code exchange.
- **Anthropic / OpenAI / Gemini:** user pastes an API key in settings; stored locally only.
- **Brave Search:** user pastes an API key in settings; stored locally only.

## Error handling

| Condition | Behavior |
|---|---|
| No extractable article text | Skip pipeline; show "Couldn't find readable content on this page" |
| LLM call fails (bad key, rate limit, network) | Show inline error + retry button; nothing written to history |
| Search API fails or returns zero results | Show "No similar results found" (not treated as an error state) |
| No provider/search key configured | Show setup prompt linking to Settings; pipeline never attempted |

## Testing approach

- **Content extraction:** unit tests against saved static HTML fixtures — a news article, a blog post, a PDF-viewer page, a paywalled stub — verifying the readability extraction behaves sensibly on each.
- **Pipeline logic** (query generation, reranking, history read/write): unit-tested as plain JS modules with mocked LLM/Search API responses.
- **Manual smoke test:** load unpacked extension, visit real articles, click icon, confirm panel opens, results render, history persists across panel close/reopen.
- No E2E browser automation in v1 (e.g. Puppeteer) — not justified at single-developer-tool scale.

## Tech stack notes

- Plain JS (or TypeScript — to be decided at implementation-plan stage) modules for side panel logic, to keep pipeline steps independently testable.
- No frontend framework required for v1 given the UI surface is a single list view + settings form + history view.

# APP-FLOW: Research Companion Chrome Extension

**Status:** Approved for planning
**Date:** 2026-06-20
**Companion docs:** [PRD.md](./PRD.md), [TRD.md](./TRD.md)

## First-time setup flow

1. User installs the extension.
2. User opens Settings (`options.html`), either via the extensions page or a first-run prompt in the side panel.
3. User connects a provider:
   - Clicks "Connect" under OpenRouter → OAuth popup → approves → returns to settings, connected. **or**
   - Pastes an API key for Anthropic, OpenAI, or Gemini.
4. User pastes a Brave Search API key.
5. (Optional) adjusts results-count preference (default 8).
6. Settings saved to `chrome.storage.local`.

## Main research flow

```text
User reading a page
      |
      v
Click extension icon -------------------> chrome.sidePanel.open()
      |                                          |
      v                                          v
                                          Side panel opens
                                                  |
                                                  v
                                   Side panel requests extraction
                                   from active tab's content script
                                                  |
                        +-------------------------+-------------------------+
                        |                                                   |
                  Extraction succeeds                              Extraction empty/low-confidence
                        |                                                   |
                        v                                                   v
        LLM call: identify topic,                          Show "Couldn't find readable
        generate 2-4 search queries                          content on this page" — stop
                        |
                        v
        Brave Search API call(s),
        merge + dedupe candidates by URL
                        |
                        v
        LLM call: rank candidates, drop
        irrelevant ones, write 1-line
        relevance note per result
                        |
                        v
        Render results list (title, source,
        snippet, relevance note, link)
                        |
                        v
        Write session to local history
        (capped at 50, oldest evicted)
```

## UI states (side panel)

1. **Empty / not configured** — no provider or search key set → prompt with link to Settings.
2. **Idle / ready** — momentary state right after the panel opens and before the pipeline starts. Since the icon click is itself the manual trigger, the pipeline begins automatically as soon as the panel opens (no separate "Analyze" button) and transitions immediately to Loading. The History tab is accessible from this and every other state.
3. **Loading** — pipeline in progress; show step-aware status (e.g. "Reading page...", "Searching...", "Ranking results...") rather than a generic spinner, since the pipeline has multiple network calls.
4. **Results** — list of suggested pages with title, source domain, snippet, relevance note, and link (opens in new tab on click).
5. **No results** — search returned nothing relevant → "No similar results found."
6. **Error** — LLM or search call failed → inline error message + retry button.
7. **History** — list of past sessions (source page title + timestamp); selecting one shows its stored results (read from storage, no re-fetch).

## Click-through behavior

- Clicking a result link opens it in a new background tab, keeping the side panel and current reading tab intact.
- Clicking a history entry re-renders its saved results in the results view (does not re-run the pipeline).

## Settings flow (revisit)

- User can disconnect/reconnect OpenRouter, replace pasted API keys, switch the active provider/model, or change the results-count preference at any time from `options.html`. Changes take effect on the next analysis run (no need to reopen the panel).

## Data shape reference (history entry)

```js
{
  id: string,            // uuid
  timestamp: number,
  sourcePage: { title: string, url: string },
  results: [
    { title: string, url: string, snippet: string, relevance: string }
  ]
}
```

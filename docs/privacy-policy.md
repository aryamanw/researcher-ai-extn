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

<h1 align="center">Research Companion</h1>

<p align="center">
  <a href="https://github.com/aryamanw/researcher-ai-extn/releases"><img src="https://img.shields.io/github/v/release/aryamanw/researcher-ai-extn?label=release" alt="Latest release" /></a>
  <img src="https://img.shields.io/badge/Manifest-V3-blue" alt="Manifest V3" />
</p>

<p align="center">A side-panel research assistant for anyone deep in an article, report, or blog post.</p>

## About

When you're reading something and want to know what else is out there on the same topic, Research Companion reads the page you're on and finds related webpages, reports, and articles. Each result comes with a short note on why it's relevant, shown right in Chrome's side panel next to what you're reading.

It only does anything when you click the toolbar icon: no chat window, no notifications, nothing running in the background, nothing competing with the page you're reading for your attention.

It connects directly to the AI provider and search service you choose, using your own API keys. There's no backend server in between. Your page content and credentials go straight from your browser to the provider you configured, never through a server the developer runs.

## How to use it

### Install

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Chrome%20Web%20Store-coming%20soon-lightgrey?logo=googlechrome&logoColor=white" alt="Chrome Web Store, coming soon" /></a>
  <a href="https://github.com/aryamanw/researcher-ai-extn/releases"><img src="https://img.shields.io/github/v/release/aryamanw/researcher-ai-extn?label=Download&logo=github" alt="Download latest release" /></a>
</p>

Research Companion isn't on the Chrome Web Store yet. Until it is, install it from a GitHub release:

1. Go to [Releases](https://github.com/aryamanw/researcher-ai-extn/releases) and download the latest `research-companion-vX.Y.Z.zip`.
2. Unzip it.
3. Open `chrome://extensions`, turn on **Developer mode** (top right), click **Load unpacked**, and select the unzipped folder.
4. Pin the extension to your toolbar for one-click access.

### Connect a provider

1. Right-click the toolbar icon → **Options** (or `chrome://extensions` → Research Companion → **Details** → **Extension options**).
2. Connect an AI provider: click **Connect to OpenRouter** to sign in without pasting a key, or paste an Anthropic, OpenAI, or Gemini API key directly.
3. Paste a [Brave Search](https://brave.com/search/api/) API key. This is what actually finds the related pages.
4. Pick the provider you just connected from the **LLM provider** dropdown.

Settings save automatically as you fill them in.

### Use it

1. Open any article, report, or blog post.
2. Click the toolbar icon. The side panel walks through reading the page, searching, and ranking results.
3. Each result shows a title, snippet, and a one-line note on why it's related. Click through to open it in a new tab.
4. Past sessions show up in **History** at the bottom of the panel. Reopening one re-renders instantly: no new searches, no new cost.

If a page has no readable content (a PDF, a paywall stub, an app shell), the panel says so instead of erroring out.

## How it works

Research Companion runs entirely in your browser. There's no backend, no account, and no telemetry.

When you click the icon, a one-shot script reads the readable text of the active tab only. It never reads tabs you haven't clicked on, and never runs in the background. That text gets turned into search queries sent to Brave Search with your own API key. Your chosen AI provider (Anthropic, OpenAI, Gemini, or OpenRouter) then writes a short relevance note for each result, again using your own key or OpenRouter connection.

Your provider settings, API keys, and the last 50 research sessions live only in your browser's local extension storage (`chrome.storage.local`). Nothing syncs, and nothing gets sent anywhere except the provider you configured.

Full details: [privacy policy](https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html).

---

Want to build or contribute? See [docs/DEVELOPING.md](docs/DEVELOPING.md).

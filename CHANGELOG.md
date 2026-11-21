# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/) (pre-1.0: minor versions may include breaking changes).

## [Unreleased]

## [0.2.0] - 2026-11-20

### Added
- Provider registry: 12 providers in two modes. Built-in search: Anthropic, OpenAI, Gemini, OpenRouter, DeepSeek, Kimi, xAI. Search key mode (bring an Exa or Tavily key): Ollama Cloud, Together AI, Hugging Face, Cerebras, OpenCode Zen.
- Exa and Tavily search services, with per-step progress in the side panel.
- Live per-provider model lists in Settings, with a custom model option.
- Optional host permissions requested at runtime only when a provider or search service is selected.
- "Remove saved keys" now also clears search keys.

### Changed
- Settings page and side panel are driven by the provider registry; existing settings migrate automatically.
- Privacy policy, terms, and store listing name all providers and search services.

### Fixed
- Gemini results were never kept: citations previously never matched because Google grounding returns redirect URLs. Results now match by domain.
- Anthropic web search requests now set `allowed_callers: ["direct"]` per the docs, intended to avoid a 400 on models without programmatic tool calling (pending live verification).

## [0.1.4] - 2026-11-20

First Chrome Web Store release.

### Added
- "Remove saved keys" control in Settings deletes every stored API key and disconnects OpenRouter.
- Terms of Use page, third-party license notices (shipped inside the extension package), and a rewritten privacy policy with Chrome Web Store Limited Use disclosures.
- Open-source project files: contributing guide, code of conduct, security policy, issue and pull request templates, CI workflow, and Dependabot config.
- `homepage_url` and `minimum_chrome_version` (116) in the manifest.

### Changed
- Default models updated: Anthropic `claude-opus-5-5` (with `web_search_20260209`), OpenAI `gpt-6-luna`, Gemini `gemini-3.8-flash`, OpenRouter `openai/gpt-6-luna`. The previous defaults are retired or scheduled for shutdown.
- Re-run shortcut changed to Alt+Shift+R (Option+Shift+R on Mac); Ctrl/Cmd+Shift+R is reserved by Chrome for hard reload.
- Extension package is smaller and verified: only shipped files, with a version-match and reference check.
- Landing page: animated reading-lamp hero and scroll story.

### Fixed
- Network failures show a friendly message instead of "Failed to fetch".
- API key fields on the options page now get the same styling and focus ring as other inputs.
- Results with non-http(s) URLs are dropped instead of rendered as dead links.
- Result links use `rel="noopener noreferrer"`; missing result fields no longer render as "undefined".

### Security
- Page text can no longer close the prompt's `<page_title>`/`<page_content>` delimiters early.

## [0.1.3] - 2026-06-29

### Added
- Search prompt now includes ranking criteria, a `score` field, and an over-fetch buffer.
- Loading spinner on status rows in the side panel.

### Changed
- Anthropic `web_search` `max_uses` and OpenRouter `web_search` `max_results` are over-fetched by 30%.
- Results are sorted by score and truncated to the configured results count.

## [0.1.2] - 2026-06-25

### Added
- Marketing landing page and a static HTML privacy policy page on GitHub Pages.

### Fixed
- Friendly message when the LLM returns an unparseable search response.
- Removed stale Brave Search UI from the UI showcase; pinned the Gemini default model to 2.0.
- Removed unused Brave Search and DuckDuckGo permissions from the manifest.
- Removed the contact email from the privacy policy page.

## [0.1.1] - 2026-06-22

### Added
- Native LLM web search for Anthropic, OpenAI (Responses API), Gemini (Google Search grounding), and OpenRouter, replacing the separate search-provider integration. No separate search key is needed.
- Delete a single history entry or clear all history, with inline two-step confirmation.
- Keyboard shortcut (Ctrl/Cmd+Shift+R) to re-run a search, with a visible hint.
- Saved API keys are masked; the Show button reveals the stored key.
- Live Results Count clamp hint, model field format examples, and a privacy policy link in settings.

### Changed
- Pipeline collapsed to a single `searchAndRank` call per provider.
- Friendlier OpenRouter connect status and error messages.
- API key format validation runs on change, so autosave cannot bypass it.
- Accessibility: `aria-describedby` / `aria-live` for key warnings and autosave status.

### Security
- API key masking and true network abort through Cancel.

## [0.1.0] - 2026-06-21

### Added
- Initial release: side-panel research assistant that reads the active page on toolbar click and finds related pages with a relevance note for each.
- Providers: Anthropic, OpenAI, Gemini, and OpenRouter (OAuth PKCE sign-in).
- Local-only settings and the last 50 sessions in `chrome.storage.local`.
- Toolbar icons, extension packaging script, and GitHub release workflow.

### Security
- Fixed XSS in side panel result, history, and error rendering.
- Message-sender validation, OAuth state check, prompt hardening, and Content Security Policy with `connect-src` allowlist.
- Gemini API key sent via header instead of URL query string; Gemini model name validated.

[Unreleased]: https://github.com/aryamanw/researcher-ai-extn/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/aryamanw/researcher-ai-extn/compare/v0.1.4...v0.2.0
[0.1.3]: https://github.com/aryamanw/researcher-ai-extn/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/aryamanw/researcher-ai-extn/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/aryamanw/researcher-ai-extn/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/aryamanw/researcher-ai-extn/releases/tag/v0.1.0

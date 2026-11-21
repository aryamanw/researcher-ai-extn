# Privacy Policy — Research Companion

**Effective and last updated: November 20, 2026**

Research Companion is a free, open-source (MIT) Chrome extension that finds webpages, reports, and articles related to the page you are currently reading. This policy explains what data the extension handles, where it goes, and the choices you have. In short: the developer runs no server and receives none of your data.

## What the extension reads

When you click the toolbar icon (or use the extension's keyboard shortcut), the extension injects a one-time script into the **active tab only**. The script extracts the page's readable article text and title using the open-source Mozilla Readability library. The extension does not run in the background, does not read other tabs, and does not read pages you have not explicitly activated it on.

## What data is collected, used, and shared

- **Website content (page title and text).** The title and the first 12,000 characters of the extracted text are sent in a request to the AI provider you selected. The page URL is not included in that request. The provider uses its own web-search tool to find related pages and write short relevance notes, which are returned to the side panel. The data is used only for this purpose.
- **Authentication information (API keys / OAuth token).** Keys you paste into Settings, or the key issued to the extension when you use "Connect to OpenRouter", are stored on your device and are sent only to the provider they belong to, as the credential on that provider's API requests.
- **Settings and history.** Your chosen provider, model, number of results, and a history of your most recent analyses (up to 50 sessions: source page title and URL, the results returned, the provider used, and a timestamp) are stored on your device.

The extension does not collect your name, email address, location, browsing history beyond the pages you explicitly analyze, financial or health information, or any analytics or telemetry.

## Where your data goes

Requests go directly from your browser to the provider you selected. They do not pass through any server operated by the developer. The extension is technically limited by its Content Security Policy and host permissions to contact only these endpoints:

- `https://api.anthropic.com` (Anthropic)
- `https://api.openai.com` (OpenAI)
- `https://generativelanguage.googleapis.com` (Google Gemini API)
- `https://openrouter.ai` (OpenRouter)
- `https://api.deepseek.com` (DeepSeek)
- `https://api.moonshot.ai` (Kimi, Moonshot AI)
- `https://api.x.ai` (xAI)
- `https://ollama.com` (Ollama Cloud)
- `https://api.together.ai` (Together AI)
- `https://router.huggingface.co` (Hugging Face)
- `https://api.cerebras.ai` (Cerebras)
- `https://opencode.ai` (OpenCode Zen)
- `https://api.exa.ai` (Exa, search service)
- `https://api.tavily.com` (Tavily, search service)

Only the provider you currently have selected receives your page content. The Exa and Tavily hosts receive data only if you add a key for them (see Search key mode below). The OpenRouter sign-in uses Chrome's `identity` permission and the OAuth PKCE flow; the extension never sees your OpenRouter password.

## What the developer does not do

The developer does not operate a backend server and has no access to your page content, API keys, or history. In addition:

- We do not sell or transfer user data to third parties, other than the provider you chose, as necessary to provide the extension's single purpose.
- We do not use or transfer user data for purposes unrelated to the extension's single purpose of finding pages related to the one you are reading.
- We do not use or transfer user data to determine creditworthiness or for lending purposes, and we do not use it for personalized or interest-based advertising.
- No humans read your data. Because the developer never receives it, there is nothing for us to read, except where you voluntarily send it to us (for example, in a GitHub issue).

**Limited Use.** The use of information received by Research Companion will adhere to the [Chrome Web Store User Data Policy, including the Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use).

## Third-party AI providers

Once your page content reaches a provider, that provider's own terms and privacy policy govern how it processes, retains, and (depending on your account and plan) may use it. The developer does not control this. Review the policies of the provider you select:

- Anthropic: [anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy).
- OpenAI: [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy).
- Google Gemini API: [policies.google.com/privacy](https://policies.google.com/privacy).
- OpenRouter: [openrouter.ai/privacy](https://openrouter.ai/privacy). OpenRouter forwards requests to underlying model providers, whose policies may also apply. Its host also serves the sign-in page and key-exchange endpoint when you choose "Connect to OpenRouter".
- DeepSeek: [deepseek.com privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html). DeepSeek states that it stores data on servers in China.
- Kimi (Moonshot AI): [platform.kimi.ai/docs/agreement/userprivacy](https://platform.kimi.ai/docs/agreement/userprivacy). Kimi's operator, Moonshot AI Pte. Ltd., is based in Singapore.
- xAI: [x.ai/legal/privacy-policy](https://x.ai/legal/privacy-policy). API data terms: [x.ai/legal/terms-of-service-enterprise](https://x.ai/legal/terms-of-service-enterprise).
- Ollama Cloud: [ollama.com/privacy](https://ollama.com/privacy).
- Together AI: [together.ai/privacy](https://www.together.ai/privacy).
- Hugging Face: [huggingface.co/privacy](https://huggingface.co/privacy).
- Cerebras: [cerebras.ai/privacy-policy](https://www.cerebras.ai/privacy-policy).
- OpenCode Zen: [opencode.ai/legal/privacy-policy](https://opencode.ai/legal/privacy-policy).
- Exa (search service): [exa.ai/privacy-policy](https://exa.ai/privacy-policy).
- Tavily (search service): [tavily.com/privacy](https://www.tavily.com/privacy).

**Search key mode.** Some providers (Ollama Cloud, Together AI, Hugging Face, Cerebras, OpenCode Zen) have no built-in web search. For these, you add your own Exa or Tavily key in Settings. The page title and text go to the AI provider you selected, which writes a few search queries. Only those AI-written search queries are sent to Exa or Tavily, never the page text or the page URL. Exa or Tavily returns result links and snippets, which are sent back to your AI provider to rank. Your Exa or Tavily key is stored on your device and sent only to that search service.

Please do not analyze pages containing sensitive personal information (for example, private email, medical records, or internal documents) unless you are comfortable with it being sent to your chosen provider.

## Storage, retention, and deletion

- All extension data is stored in `chrome.storage.local` on your device. Nothing is synced across devices or uploaded by the extension.
- History is capped at the 50 most recent sessions; older entries are discarded automatically. You can delete a single entry or use the **Clear** button in the side panel to delete all history.
- You can replace an API key in Settings at any time, or click “Remove saved keys” in Settings to delete every stored API key, every stored search key, and the OpenRouter connection on this device. Uninstalling the extension deletes all of its stored data from your browser. To revoke an OpenRouter connection, remove the key in your OpenRouter account.
- Data already sent to a provider is retained according to that provider's policy; request deletion from the provider directly.

## This website

This policy and the project's other pages are hosted on GitHub Pages, which may log visitor IP addresses and request metadata under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The project's landing page may load scripts from a public CDN (cdnjs) and fonts from Google Fonts, which can receive your IP address when you visit that page. The Chrome extension itself loads no remote code, fonts, or other remote resources.

## Children's privacy

Research Companion is a general-purpose tool and is not directed to children under 13 (or the minimum age required in your jurisdiction). The developer does not knowingly collect personal information from anyone, including children. AI providers set their own minimum-age requirements.

## Changes to this policy

If this policy changes, the "Effective and last updated" date above will change and the new version will be published at this URL. Material changes will also be noted in the project's GitHub release notes.

## Contact

Questions or requests about this policy: please open an issue at [github.com/aryamanw/researcher-ai-extn/issues](https://github.com/aryamanw/researcher-ai-extn/issues). Do not post API keys or sensitive information in a public issue. See also the [Terms of Use](terms.html).

# Privacy Policy — Research Companion

**Effective and last updated: November 23, 2026**

Research Companion is a free, open-source (MIT) Chrome extension that finds webpages, reports, and articles related to the page you are currently reading. This policy explains what data the extension handles, where it goes, and the choices you have. In short: the developer runs no server and receives none of your data.

## What the extension reads

When you click the toolbar icon (or use the extension's keyboard shortcut), the extension injects a one-time script into the **active tab only**. The script extracts the page's readable article text and title using the open-source Mozilla Readability library. The extension does not run in the background, does not read other tabs, and does not read pages you have not explicitly activated it on.

## What data is collected, used, and shared

- **Website content (page title and text).** The title and the first 12,000 characters of the extracted text are sent in a request to the AI provider you selected. The source page URL is not included as a separate field in the search prompt, though extracted text or search queries may contain URLs. The provider uses built-in web search, or generates queries for your configured Exa or Tavily search service, to suggest related pages and write short relevance notes. The data is used only for this purpose.
- **Authentication information (API keys / OAuth token).** Keys you paste into Settings, or the key issued to the extension when you use "Connect to OpenRouter", are stored on your device and are sent only to the provider they belong to, as the credential on that provider's API requests.
- **Settings and history.** Your chosen provider, per-provider model choices, chosen search service and its key, number of results, and a history of your most recent analyses (up to 50 sessions: source page title and URL, the results returned, the provider used, which search service was used if any, and a timestamp) are stored on your device.

The extension does not require a Research Companion account or collect analytics or telemetry, and it does not monitor your browsing history. Text from pages you choose to analyze may contain personal or sensitive information; that text is sent to your selected provider as described above.

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

The selected AI provider receives your page title and extracted text. Exa or Tavily receives search queries only when configured and used for the search; those queries can contain wording from the page (see Search key mode below). The OpenRouter sign-in uses Chrome's `identity` permission and the OAuth PKCE flow; the extension never sees your OpenRouter password.

## What the developer does not do

The developer does not operate a backend server and has no access to your page content, API keys, or history. In addition:

- We do not sell or transfer user data to third parties, other than the AI provider and search service you configured, as necessary to find related pages.
- We do not use or transfer user data for purposes unrelated to the extension's single purpose of finding pages related to the one you are reading.
- We do not use or transfer user data to determine creditworthiness or for lending purposes, and we do not use it for personalized or interest-based advertising.
- The developer does not receive or read your page content, keys, or history, except information you voluntarily send us (for example, in a GitHub issue). Your selected providers and search services process the data sent to them under their own policies.

**Limited Use.** The use of information received by Research Companion will adhere to the [Chrome Web Store User Data Policy, including the Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use).

## Third-party AI providers

Once your page content reaches a provider, that provider's own terms and privacy policy govern how it processes, retains, and (depending on your account and plan) may use it. The developer does not control this. Review the policies of the provider you select:

- Anthropic: [anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy).
- OpenAI: [openai.com/policies/privacy-policy](https://openai.com/policies/privacy-policy).
- Google Gemini API: [policies.google.com/privacy](https://policies.google.com/privacy) and [ai.google.dev/gemini-api/terms](https://ai.google.dev/gemini-api/terms).
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

**Search key mode.** Some providers (Ollama Cloud, Together AI, Hugging Face, Cerebras, OpenCode Zen) have no built-in web search, and the same applies when a provider that does have built-in search is used with a model that can't search. For these, you add your own Exa or Tavily key in Settings. The page title and text go to the AI provider you selected, which writes a few search queries. The search queries are sent to Exa or Tavily and may include words or details from the page. If query generation does not produce usable queries, the extension falls back to the page title or, when that is empty, up to 100 characters from the page text. Exa or Tavily returns result links, titles, and snippets, which are sent back to your AI provider to rank. Your Exa or Tavily key is stored on your device and sent only to that search service.

Please do not analyze pages containing sensitive personal information (for example, private email, medical records, or internal documents) unless you are comfortable with it being sent to your chosen provider.

## Storage, retention, and deletion

- Settings, credentials, and saved history are stored in `chrome.storage.local` on your device. They are not synced across devices or uploaded to a developer-operated server. Requests to your selected AI provider and search service still transmit the data described above.
- History is capped at the 50 most recent sessions; older entries are discarded automatically. You can delete a single entry or use the **Clear** button in the side panel to delete all history.
- You can replace an API key in Settings at any time, or click “Remove saved keys” in Settings to delete every stored API key, every stored search key, and the OpenRouter connection on this device. Uninstalling the extension deletes all of its stored data from your browser. To revoke an OpenRouter connection, remove the key in your OpenRouter account.
- Data already sent to a provider is retained according to that provider's policy; request deletion from the provider directly.

## This website

This policy and the project's other pages are hosted on GitHub Pages, which may log visitor IP addresses and request metadata under [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The landing page serves its scripts and provider logo files from this GitHub Pages site and uses system fonts. Visiting the landing page does not send requests to AI providers. The Chrome extension itself loads no remote code, fonts, or other remote resources.

## Children's privacy

Research Companion is a general-purpose tool and is not directed to children under 13 (or the minimum age required in your jurisdiction). The developer does not knowingly collect personal information from anyone, including children. AI providers set their own minimum-age requirements.

## Changes to this policy

If this policy changes, the "Effective and last updated" date above will change and the new version will be published at this URL. Material changes will also be noted in the project's GitHub release notes.

## Contact

Questions or requests about this policy: please open an issue at [github.com/aryamanw/researcher-ai-extn/issues](https://github.com/aryamanw/researcher-ai-extn/issues). Do not post API keys or sensitive information in a public issue. See also the [Terms of Use](terms.html).

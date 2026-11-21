# Provider verification (source of truth for the registry)

Checked: **2026-11-20**, against each provider's official docs, plus live unauthenticated probes of public endpoints (HTTP status and, where public, the model list). No API keys were used, so no request that needs a key was run end to end. "Confirmed (docs)" means the docs state it. "Probed" means a live GET/POST without a key returned the expected status. "Not confirmed" is called out explicitly.

Tasks 2-5 copy values from this file. Where a value differs from the design spec, it is marked **CHANGED**.

## Gate result

| id | Result |
|---|---|
| anthropic, openai, gemini, openrouter, deepseek, kimi, xai | PASS (see per-provider concerns) |
| **groq** | **DROPPED**: Groq's docs do not say that `browser_search` returns source URLs. The documented output is `message.content` with inline markers like `【2†L6-L10】` and no URL list. Nothing documents `executed_tools`, `annotations` or any URL field for `browser_search` (the `executed_tools[].search_results` shape is documented only for the now-decommissioned `groq/compound`). Without citable URLs Mode 1 fails. |
| ollama-cloud, together, huggingface, cerebras, opencode-zen | PASS (Mode 2) |
| exa, tavily | PASS |

## Mode 1 providers

Columns: `id`, `label`, `format`, `baseUrl`, auth header, key prefix, key URL, `defaultModel`, models endpoint, search tool JSON, search-capable model pattern, response field holding cited URLs, docs, date.

### anthropic

| Column | Value |
|---|---|
| id / label | `anthropic` / Anthropic |
| format | `anthropic` (`POST {baseUrl}/v1/messages`) |
| baseUrl | `https://api.anthropic.com` |
| auth header | `x-api-key: <key>` plus `anthropic-version: 2023-06-01` and `content-type: application/json`. Docs now show `Authorization: Bearer <key>` as primary and `x-api-key` as "legacy fallback, still supported". `anthropic-version` latest is `2026-10-21`; `2023-06-01` is still listed as a valid version. Today's code (`x-api-key` + `2023-06-01`) is valid. |
| key prefix | `sk-ant-api` (docs: "Static `sk-ant-api...` secret"; example `sk-ant-api03-...`) |
| key URL | https://platform.claude.com/settings/keys |
| defaultModel | `claude-opus-5-5` (confirmed; Models overview lists it as the API ID; also present in the supported-models list of the web search page) |
| models endpoint | `GET /v1/models`, response `data[].id` (cursor pagination via `after_id`/`has_more`/`last_id`). Each model has `capabilities.server_tools.web_search.supported` (use it to filter). Probed: 401 without key. |
| search tool JSON | `{ "type": "web_search_20260209", "name": "web_search", "max_uses": N }` (versions that exist: `web_search_20250305` basic, `web_search_20260209` dynamic filtering, `web_search_20260318` adds `response_inclusion`). **Note:** on `20260209`+ the tool's `allowed_callers` defaults to `["code_execution_20260120"]`; a model that doesn't support programmatic tool calling gets a 400 unless `"allowed_callers": ["direct"]` is set. For models outside the newest set use `web_search_20250305`. |
| search-capable models | Docs `supportedModels` list: `claude-fable-5-2`, `claude-mythos-5-2`, `claude-fable-5-1`, `claude-mythos-5-1`, `claude-fable-5`, `claude-mythos-5`, `claude-mythos-preview`, `claude-opus-5-5`, `claude-opus-5`, `claude-sonnet-5-5`, `claude-sonnet-5`, `claude-haiku-5-5`, `claude-haiku-4-5-20251001`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-opus-4-5-20251101`, `claude-sonnet-4-5-20250929`. Suggested pattern: `^claude-(opus|sonnet|haiku|fable|mythos)-` (all current families support search). Dynamic filtering (`20260209`+) needs Claude 4.6+ / Mythos Preview (**CHANGED** vs spec: Haiku 5.5, Opus 5, Sonnet 5 etc. are also on the list). |
| cited URLs | `content[]` blocks with `type: "web_search_tool_result"` → `.content[]` (array of `{type:"web_search_result", url, title, page_age, encrypted_content}`) → `.url`. On error, `.content` is a single object `{type:"web_search_tool_result_error", error_code}`, not an array (current code already guards with `Array.isArray`). Text blocks also carry `citations[].url` (`web_search_result_location`). `stop_reason` may be `pause_turn` (not handled; already in TODO.md). |
| current code shape | Request: `{model, max_tokens:16000, messages:[{role:'user',content}], tools:[...]}`; reads `data.content` blocks, text = join of `type==='text'`. Matches docs. |
| docs | https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool ; https://platform.claude.com/docs/en/models/overview ; https://platform.claude.com/docs/en/api/overview ; https://platform.claude.com/docs/en/manage-claude/authentication ; https://platform.claude.com/docs/en/api/versioning |
| privacy policy | https://www.anthropic.com/legal/privacy |
| date checked | 2026-11-20 |

Concern: from a browser context the API accepts cross-origin requests only with `anthropic-dangerous-direct-browser-access: true`, and orgs with ZDR or the Compliance API cannot call from a browser at all (401 "CORS requests are not allowed for this Organization") for any request carrying an `Origin` header. Today's code sends neither header; it works only if the extension's host permissions bypass CORS and Chrome sends no `Origin` for the fetch. Not tested (no key).

### openai

| Column | Value |
|---|---|
| id / label | `openai` / OpenAI |
| format | `openai-responses` (`POST {baseUrl}/responses`) |
| baseUrl | `https://api.openai.com/v1` |
| auth header | `Authorization: Bearer <key>` |
| key prefix | none (docs do not state one) |
| key URL | https://platform.openai.com/settings/organization/api-keys |
| defaultModel | `gpt-6-luna` (confirmed: models page lists "GPT-6 Luna"; its model page lists `web_search` under Responses API tools and `v1/responses` + `v1/chat/completions` as supported). Docs recommend `gpt-6.2-astra` for new web-search integrations; Luna is the efficient tier. |
| models endpoint | `GET /v1/models` (probed: 401 without key). Response `data[].id`. |
| search tool JSON | `{ "type": "web_search" }` (`web_search_preview` is legacy). |
| search-capable models | Docs give no complete list. Confirmed: `gpt-6-luna`, `gpt-6.2-astra` (page example), `gpt-5` (needs reasoning effort above `minimal`), `gpt-5.4` (lower quality at effort `none`). Chat Completions only supports `gpt-5-search-api` (the deprecated `gpt-4o-*-search-preview` shut down 2026-07-23). Suggested pattern: `^gpt-[56]` excluding `image\|realtime\|live\|transcribe\|cyber\|search`. This pattern is an inference, not a documented list. |
| cited URLs | `output[]` item `type:"message"` → `content[]` item `type:"output_text"` → `annotations[]` where `type:"url_citation"` → `.url` (also `.title`, `.start_index`, `.end_index`). `output[]` also holds a `web_search_call` item (`action.type` is `search`/`open_page`/`find_in_page`). |
| current code shape | Matches docs (`input`, `tools:[{type:'web_search'}]`, reads `output_text.annotations`). |
| docs | https://developers.openai.com/api/docs/guides/tools-web-search ; https://developers.openai.com/api/docs/models ; https://developers.openai.com/api/docs/models/gpt-6-luna ; https://developers.openai.com/api/reference/overview |
| privacy policy | https://openai.com/policies/privacy-policy |
| date checked | 2026-11-20 |

### gemini

| Column | Value |
|---|---|
| id / label | `gemini` / Gemini |
| format | `gemini` (`POST {baseUrl}/models/{model}:generateContent`) |
| baseUrl | `https://generativelanguage.googleapis.com/v1beta` |
| auth header | `x-goog-api-key: <key>` |
| key prefix | none (docs do not state one) |
| key URL | https://aistudio.google.com/apikey |
| defaultModel | `gemini-3.8-flash` (confirmed: listed Stable in the models page; listed as supporting Google Search grounding) |
| models endpoint | `GET /v1beta/models` (probed: 403 without key). Reference: https://aistudio.google.com/api-reference/models/list-models.md . Response is `models[].name` as `models/<id>` (strip the `models/` prefix) with `supportedGenerationMethods`; this shape is from Google's standard API, not shown in the fetched pages. Not confirmed with a key. |
| search tool JSON | `{ "google_search": {} }` inside `tools` of a `generateContent` request (docs: "For all current models, use the `google_search` tool"; `google_search_retrieval` is for older models). |
| search-capable models | Docs list: Gemini 4 (Carbon, Argon, Neon, Hydrogen), `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, 3.1 Flash Image / Pro Preview, 3 Pro Image Preview, `gemini-3-flash-preview`, 2.5 Pro/Flash/Flash-Lite, 2.0 Flash. Suggested pattern: `^gemini-(2\.0\|2\.5\|3\|4)` excluding `tts\|live\|embedding\|image\|transcribe\|robotics\|omni`. |
| cited URLs | `candidates[0].groundingMetadata.groundingChunks[].web.uri` (`web.title` is the source domain). **The `uri` values are Google redirect URLs** (docs example: `https://vertexaisearch.cloud.google.com.....`, title `aljazeera.com`), not the page URLs. |
| current code shape | Matches the documented request/response field names. |
| docs | https://aistudio.google.com/docs/google-search?generate-content=true ; https://aistudio.google.com/docs/models ; https://aistudio.google.com/llms.txt |
| privacy policy | https://policies.google.com/privacy (Gemini API terms incl. grounding: https://aistudio.google.com/docs/terms#grounding-with-google-search) |
| date checked | 2026-11-20 |

Concerns:
1. `generateContent` is labelled **legacy** in Google's docs ("Gemini Generate Content API (Legacy)"); the Interactions API (`POST /v1beta/interactions`, `tools:[{type:'google_search'}]`, `annotations` with `type:'url_citation'`/`url`) is recommended for new work. generateContent is still documented and works for `gemini-3.8-flash`. Sticking with `generateContent` is acceptable but may be retired later.
2. Existing logic `filterUncitedResults` compares the model's real result URLs against `groundingChunks[].web.uri`. Those are redirect URLs, so an exact match will normally never succeed and every result would be filtered out. Before relying on this, the Gemini adapter needs a different check (for example match the result URL's hostname against `web.title`, or resolve each redirect with a fetch and compare `response.url`). Not tested with a live key.

### openrouter

| Column | Value |
|---|---|
| id / label | `openrouter` / OpenRouter |
| format | `openai-chat` (`POST {baseUrl}/chat/completions`) |
| baseUrl | `https://openrouter.ai/api/v1` |
| auth header | `Authorization: Bearer <key>` |
| key prefix | `sk-or-v1-` (docs: followed by 64 lowercase hex chars) |
| key URL | https://openrouter.ai/keys |
| defaultModel | `openai/gpt-6-luna` (probed: present in the live `/api/v1/models` list) |
| models endpoint | `GET /models` (public; auth optional), response `data[].id`. Probed 200. |
| search tool JSON | `{ "type": "openrouter:web_search", "parameters": { "max_results": N } }` in `tools` (N is 1-25). The docs' examples use the Responses API (`/api/v1/responses`, `input`), not chat completions; no chat-completions example is shown on the page. The older `plugins:[{id:'web',max_results}]` and `:online` suffix are marked **deprecated**. Today's code (server tool in chat completions) is unchanged. Not confirmed against a live key. |
| search-capable models | Any model: `engine` defaults to `auto` (native search where the provider has it: OpenAI GPT-4.1/5+, Anthropic 3.5 Haiku+/4+, Gemini 3+, Grok 4+, Perplexity; otherwise falls back to Exa). Pattern: `.*`. |
| cited URLs | `choices[0].message.annotations[]` where `type:"url_citation"` → `.url_citation.url` (also `.title`, `.content`, `.start_index`, `.end_index`). Confirmed on the plugin docs page; the server-tool page says excerpts are "surfaced via `url_citation` annotations" without showing the JSON. Third-party reports: with `engine: auto` and a native-search model, citations may be missing; and `start_index`/`end_index` can be 0. |
| current code shape | Matches. |
| docs | https://openrouter.ai/docs/guides/features/server-tools/web-search ; https://openrouter.ai/docs/guides/features/plugins/web-search ; https://openrouter.ai/docs/api-reference/authentication ; https://openrouter.ai/docs/api-reference/list-available-models |
| privacy policy | https://openrouter.ai/privacy |
| date checked | 2026-11-20 |

Concern: citation presence may depend on which engine ran (native vs Exa). If `annotations` comes back empty for native-search models, consider setting `parameters.engine: "exa"` in a follow-up. Not verified without a key.

### groq: DROPPED

| Column | Value |
|---|---|
| id / label | `groq` / Groq |
| status | **DROPPED**. Reason: cannot confirm that Mode 1 search returns URLs. |
| request (confirmed) | `POST https://api.groq.com/openai/v1/chat/completions` with `{"model":"openai/gpt-oss-120b","tool_choice":"required","tools":[{"type":"browser_search"}]}`. Supported models: `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `openai/gpt-oss-safeguard-20b`. Not compatible with structured outputs. Powered by Exa. Docs recommend `reasoning_effort: low`. |
| response (what the docs show) | Answer in `choices[0].message.content` with inline markers such as `【2†L6-L10】`. No URLs in the documented example; no `executed_tools`, `annotations` or `search_results` documented for `browser_search`. The changelog (2025-10-21) mentions SDK "annotation/citation support to chat completion messages" without saying it covers `browser_search`. |
| docs | https://console.groq.com/docs/tool-use/built-in-tools/browser-search ; https://console.groq.com/docs/responses-api ; https://console.groq.com/docs/api-reference ; https://console.groq.com/docs/changelog |
| revisit | Re-add if a live test with a real key shows source URLs in `message.annotations` or `message.executed_tools[].search_results`. |
| date checked | 2026-11-20 |

### deepseek

| Column | Value |
|---|---|
| id / label | `deepseek` / DeepSeek |
| format | `openai-chat` (`POST {baseUrl}/chat/completions`) |
| baseUrl | `https://api.deepseek.com` (no `/v1` needed; docs use `https://api.deepseek.com/chat/completions`) |
| auth header | `Authorization: Bearer <key>` |
| key prefix | none (docs do not state one) |
| key URL | https://platform.deepseek.com/api_keys |
| defaultModel | `deepseek-flash` (confirmed: pricing page, "Use `deepseek-flash` as the model name"; legacy `deepseek-v4-flash` still accepted). Other listed model: `deepseek-v4-pro`. |
| models endpoint | `GET /models`, response `data[].id`. Probed: 401 without key. |
| search tool JSON | `{ "type": "deepseek_web_search" }` in `tools` of `/chat/completions`. Rules: `tool_choice` may not name it (400); declaring it twice or adding `allowed_domains`/`blocked_domains`/`user_location` is rejected. `thinking` defaults to enabled; docs: with thinking disabled the tool does plain web search, with thinking enabled it does "deep thinking search". Set `thinking:{type:'disabled'}` if plain search is wanted (unverified for latency). |
| search-capable models | `deepseek-flash` only (docs name only this model). Pattern: `^deepseek-flash$`. |
| cited URLs | `choices[0].message.annotations[]` where `type:"url_citation"` → `.url_citation.url` (also `.title`, which equals the URL when unknown, `.start_index`, `.end_index`). `annotations` is omitted when there are no citations or when `finish_reason` is `content_filter`. Same shape as OpenRouter. |
| docs | https://api-docs.deepseek.com/guides/web_tools/ ; https://api-docs.deepseek.com/quick_start/pricing ; https://api-docs.deepseek.com/api/list-models ; https://api-docs.deepseek.com/ |
| privacy policy | https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html (URL returns 200; content not read) |
| date checked | 2026-11-20 |

Note: from 2026-11-18 12:00 Beijing time, server-side search/fetch is billed as model tokens, not per tool call.

### kimi

| Column | Value |
|---|---|
| id / label | `kimi` / Kimi (Moonshot) |
| format | `openai-responses` (`POST {baseUrl}/responses`) |
| baseUrl | `https://api.moonshot.ai/v1` (endpoint `https://api.moonshot.ai/v1/responses`) |
| auth header | `Authorization: Bearer <key>` |
| key prefix | none (docs do not state one) |
| key URL | https://platform.kimi.ai/console/api-keys |
| defaultModel | `kimi-k3.1-pro` (confirmed: Responses API doc lists `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed`, `kimi-k3` as supported) |
| models endpoint | `GET /v1/models`, response `data[].id`. Probed: 401 without key. |
| search tool JSON | `{ "type": "web_search" }` plus top-level `"include": ["web_search_call.action.sources"]`. Only one `web_search` tool per request; `search_context_size` and `blocked_domains` are rejected with `invalid_request_error`; `user_location` is ignored. |
| search-capable models | The docs do not give a per-model search list; the Responses endpoint "currently supports" `kimi-k3.1-pro`, `kimi-k3.1-pro-highspeed`, `kimi-k3`. Pattern: `^kimi-k3`. |
| cited URLs | `output[]` item `type:"web_search_call"` → `action.sources[]` items `{type:"url", url, title}` (present only because of the `include` value). Output order: `web_search_call`, `reasoning`, `message`. The doc does not define message `annotations` (open array), so do not depend on `url_citation` here. Note these are pages the search hit, not necessarily cited in the answer. |
| docs | https://platform.kimi.ai/docs/api/responses ; https://platform.kimi.ai/docs/api/list-models ; https://platform.kimi.ai/docs/guide/start-using-kimi-api |
| privacy policy | https://platform.kimi.ai/docs/agreement/userprivacy (Kimi OpenPlatform Privacy Policy, Moonshot AI Pte. Ltd., Singapore; found via search, the page itself was not fetched) |
| date checked | 2026-11-20 |

### xai

| Column | Value |
|---|---|
| id / label | `xai` / xAI |
| format | `openai-responses` (`POST {baseUrl}/responses`) |
| baseUrl | `https://api.x.ai/v1` (endpoint `https://api.x.ai/v1/responses`) |
| auth header | `Authorization: Bearer <key>` |
| key prefix | none (docs do not state one) |
| key URL | https://console.x.ai/team/default/api-keys |
| defaultModel | `grok-4.7` (confirmed: listed in the models/pricing page; "Use Grok 4.7") |
| models endpoint | `GET /v1/models`, response `data[].id` (list-models reference: objects with `id`, `object`, `owned_by`, optional metadata). Probed: 401 without key. |
| search tool JSON | `{ "type": "web_search" }` in `tools` of `/v1/responses` with `input` as `[{role:'user',content}]` (string input is not shown in the xAI example; the adapter should send the array form). Optional `filters.allowed_domains` / `excluded_domains` (max 5, not both). |
| search-capable models | Docs do not list which models support search; every example uses `grok-4.7`. Pattern (assumption): `^grok-4`. |
| cited URLs | `output[]` item `type:"message"` → `content[]` item `type:"output_text"` → `annotations[]` where `type:"url_citation"` → `.url` (`title` is the citation number such as `"1"`, not a page title). Also a top-level `citations` array of URLs for every source the agent saw (default on; may include sources not used in the answer). Inline citations are on by default for Responses; `include:["no_inline_citations"]` turns them off. |
| docs | https://docs.x.ai/docs/guides/tools/search-tools ; https://docs.x.ai/developers/tools/citations ; https://docs.x.ai/developers/models ; https://docs.x.ai/developers/rest-api-reference |
| privacy policy | https://x.ai/legal/privacy-policy (consumer policy; does not cover API data). API data terms: https://x.ai/legal/terms-of-service-enterprise . Link both. The URLs returned HTTP 403 to curl but are listed in search results. |
| date checked | 2026-11-20 |

## Mode 2 providers (openai-chat, bearer auth)

All: `POST {baseUrl}/chat/completions`, `Authorization: Bearer <key>`. `defaultModel` chosen as a current general-purpose open chat model the provider lists.

| id | label | baseUrl | key prefix | key URL | defaultModel | models endpoint | docs | privacy policy |
|---|---|---|---|---|---|---|---|---|
| `ollama-cloud` | Ollama Cloud | `https://ollama.com/v1` | none | https://ollama.com/settings/keys | `gemma4:31b` (docs' cloud example; present in the live list) | `GET /models` (probed 200, public; `data[].id`; `https://ollama.com/api/tags` also works, shape `models[].name`). The docs do not explicitly say `/v1/models` is served on cloud, but the probe confirms it. | https://docs.ollama.com/openai ; https://docs.ollama.com/cloud/api | https://ollama.com/privacy |
| `together` | Together AI | `https://api.together.ai/v1` | none | https://api.together.ai/settings/projects/~current/api-keys | `openai/gpt-oss-120b` (in Together's serverless chat models table) | `GET /models` (docs; probed 401 without key). Shape not verified: Together's native API has returned a bare array here, so the fetch code should accept both an array and `{data:[...]}`. | https://docs.together.ai/docs/openai-api-compatibility ; https://docs.together.ai/docs/serverless-models | https://www.together.ai/privacy |
| `huggingface` | Hugging Face | `https://router.huggingface.co/v1` | none stated (tokens are fine-grained, create with "Make calls to Inference Providers" permission) | https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained | `deepseek-ai/DeepSeek-V4.1-Flash` (docs' quickstart model; present in the live list) | `GET /models` (docs and probed 200, public; `data[].id`, with per-provider info). 159 models at probe time. | https://huggingface.co/docs/inference-providers/index | https://huggingface.co/privacy |
| `cerebras` | Cerebras | `https://api.cerebras.ai/v1` | none | https://cloud.cerebras.ai | `gpt-oss-120b` (the docs' available-models list has only `gpt-oss-120b` and `qwen-3.8-27b`) | `GET /models` (documented in API reference; probed 403 without key; `data[].id`) | https://inference-docs.cerebras.ai/introduction ; https://inference-docs.cerebras.ai/models/overview ; https://inference-docs.cerebras.ai/api-reference/models | https://www.cerebras.ai/privacy-policy |
| `opencode-zen` | OpenCode Zen | `https://opencode.ai/inference/openai/v1` (**CHANGED**: the docs' per-model `chat-completions` base URL; `https://opencode.ai/inference/v1/chat/completions` also routes, probed 400 for an empty body) | none | https://opencode.ai/console (sign in, add billing and credits, copy key) | `deepseek-v4.1-flash` (paid, listed under the `/chat/completions` models; live cost 0.3 per MTok input) | `GET https://opencode.ai/inference/v1/models` (probed 200, public; `data[].id`). The list includes models served over other APIs (`claude-*` use `messages`, `gpt-*` use `responses`) and free models. Filter to entries whose `api` object has a `chat-completions` key and whose `cost.text.input.price` is above 0. | https://opencode.ai/docs/zen/ | https://opencode.ai/legal/privacy-policy (covers hosted offerings and the Console; says prompts are passed to the upstream provider and not stored) |

Notes:
- OpenCode Zen: "Free-tier chat models require OpenCode; use paid models or Go from other clients." Paid models only, as the spec says.
- Cerebras: whether the free trial needs a card was not confirmed in the docs fetched; the spec's "trial needs a card" is unverified.
- Ollama Cloud: the cloud API does not support stateful Responses or built-in web search; irrelevant to Mode 2 (we send plain chat completions).

## Search services

| Column | Exa | Tavily |
|---|---|---|
| id / label | `exa` / Exa | `tavily` / Tavily |
| endpoint | `POST https://api.exa.ai/search` | `POST https://api.tavily.com/search` |
| auth header | `x-api-key: <key>` (or `Authorization: Bearer <key>`; both accepted) | `Authorization: Bearer <key>` |
| key prefix | none stated | `tvly-` |
| key URL | https://dashboard.exa.ai/api-keys | https://app.tavily.com |
| request: query | `query` (string, required) | `query` (string, required) |
| request: count | `numResults` (1-100, default 10) | `max_results` (0-20, default 10) |
| request: content | `contents: { "text": { "maxCharacters": 2000 } }` or `contents: { "highlights": true }` (without `contents`, snippets are not returned) | none needed; `search_depth` `basic` (default, 1 credit), `advanced` (2 credits), `fast`, `ultra-fast` |
| response: url | `results[].url` | `results[].url` |
| response: title | `results[].title` | `results[].title` |
| response: snippet | no `snippet` field. Use `results[].highlights[]` (array of strings) or `results[].text` when requested via `contents`. | `results[].content` (short description); also `results[].score` |
| free tier | not confirmed in the fetched docs (spec: about $10/month credits, no card) | confirmed: "1,000 API credits every month, no credit card required" |
| docs | https://docs.exa.ai/reference/search ; https://docs.exa.ai/reference/getting-started | https://docs.tavily.com/documentation/api-reference/endpoint/search ; https://docs.tavily.com/documentation/quickstart |
| privacy policy | https://exa.ai/privacy-policy | https://www.tavily.com/privacy |
| date checked | 2026-11-20 | 2026-11-20 |

Privacy-policy URL caveat: HTTP 200 from a probe is not proof of content for single-page apps. Content was confirmed (fetched or via search excerpts) for OpenCode, Ollama, Cerebras, Together, Kimi (OpenPlatform) and xAI. The others (Anthropic, OpenAI, Google, OpenRouter, DeepSeek, Hugging Face, Exa, Tavily) are the canonical URLs and returned 200, but their text was not read.

## Existing code: request/response shapes in use today

| Provider | Request | Response read |
|---|---|---|
| anthropic | `POST /v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`; body `{model, max_tokens:16000, messages, tools:[{type:'web_search_20260209', name:'web_search', max_uses}]}` | `content[]` text blocks joined; URLs from `web_search_tool_result` blocks' `content[].url` |
| openai | `POST /v1/responses`, Bearer; `{model, input, tools:[{type:'web_search'}]}` (Mode 2 uses `/v1/chat/completions`) | `output[]` message → `output_text.annotations[]` `url_citation.url` |
| gemini | `POST /v1beta/models/{model}:generateContent`, `x-goog-api-key`; `{contents:[{parts:[{text}]}], tools:[{google_search:{}}]}` | `candidates[0].content.parts[].text`; URLs from `groundingMetadata.groundingChunks[].web.uri` |
| openrouter | `POST /api/v1/chat/completions`, Bearer; `{model, messages, tools:[{type:'openrouter:web_search', parameters:{max_results}}]}` | `choices[0].message.content`; URLs from `message.annotations[].url_citation.url` |

All four are consistent with the current docs (Gemini's redirect-URL issue and Anthropic's `allowed_callers` default are the two caveats above).

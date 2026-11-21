// Provider registry. Values come from docs/provider-verification.md (checked 2026-11-20).
// modelsEndpoint is relative to baseUrl unless it is an absolute URL.

const deepFreeze = (o) => {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
};

const mode2 = (id, label, baseUrl, keyUrl, defaultModel, modelsEndpoint = '/models') => ({
  id,
  label,
  format: 'openai-chat',
  baseUrl,
  host: new URL(baseUrl).origin + '/*',
  auth: 'bearer',
  keyHint: { prefix: null, url: keyUrl },
  defaultModel,
  modelsEndpoint,
  search: null,
});

export const PROVIDERS = deepFreeze({
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    format: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    host: 'https://api.anthropic.com/*',
    auth: 'x-api-key',
    keyHint: { prefix: 'sk-ant-api', url: 'https://platform.claude.com/settings/keys' },
    defaultModel: 'claude-opus-5-5',
    modelsEndpoint: '/v1/models',
    search: {
      models: /^claude-(opus|sonnet|haiku|fable|mythos)-/,
      tool: { type: 'web_search_20260209', name: 'web_search', allowed_callers: ['direct'] },
      extra: {},
      citations: 'anthropic-blocks',
    },
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    format: 'openai-responses',
    baseUrl: 'https://api.openai.com/v1',
    host: 'https://api.openai.com/*',
    auth: 'bearer',
    keyHint: { prefix: null, url: 'https://platform.openai.com/settings/organization/api-keys' },
    defaultModel: 'gpt-6-luna',
    modelsEndpoint: '/models',
    search: {
      models: /^gpt-(?!.*(image|realtime|live|transcribe|cyber|search))[56]/,
      tool: { type: 'web_search' },
      extra: {},
      citations: 'responses-annotations',
    },
  },
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    format: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    host: 'https://generativelanguage.googleapis.com/*',
    auth: 'x-goog-api-key',
    keyHint: { prefix: null, url: 'https://aistudio.google.com/apikey' },
    defaultModel: 'gemini-3.8-flash',
    modelsEndpoint: '/models',
    search: {
      models: /^gemini-(?!.*(tts|live|embedding|image|transcribe|robotics|omni))(2\.0|2\.5|3|4)/,
      tool: { google_search: {} },
      extra: {},
      citations: 'gemini-grounding',
    },
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    format: 'openai-chat',
    baseUrl: 'https://openrouter.ai/api/v1',
    host: 'https://openrouter.ai/*',
    auth: 'bearer',
    keyHint: { prefix: 'sk-or-v1-', url: 'https://openrouter.ai/keys' },
    defaultModel: 'openai/gpt-6-luna',
    modelsEndpoint: '/models',
    search: {
      models: /.*/,
      tool: { type: 'openrouter:web_search', parameters: {} },
      extra: {},
      citations: 'openrouter-annotations',
    },
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    format: 'openai-chat',
    baseUrl: 'https://api.deepseek.com',
    host: 'https://api.deepseek.com/*',
    auth: 'bearer',
    keyHint: { prefix: null, url: 'https://platform.deepseek.com/api_keys' },
    defaultModel: 'deepseek-flash',
    modelsEndpoint: '/models',
    search: {
      models: /^deepseek-flash$/,
      tool: { type: 'deepseek_web_search' },
      extra: {},
      citations: 'chat-annotations',
    },
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    format: 'openai-responses',
    baseUrl: 'https://api.moonshot.ai/v1',
    host: 'https://api.moonshot.ai/*',
    auth: 'bearer',
    keyHint: { prefix: null, url: 'https://platform.kimi.ai/console/api-keys' },
    defaultModel: 'kimi-k3.1-pro',
    modelsEndpoint: '/models',
    search: {
      models: /^kimi-k3/,
      tool: { type: 'web_search' },
      extra: { include: ['web_search_call.action.sources'] },
      citations: 'responses-sources',
    },
  },
  xai: {
    id: 'xai',
    label: 'xAI',
    format: 'openai-responses',
    baseUrl: 'https://api.x.ai/v1',
    host: 'https://api.x.ai/*',
    auth: 'bearer',
    keyHint: { prefix: null, url: 'https://console.x.ai/team/default/api-keys' },
    defaultModel: 'grok-4.7',
    modelsEndpoint: '/models',
    search: {
      models: /^grok-4/,
      tool: { type: 'web_search' },
      extra: {},
      citations: 'responses-annotations',
    },
  },
  'ollama-cloud': mode2('ollama-cloud', 'Ollama Cloud', 'https://ollama.com/v1', 'https://ollama.com/settings/keys', 'gemma4:31b'),
  together: mode2('together', 'Together AI', 'https://api.together.ai/v1', 'https://api.together.ai/settings/projects/~current/api-keys', 'openai/gpt-oss-120b'),
  huggingface: mode2('huggingface', 'Hugging Face', 'https://router.huggingface.co/v1', 'https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained', 'deepseek-ai/DeepSeek-V4.1-Flash'),
  cerebras: mode2('cerebras', 'Cerebras', 'https://api.cerebras.ai/v1', 'https://cloud.cerebras.ai', 'gpt-oss-120b'),
  'opencode-zen': mode2('opencode-zen', 'OpenCode Zen', 'https://opencode.ai/inference/openai/v1', 'https://opencode.ai/console', 'deepseek-v4.1-flash', 'https://opencode.ai/inference/v1/models'),
});

export const SEARCH_SERVICES = deepFreeze({
  exa: {
    id: 'exa',
    label: 'Exa',
    endpoint: 'https://api.exa.ai/search',
    host: 'https://api.exa.ai/*',
    auth: 'x-api-key',
    keyHint: { prefix: null, url: 'https://dashboard.exa.ai/api-keys' },
  },
  tavily: {
    id: 'tavily',
    label: 'Tavily',
    endpoint: 'https://api.tavily.com/search',
    host: 'https://api.tavily.com/*',
    auth: 'bearer',
    keyHint: { prefix: 'tvly-', url: 'https://app.tavily.com' },
  },
});

export function getProvider(id) {
  return Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id] : undefined;
}

export function resolveModel(entry, settings) {
  return settings?.models?.[entry.id] || entry.defaultModel;
}

export function canSearchNatively(entry, model) {
  return !!entry.search && entry.search.models.test(model);
}

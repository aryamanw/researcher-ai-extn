import { complete as anthropicComplete, searchAndRank as anthropicSearchAndRank } from './anthropic.js';
import { complete as openaiComplete, searchAndRank as openaiSearchAndRank } from './openai.js';
import { complete as geminiComplete, searchAndRank as geminiSearchAndRank } from './gemini.js';
import { complete as openrouterComplete, searchAndRank as openrouterSearchAndRank } from './openrouter.js';

const PROVIDERS = {
  anthropic: anthropicComplete,
  openai: openaiComplete,
  gemini: geminiComplete,
  openrouter: openrouterComplete,
};

const SEARCH_PROVIDERS = {
  anthropic: anthropicSearchAndRank,
  openai: openaiSearchAndRank,
  gemini: geminiSearchAndRank,
  openrouter: openrouterSearchAndRank,
};

function resolveApiKey(settings, provider) {
  const apiKey = provider === 'openrouter' ? settings.openrouterToken : settings.apiKeys?.[provider];
  if (!apiKey) {
    throw new Error(`No API key/token configured for provider: ${provider}`);
  }
  return apiKey;
}

export async function getCompletion(settings, prompt, signal) {
  const { provider, model } = settings;
  const completeFn = PROVIDERS[provider];
  if (!completeFn) {
    throw new Error(`No provider configured: ${provider}`);
  }
  const apiKey = resolveApiKey(settings, provider);
  return completeFn({ apiKey, model, prompt, signal });
}

export async function getSearchResults(settings, { pageTitle, pageText, resultsCount }, signal) {
  const { provider, model } = settings;
  const searchFn = SEARCH_PROVIDERS[provider];
  if (!searchFn) {
    throw new Error(`No provider configured: ${provider}`);
  }
  const apiKey = resolveApiKey(settings, provider);
  return searchFn({ apiKey, model, pageTitle, pageText, resultsCount, signal });
}

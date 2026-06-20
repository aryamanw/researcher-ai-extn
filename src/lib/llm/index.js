import { complete as anthropicComplete } from './anthropic.js';
import { complete as openaiComplete } from './openai.js';
import { complete as geminiComplete } from './gemini.js';
import { complete as openrouterComplete } from './openrouter.js';

const PROVIDERS = {
  anthropic: anthropicComplete,
  openai: openaiComplete,
  gemini: geminiComplete,
  openrouter: openrouterComplete,
};

export async function getCompletion(settings, prompt) {
  const { provider, model } = settings;
  const completeFn = PROVIDERS[provider];
  if (!completeFn) {
    throw new Error(`No provider configured: ${provider}`);
  }

  const apiKey = provider === 'openrouter' ? settings.openrouterToken : settings.apiKeys?.[provider];

  if (!apiKey) {
    throw new Error(`No API key/token configured for provider: ${provider}`);
  }

  return completeFn({ apiKey, model, prompt });
}

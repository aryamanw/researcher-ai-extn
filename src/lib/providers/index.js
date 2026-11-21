import { PROVIDERS, SEARCH_SERVICES, resolveModel, canSearchNatively } from './registry.js';
import { FORMATS } from './formats/index.js';
import { runModeTwo } from '../search/modeTwo.js';
import { ProviderError } from './errors.js';

export function resolveApiKey(settings, providerId) {
  const key = settings?.apiKeys?.[providerId];
  if (key) return key;
  return providerId === 'openrouter' ? settings?.openrouterToken || '' : '';
}

export function planSearch(settings) {
  const entry = PROVIDERS[settings?.provider];
  if (!entry) throw new ProviderError('No provider configured.', { kind: 'not-configured' });
  const apiKey = resolveApiKey(settings, entry.id);
  if (!apiKey) throw new ProviderError(`No API key for ${entry.label}.`, { kind: 'not-configured', provider: entry.id });
  const model = resolveModel(entry, settings);

  if (canSearchNatively(entry, model)) return { mode: 1, entry, model, apiKey };

  const serviceId = settings.searchService;
  const serviceKey = SEARCH_SERVICES[serviceId] ? settings.searchKeys?.[serviceId] : '';
  if (!serviceKey) {
    throw new ProviderError(`${model} cannot search the web. Add an Exa or Tavily key in settings.`,
      { kind: 'needs-search-key', provider: entry.id, model });
  }
  return { mode: 2, entry, model, apiKey, searchService: { id: serviceId, apiKey: serviceKey } };
}

export async function searchAndRank(settings, { pageTitle, pageText, resultsCount }, { signal, onStatus } = {}) {
  const plan = planSearch(settings);
  const { entry, model, apiKey } = plan;
  const format = FORMATS[entry.format];
  try {
    if (plan.mode === 1) {
      onStatus?.('Searching...');
      return await format.searchAndRank({ entry, apiKey, model, pageTitle, pageText, resultsCount, signal });
    }
    return await runModeTwo({
      complete: (prompt) => format.complete({ entry, apiKey, model, prompt, signal }),
      searchService: plan.searchService,
      pageTitle, pageText, resultsCount, signal, onStatus,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new ProviderError(`Network error: ${err.message}`, { kind: 'network', provider: entry.id, model });
    }
    throw err;
  }
}

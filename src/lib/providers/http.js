import { ProviderError } from './errors.js';
import { getProvider, SEARCH_SERVICES } from './registry.js';

// Gemini and xAI answer a bad key with 400 instead of 401.
const BAD_KEY = /API_KEY_INVALID|api key not valid|incorrect api key/i;
const MODEL_MISSING = /model[^"]*(does not exist|not found|not supported|unavailable|invalid)|(unknown|invalid|unsupported) model/i;

// Exa/Tavily quota-exhausted codes are unverified (see TODO.md release gate).
const SEARCH_QUOTA_STATUSES = new Set([402, 429, 432, 433]);

function kindFor(status, body, { isSearchService, model }) {
  if (status === 401 || status === 403 || (status === 400 && BAD_KEY.test(body))) return 'auth';
  if (status === 429 || (isSearchService && SEARCH_QUOTA_STATUSES.has(status))) return 'rate-limit';
  if (status >= 500) return 'server';
  if (!model) return 'http';
  if (status === 404) return 'model-unavailable';
  if (status === 400 && MODEL_MISSING.test(body)) return 'model-unavailable';
  return 'http';
}

export async function errorFromResponse(response, { provider, model } = {}) {
  let body = '';
  try {
    body = await response.text();
  } catch {
    body = '';
  }
  const service = Object.hasOwn(SEARCH_SERVICES, provider) ? SEARCH_SERVICES[provider] : undefined;
  const label = service?.label || getProvider(provider)?.label || provider;
  return new ProviderError(`${label} API error: ${response.status}`, {
    kind: kindFor(response.status, body, { isSearchService: !!service, model }),
    provider,
    model,
    status: response.status,
  });
}

export function authHeaders(entry, apiKey) {
  const headers = { 'content-type': 'application/json' };
  if (entry.auth === 'bearer') {
    headers.Authorization = `Bearer ${apiKey}`;
  } else if (entry.auth === 'x-api-key') {
    headers['x-api-key'] = apiKey;
    if (entry.format === 'anthropic') {
      headers['anthropic-version'] = '2023-06-01';
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
  } else if (entry.auth === 'x-goog-api-key') {
    headers['x-goog-api-key'] = apiKey;
  }
  return headers;
}

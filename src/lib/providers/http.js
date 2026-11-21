import { ProviderError } from './errors.js';
import { getProvider } from './registry.js';

const MODEL_MISSING = /model[^"]*(does not exist|not found|not supported|unavailable|invalid)|(unknown|invalid|unsupported) model/i;

function kindFor(status, body) {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate-limit';
  if (status >= 500) return 'server';
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
  const label = getProvider(provider)?.label || provider;
  return new ProviderError(`${label} API error: ${response.status}`, {
    kind: kindFor(response.status, body),
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

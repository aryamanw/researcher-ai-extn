import { authHeaders, errorFromResponse } from './http.js';
import { ProviderError } from './errors.js';

function endpointUrl(entry) {
  const endpoint = entry.modelsEndpoint;
  const url = /^https?:\/\//.test(endpoint) ? endpoint : entry.baseUrl + endpoint;
  if (entry.format === 'anthropic') return `${url}?limit=1000`;
  if (entry.format === 'gemini') return `${url}?pageSize=1000`;
  return url;
}

function itemsOf(body) {
  if (Array.isArray(body)) return body; // Together may return a bare array
  return body?.data || body?.models || [];
}

function idsOf(entry, items) {
  const ids = [];
  for (const raw of items) {
    if (entry.format === 'gemini') {
      const methods = raw.supportedGenerationMethods;
      if (Array.isArray(methods) && !methods.includes('generateContent')) continue;
      if (typeof raw.name === 'string') ids.push(raw.name.replace(/^models\//, ''));
    } else if (typeof raw?.id === 'string' && (!entry.modelsFilter || entry.modelsFilter(raw))) {
      ids.push(raw.id);
    }
  }
  return ids;
}

export async function listModels(entry, apiKey, { signal } = {}) {
  if (!entry.modelsEndpoint) return [];
  let response;
  try {
    response = await fetch(endpointUrl(entry), { method: 'GET', headers: authHeaders(entry, apiKey), signal });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ProviderError(`Couldn't reach ${entry.label}`, { kind: 'network', provider: entry.id });
  }
  if (!response.ok) throw await errorFromResponse(response, { provider: entry.id });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ProviderError(`${entry.label} returned an unreadable models list`, { kind: 'http', provider: entry.id });
  }
  return [...new Set(idsOf(entry, itemsOf(body)))].sort();
}

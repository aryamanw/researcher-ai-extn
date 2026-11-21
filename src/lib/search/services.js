import { SEARCH_SERVICES } from '../providers/registry.js';
import { authHeaders, errorFromResponse } from '../providers/http.js';

function buildBody(serviceId, query, maxResults) {
  if (serviceId === 'exa') {
    return { query, numResults: maxResults, type: 'auto', contents: { highlights: true } };
  }
  return { query, max_results: maxResults, search_depth: 'basic' };
}

function normalize(serviceId, item) {
  const snippet = serviceId === 'exa'
    ? (Array.isArray(item.highlights) && item.highlights.length ? item.highlights.join(' ') : item.text)
    : item.content;
  return { url: item.url, title: item.title || '', snippet: snippet || '' };
}

export async function searchWeb({ serviceId, apiKey, query, maxResults, signal }) {
  const entry = SEARCH_SERVICES[serviceId];
  const response = await fetch(entry.endpoint, {
    method: 'POST',
    headers: authHeaders(entry, apiKey),
    body: JSON.stringify(buildBody(serviceId, query, maxResults)),
    signal,
  });
  if (!response.ok) {
    throw await errorFromResponse(response, { provider: serviceId, model: undefined });
  }
  const data = await response.json();
  return (data.results || []).filter((r) => r?.url).map((r) => normalize(serviceId, r));
}

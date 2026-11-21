import { authHeaders, errorFromResponse } from '../http.js';
import { CITATION_EXTRACTORS, filterToCited } from '../citations.js';
import { buildSearchPrompt, computeFetchCount, parseSearchResults } from '../../llm/searchResponse.js';

const LEGACY_MODEL = /^claude-(3|opus-4-[0-5]|sonnet-4-[0-5]|haiku-4)/;

async function post({ entry, apiKey, model, body, signal }) {
  const response = await fetch(`${entry.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: authHeaders(entry, apiKey),
    body: JSON.stringify({ model, max_tokens: 16000, ...body }),
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response, { provider: entry.id, model });
  return response.json();
}

export async function complete({ entry, apiKey, model, prompt, signal }) {
  const m = model || entry.defaultModel;
  const data = await post({ entry, apiKey, model: m, signal, body: { messages: [{ role: 'user', content: prompt }] } });
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

export async function searchAndRank({ entry, apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const m = model || entry.defaultModel;
  const max_uses = Math.max(computeFetchCount(resultsCount), 3);
  const tool = LEGACY_MODEL.test(m)
    ? { type: 'web_search_20250305', name: 'web_search', max_uses }
    : { ...structuredClone(entry.search.tool), max_uses };
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const data = await post({
    entry, apiKey, model: m, signal,
    body: { messages: [{ role: 'user', content: prompt }], tools: [tool] },
  });
  const cited = CITATION_EXTRACTORS[entry.search.citations](data);
  return filterToCited(parseSearchResults(cited.text), cited);
}

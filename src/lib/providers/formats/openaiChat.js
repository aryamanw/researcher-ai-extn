import { authHeaders, errorFromResponse } from '../http.js';
import { CITATION_EXTRACTORS, filterToCited } from '../citations.js';
import { buildSearchPrompt, computeFetchCount, parseSearchResults } from '../../llm/searchResponse.js';

async function post({ entry, apiKey, model, body, signal }) {
  const response = await fetch(`${entry.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(entry, apiKey),
    body: JSON.stringify({ model, ...body }),
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response, { provider: entry.id, model });
  return response.json();
}

export async function complete({ entry, apiKey, model, prompt, signal }) {
  const m = model || entry.defaultModel;
  const data = await post({ entry, apiKey, model: m, signal, body: { messages: [{ role: 'user', content: prompt }] } });
  return data.choices?.[0]?.message?.content || '';
}

export async function searchAndRank({ entry, apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const m = model || entry.defaultModel;
  const tool = structuredClone(entry.search.tool);
  if (tool.type === 'openrouter:web_search') {
    tool.parameters = { ...tool.parameters, max_results: Math.min(25, computeFetchCount(resultsCount)) };
  }
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const data = await post({
    entry, apiKey, model: m, signal,
    body: { messages: [{ role: 'user', content: prompt }], tools: [tool], ...entry.search.extra },
  });
  const cited = CITATION_EXTRACTORS[entry.search.citations](data);
  return filterToCited(parseSearchResults(cited.text), cited);
}

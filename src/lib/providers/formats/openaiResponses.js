import { authHeaders, errorFromResponse } from '../http.js';
import { CITATION_EXTRACTORS, filterToCited } from '../citations.js';
import { buildSearchPrompt, parseSearchResults } from '../../llm/searchResponse.js';

async function post({ entry, apiKey, model, body, signal }) {
  const response = await fetch(`${entry.baseUrl}/responses`, {
    method: 'POST',
    headers: authHeaders(entry, apiKey),
    body: JSON.stringify({ model, ...body }),
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response, { provider: entry.id, model });
  return response.json();
}

export async function complete({ entry, apiKey, model, prompt, signal }) {
  const data = await post({ entry, apiKey, model: model || entry.defaultModel, signal, body: { input: prompt } });
  return CITATION_EXTRACTORS['responses-annotations'](data).text;
}

export async function searchAndRank({ entry, apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const data = await post({
    entry, apiKey, model: model || entry.defaultModel, signal,
    body: { input: prompt, tools: [entry.search.tool], ...entry.search.extra },
  });
  const cited = CITATION_EXTRACTORS[entry.search.citations](data);
  return filterToCited(parseSearchResults(cited.text), cited);
}

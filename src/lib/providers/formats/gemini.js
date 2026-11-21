import { authHeaders, errorFromResponse } from '../http.js';
import { CITATION_EXTRACTORS, filterToCited } from '../citations.js';
import { ProviderError } from '../errors.js';
import { buildSearchPrompt, parseSearchResults } from '../../llm/searchResponse.js';

const MODEL_NAME_PATTERN = /^[\w.-]+$/;

async function post({ entry, apiKey, model, body, signal }) {
  if (!MODEL_NAME_PATTERN.test(model)) {
    throw new ProviderError(`Invalid Gemini model name: ${model}`, { kind: 'model-unavailable', provider: entry.id, model });
  }
  const response = await fetch(`${entry.baseUrl}/models/${model}:generateContent`, {
    method: 'POST',
    headers: authHeaders(entry, apiKey),
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await errorFromResponse(response, { provider: entry.id, model });
  return response.json();
}

export async function complete({ entry, apiKey, model, prompt, signal }) {
  const m = model || entry.defaultModel;
  const data = await post({ entry, apiKey, model: m, signal, body: { contents: [{ parts: [{ text: prompt }] }] } });
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function searchAndRank({ entry, apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const m = model || entry.defaultModel;
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const data = await post({
    entry, apiKey, model: m, signal,
    body: { contents: [{ parts: [{ text: prompt }] }], tools: [structuredClone(entry.search.tool)] },
  });
  const cited = CITATION_EXTRACTORS[entry.search.citations](data);
  return filterToCited(parseSearchResults(cited.text), cited);
}

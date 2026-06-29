import { buildSearchPrompt, computeFetchCount, parseSearchResults, filterUncitedResults } from './searchResponse.js';

export async function complete({ apiKey, model, prompt, signal }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function searchAndRank({ apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      tools: [{ type: 'openrouter:web_search', parameters: { max_results: computeFetchCount(resultsCount) } }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const text = message?.content || '';
  const citedUrls = (message?.annotations || [])
    .filter((a) => a.type === 'url_citation')
    .map((a) => a.url_citation?.url)
    .filter(Boolean);

  return filterUncitedResults(parseSearchResults(text), citedUrls);
}

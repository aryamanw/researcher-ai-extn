import { buildSearchPrompt, parseSearchResults, filterUncitedResults } from './searchResponse.js';

export async function complete({ apiKey, model, prompt, signal }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function searchAndRank({ apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      input: prompt,
      tools: [{ type: 'web_search' }],
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const messageItem = (data.output || []).find((item) => item.type === 'message');
  const textContent = (messageItem?.content || []).find((c) => c.type === 'output_text');
  const text = textContent?.text || '';
  const citedUrls = (textContent?.annotations || [])
    .filter((a) => a.type === 'url_citation')
    .map((a) => a.url)
    .filter(Boolean);

  return filterUncitedResults(parseSearchResults(text), citedUrls);
}

import { buildSearchPrompt, parseSearchResults, filterUncitedResults } from './searchResponse.js';

const MODEL_NAME_PATTERN = /^[\w.-]+$/;

export async function complete({ apiKey, model, prompt, signal }) {
  const modelName = model || 'gemini-1.5-flash';
  if (!MODEL_NAME_PATTERN.test(modelName)) {
    throw new Error(`Invalid Gemini model name: ${modelName}`);
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function searchAndRank({ apiKey, model, pageTitle, pageText, resultsCount, signal }) {
  const modelName = model || 'gemini-2.0-flash';
  if (!MODEL_NAME_PATTERN.test(modelName)) {
    throw new Error(`Invalid Gemini model name: ${modelName}`);
  }
  const prompt = buildSearchPrompt({ pageTitle, pageText, resultsCount });
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts || []).map((p) => p.text || '').join('');
  const citedUrls = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.web?.uri)
    .filter(Boolean);

  return filterUncitedResults(parseSearchResults(text), citedUrls);
}

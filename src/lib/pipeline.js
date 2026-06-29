function dedupeByUrl(results) {
  const seen = new Set();
  const deduped = [];
  for (const result of results) {
    if (!result.url || seen.has(result.url)) continue;
    seen.add(result.url);
    deduped.push(result);
  }
  return deduped;
}

function toScore(score) {
  return typeof score === 'number' && Number.isFinite(score) ? score : 0;
}

function sortByScore(results) {
  return [...results].sort((a, b) => toScore(b.score) - toScore(a.score));
}

export async function runPipeline({ pageTitle, pageUrl, articleText, llmClient, resultsCount = 8 }) {
  const results = await llmClient.searchAndRank({ pageTitle, pageText: articleText, resultsCount });

  if (!Array.isArray(results)) {
    throw new Error('LLM did not return a ranked results array');
  }

  const filtered = dedupeByUrl(results).filter((result) => result.url !== pageUrl);
  return sortByScore(filtered).slice(0, resultsCount);
}

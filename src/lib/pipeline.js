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

export async function runPipeline({ pageTitle, pageUrl, articleText, llmClient, resultsCount = 8 }) {
  const results = await llmClient.searchAndRank({ pageTitle, pageText: articleText, resultsCount });

  if (!Array.isArray(results)) {
    throw new Error('LLM did not return a ranked results array');
  }

  return dedupeByUrl(results).filter((result) => result.url !== pageUrl);
}

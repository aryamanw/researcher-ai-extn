import { SEARCH_SERVICES } from '../providers/registry.js';
import { computeFetchCount } from '../llm/searchResponse.js';
import { searchWeb } from './services.js';
import { buildQueryPrompt, parseQueries, buildRankPrompt, parseRanked } from './prompts.js';

const EXCERPT_CHARS = 2000;

function checkAborted(signal) {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
}

export async function runModeTwo({ complete, searchService, pageTitle, pageText, resultsCount, signal, onStatus }) {
  checkAborted(signal);
  onStatus?.('Writing search queries…');
  const queryRaw = await complete(buildQueryPrompt({ pageTitle, pageText }));
  const queries = parseQueries(queryRaw, pageTitle);
  checkAborted(signal);

  onStatus?.(`Searching with ${SEARCH_SERVICES[searchService.id].label}…`);
  const maxResults = Math.ceil(computeFetchCount(resultsCount) / queries.length);
  const settled = await Promise.allSettled(queries.map((query) =>
    searchWeb({ serviceId: searchService.id, apiKey: searchService.apiKey, query, maxResults, signal })));
  const fulfilled = settled.filter((s) => s.status === 'fulfilled');
  if (!fulfilled.length) throw settled[0].reason;
  checkAborted(signal);

  const seen = new Set();
  const candidates = [];
  for (const { value } of fulfilled) {
    for (const item of value) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      candidates.push(item);
    }
  }
  if (!candidates.length) return [];

  onStatus?.('Ranking results…');
  const rankRaw = await complete(buildRankPrompt({
    pageTitle,
    excerpt: String(pageText ?? '').slice(0, EXCERPT_CHARS),
    candidates,
    resultsCount,
  }));
  return parseRanked(rankRaw, candidates);
}

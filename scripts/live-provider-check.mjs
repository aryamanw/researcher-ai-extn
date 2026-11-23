#!/usr/bin/env node
// Live check of every provider against the real APIs, using the same code the side panel runs.
//
//   node scripts/live-provider-check.mjs                 run every provider that has a key
//   node scripts/live-provider-check.mjs anthropic exa   only these providers / search services
//   node scripts/live-provider-check.mjs --url <page>    use a real article instead of the fixture
//   node scripts/live-provider-check.mjs --bad-keys      send fake keys everywhere; checks auth-error mapping (no keys needed)
//
// Keys come from the environment or a .env file in the repo root (gitignored), e.g.
//   ANTHROPIC_API_KEY=...   OLLAMA_CLOUD_API_KEY=...   EXA_API_KEY=...   TAVILY_API_KEY=...
// Optional per-provider model override: ANTHROPIC_MODEL=claude-sonnet-5-5
// Keys are never printed.

import { readFileSync, existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { PROVIDERS, SEARCH_SERVICES, resolveModel, canSearchNatively } from '../src/lib/providers/registry.js';
import { searchAndRank } from '../src/lib/providers/index.js';
import { listModels } from '../src/lib/providers/models.js';
import { searchWeb } from '../src/lib/search/services.js';
import { runPipeline } from '../src/lib/pipeline.js';
import { extractArticle } from '../src/lib/extraction.js';

const root = new URL('..', import.meta.url);
const envName = (id, suffix) => `${id.toUpperCase().replace(/-/g, '_')}_${suffix}`;

function loadDotEnv() {
  const file = new URL('.env', root);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

async function loadPage(url) {
  if (!url) {
    const html = readFileSync(new URL('fixtures/article.html', root), 'utf8');
    return extractArticle(new JSDOM(html).window.document, 'https://example.com/tidal-energy');
  }
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 research-companion-live-check' } });
  if (!res.ok) throw new Error(`Couldn't fetch ${url}: HTTP ${res.status}`);
  return extractArticle(new JSDOM(await res.text(), { url }).window.document, url);
}

const describe = (err) =>
  err?.name === 'ProviderError'
    ? `${err.kind}${err.status ? ` (HTTP ${err.status})` : ''}: ${err.message}`
    : `${err?.name || 'Error'}: ${err?.message}`;

const timed = async (fn) => {
  const start = Date.now();
  const value = await fn();
  return { value, secs: ((Date.now() - start) / 1000).toFixed(1) };
};

function settingsFor(entry, { apiKey, model, searchService, searchKey }) {
  return {
    provider: entry.id,
    apiKeys: { [entry.id]: apiKey },
    models: model ? { [entry.id]: model } : {},
    searchService: searchService || null,
    searchKeys: searchService ? { [searchService]: searchKey } : {},
    resultsCount: 5,
  };
}

async function checkProvider(entry, page, searchKeys, summary) {
  const apiKey = process.env[envName(entry.id, 'API_KEY')];
  const model = resolveModel(entry, { models: { [entry.id]: process.env[envName(entry.id, 'MODEL')] || '' } });
  console.log(`\n## ${entry.label} (${model})`);
  if (!apiKey) {
    console.log(`  skipped: set ${envName(entry.id, 'API_KEY')}`);
    summary.push([entry.label, 'skipped (no key)']);
    return;
  }

  try {
    const ids = await listModels(entry, apiKey);
    const listed = ids.includes(model);
    console.log(`  model list: ${ids.length} models; ${model} ${listed ? 'is listed' : 'is NOT listed'}`);
    if (!listed) summary.push([`${entry.label} model list`, `WARN: ${model} not listed`]);
  } catch (err) {
    console.log(`  model list: FAILED ${describe(err)}`);
    summary.push([`${entry.label} model list`, `FAIL: ${describe(err)}`]);
  }

  const runs = canSearchNatively(entry, model)
    ? [{ label: 'built-in search' }]
    : Object.keys(SEARCH_SERVICES).map((id) => ({ label: `via ${SEARCH_SERVICES[id].label}`, searchService: id }));

  for (const run of runs) {
    const searchKey = run.searchService && searchKeys[run.searchService];
    if (run.searchService && !searchKey) {
      console.log(`  ${run.label}: skipped (set ${envName(run.searchService, 'API_KEY')})`);
      summary.push([`${entry.label} ${run.label}`, 'skipped (no search key)']);
      continue;
    }
    const settings = settingsFor(entry, { apiKey, model, searchService: run.searchService, searchKey });
    const statuses = [];
    try {
      const { value: results, secs } = await timed(() =>
        runPipeline({
          pageTitle: page.title,
          pageUrl: page.url,
          articleText: page.text,
          resultsCount: settings.resultsCount,
          llmClient: {
            searchAndRank: (args) => searchAndRank(settings, args, { onStatus: (s) => statuses.push(s) }),
          },
        }),
      );
      console.log(`  ${run.label}: ${results.length} results in ${secs}s  [${statuses.join(' → ')}]`);
      for (const r of results) console.log(`    - ${r.title}\n      ${r.url}\n      ${r.relevance || r.snippet || ''}`);
      summary.push([`${entry.label} ${run.label}`, results.length ? `ok, ${results.length} results, ${secs}s` : 'FAIL: 0 results']);
    } catch (err) {
      console.log(`  ${run.label}: FAILED ${describe(err)}`);
      summary.push([`${entry.label} ${run.label}`, `FAIL: ${describe(err)}`]);
    }
  }
}

async function checkSearchService(id, apiKey, page, summary) {
  const label = SEARCH_SERVICES[id].label;
  console.log(`\n## ${label} (direct search)`);
  if (!apiKey) {
    console.log(`  skipped: set ${envName(id, 'API_KEY')}`);
    summary.push([label, 'skipped (no key)']);
    return;
  }
  try {
    const { value: hits, secs } = await timed(() => searchWeb({ serviceId: id, apiKey, query: page.title, maxResults: 5 }));
    console.log(`  ${hits.length} hits in ${secs}s`);
    for (const h of hits) console.log(`    - ${h.title}  ${h.url}`);
    summary.push([label, hits.length ? `ok, ${hits.length} hits` : 'FAIL: 0 hits']);
  } catch (err) {
    console.log(`  FAILED ${describe(err)}`);
    summary.push([label, `FAIL: ${describe(err)}`]);
  }
}

async function checkBadKeys(only, page) {
  const fake = 'invalid-key-for-live-check';
  const summary = [];
  for (const entry of Object.values(PROVIDERS)) {
    if (only.size && !only.has(entry.id)) continue;
    const model = resolveModel(entry, {});
    const searchService = canSearchNatively(entry, model) ? null : 'exa';
    // Mode 2 starts with an LLM call, so a fake provider key fails before Exa is contacted.
    const settings = settingsFor(entry, { apiKey: fake, searchService, searchKey: fake });
    try {
      await searchAndRank(settings, { pageTitle: page.title, pageText: page.text, resultsCount: 3 });
      summary.push([entry.label, 'UNEXPECTED: fake key accepted']);
    } catch (err) {
      summary.push([entry.label, `${err.kind === 'auth' ? 'ok' : 'CHECK'} → ${describe(err)}`]);
    }
  }
  for (const id of Object.keys(SEARCH_SERVICES)) {
    if (only.size && !only.has(id)) continue;
    try {
      await searchWeb({ serviceId: id, apiKey: fake, query: 'tidal energy', maxResults: 3 });
      summary.push([SEARCH_SERVICES[id].label, 'UNEXPECTED: fake key accepted']);
    } catch (err) {
      summary.push([SEARCH_SERVICES[id].label, `${err.kind === 'auth' ? 'ok' : 'CHECK'} → ${describe(err)}`]);
    }
  }
  return summary;
}

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf('--url');
  const url = urlIndex >= 0 ? args[urlIndex + 1] : null;
  const only = new Set(args.filter((a, i) => !a.startsWith('--') && i !== urlIndex + 1));
  const known = [...Object.keys(PROVIDERS), ...Object.keys(SEARCH_SERVICES)];
  const unknown = [...only].filter((id) => !known.includes(id));
  if (unknown.length) throw new Error(`Unknown id(s): ${unknown.join(', ')}. Known: ${known.join(', ')}`);

  const page = await loadPage(url);
  if (page.confidence === 'low') throw new Error('Extraction found too little text on that page.');
  console.log(`Page: "${page.title}" (${page.text.length} chars)`);

  let summary;
  if (args.includes('--bad-keys')) {
    summary = await checkBadKeys(only, page);
  } else {
    summary = [];
    const searchKeys = Object.fromEntries(Object.keys(SEARCH_SERVICES).map((id) => [id, process.env[envName(id, 'API_KEY')]]));
    for (const id of Object.keys(SEARCH_SERVICES)) {
      if (!only.size || only.has(id)) await checkSearchService(id, searchKeys[id], page, summary);
    }
    for (const entry of Object.values(PROVIDERS)) {
      if (!only.size || only.has(entry.id)) await checkProvider(entry, page, searchKeys, summary);
    }
  }

  console.log('\n# Summary');
  const width = Math.max(...summary.map(([name]) => name.length));
  for (const [name, result] of summary) console.log(`  ${name.padEnd(width)}  ${result}`);
  if (summary.some(([, r]) => /^(FAIL|UNEXPECTED)/.test(r))) process.exitCode = 1;
}

main().catch((err) => {
  console.error(describe(err));
  process.exit(1);
});

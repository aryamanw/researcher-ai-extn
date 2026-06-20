import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/lib/pipeline.js';

function makeLlmClient(responses) {
  let call = 0;
  return { complete: vi.fn(async () => responses[call++]) };
}

describe('runPipeline', () => {
  it('generates queries, searches, dedupes, and reranks', async () => {
    const llmClient = makeLlmClient([
      JSON.stringify({ topic: 'tidal energy', queries: ['tidal energy investment', 'marine turbine costs'] }),
      JSON.stringify([
        { title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1', relevance: 'Same funding angle' },
      ]),
    ]);
    const searchClient = {
      search: vi
        .fn()
        .mockResolvedValueOnce([{ title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1' }])
        .mockResolvedValueOnce([{ title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1' }]),
    };

    const results = await runPipeline({
      pageTitle: 'Why Tidal Energy Is Finally Getting Investment',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      searchClient,
      resultsCount: 8,
    });

    expect(results).toEqual([
      { title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1', relevance: 'Same funding angle' },
    ]);
    expect(searchClient.search).toHaveBeenCalledWith('tidal energy investment');
    expect(searchClient.search).toHaveBeenCalledWith('marine turbine costs');
  });

  it('excludes the source page URL from candidates', async () => {
    const llmClient = makeLlmClient([
      JSON.stringify({ topic: 't', queries: ['q1'] }),
      JSON.stringify([{ title: 'Other', url: 'https://other.com', snippet: 's', relevance: 'r' }]),
    ]);
    const searchClient = {
      search: vi.fn().mockResolvedValue([
        { title: 'Self', url: 'https://example.com/article', snippet: 's' },
        { title: 'Other', url: 'https://other.com', snippet: 's' },
      ]),
    };

    await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      searchClient,
      resultsCount: 8,
    });

    const rerankPromptArg = llmClient.complete.mock.calls[1][0];
    expect(rerankPromptArg).not.toContain('https://example.com/article');
  });

  it('returns an empty array when search finds no candidates', async () => {
    const llmClient = makeLlmClient([JSON.stringify({ topic: 't', queries: ['q1'] })]);
    const searchClient = { search: vi.fn().mockResolvedValue([]) };

    const results = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      searchClient,
      resultsCount: 8,
    });

    expect(results).toEqual([]);
    expect(llmClient.complete).toHaveBeenCalledTimes(1);
  });

  it('throws when the LLM does not return valid queries JSON', async () => {
    const llmClient = makeLlmClient(['not json']);
    const searchClient = { search: vi.fn() };

    await expect(
      runPipeline({
        pageTitle: 't',
        pageUrl: 'https://example.com/article',
        articleText: 'a'.repeat(300),
        llmClient,
        searchClient,
        resultsCount: 8,
      })
    ).rejects.toThrow('Could not parse JSON from topic/query generation response');
  });
});

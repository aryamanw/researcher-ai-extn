import { describe, it, expect, vi } from 'vitest';
import { runPipeline } from '../src/lib/pipeline.js';

describe('runPipeline', () => {
  it('calls searchAndRank once and returns its results', async () => {
    const results = [{ title: 'Tidal Funding Surges', url: 'https://x.com/1', snippet: 's1', relevance: 'r' }];
    const llmClient = { searchAndRank: vi.fn().mockResolvedValue(results) };

    const outcome = await runPipeline({
      pageTitle: 'Why Tidal Energy Is Finally Getting Investment',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 8,
    });

    expect(outcome).toEqual(results);
    expect(llmClient.searchAndRank).toHaveBeenCalledWith({
      pageTitle: 'Why Tidal Energy Is Finally Getting Investment',
      pageText: 'a'.repeat(300),
      resultsCount: 8,
    });
  });

  it('excludes the source page URL from results', async () => {
    const llmClient = {
      searchAndRank: vi.fn().mockResolvedValue([
        { title: 'Self', url: 'https://example.com/article', snippet: 's', relevance: 'r' },
        { title: 'Other', url: 'https://other.com', snippet: 's', relevance: 'r' },
      ]),
    };

    const outcome = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 8,
    });

    expect(outcome).toEqual([{ title: 'Other', url: 'https://other.com', snippet: 's', relevance: 'r' }]);
  });

  it('dedupes results by url', async () => {
    const llmClient = {
      searchAndRank: vi.fn().mockResolvedValue([
        { title: 'A', url: 'https://a.com', snippet: 's', relevance: 'r' },
        { title: 'A again', url: 'https://a.com', snippet: 's', relevance: 'r' },
      ]),
    };

    const outcome = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 8,
    });

    expect(outcome).toEqual([{ title: 'A', url: 'https://a.com', snippet: 's', relevance: 'r' }]);
  });

  it('returns an empty array when searchAndRank finds nothing', async () => {
    const llmClient = { searchAndRank: vi.fn().mockResolvedValue([]) };

    const outcome = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 8,
    });

    expect(outcome).toEqual([]);
  });

  it('throws when searchAndRank does not return an array', async () => {
    const llmClient = { searchAndRank: vi.fn().mockResolvedValue(null) };

    await expect(
      runPipeline({
        pageTitle: 't',
        pageUrl: 'https://example.com/article',
        articleText: 'a'.repeat(300),
        llmClient,
        resultsCount: 8,
      })
    ).rejects.toThrow('LLM did not return a ranked results array');
  });
});

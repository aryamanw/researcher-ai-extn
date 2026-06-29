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

  it('sorts results by score descending', async () => {
    const llmClient = {
      searchAndRank: vi.fn().mockResolvedValue([
        { title: 'Low', url: 'https://low.com', snippet: 's', relevance: 'r', score: 20 },
        { title: 'High', url: 'https://high.com', snippet: 's', relevance: 'r', score: 90 },
        { title: 'Mid', url: 'https://mid.com', snippet: 's', relevance: 'r', score: 50 },
      ]),
    };

    const outcome = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 8,
    });

    expect(outcome.map((r) => r.title)).toEqual(['High', 'Mid', 'Low']);
  });

  it('sorts missing or non-numeric scores to the bottom without throwing', async () => {
    const llmClient = {
      searchAndRank: vi.fn().mockResolvedValue([
        { title: 'NoScore', url: 'https://noscore.com', snippet: 's', relevance: 'r' },
        { title: 'Scored', url: 'https://scored.com', snippet: 's', relevance: 'r', score: 10 },
        { title: 'BadScore', url: 'https://badscore.com', snippet: 's', relevance: 'r', score: 'high' },
      ]),
    };

    const outcome = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 8,
    });

    expect(outcome.map((r) => r.title)).toEqual(['Scored', 'NoScore', 'BadScore']);
  });

  it('truncates results to resultsCount after sorting', async () => {
    const llmClient = {
      searchAndRank: vi.fn().mockResolvedValue([
        { title: 'A', url: 'https://a.com', snippet: 's', relevance: 'r', score: 10 },
        { title: 'B', url: 'https://b.com', snippet: 's', relevance: 'r', score: 90 },
        { title: 'C', url: 'https://c.com', snippet: 's', relevance: 'r', score: 50 },
      ]),
    };

    const outcome = await runPipeline({
      pageTitle: 't',
      pageUrl: 'https://example.com/article',
      articleText: 'a'.repeat(300),
      llmClient,
      resultsCount: 2,
    });

    expect(outcome.map((r) => r.title)).toEqual(['B', 'C']);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/search/services.js', () => ({ searchWeb: vi.fn() }));
import { searchWeb } from '../../src/lib/search/services.js';
import { runModeTwo } from '../../src/lib/search/modeTwo.js';

const base = (over = {}) => ({
  complete: vi.fn(),
  searchService: { id: 'exa', apiKey: 'k' },
  pageTitle: 'Title',
  pageText: 'text',
  resultsCount: 5,
  onStatus: vi.fn(),
  ...over,
});

beforeEach(() => { searchWeb.mockReset(); });

describe('runModeTwo', () => {
  it('runs steps in order, dedupes, and returns ranked results', async () => {
    const complete = vi.fn()
      .mockResolvedValueOnce('["q1","q2"]')
      .mockResolvedValueOnce('[{"id":1,"relevance":"r","score":80}]');
    searchWeb.mockImplementation(async ({ query }) => [
      { url: 'https://a.com', title: 'A', snippet: 's' },
      { url: `https://${query}.com`, title: query, snippet: '' },
    ]);
    const args = base({ complete });
    const out = await runModeTwo(args);
    expect(args.onStatus.mock.calls.map((c) => c[0])).toEqual([
      'Writing search queries…', 'Searching with Exa…', 'Ranking results…',
    ]);
    expect(searchWeb).toHaveBeenCalledTimes(2);
    expect(searchWeb.mock.calls[0][0]).toMatchObject({ serviceId: 'exa', apiKey: 'k', maxResults: 4 });
    const rankPrompt = complete.mock.calls[1][0];
    expect(rankPrompt.match(/https:\/\/a\.com/g)).toHaveLength(1);
    expect(out).toEqual([{ url: 'https://a.com', title: 'A', snippet: 's', relevance: 'r', score: 80 }]);
  });

  it('continues with resolved searches when one rejects', async () => {
    const complete = vi.fn().mockResolvedValueOnce('["q1","q2"]').mockResolvedValueOnce('[{"id":1,"relevance":"r","score":5}]');
    searchWeb.mockImplementation(async ({ query }) => {
      if (query === 'q1') throw new Error('boom');
      return [{ url: 'https://ok.com', title: 'OK', snippet: '' }];
    });
    const out = await runModeTwo(base({ complete }));
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://ok.com');
  });

  it('rethrows the first rejection when all searches fail', async () => {
    const complete = vi.fn().mockResolvedValueOnce('["q1","q2"]');
    const err = new Error('auth');
    searchWeb.mockRejectedValue(err);
    await expect(runModeTwo(base({ complete }))).rejects.toBe(err);
  });

  it('returns [] without ranking when there are no candidates', async () => {
    const complete = vi.fn().mockResolvedValueOnce('["q1"]');
    searchWeb.mockResolvedValue([]);
    expect(await runModeTwo(base({ complete }))).toEqual([]);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('rejects with AbortError after the query step without searching', async () => {
    const ctrl = new AbortController();
    const complete = vi.fn().mockImplementationOnce(async () => { ctrl.abort(); return '["q1"]'; });
    const err = await runModeTwo(base({ complete, signal: ctrl.signal })).catch((e) => e);
    expect(err.name).toBe('AbortError');
    expect(searchWeb).not.toHaveBeenCalled();
  });
});

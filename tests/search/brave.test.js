import { describe, it, expect, vi, afterEach } from 'vitest';
import { search } from '../../src/lib/search/brave.js';

afterEach(() => vi.unstubAllGlobals());

describe('brave search', () => {
  it('sends the expected request and maps results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Result 1', url: 'https://a.com', description: 'desc 1' },
            { title: 'Result 2', url: 'https://b.com', description: 'desc 2' },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await search({ apiKey: 'key123', query: 'tidal energy' });

    expect(results).toEqual([
      { title: 'Result 1', url: 'https://a.com', snippet: 'desc 1' },
      { title: 'Result 2', url: 'https://b.com', snippet: 'desc 2' },
    ]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain('q=tidal+energy');
    expect(options.headers['x-subscription-token']).toBe('key123');
  });

  it('returns an empty array when there are no web results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const results = await search({ apiKey: 'key123', query: 'no results here' });
    expect(results).toEqual([]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(search({ apiKey: 'bad', query: 'x' })).rejects.toThrow('Brave Search API error: 403');
  });
});

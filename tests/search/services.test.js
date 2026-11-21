import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchWeb } from '../../src/lib/search/services.js';
import { ProviderError } from '../../src/lib/providers/errors.js';

const ok = (json) => ({ ok: true, status: 200, json: async () => json });
const bad = (status) => ({ ok: false, status, text: async () => '' });

afterEach(() => vi.unstubAllGlobals());

describe('searchWeb', () => {
  it('posts to Exa and normalizes highlights to snippet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ results: [
      { url: 'https://a.com', title: 'A', highlights: ['one', 'two'] },
      { url: 'https://b.com', title: 'B', text: 'body' },
    ] }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    const out = await searchWeb({ serviceId: 'exa', apiKey: 'k', query: 'q', maxResults: 5, signal });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.exa.ai/search');
    expect(init.method).toBe('POST');
    expect(init.headers['x-api-key']).toBe('k');
    expect(init.signal).toBe(signal);
    expect(JSON.parse(init.body)).toMatchObject({ query: 'q', numResults: 5, type: 'auto' });
    expect(JSON.parse(init.body).contents).toBeTruthy();
    expect(out).toEqual([
      { url: 'https://a.com', title: 'A', snippet: 'one two' },
      { url: 'https://b.com', title: 'B', snippet: 'body' },
    ]);
  });

  it('posts to Tavily with bearer auth and normalizes content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ results: [{ url: 'https://a.com', title: 'A', content: 'c' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchWeb({ serviceId: 'tavily', apiKey: 'tk', query: 'q', maxResults: 4 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.tavily.com/search');
    expect(init.headers.Authorization).toBe('Bearer tk');
    expect(JSON.parse(init.body)).toMatchObject({ query: 'q', max_results: 4, search_depth: 'basic' });
    expect(out).toEqual([{ url: 'https://a.com', title: 'A', snippet: 'c' }]);
  });

  it.each([[401, 'auth'], [429, 'rate-limit']])('maps %i to %s', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(bad(status)));
    const err = await searchWeb({ serviceId: 'exa', apiKey: 'k', query: 'q', maxResults: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe(kind);
    expect(err.provider).toBe('exa');
  });
});

describe('searchWeb result caps and error labels', () => {
  const stub = () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ results: [] }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };
  it('clamps Tavily max_results to 20', async () => {
    const f = stub();
    await searchWeb({ serviceId: 'tavily', apiKey: 'k', query: 'q', maxResults: 40 });
    expect(JSON.parse(f.mock.calls[0][1].body).max_results).toBe(20);
  });
  it('clamps Exa numResults to 100 and both to at least 1', async () => {
    const f = stub();
    await searchWeb({ serviceId: 'exa', apiKey: 'k', query: 'q', maxResults: 500 });
    expect(JSON.parse(f.mock.calls[0][1].body).numResults).toBe(100);
    await searchWeb({ serviceId: 'tavily', apiKey: 'k', query: 'q', maxResults: 0 });
    expect(JSON.parse(f.mock.calls[1][1].body).max_results).toBe(1);
  });
  it('labels HTTP errors with the service label', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(bad(400)));
    await expect(searchWeb({ serviceId: 'tavily', apiKey: 'k', query: 'q', maxResults: 5 }))
      .rejects.toMatchObject({ message: 'Tavily API error: 400', kind: 'http' });
  });
});

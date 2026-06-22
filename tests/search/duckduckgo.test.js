import { describe, it, expect, vi, afterEach } from 'vitest';
import { search } from '../../src/lib/search/duckduckgo.js';

afterEach(() => vi.unstubAllGlobals());

function htmlPage(results) {
  const body = results
    .map(
      ({ title, href, snippet }) => `
      <div class="result results_links results_links_deep web-result">
        <div class="result__body">
          <a class="result__a" href="${href}">${title}</a>
          <a class="result__snippet">${snippet}</a>
        </div>
      </div>`
    )
    .join('\n');
  return `<html><body>${body}</body></html>`;
}

describe('duckduckgo search', () => {
  it('sends the expected request and maps results, decoding redirect URLs', async () => {
    const html = htmlPage([
      { title: 'Result 1', href: '//duckduckgo.com/l/?uddg=https%3A%2F%2Fa.com%2F&rut=x', snippet: 'desc 1' },
      { title: 'Result 2', href: '//duckduckgo.com/l/?uddg=https%3A%2F%2Fb.com%2F&rut=x', snippet: 'desc 2' },
    ]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => html });
    vi.stubGlobal('fetch', fetchMock);

    const results = await search({ query: 'tidal energy' });

    expect(results).toEqual([
      { title: 'Result 1', url: 'https://a.com/', snippet: 'desc 1' },
      { title: 'Result 2', url: 'https://b.com/', snippet: 'desc 2' },
    ]);
    const [url] = fetchMock.mock.calls[0];
    expect(url.toString()).toContain('q=tidal+energy');
  });

  it('returns an empty array when there are no results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '<html><body></body></html>' }));
    const results = await search({ query: 'no results here' });
    expect(results).toEqual([]);
  });

  it('respects the count limit', async () => {
    const html = htmlPage([
      { title: 'R1', href: '//duckduckgo.com/l/?uddg=https%3A%2F%2Fa.com%2F', snippet: 's1' },
      { title: 'R2', href: '//duckduckgo.com/l/?uddg=https%3A%2F%2Fb.com%2F', snippet: 's2' },
    ]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => html }));
    const results = await search({ query: 'x', count: 1 });
    expect(results).toHaveLength(1);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(search({ query: 'x' })).rejects.toThrow('DuckDuckGo search error: 503');
  });
});

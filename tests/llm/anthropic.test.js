import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete, searchAndRank } from '../../src/lib/llm/anthropic.js';

afterEach(() => vi.unstubAllGlobals());

describe('anthropic complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'hello from claude' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'claude-3-5-sonnet-20241022', prompt: 'hi' });

    expect(result).toBe('hello from claude');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options.headers['x-api-key']).toBe('key123');
    expect(JSON.parse(options.body).messages[0].content).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('Anthropic API error: 401');
  });
});

describe('anthropic searchAndRank', () => {
  it('sends the web_search tool and returns only results backed by an actual citation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]',
          },
          {
            type: 'web_search_tool_result',
            content: [{ type: 'web_search_result', url: 'https://real.com', title: 'Real' }],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchAndRank({
      apiKey: 'key123',
      model: 'claude-3-5-sonnet-20241022',
      pageTitle: 'Tidal Energy',
      pageText: 'article text',
      resultsCount: 5,
    });

    expect(results).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(options.body);
    expect(body.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(
      searchAndRank({ apiKey: 'bad', model: null, pageTitle: 't', pageText: 'x', resultsCount: 5 })
    ).rejects.toThrow('Anthropic API error: 401');
  });
});

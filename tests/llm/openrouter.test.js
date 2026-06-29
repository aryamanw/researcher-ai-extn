import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete, searchAndRank } from '../../src/lib/llm/openrouter.js';

afterEach(() => vi.unstubAllGlobals());

describe('openrouter complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello from openrouter' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'openai/gpt-4o-mini', prompt: 'hi' });

    expect(result).toBe('hello from openrouter');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer key123');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('OpenRouter API error: 401');
  });
});

describe('openrouter searchAndRank', () => {
  it('sends the openrouter:web_search tool and returns only results backed by a url_citation annotation', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]',
              annotations: [{ type: 'url_citation', url_citation: { url: 'https://real.com', title: 'Real' } }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchAndRank({
      apiKey: 'key123',
      model: 'openai/gpt-4o-mini',
      pageTitle: 'Tidal Energy',
      pageText: 'article text',
      resultsCount: 5,
    });

    expect(results).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(JSON.parse(options.body).tools).toEqual([
      { type: 'openrouter:web_search', parameters: { max_results: 7 } },
    ]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(
      searchAndRank({ apiKey: 'bad', model: null, pageTitle: 't', pageText: 'x', resultsCount: 5 })
    ).rejects.toThrow('OpenRouter API error: 401');
  });
});

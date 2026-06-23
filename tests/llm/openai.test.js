import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete, searchAndRank } from '../../src/lib/llm/openai.js';

afterEach(() => vi.unstubAllGlobals());

describe('openai complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello from gpt' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'gpt-4o-mini', prompt: 'hi' });

    expect(result).toBe('hello from gpt');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.headers.authorization).toBe('Bearer key123');
    expect(JSON.parse(options.body).messages[0].content).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('OpenAI API error: 401');
  });
});

describe('openai searchAndRank', () => {
  it('sends the web_search tool via the Responses API and returns only cited results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]',
                annotations: [{ type: 'url_citation', url: 'https://real.com', title: 'Real' }],
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchAndRank({
      apiKey: 'key123',
      model: 'gpt-4o-mini',
      pageTitle: 'Tidal Energy',
      pageText: 'article text',
      resultsCount: 5,
    });

    expect(results).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    expect(body.tools).toEqual([{ type: 'web_search' }]);
    expect(body.input).toContain('Tidal Energy');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(
      searchAndRank({ apiKey: 'bad', model: null, pageTitle: 't', pageText: 'x', resultsCount: 5 })
    ).rejects.toThrow('OpenAI API error: 401');
  });
});

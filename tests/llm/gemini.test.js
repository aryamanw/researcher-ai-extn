import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete, searchAndRank } from '../../src/lib/llm/gemini.js';

afterEach(() => vi.unstubAllGlobals());

describe('gemini complete', () => {
  it('sends the expected request and parses the text response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello from gemini' }] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await complete({ apiKey: 'key123', model: 'gemini-1.5-flash', prompt: 'hi' });

    expect(result).toBe('hello from gemini');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
    expect(url).not.toContain('key=');
    expect(options.headers['x-goog-api-key']).toBe('key123');
    expect(JSON.parse(options.body).contents[0].parts[0].text).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('Gemini API error: 401');
  });
});

describe('gemini searchAndRank', () => {
  it('sends the google_search tool and returns only results backed by groundingChunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]' },
              ],
            },
            groundingMetadata: {
              groundingChunks: [{ web: { uri: 'https://real.com', title: 'Real' } }],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchAndRank({
      apiKey: 'key123',
      model: 'gemini-1.5-flash',
      pageTitle: 'Tidal Energy',
      pageText: 'article text',
      resultsCount: 5,
    });

    expect(results).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent');
    expect(JSON.parse(options.body).tools).toEqual([{ google_search: {} }]);
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(
      searchAndRank({ apiKey: 'bad', model: null, pageTitle: 't', pageText: 'x', resultsCount: 5 })
    ).rejects.toThrow('Gemini API error: 401');
  });
});

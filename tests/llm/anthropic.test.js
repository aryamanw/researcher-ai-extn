import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/anthropic.js';

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

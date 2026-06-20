import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/openai.js';

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

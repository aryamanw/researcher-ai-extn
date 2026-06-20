import { describe, it, expect, vi, afterEach } from 'vitest';
import { complete } from '../../src/lib/llm/gemini.js';

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
    expect(url).toContain('key=key123');
    expect(JSON.parse(options.body).contents[0].parts[0].text).toBe('hi');
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(complete({ apiKey: 'bad', model: null, prompt: 'hi' })).rejects.toThrow('Gemini API error: 401');
  });
});

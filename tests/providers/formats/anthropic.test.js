import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchAndRank, complete } from '../../../src/lib/providers/formats/anthropic.js';
import { getProvider } from '../../../src/lib/providers/registry.js';
import { ProviderError } from '../../../src/lib/providers/errors.js';

afterEach(() => vi.unstubAllGlobals());
const entry = getProvider('anthropic');
const json = (data) => ({ ok: true, json: async () => data });
const RESULTS = '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]';
const response = {
  content: [
    { type: 'text', text: RESULTS },
    { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://real.com', title: 'Real' }] },
  ],
};
const args = { entry, apiKey: 'key123', pageTitle: 'Tidal Energy', pageText: 'article', resultsCount: 5 };

describe('anthropic.complete', () => {
  it('sends the expected request and joins text blocks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ content: [{ type: 'text', text: 'hello ' }, { type: 'text', text: 'claude' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await complete({ entry, apiKey: 'key123', model: 'claude-opus-5-5', prompt: 'hi' });
    expect(result).toBe('hello claude');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(opts.headers['x-api-key']).toBe('key123');
    const body = JSON.parse(opts.body);
    expect(body.messages[0].content).toBe('hi');
    expect(body.max_tokens).toBe(16000);
    expect(body.tools).toBeUndefined();
  });

  it('throws a ProviderError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }));
    const err = await complete({ entry, apiKey: 'bad', model: null, prompt: 'hi' }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe('auth');
    expect(err.message).toContain('401');
  });
});

describe('anthropic.searchAndRank', () => {
  it('uses the registry tool for a current model and returns only cited results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(response));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAndRank({ ...args, model: 'claude-opus-5-5' });
    expect(out).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(opts.headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(opts.body);
    expect(body.max_tokens).toBe(16000);
    expect(body.tools).toEqual([{ type: 'web_search_20260209', name: 'web_search', allowed_callers: ['direct'], max_uses: 7 }]);
  });

  it('does not mutate the registry tool', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(response)));
    const before = JSON.stringify(entry.search.tool);
    await searchAndRank({ ...args, model: 'claude-opus-5-5' });
    expect(JSON.stringify(entry.search.tool)).toBe(before);
  });

  it('uses web_search_20250305 without allowed_callers for a legacy model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(response));
    vi.stubGlobal('fetch', fetchMock);
    await searchAndRank({ ...args, model: 'claude-haiku-4-5' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: 7 }]);
  });

  it('falls back to the default model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(response));
    vi.stubGlobal('fetch', fetchMock);
    await searchAndRank({ ...args, model: null });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-opus-5-5');
  });

  it('throws a ProviderError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => '' }));
    const err = await searchAndRank({ ...args, model: null }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe('rate-limit');
  });
});

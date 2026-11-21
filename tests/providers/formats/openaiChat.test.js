import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchAndRank, complete } from '../../../src/lib/providers/formats/openaiChat.js';
import { getProvider } from '../../../src/lib/providers/registry.js';
import { ProviderError } from '../../../src/lib/providers/errors.js';

afterEach(() => vi.unstubAllGlobals());
const entry = (id) => getProvider(id);
const json = (data) => ({ ok: true, json: async () => data });
const RESULTS = '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]';
const annotated = (content) => ({
  choices: [{ message: { content, annotations: [{ type: 'url_citation', url_citation: { url: 'https://real.com' } }] } }],
});
const args = { apiKey: 'key123', model: 'm1', pageTitle: 'Tidal Energy', pageText: 'article', resultsCount: 5 };

describe('openaiChat.searchAndRank', () => {
  it('openrouter clamps max_results to 25', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(annotated(RESULTS)));
    vi.stubGlobal('fetch', fetchMock);
    await searchAndRank({ entry: entry('openrouter'), ...args, resultsCount: 20 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).tools[0].parameters.max_results).toBe(25);
  });

  it('posts to deepseek chat/completions with its tool and returns only cited results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(annotated(RESULTS)));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAndRank({ entry: entry('deepseek'), ...args });
    expect(out).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer key123');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('m1');
    expect(body.tools).toEqual([{ type: 'deepseek_web_search' }]);
    expect(body.messages[0].content).toContain('Tidal Energy');
  });

  it('openrouter sets max_results per request without mutating the registry tool', async () => {
    const e = entry('openrouter');
    const before = JSON.stringify(e.search.tool);
    const fetchMock = vi.fn().mockResolvedValue(json(annotated(RESULTS)));
    vi.stubGlobal('fetch', fetchMock);
    await searchAndRank({ entry: e, ...args });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools[0].type).toBe('openrouter:web_search');
    expect(body.tools[0].parameters.max_results).toBeGreaterThan(0);
    expect(JSON.stringify(e.search.tool)).toBe(before);
    expect(fetchMock.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('merges search.extra into the body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(annotated(RESULTS)));
    vi.stubGlobal('fetch', fetchMock);
    const e = { ...entry('deepseek'), search: { ...entry('deepseek').search, extra: { foo: 1 } } };
    await searchAndRank({ entry: e, ...args });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).foo).toBe(1);
  });

  it('rejects with ProviderError on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'nope' }));
    const err = await searchAndRank({ entry: entry('deepseek'), ...args }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe('auth');
    expect(err.provider).toBe('deepseek');
    expect(err.model).toBe('m1');
  });
});

describe('openaiChat.complete', () => {
  it('posts without tools and returns the message content', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ choices: [{ message: { content: 'hi there' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await complete({ entry: entry('deepseek'), apiKey: 'k', model: 'm1', prompt: 'hello' });
    expect(out).toBe('hi there');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toBeUndefined();
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('rejects with ProviderError on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => '' }));
    await expect(complete({ entry: entry('deepseek'), apiKey: 'k', model: 'm', prompt: 'p' })).rejects.toMatchObject({ kind: 'rate-limit' });
  });
});

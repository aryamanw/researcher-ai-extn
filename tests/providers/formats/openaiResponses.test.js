import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchAndRank, complete } from '../../../src/lib/providers/formats/openaiResponses.js';
import { getProvider } from '../../../src/lib/providers/registry.js';
import { ProviderError } from '../../../src/lib/providers/errors.js';

afterEach(() => vi.unstubAllGlobals());
const entry = (id) => getProvider(id);
const json = (data) => ({ ok: true, json: async () => data });
const TEXT = '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]';
const args = { apiKey: 'key123', model: 'gpt-x', pageTitle: 'Tidal Energy', pageText: 'article', resultsCount: 5 };

describe('openaiResponses.searchAndRank', () => {
  it('posts to /responses with input and tool and returns only cited results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      output: [{ type: 'message', content: [{ type: 'output_text', text: TEXT, annotations: [{ type: 'url_citation', url: 'https://real.com' }] }] }],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAndRank({ entry: entry('openai'), ...args });
    expect(out).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(opts.headers.Authorization).toBe('Bearer key123');
    const body = JSON.parse(opts.body);
    expect(body.model).toBe('gpt-x');
    expect(body.tools).toEqual([{ type: 'web_search' }]);
    expect(body.input).toContain('Tidal Energy');
    expect(body.include).toBeUndefined();
  });

  it('kimi merges include and uses sources for citations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      output: [
        { type: 'web_search_call', action: { sources: [{ url: 'https://real.com' }] } },
        { type: 'message', content: [{ type: 'output_text', text: TEXT }] },
      ],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAndRank({ entry: entry('kimi'), ...args });
    expect(out.map((r) => r.url)).toEqual(['https://real.com']);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.moonshot.ai/v1/responses');
    expect(JSON.parse(opts.body).include).toEqual(['web_search_call.action.sources']);
  });

  it('rejects with ProviderError on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }));
    const err = await searchAndRank({ entry: entry('openai'), ...args }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err).toMatchObject({ kind: 'auth', provider: 'openai', model: 'gpt-x' });
  });
});

describe('openaiResponses.complete', () => {
  it('posts input without tools and returns output_text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'plain answer' }] }],
    }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await complete({ entry: entry('xai'), apiKey: 'k', model: 'g', prompt: 'hello' });
    expect(out).toBe('plain answer');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.x.ai/v1/responses');
    const body = JSON.parse(opts.body);
    expect(body.tools).toBeUndefined();
    expect(body.input).toBe('hello');
  });
});

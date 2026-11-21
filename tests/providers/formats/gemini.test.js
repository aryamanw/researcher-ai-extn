import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchAndRank, complete } from '../../../src/lib/providers/formats/gemini.js';
import { getProvider } from '../../../src/lib/providers/registry.js';
import { ProviderError } from '../../../src/lib/providers/errors.js';

afterEach(() => vi.unstubAllGlobals());
const entry = getProvider('gemini');
const json = (data) => ({ ok: true, json: async () => data });
const RESULTS = '[{"url":"https://real.com","title":"Real","snippet":"s","relevance":"r"},{"url":"https://fake.com","title":"Fake","snippet":"s","relevance":"r"}]';
const grounded = (text, chunks) => ({
  candidates: [{ content: { parts: [{ text }] }, groundingMetadata: { groundingChunks: chunks } }],
});
const args = { entry, apiKey: 'key123', model: 'gemini-3.8-flash', pageTitle: 'Tidal Energy', pageText: 'article', resultsCount: 5 };

describe('gemini.complete', () => {
  it('sends the expected request and parses the text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await complete({ entry, apiKey: 'key123', model: 'gemini-3.8-flash', prompt: 'hi' });
    expect(result).toBe('hello');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(url).not.toContain('key=');
    expect(opts.headers['x-goog-api-key']).toBe('key123');
    const body = JSON.parse(opts.body);
    expect(body.contents[0].parts[0].text).toBe('hi');
    expect(body.tools).toBeUndefined();
  });

  it('throws a ProviderError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }));
    const err = await complete({ entry, apiKey: 'bad', model: null, prompt: 'hi' }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe('auth');
  });

  it('rejects an invalid model name without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const err = await complete({ entry, apiKey: 'k', model: 'bad/model?x', prompt: 'hi' }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.kind).toBe('model-unavailable');
    expect(err.provider).toBe('gemini');
    expect(err.model).toBe('bad/model?x');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('gemini.searchAndRank', () => {
  it('sends google_search and returns only results backed by groundingChunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(grounded(RESULTS, [{ web: { uri: 'https://real.com', title: 'Real' } }])));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAndRank(args);
    expect(out).toEqual([{ url: 'https://real.com', title: 'Real', snippet: 's', relevance: 'r' }]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(JSON.parse(opts.body).tools).toEqual([{ google_search: {} }]);
  });

  it('matches redirect-uri chunks by host via the chunk title', async () => {
    const text = '[{"url":"https://www.example.com/a","title":"A","snippet":"s","relevance":"r"},{"url":"https://other.com/b","title":"B","snippet":"s","relevance":"r"}]';
    const chunks = [{ web: { uri: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', title: 'example.com' } }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(grounded(text, chunks))));
    const out = await searchAndRank(args);
    expect(out.map((r) => r.url)).toEqual(['https://www.example.com/a']);
  });

  it('defaults to the registry default model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ candidates: [{ content: { parts: [{ text: '[]' }] } }] }));
    vi.stubGlobal('fetch', fetchMock);
    await searchAndRank({ ...args, model: null });
    expect(fetchMock.mock.calls[0][0]).toMatch(/models\/gemini-3\./);
  });

  it('throws a ProviderError when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }));
    await expect(searchAndRank({ ...args, model: null })).rejects.toBeInstanceOf(ProviderError);
  });

  it('rejects an invalid model name without fetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(searchAndRank({ ...args, model: '../x' })).rejects.toMatchObject({ kind: 'model-unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/providers/formats/index.js', () => ({
  FORMATS: {
    'openai-chat': { searchAndRank: vi.fn(), complete: vi.fn() },
    'openai-responses': { searchAndRank: vi.fn(), complete: vi.fn() },
    anthropic: { searchAndRank: vi.fn(), complete: vi.fn() },
    gemini: { searchAndRank: vi.fn(), complete: vi.fn() },
  },
}));
vi.mock('../../src/lib/search/modeTwo.js', () => ({ runModeTwo: vi.fn() }));

import { FORMATS } from '../../src/lib/providers/formats/index.js';
import { runModeTwo } from '../../src/lib/search/modeTwo.js';
import { PROVIDERS } from '../../src/lib/providers/registry.js';
import { ProviderError } from '../../src/lib/providers/errors.js';
import { resolveApiKey, planSearch, searchAndRank } from '../../src/lib/providers/index.js';

const page = { pageTitle: 'T', pageText: 'body', resultsCount: 5 };

beforeEach(() => vi.clearAllMocks());

describe('planSearch', () => {
  it('uses mode 1 for a search-capable model', () => {
    const plan = planSearch({ provider: 'deepseek', models: { deepseek: 'deepseek-flash' }, apiKeys: { deepseek: 'k' } });
    expect(plan).toMatchObject({ mode: 1, model: 'deepseek-flash', apiKey: 'k' });
    expect(plan.entry.id).toBe('deepseek');
  });

  it('uses mode 2 when the model cannot search and a search key exists', () => {
    const plan = planSearch({
      provider: 'deepseek', models: { deepseek: 'deepseek-chat-v4' }, apiKeys: { deepseek: 'k' },
      searchService: 'exa', searchKeys: { exa: 'ek' },
    });
    expect(plan.mode).toBe(2);
    expect(plan.searchService).toEqual({ id: 'exa', apiKey: 'ek' });
  });

  it('throws needs-search-key for a non-search model without a search key', () => {
    expect.assertions(1);
    try {
      planSearch({ provider: 'deepseek', models: { deepseek: 'deepseek-chat-v4' }, apiKeys: { deepseek: 'k' } });
    } catch (e) { expect(e.kind).toBe('needs-search-key'); }
  });

  it('throws needs-search-key for a mode 2 provider with no search key', () => {
    expect.assertions(1);
    try { planSearch({ provider: 'huggingface', apiKeys: { huggingface: 'k' }, searchService: 'exa' }); }
    catch (e) { expect(e.kind).toBe('needs-search-key'); }
  });

  it('throws not-configured with no key or no provider', () => {
    expect(() => planSearch({ provider: 'openai', apiKeys: {} })).toThrow(ProviderError);
    try { planSearch({ provider: 'openai', apiKeys: {} }); } catch (e) { expect(e.kind).toBe('not-configured'); }
    try { planSearch({ provider: null }); } catch (e) { expect(e.kind).toBe('not-configured'); }
  });

  it('uses openrouterToken for OpenRouter', () => {
    const s = { provider: 'openrouter', apiKeys: {}, openrouterToken: 'tok' };
    expect(resolveApiKey(s, 'openrouter')).toBe('tok');
    expect(planSearch(s)).toMatchObject({ mode: 1, apiKey: 'tok' });
  });

  it('ignores another provider\'s model', () => {
    const plan = planSearch({ provider: 'openai', models: { anthropic: 'claude-opus-5-5' }, apiKeys: { openai: 'k' } });
    expect(plan.model).toBe(PROVIDERS.openai.defaultModel);
  });
});

describe('searchAndRank', () => {
  const s1 = { provider: 'openai', apiKeys: { openai: 'k' } };

  it('dispatches mode 1 to the format and emits Searching...', async () => {
    FORMATS['openai-responses'].searchAndRank.mockResolvedValue([{ url: 'u' }]);
    const onStatus = vi.fn();
    const signal = new AbortController().signal;
    const out = await searchAndRank(s1, page, { signal, onStatus });
    expect(out).toEqual([{ url: 'u' }]);
    expect(onStatus).toHaveBeenCalledWith('Searching...');
    expect(FORMATS['openai-responses'].searchAndRank).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'k', model: PROVIDERS.openai.defaultModel, pageTitle: 'T', resultsCount: 5, signal }));
  });

  it('dispatches mode 2 to runModeTwo with a bound complete', async () => {
    runModeTwo.mockResolvedValue([]);
    FORMATS['openai-chat'].complete.mockResolvedValue('text');
    const s = {
      provider: 'deepseek', models: { deepseek: 'deepseek-chat-v4' }, apiKeys: { deepseek: 'k' },
      searchService: 'tavily', searchKeys: { tavily: 'tk' },
    };
    await searchAndRank(s, page, {});
    const args = runModeTwo.mock.calls[0][0];
    expect(args.searchService).toEqual({ id: 'tavily', apiKey: 'tk' });
    expect(args.pageTitle).toBe('T');
    await expect(args.complete('hi')).resolves.toBe('text');
    expect(FORMATS['openai-chat'].complete).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'k', model: 'deepseek-chat-v4', prompt: 'hi' }));
  });

  it('wraps a fetch TypeError as a network ProviderError', async () => {
    FORMATS['openai-responses'].searchAndRank.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(searchAndRank(s1, page, {})).rejects.toMatchObject({ name: 'ProviderError', kind: 'network', provider: 'openai' });
  });

  it('does not wrap non-fetch TypeErrors', async () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'x')");
    FORMATS['openai-responses'].searchAndRank.mockRejectedValue(err);
    await expect(searchAndRank(s1, page, {})).rejects.toBe(err);
  });

  it('does not wrap other errors', async () => {
    const err = new ProviderError('x', { kind: 'auth' });
    FORMATS['openai-responses'].searchAndRank.mockRejectedValue(err);
    await expect(searchAndRank(s1, page, {})).rejects.toBe(err);
  });
});

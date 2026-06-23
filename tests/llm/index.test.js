import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/llm/anthropic.js', () => ({
  complete: vi.fn().mockResolvedValue('anthropic-result'),
  searchAndRank: vi.fn().mockResolvedValue([{ title: 'A', url: 'https://a.com', snippet: 's', relevance: 'r' }]),
}));
vi.mock('../../src/lib/llm/openai.js', () => ({
  complete: vi.fn().mockResolvedValue('openai-result'),
  searchAndRank: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../src/lib/llm/gemini.js', () => ({
  complete: vi.fn().mockResolvedValue('gemini-result'),
  searchAndRank: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../src/lib/llm/openrouter.js', () => ({
  complete: vi.fn().mockResolvedValue('openrouter-result'),
  searchAndRank: vi.fn().mockResolvedValue([]),
}));

import { getCompletion, getSearchResults } from '../../src/lib/llm/index.js';
import { complete as anthropicComplete, searchAndRank as anthropicSearchAndRank } from '../../src/lib/llm/anthropic.js';
import { complete as openrouterComplete, searchAndRank as openrouterSearchAndRank } from '../../src/lib/llm/openrouter.js';

describe('getCompletion', () => {
  it('routes to the configured provider with its API key', async () => {
    const settings = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKeys: { anthropic: 'a-key', openai: '', gemini: '' },
      openrouterToken: '',
    };
    const result = await getCompletion(settings, 'hello');
    expect(result).toBe('anthropic-result');
    expect(anthropicComplete).toHaveBeenCalledWith({ apiKey: 'a-key', model: 'claude-3-5-sonnet-20241022', prompt: 'hello' });
  });

  it('uses openrouterToken instead of apiKeys for the openrouter provider', async () => {
    const settings = {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: 'or-token',
    };
    const result = await getCompletion(settings, 'hello');
    expect(result).toBe('openrouter-result');
    expect(openrouterComplete).toHaveBeenCalledWith({ apiKey: 'or-token', model: 'openai/gpt-4o-mini', prompt: 'hello' });
  });

  it('throws when no provider is configured', async () => {
    const settings = { provider: null, model: null, apiKeys: {}, openrouterToken: '' };
    await expect(getCompletion(settings, 'hello')).rejects.toThrow('No provider configured: null');
  });

  it('throws when the configured provider has no API key', async () => {
    const settings = { provider: 'openai', model: null, apiKeys: { openai: '' }, openrouterToken: '' };
    await expect(getCompletion(settings, 'hello')).rejects.toThrow('No API key/token configured for provider: openai');
  });
});

describe('getSearchResults', () => {
  it('routes to the configured provider with its API key', async () => {
    const settings = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKeys: { anthropic: 'a-key', openai: '', gemini: '' },
      openrouterToken: '',
    };
    const result = await getSearchResults(settings, { pageTitle: 'T', pageText: 'x', resultsCount: 5 });
    expect(result).toEqual([{ title: 'A', url: 'https://a.com', snippet: 's', relevance: 'r' }]);
    expect(anthropicSearchAndRank).toHaveBeenCalledWith({
      apiKey: 'a-key',
      model: 'claude-3-5-sonnet-20241022',
      pageTitle: 'T',
      pageText: 'x',
      resultsCount: 5,
      signal: undefined,
    });
  });

  it('uses openrouterToken instead of apiKeys for the openrouter provider', async () => {
    const settings = {
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: 'or-token',
    };
    await getSearchResults(settings, { pageTitle: 'T', pageText: 'x', resultsCount: 5 });
    expect(openrouterSearchAndRank).toHaveBeenCalledWith({
      apiKey: 'or-token',
      model: 'openai/gpt-4o-mini',
      pageTitle: 'T',
      pageText: 'x',
      resultsCount: 5,
      signal: undefined,
    });
  });

  it('throws when no provider is configured', async () => {
    const settings = { provider: null, model: null, apiKeys: {}, openrouterToken: '' };
    await expect(getSearchResults(settings, { pageTitle: 'T', pageText: 'x', resultsCount: 5 })).rejects.toThrow(
      'No provider configured: null'
    );
  });

  it('throws when the configured provider has no API key', async () => {
    const settings = { provider: 'openai', model: null, apiKeys: { openai: '' }, openrouterToken: '' };
    await expect(getSearchResults(settings, { pageTitle: 'T', pageText: 'x', resultsCount: 5 })).rejects.toThrow(
      'No API key/token configured for provider: openai'
    );
  });
});

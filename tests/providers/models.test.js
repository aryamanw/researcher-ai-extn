import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listModels } from '../../src/lib/providers/models.js';
import { PROVIDERS } from '../../src/lib/providers/registry.js';

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
beforeEach(() => { global.fetch = vi.fn(); });

describe('listModels', () => {
  it('returns [] for a null endpoint without fetching', async () => {
    expect(await listModels({ ...PROVIDERS.openai, modelsEndpoint: null }, 'k')).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('parses OpenAI-style data[].id, sorted and unique, with bearer auth', async () => {
    fetch.mockResolvedValue(ok({ data: [{ id: 'b' }, { id: 'a' }, { id: 'b' }] }));
    expect(await listModels(PROVIDERS.deepseek, 'k')).toEqual(['a', 'b']);
    expect(fetch.mock.calls[0][0]).toBe('https://api.deepseek.com/models');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer k');
  });

  it('parses Anthropic data[].id with anthropic headers', async () => {
    fetch.mockResolvedValue(ok({ data: [{ id: 'claude-opus-5-5' }, { id: 'claude-haiku-5-5' }] }));
    expect(await listModels(PROVIDERS.anthropic, 'sk')).toEqual(['claude-haiku-5-5', 'claude-opus-5-5']);
    expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/models/);
    expect(fetch.mock.calls[0][1].headers['x-api-key']).toBe('sk');
    expect(fetch.mock.calls[0][1].headers['anthropic-version']).toBeTruthy();
  });

  it('parses Gemini models[].name, strips models/, keeps generateContent models', async () => {
    fetch.mockResolvedValue(ok({ models: [
      { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-9', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-x' },
    ] }));
    expect(await listModels(PROVIDERS.gemini, 'k')).toEqual(['gemini-3.8-flash', 'gemini-x']);
    expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('k');
  });

  it('accepts a bare array (Together)', async () => {
    fetch.mockResolvedValue(ok([{ id: 'm1' }]));
    expect(await listModels(PROVIDERS.together, 'k')).toEqual(['m1']);
  });

  it('uses an absolute endpoint as-is and keeps only paid chat-completions models for OpenCode Zen', async () => {
    fetch.mockResolvedValue(ok({ data: [
      { id: 'paid-chat', api: { 'chat-completions': {} }, cost: { text: { input: { price: 0.3 } } } },
      { id: 'free-chat', api: { 'chat-completions': {} }, cost: { text: { input: { price: 0 } } } },
      { id: 'claude-x', api: { messages: {} }, cost: { text: { input: { price: 3 } } } },
    ] }));
    expect(await listModels(PROVIDERS['opencode-zen'], 'k')).toEqual(['paid-chat']);
    expect(fetch.mock.calls[0][0]).toBe('https://opencode.ai/inference/v1/models');
  });

  it('filters non-chat OpenAI models', async () => {
    fetch.mockResolvedValue(ok({ data: [{ id: 'gpt-6-luna' }, { id: 'gpt-image-2' }, { id: 'text-embedding-4' }, { id: 'o5' }] }));
    expect(await listModels(PROVIDERS.openai, 'k')).toEqual(['gpt-6-luna', 'o5']);
  });

  it('rejects with a ProviderError on HTTP failure and on network failure', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401, text: async () => '' });
    await expect(listModels(PROVIDERS.openai, 'k')).rejects.toMatchObject({ name: 'ProviderError', kind: 'auth' });
    fetch.mockRejectedValue(new TypeError('offline'));
    await expect(listModels(PROVIDERS.openai, 'k')).rejects.toMatchObject({ name: 'ProviderError', kind: 'network' });
  });
});

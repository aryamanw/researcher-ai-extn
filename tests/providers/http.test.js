import { describe, it, expect } from 'vitest';
import { errorFromResponse, authHeaders } from '../../src/lib/providers/http.js';
import { ProviderError } from '../../src/lib/providers/errors.js';

const resp = (status, body = '') => ({ ok: false, status, text: async () => body });

describe('errorFromResponse', () => {
  it.each([[401, 'auth'], [403, 'auth'], [429, 'rate-limit'], [503, 'server'], [404, 'model-unavailable']])(
    'maps %i to %s', async (status, kind) => {
      const err = await errorFromResponse(resp(status), { provider: 'openai', model: 'm' });
      expect(err).toBeInstanceOf(ProviderError);
      expect(err.kind).toBe(kind);
      expect(err.status).toBe(status);
      expect(err.provider).toBe('openai');
      expect(err.model).toBe('m');
    });

  it('maps 400 model-not-found bodies to model-unavailable', async () => {
    const body = '{"error":{"message":"The model `foo` does not exist"}}';
    const err = await errorFromResponse(resp(400, body), { provider: 'openai', model: 'foo' });
    expect(err.kind).toBe('model-unavailable');
  });

  // Gemini and xAI reject a bad key with 400, not 401 (bodies captured from the live APIs).
  it.each([
    ['gemini', '{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}'],
    ['xai', '{"code":"invalid-argument","error":"Incorrect API key provided. You can obtain an API key from https://console.x.ai."}'],
  ])('maps a %s 400 bad-key body to auth', async (provider, body) => {
    const err = await errorFromResponse(resp(400, body), { provider, model: 'm' });
    expect(err.kind).toBe('auth');
  });

  it('maps 400 with an unrelated body to http and never leaks the body', async () => {
    const body = '{"error":{"message":"secret-body-text bad param"}}';
    const err = await errorFromResponse(resp(400, body), { provider: 'openai', model: 'foo' });
    expect(err.kind).toBe('http');
    expect(err.message).not.toContain('secret-body-text');
    expect(err.message).toContain('400');
  });

  it('survives an unreadable body', async () => {
    const r = { ok: false, status: 400, text: async () => { throw new Error('boom'); } };
    expect((await errorFromResponse(r, { provider: 'x', model: 'm' })).kind).toBe('http');
  });
});

describe('authHeaders', () => {
  it('bearer', () => {
    expect(authHeaders({ auth: 'bearer', format: 'openai-chat' }, 'k')).toEqual({
      'content-type': 'application/json', Authorization: 'Bearer k',
    });
  });
  it('x-api-key for anthropic adds version and browser-access headers', () => {
    expect(authHeaders({ auth: 'x-api-key', format: 'anthropic' }, 'k')).toEqual({
      'content-type': 'application/json', 'x-api-key': 'k',
      'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
    });
  });
  it('x-api-key for other formats has no anthropic headers', () => {
    expect(authHeaders({ auth: 'x-api-key', format: 'openai-chat' }, 'k')).toEqual({
      'content-type': 'application/json', 'x-api-key': 'k',
    });
  });
  it('x-goog-api-key', () => {
    expect(authHeaders({ auth: 'x-goog-api-key', format: 'gemini' }, 'k')).toEqual({
      'content-type': 'application/json', 'x-goog-api-key': 'k',
    });
  });
});

describe('errorFromResponse for search services', () => {
  it('uses the search service label', async () => {
    const err = await errorFromResponse(resp(400), { provider: 'tavily' });
    expect(err.message).toBe('Tavily API error: 400');
  });
  it.each([402, 429, 432, 433])('maps %i to rate-limit for search services', async (status) => {
    expect((await errorFromResponse(resp(status), { provider: 'exa' })).kind).toBe('rate-limit');
  });
  it('does not map 402 to rate-limit for model providers', async () => {
    expect((await errorFromResponse(resp(402), { provider: 'openai', model: 'm' })).kind).toBe('http');
  });
  it('maps a search-service 404 to http, not model-unavailable', async () => {
    expect((await errorFromResponse(resp(404), { provider: 'exa' })).kind).toBe('http');
  });
  it('maps a provider 404 without a model to http', async () => {
    expect((await errorFromResponse(resp(404), { provider: 'openai' })).kind).toBe('http');
  });
});

it('ProviderError carries an optional host', async () => {
  const { ProviderError: PE } = await import('../../src/lib/providers/errors.js');
  expect(new PE('x', { kind: 'permission', host: 'https://a/*' }).host).toBe('https://a/*');
});

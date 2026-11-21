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

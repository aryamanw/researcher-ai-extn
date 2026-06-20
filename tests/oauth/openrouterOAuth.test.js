import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  exchangeCodeForKey,
  connectOpenRouter,
} from '../../src/lib/oauth/openrouterOAuth.js';

afterEach(() => vi.unstubAllGlobals());

describe('generateCodeVerifier', () => {
  it('returns a non-empty url-safe string', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThan(20);
    expect(verifier).not.toMatch(/[+/=]/);
  });
});

describe('generateCodeChallenge', () => {
  it('returns a url-safe sha256 digest of the verifier', async () => {
    const challenge = await generateCodeChallenge('test-verifier');
    expect(typeof challenge).toBe('string');
    expect(challenge.length).toBeGreaterThan(20);
    expect(challenge).not.toMatch(/[+/=]/);
  });
});

describe('buildAuthUrl', () => {
  it('builds the OpenRouter auth URL with callback and challenge params', () => {
    const url = buildAuthUrl({ callbackUrl: 'https://abc.chromiumapp.org/', codeChallenge: 'chal123' });
    expect(url).toContain('https://openrouter.ai/auth?');
    expect(url).toContain('callback_url=https%3A%2F%2Fabc.chromiumapp.org%2F');
    expect(url).toContain('code_challenge=chal123');
    expect(url).toContain('code_challenge_method=S256');
  });
});

describe('exchangeCodeForKey', () => {
  it('posts the code and verifier and returns the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ key: 'or-key-123' }) });
    vi.stubGlobal('fetch', fetchMock);

    const key = await exchangeCodeForKey({ code: 'auth-code', codeVerifier: 'verifier-abc' });

    expect(key).toBe('or-key-123');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/auth/keys');
    expect(JSON.parse(options.body)).toEqual({
      code: 'auth-code',
      code_verifier: 'verifier-abc',
      code_challenge_method: 'S256',
    });
  });

  it('throws when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(exchangeCodeForKey({ code: 'bad', codeVerifier: 'v' })).rejects.toThrow(
      'OpenRouter key exchange failed: 400'
    );
  });

  it('throws when the response has no key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(exchangeCodeForKey({ code: 'c', codeVerifier: 'v' })).rejects.toThrow(
      'OpenRouter key exchange response missing key'
    );
  });
});

describe('connectOpenRouter', () => {
  beforeEach(() => {
    global.chrome = { identity: { getRedirectURL: () => 'https://abc.chromiumapp.org/' } };
  });

  it('runs the full flow: build url, launch auth, exchange code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ key: 'or-key-456' }) })
    );
    const launchWebAuthFlow = vi.fn(async (options) => {
      expect(options.url).toContain('https://openrouter.ai/auth?');
      return 'https://abc.chromiumapp.org/?code=auth-code-789';
    });

    const key = await connectOpenRouter(launchWebAuthFlow);

    expect(key).toBe('or-key-456');
    expect(launchWebAuthFlow).toHaveBeenCalledTimes(1);
  });

  it('throws when the redirect has no code', async () => {
    const launchWebAuthFlow = vi.fn(async () => 'https://abc.chromiumapp.org/?error=access_denied');
    await expect(connectOpenRouter(launchWebAuthFlow)).rejects.toThrow(
      'OpenRouter authorization did not return a code'
    );
  });
});

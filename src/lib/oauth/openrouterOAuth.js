const AUTH_URL = 'https://openrouter.ai/auth';
const KEY_EXCHANGE_URL = 'https://openrouter.ai/api/v1/auth/keys';

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
}

export async function generateCodeChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthUrl({ callbackUrl, codeChallenge }) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('callback_url', callbackUrl);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export async function exchangeCodeForKey({ code, codeVerifier }) {
  const response = await fetch(KEY_EXCHANGE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      code_challenge_method: 'S256',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter key exchange failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.key) {
    throw new Error('OpenRouter key exchange response missing key');
  }
  return data.key;
}

export async function connectOpenRouter(launchWebAuthFlow) {
  const callbackUrl = chrome.identity.getRedirectURL();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const authUrl = buildAuthUrl({ callbackUrl, codeChallenge });

  const redirectUrl = await launchWebAuthFlow({ url: authUrl, interactive: true });
  const code = new URL(redirectUrl).searchParams.get('code');
  if (!code) {
    throw new Error('OpenRouter authorization did not return a code');
  }

  return exchangeCodeForKey({ code, codeVerifier });
}

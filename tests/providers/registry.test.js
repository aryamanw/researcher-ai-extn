import { it, expect } from 'vitest';
import manifest from '../../manifest.json' with { type: 'json' };
import { PROVIDERS, SEARCH_SERVICES, resolveModel, canSearchNatively } from '../../src/lib/providers/registry.js';

const REQUIRED = ['id', 'label', 'format', 'baseUrl', 'host', 'auth', 'keyHint', 'defaultModel'];
const FORMATS = ['openai-responses', 'openai-chat', 'anthropic', 'gemini'];
const ORIGINAL_HOSTS = ['https://api.anthropic.com/*', 'https://api.openai.com/*', 'https://generativelanguage.googleapis.com/*', 'https://openrouter.ai/*'];

it('every provider has required fields, a known format, and id matching its key', () => {
  for (const [key, e] of Object.entries(PROVIDERS)) {
    for (const f of REQUIRED) expect(e[f], `${key}.${f}`).toBeTruthy();
    expect(e.id).toBe(key);
    expect(FORMATS).toContain(e.format);
  }
});
it('Mode 1 defaults can search natively', () => {
  for (const e of Object.values(PROVIDERS).filter((p) => p.search)) {
    expect(canSearchNatively(e, e.defaultModel), e.id).toBe(true);
  }
});
it('every host is in CSP connect-src and in host or optional host permissions', () => {
  const csp = manifest.content_security_policy.extension_pages;
  const granted = [...manifest.host_permissions, ...(manifest.optional_host_permissions || [])];
  for (const e of [...Object.values(PROVIDERS), ...Object.values(SEARCH_SERVICES)]) {
    expect(csp).toContain(e.host.replace('/*', ''));
    expect(granted).toContain(e.host);
  }
});
it('required host_permissions are unchanged (no new install-time warning)', () => {
  expect([...manifest.host_permissions].sort()).toEqual([...ORIGINAL_HOSTS].sort());
});
it('resolveModel uses the per-provider model, else the default', () => {
  const e = PROVIDERS.anthropic;
  expect(resolveModel(e, { models: { anthropic: 'x' } })).toBe('x');
  expect(resolveModel(e, { models: { openai: 'y' } })).toBe(e.defaultModel);
});
it('canSearchNatively is false for Mode 2 providers and non-matching models', () => {
  const mode2 = Object.values(PROVIDERS).find((p) => !p.search);
  expect(canSearchNatively(mode2, mode2.defaultModel)).toBe(false);
  expect(canSearchNatively(PROVIDERS.deepseek, 'deepseek-chat-v4')).toBe(false);
  expect(canSearchNatively(PROVIDERS.openai, 'gpt-6-image-1')).toBe(false);
});
it('registry entries are frozen', () => {
  expect(Object.isFrozen(PROVIDERS)).toBe(true);
  expect(Object.isFrozen(PROVIDERS.anthropic)).toBe(true);
});

it('modelsFilter, when present, is a predicate; OpenAI and OpenCode Zen define one', () => {
  for (const e of Object.values(PROVIDERS)) {
    if ('modelsFilter' in e) expect(typeof e.modelsFilter, e.id).toBe('function');
  }
  expect(PROVIDERS.openai.modelsFilter({ id: 'gpt-6-luna' })).toBe(true);
  expect(PROVIDERS.openai.modelsFilter({ id: 'gpt-realtime-2' })).toBe(false);
  expect(PROVIDERS['opencode-zen'].modelsFilter).toBeTypeOf('function');
});

it('anthropic search models exclude claude-3 (so the legacy claude-3 tool branch is unreachable)', async () => {
  const { PROVIDERS } = await import('../../src/lib/providers/registry.js');
  expect(PROVIDERS.anthropic.search.models.test('claude-3-5-haiku-latest')).toBe(false);
});

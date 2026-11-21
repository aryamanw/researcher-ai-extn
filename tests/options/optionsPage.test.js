import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

vi.mock('../../src/lib/providers/permissions.js', () => ({
  requestHostPermission: vi.fn(),
  hasHostPermission: vi.fn(),
}));

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  removeSavedKeys: vi.fn(),
}));

import { getSettings, saveSettings, removeSavedKeys } from '../../src/lib/storage.js';
import { requestHostPermission } from '../../src/lib/providers/permissions.js';
import { PROVIDERS } from '../../src/lib/providers/registry.js';
import {
  renderProviderOptions,
  renderSettingsToForm,
  initOptionsPage,
  getApiKeyFormatWarning,
  toFriendlyOpenRouterError,
} from '../../options/optionsPage.js';

function loadOptionsHtml() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const htmlPath = resolve(currentDir, '../../options/options.html');
  const html = readFileSync(htmlPath, 'utf8');
  return new JSDOM(html).window.document;
}

describe('options.html structure', () => {
  it('gives the Model field a secondary (lower-weight) class, distinct from required fields', () => {
    const doc = loadOptionsHtml();
    const modelInput = doc.querySelector('input[name="model"]');
    const modelLabel = modelInput.closest('label');
    expect(modelLabel.classList.contains('field-secondary')).toBe(true);

    const providerLabel = doc.querySelector('select[name="provider"]').closest('label');
    expect(providerLabel.classList.contains('field-secondary')).toBe(false);
  });

  it('shows model format examples under the Model field', () => {
    const doc = loadOptionsHtml();
    const modelInput = doc.querySelector('input[name="model"]');
    const modelHint = modelInput.closest('label').nextElementSibling;
    expect(modelHint).not.toBeNull();
    expect(modelHint.className).toBe('field-hint');
    expect(modelHint.textContent).toMatch(/claude-opus-5-5/);
  });

  it('links to the privacy policy from the credentials fieldset hint', () => {
    const doc = loadOptionsHtml();
    const privacyLink = doc.querySelector('a[href="https://aryamanw.github.io/researcher-ai-extn/privacy-policy.html"]');
    expect(privacyLink).not.toBeNull();
    expect(privacyLink.target).toBe('_blank');
    expect(privacyLink.rel).toBe('noopener');
  });
});


function buildForm() {
  const html = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../options/options.html'), 'utf8');
  const body = new JSDOM(html).window.document.body.innerHTML.replace(/<script[\s\S]*?<\/script>/g, '');
  document.body.innerHTML = body;
  return document.getElementById('settings-form');
}

const base = (over = {}) => ({
  provider: null,
  models: {},
  apiKeys: {},
  openrouterToken: '',
  searchService: null,
  searchKeys: {},
  resultsCount: 8,
  schemaVersion: 2,
  ...over,
});

async function setup(settings) {
  getSettings.mockResolvedValue(settings);
  const form = buildForm();
  const autosave = document.getElementById('autosave-status');
  await initOptionsPage(form, document.getElementById('connect-openrouter'), document.getElementById('openrouter-status'), autosave, document.getElementById('results-count-hint'));
  return form;
}

const el = (form, name) => form.elements.namedItem(name);
const fire = (node, type) => node.dispatchEvent(new Event(type, { bubbles: true }));
const choose = (select, value) => { select.value = value; fire(select, 'change'); };

beforeEach(() => {
  vi.clearAllMocks();
  global.chrome = {
    runtime: { sendMessage: vi.fn(), getManifest: () => ({ host_permissions: ['https://api.anthropic.com/*', 'https://openrouter.ai/*'] }) },
  };
  requestHostPermission.mockResolvedValue(true);
  saveSettings.mockResolvedValue(undefined);
});

describe('renderProviderOptions', () => {
  it('builds the two optgroups with one option per registry entry in registry order', () => {
    const select = buildForm().elements.namedItem('provider');
    renderProviderOptions(select);
    const groups = [...select.querySelectorAll('optgroup')];
    expect(groups.map((g) => g.label)).toEqual(['Built-in web search', 'Needs a search key']);
    const values = [...select.querySelectorAll('option')].map((o) => o.value).filter(Boolean);
    expect(values).toEqual(Object.keys(PROVIDERS));
    const mode1 = [...groups[0].querySelectorAll('option')].map((o) => o.value);
    expect(mode1).toContain('deepseek');
    expect(mode1).not.toContain('together');
    expect([...groups[1].querySelectorAll('option')].map((o) => o.value)).toContain('together');
  });
});

describe('renderSettingsToForm', () => {
  it('populates fields and masks the saved key', async () => {
    const form = buildForm();
    renderSettingsToForm(form, base({ provider: 'anthropic', models: { anthropic: 'm1' }, apiKeys: { anthropic: 'sk-ant-abc123' }, resultsCount: 5 }));
    expect(el(form, 'provider').value).toBe('anthropic');
    expect(el(form, 'model').value).toBe('m1');
    expect(el(form, 'resultsCount').value).toBe('5');
    expect(el(form, 'providerKey').value).toBe('');
    expect(el(form, 'providerKey').placeholder).toBe('Saved, ending in ****c123');
  });

  it('generates the key field label, Get a key link and OpenRouter paste label from the registry', () => {
    const form = buildForm();
    renderSettingsToForm(form, base({ provider: 'deepseek' }));
    expect(form.querySelector('#provider-key-slot label').textContent).toMatch(/DeepSeek API key/);
    const link = form.querySelector('#provider-key-slot a');
    expect(link.href).toBe(PROVIDERS.deepseek.keyHint.url);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(el(form, 'providerKey').placeholder).toBe('');

    renderSettingsToForm(form, base({ provider: 'openrouter' }));
    expect(form.querySelector('#provider-key-slot label').textContent).toMatch(/or paste an API key/);
    expect(form.querySelector('#openrouter-block').classList.contains('is-hidden')).toBe(false);
  });

  it('hides the OpenRouter connect block and key slot when no provider is selected', () => {
    const form = buildForm();
    renderSettingsToForm(form, base());
    expect(form.querySelector('#openrouter-block').classList.contains('is-hidden')).toBe(true);
    expect(form.querySelector('#provider-key-slot').children.length).toBe(0);
  });

  it('shows the search key field only when a search service is selected', () => {
    const form = buildForm();
    renderSettingsToForm(form, base({ searchService: 'exa', searchKeys: { exa: 'abcd1234' } }));
    expect(el(form, 'searchKey').placeholder).toBe('Saved, ending in ****1234');
    renderSettingsToForm(form, base());
    expect(el(form, 'searchKey')).toBeNull();
  });
});

describe('initOptionsPage', () => {
  it('reflects openrouter connection status', async () => {
    await setup(base({ provider: 'openrouter', openrouterToken: 'tok' }));
    expect(document.getElementById('openrouter-status').textContent).toBe('Connected to OpenRouter');
  });

  it('shows not connected when there is no openrouter token', async () => {
    await setup(base());
    expect(document.getElementById('openrouter-status').textContent).toBe('Not connected to OpenRouter');
  });

  it('removes saved keys after a confirm click and never reveals the removed key', async () => {
    const stored = base({ provider: 'anthropic', apiKeys: { anthropic: 'sk-ant-secret1234' }, openrouterToken: 'tok' });
    const form = await setup(stored);
    removeSavedKeys.mockResolvedValue({ ...stored, apiKeys: {}, openrouterToken: '' });

    const removeButton = document.getElementById('remove-keys');
    removeButton.click();
    expect(removeSavedKeys).not.toHaveBeenCalled();
    expect(removeButton.textContent).toMatch(/confirm/i);
    removeButton.click();
    await vi.waitFor(() => expect(removeSavedKeys).toHaveBeenCalled());
    await vi.waitFor(() => expect(el(form, 'providerKey').placeholder).toBe(''));
    expect(document.getElementById('openrouter-status').textContent).toBe('Not connected to OpenRouter');

    form.querySelector('.key-toggle[data-target="providerKey"]').click();
    expect(el(form, 'providerKey').value).toBe('');
  });

  it('saves a key typed for DeepSeek under apiKeys.deepseek and shows Saved', async () => {
    const form = await setup(base({ provider: 'deepseek', apiKeys: { openai: 'o' } }));
    el(form, 'providerKey').value = 'ds-key';
    fire(el(form, 'providerKey'), 'change');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    const saved = saveSettings.mock.calls.at(-1)[0];
    expect(saved.apiKeys).toEqual({ openai: 'o', deepseek: 'ds-key' });
    expect(saved.provider).toBe('deepseek');
    expect(document.getElementById('autosave-status').textContent).toBe('Saved');
  });

  it('keeps the stored key when the field is left blank', async () => {
    const form = await setup(base({ provider: 'deepseek', apiKeys: { deepseek: 'old' } }));
    fire(el(form, 'resultsCount'), 'change');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(saveSettings.mock.calls.at(-1)[0].apiKeys.deepseek).toBe('old');
  });

  it('saves the model under the current provider and clamps results count', async () => {
    const form = await setup(base({ provider: 'openai', models: { anthropic: 'keep' } }));
    el(form, 'model').value = 'gpt-x';
    el(form, 'resultsCount').value = '999';
    fire(el(form, 'model'), 'change');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    const saved = saveSettings.mock.calls.at(-1)[0];
    expect(saved.models).toEqual({ anthropic: 'keep', openai: 'gpt-x' });
    expect(saved.resultsCount).toBe(20);
    expect('model' in saved).toBe(false);
  });

  it('re-renders the model input to the new provider saved model before saving, never carrying the old text', async () => {
    const form = await setup(base({ provider: 'openai', models: { openai: 'gpt-x', deepseek: 'ds-saved' } }));
    el(form, 'model').value = 'typed-for-openai';
    choose(el(form, 'provider'), 'deepseek');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(el(form, 'model').value).toBe('ds-saved');
    const saved = saveSettings.mock.calls.at(-1)[0];
    expect(saved.provider).toBe('deepseek');
    expect(saved.models).toEqual({ openai: 'gpt-x', deepseek: 'ds-saved' });
    expect(form.querySelector('#provider-key-slot label').textContent).toMatch(/DeepSeek API key/);
  });

  it('does not request permission for hosts already required by the manifest', async () => {
    const form = await setup(base({ provider: 'openai' }));
    choose(el(form, 'provider'), 'anthropic');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(requestHostPermission).not.toHaveBeenCalled();
  });

  it('requests host permission for an optional provider and saves on grant', async () => {
    const form = await setup(base({ provider: 'anthropic' }));
    choose(el(form, 'provider'), 'deepseek');
    expect(requestHostPermission).toHaveBeenCalledWith(PROVIDERS.deepseek.host);
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(saveSettings.mock.calls.at(-1)[0].provider).toBe('deepseek');
  });

  it('reverts the provider, shows a message and does not save when permission is denied', async () => {
    requestHostPermission.mockResolvedValue(false);
    const form = await setup(base({ provider: 'anthropic', models: { anthropic: 'm-a' } }));
    choose(el(form, 'provider'), 'deepseek');
    await vi.waitFor(() => expect(el(form, 'provider').value).toBe('anthropic'));
    expect(document.getElementById('permission-status').textContent).toBe('Research Companion needs permission to contact DeepSeek.');
    expect(el(form, 'model').value).toBe('m-a');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('treats a rejected permission request like a denial', async () => {
    requestHostPermission.mockRejectedValue(new Error('boom'));
    const form = await setup(base({ provider: 'anthropic' }));
    choose(el(form, 'provider'), 'deepseek');
    await vi.waitFor(() => expect(el(form, 'provider').value).toBe('anthropic'));
    expect(document.getElementById('permission-status').textContent).toBe('Research Companion needs permission to contact DeepSeek.');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('saves a pending key under the provider it was typed for even if the provider changes before storage returns', async () => {
    const stored = base({ provider: 'anthropic' });
    const form = await setup(stored);
    let release;
    getSettings.mockReturnValueOnce(new Promise((r) => { release = r; }));
    el(form, 'providerKey').value = 'sk-ant-api-typed';
    fire(el(form, 'providerKey'), 'change');
    choose(el(form, 'provider'), 'deepseek');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    release(stored);
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalledTimes(2));
    const keySave = saveSettings.mock.calls.map((c) => c[0]).find((x) => x.apiKeys?.anthropic);
    expect(keySave.apiKeys.anthropic).toBe('sk-ant-api-typed');
    expect(keySave.apiKeys.deepseek).toBeUndefined();
    expect(keySave.provider).toBe('anthropic');
  });

  it('applies the same permission flow to the search service select', async () => {
    requestHostPermission.mockResolvedValue(false);
    const form = await setup(base({ provider: 'anthropic' }));
    choose(el(form, 'searchService'), 'exa');
    expect(requestHostPermission).toHaveBeenCalledWith('https://api.exa.ai/*');
    await vi.waitFor(() => expect(el(form, 'searchService').value).toBe(''));
    expect(document.getElementById('permission-status').textContent).toBe('Research Companion needs permission to contact Exa.');
    expect(saveSettings).not.toHaveBeenCalled();
    expect(el(form, 'searchKey')).toBeNull();

    requestHostPermission.mockResolvedValue(true);
    choose(el(form, 'searchService'), 'tavily');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(saveSettings.mock.calls.at(-1)[0].searchService).toBe('tavily');
    expect(el(form, 'searchKey')).not.toBeNull();
  });

  it('saves a search key under searchKeys[service] and null for None without a permission request', async () => {
    const form = await setup(base({ provider: 'anthropic', searchService: 'exa', searchKeys: { tavily: 't' } }));
    el(form, 'searchKey').value = 'exa-key';
    fire(el(form, 'searchKey'), 'change');
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());
    expect(saveSettings.mock.calls.at(-1)[0].searchKeys).toEqual({ tavily: 't', exa: 'exa-key' });

    requestHostPermission.mockClear();
    choose(el(form, 'searchService'), '');
    await vi.waitFor(() => expect(saveSettings.mock.calls.at(-1)[0].searchService).toBeNull());
    expect(requestHostPermission).not.toHaveBeenCalled();
    expect(el(form, 'searchKey')).toBeNull();
  });

  it('shows the Required badge for a Mode 2 provider and hides it for a Mode 1 provider on its default model', async () => {
    const badge = () => document.getElementById('search-required-badge');
    const form = await setup(base({ provider: 'anthropic' }));
    expect(badge().hidden).toBe(true);
    choose(el(form, 'provider'), 'together');
    await vi.waitFor(() => expect(badge().hidden).toBe(false));
    choose(el(form, 'provider'), 'deepseek');
    await vi.waitFor(() => expect(badge().hidden).toBe(true));
  });

  it('shows the badge when a Mode 1 provider model cannot search natively', async () => {
    const form = await setup(base({ provider: 'deepseek' }));
    el(form, 'model').value = 'deepseek-pro';
    fire(el(form, 'model'), 'change');
    await vi.waitFor(() => expect(document.getElementById('search-required-badge').hidden).toBe(false));
  });

  it('toggles a key field between password and text, revealing only the stored value', async () => {
    const form = await setup(base({ provider: 'anthropic', apiKeys: { anthropic: 'secret-value' } }));
    const toggle = form.querySelector('.key-toggle[data-target="providerKey"]');
    toggle.click();
    expect(el(form, 'providerKey').type).toBe('text');
    expect(toggle.textContent).toBe('Hide');
    expect(el(form, 'providerKey').value).toBe('secret-value');
    toggle.click();
    expect(el(form, 'providerKey').type).toBe('password');
    expect(toggle.textContent).toBe('Show');
  });

  it('does not overwrite a freshly typed key when Show is clicked', async () => {
    const form = await setup(base({ provider: 'anthropic', apiKeys: { anthropic: 'stored' } }));
    el(form, 'providerKey').value = 'freshly-typed';
    form.querySelector('.key-toggle[data-target="providerKey"]').click();
    expect(el(form, 'providerKey').value).toBe('freshly-typed');
  });

  it('shows the friendly OpenRouter error on connect failure', async () => {
    await setup(base());
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      expect(message).toEqual({ type: 'CONNECT_OPENROUTER' });
      callback({ ok: false, error: 'OpenRouter key exchange failed: 401' });
    });
    document.getElementById('connect-openrouter').click();
    expect(document.getElementById('openrouter-status').textContent).toBe('OpenRouter rejected the sign-in. Try connecting again.');
  });

  it('shows a capped hint when the results count is clamped, live and on change', async () => {
    const form = await setup(base());
    const hint = document.getElementById('results-count-hint');
    el(form, 'resultsCount').value = '999';
    fire(el(form, 'resultsCount'), 'input');
    expect(hint.hidden).toBe(false);
    expect(hint.textContent).toMatch(/Capped to 1.20/);
    el(form, 'resultsCount').value = '10';
    fire(el(form, 'resultsCount'), 'change');
    await vi.waitFor(() => expect(hint.hidden).toBe(true));
  });

  it('warns about a wrong key prefix using the registry hint, and clears it once fixed', async () => {
    const form = await setup(base({ provider: 'anthropic' }));
    const warning = form.querySelector('.key-warning[data-for="providerKey"]');
    el(form, 'providerKey').value = 'wrong-shape';
    fire(el(form, 'providerKey'), 'focusout');
    expect(warning.hidden).toBe(false);
    expect(warning.textContent).toBe('Anthropic keys start with "sk-ant-api" — this doesn\'t look right.');
    el(form, 'providerKey').value = 'sk-ant-api-abc';
    fire(el(form, 'providerKey'), 'focusout');
    expect(warning.hidden).toBe(true);
  });

  it('also checks the key format on a bare change event so autosave cannot bypass it', async () => {
    const form = await setup(base({ provider: 'anthropic' }));
    el(form, 'providerKey').value = 'nope';
    fire(el(form, 'providerKey'), 'change');
    await vi.waitFor(() => expect(form.querySelector('.key-warning[data-for="providerKey"]').hidden).toBe(false));
  });
});

describe('getApiKeyFormatWarning', () => {
  it('returns null for an empty value or a provider without a known prefix', () => {
    expect(getApiKeyFormatWarning('X', 'sk-', '')).toBeNull();
    expect(getApiKeyFormatWarning('X', '', 'anything')).toBeNull();
    expect(getApiKeyFormatWarning('X', null, 'anything')).toBeNull();
  });

  it('flags a value without the prefix and accepts one with it', () => {
    expect(getApiKeyFormatWarning('Tavily', 'tvly-', 'bad')).toBe('Tavily keys start with "tvly-" — this doesn\'t look right.');
    expect(getApiKeyFormatWarning('Tavily', 'tvly-', 'tvly-abc')).toBeNull();
  });
});

describe('toFriendlyOpenRouterError', () => {
  it('returns a generic connect message when there is no specific error', () => {
    expect(toFriendlyOpenRouterError(undefined)).toBe("Couldn't connect to OpenRouter. Try again.");
  });

  it('maps a key-exchange 401/403 to a sign-in-rejected message', () => {
    expect(toFriendlyOpenRouterError('OpenRouter key exchange failed: 401'))
      .toBe('OpenRouter rejected the sign-in. Try connecting again.');
    expect(toFriendlyOpenRouterError('OpenRouter key exchange failed: 403'))
      .toBe('OpenRouter rejected the sign-in. Try connecting again.');
  });

  it('maps a key-exchange 429 to a rate-limit message', () => {
    expect(toFriendlyOpenRouterError('OpenRouter key exchange failed: 429'))
      .toBe('Rate limited by OpenRouter. Try again in a moment.');
  });

  it('maps a key-exchange 5xx to a transient-trouble message', () => {
    expect(toFriendlyOpenRouterError('OpenRouter key exchange failed: 503'))
      .toBe('OpenRouter is having trouble right now. Try again shortly.');
  });

  it('maps a cancelled or incomplete sign-in to a plain cancelled message', () => {
    expect(toFriendlyOpenRouterError('Auth flow cancelled'))
      .toBe('Sign-in was cancelled.');
    expect(toFriendlyOpenRouterError('OpenRouter authorization did not return a code'))
      .toBe('Sign-in was cancelled.');
  });

  it('maps a state mismatch to a retry message', () => {
    expect(toFriendlyOpenRouterError('OpenRouter authorization state mismatch'))
      .toBe("Sign-in didn't complete correctly. Try connecting again.");
  });

  it('passes through an unrecognized message unchanged', () => {
    expect(toFriendlyOpenRouterError('something truly unexpected'))
      .toBe('something truly unexpected');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { getSettings, saveSettings } from '../../src/lib/storage.js';
import {
  gatherSettingsFromForm,
  renderSettingsToForm,
  initOptionsPage,
  syncKeyFieldVisibility,
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

  it('groups Search Provider and the Brave Search API key into their own fieldset', () => {
    const doc = loadOptionsHtml();
    const searchProviderSelect = doc.querySelector('select[name="searchProvider"]');
    const braveKeyInput = doc.querySelector('input[name="braveSearchKey"]');
    const searchFieldset = searchProviderSelect.closest('fieldset');

    expect(searchFieldset).not.toBeNull();
    expect(searchFieldset.querySelector('legend').textContent).toBe('Search');
    expect(searchFieldset.contains(braveKeyInput)).toBe(true);
  });
});

function buildForm() {
  document.body.innerHTML = `
    <form id="settings-form">
      <select name="provider">
        <option value="">-- choose --</option>
        <option value="anthropic">Anthropic</option>
        <option value="openai">OpenAI</option>
        <option value="gemini">Gemini</option>
        <option value="openrouter">OpenRouter</option>
      </select>
      <input type="text" name="model" />
      <label class="key-field" data-provider="anthropic">
        <input type="password" name="anthropicKey" />
        <button type="button" class="key-toggle" data-target="anthropicKey" data-label="Anthropic API key" aria-label="Show Anthropic API key">Show</button>
      </label>
      <label class="key-field" data-provider="openai">
        <input type="password" name="openaiKey" />
        <button type="button" class="key-toggle" data-target="openaiKey" data-label="OpenAI API key" aria-label="Show OpenAI API key">Show</button>
      </label>
      <label class="key-field" data-provider="gemini">
        <input type="password" name="geminiKey" />
        <button type="button" class="key-toggle" data-target="geminiKey" data-label="Gemini API key" aria-label="Show Gemini API key">Show</button>
      </label>
      <select name="searchProvider">
        <option value="brave">Brave</option>
        <option value="duckduckgo">DuckDuckGo</option>
      </select>
      <label class="key-field" data-search-provider="brave">
        <input type="password" name="braveSearchKey" />
      </label>
      <input type="number" name="resultsCount" min="1" max="20" />
    </form>
    <button type="button" id="connect-openrouter">Connect</button>
    <span id="openrouter-status"></span>
  `;
  const form = document.getElementById('settings-form');
  // Attach form elements as properties for easy access in tests
  form.provider = form.elements.namedItem('provider');
  form.model = form.elements.namedItem('model');
  form.anthropicKey = form.elements.namedItem('anthropicKey');
  form.openaiKey = form.elements.namedItem('openaiKey');
  form.geminiKey = form.elements.namedItem('geminiKey');
  form.searchProvider = form.elements.namedItem('searchProvider');
  form.braveSearchKey = form.elements.namedItem('braveSearchKey');
  form.resultsCount = form.elements.namedItem('resultsCount');
  return form;
}

describe('gatherSettingsFromForm', () => {
  it('reads form fields into a settings object', () => {
    const form = buildForm();
    form.provider.value = 'anthropic';
    form.model.value = 'claude-3-5-sonnet-20241022';
    form.anthropicKey.value = 'a-key';
    form.braveSearchKey.value = 'b-key';
    form.resultsCount.value = '10';

    const settings = gatherSettingsFromForm(form);

    expect(settings).toEqual({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKeys: { anthropic: 'a-key', openai: '', gemini: '' },
      searchProvider: 'brave',
      braveSearchKey: 'b-key',
      resultsCount: 10,
    });
  });

  it('defaults resultsCount to 8 when blank or invalid', () => {
    const form = buildForm();
    form.resultsCount.value = '';
    expect(gatherSettingsFromForm(form).resultsCount).toBe(8);
  });

  it('clamps resultsCount to the input\'s declared min/max instead of saving it raw', () => {
    const form = buildForm();
    form.resultsCount.value = '999';
    expect(gatherSettingsFromForm(form).resultsCount).toBe(20);

    form.resultsCount.value = '-5';
    expect(gatherSettingsFromForm(form).resultsCount).toBe(1);
  });
});

describe('renderSettingsToForm', () => {
  it('populates non-secret fields from a settings object', () => {
    const form = buildForm();
    renderSettingsToForm(form, {
      provider: 'anthropic',
      model: 'm1',
      apiKeys: { anthropic: 'sk-ant-abc123', openai: '', gemini: '' },
      braveSearchKey: 'b-key',
      resultsCount: 5,
    });

    expect(form.provider.value).toBe('anthropic');
    expect(form.model.value).toBe('m1');
    expect(form.resultsCount.value).toBe('5');
  });

  it('never re-displays a saved key in full - the field stays blank with a masked placeholder hint', () => {
    const form = buildForm();
    renderSettingsToForm(form, {
      provider: 'anthropic',
      model: 'm1',
      apiKeys: { anthropic: 'sk-ant-abc123', openai: '', gemini: '' },
      braveSearchKey: 'b-key',
      resultsCount: 5,
    });

    expect(form.anthropicKey.value).toBe('');
    expect(form.anthropicKey.placeholder).toBe('Saved, ending in ****c123');
    expect(form.braveSearchKey.value).toBe('');
    expect(form.braveSearchKey.placeholder).toBe('Saved, ending in ****-key');
  });

  it('leaves the placeholder blank when no key is saved for a field', () => {
    const form = buildForm();
    renderSettingsToForm(form, {
      provider: null,
      model: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      braveSearchKey: '',
      resultsCount: 8,
    });

    expect(form.anthropicKey.placeholder).toBe('');
  });
});

describe('gatherSettingsFromForm - stored key fallback', () => {
  it('keeps the previously stored key when its field is left blank', () => {
    const form = buildForm();
    form.provider.value = 'anthropic';
    form.resultsCount.value = '8';
    // anthropicKey field left blank - simulates the masked, untouched state.

    const settings = gatherSettingsFromForm(form, { anthropic: 'sk-ant-old', openai: '', gemini: '' }, 'old-brave-key');

    expect(settings.apiKeys.anthropic).toBe('sk-ant-old');
    expect(settings.braveSearchKey).toBe('old-brave-key');
  });

  it('uses the freshly typed value when the field is edited, ignoring the stored one', () => {
    const form = buildForm();
    form.anthropicKey.value = 'sk-ant-new';

    const settings = gatherSettingsFromForm(form, { anthropic: 'sk-ant-old', openai: '', gemini: '' });

    expect(settings.apiKeys.anthropic).toBe('sk-ant-new');
  });
});

describe('initOptionsPage', () => {
  beforeEach(() => {
    global.chrome = { runtime: { sendMessage: vi.fn() } };
  });

  it('loads settings into the form and reflects openrouter connection status', async () => {
    getSettings.mockResolvedValue({
      provider: 'openrouter',
      model: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: 'or-token',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    expect(statusEl.textContent).toBe('OpenRouter: connected');
  });

  it('shows not connected when there is no openrouter token', async () => {
    getSettings.mockResolvedValue({
      provider: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    expect(statusEl.textContent).toBe('OpenRouter: not connected');
  });

  it('saves settings on form change', async () => {
    getSettings.mockResolvedValue({
      provider: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');
    await initOptionsPage(form, connectButton, statusEl);

    form.braveSearchKey.value = 'new-key';
    form.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(saveSettings).toHaveBeenCalled());

    expect(saveSettings.mock.calls.at(-1)[0].braveSearchKey).toBe('new-key');
  });

  it('shows only the API key field matching the selected provider', async () => {
    getSettings.mockResolvedValue({
      provider: 'anthropic',
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    expect(form.querySelector('[data-provider="anthropic"]').classList.contains('is-hidden')).toBe(false);
    expect(form.querySelector('[data-provider="openai"]').classList.contains('is-hidden')).toBe(true);
    expect(form.querySelector('[data-provider="gemini"]').classList.contains('is-hidden')).toBe(true);

    form.provider.value = 'gemini';
    form.dispatchEvent(new Event('change'));

    expect(form.querySelector('[data-provider="anthropic"]').classList.contains('is-hidden')).toBe(true);
    expect(form.querySelector('[data-provider="gemini"]').classList.contains('is-hidden')).toBe(false);
  });

  it('toggles a key field between password and text when its reveal button is clicked', async () => {
    getSettings.mockResolvedValue({
      provider: 'anthropic',
      apiKeys: { anthropic: 'secret-value', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
    const form = buildForm();
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    const toggle = form.querySelector('.key-toggle[data-target="anthropicKey"]');
    expect(form.anthropicKey.type).toBe('password');

    toggle.click();
    expect(form.anthropicKey.type).toBe('text');
    expect(toggle.textContent).toBe('Hide');

    toggle.click();
    expect(form.anthropicKey.type).toBe('password');
    expect(toggle.textContent).toBe('Show');
  });
});

describe('syncKeyFieldVisibility', () => {
  it('hides all LLM provider-specific key fields when no provider is selected', () => {
    const form = buildForm();
    form.provider.value = '';

    syncKeyFieldVisibility(form);

    form.querySelectorAll('.key-field[data-provider]').forEach((field) => {
      expect(field.classList.contains('is-hidden')).toBe(true);
    });
  });

  it('shows the brave key field only when brave is the selected search provider', () => {
    const form = buildForm();
    const braveField = form.querySelector('[data-search-provider="brave"]');

    form.searchProvider.value = 'brave';
    syncKeyFieldVisibility(form);
    expect(braveField.classList.contains('is-hidden')).toBe(false);

    form.searchProvider.value = 'duckduckgo';
    syncKeyFieldVisibility(form);
    expect(braveField.classList.contains('is-hidden')).toBe(true);
  });
});

describe('getApiKeyFormatWarning', () => {
  it('returns null for an empty value', () => {
    expect(getApiKeyFormatWarning('anthropicKey', '')).toBeNull();
  });

  it('returns null for a field with no known format', () => {
    expect(getApiKeyFormatWarning('someOtherField', 'anything')).toBeNull();
  });

  it('flags an Anthropic key that does not start with sk-ant-', () => {
    expect(getApiKeyFormatWarning('anthropicKey', 'wrong-shape')).toMatch(/sk-ant-/);
    expect(getApiKeyFormatWarning('anthropicKey', 'sk-ant-abc123')).toBeNull();
  });

  it('flags an OpenAI key that does not start with sk-', () => {
    expect(getApiKeyFormatWarning('openaiKey', 'wrong-shape')).toMatch(/sk-/);
    expect(getApiKeyFormatWarning('openaiKey', 'sk-abc123')).toBeNull();
  });

  it('flags a Gemini key that does not start with AIza', () => {
    expect(getApiKeyFormatWarning('geminiKey', 'wrong-shape')).toMatch(/AIza/);
    expect(getApiKeyFormatWarning('geminiKey', 'AIzaSyAbc123')).toBeNull();
  });

  it('flags a Brave Search key containing whitespace, since it has no recognizable prefix to check', () => {
    expect(getApiKeyFormatWarning('braveSearchKey', 'pasted with spaces')).toMatch(/spaces/);
    expect(getApiKeyFormatWarning('braveSearchKey', 'a-clean-token')).toBeNull();
  });

  it('flags a Brave Search key that looks like another provider\'s key, since that\'s a likely paste-into-wrong-field mistake', () => {
    expect(getApiKeyFormatWarning('braveSearchKey', 'sk-ant-abc123')).toMatch(/provider/i);
    expect(getApiKeyFormatWarning('braveSearchKey', 'sk-abc123')).toMatch(/provider/i);
    expect(getApiKeyFormatWarning('braveSearchKey', 'AIzaSyAbc123')).toMatch(/provider/i);
    expect(getApiKeyFormatWarning('braveSearchKey', 'a-clean-token')).toBeNull();
  });
});

describe('initOptionsPage key validation', () => {
  beforeEach(() => {
    global.chrome = { runtime: { sendMessage: vi.fn() } };
  });

  it('shows an inline warning on blur when a key has the wrong shape, and clears it once fixed', async () => {
    getSettings.mockResolvedValue({
      provider: 'anthropic',
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });

    document.body.innerHTML = `
      <form id="settings-form">
        <select name="provider"><option value="anthropic" selected>Anthropic</option></select>
        <input type="text" name="model" />
        <label class="key-field" data-provider="anthropic">
          <div class="key-input-row">
            <input type="password" name="anthropicKey" />
            <button type="button" class="key-toggle" data-target="anthropicKey" data-label="Anthropic API key" aria-label="Show Anthropic API key">Show</button>
          </div>
          <p class="key-warning" data-for="anthropicKey" hidden></p>
        </label>
        <input type="password" name="braveSearchKey" />
        <input type="number" name="resultsCount" min="1" max="20" />
      </form>
      <button type="button" id="connect-openrouter">Connect</button>
      <span id="openrouter-status"></span>
    `;
    const form = document.getElementById('settings-form');
    form.provider = form.elements.namedItem('provider');
    form.model = form.elements.namedItem('model');
    form.anthropicKey = form.elements.namedItem('anthropicKey');
    form.openaiKey = { value: '' };
    form.geminiKey = { value: '' };
    form.braveSearchKey = form.elements.namedItem('braveSearchKey');
    form.resultsCount = form.elements.namedItem('resultsCount');
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    const warningEl = form.querySelector('.key-warning[data-for="anthropicKey"]');
    form.anthropicKey.value = 'not-a-real-key';
    form.anthropicKey.dispatchEvent(new Event('blur'));
    expect(warningEl.hidden).toBe(false);
    expect(warningEl.textContent).toMatch(/sk-ant-/);

    form.anthropicKey.value = 'sk-ant-abc123';
    form.anthropicKey.dispatchEvent(new Event('blur'));
    expect(warningEl.hidden).toBe(true);
  });

  it('also runs the key format check on a bare change event, not just blur, so autosave cannot bypass it', async () => {
    getSettings.mockResolvedValue({
      provider: 'anthropic',
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });

    document.body.innerHTML = `
      <form id="settings-form">
        <select name="provider"><option value="anthropic" selected>Anthropic</option></select>
        <input type="text" name="model" />
        <label class="key-field" data-provider="anthropic">
          <div class="key-input-row">
            <input type="password" name="anthropicKey" />
            <button type="button" class="key-toggle" data-target="anthropicKey" data-label="Anthropic API key" aria-label="Show Anthropic API key">Show</button>
          </div>
          <p class="key-warning" data-for="anthropicKey" hidden></p>
        </label>
        <input type="password" name="braveSearchKey" />
        <input type="number" name="resultsCount" min="1" max="20" />
      </form>
      <button type="button" id="connect-openrouter">Connect</button>
      <span id="openrouter-status"></span>
    `;
    const form = document.getElementById('settings-form');
    form.provider = form.elements.namedItem('provider');
    form.model = form.elements.namedItem('model');
    form.anthropicKey = form.elements.namedItem('anthropicKey');
    form.openaiKey = { value: '' };
    form.geminiKey = { value: '' };
    form.braveSearchKey = form.elements.namedItem('braveSearchKey');
    form.resultsCount = form.elements.namedItem('resultsCount');
    const connectButton = document.getElementById('connect-openrouter');
    const statusEl = document.getElementById('openrouter-status');

    await initOptionsPage(form, connectButton, statusEl);

    const warningEl = form.querySelector('.key-warning[data-for="anthropicKey"]');
    // Simulate a mouse click moving focus elsewhere without a blur firing on
    // anthropicKey first - the autosave 'change' listener still runs.
    form.anthropicKey.value = 'not-a-real-key';
    form.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(warningEl.hidden).toBe(false));
    expect(warningEl.textContent).toMatch(/sk-ant-/);
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

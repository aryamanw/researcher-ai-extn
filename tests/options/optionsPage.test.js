import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));

import { getSettings, saveSettings } from '../../src/lib/storage.js';
import { gatherSettingsFromForm, renderSettingsToForm, initOptionsPage } from '../../options/optionsPage.js';

function buildForm() {
  document.body.innerHTML = `
    <form id="settings-form">
      <select name="provider">
        <option value="">-- choose --</option>
        <option value="anthropic">Anthropic</option>
      </select>
      <input type="text" name="model" />
      <input type="password" name="anthropicKey" />
      <input type="password" name="openaiKey" />
      <input type="password" name="geminiKey" />
      <input type="password" name="braveSearchKey" />
      <input type="number" name="resultsCount" />
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
      braveSearchKey: 'b-key',
      resultsCount: 10,
    });
  });

  it('defaults resultsCount to 8 when blank or invalid', () => {
    const form = buildForm();
    form.resultsCount.value = '';
    expect(gatherSettingsFromForm(form).resultsCount).toBe(8);
  });
});

describe('renderSettingsToForm', () => {
  it('populates form fields from a settings object', () => {
    const form = buildForm();
    renderSettingsToForm(form, {
      provider: 'anthropic',
      model: 'm1',
      apiKeys: { anthropic: 'a-key', openai: 'o-key', gemini: 'g-key' },
      braveSearchKey: 'b-key',
      resultsCount: 5,
    });

    expect(form.provider.value).toBe('anthropic');
    expect(form.model.value).toBe('m1');
    expect(form.anthropicKey.value).toBe('a-key');
    expect(form.braveSearchKey.value).toBe('b-key');
    expect(form.resultsCount.value).toBe('5');
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
});

import { getSettings, saveSettings } from '../src/lib/storage.js';

export function gatherSettingsFromForm(form) {
  return {
    provider: form.provider.value || null,
    model: form.model.value || null,
    apiKeys: {
      anthropic: form.anthropicKey.value,
      openai: form.openaiKey.value,
      gemini: form.geminiKey.value,
    },
    braveSearchKey: form.braveSearchKey.value,
    resultsCount: Number(form.resultsCount.value) || 8,
  };
}

export function renderSettingsToForm(form, settings) {
  form.provider.value = settings.provider || '';
  form.model.value = settings.model || '';
  form.anthropicKey.value = settings.apiKeys?.anthropic || '';
  form.openaiKey.value = settings.apiKeys?.openai || '';
  form.geminiKey.value = settings.apiKeys?.gemini || '';
  form.braveSearchKey.value = settings.braveSearchKey || '';
  form.resultsCount.value = settings.resultsCount ?? 8;
}

export async function initOptionsPage(form, connectButton, statusEl) {
  const settings = await getSettings();
  renderSettingsToForm(form, settings);
  statusEl.textContent = settings.openrouterToken ? 'OpenRouter: connected' : 'OpenRouter: not connected';

  form.addEventListener('change', async () => {
    const current = await getSettings();
    await saveSettings({ ...current, ...gatherSettingsFromForm(form) });
  });

  connectButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CONNECT_OPENROUTER' }, (response) => {
      statusEl.textContent = response?.ok
        ? 'OpenRouter: connected'
        : `OpenRouter: connection failed (${response?.error || 'unknown error'})`;
    });
  });
}

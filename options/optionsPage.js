import { getSettings, saveSettings } from '../src/lib/storage.js';

const KEY_FORMAT_HINTS = {
  anthropicKey: { pattern: /^sk-ant-/, message: "Anthropic keys start with \"sk-ant-\" — this doesn't look right." },
  openaiKey: { pattern: /^sk-/, message: "OpenAI keys start with \"sk-\" — this doesn't look right." },
  geminiKey: { pattern: /^AIza/, message: "Gemini keys start with \"AIza\" — this doesn't look right." },
  // Brave Search tokens have no documented, recognizable prefix, so this only
  // catches paste mistakes (whitespace, surrounding quotes) rather than shape.
  braveSearchKey: { pattern: /^\S+$/, message: "API keys shouldn't contain spaces or line breaks — check what you pasted." },
};

export function getApiKeyFormatWarning(fieldName, value) {
  if (!value) return null;
  const hint = KEY_FORMAT_HINTS[fieldName];
  if (!hint || hint.pattern.test(value)) return null;
  return hint.message;
}

function wireKeyValidation(form) {
  form.querySelectorAll('.key-input-row input').forEach((input) => {
    const warningEl = form.querySelector(`.key-warning[data-for="${input.name}"]`);
    if (!warningEl) return;
    input.addEventListener('blur', () => {
      const warning = getApiKeyFormatWarning(input.name, input.value);
      warningEl.textContent = warning || '';
      warningEl.hidden = !warning;
    });
  });
}

function clampResultsCount(value, input) {
  const min = Number(input.min) || 1;
  const max = Number(input.max) || 20;
  const parsed = Number(value);
  if (!parsed) return 8;
  return Math.min(max, Math.max(min, parsed));
}

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
    resultsCount: clampResultsCount(form.resultsCount.value, form.resultsCount),
  };
}

export function renderSettingsToForm(form, settings) {
  form.provider.value = settings.provider || '';
  form.model.value = settings.model || '';
    form.anthropicKey.value = settings.apiKeys.anthropic;
    form.openaiKey.value = settings.apiKeys.openai;
    form.geminiKey.value = settings.apiKeys.gemini;
  form.braveSearchKey.value = settings.braveSearchKey || '';
  form.resultsCount.value = settings.resultsCount ?? 8;
}

export function syncKeyFieldVisibility(form) {
  const selectedProvider = form.provider?.value;
  form.querySelectorAll('.key-field').forEach((field) => {
    field.classList.toggle('is-hidden', field.dataset.provider !== selectedProvider);
  });
}

function wireKeyToggles(form) {
  form.querySelectorAll('.key-toggle').forEach((button) => {
    const input = form.elements.namedItem(button.dataset.target);
    if (!input) return;
    const label = button.dataset.label || input.name;
    button.addEventListener('click', () => {
      const willShow = input.type === 'password';
      input.type = willShow ? 'text' : 'password';
      button.textContent = willShow ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${willShow ? 'Hide' : 'Show'} ${label}`);
    });
  });
}

export async function initOptionsPage(form, connectButton, statusEl, autosaveStatusEl) {
  const settings = await getSettings();
  renderSettingsToForm(form, settings);
  statusEl.textContent = settings.openrouterToken ? 'OpenRouter: connected' : 'OpenRouter: not connected';
  syncKeyFieldVisibility(form);
  wireKeyToggles(form);
  wireKeyValidation(form);

  let hideTimer;
  form.addEventListener('change', async () => {
    syncKeyFieldVisibility(form);

    const current = await getSettings();
    await saveSettings({ ...current, ...gatherSettingsFromForm(form) });

    if (autosaveStatusEl) {
      autosaveStatusEl.textContent = 'Saved';
      autosaveStatusEl.classList.add('is-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => autosaveStatusEl.classList.remove('is-visible'), 1500);
    }
  });

  connectButton.addEventListener('click', () => {
    connectButton.disabled = true;
    chrome.runtime.sendMessage({ type: 'CONNECT_OPENROUTER' }, (response) => {
      statusEl.textContent = response?.ok
        ? 'OpenRouter: connected'
        : `OpenRouter: connection failed (${response?.error || 'unknown error'})`;
      connectButton.disabled = false;
    });
  });
}

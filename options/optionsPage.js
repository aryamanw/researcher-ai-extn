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

// A blank key field means "unchanged" once a key is already saved (see
// renderSettingsToForm) - fall back to the previously stored value instead
// of overwriting it with an empty string.
function keyValueOrStored(input, storedValue) {
  return input.value || storedValue || '';
}

export function gatherSettingsFromForm(form, storedApiKeys = {}, storedBraveSearchKey = '') {
  return {
    provider: form.provider.value || null,
    model: form.model.value || null,
    apiKeys: {
      anthropic: keyValueOrStored(form.anthropicKey, storedApiKeys.anthropic),
      openai: keyValueOrStored(form.openaiKey, storedApiKeys.openai),
      gemini: keyValueOrStored(form.geminiKey, storedApiKeys.gemini),
    },
    braveSearchKey: keyValueOrStored(form.braveSearchKey, storedBraveSearchKey),
    resultsCount: clampResultsCount(form.resultsCount.value, form.resultsCount),
  };
}

// Saved keys are never re-displayed in full - the field stays blank with a
// masked hint, and only a freshly typed value is treated as a real edit.
function maskedKeyPlaceholder(value) {
  return value ? `Saved, ending in ****${value.slice(-4)}` : '';
}

export function renderSettingsToForm(form, settings) {
  form.provider.value = settings.provider || '';
  form.model.value = settings.model || '';
  form.anthropicKey.value = '';
  form.anthropicKey.placeholder = maskedKeyPlaceholder(settings.apiKeys.anthropic);
  form.openaiKey.value = '';
  form.openaiKey.placeholder = maskedKeyPlaceholder(settings.apiKeys.openai);
  form.geminiKey.value = '';
  form.geminiKey.placeholder = maskedKeyPlaceholder(settings.apiKeys.gemini);
  form.braveSearchKey.value = '';
  form.braveSearchKey.placeholder = maskedKeyPlaceholder(settings.braveSearchKey);
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
    await saveSettings({ ...current, ...gatherSettingsFromForm(form, current.apiKeys, current.braveSearchKey) });

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

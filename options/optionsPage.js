import { getSettings, saveSettings } from '../src/lib/storage.js';

const KEY_FORMAT_HINTS = {
  anthropicKey: { pattern: /^sk-ant-/, message: "Anthropic keys start with \"sk-ant-\" — this doesn't look right." },
  openaiKey: { pattern: /^sk-/, message: "OpenAI keys start with \"sk-\" — this doesn't look right." },
  geminiKey: { pattern: /^AIza/, message: "Gemini keys start with \"AIza\" — this doesn't look right." },
  // Brave Search tokens have no documented, recognizable prefix, so this only
  // catches paste mistakes (whitespace, surrounding quotes) rather than shape.
  braveSearchKey: { pattern: /^\S+$/, message: "API keys shouldn't contain spaces or line breaks — check what you pasted." },
};

// Brave Search has no recognizable shape of its own, but an LLM provider key
// pasted into the wrong field does - catch that specific mistake by name.
const KNOWN_PROVIDER_KEY_PATTERN = /^(sk-ant-|sk-|AIza)/;

export function getApiKeyFormatWarning(fieldName, value) {
  if (!value) return null;
  if (fieldName === 'braveSearchKey' && KNOWN_PROVIDER_KEY_PATTERN.test(value)) {
    return "That looks like an LLM provider's API key, not a Brave Search key — check you pasted the right one.";
  }
  const hint = KEY_FORMAT_HINTS[fieldName];
  if (!hint || hint.pattern.test(value)) return null;
  return hint.message;
}

export function toFriendlyOpenRouterError(rawMessage) {
  if (!rawMessage) return "Couldn't connect to OpenRouter. Try again.";

  if (/cancelled|did not return a code/i.test(rawMessage)) {
    return 'Sign-in was cancelled.';
  }
  if (/state mismatch/i.test(rawMessage)) {
    return "Sign-in didn't complete correctly. Try connecting again.";
  }
  const statusMatch = rawMessage.match(/key exchange failed: (\d{3})/i);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status === 401 || status === 403) return 'OpenRouter rejected the sign-in. Try connecting again.';
    if (status === 429) return 'Rate limited by OpenRouter. Try again in a moment.';
    if (status >= 500) return 'OpenRouter is having trouble right now. Try again shortly.';
  }
  return rawMessage;
}

function refreshKeyWarnings(form) {
  form.querySelectorAll('.key-input-row input').forEach((input) => {
    const warningEl = form.querySelector(`.key-warning[data-for="${input.name}"]`);
    if (!warningEl) return;
    const warning = getApiKeyFormatWarning(input.name, input.value);
    warningEl.textContent = warning || '';
    warningEl.hidden = !warning;
  });
}

function wireKeyValidation(form) {
  form.querySelectorAll('.key-input-row input').forEach((input) => {
    input.addEventListener('blur', () => refreshKeyWarnings(form));
  });
}

function clampResultsCount(value, input) {
  const min = Number(input.min) || 1;
  const max = Number(input.max) || 20;
  const parsed = Number(value);
  if (!parsed) return 8;
  return Math.min(max, Math.max(min, parsed));
}

function refreshResultsCountHint(form, hintEl) {
  if (!hintEl || !form.resultsCount) return;
  const raw = form.resultsCount.value;
  if (raw === '') {
    hintEl.hidden = true;
    return;
  }
  const clamped = clampResultsCount(raw, form.resultsCount);
  if (Number(raw) !== clamped) {
    hintEl.textContent = `Capped to ${form.resultsCount.min}–${form.resultsCount.max}.`;
    hintEl.hidden = false;
  } else {
    hintEl.hidden = true;
  }
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
    searchProvider: form.searchProvider?.value || 'brave',
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
  if (form.searchProvider) form.searchProvider.value = settings.searchProvider || 'brave';
  form.braveSearchKey.value = '';
  form.braveSearchKey.placeholder = maskedKeyPlaceholder(settings.braveSearchKey);
  form.resultsCount.value = settings.resultsCount ?? 8;
}

export function syncKeyFieldVisibility(form) {
  const selectedProvider = form.provider?.value;
  const selectedSearchProvider = form.searchProvider?.value || 'brave';
  form.querySelectorAll('.key-field').forEach((field) => {
    if (field.dataset.searchProvider) {
      field.classList.toggle('is-hidden', field.dataset.searchProvider !== selectedSearchProvider);
      return;
    }
    field.classList.toggle('is-hidden', field.dataset.provider !== selectedProvider);
  });
}

function wireKeyToggles(form, settings) {
  const storedValues = {
    anthropicKey: settings.apiKeys.anthropic,
    openaiKey: settings.apiKeys.openai,
    geminiKey: settings.apiKeys.gemini,
    braveSearchKey: settings.braveSearchKey,
  };
  form.querySelectorAll('.key-toggle').forEach((button) => {
    const input = form.elements.namedItem(button.dataset.target);
    if (!input) return;
    const label = button.dataset.label || input.name;
    button.addEventListener('click', () => {
      const willShow = input.type === 'password';
      if (willShow && !input.value) {
        input.value = storedValues[input.name] || '';
      }
      input.type = willShow ? 'text' : 'password';
      button.textContent = willShow ? 'Hide' : 'Show';
      button.setAttribute('aria-label', `${willShow ? 'Hide' : 'Show'} ${label}`);
    });
  });
}

export async function initOptionsPage(form, connectButton, statusEl, autosaveStatusEl, resultsCountHintEl) {
  const settings = await getSettings();
  renderSettingsToForm(form, settings);
  statusEl.textContent = settings.openrouterToken ? 'Connected to OpenRouter' : 'Not connected to OpenRouter';
  syncKeyFieldVisibility(form);
  wireKeyToggles(form, settings);
  wireKeyValidation(form);
  if (form.resultsCount) {
    form.resultsCount.addEventListener('input', () => refreshResultsCountHint(form, resultsCountHintEl));
  }

  let hideTimer;
  form.addEventListener('change', async () => {
    syncKeyFieldVisibility(form);
    refreshKeyWarnings(form);
    refreshResultsCountHint(form, resultsCountHintEl);

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
        ? 'Connected to OpenRouter'
        : toFriendlyOpenRouterError(response?.error);
      connectButton.disabled = false;
    });
  });
}

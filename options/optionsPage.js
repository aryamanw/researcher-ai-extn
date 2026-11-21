import { getSettings, saveSettings, removeSavedKeys } from '../src/lib/storage.js';
import { PROVIDERS, SEARCH_SERVICES, getProvider, canSearchNatively, resolveModel } from '../src/lib/providers/registry.js';
import { requestHostPermission } from '../src/lib/providers/permissions.js';

export function getApiKeyFormatWarning(label, prefix, value) {
  if (!value || !prefix || value.startsWith(prefix)) return null;
  return `${label} keys start with "${prefix}" — this doesn't look right.`;
}

export function renderProviderOptions(selectEl) {
  const doc = selectEl.ownerDocument;
  selectEl.replaceChildren();
  const placeholder = doc.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '-- choose --';
  selectEl.append(placeholder);
  const groups = [
    ['Built-in web search', (entry) => entry.search],
    ['Needs a search key', (entry) => !entry.search],
  ];
  for (const [label, test] of groups) {
    const group = doc.createElement('optgroup');
    group.label = label;
    for (const entry of Object.values(PROVIDERS).filter(test)) {
      const option = doc.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label;
      group.append(option);
    }
    selectEl.append(group);
  }
}

function renderSearchServiceOptions(selectEl) {
  const doc = selectEl.ownerDocument;
  selectEl.replaceChildren();
  const none = doc.createElement('option');
  none.value = '';
  none.textContent = 'None';
  selectEl.append(none);
  for (const service of Object.values(SEARCH_SERVICES)) {
    const option = doc.createElement('option');
    option.value = service.id;
    option.textContent = service.label;
    selectEl.append(option);
  }
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
    const warning = getApiKeyFormatWarning(input.dataset.keyLabel, input.dataset.keyPrefix, input.value);
    warningEl.textContent = warning || '';
    warningEl.hidden = !warning;
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
  const input = field(form, 'resultsCount');
  if (!hintEl || !input) return;
  const raw = input.value;
  if (raw === '') {
    hintEl.hidden = true;
    return;
  }
  const clamped = clampResultsCount(raw, input);
  if (Number(raw) !== clamped) {
    hintEl.textContent = `Capped to ${input.min}–${input.max}.`;
    hintEl.hidden = false;
  } else {
    hintEl.hidden = true;
  }
}

const field = (form, name) => form.elements.namedItem(name);

// Saved keys are never re-displayed in full - the field stays blank with a
// masked hint, and only a freshly typed value is treated as a real edit.
function maskedKeyPlaceholder(value) {
  return value ? `Saved, ending in ****${value.slice(-4)}` : '';
}

// getStored is read at click time so a removed key can never be revealed.
function buildKeyField(doc, { name, label, labelText, prefix, url, saved, getStored }) {
  const wrap = doc.createDocumentFragment();
  const labelEl = doc.createElement('label');
  labelEl.className = 'key-field';
  labelEl.append(labelText);

  const row = doc.createElement('div');
  row.className = 'key-input-row';
  const input = doc.createElement('input');
  input.type = 'password';
  input.name = name;
  input.placeholder = maskedKeyPlaceholder(saved);
  input.autocomplete = 'off';
  input.dataset.keyLabel = label;
  input.dataset.keyPrefix = prefix || '';
  input.setAttribute('aria-describedby', `${name}-warning`);
  const toggle = doc.createElement('button');
  toggle.type = 'button';
  toggle.className = 'key-toggle';
  toggle.dataset.target = name;
  toggle.dataset.label = labelText;
  toggle.setAttribute('aria-label', `Show ${labelText}`);
  toggle.textContent = 'Show';
  toggle.addEventListener('click', () => {
    const willShow = input.type === 'password';
    if (willShow && !input.value) input.value = getStored() || '';
    input.type = willShow ? 'text' : 'password';
    toggle.textContent = willShow ? 'Hide' : 'Show';
    toggle.setAttribute('aria-label', `${willShow ? 'Hide' : 'Show'} ${labelText}`);
  });
  row.append(input, toggle);

  const warning = doc.createElement('p');
  warning.className = 'key-warning';
  warning.id = `${name}-warning`;
  warning.dataset.for = name;
  warning.setAttribute('aria-live', 'polite');
  warning.hidden = true;
  labelEl.append(row, warning);
  wrap.append(labelEl);

  if (url) {
    const hint = doc.createElement('p');
    hint.className = 'field-hint';
    const link = doc.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Get a key';
    hint.append(link);
    wrap.append(hint);
  }
  return wrap;
}

function updateRequiredBadge(form) {
  const badge = form.querySelector('#search-required-badge');
  const entry = getProvider(field(form, 'provider').value);
  if (!badge) return;
  if (!entry) {
    badge.hidden = true;
    return;
  }
  const model = resolveModel(entry, { models: { [entry.id]: field(form, 'model').value } });
  badge.hidden = canSearchNatively(entry, model);
}

function renderProviderSection(form, settings, getSettingsNow) {
  const providerId = field(form, 'provider').value;
  const entry = getProvider(providerId);
  field(form, 'model').value = (providerId && settings.models?.[providerId]) || '';
  form.querySelector('#openrouter-block')?.classList.toggle('is-hidden', providerId !== 'openrouter');
  const slot = form.querySelector('#provider-key-slot');
  slot.replaceChildren();
  if (entry) {
    slot.append(buildKeyField(form.ownerDocument, {
      name: 'providerKey',
      label: entry.label,
      labelText: entry.id === 'openrouter' ? 'or paste an API key' : `${entry.label} API key`,
      prefix: entry.keyHint.prefix,
      url: entry.keyHint.url,
      saved: settings.apiKeys?.[entry.id],
      getStored: () => getSettingsNow().apiKeys?.[entry.id],
    }));
  }
  updateRequiredBadge(form);
}

function renderSearchSection(form, settings, getSettingsNow) {
  const service = SEARCH_SERVICES[field(form, 'searchService').value];
  const slot = form.querySelector('#search-key-slot');
  slot.replaceChildren();
  if (!service) return;
  slot.append(buildKeyField(form.ownerDocument, {
    name: 'searchKey',
    label: service.label,
    labelText: `${service.label} API key`,
    prefix: service.keyHint.prefix,
    url: service.keyHint.url,
    saved: settings.searchKeys?.[service.id],
    getStored: () => getSettingsNow().searchKeys?.[service.id],
  }));
}

export function renderSettingsToForm(form, settings, getSettingsNow = () => settings) {
  const providerSelect = field(form, 'provider');
  const searchSelect = field(form, 'searchService');
  if (!providerSelect.querySelector('optgroup')) renderProviderOptions(providerSelect);
  if (!searchSelect.options.length) renderSearchServiceOptions(searchSelect);
  providerSelect.value = settings.provider || '';
  searchSelect.value = settings.searchService || '';
  field(form, 'resultsCount').value = settings.resultsCount ?? 8;
  renderProviderSection(form, settings, getSettingsNow);
  renderSearchSection(form, settings, getSettingsNow);
}

function wireRemoveKeys(form, statusEl, onRemoved) {
  const button = form.querySelector('#remove-keys');
  if (!button) return;
  const idleLabel = button.textContent;
  let confirming = false;
  button.addEventListener('click', async () => {
    if (!confirming) {
      confirming = true;
      button.textContent = 'Confirm remove?';
      return;
    }
    confirming = false;
    button.textContent = idleLabel;
    const updated = await removeSavedKeys();
    onRemoved(updated);
    statusEl.textContent = 'Not connected to OpenRouter';
  });
  button.addEventListener('blur', () => {
    confirming = false;
    button.textContent = idleLabel;
  });
}

export async function initOptionsPage(form, connectButton, statusEl, autosaveStatusEl, resultsCountHintEl) {
  const settings = await getSettings();
  const state = { settings, provider: settings.provider || '', search: settings.searchService || '' };
  const getNow = () => state.settings;
  const providerSelect = field(form, 'provider');
  const searchSelect = field(form, 'searchService');
  const permissionEl = form.querySelector('#permission-status');
  const requiredHosts = new Set(globalThis.chrome?.runtime?.getManifest?.().host_permissions ?? []);

  renderSettingsToForm(form, settings, getNow);
  statusEl.textContent = settings.openrouterToken ? 'Connected to OpenRouter' : 'Not connected to OpenRouter';
  wireRemoveKeys(form, statusEl, (updated) => {
    state.settings = updated;
    renderSettingsToForm(form, updated, getNow);
  });
  form.addEventListener('focusout', () => refreshKeyWarnings(form));
  const resultsInput = field(form, 'resultsCount');
  resultsInput.addEventListener('input', () => refreshResultsCountHint(form, resultsCountHintEl));

  let hideTimer;
  async function persist(buildPatch) {
    const current = await getSettings();
    const next = { ...current, ...buildPatch(current) };
    await saveSettings(next);
    state.settings = next;
    if (autosaveStatusEl) {
      autosaveStatusEl.textContent = 'Saved';
      autosaveStatusEl.classList.add('is-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => autosaveStatusEl.classList.remove('is-visible'), 1500);
    }
  }

  // chrome.permissions.request must run synchronously inside the user gesture,
  // so it is called before any await. A denied request reverts the select.
  function wirePermissionSelect(select, key, lookup, apply) {
    select.addEventListener('change', () => {
      const next = select.value;
      const entry = lookup(next);
      const granted = entry && !requiredHosts.has(entry.host)
        ? requestHostPermission(entry.host)
        : Promise.resolve(true);
      Promise.resolve(granted).then(async (ok) => {
        if (!ok) {
          select.value = state[key];
          if (permissionEl) permissionEl.textContent = `Research Companion needs permission to contact ${entry.label}.`;
          return;
        }
        if (permissionEl) permissionEl.textContent = '';
        state[key] = next;
        apply(next);
        await persist(() => (key === 'provider' ? { provider: next || null } : { searchService: next || null }));
      });
    });
  }

  wirePermissionSelect(providerSelect, 'provider', getProvider, () => {
    // Re-render the model input for the new provider BEFORE any save so the
    // previous provider's model text can never be stored under the new one.
    renderProviderSection(form, state.settings, getNow);
  });
  wirePermissionSelect(searchSelect, 'search', (id) => SEARCH_SERVICES[id], () => {
    renderSearchSection(form, state.settings, getNow);
  });

  form.addEventListener('change', async (event) => {
    if (event.target === providerSelect || event.target === searchSelect) return;
    refreshKeyWarnings(form);
    refreshResultsCountHint(form, resultsCountHintEl);
    updateRequiredBadge(form);

    const providerKey = field(form, 'providerKey');
    const searchKey = field(form, 'searchKey');
    await persist((current) => {
      const provider = state.provider || null;
      const patch = {
        provider,
        searchService: state.search || null,
        resultsCount: clampResultsCount(resultsInput.value, resultsInput),
      };
      if (provider) {
        patch.models = { ...current.models, [provider]: field(form, 'model').value || '' };
        patch.apiKeys = { ...current.apiKeys, [provider]: providerKey?.value || current.apiKeys?.[provider] || '' };
      }
      if (state.search) {
        patch.searchKeys = { ...current.searchKeys, [state.search]: searchKey?.value || current.searchKeys?.[state.search] || '' };
      }
      return patch;
    });
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

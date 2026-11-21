import { PROVIDERS } from './providers/registry.js';

const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const MAX_HISTORY_ENTRIES = 50;

const SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS = {
  provider: null,
  models: {},
  apiKeys: Object.fromEntries(Object.keys(PROVIDERS).map((id) => [id, ''])),
  openrouterToken: '',
  searchService: null,
  searchKeys: { exa: '', tavily: '' },
  resultsCount: 8,
  schemaVersion: SCHEMA_VERSION,
};

function withDefaults(raw) {
  const { model: legacyModel, ...rest } = raw;
  const merged = {
    ...DEFAULT_SETTINGS,
    ...rest,
    apiKeys: { ...DEFAULT_SETTINGS.apiKeys, ...(raw.apiKeys || {}) },
    models: { ...DEFAULT_SETTINGS.models, ...(raw.models || {}) },
    searchKeys: { ...DEFAULT_SETTINGS.searchKeys, ...(raw.searchKeys || {}) },
    schemaVersion: SCHEMA_VERSION,
  };
  if (raw.schemaVersion !== SCHEMA_VERSION && legacyModel && raw.provider && !merged.models[raw.provider]) {
    merged.models[raw.provider] = legacyModel;
  }
  return merged;
}

export async function getSettings() {
  const stored = (await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY];
  const settings = withDefaults(stored || {});
  if (stored && stored.schemaVersion !== SCHEMA_VERSION) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  }
  return settings;
}

export async function removeSavedKeys() {
  const current = await getSettings();
  const updated = {
    ...current,
    apiKeys: Object.fromEntries(Object.keys(current.apiKeys).map((id) => [id, ''])),
    openrouterToken: '',
    searchKeys: Object.fromEntries(Object.keys(current.searchKeys).map((id) => [id, ''])),
  };
  await saveSettings(updated);
  return updated;
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getHistory() {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  return stored[HISTORY_KEY] || [];
}

export async function addHistoryEntry(entry) {
  const history = await getHistory();
  const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
  await chrome.storage.local.set({ [HISTORY_KEY]: updated });
  return updated;
}

export async function deleteHistoryEntry(id) {
  const history = await getHistory();
  const updated = history.filter((entry) => entry.id !== id);
  await chrome.storage.local.set({ [HISTORY_KEY]: updated });
  return updated;
}

export async function clearHistory() {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
  return [];
}

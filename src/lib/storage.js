const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const MAX_HISTORY_ENTRIES = 50;

const DEFAULT_SETTINGS = {
  provider: null,
  model: null,
  apiKeys: { anthropic: '', openai: '', gemini: '' },
  openrouterToken: '',
  searchProvider: 'brave',
  braveSearchKey: '',
  resultsCount: 8,
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
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

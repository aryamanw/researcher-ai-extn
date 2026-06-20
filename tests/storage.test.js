import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSettings, saveSettings, getHistory, addHistoryEntry } from '../src/lib/storage.js';

function mockChromeStorage(initial = {}) {
  const store = { ...initial };
  global.chrome = {
    storage: {
      local: {
        get: vi.fn((key) => Promise.resolve({ [key]: store[key] })),
        set: vi.fn((obj) => {
          Object.assign(store, obj);
          return Promise.resolve();
        }),
      },
    },
  };
  return store;
}

describe('getSettings', () => {
  beforeEach(() => mockChromeStorage());

  it('returns defaults when nothing is stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual({
      provider: null,
      model: null,
      apiKeys: { anthropic: '', openai: '', gemini: '' },
      openrouterToken: '',
      braveSearchKey: '',
      resultsCount: 8,
    });
  });

  it('merges stored settings over defaults', async () => {
    mockChromeStorage({ settings: { provider: 'anthropic', resultsCount: 5 } });
    const settings = await getSettings();
    expect(settings.provider).toBe('anthropic');
    expect(settings.resultsCount).toBe(5);
    expect(settings.braveSearchKey).toBe('');
  });
});

describe('saveSettings', () => {
  it('persists settings under the settings key', async () => {
    mockChromeStorage();
    await saveSettings({ provider: 'openai' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: { provider: 'openai' },
    });
  });
});

describe('history', () => {
  beforeEach(() => mockChromeStorage());

  it('returns an empty array when no history exists', async () => {
    expect(await getHistory()).toEqual([]);
  });

  it('adds an entry to the front of history', async () => {
    const entry1 = { id: '1', timestamp: 1, sourcePage: { title: 'A', url: 'a.com' }, results: [] };
    const entry2 = { id: '2', timestamp: 2, sourcePage: { title: 'B', url: 'b.com' }, results: [] };
    await addHistoryEntry(entry1);
    const updated = await addHistoryEntry(entry2);
    expect(updated).toEqual([entry2, entry1]);
  });

  it('caps history at 50 entries, evicting the oldest', async () => {
    for (let i = 0; i < 50; i++) {
      await addHistoryEntry({ id: String(i), timestamp: i, sourcePage: { title: 't', url: 'u' }, results: [] });
    }
    const overflow = { id: '50', timestamp: 50, sourcePage: { title: 't', url: 'u' }, results: [] };
    const updated = await addHistoryEntry(overflow);
    expect(updated).toHaveLength(50);
    expect(updated[0].id).toBe('50');
    expect(updated.find((e) => e.id === '0')).toBeUndefined();
  });
});

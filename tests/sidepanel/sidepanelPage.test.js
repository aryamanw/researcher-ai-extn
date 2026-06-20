import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  getHistory: vi.fn(),
  addHistoryEntry: vi.fn(),
}));
vi.mock('../../src/lib/pipeline.js', () => ({ runPipeline: vi.fn() }));
vi.mock('../../src/lib/llm/index.js', () => ({ getCompletion: vi.fn() }));
vi.mock('../../src/lib/search/brave.js', () => ({ search: vi.fn() }));

import { getSettings, addHistoryEntry } from '../../src/lib/storage.js';
import { runPipeline } from '../../src/lib/pipeline.js';
import {
  renderLoading,
  renderSetupPrompt,
  renderNoContent,
  renderNoResults,
  renderError,
  renderResults,
  renderHistoryList,
  requestExtraction,
  analyzeActiveTab,
} from '../../sidepanel/sidepanelPage.js';

describe('render functions', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renderLoading shows the given status text', () => {
    renderLoading(container, 'Reading page...');
    expect(container.textContent).toContain('Reading page...');
  });

  it('renderSetupPrompt links to settings', () => {
    renderSetupPrompt(container);
    expect(container.querySelector('#open-settings')).not.toBeNull();
  });

  it('renderNoContent shows the no-content message', () => {
    renderNoContent(container);
    expect(container.textContent).toContain("Couldn't find readable content");
  });

  it('renderNoResults shows the no-results message', () => {
    renderNoResults(container);
    expect(container.textContent).toContain('No similar results found');
  });

  it('renderError shows the message and wires a retry button', () => {
    const onRetry = vi.fn();
    renderError(container, 'Something broke', onRetry);
    container.querySelector('#retry-button').click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renderResults renders each result with title, snippet, and relevance', () => {
    renderResults(container, [
      { title: 'A', url: 'https://a.com', snippet: 'snip', relevance: 'because reasons' },
    ]);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('snip');
    expect(container.textContent).toContain('because reasons');
    expect(container.querySelector('a').href).toBe('https://a.com/');
  });

  it('renderResults does not execute scripts from malicious titles', () => {
    delete window.__pwned;
    renderResults(container, [
      {
        title: '<img src=x onerror="window.__pwned = true">',
        url: 'https://a.com',
        snippet: 'snip',
        relevance: 'rel',
      },
    ]);
    expect(window.__pwned).toBeFalsy();
    expect(container.textContent).toContain('<img src=x onerror="window.__pwned = true">');
    expect(container.querySelector('img')).toBeNull();
    delete window.__pwned;
  });

  it('renderHistoryList renders entries and wires click selection', () => {
    const onSelect = vi.fn();
    renderHistoryList(
      container,
      [{ id: '1', sourcePage: { title: 'Past page', url: 'https://past.com' } }],
      onSelect
    );
    container.querySelector('li').click();
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});

describe('requestExtraction', () => {
  it('resolves with the EXTRACTION_RESULT payload after injecting the content script', async () => {
    const listeners = [];
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: (fn) => listeners.push(fn),
          removeListener: (fn) => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          },
        },
      },
      scripting: {
        executeScript: vi.fn().mockImplementation(async () => {
          listeners[0]({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'X', confidence: 'high' } });
          return [];
        }),
      },
    };

    const result = await requestExtraction(7);

    expect(result).toEqual({ title: 'T', url: 'U', text: 'X', confidence: 'high' });
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ['dist/content.bundled.js'],
    });
  });
});

describe('analyzeActiveTab', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: { onMessage: { addListener: vi.fn(), removeListener: vi.fn() } },
      scripting: { executeScript: vi.fn() },
    };
  });

  it('returns not-configured when no provider/search key is set', async () => {
    getSettings.mockResolvedValue({ provider: null, braveSearchKey: '' });

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'not-configured' });
  });

  it('renders no-content when extraction confidence is low', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k' });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: '', confidence: 'low' } });
    });
    const renderNoContentFn = vi.fn();

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn,
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'no-content' });
    expect(renderNoContentFn).toHaveBeenCalledTimes(1);
  });

  it('runs the pipeline, renders results, and saves history on success', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } });
    });
    const results = [{ title: 'R', url: 'https://r.com', snippet: 's', relevance: 'rel' }];
    runPipeline.mockResolvedValue(results);
    const renderResultsFn = vi.fn();

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn,
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'success', results });
    expect(renderResultsFn).toHaveBeenCalledWith(results);
    expect(addHistoryEntry).toHaveBeenCalledTimes(1);
    expect(addHistoryEntry.mock.calls[0][0].sourcePage).toEqual({ title: 'T', url: 'U' });
  });

  it('renders no-results when the pipeline returns an empty array', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } });
    });
    runPipeline.mockResolvedValue([]);
    const renderNoResultsFn = vi.fn();

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn: vi.fn(),
      renderNoResultsFn,
    });

    expect(outcome).toEqual({ status: 'no-results' });
    expect(renderNoResultsFn).toHaveBeenCalledTimes(1);
  });
});

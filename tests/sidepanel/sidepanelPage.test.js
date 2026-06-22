import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/storage.js', () => ({
  getSettings: vi.fn(),
  getHistory: vi.fn(),
  addHistoryEntry: vi.fn(),
}));
vi.mock('../../src/lib/pipeline.js', () => ({ runPipeline: vi.fn() }));
vi.mock('../../src/lib/llm/index.js', () => ({ getCompletion: vi.fn() }));
vi.mock('../../src/lib/search/brave.js', () => ({ search: vi.fn() }));
vi.mock('../../src/lib/search/duckduckgo.js', () => ({ search: vi.fn() }));

import { getSettings, addHistoryEntry } from '../../src/lib/storage.js';
import { runPipeline } from '../../src/lib/pipeline.js';
import {
  renderLoading,
  renderSetupPrompt,
  renderNoContent,
  renderNoResults,
  renderCancelled,
  renderError,
  renderResults,
  renderHistoryList,
  requestExtraction,
  analyzeActiveTab,
  toFriendlyErrorMessage,
  countConfiguredProviders,
} from '../../sidepanel/sidepanelPage.js';

describe('toFriendlyErrorMessage', () => {
  it('maps a missing provider/key configuration error to setup guidance', () => {
    expect(toFriendlyErrorMessage(new Error('No provider configured: anthropic')))
      .toBe('Finish setting up your provider and API key in Settings.');
    expect(toFriendlyErrorMessage(new Error('No API key/token configured for provider: openai')))
      .toBe('Finish setting up your provider and API key in Settings.');
  });

  it('maps 401/403 provider errors to a key-rejected message', () => {
    expect(toFriendlyErrorMessage(new Error('Anthropic API error: 401')))
      .toBe('Your API key was rejected. Check it in Settings.');
    expect(toFriendlyErrorMessage(new Error('OpenAI API error: 403')))
      .toBe('Your API key was rejected. Check it in Settings.');
  });

  it('maps a 429 provider error to a rate-limit message', () => {
    expect(toFriendlyErrorMessage(new Error('Brave Search API error: 429')))
      .toBe('Rate limited by the provider. Try again in a moment.');
  });

  it('maps a 5xx provider error to a transient-trouble message', () => {
    expect(toFriendlyErrorMessage(new Error('Gemini API error: 503')))
      .toBe('The provider is having trouble right now. Try again shortly.');
  });

  it('passes through messages it does not recognize, like the extraction timeout', () => {
    const message = "Didn't hear back from the page in time. Try again, or reload the tab if this keeps happening.";
    expect(toFriendlyErrorMessage(new Error(message))).toBe(message);
  });

  it('maps a restricted-page injection failure to a plain explanation', () => {
    expect(toFriendlyErrorMessage(new Error('Cannot access a chrome:// URL')))
      .toBe("Research Companion can't read this page. Browser pages and the Chrome Web Store are off-limits to extensions.");
    expect(toFriendlyErrorMessage(new Error('The extensions gallery cannot be scripted.')))
      .toBe("Research Companion can't read this page. Browser pages and the Chrome Web Store are off-limits to extensions.");
  });
});

describe('countConfiguredProviders', () => {
  it('counts zero when no provider has credentials', () => {
    expect(countConfiguredProviders({ apiKeys: {}, openrouterToken: '' })).toBe(0);
  });

  it('counts each provider with a non-empty credential', () => {
    expect(
      countConfiguredProviders({
        apiKeys: { anthropic: 'a-key', openai: '', gemini: 'g-key' },
        openrouterToken: 'or-token',
      })
    ).toBe(3);
  });
});

describe('render functions', () => {
  let container;
  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renderLoading shows the given status text', () => {
    renderLoading(container, 'Reading page...');
    expect(container.textContent).toContain('Reading page...');
  });

  it('renderLoading marks the container as busy and omits a cancel button when none is given', () => {
    renderLoading(container, 'Reading page...');
    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.cancel-button')).toBeNull();
  });

  it('renderLoading shows a cancel button that invokes the given callback', () => {
    const onCancel = vi.fn();
    renderLoading(container, 'Reading page...', onCancel);
    container.querySelector('.cancel-button').click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renderCancelled clears aria-busy and shows a cancelled message', () => {
    renderLoading(container, 'Reading page...', vi.fn());
    renderCancelled(container);
    expect(container.getAttribute('aria-busy')).toBeNull();
    expect(container.textContent).toContain('Search cancelled.');
  });

  it('renderSetupPrompt links to settings', () => {
    global.chrome = { runtime: { getURL: vi.fn((path) => path) } };
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

  it('renderError disables the retry button immediately on click, to ignore rapid double-clicks', () => {
    const onRetry = vi.fn();
    renderError(container, 'Something broke', onRetry);
    const button = container.querySelector('#retry-button');
    button.click();
    expect(button.disabled).toBe(true);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renderError does not execute scripts from malicious error messages', () => {
    delete window.__pwned;
    const onRetry = vi.fn();
    renderError(container, '<img src=x onerror="window.__pwned = true">', onRetry);
    container.querySelector('#retry-button').click();
    expect(window.__pwned).toBeFalsy();
    expect(container.textContent).toContain('<img src=x onerror="window.__pwned = true">');
    expect(container.querySelector('img')).toBeNull();
    delete window.__pwned;
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

  it('renderResults sets dir="auto" on title, snippet, and relevance so RTL page content displays correctly', () => {
    renderResults(container, [
      { title: 'مرحبا', url: 'https://a.com', snippet: 'snip', relevance: 'because reasons' },
    ]);
    expect(container.querySelector('a').dir).toBe('auto');
    expect(container.querySelector('.snippet').dir).toBe('auto');
    expect(container.querySelector('.relevance').dir).toBe('auto');
  });

  it('renderResults shows which provider answered only when asked to', () => {
    renderResults(container, [
      { title: 'A', url: 'https://a.com', snippet: 'snip', relevance: 'because reasons' },
    ], { provider: 'anthropic', showProvider: true });
    expect(container.querySelector('.active-provider').textContent).toBe('Using Anthropic');
  });

  it('renderResults omits the provider line when showProvider is false', () => {
    renderResults(container, [
      { title: 'A', url: 'https://a.com', snippet: 'snip', relevance: 'because reasons' },
    ], { provider: 'anthropic', showProvider: false });
    expect(container.querySelector('.active-provider')).toBeNull();
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

  it('renderHistoryList renders entries as keyboard-accessible buttons and wires click selection', () => {
    const onSelect = vi.fn();
    renderHistoryList(
      container,
      [{ id: '1', sourcePage: { title: 'Past page', url: 'https://past.com' } }],
      onSelect
    );
    const button = container.querySelector('li > button');
    expect(button).not.toBeNull();
    expect(button.type).toBe('button');
    expect(button.dir).toBe('auto');
    button.click();
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('renderHistoryList hides the given section element when there are no entries', () => {
    const sectionEl = document.createElement('section');
    renderHistoryList(container, [], vi.fn(), sectionEl);
    expect(sectionEl.classList.contains('is-hidden')).toBe(true);
  });

  it('renderHistoryList shows the given section element when there is at least one entry', () => {
    const sectionEl = document.createElement('section');
    sectionEl.classList.add('is-hidden');
    renderHistoryList(
      container,
      [{ id: '1', sourcePage: { title: 'Past page', url: 'https://past.com' } }],
      vi.fn(),
      sectionEl
    );
    expect(sectionEl.classList.contains('is-hidden')).toBe(false);
  });

  it('renderHistoryList does not throw when no section element is given', () => {
    expect(() => renderHistoryList(container, [], vi.fn())).not.toThrow();
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
          listeners[0]({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'X', confidence: 'high' } }, { tab: { id: 7 } });
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

  it('rejects with a recoverable error if no EXTRACTION_RESULT arrives before the timeout', async () => {
    vi.useFakeTimers();
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
        // Simulates a page refresh/navigation mid-extraction: the content
        // script injects but never posts EXTRACTION_RESULT back.
        executeScript: vi.fn().mockResolvedValue([]),
      },
    };

    const promise = requestExtraction(7, { timeoutMs: 1000 });
    const assertion = expect(promise).rejects.toThrow(/didn't hear back|reload the tab/i);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(listeners).toHaveLength(0);

    vi.useRealTimers();
  });

  it('rejects with an AbortError when the signal is aborted before it starts', async () => {
    global.chrome = {
      runtime: { onMessage: { addListener: vi.fn(), removeListener: vi.fn() } },
      scripting: { executeScript: vi.fn() },
    };
    const controller = new AbortController();
    controller.abort();

    await expect(requestExtraction(7, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('rejects with an AbortError when the signal aborts mid-flight, and cleans up the listener', async () => {
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
      scripting: { executeScript: vi.fn().mockResolvedValue([]) },
    };
    const controller = new AbortController();

    const promise = requestExtraction(7, { signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(listeners).toHaveLength(0);
  });

  it('rejects spoofed messages from wrong tabId', async () => {
    const listeners = [];
    global.chrome = {
      runtime: {
        onMessage: {
          addListener: (fn) => { listeners.push(fn); fn({ type: 'EXTRACTION_RESULT', payload: { text: 'spoofed' } }, { tab: { id: 999 } }); },
          removeListener: (fn) => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
          },
        },
      },
      scripting: {
        executeScript: vi.fn().mockImplementation(async () => {
          return [];
        }),
      },
    };

    const promise = requestExtraction(7);
    listeners[0]({ type: 'EXTRACTION_RESULT', payload: { text: 'real', title: 'T', url: 'U', confidence: 'high' } }, { tab: { id: 7 } });

    const result = await promise;
    expect(result).toEqual({ title: 'T', url: 'U', text: 'real', confidence: 'high' });
  });
});

describe('analyzeActiveTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('returns not-configured for brave when an llm provider is set but no brave key is set', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', searchProvider: 'brave', braveSearchKey: '' });

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'not-configured' });
  });

  it('does not require a brave key when duckduckgo is the selected search provider', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', searchProvider: 'duckduckgo', braveSearchKey: '', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } }, { tab: { id: 1 } });
    });
    const results = [{ title: 'R', url: 'https://r.com', snippet: 's', relevance: 'rel' }];
    runPipeline.mockResolvedValue(results);

    const outcome = await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn: vi.fn(),
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(outcome).toEqual({ status: 'success', results });
  });

  it('renders no-content when extraction confidence is low', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k' });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: '', confidence: 'low' } }, { tab: { id: 1 } });
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
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } }, { tab: { id: 1 } });
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
    expect(renderResultsFn).toHaveBeenCalledWith(results, { provider: 'anthropic', showProvider: false });
    expect(addHistoryEntry).toHaveBeenCalledTimes(1);
    expect(addHistoryEntry.mock.calls[0][0].sourcePage).toEqual({ title: 'T', url: 'U' });
    expect(addHistoryEntry.mock.calls[0][0].provider).toBe('anthropic');
  });

  it('shows the active provider in renderResultsFn only when more than one provider is configured', async () => {
    getSettings.mockResolvedValue({
      provider: 'anthropic',
      apiKeys: { anthropic: 'a-key', openai: '', gemini: '' },
      openrouterToken: 'or-token',
      braveSearchKey: 'k',
      resultsCount: 8,
    });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } }, { tab: { id: 1 } });
    });
    const results = [{ title: 'R', url: 'https://r.com', snippet: 's', relevance: 'rel' }];
    runPipeline.mockResolvedValue(results);
    const renderResultsFn = vi.fn();

    await analyzeActiveTab({
      tabId: 1,
      renderStatus: vi.fn(),
      renderResultsFn,
      renderNoContentFn: vi.fn(),
      renderNoResultsFn: vi.fn(),
    });

    expect(renderResultsFn).toHaveBeenCalledWith(results, { provider: 'anthropic', showProvider: true });
  });

  it('rejects with an AbortError and skips rendering/history when cancelled before results land', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } }, { tab: { id: 1 } });
    });
    const controller = new AbortController();
    runPipeline.mockImplementation(async () => {
      controller.abort();
      return [{ title: 'R', url: 'https://r.com', snippet: 's', relevance: 'rel' }];
    });
    const renderResultsFn = vi.fn();

    await expect(
      analyzeActiveTab({
        tabId: 1,
        renderStatus: vi.fn(),
        renderResultsFn,
        renderNoContentFn: vi.fn(),
        renderNoResultsFn: vi.fn(),
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(renderResultsFn).not.toHaveBeenCalled();
    expect(addHistoryEntry).not.toHaveBeenCalled();
  });

  it('renders no-results when the pipeline returns an empty array', async () => {
    getSettings.mockResolvedValue({ provider: 'anthropic', braveSearchKey: 'k', resultsCount: 8 });
    chrome.scripting.executeScript.mockImplementation(async () => []);
    chrome.runtime.onMessage.addListener.mockImplementation((fn) => {
      fn({ type: 'EXTRACTION_RESULT', payload: { title: 'T', url: 'U', text: 'long enough text', confidence: 'high' } }, { tab: { id: 1 } });
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

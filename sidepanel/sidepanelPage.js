import { getSettings, addHistoryEntry } from '../src/lib/storage.js';
import { runPipeline } from '../src/lib/pipeline.js';
import { getCompletion } from '../src/lib/llm/index.js';
import { search as braveSearch } from '../src/lib/search/brave.js';

export function renderLoading(container, statusText) {
  container.innerHTML = `<p class="status">${statusText}</p>`;
}

export function renderSetupPrompt(container) {
  container.innerHTML =
    '<p class="setup-prompt">Set up a provider and Brave Search key in <a href="/options/options.html" id="open-settings">Settings</a> to get started.</p>';
}

export function renderNoContent(container) {
  container.innerHTML = '<p class="status">Couldn\'t find readable content on this page.</p>';
}

export function renderNoResults(container) {
  container.innerHTML = '<p class="status">No similar results found.</p>';
}

export function renderError(container, message, onRetry) {
  container.innerHTML = `<p class="error">${message}</p><button id="retry-button">Retry</button>`;
  container.querySelector('#retry-button').addEventListener('click', onRetry);
}

export function renderResults(container, results) {
  container.innerHTML = results
    .map(
      (r) => `
      <article class="result">
        <a href="${r.url}" target="_blank" rel="noopener">${r.title}</a>
        <p class="snippet">${r.snippet}</p>
        <p class="relevance">${r.relevance}</p>
      </article>`
    )
    .join('');
}

export function renderHistoryList(container, entries, onSelect) {
  container.innerHTML = entries.map((entry) => `<li data-id="${entry.id}">${entry.sourcePage.title}</li>`).join('');
  container.querySelectorAll('li').forEach((li) => {
    li.addEventListener('click', () => onSelect(li.dataset.id));
  });
}

export function requestExtraction(tabId) {
  return new Promise((resolve, reject) => {
    const listener = (message) => {
      if (message.type === 'EXTRACTION_RESULT') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    chrome.scripting.executeScript({ target: { tabId }, files: ['dist/content.bundled.js'] }).catch((error) => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(error);
    });
  });
}

export async function analyzeActiveTab({ tabId, renderStatus, renderResultsFn, renderNoContentFn, renderNoResultsFn }) {
  const settings = await getSettings();
  if (!settings.provider || !settings.braveSearchKey) {
    return { status: 'not-configured' };
  }

  renderStatus('Reading page...');
  const extraction = await requestExtraction(tabId);
  if (extraction.confidence === 'low') {
    renderNoContentFn();
    return { status: 'no-content' };
  }

  renderStatus('Searching...');
  const llmClient = { complete: (prompt) => getCompletion(settings, prompt) };
  const searchClient = { search: (query) => braveSearch({ apiKey: settings.braveSearchKey, query }) };

  renderStatus('Ranking results...');
  const results = await runPipeline({
    pageTitle: extraction.title,
    pageUrl: extraction.url,
    articleText: extraction.text,
    llmClient,
    searchClient,
    resultsCount: settings.resultsCount,
  });

  if (results.length === 0) {
    renderNoResultsFn();
    return { status: 'no-results' };
  }

  renderResultsFn(results);
  await addHistoryEntry({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    sourcePage: { title: extraction.title, url: extraction.url },
    results,
  });

  return { status: 'success', results };
}

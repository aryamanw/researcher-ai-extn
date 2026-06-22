import {
  analyzeActiveTab,
  renderLoading,
  renderSetupPrompt,
  renderResults,
  renderNoContent,
  renderNoResults,
  renderCancelled,
  renderError,
  renderHistoryList,
  toFriendlyErrorMessage,
  countConfiguredProviders,
} from './sidepanelPage.js';
import { getHistory, getSettings } from '../src/lib/storage.js';

const resultsContainer = document.getElementById('results');
const historyContainer = document.getElementById('history-list');
const historySection = document.querySelector('.history');

let isRunning = false;

async function run() {
  if (isRunning) return;
  isRunning = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const controller = new AbortController();

    try {
      const outcome = await analyzeActiveTab({
        tabId: tab.id,
        renderStatus: (text) => renderLoading(resultsContainer, text, () => controller.abort()),
        renderResultsFn: (results, options) => renderResults(resultsContainer, results, options),
        renderNoContentFn: () => renderNoContent(resultsContainer),
        renderNoResultsFn: () => renderNoResults(resultsContainer),
        signal: controller.signal,
      });
      if (outcome.status === 'not-configured') {
        renderSetupPrompt(resultsContainer);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        renderCancelled(resultsContainer);
      } else {
        renderError(resultsContainer, toFriendlyErrorMessage(error), run);
      }
    }

    const history = await getHistory();
    renderHistoryList(historyContainer, history, async (id) => {
      const entry = history.find((h) => h.id === id);
      if (!entry) return;
      const settings = await getSettings();
      const showProvider = countConfiguredProviders(settings) > 1;
      renderResults(resultsContainer, entry.results, { provider: entry.provider, showProvider });
    }, historySection);
  } finally {
    isRunning = false;
  }
}

run();

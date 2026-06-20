import {
  analyzeActiveTab,
  renderLoading,
  renderSetupPrompt,
  renderResults,
  renderNoContent,
  renderNoResults,
  renderError,
  renderHistoryList,
} from './sidepanelPage.js';
import { getHistory } from '../src/lib/storage.js';

const resultsContainer = document.getElementById('results');
const historyContainer = document.getElementById('history-list');

async function run() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const outcome = await analyzeActiveTab({
      tabId: tab.id,
      renderStatus: (text) => renderLoading(resultsContainer, text),
      renderResultsFn: (results) => renderResults(resultsContainer, results),
      renderNoContentFn: () => renderNoContent(resultsContainer),
      renderNoResultsFn: () => renderNoResults(resultsContainer),
    });
    if (outcome.status === 'not-configured') {
      renderSetupPrompt(resultsContainer);
    }
  } catch (error) {
    renderError(resultsContainer, error.message, run);
  }

  const history = await getHistory();
  renderHistoryList(historyContainer, history, (id) => {
    const entry = history.find((h) => h.id === id);
    if (entry) renderResults(resultsContainer, entry.results);
  });
}

run();

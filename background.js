import { connectOpenRouter } from './src/lib/oauth/openrouterOAuth.js';
import { saveSettings, getSettings } from './src/lib/storage.js';

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

function launchWebAuthFlow(options) {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(options, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error(chrome.runtime.lastError?.message || 'Auth flow cancelled'));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'CONNECT_OPENROUTER') return false;
  if (sender.id !== chrome.runtime.id) return false;

  connectOpenRouter(launchWebAuthFlow)
    .then(async (key) => {
      const settings = await getSettings();
      await saveSettings({ ...settings, openrouterToken: key });
      sendResponse({ ok: true });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'run-search') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await chrome.sidePanel.open({ tabId: tab.id });
  chrome.runtime.sendMessage({ type: 'RUN_SEARCH' });
});

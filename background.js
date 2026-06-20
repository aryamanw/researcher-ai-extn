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

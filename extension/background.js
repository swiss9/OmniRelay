if (typeof browser === 'undefined') {
  var browser = chrome;
}

const DEFAULT_BACKEND_URL = 'https://omni-relay.vercel.app';

// Auto‑configure default backend URL on install
browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(['backendUrl'], (data) => {
    if (!data.backendUrl) {
      browser.storage.local.set({ backendUrl: DEFAULT_BACKEND_URL });
    }
  });
  // Create context menu
  browser.contextMenus.create({
    id: 'sendSelection',
    title: 'Send to OmniRelay',
    contexts: ['selection']
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  // ... rest of existing background.js (unchanged) ...
});

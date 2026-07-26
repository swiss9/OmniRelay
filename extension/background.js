// Context menu: send selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sendSelection',
    title: 'Send to OmniRelay',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'sendSelection' && info.selectionText) {
    chrome.storage.local.get(['backendUrl', 'telegramChatId', 'discordWebhook'], (config) => {
      if (!config.backendUrl) return;
      const targets = [];
      if (config.telegramChatId) targets.push(`telegram:${config.telegramChatId}`);
      if (config.discordWebhook) targets.push(`discord:${config.discordWebhook}`);
      sendToRelay(config.backendUrl, {
        text: info.selectionText,
        url: tab.url,
        targets,
        license: '', // will be filled from storage in popup; context menu uses saved license
        clientId: ''  // handled on popup side, but we'll skip for simplicity, so context menu free only
      });
    });
  }
});

async function sendToRelay(backendUrl, payload) {
  // Retrieve license from storage
  const { license } = await chrome.storage.local.get('license');
  payload.license = license || '';
  // Generate/retrieve clientId
  let { clientId } = await chrome.storage.local.get('clientId');
  if (!clientId) {
    clientId = crypto.randomUUID();
    await chrome.storage.local.set({ clientId });
  }
  payload.clientId = clientId;
  try {
    const res = await fetch(`${backendUrl}/api/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      showNotification('OmniRelay: ' + (err.error || 'Send failed'));
    }
  } catch (e) {
    showNotification('OmniRelay: Network error');
  }
}

function showNotification(msg) {
  chrome.notifications?.create({ type: 'basic', iconUrl: 'icon.png', title: 'OmniRelay', message: msg });
                                          }

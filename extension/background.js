if (typeof browser === 'undefined') {
  var browser = chrome;
}

const DEFAULT_BACKEND_URL = 'https://omni-relay.vercel.app';

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.get(['backendUrl'], (data) => {
    if (!data.backendUrl) {
      browser.storage.local.set({ backendUrl: DEFAULT_BACKEND_URL });
    }
  });
  browser.contextMenus.create({
    id: 'sendSelection',
    title: 'Send to OmniRelay',
    contexts: ['selection']
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'sendSelection' && info.selectionText) {
    const config = await browser.storage.local.get(['backendUrl', 'telegramChatId', 'discordWebhook', 'license']);
    const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;
    if (!config.telegramChatId && !config.discordWebhook) return;

    const targets = [];
    if (config.telegramChatId) targets.push(`telegram:${config.telegramChatId}`);
    if (config.discordWebhook) targets.push(`discord:${config.discordWebhook}`);
    if (targets.length === 0) return;

    const payload = {
      text: info.selectionText,
      url: tab.url,
      targets,
      license: (config.license || '').trim(),
      clientId: await getClientId()
    };

    try {
      const res = await fetch(`${backendUrl}/api/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'OmniRelay',
          message: 'Error: ' + (data.error || 'Send failed')
        });
      } else {
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'OmniRelay',
          message: `Sent to ${data.sent.telegram + data.sent.discord} targets.`
        });
      }
    } catch (e) {
      browser.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'OmniRelay',
        message: 'Network error.'
      });
    }
  }
});

async function getClientId() {
  let { clientId } = await browser.storage.local.get('clientId');
  if (!clientId) {
    clientId = crypto.randomUUID();
    await browser.storage.local.set({ clientId });
  }
  return clientId;
}

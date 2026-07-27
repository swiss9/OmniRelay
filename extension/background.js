// Polyfill for Chrome compatibility (no-op in Firefox, but won't hurt)
if (typeof browser === 'undefined') {
  var browser = chrome;
}

// Context menu: send selected text
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'sendSelection',
    title: 'Send to OmniRelay',
    contexts: ['selection']
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'sendSelection' && info.selectionText) {
    const config = await browser.storage.local.get(['backendUrl', 'telegramChatId', 'discordWebhook', 'license']);
    if (!config.backendUrl) return;

    const targets = [];
    if (config.telegramChatId) targets.push(`telegram:${config.telegramChatId}`);
    if (config.discordWebhook) targets.push(`discord:${config.discordWebhook}`);

    if (targets.length === 0) return;

    const payload = {
      text: info.selectionText,
      url: tab.url,
      targets,
      license: config.license || '',
      clientId: await getClientId()
    };

    try {
      const res = await fetch(`${config.backendUrl}/api/relay`, {
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

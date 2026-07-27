if (typeof browser === 'undefined') {
  var browser = chrome;
}

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    document.getElementById('pageInfo').textContent = `Page: ${tab.title.substring(0, 60)}`;
    document.getElementById('text').value = tab.title + '\n' + tab.url;
  }

  const config = await browser.storage.local.get(['telegramChatId', 'discordWebhook', 'license', 'backendUrl']);
  if (!config.backendUrl) {
    document.getElementById('result').textContent = 'Please set backend URL in Options.';
    return;
  }

  const targetsContainer = document.getElementById('targetsCheckboxes');
  const targets = [];
  if (config.telegramChatId) {
    targets.push({ id: `telegram:${config.telegramChatId}`, label: 'Telegram' });
  }
  if (config.discordWebhook) {
    targets.push({ id: `discord:${config.discordWebhook}`, label: 'Discord' });
  }
  if (targets.length === 0) {
    document.getElementById('result').textContent = 'No targets configured. Go to Options.';
    return;
  }

  document.getElementById('targetsSection').style.display = 'block';
  targets.forEach(t => {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.value = t.id;
    cb.id = t.id;
    const label = document.createElement('label');
    label.htmlFor = t.id;
    label.textContent = t.label;
    targetsContainer.appendChild(cb);
    targetsContainer.appendChild(label);
    targetsContainer.appendChild(document.createElement('br'));
  });

  document.getElementById('sendBtn').addEventListener('click', async () => {
    const text = document.getElementById('text').value;
    const selectedTargets = Array.from(document.querySelectorAll('#targetsCheckboxes input:checked')).map(cb => cb.value);
    if (selectedTargets.length === 0) return alert('Select at least one target');
    if (!text && !tab?.url) return alert('No message');

    const payload = {
      text,
      url: tab.url,
      targets: selectedTargets,
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
      if (data.success) {
        document.getElementById('result').textContent = `Sent to ${data.sent.telegram + data.sent.discord} targets.`;
      } else {
        document.getElementById('result').textContent = 'Error: ' + data.error;
      }
    } catch (e) {
      document.getElementById('result').textContent = 'Network error.';
    }
  });
});

async function getClientId() {
  let { clientId } = await browser.storage.local.get('clientId');
  if (!clientId) {
    clientId = crypto.randomUUID();
    await browser.storage.local.set({ clientId });
  }
  return clientId;
                  }

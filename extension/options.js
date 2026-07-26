document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['backendUrl', 'telegramChatId', 'discordWebhook', 'license'], (data) => {
    document.getElementById('backendUrl').value = data.backendUrl || '';
    document.getElementById('telegramChatId').value = data.telegramChatId || '';
    document.getElementById('discordWebhook').value = data.discordWebhook || '';
    document.getElementById('license').value = data.license || '';
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    chrome.storage.local.set({
      backendUrl: document.getElementById('backendUrl').value.trim(),
      telegramChatId: document.getElementById('telegramChatId').value.trim(),
      discordWebhook: document.getElementById('discordWebhook').value.trim(),
      license: document.getElementById('license').value.trim()
    }, () => {
      document.getElementById('saveStatus').textContent = 'Saved.';
      setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 2000);
    });
  });

  document.getElementById('checkLicenseBtn').addEventListener('click', async () => {
    const backendUrl = document.getElementById('backendUrl').value.trim();
    const license = document.getElementById('license').value.trim();
    const res = await fetch(`${backendUrl}/api/check-license`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ license })
    });
    const data = await res.json();
    document.getElementById('licenseStatus').textContent = data.valid ? '✅ Valid Pro license' : '❌ Invalid or Free tier';
  });
});

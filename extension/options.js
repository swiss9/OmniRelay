if (typeof browser === 'undefined') {
  var browser = chrome;
}

// Default backend URL – automatically used if the user hasn't set a custom one
const DEFAULT_BACKEND_URL = 'https://omni-relay.vercel.app';

document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings, falling back to the default backend URL
  browser.storage.local.get(['backendUrl', 'telegramChatId', 'discordWebhook', 'license'], (data) => {
    document.getElementById('telegramChatId').value = data.telegramChatId || '';
    document.getElementById('discordWebhook').value = data.discordWebhook || '';
    document.getElementById('license').value = data.license || '';

    // If user has previously saved a custom URL, show it in the advanced field
    if (data.backendUrl && data.backendUrl !== DEFAULT_BACKEND_URL) {
      document.getElementById('backendUrl').value = data.backendUrl;
      document.getElementById('advancedSection').style.display = 'block';
    }
  });

  // Toggle advanced section
  document.getElementById('advancedToggle').addEventListener('click', () => {
    const section = document.getElementById('advancedSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  });

  // Save button
  document.getElementById('saveBtn').addEventListener('click', () => {
    const customUrl = document.getElementById('backendUrl').value.trim();
    // Use custom URL if provided and different from default; otherwise store default
    const backendUrl = (customUrl && customUrl !== DEFAULT_BACKEND_URL) ? customUrl : DEFAULT_BACKEND_URL;

    browser.storage.local.set({
      backendUrl,
      telegramChatId: document.getElementById('telegramChatId').value.trim(),
      discordWebhook: document.getElementById('discordWebhook').value.trim(),
      license: document.getElementById('license').value.trim()
    }, () => {
      document.getElementById('saveStatus').textContent = 'Saved.';
      setTimeout(() => { document.getElementById('saveStatus').textContent = ''; }, 2000);
    });
  });

  // Validate license button
  document.getElementById('checkLicenseBtn').addEventListener('click', async () => {
    const backendUrl = document.getElementById('backendUrl').value.trim() || DEFAULT_BACKEND_URL;
    const license = document.getElementById('license').value.trim();
    if (!backendUrl) {
      document.getElementById('licenseStatus').textContent = 'Set backend URL first.';
      return;
    }
    const res = await fetch(`${backendUrl}/api/check-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license })
    });
    const data = await res.json();
    document.getElementById('licenseStatus').textContent = data.valid ? '✅ Valid Pro license' : '❌ Invalid or Free tier';
  });
});

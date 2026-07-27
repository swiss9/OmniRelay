require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const db = require('./db');
const { validateLicense, trackFreeTarget, canAddTarget } = require('./license');
const payment = require('./payment');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ─── Landing Page ───
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniRelay - Cross-Platform Dispatcher</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 2rem; text-align: center; background: #f9fafb; color: #1f2937; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .tagline { color: #4b5563; margin-bottom: 2rem; }
    .btn { display: inline-block; padding: 0.75rem 2rem; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
    .btn:hover { background: #1d4ed8; }
    .footer { margin-top: 3rem; font-size: 0.9rem; color: #9ca3af; }
  </style>
</head>
<body>
  <h1>⚡ OmniRelay</h1>
  <p class="tagline">Send web content to Telegram & Discord in one click.</p>
  <a class="btn" href="/pay">Upgrade to Pro ($49)</a>
  <p style="margin-top: 2rem; color: #6b7280;">Already have a license? Just configure the browser extension.</p>
  <div class="footer">
    Made for community managers, news curators, and creators. <br>Payments in USDT (ETH, BSC, Polygon, Tron).
  </div>
</body>
</html>`);
});

// ─── Payment Page ───
app.get('/pay', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniRelay Pro - Upgrade</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; padding: 2rem; background: #f9fafb; color: #1f2937; }
    h1 { color: #111827; }
    .section { background: white; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    select, button, input { width: 100%; padding: 0.75rem; margin: 0.5rem 0; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
    button { background: #2563eb; color: white; font-weight: bold; cursor: pointer; border: none; }
    button:hover { background: #1d4ed8; }
    .address { word-break: break-all; background: #f3f4f6; padding: 1rem; border-radius: 8px; font-family: monospace; }
    .note { color: #6b7280; font-size: 0.9rem; }
    #result { margin-top: 1rem; padding: 1rem; border-radius: 8px; display: none; }
    .success { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <h1>🔓 Upgrade to OmniRelay Pro</h1>
  <div class="section">
    <h2>Lifetime Access — $49</h2>
    <label>Select payment network:</label>
    <select id="network">
      <option value="ethereum">Ethereum (ERC-20)</option>
      <option value="bsc">BSC (BEP-20)</option>
      <option value="polygon">Polygon (ERC-20)</option>
      <option value="tron">Tron (TRC-20)</option>
    </select>
    <div id="paymentDetails" style="display:none;">
      <p><strong>Send exactly 49 USDT to:</strong></p>
      <div class="address" id="walletAddress"></div>
      <p class="note">USDT Contract: <span id="contract"></span></p>
      <p class="note">After sending, paste the transaction hash below.</p>
      <input type="text" id="txHash" placeholder="Transaction hash (TXID)">
      <button id="verifyBtn">Verify Payment & Get License Key</button>
    </div>
  </div>
  <div id="result"></div>

  <script>
    const BACKEND = window.location.origin;
    fetch(BACKEND + '/api/payment/info')
      .then(r => r.json())
      .then(data => {
        window.networks = data;
        document.getElementById('network').addEventListener('change', updateUI);
        updateUI();
      });

    function updateUI() {
      const net = document.getElementById('network').value;
      const info = window.networks[net];
      if (!info) return;
      document.getElementById('paymentDetails').style.display = 'block';
      document.getElementById('walletAddress').textContent = info.address;
      document.getElementById('contract').textContent = info.usdtContract;
    }

    document.getElementById('verifyBtn').addEventListener('click', async () => {
      const network = document.getElementById('network').value;
      const txHash = document.getElementById('txHash').value.trim();
      if (!txHash) return alert('Enter transaction hash');
      const res = await fetch(BACKEND + '/api/payment/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ network, txHash })
      });
      const data = await res.json();
      const resultDiv = document.getElementById('result');
      resultDiv.style.display = 'block';
      if (data.success) {
        resultDiv.className = 'success';
        resultDiv.innerHTML = '✅ Payment verified! Your license key: <strong>' + data.licenseKey + '</strong><br>Copy it and paste into the extension Options page.';
      } else {
        resultDiv.className = 'error';
        resultDiv.textContent = '❌ ' + (data.error || 'Verification failed');
      }
    });
  </script>
</body>
</html>`);
});

// Temporary test page (remove after successful test)
app.get('/test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OmniRelay Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; padding: 1rem; }
    input, textarea { width: 100%; margin: 0.5rem 0; padding: 0.6rem; box-sizing: border-box; }
    button { background: #2563eb; color: white; padding: 0.8rem; border: none; border-radius: 6px; width: 100%; }
    #result { margin-top: 1rem; white-space: pre-wrap; background: #f3f4f6; padding: 0.8rem; border-radius: 6px; }
  </style>
</head>
<body>
  <h2>Test OmniRelay</h2>
  <form id="testForm">
    <input id="tg" placeholder="Telegram Chat ID (e.g. -1001234567890)" required>
    <input id="dc" placeholder="Discord Webhook URL" required>
    <textarea id="msg" rows="3" placeholder="Message (optional)"></textarea>
    <button type="submit">Send to Both</button>
  </form>
  <div id="result"></div>

  <script>
    document.getElementById('testForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tg = document.getElementById('tg').value.trim();
      const dc = document.getElementById('dc').value.trim();
      const msg = document.getElementById('msg').value.trim() || 'Test from OmniRelay';
      const targets = [];
      if (tg) targets.push('telegram:' + tg);
      if (dc) targets.push('discord:' + dc);

      const resultDiv = document.getElementById('result');
      resultDiv.textContent = 'Sending...';

      try {
        const res = await fetch('/api/relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: msg,
            url: 'https://example.com',
            targets,
            license: '',
            clientId: 'mobile-test-' + Date.now()
          })
        });
        const data = await res.json();
        if (data.success) {
          resultDiv.textContent = '✅ Success!\\n' + JSON.stringify(data, null, 2);
        } else {
          resultDiv.textContent = '❌ Error:\\n' + JSON.stringify(data, null, 2);
        }
      } catch (err) {
        resultDiv.textContent = 'Network error: ' + err.message;
      }
    });
  </script>
</body>
</html>`);
});
// ─── Relay Endpoint ───
app.post('/api/relay', async (req, res) => {
  const { text, url, image, targets, license, clientId } = req.body;
  if (!text && !url && !image) return res.status(400).json({ error: 'No content' });
  if (!targets || !Array.isArray(targets)) return res.status(400).json({ error: 'Targets required' });

  let isPro = false;
  if (license) {
    isPro = await validateLicense(license);
    if (!isPro) return res.status(403).json({ error: 'Invalid license' });
  }

  if (!isPro) {
    if (!clientId) return res.status(400).json({ error: 'Client ID required for free tier' });
    const telegramTargets = targets.filter(t => t.startsWith('telegram:'));
    const discordTargets = targets.filter(t => t.startsWith('discord:'));
    if (telegramTargets.length > 1 || discordTargets.length > 1)
      return res.status(402).json({ error: 'Free tier allows only 1 Telegram and 1 Discord target. Upgrade to Pro.' });

    if (!(await canAddTarget(clientId, targets)))
      return res.status(402).json({ error: 'Free tier limited to 1 Telegram + 1 Discord. Remove a target first.' });

    await trackFreeTarget(clientId, targets);
  }

  const watermark = isPro ? '' : '\n\n⚡ Sent via OmniRelay';
  const sentCount = { telegram: 0, discord: 0 };

  for (const target of targets) {
    try {
      if (target.startsWith('telegram:')) {
        const chatId = target.slice(9);
        const msgText = text + (url ? `\n\n🔗 ${url}` : '') + watermark;
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          chat_id: chatId,
          text: msgText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          reply_markup: url ? { inline_keyboard: [[{ text: 'Open Link', url }]] } : undefined
        });
        sentCount.telegram++;
      } else if (target.startsWith('discord:')) {
        const webhookUrl = target.slice(8);
        await axios.post(webhookUrl, {
          embeds: [{
            title: text,
            url: url || undefined,
            image: image ? { url: image } : undefined,
            footer: watermark ? { text: watermark.trim() } : undefined,
            color: 0x00AE86
          }]
        });
        sentCount.discord++;
      }
    } catch (e) {
      console.error('Send error:', e.response?.data || e.message);
    }
  }

  res.json({ success: true, sent: sentCount });
});

// ─── License Check ───
app.post('/api/check-license', async (req, res) => {
  const { license } = req.body;
  const valid = await validateLicense(license);
  res.json({ valid });
});

// ─── Payment Routes ───
app.use('/api/payment', payment);

// ─── Admin Key Generation ───
app.post('/api/admin/generate-key', async (req, res) => {
  const { adminSecret } = req.body;
  if (adminSecret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
  const key = 'OMNI-' + uuidv4().slice(0, 8).toUpperCase();
  await db.execute({
    sql: 'INSERT INTO licenses (key, type) VALUES (?, ?)',
    args: [key, 'pro']
  });
  res.json({ key });
});

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OmniRelay backend on port ${PORT}`));

module.exports = app;

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
  <title>OmniRelay – Cross‑Platform Dispatcher</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f8faff 0%, #eef0f5 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: white;
      border-radius: 2rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(0, 0, 0, 0.04);
      padding: 3rem 2rem;
      max-width: 560px;
      width: 100%;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #00e5ff, #2c3ecc, #8a2be2);
    }
    .logo {
      width: 80px;
      height: auto;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #2c3ecc, #8a2be2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.75rem;
    }
    .tagline {
      font-size: 1.1rem;
      color: #4b5563;
      margin-bottom: 2rem;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 0.9rem 2.5rem;
      background: linear-gradient(135deg, #00e5ff, #2c3ecc);
      color: white;
      font-weight: 700;
      font-size: 1.1rem;
      border-radius: 50px;
      text-decoration: none;
      box-shadow: 0 10px 20px rgba(0, 229, 255, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      margin-bottom: 1.5rem;
      border: none;
      cursor: pointer;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 25px rgba(0, 229, 255, 0.4);
    }
    .footer-note {
      font-size: 0.9rem;
      color: #9ca3af;
    }
    .footer-note a {
      color: #2c3ecc;
      text-decoration: none;
    }
    @media (max-width: 480px) {
      .card { padding: 2rem 1.5rem; }
      h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://i.ibb.co/Gf1h84RX/android-chrome-512x512.png" alt="OmniRelay logo" class="logo">
    <h1>OmniRelay</h1>
    <p class="tagline">Send web content to Telegram & Discord in one click.<br>Free tier with watermark – upgrade to remove it.</p>
    <a class="btn" href="/pay">Upgrade to Pro ($49)</a>
    <div class="footer-note">
      Already have a license? <a href="#">Configure your browser extension</a>.<br>
      Payments in USDT (ETH, BSC, Polygon, Tron).
    </div>
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
  <title>OmniRelay Pro – Upgrade</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #f8faff 0%, #eef0f5 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: white;
      border-radius: 2rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08), 0 6px 12px rgba(0, 0, 0, 0.04);
      padding: 3rem 2rem;
      max-width: 560px;
      width: 100%;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #00e5ff, #2c3ecc, #8a2be2);
    }
    .logo-sm {
      width: 48px;
      height: auto;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.8rem;
      font-weight: 800;
      color: #1f2937;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      color: #6b7280;
      font-size: 0.95rem;
      margin-bottom: 2rem;
    }
    .section {
      background: #f9fafb;
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      text-align: left;
      border: 1px solid #e5e7eb;
    }
    label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.25rem;
    }
    select, input, button {
      width: 100%;
      padding: 0.8rem 1rem;
      margin-top: 0.25rem;
      margin-bottom: 1rem;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      font-size: 1rem;
      background: white;
      transition: border-color 0.2s;
    }
    select:focus, input:focus {
      outline: none;
      border-color: #2c3ecc;
      box-shadow: 0 0 0 3px rgba(44, 62, 204, 0.1);
    }
    button {
      background: linear-gradient(135deg, #00e5ff, #2c3ecc);
      color: white;
      font-weight: 700;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(0, 229, 255, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 1rem;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 25px rgba(0, 229, 255, 0.4);
    }
    .address-box {
      background: #f3f4f6;
      padding: 0.8rem 1rem;
      border-radius: 12px;
      font-family: monospace;
      word-break: break-all;
      color: #1f2937;
      margin: 0.5rem 0 0.25rem;
    }
    .note {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    #result {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 12px;
      display: none;
      font-weight: 500;
    }
    .success { background: #d1fae5; color: #065f46; }
    .error { background: #fee2e2; color: #991b1b; }
    @media (max-width: 480px) {
      .card { padding: 2rem 1.25rem; }
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://i.ibb.co/Gf1h84RX/android-chrome-512x512.png" alt="OmniRelay logo" class="logo-sm">
    <h1>Upgrade to OmniRelay Pro</h1>
    <p class="subtitle">Lifetime access — $49. Remove watermarks & unlock unlimited channels.</p>

    <div class="section">
      <label for="network">Select payment network</label>
      <select id="network">
        <option value="ethereum">Ethereum (ERC-20)</option>
        <option value="bsc">BSC (BEP-20)</option>
        <option value="polygon">Polygon (ERC-20)</option>
        <option value="tron">Tron (TRC-20)</option>
      </select>

      <div id="paymentDetails" style="display:none;">
        <label>Send exactly 49 USDT to</label>
        <div class="address-box" id="walletAddress"></div>
        <p class="note">USDT Contract: <span id="contract"></span></p>

        <label for="txHash">Transaction hash (TXID)</label>
        <input type="text" id="txHash" placeholder="Paste the transaction hash here">
      </div>
    </div>

    <button id="verifyBtn">Verify Payment & Get License Key</button>
    <div id="result"></div>
  </div>

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

// ─── Relay Endpoint ───
app.post('/api/relay', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Relay handler error:', error);
    res.status(500).json({ error: 'Internal server error. Please check server logs.' });
  }
});

// ─── License Check ───
app.post('/api/check-license', async (req, res) => {
  try {
    const { license } = req.body;
    const valid = await validateLicense(license);
    res.json({ valid });
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── Payment Routes ───
app.use('/api/payment', payment);

// ─── Admin Key Generation ───
app.post('/api/admin/generate-key', async (req, res) => {
  try {
    const { adminSecret } = req.body;
    if (adminSecret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });
    const key = 'OMNI-' + uuidv4().slice(0, 8).toUpperCase();
    await db.execute({
      sql: 'INSERT INTO licenses (key, type) VALUES (?, ?)',
      args: [key, 'pro']
    });
    res.json({ key });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ─── Start Server ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OmniRelay backend on port ${PORT}`));

module.exports = app;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const redis = require('./db');
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
  <link rel="icon" type="image/png" href="https://i.ibb.co/QjtH2qtx/1000176798.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #000000; color: #ffffff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: #0a0a0a; border-radius: 2.5rem; border: 1px solid #222; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); padding: 3rem 2.5rem; max-width: 520px; width: 100%; text-align: center; position: relative; transition: border-color 0.3s; }
    .card:hover { border-color: #333; }
    .logo { width: 90px; height: auto; margin-bottom: 1.5rem; filter: drop-shadow(0 0 10px rgba(255,255,255,0.2)); }
    h1 { font-size: 3rem; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; margin-bottom: 0.5rem; }
    .tagline { font-size: 1.15rem; color: #a0a0a0; margin-bottom: 2.5rem; line-height: 1.6; }
    .btn { display: inline-block; padding: 1rem 2.5rem; background: #ffffff; color: #000000; font-weight: 700; font-size: 1rem; border-radius: 50px; text-decoration: none; letter-spacing: 0.02em; transition: background 0.25s, box-shadow 0.25s; box-shadow: 0 4px 14px rgba(255,255,255,0.15); margin-bottom: 2rem; }
    .btn:hover { background: #e5e5e5; box-shadow: 0 6px 20px rgba(255,255,255,0.25); }
    .github-link { display: inline-flex; align-items: center; gap: 0.5rem; color: #888; text-decoration: none; font-size: 0.9rem; border: 1px solid #333; padding: 0.65rem 1.4rem; border-radius: 50px; transition: all 0.2s; margin-bottom: 1.5rem; }
    .github-link:hover { color: #fff; border-color: #555; background: #111; }
    .github-link svg { width: 18px; height: 18px; fill: currentColor; }
    .footer-note { font-size: 0.85rem; color: #666; }
    .footer-note a { color: #aaa; text-decoration: underline; text-underline-offset: 3px; }
    @media (max-width: 480px) { .card { padding: 2rem 1.5rem; } h1 { font-size: 2.4rem; } }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://i.ibb.co/QjtH2qtx/1000176798.png" alt="OmniRelay logo" class="logo">
    <h1>OmniRelay</h1>
    <p class="tagline">Send web content to Telegram & Discord in one click.<br>Free tier includes a subtle watermark.</p>
    <a class="btn" href="/pay">Upgrade to Pro – $49</a>
    <br>
    <a class="github-link" href="https://github.com/swiss9/OmniRelay" target="_blank" rel="noopener">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      View on GitHub
    </a>
    <div class="footer-note">Already have a license? <a href="#">Configure your extension</a>.<br>Payments in USDT (ETH, BSC, Polygon, Tron).</div>
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
  <link rel="icon" type="image/png" href="https://i.ibb.co/QjtH2qtx/1000176798.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #000000; color: #ffffff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    .card { background: #0a0a0a; border-radius: 2.5rem; border: 1px solid #222; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8); padding: 3rem 2.5rem; max-width: 580px; width: 100%; text-align: center; }
    .logo-sm { width: 55px; height: auto; margin-bottom: 1.25rem; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
    h1 { font-size: 2rem; font-weight: 800; color: #ffffff; margin-bottom: 0.4rem; }
    .subtitle { color: #a0a0a0; font-size: 0.95rem; margin-bottom: 2rem; }
    .network-section { margin-bottom: 2rem; text-align: left; }
    .network-section p { font-weight: 600; color: #ccc; margin-bottom: 0.8rem; font-size: 0.95rem; letter-spacing: 0.01em; }
    .network-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; margin-bottom: 1.5rem; }
    .network-card { background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 1rem; padding: 1rem 0.5rem; text-align: center; cursor: pointer; transition: all 0.2s; font-weight: 600; color: #999; font-size: 0.9rem; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .network-card.active { border-color: #ffffff; background: #141414; color: #ffffff; box-shadow: 0 0 15px rgba(255,255,255,0.05); }
    .network-card:hover { border-color: #555; }
    .network-card .chain-icon { font-size: 1.5rem; opacity: 0.8; }
    .payment-details { background: #0d0d0d; border: 1px solid #2a2a2a; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; text-align: left; transition: all 0.3s; }
    .detail-row { margin-bottom: 1.2rem; }
    .detail-row label { display: block; font-weight: 600; color: #ccc; font-size: 0.85rem; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .address-box { background: #050505; border: 1px solid #333; border-radius: 10px; padding: 0.8rem 1rem; font-family: 'SF Mono', 'Fira Code', monospace; word-break: break-all; color: #fff; font-size: 0.85rem; margin-top: 0.2rem; }
    .address-box small { color: #888; display: block; margin-top: 0.3rem; font-family: 'Inter', sans-serif; font-size: 0.75rem; }
    .note { color: #777; font-size: 0.8rem; }
    button { width: 100%; padding: 1rem; background: #ffffff; color: #000000; font-weight: 700; font-size: 1rem; border: none; border-radius: 50px; cursor: pointer; box-shadow: 0 4px 14px rgba(255,255,255,0.15); transition: background 0.25s, box-shadow 0.25s; letter-spacing: 0.02em; margin-top: 0.5rem; }
    button:hover { background: #e5e5e5; box-shadow: 0 6px 20px rgba(255,255,255,0.25); }
    #result { margin-top: 1.5rem; padding: 1rem; border-radius: 12px; display: none; font-weight: 500; font-size: 0.95rem; }
    .success { background: #0a2a1a; color: #4ade80; border: 1px solid #166534; }
    .error { background: #2a0a0a; color: #f87171; border: 1px solid #7f1d1d; }
    @media (max-width: 480px) { .card { padding: 2rem 1.25rem; } .network-grid { grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://i.ibb.co/QjtH2qtx/1000176798.png" alt="OmniRelay logo" class="logo-sm">
    <h1>Upgrade to OmniRelay Pro</h1>
    <p class="subtitle">Lifetime access · Remove watermarks · Unlimited channels</p>
    <div class="network-section">
      <p>Choose payment network</p>
      <div class="network-grid" id="networkGrid"></div>
    </div>
    <div id="paymentDetails" class="payment-details" style="display:none;">
      <div class="detail-row">
        <label>Send exactly 49 USDT to</label>
        <div class="address-box" id="walletAddress"></div>
        <small id="contractInfo" class="note" style="display:none;">Contract: <span id="contract"></span></small>
      </div>
      <div class="detail-row">
        <label>Transaction Hash (TXID)</label>
        <input type="text" id="txHash" placeholder="Paste your transaction hash here" style="width:100%; padding:0.9rem; background:#050505; border:1px solid #333; border-radius:10px; color:#fff; margin-top:0.3rem;">
      </div>
    </div>
    <button id="verifyBtn">Verify Payment & Get License Key</button>
    <div id="result"></div>
  </div>
  <script>
    const BACKEND = window.location.origin;
    let networksData = {};
    let selectedNetwork = 'ethereum';
    fetch(BACKEND + '/api/payment/info')
      .then(r => r.json())
      .then(data => { networksData = data; renderNetworkCards(); updatePaymentDetails(); });
    function renderNetworkCards() {
      const grid = document.getElementById('networkGrid');
      grid.innerHTML = '';
      const icons = { ethereum: '🔷', bsc: '🟡', polygon: '🟣', tron: '🔴' };
      for (const [key, net] of Object.entries(networksData)) {
        const card = document.createElement('div');
        card.className = 'network-card' + (key === selectedNetwork ? ' active' : '');
        card.innerHTML = '<span class="chain-icon">' + (icons[key] || '💎') + '</span>' + net.name;
        card.addEventListener('click', () => {
          selectedNetwork = key;
          document.querySelectorAll('.network-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          updatePaymentDetails();
        });
        grid.appendChild(card);
      }
    }
    function updatePaymentDetails() {
      const info = networksData[selectedNetwork];
      if (!info) return;
      document.getElementById('paymentDetails').style.display = 'block';
      document.getElementById('walletAddress').textContent = info.address;
      const contractSpan = document.getElementById('contract');
      const contractInfo = document.getElementById('contractInfo');
      if (info.usdtContract && info.usdtContract !== 'N/A') {
        contractSpan.textContent = info.usdtContract;
        contractInfo.style.display = 'block';
      } else { contractInfo.style.display = 'none'; }
    }
    document.getElementById('verifyBtn').addEventListener('click', async () => {
      const txHash = document.getElementById('txHash').value.trim();
      if (!txHash) return alert('Enter transaction hash');
      const res = await fetch(BACKEND + '/api/payment/verify', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ network: selectedNetwork, txHash })
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

// ─── Pro Test Page (generate key, validate, relay) ───
app.get('/pro-test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pro Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui; background: #000; color: #fff; padding: 1.5rem; }
    input, button, textarea { width: 100%; padding: 0.7rem; margin: 0.4rem 0; border: 1px solid #333; border-radius: 8px; background: #0a0a0a; color: #fff; font-size: 1rem; }
    button { background: #fff; color: #000; font-weight: bold; border: none; cursor: pointer; }
    pre { background: #111; padding: 1rem; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; }
    hr { border-color: #333; margin: 1.5rem 0; }
  </style>
</head>
<body>
  <h2>🔐 Generate Pro Key</h2>
  <input type="password" id="s" placeholder="Admin Secret">
  <button onclick="fetch('/api/admin/generate-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminSecret:document.getElementById('s').value})}).then(r=>r.json()).then(d=>document.getElementById('k').textContent=JSON.stringify(d,null,2))">Generate Key</button>
  <pre id="k"></pre>

  <h2>✅ Validate License</h2>
  <input id="checkLicense" placeholder="License Key to check">
  <button onclick="fetch('/api/check-license',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({license:document.getElementById('checkLicense').value.trim()})}).then(r=>r.json()).then(d=>document.getElementById('checkResult').textContent=JSON.stringify(d))">Check License</button>
  <pre id="checkResult"></pre>

  <hr>
  <h2>📨 Test Relay</h2>
  <input id="license" placeholder="License Key (empty = free tier)">
  <input id="tg" placeholder="Telegram Chat ID">
  <input id="dc" placeholder="Discord Webhook URL">
  <textarea id="msg">Pro test</textarea>
  <button onclick="fetch('/api/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:document.getElementById('msg').value,url:'https://example.com',targets:['telegram:'+document.getElementById('tg').value,'discord:'+document.getElementById('dc').value],license:document.getElementById('license').value.trim(),clientId:'pt'+Date.now()})}).then(r=>r.json()).then(d=>document.getElementById('r').textContent=JSON.stringify(d,null,2))">Send Relay</button>
  <pre id="r"></pre>
</body>
</html>`);
});

// ─── Limit Test Page (multiple targets in one call) ───
app.get('/limit-test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Limit Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui; background: #000; color: #fff; padding: 1.5rem; }
    button { padding: 0.8rem 1.5rem; background: #fff; color: #000; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; width: 100%; }
    pre { background: #111; padding: 1rem; border-radius: 8px; margin-top: 1rem; white-space: pre-wrap; }
    p { color: #ffa500; }
  </style>
</head>
<body>
  <h2>🚫 Free Tier Limit (Single Request)</h2>
  <p>Attempts to send to two Telegram targets in one call – must fail.</p>
  <button onclick="fetch('/api/relay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'limit test',targets:['telegram:111','telegram:222'],license:'',clientId:'lim'+Date.now()})}).then(r=>r.json()).then(d=>document.getElementById('r').textContent=JSON.stringify(d,null,2))">Test Limit (No License)</button>
  <pre id="r"></pre>
</body>
</html>`);
});

// ─── Persistent Limit Test (same clientId, sequential calls) ───
app.get('/persistent-limit-test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Persistent Limit Test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui; background: #000; color: #fff; padding: 1.5rem; }
    button { padding: 0.8rem; margin: 0.5rem 0; background: #fff; color: #000; font-weight: bold; border: none; border-radius: 8px; width: 100%; }
    pre { background: #111; padding: 1rem; border-radius: 8px; white-space: pre-wrap; }
    p { color: #ffa500; }
  </style>
</head>
<body>
  <h2>🔒 Persistent Free‑Tier Limit Test</h2>
  <p>Uses a <b>fixed client ID</b> (like the real extension).<br>
  Step 1: Click "Send to Telegram A" – will succeed.<br>
  Step 2: Click "Send to Telegram B" – will fail (limit reached).</p>

  <button onclick="send('telegram:111')">Send to Telegram A (111)</button>
  <button onclick="send('telegram:222')">Send to Telegram B (222)</button>

  <pre id="result"></pre>

  <script>
    const CLIENT_ID = 'persistent-test-client';   // same across both clicks

    async function send(target) {
      const payload = {
        text: 'Limit test',
        targets: [target],
        license: '',
        clientId: CLIENT_ID
      };
      const res = await fetch('/api/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      document.getElementById('result').textContent = JSON.stringify(data, null, 2);
    }
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

    const key = 'OMNI-' + uuidv4(

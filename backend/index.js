require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const db = require('./db');
const { validateLicense, trackFreeTarget, canAddTarget } = require('./license');
const payment = require('./payment');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route for payment page (so /pay works without .html)
app.get('/pay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pay.html'));
});

// Relay endpoint
app.post('/api/relay', async (req, res) => {
  const { text, url, image, targets, license, clientId } = req.body;
  if (!text && !url && !image) return res.status(400).json({ error: 'No content' });
  if (!targets || !Array.isArray(targets)) return res.status(400).json({ error: 'Targets required' });

  let isPro = false;
  if (license) {
    isPro = await validateLicense(license);
    if (!isPro) return res.status(403).json({ error: 'Invalid license' });
  }

  // Free tier target limits
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

// License check endpoint
app.post('/api/check-license', async (req, res) => {
  const { license } = req.body;
  const valid = await validateLicense(license);
  res.json({ valid });
});

// Payment routes
app.use('/api/payment', payment);

// Admin key generation (protected)
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OmniRelay backend on port ${PORT}`));

module.exports = app;

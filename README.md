# OmniRelay

Send web content to **Telegram** and **Discord** in one click.  
Highlight text on any page, hit send, and OmniRelay instantly posts it to both
platforms with a clean watermark. Perfect for community managers, news curators,
and creators.

---

## 🔥 Features

- **Browser Extension** – One‑click sharing from any webpage (Firefox & Chrome).
- **Dual Delivery** – Post to Telegram channels and Discord servers simultaneously.
- **Free Tier** – Fully functional with a small “⚡ Sent via OmniRelay” watermark.
- **Pro Upgrade** – Remove the watermark and unlock unlimited channels. Lifetime
  access for $49 in crypto (USDT on Ethereum, BSC, Polygon, Tron).

---

## 🚀 Quick Start

1. **Install the extension**  
   - Firefox: [AMO link (coming soon)]  
   - Chrome: manual install or wait for Chrome Web Store listing.

2. **Configure the extension**  
   - Open the extension options and set your backend URL (the hosted API),
     Telegram Chat ID, and Discord Webhook URL.
   - The default backend is `https://omni-relay.vercel.app` (free for personal use).

3. **Start sharing**  
   - On any web page, click the OmniRelay icon or right‑click selected text.
   - Choose your targets and hit Send. The message appears in both platforms.

---

## 🛠️ Self‑Hosting the Backend

OmniRelay's backend is open source. You can deploy your own instance in minutes.

1. Clone this repository and navigate to `backend/`.
2. Set environment variables:  
   `TELEGRAM_BOT_TOKEN`, `TURSO_DB_URL`, `TURSO_DB_TOKEN`, `ADMIN_SECRET`, and the
   USDT wallet addresses for the payment page.
3. Deploy to Vercel (free) or any Node.js host.
4. Point the extension's `Backend URL` to your new instance.

---

## 💰 Upgrade to Pro

Remove the watermark and send to unlimited Telegram/Discord channels.

- **Price:** $49 (lifetime) in USDT
- **Networks:** Ethereum, BSC, Polygon, Tron
- **How:** Open the `/pay` page on your backend, send the exact amount, and submit
  the transaction hash. A license key is generated automatically.

---

## 📜 License

MIT – see the [LICENSE](LICENSE) file.

---

## 🔗 Links

- Website: [https://omni-relay.vercel.app](https://omni-relay.vercel.app)
- GitHub: [https://github.com/swiss9/OmniRelay](https://github.com/swiss9/OmniRelay)
- Payment/Upgrade: `/pay` on the same domain

---

Built with 💻 by [swiss9](https://github.com/swiss9)

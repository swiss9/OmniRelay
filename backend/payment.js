const express = require('express');
const axios = require('axios');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Networks config
const NETWORKS = {
  ethereum: {
    name: 'Ethereum (ERC-20)',
    address: process.env.USDT_ETH_ADDRESS,
    api: `https://api.etherscan.io/api?apikey=${process.env.ETHERSCAN_API_KEY}`,
    parseTx: (tx) => ({
      to: tx.to,
      value: parseFloat(tx.value) / 1e6,
      contract: tx.contractAddress.toLowerCase(),
      tokenDecimal: 6
    })
  },
  bsc: {
    name: 'BSC (BEP-20)',
    address: process.env.USDT_BSC_ADDRESS,
    api: `https://api.bscscan.com/api?apikey=${process.env.BSCSCAN_API_KEY}`,
    parseTx: (tx) => ({
      to: tx.to,
      value: parseFloat(tx.value) / 1e18,
      contract: tx.contractAddress.toLowerCase(),
      tokenDecimal: 18
    })
  },
  polygon: {
    name: 'Polygon (ERC-20)',
    address: process.env.USDT_POLYGON_ADDRESS,
    api: `https://api.polygonscan.com/api?apikey=${process.env.POLYGONSCAN_API_KEY}`,
    parseTx: (tx) => ({
      to: tx.to,
      value: parseFloat(tx.value) / 1e6,
      contract: tx.contractAddress.toLowerCase(),
      tokenDecimal: 6
    })
  },
  tron: {
    name: 'Tron (TRC-20)',
    address: process.env.USDT_TRON_ADDRESS,
    api: `https://api.trongrid.io/v1/accounts/${process.env.USDT_TRON_ADDRESS}/transactions/trc20`,
    // Tron verification handled separately
    parseTx: null
  }
};

const USDT_CONTRACTS = {
  ethereum: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  bsc: '0x55d398326f99059ff775485246999027b3197955',
  polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  tron: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
};

router.get('/info', (req, res) => {
  const info = {};
  for (const [key, net] of Object.entries(NETWORKS)) {
    info[key] = {
      name: net.name,
      address: net.address,
      usdtContract: USDT_CONTRACTS[key]
    };
  }
  res.json(info);
});

router.post('/verify', async (req, res) => {
  const { network, txHash } = req.body;
  if (!network || !txHash) return res.status(400).json({ error: 'Missing network or txHash' });
  const net = NETWORKS[network];
  if (!net) return res.status(400).json({ error: 'Unsupported network' });

  // Check if already processed
  if (db.prepare('SELECT * FROM payments WHERE tx_hash = ?').get(txHash))
    return res.status(400).json({ error: 'Transaction already used' });

  try {
    let amount, toAddress;
    if (network === 'tron') {
      // Tron
      const resp = await axios.get(net.api, { params: { limit: 50, contract_address: USDT_CONTRACTS.tron } });
      const txs = resp.data.data;
      const tx = txs.find(t => t.transaction_id === txHash);
      if (!tx) return res.status(400).json({ error: 'Transaction not found' });
      if (tx.to.toLowerCase() !== net.address.toLowerCase())
        return res.status(400).json({ error: 'Recipient address mismatch' });
      amount = parseFloat(tx.value) / 1e6; // USDT TRC20 6 decimals
    } else {
      // EVM
      const response = await axios.get(net.api, {
        params: {
          module: 'account',
          action: 'tokentx',
          txhash: txHash
        }
      });
      const transfers = response.data.result;
      if (!transfers || transfers.length === 0) return res.status(400).json({ error: 'No token transfers found' });
      const transfer = transfers.find(t =>
        t.to.toLowerCase() === net.address.toLowerCase() &&
        t.contractAddress.toLowerCase() === USDT_CONTRACTS[network]
      );
      if (!transfer) return res.status(400).json({ error: 'No valid USDT transfer to your wallet' });
      amount = parseFloat(transfer.value) / Math.pow(10, parseInt(transfer.tokenDecimal));
    }

    const PRICE_USD = 49;
    if (amount < PRICE_USD) return res.status(400).json({ error: `Insufficient payment. Received ${amount} USDT, expected ${PRICE_USD}.` });

    // Generate license key
    const key = 'OMNI-' + uuidv4().slice(0, 8).toUpperCase();
    db.prepare('INSERT INTO licenses (key, type) VALUES (?, ?)').run(key, 'pro');
    db.prepare('INSERT INTO payments (tx_hash, network, amount, license_key) VALUES (?, ?, ?, ?)').run(txHash, network, amount, key);

    res.json({ success: true, licenseKey: key });
  } catch (err) {
    console.error('Payment verification error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Verification failed. Please contact support.' });
  }
});

module.exports = router;

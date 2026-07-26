const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './data/omni.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    key TEXT PRIMARY KEY,
    type TEXT DEFAULT 'pro',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS free_targets (
    client_id TEXT NOT NULL,
    target TEXT NOT NULL,
    PRIMARY KEY (client_id, target)
  );
  CREATE TABLE IF NOT EXISTS payments (
    tx_hash TEXT PRIMARY KEY,
    network TEXT,
    amount REAL,
    license_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;

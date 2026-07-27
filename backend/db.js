const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
});

// Initialize tables (run once, safe to run multiple times)
db.execute(`
  CREATE TABLE IF NOT EXISTS licenses (
    key TEXT PRIMARY KEY,
    type TEXT DEFAULT 'pro',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`).catch(() => {});
db.execute(`
  CREATE TABLE IF NOT EXISTS free_targets (
    client_id TEXT NOT NULL,
    target TEXT NOT NULL,
    PRIMARY KEY (client_id, target)
  );
`).catch(() => {});
db.execute(`
  CREATE TABLE IF NOT EXISTS payments (
    tx_hash TEXT PRIMARY KEY,
    network TEXT,
    amount REAL,
    license_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`).catch(() => {});

module.exports = db;

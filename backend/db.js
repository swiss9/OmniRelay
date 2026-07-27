const axios = require('axios');

const TURSO_URL = process.env.TURSO_DB_URL.replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_DB_TOKEN;

async function execute(sql, args = []) {
  const payload = {
    requests: [
      { type: 'execute', stmt: { sql, args } }
    ]
  };

  const response = await axios.post(
    `${TURSO_URL}/v2/pipeline`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const result = response.data.results[0];
  if (result.type === 'error') {
    throw new Error(result.error.message);
  }

  // Handle both query and execute statements
  if (result.result) {
    // It's a write statement (INSERT/UPDATE/DELETE) – no columns
    return { lastInsertRowid: result.result.lastInsertRowId, rowsAffected: result.result.rowsAffected };
  } else {
    // It's a query (SELECT) – return rows array
    const cols = result.columns || [];
    const rows = (result.rows || []).map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    return { rows };
  }
}

async function initDb() {
  await execute(`
    CREATE TABLE IF NOT EXISTS licenses (
      key TEXT PRIMARY KEY,
      type TEXT DEFAULT 'pro',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await execute(`
    CREATE TABLE IF NOT EXISTS free_targets (
      client_id TEXT NOT NULL,
      target TEXT NOT NULL,
      PRIMARY KEY (client_id, target)
    )
  `);
  await execute(`
    CREATE TABLE IF NOT EXISTS payments (
      tx_hash TEXT PRIMARY KEY,
      network TEXT,
      amount REAL,
      license_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Wait for table creation to finish before accepting requests
initDb().catch(console.error);

module.exports = { execute };

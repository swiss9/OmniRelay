const axios = require('axios');

const TURSO_URL = process.env.TURSO_DB_URL.replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_DB_TOKEN;

async function execute(sql, args = []) {
  // Turso HTTP pipeline API expects a "requests" array
  const response = await axios.post(
    `${TURSO_URL}/v2/pipeline`,
    {
      requests: [
        { type: 'execute', stmt: { sql, args } }
      ]
    },
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

  // Format the response like the previous client (rows as arrays of objects)
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

// Keep the same init function (tables creation)
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

initDb().catch(console.error);

module.exports = { execute };

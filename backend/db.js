const axios = require('axios');

const TURSO_URL = process.env.TURSO_DB_URL.replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_DB_TOKEN;

async function execute(query) {
  let sql, args;
  if (typeof query === 'object' && query.sql) {
    sql = query.sql;
    args = query.args || [];
  } else {
    sql = query;
    args = Array.isArray(arguments[1]) ? arguments[1] : [];
  }

  const payload = { sql, args };

  try {
    const response = await axios.post(
      `${TURSO_URL}/v2/execute`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${TURSO_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    // For write statements, the response contains `results` and `last_insert_rowid`
    // For queries, `results` is an array of rows with column names.
    if (data.results && Array.isArray(data.results)) {
      // Query result
      return {
        rows: data.results,
        lastInsertRowid: data.last_insert_rowid || null
      };
    }

    // For statements that don't return rows (e.g., DDL), just return the lastInsertRowid
    return {
      rows: [],
      lastInsertRowid: data.last_insert_rowid || null
    };
  } catch (err) {
    if (err.response && err.response.data) {
      throw new Error(`Turso API error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

async function initDb() {
  await execute({
    sql: `CREATE TABLE IF NOT EXISTS licenses (
      key TEXT PRIMARY KEY,
      type TEXT DEFAULT 'pro',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  });
  await execute({
    sql: `CREATE TABLE IF NOT EXISTS free_targets (
      client_id TEXT NOT NULL,
      target TEXT NOT NULL,
      PRIMARY KEY (client_id, target)
    )`
  });
  await execute({
    sql: `CREATE TABLE IF NOT EXISTS payments (
      tx_hash TEXT PRIMARY KEY,
      network TEXT,
      amount REAL,
      license_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  });
}

initDb().catch(console.error);

module.exports = { execute };

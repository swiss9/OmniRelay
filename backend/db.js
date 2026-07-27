const axios = require('axios');

const TURSO_URL = process.env.TURSO_DB_URL.replace('libsql://', 'https://');
const TURSO_TOKEN = process.env.TURSO_DB_TOKEN;

// Convert a plain value into a Turso typed argument
function toTursoArg(value) {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'number') return { type: 'integer', value: Math.round(value) };
  if (typeof value === 'boolean') return { type: 'integer', value: value ? 1 : 0 };
  // Everything else (strings, etc.) as text
  return { type: 'text', value: String(value) };
}

async function execute(query) {
  // Accept both execute({ sql, args }) and execute(sql, args)
  let sql, args;
  if (typeof query === 'object' && query.sql) {
    sql = query.sql;
    args = query.args || [];
  } else {
    sql = query;
    args = Array.isArray(arguments[1]) ? arguments[1] : [];
  }

  // Convert plain args to typed args for Turso
  const typedArgs = args.map(toTursoArg);

  const payload = {
    requests: [
      {
        type: 'execute',
        stmt: { sql, args: typedArgs }
      }
    ]
  };

  try {
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

    // Query result
    if (result.columns) {
      const cols = result.columns;
      const rows = (result.rows || []).map(row => {
        const obj = {};
        cols.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
      return { rows };
    }
    // Execute result (INSERT/UPDATE/DELETE)
    return { lastInsertRowid: result.lastInsertRowId || null };
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

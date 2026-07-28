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

  // Wrap plain args into typed args for Turso
  const typedArgs = args.map(value => {
    if (value === null || value === undefined) return { type: 'null' };
    if (typeof value === 'number') return { type: 'integer', value: Math.round(value) };
    if (typeof value === 'boolean') return { type: 'integer', value: value ? 1 : 0 };
    return { type: 'text', value: String(value) };
  });

  const payload = {
    requests: [
      { type: 'execute', stmt: { sql, args: typedArgs } }
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

    // Build rows array (empty for write operations)
    let rows = [];
    if (result.columns && result.rows) {
      rows = result.rows.map(row => {
        const obj = {};
        result.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    }

    return {
      rows,
      lastInsertRowid: result.lastInsertRowId || null,
      rowsAffected: result.rowsAffected || 0
    };
  } catch (err) {
    if (err.response && err.response.data) {
      throw new Error(`Turso API error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
}

// Also export a function to run multiple statements in a single pipeline
async function batch(statements) {
  const requests = statements.map(stmt => ({
    type: 'execute',
    stmt: {
      sql: stmt.sql,
      args: (stmt.args || []).map(value => {
        if (value === null || value === undefined) return { type: 'null' };
        if (typeof value === 'number') return { type: 'integer', value: Math.round(value) };
        if (typeof value === 'boolean') return { type: 'integer', value: value ? 1 : 0 };
        return { type: 'text', value: String(value) };
      })
    }
  }));

  const response = await axios.post(
    `${TURSO_URL}/v2/pipeline`,
    { requests },
    {
      headers: {
        Authorization: `Bearer ${TURSO_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.results;
}

async function initDb() {
  await execute(`CREATE TABLE IF NOT EXISTS licenses (key TEXT PRIMARY KEY, type TEXT DEFAULT 'pro', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await execute(`CREATE TABLE IF NOT EXISTS free_targets (client_id TEXT NOT NULL, target TEXT NOT NULL, PRIMARY KEY (client_id, target))`);
  await execute(`CREATE TABLE IF NOT EXISTS payments (tx_hash TEXT PRIMARY KEY, network TEXT, amount REAL, license_key TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
}

initDb().catch(console.error);

module.exports = { execute, batch };

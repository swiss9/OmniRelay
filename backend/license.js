const db = require('./db');

async function validateLicense(key) {
  const result = await db.execute({
    sql: 'SELECT * FROM licenses WHERE key = ?',
    args: [key]
  });
  return result.rows.length > 0;
}

async function canAddTarget(clientId, targets) {
  const existingResult = await db.execute({
    sql: 'SELECT target FROM free_targets WHERE client_id = ?',
    args: [clientId]
  });
  const existing = existingResult.rows.map(r => r.target);
  const newTargets = targets.filter(t => !existing.includes(t));
  if (newTargets.length === 0) return true;
  const newTelegram = newTargets.filter(t => t.startsWith('telegram:'));
  const newDiscord = newTargets.filter(t => t.startsWith('discord:'));
  const existingTelegram = existing.filter(t => t.startsWith('telegram:')).length;
  const existingDiscord = existing.filter(t => t.startsWith('discord:')).length;
  return (existingTelegram + newTelegram.length <= 1) && (existingDiscord + newDiscord.length <= 1);
}

async function trackFreeTarget(clientId, targets) {
  for (const target of targets) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO free_targets (client_id, target) VALUES (?, ?)',
      args: [clientId, target]
    });
  }
}

module.exports = { validateLicense, canAddTarget, trackFreeTarget };

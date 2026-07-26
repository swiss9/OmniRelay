const db = require('./db');

function validateLicense(key) {
  if (!key) return false;
  const row = db.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
  return !!row;
}

function canAddTarget(clientId, targets) {
  const existing = db.prepare('SELECT target FROM free_targets WHERE client_id = ?').all(clientId).map(r => r.target);
  const newTargets = targets.filter(t => !existing.includes(t));
  if (newTargets.length === 0) return true;
  const newTelegram = newTargets.filter(t => t.startsWith('telegram:'));
  const newDiscord = newTargets.filter(t => t.startsWith('discord:'));
  const existingTelegram = existing.filter(t => t.startsWith('telegram:')).length;
  const existingDiscord = existing.filter(t => t.startsWith('discord:')).length;
  return (existingTelegram + newTelegram.length <= 1) && (existingDiscord + newDiscord.length <= 1);
}

function trackFreeTarget(clientId, targets) {
  const insert = db.prepare('INSERT OR IGNORE INTO free_targets (client_id, target) VALUES (?, ?)');
  for (const target of targets) {
    insert.run(clientId, target);
  }
}

module.exports = { validateLicense, canAddTarget, trackFreeTarget };

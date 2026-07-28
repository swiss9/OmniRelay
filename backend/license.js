const redis = require('./db');

async function validateLicense(key) {
  const exists = await redis.sismember('licenses', key);
  return exists === 1;
}

async function canAddTarget(clientId, targets) {
  const key = `free_targets:${clientId}`;
  const existing = await redis.smembers(key);
  const newTargets = targets.filter(t => !existing.includes(t));
  if (newTargets.length === 0) return true;

  const newTelegram = newTargets.filter(t => t.startsWith('telegram:'));
  const newDiscord = newTargets.filter(t => t.startsWith('discord:'));
  const existingTelegram = existing.filter(t => t.startsWith('telegram:')).length;
  const existingDiscord = existing.filter(t => t.startsWith('discord:')).length;

  return (existingTelegram + newTelegram.length <= 1) &&
         (existingDiscord + newDiscord.length <= 1);
}

async function trackFreeTarget(clientId, targets) {
  const key = `free_targets:${clientId}`;
  if (targets.length > 0) {
    await redis.sadd(key, ...targets);
  }
}

module.exports = { validateLicense, canAddTarget, trackFreeTarget };

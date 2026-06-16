const config = require('../config/env');
const { evaluateOpenSignals } = require('./signal.service');

let intervalId = null;

function startScheduler() {
  if (intervalId) {
    console.warn('[Scheduler] Already running');
    return;
  }

  const intervalMs = config.pollIntervalMs;
  console.log(`[Scheduler] Starting signal evaluation loop (every ${intervalMs}ms)`);

  intervalId = setInterval(async () => {
    try {
      await evaluateOpenSignals();
    } catch (err) {
      console.error('[Scheduler] Error during evaluation tick:', err.message);
    }
  }, intervalMs);
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Stopped');
  }
}

module.exports = { startScheduler, stopScheduler };

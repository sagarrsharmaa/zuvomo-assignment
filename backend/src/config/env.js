require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  databaseUrl: process.env.DATABASE_URL,
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS, 10) || 10000,
  binanceCacheTtlMs: parseInt(process.env.BINANCE_CACHE_TTL_MS, 10) || 5000,
};

module.exports = config;

const axios = require('axios');
const config = require('../config/env');

const BINANCE_PRICE_URL = 'https://api.binance.com/api/v3/ticker/price';

// in-memory price cache with TTL
let priceCache = {
  data: new Map(),
  timestamp: 0,
};

async function getAllPrices() {
  const now = Date.now();
  if (priceCache.data.size > 0 && now - priceCache.timestamp < config.binanceCacheTtlMs) {
    return priceCache.data;
  }

  try {
    const response = await axios.get(BINANCE_PRICE_URL, { timeout: 10000 });
    const prices = new Map();
    for (const item of response.data) {
      prices.set(item.symbol, parseFloat(item.price));
    }
    priceCache = { data: prices, timestamp: now };
    return prices;
  } catch (err) {
    console.error('[BinanceService] Failed to fetch prices:', err.message);
    if (priceCache.data.size > 0) {
      return priceCache.data;
    }
    return new Map();
  }
}

async function getPricesForSymbols(symbols) {
  const allPrices = await getAllPrices();
  const result = new Map();
  for (const symbol of symbols) {
    if (allPrices.has(symbol)) {
      result.set(symbol, allPrices.get(symbol));
    }
  }
  return result;
}

async function getPrice(symbol) {
  const allPrices = await getAllPrices();
  return allPrices.get(symbol) || null;
}

module.exports = { getAllPrices, getPricesForSymbols, getPrice };

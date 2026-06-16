const prisma = require('../config/db');
const { calculateRoi } = require('../utils/roi');
const { getPrice, getPricesForSymbols } = require('./binance.service');

async function createSignal(data) {
  const signal = await prisma.signal.create({
    data: {
      symbol: data.symbol,
      direction: data.direction,
      entryPrice: data.entryPrice,
      stopLoss: data.stopLoss,
      targetPrice: data.targetPrice,
      entryTime: new Date(data.entryTime),
      expiryTime: new Date(data.expiryTime),
    },
  });
  return signal;
}

async function getAllSignals(statusFilter) {
  const where = {};
  if (statusFilter) {
    where.status = statusFilter;
  }

  const signals = await prisma.signal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const openSymbols = [...new Set(signals.filter((s) => s.status === 'OPEN').map((s) => s.symbol))];
  let livePrices = new Map();
  if (openSymbols.length > 0) {
    livePrices = await getPricesForSymbols(openSymbols);
  }

  return signals.map((signal) => augmentSignal(signal, livePrices));
}

async function getSignalById(id) {
  const signal = await prisma.signal.findUnique({ where: { id } });
  if (!signal) return null;

  let livePrices = new Map();
  if (signal.status === 'OPEN') {
    const price = await getPrice(signal.symbol);
    if (price !== null) {
      livePrices.set(signal.symbol, price);
    }
  }

  return augmentSignal(signal, livePrices);
}

async function getSignalStatus(id) {
  const signal = await prisma.signal.findUnique({ where: { id } });
  if (!signal) return null;

  let currentPrice = signal.lastKnownPrice ? Number(signal.lastKnownPrice) : null;
  let unrealizedRoi = null;

  if (signal.status === 'OPEN') {
    const livePrice = await getPrice(signal.symbol);
    if (livePrice !== null) {
      currentPrice = livePrice;
      unrealizedRoi = calculateRoi(
        signal.direction,
        Number(signal.entryPrice),
        livePrice
      );
    } else if (currentPrice !== null) {
      unrealizedRoi = calculateRoi(
        signal.direction,
        Number(signal.entryPrice),
        currentPrice
      );
    }
  }

  const timeRemainingSeconds = computeTimeRemaining(signal.expiryTime);

  return {
    id: signal.id,
    status: signal.status,
    currentPrice,
    unrealizedRoi: signal.status === 'OPEN' ? unrealizedRoi : null,
    realizedRoi: signal.status !== 'OPEN' ? Number(signal.realizedRoi) : null,
    timeRemainingSeconds,
  };
}

async function deleteSignal(id) {
  const signal = await prisma.signal.findUnique({ where: { id } });
  if (!signal) return null;
  await prisma.signal.delete({ where: { id } });
  return signal;
}

// evaluate all open signals against live prices (called by scheduler)
async function evaluateOpenSignals() {
  const openSignals = await prisma.signal.findMany({
    where: { status: 'OPEN' },
  });

  if (openSignals.length === 0) return;

  const symbols = [...new Set(openSignals.map((s) => s.symbol))];
  const prices = await getPricesForSymbols(symbols);

  if (prices.size === 0) {
    console.warn('[SignalService] No prices available, skipping evaluation tick');
    return;
  }

  const now = new Date();

  for (const signal of openSignals) {
    const currentPrice = prices.get(signal.symbol);
    if (currentPrice === undefined) continue;

    const entryPrice = Number(signal.entryPrice);
    const stopLoss = Number(signal.stopLoss);
    const targetPrice = Number(signal.targetPrice);

    let newStatus = null;
    let exitPrice = null;

    // check price triggers before expiry (precedence rule)
    if (signal.direction === 'BUY') {
      if (currentPrice <= stopLoss) {
        newStatus = 'STOPLOSS_HIT';
        exitPrice = stopLoss;
      } else if (currentPrice >= targetPrice) {
        newStatus = 'TARGET_HIT';
        exitPrice = targetPrice;
      }
    } else {
      if (currentPrice >= stopLoss) {
        newStatus = 'STOPLOSS_HIT';
        exitPrice = stopLoss;
      } else if (currentPrice <= targetPrice) {
        newStatus = 'TARGET_HIT';
        exitPrice = targetPrice;
      }
    }

    // if no price trigger, check expiry
    if (!newStatus && now >= new Date(signal.expiryTime)) {
      newStatus = 'EXPIRED';
      exitPrice = currentPrice;
    }

    if (newStatus) {
      const realizedRoi = calculateRoi(signal.direction, entryPrice, exitPrice);
      await prisma.signal.update({
        where: { id: signal.id },
        data: {
          status: newStatus,
          realizedRoi,
          lastKnownPrice: exitPrice,
        },
      });
      console.log(
        `[SignalService] Signal ${signal.id} (${signal.symbol}) resolved: ${newStatus}, ROI: ${realizedRoi}%`
      );
    } else {
      await prisma.signal.update({
        where: { id: signal.id },
        data: { lastKnownPrice: currentPrice },
      });
    }
  }
}

// helpers

function augmentSignal(signal, livePrices) {
  const entryPrice = Number(signal.entryPrice);
  let currentPrice = null;
  let unrealizedRoi = null;

  if (signal.status === 'OPEN') {
    const livePrice = livePrices.get(signal.symbol);
    currentPrice = livePrice !== undefined ? livePrice : (signal.lastKnownPrice ? Number(signal.lastKnownPrice) : null);
    if (currentPrice !== null) {
      unrealizedRoi = calculateRoi(signal.direction, entryPrice, currentPrice);
    }
  } else {
    currentPrice = signal.lastKnownPrice ? Number(signal.lastKnownPrice) : null;
  }

  const timeRemainingSeconds = computeTimeRemaining(signal.expiryTime);

  return {
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    entryPrice: Number(signal.entryPrice),
    stopLoss: Number(signal.stopLoss),
    targetPrice: Number(signal.targetPrice),
    entryTime: signal.entryTime,
    expiryTime: signal.expiryTime,
    createdAt: signal.createdAt,
    status: signal.status,
    realizedRoi: signal.realizedRoi !== null ? Number(signal.realizedRoi) : null,
    lastKnownPrice: signal.lastKnownPrice !== null ? Number(signal.lastKnownPrice) : null,
    currentPrice,
    unrealizedRoi,
    timeRemainingSeconds,
  };
}

function computeTimeRemaining(expiryTime) {
  const remaining = Math.max(0, Math.floor((new Date(expiryTime).getTime() - Date.now()) / 1000));
  return remaining;
}

module.exports = {
  createSignal,
  getAllSignals,
  getSignalById,
  getSignalStatus,
  deleteSignal,
  evaluateOpenSignals,
};

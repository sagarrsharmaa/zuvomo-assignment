// ROI calculation utilities

function calculateBuyRoi(entryPrice, exitPrice) {
  const roi = ((exitPrice - entryPrice) / entryPrice) * 100;
  return Number(roi.toFixed(2));
}

function calculateSellRoi(entryPrice, exitPrice) {
  const roi = ((entryPrice - exitPrice) / entryPrice) * 100;
  return Number(roi.toFixed(2));
}

function calculateRoi(direction, entryPrice, exitPrice) {
  if (direction === 'BUY') {
    return calculateBuyRoi(entryPrice, exitPrice);
  }
  return calculateSellRoi(entryPrice, exitPrice);
}

module.exports = { calculateBuyRoi, calculateSellRoi, calculateRoi };

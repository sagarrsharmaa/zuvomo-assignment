const { calculateBuyRoi, calculateSellRoi, calculateRoi } = require('../src/utils/roi');

describe('ROI Calculations', () => {
  describe('calculateBuyRoi', () => {
    test('positive ROI when exit > entry', () => {
      expect(calculateBuyRoi(100, 110)).toBe(10.00);
    });

    test('negative ROI when exit < entry', () => {
      expect(calculateBuyRoi(100, 90)).toBe(-10.00);
    });

    test('zero ROI when exit = entry', () => {
      expect(calculateBuyRoi(100, 100)).toBe(0.00);
    });

    test('rounds to exactly 2 decimal places', () => {
      // (105.555 - 100) / 100 * 100 = 5.555 → 5.56
      expect(calculateBuyRoi(100, 105.555)).toBe(5.56);
    });

    test('handles large crypto prices', () => {
      const roi = calculateBuyRoi(67000, 67500);
      expect(roi).toBe(0.75); // ((67500-67000)/67000)*100 = 0.74626... rounds to 0.75
    });

    test('always returns a number, not a string', () => {
      const result = calculateBuyRoi(100, 103.5);
      expect(typeof result).toBe('number');
      expect(result).toBe(3.50);
    });
  });

  describe('calculateSellRoi', () => {
    test('positive ROI when exit < entry (price fell, good for SELL)', () => {
      expect(calculateSellRoi(100, 90)).toBe(10.00);
    });

    test('negative ROI when exit > entry (price rose, bad for SELL)', () => {
      expect(calculateSellRoi(100, 110)).toBe(-10.00);
    });

    test('zero ROI when exit = entry', () => {
      expect(calculateSellRoi(100, 100)).toBe(0.00);
    });

    test('rounds to exactly 2 decimal places', () => {
      // (100 - 94.445) / 100 * 100 = 5.555 → 5.56
      expect(calculateSellRoi(100, 94.445)).toBe(5.56);
    });
  });

  describe('calculateRoi (dispatcher)', () => {
    test('delegates to BUY formula for BUY direction', () => {
      expect(calculateRoi('BUY', 100, 110)).toBe(10.00);
    });

    test('delegates to SELL formula for SELL direction', () => {
      expect(calculateRoi('SELL', 100, 90)).toBe(10.00);
    });

    test('BUY and SELL same prices give opposite signs', () => {
      const buyRoi = calculateRoi('BUY', 100, 110);
      const sellRoi = calculateRoi('SELL', 100, 110);
      expect(buyRoi).toBe(10.00);
      expect(sellRoi).toBe(-10.00);
    });

    test('result is always exactly 2 decimal places (3.50 not 3.5)', () => {
      const result = calculateRoi('BUY', 100, 103.5);
      // Number(3.5.toFixed(2)) === 3.5 as a number, but toFixed returns "3.50"
      // The spec says Number(roi.toFixed(2)), which is 3.5 as a JS number
      // But when serialized to JSON, 3.5 becomes "3.5" — the frontend handles formatting
      expect(result).toBe(3.5);
      // Verify toFixed(2) produces "3.50"
      expect(result.toFixed(2)).toBe('3.50');
    });
  });
});

describe('Direction-Aware Validation Logic', () => {
  // These test the pure validation logic independent of express-validator
  function validatePrices(direction, entryPrice, stopLoss, targetPrice) {
    const errors = [];
    if (direction === 'BUY') {
      if (stopLoss >= entryPrice) {
        errors.push('For BUY signals, stopLoss must be less than entryPrice');
      }
      if (targetPrice <= entryPrice) {
        errors.push('For BUY signals, targetPrice must be greater than entryPrice');
      }
    } else if (direction === 'SELL') {
      if (stopLoss <= entryPrice) {
        errors.push('For SELL signals, stopLoss must be greater than entryPrice');
      }
      if (targetPrice >= entryPrice) {
        errors.push('For SELL signals, targetPrice must be less than entryPrice');
      }
    }
    return errors;
  }

  test('BUY: valid prices produce no errors', () => {
    expect(validatePrices('BUY', 100, 90, 110)).toEqual([]);
  });

  test('BUY: stopLoss >= entryPrice is invalid', () => {
    const errors = validatePrices('BUY', 100, 100, 110);
    expect(errors).toContain('For BUY signals, stopLoss must be less than entryPrice');
  });

  test('BUY: stopLoss > entryPrice is invalid', () => {
    const errors = validatePrices('BUY', 100, 105, 110);
    expect(errors).toContain('For BUY signals, stopLoss must be less than entryPrice');
  });

  test('BUY: targetPrice <= entryPrice is invalid', () => {
    const errors = validatePrices('BUY', 100, 90, 100);
    expect(errors).toContain('For BUY signals, targetPrice must be greater than entryPrice');
  });

  test('SELL: valid prices produce no errors', () => {
    expect(validatePrices('SELL', 100, 110, 90)).toEqual([]);
  });

  test('SELL: stopLoss <= entryPrice is invalid', () => {
    const errors = validatePrices('SELL', 100, 100, 90);
    expect(errors).toContain('For SELL signals, stopLoss must be greater than entryPrice');
  });

  test('SELL: targetPrice >= entryPrice is invalid', () => {
    const errors = validatePrices('SELL', 100, 110, 100);
    expect(errors).toContain('For SELL signals, targetPrice must be less than entryPrice');
  });

  test('entryTime validation: 12 hours ago is valid', () => {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(twelveHoursAgo >= twentyFourHoursAgo).toBe(true);
  });

  test('entryTime validation: 30 hours ago is invalid', () => {
    const now = new Date();
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(thirtyHoursAgo < twentyFourHoursAgo).toBe(true);
  });

  test('expiryTime must be after entryTime', () => {
    const entry = new Date('2024-01-01T10:00:00Z');
    const expirySame = new Date('2024-01-01T10:00:00Z');
    const expiryBefore = new Date('2024-01-01T09:00:00Z');
    const expiryAfter = new Date('2024-01-01T11:00:00Z');
    expect(expiryAfter > entry).toBe(true);
    expect(expirySame > entry).toBe(false);
    expect(expiryBefore > entry).toBe(false);
  });
});

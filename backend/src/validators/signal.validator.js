const { body } = require('express-validator');

const createSignalValidation = [
  body('symbol')
    .exists({ checkFalsy: true })
    .withMessage('symbol is required')
    .isString()
    .withMessage('symbol must be a string')
    .notEmpty()
    .withMessage('symbol must not be empty')
    .customSanitizer((value) => (typeof value === 'string' ? value.toUpperCase() : value)),

  body('direction')
    .exists({ checkFalsy: true })
    .withMessage('direction is required')
    .isIn(['BUY', 'SELL'])
    .withMessage('direction must be exactly BUY or SELL'),

  body('entryPrice')
    .exists({ checkNull: true })
    .withMessage('entryPrice is required')
    .isFloat({ gt: 0 })
    .withMessage('entryPrice must be a positive number')
    .toFloat(),

  body('stopLoss')
    .exists({ checkNull: true })
    .withMessage('stopLoss is required')
    .isFloat({ gt: 0 })
    .withMessage('stopLoss must be a positive number')
    .toFloat(),

  body('targetPrice')
    .exists({ checkNull: true })
    .withMessage('targetPrice is required')
    .isFloat({ gt: 0 })
    .withMessage('targetPrice must be a positive number')
    .toFloat(),

  body('entryTime')
    .exists({ checkFalsy: true })
    .withMessage('entryTime is required')
    .isISO8601()
    .withMessage('entryTime must be a valid ISO 8601 datetime')
    .custom((value) => {
      const entryDate = new Date(value);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (entryDate < twentyFourHoursAgo) {
        throw new Error('entryTime must not be more than 24 hours in the past');
      }
      return true;
    }),

  body('expiryTime')
    .exists({ checkFalsy: true })
    .withMessage('expiryTime is required')
    .isISO8601()
    .withMessage('expiryTime must be a valid ISO 8601 datetime')
    .custom((value, { req }) => {
      const expiryDate = new Date(value);
      const entryDate = new Date(req.body.entryTime);
      if (expiryDate <= entryDate) {
        throw new Error('expiryTime must be strictly after entryTime');
      }
      return true;
    }),

  // direction-aware price checks
  body('stopLoss').custom((value, { req }) => {
    const { direction, entryPrice, stopLoss } = req.body;
    if (typeof entryPrice !== 'number' || typeof stopLoss !== 'number' || !direction) {
      return true;
    }
    if (direction === 'BUY' && stopLoss >= entryPrice) {
      throw new Error('For BUY signals, stopLoss must be less than entryPrice');
    }
    if (direction === 'SELL' && stopLoss <= entryPrice) {
      throw new Error('For SELL signals, stopLoss must be greater than entryPrice');
    }
    return true;
  }),

  body('targetPrice').custom((value, { req }) => {
    const { direction, entryPrice, targetPrice } = req.body;
    if (typeof entryPrice !== 'number' || typeof targetPrice !== 'number' || !direction) {
      return true;
    }
    if (direction === 'BUY' && targetPrice <= entryPrice) {
      throw new Error('For BUY signals, targetPrice must be greater than entryPrice');
    }
    if (direction === 'SELL' && targetPrice >= entryPrice) {
      throw new Error('For SELL signals, targetPrice must be less than entryPrice');
    }
    return true;
  }),
];

module.exports = { createSignalValidation };

const { Router } = require('express');
const controller = require('../controllers/signal.controller');
const { createSignalValidation } = require('../validators/signal.validator');
const validateRequest = require('../middlewares/validateRequest');

const router = Router();

// POST /api/signals — create a new signal
router.post('/', createSignalValidation, validateRequest, controller.createSignal);

// GET /api/signals — list all signals (with optional ?status= filter)
router.get('/', controller.getAllSignals);

// GET /api/signals/:id — get a single signal
router.get('/:id', controller.getSignalById);

// GET /api/signals/:id/status — lightweight status endpoint
router.get('/:id/status', controller.getSignalStatus);

// DELETE /api/signals/:id — hard delete
router.delete('/:id', controller.deleteSignal);

module.exports = router;

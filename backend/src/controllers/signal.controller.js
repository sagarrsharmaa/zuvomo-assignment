const signalService = require('../services/signal.service');

async function createSignal(req, res, next) {
  try {
    const signal = await signalService.createSignal(req.body);
    res.status(201).json(signal);
  } catch (err) {
    next(err);
  }
}

async function getAllSignals(req, res, next) {
  try {
    const statusFilter = req.query.status || null;
    const signals = await signalService.getAllSignals(statusFilter);
    res.json(signals);
  } catch (err) {
    next(err);
  }
}

async function getSignalById(req, res, next) {
  try {
    const signal = await signalService.getSignalById(req.params.id);
    if (!signal) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    res.json(signal);
  } catch (err) {
    next(err);
  }
}

async function deleteSignal(req, res, next) {
  try {
    const deleted = await signalService.deleteSignal(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    res.status(200).json({ message: 'Signal deleted' });
  } catch (err) {
    next(err);
  }
}

async function getSignalStatus(req, res, next) {
  try {
    const status = await signalService.getSignalStatus(req.params.id);
    if (!status) {
      return res.status(404).json({ error: 'Signal not found' });
    }
    res.json(status);
  } catch (err) {
    next(err);
  }
}

module.exports = { createSignal, getAllSignals, getSignalById, deleteSignal, getSignalStatus };

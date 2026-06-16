function errorHandler(err, req, res, _next) {
  console.error('[ErrorHandler]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;

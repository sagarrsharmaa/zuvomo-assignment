const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const signalRoutes = require('./routes/signal.routes');
const errorHandler = require('./middlewares/errorHandler');
const { startScheduler } = require('./services/scheduler.service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/signals', signalRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`[Server] Trading Signal Tracker API running on port ${PORT}`);
  startScheduler();
});

module.exports = app;

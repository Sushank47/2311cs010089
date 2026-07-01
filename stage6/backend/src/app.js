const express = require('express');
const cors = require('cors');
const notificationRoutes = require('./routes/notification');
const Log = require('./services/logger');

const app = express();

// Configure CORS to accept local frontend requests (5173 / 3000)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Logger registration notification
app.use(async (req, res, next) => {
  // Log request info for monitoring (maps to middleware)
  if (req.url.startsWith('/api')) {
    await Log('backend', 'debug', 'web-backend-middleware', `HTTP request received: ${req.method} ${req.url}`);
  }
  next();
});

// Mount Routes
app.use('/api/notifications', notificationRoutes);

// Healthy check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Global Error Handler
app.use(async (err, req, res, next) => {
  await Log('backend', 'error', 'web-backend-middleware', `Internal Server Error: ${err.message}`);
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error'
  });
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const notificationRoutes = require('./routes/notification');
const Log = require('./services/logger');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware to attach socket.io 'io' instance to request context
app.use((req, res, next) => {
  req.io = app.get('io');
  next();
});

// Logger middleware
app.use(async (req, res, next) => {
  if (req.url.startsWith('/api')) {
    await Log('backend', 'debug', 'web-backend-middleware', `HTTP request: ${req.method} ${req.url}`);
  }
  next();
});

// Routes
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Error handling
app.use(async (err, req, res, next) => {
  await Log('backend', 'error', 'web-backend-middleware', `Server Error: ${err.message}`);
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

module.exports = app;

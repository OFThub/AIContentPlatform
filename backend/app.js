const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const contentRoutes = require('./src/routes/contentRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const { apiLimiter } = require('./src/middleware/rateLimiter');

const app = express();

/**
 * Behind Docker/nginx every request arrives from the proxy IP, so without this
 * all clients share a single rate-limit bucket and express-rate-limit warns
 * about an unexpected X-Forwarded-For header.
 */
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use('/api/', apiLimiter);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Content Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Exported without listening so tests can mount it without binding a port.
module.exports = app;

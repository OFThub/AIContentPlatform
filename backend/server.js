const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const contentRoutes = require('./src/routes/contentRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

// Import middleware
const { apiLimiter } = require('./src/middleware/rateLimiter');

// Initialize express app
const app = express();

/**
 * MIDDLEWARE CONFIGURATION
 */

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
app.use('/api/', apiLimiter);

/**
 * ROUTES
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Content Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

/**
 * START SERVER
 */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 AI Content Platform API                              ║
║                                                           ║
║   Server: http://localhost:${PORT}                           ║
║   Environment: ${process.env.NODE_ENV}                              ║
║   Health: http://localhost:${PORT}/health                    ║
║                                                           ║
║   Features:                                               ║
║   ✓ PostgreSQL with pgvector (Semantic Search)           ║
║   ✓ Redis Caching                                         ║
║   ✓ Window Functions & CTEs                               ║
║   ✓ Materialized Views                                    ║
║   ✓ Rate Limiting                                         ║
║   ✓ JWT Authentication                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // Close database connections
    process.exit(0);
  });
});

module.exports = app;
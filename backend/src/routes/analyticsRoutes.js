const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { longCache, mediumCache } = require('../middleware/cache');

/**
 * Analytics Routes
 * Statistics and analytics endpoints
 */

// Public analytics (cached heavily)
router.get(
  '/trending',
  longCache,
  analyticsController.getTrendingAnalysis
);

router.get(
  '/top-by-category',
  longCache,
  analyticsController.getTopContentsByCategory
);

router.get(
  '/leaderboard',
  mediumCache,
  analyticsController.getUserLeaderboard
);

router.get(
  '/categories',
  longCache,
  analyticsController.getCategoryAnalytics
);

router.get(
  '/search',
  mediumCache,
  analyticsController.getSearchAnalytics
);

router.get(
  '/dashboard',
  longCache,
  analyticsController.getDashboardStats
);

// Content-specific analytics
router.get(
  '/content/:id/timeseries',
  mediumCache,
  analyticsController.getContentPerformanceTimeseries
);

// User-specific analytics (protected)
router.get(
  '/user/:id/engagement',
  authMiddleware,
  analyticsController.getUserEngagementMetrics
);

// Admin endpoints
router.post(
  '/refresh-views',
  authMiddleware, // In production, add admin check
  analyticsController.refreshMaterializedViews
);

module.exports = router;
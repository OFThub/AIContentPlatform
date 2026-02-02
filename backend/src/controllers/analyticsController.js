const analyticsService = require('../services/analyticsService');

/**
 * Analytics Controller
 * Handles analytics and statistics endpoints
 */

class AnalyticsController {
  /**
   * Get trending analysis
   * GET /api/analytics/trending
   */
  async getTrendingAnalysis(req, res) {
    try {
      const { days = 7, limit = 20 } = req.query;
      
      const trending = await analyticsService.getTrendingAnalysis(
        parseInt(days),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: trending
      });
    } catch (error) {
      console.error('Get trending analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending analysis'
      });
    }
  }
  
  /**
   * Get top contents by category
   * GET /api/analytics/top-by-category
   */
  async getTopContentsByCategory(req, res) {
    try {
      const { limit = 5 } = req.query;
      
      const topContents = await analyticsService.getTopContentsByCategory(
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: topContents
      });
    } catch (error) {
      console.error('Get top by category error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch top contents'
      });
    }
  }
  
  /**
   * Get user leaderboard
   * GET /api/analytics/leaderboard
   */
  async getUserLeaderboard(req, res) {
    try {
      const { categoryId, limit = 50 } = req.query;
      
      const leaderboard = await analyticsService.getUserLeaderboard(
        categoryId ? parseInt(categoryId) : null,
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard'
      });
    }
  }
  
  /**
   * Get content performance timeseries
   * GET /api/analytics/content/:id/timeseries
   */
  async getContentPerformanceTimeseries(req, res) {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      
      const timeseries = await analyticsService.getContentPerformanceTimeseries(
        id,
        parseInt(days)
      );
      
      res.json({
        success: true,
        data: timeseries
      });
    } catch (error) {
      console.error('Get timeseries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch timeseries'
      });
    }
  }
  
  /**
   * Get search analytics
   * GET /api/analytics/search
   */
  async getSearchAnalytics(req, res) {
    try {
      const { days = 7, limit = 20 } = req.query;
      
      const searchAnalytics = await analyticsService.getSearchAnalytics(
        parseInt(days),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: searchAnalytics
      });
    } catch (error) {
      console.error('Get search analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch search analytics'
      });
    }
  }
  
  /**
   * Get category analytics
   * GET /api/analytics/categories
   */
  async getCategoryAnalytics(req, res) {
    try {
      const categoryAnalytics = await analyticsService.getCategoryAnalytics();
      
      res.json({
        success: true,
        data: categoryAnalytics
      });
    } catch (error) {
      console.error('Get category analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch category analytics'
      });
    }
  }
  
  /**
   * Get user engagement metrics
   * GET /api/analytics/user/:id/engagement
   */
  async getUserEngagementMetrics(req, res) {
    try {
      const { id } = req.params;
      
      // Only allow users to see their own engagement or admin
      if (req.user.id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }
      
      const engagement = await analyticsService.getUserEngagementMetrics(id);
      
      res.json({
        success: true,
        data: engagement
      });
    } catch (error) {
      console.error('Get engagement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch engagement metrics'
      });
    }
  }
  
  /**
   * Refresh materialized views (Admin only)
   * POST /api/analytics/refresh-views
   */
  async refreshMaterializedViews(req, res) {
    try {
      await analyticsService.refreshMaterializedViews();
      
      res.json({
        success: true,
        message: 'Materialized views refreshed successfully'
      });
    } catch (error) {
      console.error('Refresh views error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh views'
      });
    }
  }
  
  /**
   * Get dashboard stats
   * GET /api/analytics/dashboard
   */
  async getDashboardStats(req, res) {
    try {
      // Get multiple analytics in parallel
      const [
        trending,
        topByCategory,
        searchAnalytics,
        categoryAnalytics
      ] = await Promise.all([
        analyticsService.getTrendingAnalysis(7, 5),
        analyticsService.getTopContentsByCategory(3),
        analyticsService.getSearchAnalytics(7, 10),
        analyticsService.getCategoryAnalytics()
      ]);
      
      res.json({
        success: true,
        data: {
          trending,
          topByCategory,
          searchAnalytics,
          categoryAnalytics
        }
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard stats'
      });
    }
  }
}

module.exports = new AnalyticsController();
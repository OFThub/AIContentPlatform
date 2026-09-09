const contentService = require('../services/contentService');
const { isAiEnabled } = require('../config/openai');

/**
 * Content Controller
 * Handles HTTP requests for content operations
 */

class ContentController {
  /**
   * Create new content
   * POST /api/contents
   */
  async createContent(req, res) {
    try {
      const { title, body, categoryId, contentType, tags } = req.body;
      
      // Validation
      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: 'Title and body are required'
        });
      }
      
      const content = await contentService.createContent(req.user.id, {
        title,
        body,
        categoryId,
        contentType,
        tags
      });
      
      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: content
      });
    } catch (error) {
      console.error('Create content error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create content'
      });
    }
  }
  
  /**
   * Generate content with AI
   * POST /api/contents/generate
   */
  async generateContent(req, res) {
    if (!isAiEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'AI features are unavailable: GEMINI_API_KEY is not configured.'
      });
    }

    try {
      const { topic, tone, length, categoryId, tags } = req.body;

      if (!topic) {
        return res.status(400).json({ success: false, message: 'Topic is required' });
      }

      const content = await contentService.generateContent(req.user.id, {
        topic, tone, length, categoryId, tags
      });

      res.status(201).json({
        success: true,
        message: 'Content generated successfully',
        data: content
      });
    } catch (error) {
      console.error('Generate content error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to generate content'
      });
    }
  }

  /**
   * Get content by ID
   * GET /api/contents/:id
   */
  async getContent(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const content = await contentService.getContentById(id, userId);
      
      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }
      
      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Get content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch content'
      });
    }
  }
  
  /**
   * Get contents with filters
   * GET /api/contents
   */
  async getContents(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        userId,
        contentType,
        sortBy,
        search
      } = req.query;
      
      const result = await contentService.getContents({
        page: parseInt(page),
        limit: parseInt(limit),
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        userId: userId ? parseInt(userId) : undefined,
        contentType,
        sortBy,
        search,
        viewerId: req.user?.id ?? null
      });
      
      res.json({
        success: true,
        data: result.contents,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('Get contents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch contents'
      });
    }
  }
  
  /**
   * Semantic search
   * POST /api/contents/search/semantic
   */
  async semanticSearch(req, res) {
    try {
      const { query, limit = 20, categoryId } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }
      
      const results = await contentService.semanticSearch(query, {
        limit: parseInt(limit),
        categoryId: categoryId ? parseInt(categoryId) : undefined
      });
      
      res.json({
        success: true,
        data: results,
        searchType: 'semantic'
      });
    } catch (error) {
      console.error('Semantic search error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }
  
  /**
   * Get popular contents
   * GET /api/contents/popular
   */
  async getPopularContents(req, res) {
    try {
      const { limit = 10, categoryId } = req.query;
      
      const contents = await contentService.getPopularContents(
        parseInt(limit),
        categoryId ? parseInt(categoryId) : null
      );
      
      res.json({
        success: true,
        data: contents
      });
    } catch (error) {
      console.error('Get popular contents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch popular contents'
      });
    }
  }
  
  /**
   * Get trending contents
   * GET /api/contents/trending
   */
  async getTrendingContents(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      const contents = await contentService.getTrendingContents(parseInt(limit));
      
      res.json({
        success: true,
        data: contents
      });
    } catch (error) {
      console.error('Get trending contents error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch trending contents'
      });
    }
  }
  
  /**
   * Get content analytics
   * GET /api/contents/:id/analytics
   */
  async getContentAnalytics(req, res) {
    try {
      const { id } = req.params;
      
      const analytics = await contentService.getContentAnalytics(id);
      
      if (!analytics) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get content analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics'
      });
    }
  }
  
  /**
   * Update content
   * PUT /api/contents/:id
   */
  async updateContent(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const content = await contentService.updateContent(
        id,
        req.user.id,
        updates
      );
      
      res.json({
        success: true,
        message: 'Content updated successfully',
        data: content
      });
    } catch (error) {
      console.error('Update content error:', error);
      res.status(error.message.includes('unauthorized') ? 403 : 500).json({
        success: false,
        message: error.message || 'Failed to update content'
      });
    }
  }
  
  /**
   * Delete content
   * DELETE /api/contents/:id
   */
  async deleteContent(req, res) {
    try {
      const { id } = req.params;
      
      await contentService.deleteContent(id, req.user.id);
      
      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } catch (error) {
      console.error('Delete content error:', error);
      res.status(error.message.includes('unauthorized') ? 403 : 500).json({
        success: false,
        message: error.message || 'Failed to delete content'
      });
    }
  }
  
  /**
   * Like content
   * POST /api/contents/:id/like
   */
  async likeContent(req, res) {
    try {
      const { id } = req.params;
      
      await contentService.logEvent(id, req.user.id, 'like');
      
      res.json({
        success: true,
        message: 'Content liked'
      });
    } catch (error) {
      console.error('Like content error:', error);
      res.status(error.status || 500).json({
        success: false,
        message: 'Failed to like content'
      });
    }
  }
  
  /**
   * Share content
   * POST /api/contents/:id/share
   */
  async shareContent(req, res) {
    try {
      const { id } = req.params;
      
      await contentService.logEvent(id, req.user.id, 'share');
      
      res.json({
        success: true,
        message: 'Content shared'
      });
    } catch (error) {
      console.error('Share content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to share content'
      });
    }
  }
  
  /**
   * Bookmark content
   * POST /api/contents/:id/bookmark
   */
  async bookmarkContent(req, res) {
    try {
      const { id } = req.params;
      
      await contentService.bookmarkContent(req.user.id, id);
      
      res.json({
        success: true,
        message: 'Content bookmarked'
      });
    } catch (error) {
      console.error('Bookmark content error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to bookmark content'
      });
    }
  }
  
  /**
   * Remove bookmark
   * DELETE /api/contents/:id/bookmark
   */
  async removeBookmark(req, res) {
    try {
      const { id } = req.params;
      
      await contentService.removeBookmark(req.user.id, id);
      
      res.json({
        success: true,
        message: 'Bookmark removed'
      });
    } catch (error) {
      console.error('Remove bookmark error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove bookmark'
      });
    }
  }
  
  /**
   * Get user bookmarks
   * GET /api/bookmarks
   */
  async getUserBookmarks(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const bookmarks = await contentService.getUserBookmarks(
        req.user.id,
        parseInt(page),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: bookmarks
      });
    } catch (error) {
      console.error('Get bookmarks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookmarks'
      });
    }
  }
}

module.exports = new ContentController();
const { query, transaction } = require('../config/database');
const {
  generateEmbedding,
  prepareContentForEmbedding,
  formatEmbeddingForDB,
  generateContent: generateArticle,
} = require('../config/openai');
const { delCachePattern } = require('../config/redis');
const slugify = require('slugify');

/**
 * Content Service
 * 
 * Bu service'te kullanılan PostgreSQL advanced features:
 * 1. Window Functions (ROW_NUMBER, RANK, LAG)
 * 2. CTEs (WITH clauses)
 * 3. Full-text search
 * 4. Vector similarity search (pgvector)
 * 5. Aggregations
 */

class ContentService {
  /**
   * Create new content with AI embedding
   */
  async createContent(userId, contentData) {
    const { title, body, categoryId, contentType = 'article', tags = [] } = contentData;
    
    return transaction(async (client) => {
      // Generate slug
      const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
      
      // Generate AI embedding for semantic search
      const embeddingText = prepareContentForEmbedding(title, body);
      const embedding = await generateEmbedding(embeddingText);
      const embeddingStr = formatEmbeddingForDB(embedding);
      
      // Insert content
      const contentResult = await client.query(
        `INSERT INTO contents 
         (user_id, category_id, title, slug, body, content_type, embedding, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id, user_id, category_id, title, slug, body, content_type,
                   status, view_count, like_count, comment_count, share_count,
                   created_at, updated_at, published_at`,
        [userId, categoryId, title, slug, body, contentType, embeddingStr]
      );
      
      const content = contentResult.rows[0];
      
      // Add tags if provided
      if (tags.length > 0) {
        for (const tagName of tags) {
          // Get or create tag
          const tagSlug = slugify(tagName, { lower: true });
          const tagResult = await client.query(
            `INSERT INTO tags (name, slug, usage_count)
             VALUES ($1, $2, 1)
             ON CONFLICT (slug) 
             DO UPDATE SET usage_count = tags.usage_count + 1
             RETURNING id`,
            [tagName, tagSlug]
          );
          
          // Link tag to content
          await client.query(
            `INSERT INTO content_tags (content_id, tag_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [content.id, tagResult.rows[0].id]
          );
        }
      }
      
      // Invalidate cache
      await delCachePattern('cache:*contents*');
      
      return content;
    });
  }
  
  /**
   * Generate an article with the AI provider, then persist it through the
   * normal create path so it gets a slug, an embedding and tag links like any
   * other content.
   */
  async generateContent(userId, { topic, tone, length, categoryId, tags = [] }) {
    const { title, body } = await generateArticle({ topic, tone, length });
    return this.createContent(userId, { title, body, categoryId, contentType: 'article', tags });
  }

  /**
   * Get content by numeric id or slug, with tags and the viewer's bookmark
   * state. Accepting the slug is what makes the /content/<slug> links the
   * cards have always produced actually resolve.
   */
  async getContentById(idOrSlug, userId = null) {
    const key = String(idOrSlug);
    const result = await query(
      `WITH content_data AS (
         SELECT
           c.id,
           c.user_id,
           c.category_id,
           c.title,
           c.slug,
           c.body,
           c.content_type,
           c.status,
           c.view_count,
           c.like_count,
           c.comment_count,
           c.share_count,
           c.created_at,
           c.updated_at,
           c.published_at,
           u.username,
           u.avatar_url,
           cat.name as category_name,
           cat.slug as category_slug,
           EXISTS(
             SELECT 1 FROM bookmarks
             WHERE content_id = c.id AND user_id = $2
           ) as is_bookmarked
         FROM contents c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN categories cat ON c.category_id = cat.id
         WHERE c.status = 'published'
           AND (c.slug = $1 OR ($1 ~ '^[0-9]+$' AND c.id = $1::int))
       ),
       tag_data AS (
         SELECT
           ct.content_id,
           json_agg(json_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) as tags
         FROM content_tags ct
         JOIN tags t ON ct.tag_id = t.id
         WHERE ct.content_id IN (SELECT id FROM content_data)
         GROUP BY ct.content_id
       )
       SELECT
         cd.*,
         COALESCE(td.tags, '[]'::json) as tags
       FROM content_data cd
       LEFT JOIN tag_data td ON cd.id = td.content_id`,
      [key, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const content = result.rows[0];

    // Fire and forget: a failed view log must not fail the read.
    this.logEvent(content.id, userId, 'view').catch(console.error);

    return content;
  }
  
  /**
   * Get contents with advanced filtering and pagination
   * Uses Window Functions for ranking
   */
async getContents(filters = {}) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      userId,
      contentType,
      sortBy = 'recent', // recent, popular, trending
      search
    } = filters;
    
    const offset = (page - 1) * limit;
    const params = [];
    let paramIndex = 1;
    
    // Build WHERE clause
    const conditions = ["c.status = 'published'"];
    
    if (categoryId) {
      conditions.push(`c.category_id = $${paramIndex++}`);
      params.push(categoryId);
    }
    
    if (userId) {
      conditions.push(`c.user_id = $${paramIndex++}`);
      params.push(userId);
    }
    
    if (contentType) {
      conditions.push(`c.content_type = $${paramIndex++}`);
      params.push(contentType);
    }
    
    if (search) {
      conditions.push(`(
        to_tsvector('english', c.title) @@ plainto_tsquery('english', $${paramIndex}) OR
        to_tsvector('english', c.body) @@ plainto_tsquery('english', $${paramIndex})
      )`);
      params.push(search);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Build ORDER BY clause
    let orderByClause;
    let selectExtras = '';
    
    switch (sortBy) {
      case 'popular':
        selectExtras = `,
          (c.view_count * 1 + c.like_count * 5 + c.share_count * 10) as popularity_score`;
        // DÜZELTME: Artık dış sorguda fc kullanıyoruz
        orderByClause = 'ORDER BY fc.popularity_score DESC';
        break;
        
      case 'trending':
        selectExtras = `,
          (c.view_count * 1 + c.like_count * 5) / (EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 + 2) as trending_score`;
        // DÜZELTME: fc üzerinden sırala
        orderByClause = 'ORDER BY fc.trending_score DESC';
        break;
        
      default: // recent
        // DÜZELTME: c.created_at değil, fc.created_at
        orderByClause = 'ORDER BY fc.created_at DESC';
    }
    
    const queryText = `
      WITH filtered_contents AS (
        SELECT 
          c.id,
          c.title,
          c.slug,
          c.body,
          c.content_type,
          c.view_count,
          c.like_count,
          c.comment_count,
          c.created_at,
          u.username,
          u.avatar_url,
          cat.name as category_name,
          cat.slug as category_slug
          ${selectExtras}
        FROM contents c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE ${whereClause}
      )
      SELECT fc.*
      FROM filtered_contents fc
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    

    // Counted separately: reading the total off the first row made an
    // out-of-range page report total 0 instead of the real count.
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
         FROM contents c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN categories cat ON c.category_id = cat.id
        WHERE ${whereClause}`,
      [...params]
    );
    const total = countResult.rows[0].total;

    // The keyword path never logged, so search_logs only ever held
    // search_type='semantic' and the search analytics were half blind.
    if (search) {
      this.logSearch(search, 'keyword', total, filters.viewerId ?? null).catch(console.error);
    }

    params.push(limit, offset);
    const result = await query(queryText, params);

    return {
      contents: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  /**
   * Semantic Search using pgvector
   * This is the AI-powered search feature!
   */
  async semanticSearch(searchQuery, options = {}) {
    const { limit = 20, categoryId } = options;
    
    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(searchQuery);
    const embeddingStr = formatEmbeddingForDB(queryEmbedding);
    
    // Build conditions
    const conditions = ["c.status = 'published'"];
    const params = [embeddingStr, limit];
    let paramIndex = 3;
    
    if (categoryId) {
      conditions.push(`c.category_id = $${paramIndex++}`);
      params.push(categoryId);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Vector similarity search with cosine distance
    const result = await query(
      `SELECT 
         c.id,
         c.title,
         c.slug,
         c.body,
         c.content_type,
         c.view_count,
         c.like_count,
         u.username,
         u.avatar_url,
         cat.name as category_name,
         1 - (c.embedding <=> $1::vector) as similarity_score
       FROM contents c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE ${whereClause}
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      params
    );
    
    // Log search
    this.logSearch(searchQuery, 'semantic', result.rows.length).catch(console.error);
    
    return result.rows;
  }
  
  /**
   * Get popular contents from materialized view
   * This uses the pre-computed materialized view for performance
   */
  async getPopularContents(limit = 10, categoryId = null) {
    let queryText = `
      SELECT * FROM mv_popular_contents
      WHERE 1=1
    `;
    const params = [];
    
    if (categoryId) {
      queryText += ` AND category_id = $1`;
      params.push(categoryId);
    }
    
    queryText += ` ORDER BY popularity_score DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await query(queryText, params);
    return result.rows;
  }
  
  /**
   * Get trending contents
   * Uses the trending materialized view
   */
  async getTrendingContents(limit = 10) {
    const result = await query(
      `SELECT * FROM mv_trending_contents
       ORDER BY trend_percentage DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows;
  }
  
  /**
   * Get content analytics using window functions
   * Shows how content performs compared to others in same category
   */
  async getContentAnalytics(contentId) {
    const result = await query(
      `WITH content_stats AS (
         SELECT 
           c.id,
           c.title,
           c.category_id,
           c.view_count,
           c.like_count,
           c.created_at,
           -- Rank within category
           RANK() OVER (
             PARTITION BY c.category_id 
             ORDER BY c.view_count DESC
           ) as rank_in_category,
           -- Total contents in category
           COUNT(*) OVER (PARTITION BY c.category_id) as total_in_category,
           -- Compare with previous day's views using LAG
           LAG(c.view_count) OVER (
             PARTITION BY c.id 
             ORDER BY DATE(c.updated_at)
           ) as previous_views,
           -- Average views in category
           AVG(c.view_count) OVER (PARTITION BY c.category_id) as avg_views_in_category
         FROM contents c
         WHERE c.status = 'published'
       ),
       recent_performance AS (
         SELECT 
           content_id,
           COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE - 7) as views_last_7_days,
           COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE - 1) as views_yesterday,
           COUNT(*) FILTER (WHERE event_date = CURRENT_DATE) as views_today
         FROM content_events
         WHERE content_id = $1 AND event_type = 'view'
         GROUP BY content_id
       )
       SELECT 
         cs.*,
         rp.views_last_7_days,
         rp.views_yesterday,
         rp.views_today,
         CASE 
           WHEN rp.views_yesterday > 0 
           THEN ((rp.views_today::float - rp.views_yesterday::float) / rp.views_yesterday::float * 100)
           ELSE 0
         END as daily_growth_percentage
       FROM content_stats cs
       LEFT JOIN recent_performance rp ON cs.id = rp.content_id
       WHERE cs.id = $1`,
      [contentId]
    );
    
    return result.rows[0];
  }
  
  /**
   * Update content
   */
  async updateContent(contentId, userId, updates) {
    const { title, body, categoryId, status } = updates;
    
    return transaction(async (client) => {
      // Verify ownership
      const checkResult = await client.query(
        'SELECT id FROM contents WHERE id = $1 AND user_id = $2',
        [contentId, userId]
      );
      
      if (checkResult.rows.length === 0) {
        throw new Error('Content not found or unauthorized');
      }
      
      // Update embedding if title or body changed
      let embeddingStr = null;
      if (title || body) {
        const currentContent = await client.query(
          'SELECT title, body FROM contents WHERE id = $1',
          [contentId]
        );
        const current = currentContent.rows[0];
        const newTitle = title || current.title;
        const newBody = body || current.body;
        
        const embeddingText = prepareContentForEmbedding(newTitle, newBody);
        const embedding = await generateEmbedding(embeddingText);
        embeddingStr = formatEmbeddingForDB(embedding);
      }
      
      // Build update query dynamically
      const updateFields = [];
      const params = [contentId];
      let paramIndex = 2;
      
      if (title) {
        updateFields.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      if (body) {
        updateFields.push(`body = $${paramIndex++}`);
        params.push(body);
      }
      if (categoryId) {
        updateFields.push(`category_id = $${paramIndex++}`);
        params.push(categoryId);
      }
      if (status) {
        updateFields.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (embeddingStr) {
        updateFields.push(`embedding = $${paramIndex++}`);
        params.push(embeddingStr);
      }
      
      // Without this, an update carrying no known field emits
      // "SET , updated_at = NOW()" and Postgres rejects it as a syntax error.
      if (updateFields.length === 0) {
        const err = new Error('No updatable fields provided');
        err.status = 400;
        throw err;
      }

      const result = await client.query(
        `UPDATE contents 
         SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING id, user_id, category_id, title, slug, body, content_type,
                   status, view_count, like_count, comment_count, share_count,
                   created_at, updated_at, published_at`,
        params
      );
      
      // Invalidate cache
      await delCachePattern('cache:*contents*');
      
      return result.rows[0];
    });
  }
  
  /**
   * Delete content
   */
  async deleteContent(contentId, userId) {
    // createContent increments tags.usage_count, so the delete has to give it
    // back -- otherwise the counter only ever climbs. Done before the row goes,
    // because the content_tags rows disappear with it via ON DELETE CASCADE.
    const result = await transaction(async (client) => {
      await client.query(
        `UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0)
          WHERE id IN (SELECT tag_id FROM content_tags WHERE content_id = $1)`,
        [contentId]
      );
      return client.query(
        'DELETE FROM contents WHERE id = $1 AND user_id = $2 RETURNING id',
        [contentId, userId]
      );
    });

    if (result.rows.length === 0) {
      throw new Error('Content not found or unauthorized');
    }
    
    // Invalidate cache
    await delCachePattern('cache:*contents*');
    
    return true;
  }
  
  /**
   * Log content event (view, like, share)
   */
  async logEvent(contentId, userId, eventType, metadata = {}) {
    await query(
      `INSERT INTO content_events (content_id, user_id, event_type, metadata)
       VALUES ($1, $2, $3, $4)`,
      [contentId, userId, eventType, JSON.stringify(metadata)]
    );
  }
  
  /**
   * Log search query
   */
  async logSearch(searchQuery, searchType, resultsCount, userId = null) {
    await query(
      `INSERT INTO search_logs (query, search_type, results_count, user_id)
       VALUES ($1, $2, $3, $4)`,
      [searchQuery, searchType, resultsCount, userId]
    );
  }
  
  /**
   * Bookmark content
   */
  async bookmarkContent(userId, contentId) {
    await query(
      `INSERT INTO bookmarks (user_id, content_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, contentId]
    );
  }
  
  /**
   * Remove bookmark
   */
  async removeBookmark(userId, contentId) {
    await query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND content_id = $2',
      [userId, contentId]
    );
  }
  
  /**
   * Get user's bookmarks
   */
  async getUserBookmarks(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const result = await query(
      `SELECT 
         c.id,
           c.user_id,
           c.category_id,
           c.title,
           c.slug,
           c.body,
           c.content_type,
           c.status,
           c.view_count,
           c.like_count,
           c.comment_count,
           c.share_count,
           c.created_at,
           c.updated_at,
           c.published_at,
         u.username,
         cat.name as category_name,
         b.created_at as bookmarked_at
       FROM bookmarks b
       JOIN contents c ON b.content_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    
    return result.rows;
  }
}

module.exports = new ContentService();
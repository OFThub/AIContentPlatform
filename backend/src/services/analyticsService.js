const { query } = require('../config/database');

/**
 * Analytics Service
 * 
 * Bu service'te:
 * - Window Functions (ROW_NUMBER, RANK, LAG, LEAD)
 * - CTEs (Common Table Expressions)
 * - Partitioning kullanımı
 * - Materialized Views'dan veri çekme
 */

class AnalyticsService {
  /**
   * Get trending contents
   * Uses LAG window function to compare with previous day
   */
  async getTrendingAnalysis(days = 7, limit = 20) {
    const result = await query(
      `WITH daily_views AS (
         SELECT 
           content_id,
           event_date,
           COUNT(*) as view_count,
           LAG(COUNT(*)) OVER (
             PARTITION BY content_id 
             ORDER BY event_date
           ) as previous_day_views
         FROM content_events
         WHERE event_type = 'view' 
           AND event_date >= CURRENT_DATE - $1
         GROUP BY content_id, event_date
       ),
       trend_scores AS (
         SELECT 
           content_id,
           SUM(view_count) as total_views,
           AVG(view_count) as avg_daily_views,
           MAX(view_count) as peak_views,
           -- Calculate trend: (current - previous) / previous
           AVG(
             CASE 
               WHEN previous_day_views > 0 
               THEN (view_count - previous_day_views)::float / previous_day_views * 100
               ELSE 0
             END
           ) as avg_daily_growth_percent
         FROM daily_views
         GROUP BY content_id
       )
       SELECT 
         c.id,
         c.title,
         c.slug,
         cat.name as category_name,
         u.username,
         ts.total_views,
         ts.avg_daily_views,
         ts.peak_views,
         ts.avg_daily_growth_percent,
         RANK() OVER (ORDER BY ts.avg_daily_growth_percent DESC) as trend_rank
       FROM trend_scores ts
       JOIN contents c ON ts.content_id = c.id
       JOIN users u ON c.user_id = u.id
       LEFT JOIN categories cat ON c.category_id = cat.id
       WHERE c.status = 'published'
         AND ts.total_views >= 10 -- Minimum threshold
       ORDER BY ts.avg_daily_growth_percent DESC
       LIMIT $2`,
      [days, limit]
    );
    
    return result.rows;
  }
  
  /**
   * Get top performing contents by category
   * Uses ROW_NUMBER() to rank within each category
   */
  async getTopContentsByCategory(limit = 5) {
    const result = await query(
      `WITH ranked_contents AS (
         SELECT 
           c.id,
           c.title,
           c.slug,
           c.view_count,
           c.like_count,
           c.category_id,
           cat.name as category_name,
           u.username,
           ROW_NUMBER() OVER (
             PARTITION BY c.category_id 
             ORDER BY (c.view_count * 1 + c.like_count * 5) DESC
           ) as rank_in_category
         FROM contents c
         JOIN categories cat ON c.category_id = cat.id
         JOIN users u ON c.user_id = u.id
         WHERE c.status = 'published'
       )
       SELECT *
       FROM ranked_contents
       WHERE rank_in_category <= $1
       ORDER BY category_name, rank_in_category`,
      [limit]
    );
    
    // Group by category
    const grouped = result.rows.reduce((acc, row) => {
      const catName = row.category_name;
      if (!acc[catName]) {
        acc[catName] = [];
      }
      acc[catName].push(row);
      return acc;
    }, {});
    
    return grouped;
  }
  
  /**
   * Get user leaderboard
   * Ranks users by reputation and content performance
   */
  async getUserLeaderboard(categoryId = null, limit = 50) {
    let categoryCondition = '';
    const params = [limit];
    
    if (categoryId) {
      categoryCondition = 'AND c.category_id = $2';
      params.push(categoryId);
    }
    
    const result = await query(
      `WITH user_stats AS (
         SELECT 
           u.id,
           u.username,
           u.avatar_url,
           u.reputation_score,
           COUNT(DISTINCT c.id) as content_count,
           SUM(c.view_count) as total_views,
           SUM(c.like_count) as total_likes,
           AVG(c.view_count) as avg_views_per_content,
           -- Consistency score: standard deviation of views
           STDDEV(c.view_count) as view_consistency
         FROM users u
         LEFT JOIN contents c ON u.id = c.user_id AND c.status = 'published'
         WHERE 1=1 ${categoryCondition}
         GROUP BY u.id, u.username, u.avatar_url, u.reputation_score
         HAVING COUNT(c.id) > 0
       )
       SELECT 
         *,
         RANK() OVER (ORDER BY reputation_score DESC) as overall_rank,
         RANK() OVER (ORDER BY total_views DESC) as views_rank,
         RANK() OVER (ORDER BY total_likes DESC) as likes_rank,
         RANK() OVER (ORDER BY avg_views_per_content DESC) as avg_views_rank
       FROM user_stats
       ORDER BY reputation_score DESC
       LIMIT $1`,
      params
    );
    
    return result.rows;
  }
  
  /**
   * Get content performance over time
   * Shows daily metrics with moving averages
   */
  async getContentPerformanceTimeseries(contentId, days = 30) {
    const result = await query(
      `WITH daily_metrics AS (
         SELECT 
           event_date,
           COUNT(*) FILTER (WHERE event_type = 'view') as views,
           COUNT(*) FILTER (WHERE event_type = 'like') as likes,
           COUNT(*) FILTER (WHERE event_type = 'share') as shares
         FROM content_events
         WHERE content_id = $1
           AND event_date >= CURRENT_DATE - $2
         GROUP BY event_date
         ORDER BY event_date
       )
       SELECT 
         event_date,
         views,
         likes,
         shares,
         -- 7-day moving average
         AVG(views) OVER (
           ORDER BY event_date 
           ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
         ) as views_7day_avg,
         -- Cumulative sum
         SUM(views) OVER (
           ORDER BY event_date 
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) as cumulative_views,
         -- Compare with previous day
         LAG(views) OVER (ORDER BY event_date) as previous_day_views,
         -- Compare with next day (for context)
         LEAD(views) OVER (ORDER BY event_date) as next_day_views
       FROM daily_metrics`,
      [contentId, days]
    );
    
    return result.rows;
  }
  
  /**
   * Get search analytics
   * Most searched terms, search trends
   */
  async getSearchAnalytics(days = 7, limit = 20) {
    const result = await query(
      `WITH search_counts AS (
         SELECT 
           query,
           search_type,
           COUNT(*) as search_count,
           AVG(results_count) as avg_results,
           DATE(created_at) as search_date
         FROM search_logs
         WHERE created_at >= NOW() - $1 * INTERVAL '1 day'
         GROUP BY query, search_type, DATE(created_at)
       ),
       ranked_searches AS (
         SELECT 
           query,
           search_type,
           SUM(search_count) as total_searches,
           AVG(avg_results) as avg_results,
           RANK() OVER (ORDER BY SUM(search_count) DESC) as popularity_rank,
           -- Calculate trend
           SUM(search_count) FILTER (
             WHERE search_date >= CURRENT_DATE - 1
           ) as searches_today,
           SUM(search_count) FILTER (
             WHERE search_date < CURRENT_DATE - 1
           ) as searches_before
         FROM search_counts
         GROUP BY query, search_type
       )
       SELECT 
         query,
         search_type,
         total_searches,
         avg_results,
         popularity_rank,
         searches_today,
         searches_before,
         CASE 
           WHEN searches_before > 0 
           THEN ((searches_today - searches_before)::float / searches_before * 100)
           ELSE 100
         END as trend_percentage
       FROM ranked_searches
       WHERE total_searches >= 2 -- Minimum threshold
       ORDER BY total_searches DESC
       LIMIT $2`,
      [days, limit]
    );
    
    return result.rows;
  }
  
  /**
   * Get category analytics
   * Category performance comparison
   */
  async getCategoryAnalytics() {
    const result = await query(
      `WITH category_stats AS (
         SELECT 
           cat.id,
           cat.name,
           cat.slug,
           COUNT(DISTINCT c.id) as content_count,
           COUNT(DISTINCT c.user_id) as unique_authors,
           SUM(c.view_count) as total_views,
           SUM(c.like_count) as total_likes,
           AVG(c.view_count) as avg_views_per_content,
           MAX(c.view_count) as max_views
         FROM categories cat
         LEFT JOIN contents c ON cat.id = c.category_id AND c.status = 'published'
         GROUP BY cat.id, cat.name, cat.slug
       )
       SELECT 
         *,
         RANK() OVER (ORDER BY content_count DESC) as content_count_rank,
         RANK() OVER (ORDER BY total_views DESC) as total_views_rank,
         RANK() OVER (ORDER BY avg_views_per_content DESC) as avg_views_rank,
         -- Percentile
         PERCENT_RANK() OVER (ORDER BY total_views) as views_percentile
       FROM category_stats
       ORDER BY total_views DESC`
    );
    
    return result.rows;
  }
  
  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId) {
    const result = await query(
      `WITH user_activity AS (
         SELECT 
           DATE(created_at) as activity_date,
           COUNT(*) FILTER (WHERE event_type = 'view') as views,
           COUNT(*) FILTER (WHERE event_type = 'like') as likes,
           COUNT(*) FILTER (WHERE event_type = 'share') as shares
         FROM content_events
         WHERE user_id = $1
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
       ),
       content_creation AS (
         SELECT 
           DATE(created_at) as creation_date,
           COUNT(*) as contents_created
         FROM contents
         WHERE user_id = $1
           AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at)
       )
       SELECT 
         COALESCE(ua.activity_date, cc.creation_date) as date,
         COALESCE(ua.views, 0) as views,
         COALESCE(ua.likes, 0) as likes,
         COALESCE(ua.shares, 0) as shares,
         COALESCE(cc.contents_created, 0) as contents_created,
         -- Running total
         SUM(COALESCE(cc.contents_created, 0)) OVER (
           ORDER BY COALESCE(ua.activity_date, cc.creation_date)
         ) as cumulative_contents
       FROM user_activity ua
       FULL OUTER JOIN content_creation cc 
         ON ua.activity_date = cc.creation_date
       ORDER BY date DESC`,
      [userId]
    );
    
    return result.rows;
  }
  
  /**
   * Refresh materialized views
   * Should be called periodically (e.g., via cron)
   */
  async refreshMaterializedViews() {
    try {
      await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_contents');
      await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_contents');
      await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_authors_by_category');
      
      console.log('✅ Materialized views refreshed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error refreshing materialized views:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();
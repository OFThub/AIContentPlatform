-- analyticsService.refreshMaterializedViews runs
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_authors_by_category,
-- but init.sql only created a non-unique index on it. Postgres rejects a
-- concurrent refresh without a unique index, so POST /api/analytics/refresh-views
-- returned 500 every single time.
-- The view GROUPs BY cat.id, u.id, so that pair is unique by construction.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_authors_unique
    ON mv_top_authors_by_category (category_id, user_id);

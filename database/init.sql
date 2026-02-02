-- PostgreSQL initialization script
-- AI Content Platform Database

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search optimization

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    reputation_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_reputation ON users(reputation_score DESC);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CONTENTS TABLE (Ana içerik tablosu)
-- ============================================
CREATE TABLE contents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    body TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'article', -- article, note, post, video
    status VARCHAR(20) DEFAULT 'published', -- draft, published, archived
    
    -- Metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- AI Embedding for semantic search
    embedding vector(1536), -- OpenAI ada-002 dimension
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_contents_user ON contents(user_id);
CREATE INDEX idx_contents_category ON contents(category_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_type ON contents(content_type);
CREATE INDEX idx_contents_created ON contents(created_at DESC);
CREATE INDEX idx_contents_views ON contents(view_count DESC);
CREATE INDEX idx_contents_likes ON contents(like_count DESC);

-- Full-text search index
CREATE INDEX idx_contents_title_search ON contents USING gin(to_tsvector('english', title));
CREATE INDEX idx_contents_body_search ON contents USING gin(to_tsvector('english', body));

-- Vector similarity search index (HNSW for performance)
CREATE INDEX idx_contents_embedding ON contents USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- CONTENT_EVENTS TABLE (Partitioned for scalability)
-- ============================================
CREATE TABLE content_events (
    id BIGSERIAL,
    content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- view, like, share, comment
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    PRIMARY KEY (id, event_date)
) PARTITION BY RANGE (event_date);

-- Create partitions for current and next months
CREATE TABLE content_events_2026_02 PARTITION OF content_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE content_events_2026_03 PARTITION OF content_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_events_content ON content_events(content_id, event_date);
CREATE INDEX idx_events_type ON content_events(event_type, event_date);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_content ON comments(content_id, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

-- ============================================
-- TAGS TABLE & CONTENT_TAGS (Many-to-Many)
-- ============================================
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0
);

CREATE TABLE content_tags (
    content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, tag_id)
);

CREATE INDEX idx_content_tags_content ON content_tags(content_id);
CREATE INDEX idx_content_tags_tag ON content_tags(tag_id);

-- ============================================
-- BOOKMARKS TABLE
-- ============================================
CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, content_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id, created_at DESC);

-- ============================================
-- SEARCH_LOGS TABLE (For analytics)
-- ============================================
CREATE TABLE search_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    search_type VARCHAR(20), -- keyword, semantic
    results_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_logs_created ON search_logs(created_at DESC);
CREATE INDEX idx_search_logs_query ON search_logs USING gin(to_tsvector('english', query));

-- ============================================
-- MATERIALIZED VIEWS
-- ============================================

-- 1. Popular Contents (Last 7 days)
CREATE MATERIALIZED VIEW mv_popular_contents AS
WITH recent_events AS (
    SELECT 
        content_id,
        COUNT(*) FILTER (WHERE event_type = 'view') as views,
        COUNT(*) FILTER (WHERE event_type = 'like') as likes,
        COUNT(*) FILTER (WHERE event_type = 'share') as shares
    FROM content_events
    WHERE event_date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY content_id
)
SELECT 
    c.id,
    c.title,
    c.slug,
    c.category_id,
    cat.name as category_name,
    c.user_id,
    u.username,
    COALESCE(re.views, 0) as week_views,
    COALESCE(re.likes, 0) as week_likes,
    COALESCE(re.shares, 0) as week_shares,
    -- Popularity score: weighted sum
    (COALESCE(re.views, 0) * 1 + 
     COALESCE(re.likes, 0) * 5 + 
     COALESCE(re.shares, 0) * 10) as popularity_score,
    c.created_at
FROM contents c
LEFT JOIN recent_events re ON c.id = re.content_id
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'published'
ORDER BY popularity_score DESC;

CREATE UNIQUE INDEX idx_mv_popular_id ON mv_popular_contents(id);

-- 2. Trending Contents (Rising popularity)
CREATE MATERIALIZED VIEW mv_trending_contents AS
WITH yesterday_stats AS (
    SELECT 
        content_id,
        COUNT(*) as yesterday_views
    FROM content_events
    WHERE event_date = CURRENT_DATE - INTERVAL '1 day'
        AND event_type = 'view'
    GROUP BY content_id
),
today_stats AS (
    SELECT 
        content_id,
        COUNT(*) as today_views
    FROM content_events
    WHERE event_date = CURRENT_DATE
        AND event_type = 'view'
    GROUP BY content_id
)
SELECT 
    c.id,
    c.title,
    c.slug,
    c.category_id,
    cat.name as category_name,
    COALESCE(t.today_views, 0) as today_views,
    COALESCE(y.yesterday_views, 0) as yesterday_views,
    -- Trend score: percentage increase
    CASE 
        WHEN COALESCE(y.yesterday_views, 0) = 0 THEN 100.0
        ELSE ((COALESCE(t.today_views, 0)::FLOAT - COALESCE(y.yesterday_views, 0)::FLOAT) / 
              COALESCE(y.yesterday_views, 0)::FLOAT * 100)
    END as trend_percentage,
    c.created_at
FROM contents c
LEFT JOIN today_stats t ON c.id = t.content_id
LEFT JOIN yesterday_stats y ON c.id = y.content_id
LEFT JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'published'
    AND COALESCE(t.today_views, 0) > 0
ORDER BY trend_percentage DESC;

CREATE UNIQUE INDEX idx_mv_trending_id ON mv_trending_contents(id);

-- 3. Top Authors by Category
CREATE MATERIALIZED VIEW mv_top_authors_by_category AS
SELECT 
    cat.id as category_id,
    cat.name as category_name,
    u.id as user_id,
    u.username,
    u.avatar_url,
    COUNT(c.id) as content_count,
    SUM(c.view_count) as total_views,
    SUM(c.like_count) as total_likes,
    AVG(c.view_count) as avg_views,
    ROW_NUMBER() OVER (PARTITION BY cat.id ORDER BY SUM(c.view_count) DESC) as rank_in_category
FROM contents c
JOIN users u ON c.user_id = u.id
JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'published'
GROUP BY cat.id, cat.name, u.id, u.username, u.avatar_url
HAVING COUNT(c.id) >= 3; -- At least 3 contents

CREATE INDEX idx_mv_top_authors_category ON mv_top_authors_by_category(category_id, rank_in_category);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update content metrics
CREATE OR REPLACE FUNCTION update_content_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'view' THEN
        UPDATE contents SET view_count = view_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.event_type = 'like' THEN
        UPDATE contents SET like_count = like_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.event_type = 'share' THEN
        UPDATE contents SET share_count = share_count + 1 WHERE id = NEW.content_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_metrics
AFTER INSERT ON content_events
FOR EACH ROW
EXECUTE FUNCTION update_content_metrics();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_contents_updated_at BEFORE UPDATE ON contents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert categories
INSERT INTO categories (name, slug, description, icon) VALUES
('Technology', 'technology', 'Tech news, tutorials, and innovations', '💻'),
('Science', 'science', 'Scientific discoveries and research', '🔬'),
('Business', 'business', 'Business strategies and market insights', '💼'),
('Health', 'health', 'Health tips and medical information', '🏥'),
('Entertainment', 'entertainment', 'Movies, music, and pop culture', '🎬'),
('Sports', 'sports', 'Sports news and analysis', '⚽'),
('Education', 'education', 'Learning resources and tutorials', '📚'),
('Lifestyle', 'lifestyle', 'Life hacks and personal development', '🌟');

-- Insert sample users
INSERT INTO users (username, email, password_hash, full_name, bio, reputation_score) VALUES
('john_doe', 'john@example.com', '$2b$10$encrypted_password_hash', 'John Doe', 'Tech enthusiast and blogger', 150),
('jane_smith', 'jane@example.com', '$2b$10$encrypted_password_hash', 'Jane Smith', 'Science writer', 200),
('mike_wilson', 'mike@example.com', '$2b$10$encrypted_password_hash', 'Mike Wilson', 'Business analyst', 180);

-- Insert sample tags
INSERT INTO tags (name, slug, usage_count) VALUES
('AI', 'ai', 45),
('Machine Learning', 'machine-learning', 38),
('JavaScript', 'javascript', 52),
('Python', 'python', 60),
('React', 'react', 40),
('Node.js', 'nodejs', 35),
('Data Science', 'data-science', 42),
('Cloud', 'cloud', 30);

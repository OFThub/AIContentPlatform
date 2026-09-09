-- Switched from OpenAI ada-002 (1536) to Gemini gemini-embedding-001.
-- Gemini defaults to 3072 dimensions, but pgvector's HNSW index supports at
-- most 2000, so the client requests dimensions: 768 and the column must match.
-- No data is lost: no embeddings had ever been generated.
DROP INDEX IF EXISTS idx_contents_embedding;
ALTER TABLE contents ALTER COLUMN embedding TYPE vector(768) USING NULL;
CREATE INDEX idx_contents_embedding ON contents
    USING hnsw (embedding vector_cosine_ops);

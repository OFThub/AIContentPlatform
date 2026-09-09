#!/usr/bin/env node
/**
 * Idempotent demo seed.
 *
 * init.sql inserts three users whose password_hash is the literal string
 * '$2b$10$encrypted_password_hash', so nobody could ever log in. This replaces
 * them with real bcrypt hashes and fills the site with enough content and
 * activity that trending, popular and the leaderboard have something to rank.
 *
 *   npm run seed
 */
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { pool } = require('../src/config/database');
const {
  isAiEnabled,
  generateEmbedding,
  formatEmbeddingForDB,
  prepareContentForEmbedding,
} = require('../src/config/openai');

const PASSWORD = 'demo1234';

const USERS = [
  { username: 'demo', email: 'demo@example.com', full_name: 'Demo User', bio: 'The account in the README.', role: 'admin', reputation_score: 320 },
  { username: 'john_doe', email: 'john@example.com', full_name: 'John Doe', bio: 'Tech enthusiast and blogger', role: 'user', reputation_score: 150 },
  { username: 'jane_smith', email: 'jane@example.com', full_name: 'Jane Smith', bio: 'Science writer', role: 'user', reputation_score: 200 },
  { username: 'mike_wilson', email: 'mike@example.com', full_name: 'Mike Wilson', bio: 'Business analyst', role: 'user', reputation_score: 180 },
];

// Grouped so each author clears the HAVING COUNT(c.id) >= 3 bar in
// mv_top_authors_by_category -- otherwise that view is permanently empty.
const CONTENTS = [
  ['demo', 'Technology', 'Vector Databases Explained', 'Vector databases index embeddings so you can search by meaning instead of keywords. pgvector adds this to Postgres with an HNSW index, which trades a little recall for a large speed win.', ['AI', 'Data Science']],
  ['demo', 'Technology', 'Why HNSW Beats IVFFlat for Small Datasets', 'HNSW builds a navigable small-world graph. It costs more to build but needs no training step, which makes it the better default until your table passes a few million rows.', ['AI', 'Data Science']],
  ['demo', 'Technology', 'Caching Strategies for Read-Heavy APIs', 'Cache-aside keeps the database authoritative and the cache disposable. The subtle part is invalidation scope: too broad and you thrash, too narrow and you serve stale rows.', ['Node.js', 'Cloud']],
  ['demo', 'Education', 'Reading a Query Plan Without Fear', 'EXPLAIN ANALYZE tells you what Postgres actually did, not what it planned to do. Start at the innermost node and work outward.', ['Data Science']],
  ['demo', 'Education', 'SQL Window Functions in Practice', 'Window functions let you rank, lag and total without collapsing rows. They replace most of the self-joins you were about to write.', ['Data Science']],
  ['demo', 'Education', 'Materialized Views and When They Lie', 'A materialized view is a cached answer. It is only as fresh as its last refresh, so treat staleness as a product decision rather than an implementation detail.', ['Data Science']],
  ['john_doe', 'Technology', 'Node.js Streams Without Tears', 'Streams are backpressure-aware pipes. Once you stop treating them as arrays that arrive late, the API stops feeling hostile.', ['Node.js', 'JavaScript']],
  ['john_doe', 'Technology', 'Express 5 Migration Notes', 'Express 5 forwards async rejections to the error handler, which removes most of the try/catch boilerplate that v4 required in every route.', ['Node.js', 'JavaScript']],
  ['john_doe', 'Technology', 'Rate Limiting That Survives a Proxy', 'If you do not set trust proxy, every client behind your load balancer shares one bucket and your rate limiter protects nothing.', ['Node.js', 'Cloud']],
  ['john_doe', 'Lifestyle', 'The Case for Boring Tooling', 'Boring tools have long changelogs and short incident reports. That is the whole argument.', ['Cloud']],
  ['jane_smith', 'Science', 'How Embeddings Capture Meaning', 'An embedding is a learned coordinate system where distance approximates relatedness. It is not understanding, but it is remarkably useful.', ['AI', 'Machine Learning']],
  ['jane_smith', 'Science', 'Cosine Similarity, Intuitively', 'Cosine similarity ignores magnitude and measures direction, which is why it survives documents of wildly different lengths.', ['Machine Learning']],
  ['jane_smith', 'Science', 'Dimensionality and the Curse Thereof', 'In high dimensions everything is far from everything else. Reducing dimensions is often less about speed and more about restoring meaningful distance.', ['Machine Learning', 'Data Science']],
  ['jane_smith', 'Health', 'Sleep Debt Is Not a Metaphor', 'Recovery sleep restores some measures quickly and others slowly, which is why one long weekend rarely undoes a bad fortnight.', ['Data Science']],
  ['mike_wilson', 'Business', 'Unit Economics Before Growth', 'Growth multiplies whatever margin you already have. If that number is negative, scale is the problem rather than the solution.', ['Cloud']],
  ['mike_wilson', 'Business', 'Reading a Cohort Retention Curve', 'A curve that flattens has found a durable audience. One that keeps sloping has found a leaky bucket.', ['Data Science']],
  ['mike_wilson', 'Business', 'Pricing Is a Product Decision', 'Price communicates who the product is for. Changing it changes the customer, not just the revenue line.', ['Cloud']],
  ['mike_wilson', 'Entertainment', 'Why Streaming Catalogues Keep Shrinking', 'Licensing windows expire and renewals are priced on current demand, so a catalogue is a lease rather than a library.', ['Cloud']],
  ['demo', 'Sports', 'Expected Goals, Explained Slowly', 'xG scores the quality of a chance rather than its outcome. Over a season it predicts better than goals do, which is exactly why it annoys people.', ['Data Science']],
  ['jane_smith', 'Education', 'Learning by Rebuilding', 'Reimplementing a tool you rely on is the fastest way to discover which of its features are essential and which are habit.', ['Machine Learning']],
];

const slugFor = (title) => slugify(title, { lower: true, strict: true });

const seed = async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Upsert on email so re-running never duplicates, and the placeholder hashes
  // from init.sql get replaced with a usable one.
  const userIds = {};
  for (const u of USERS) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, bio, role, reputation_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name     = EXCLUDED.full_name,
             bio           = EXCLUDED.bio,
             role          = EXCLUDED.role
       RETURNING id`,
      [u.username, u.email, passwordHash, u.full_name, u.bio, u.role, u.reputation_score]
    );
    userIds[u.username] = rows[0].id;
  }
  console.log(`users: ${Object.keys(userIds).length} upserted (password for all: ${PASSWORD})`);

  const { rows: cats } = await pool.query('SELECT id, name FROM categories');
  const catIds = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  const { rows: tagRows } = await pool.query('SELECT id, name FROM tags');
  const tagIds = Object.fromEntries(tagRows.map((t) => [t.name, t.id]));

  const aiOn = isAiEnabled();
  if (!aiOn) {
    console.log('GEMINI_API_KEY not set -- seeding without embeddings; semantic search stays empty until it is.');
  }

  let created = 0;
  for (const [author, category, title, body, tagNames] of CONTENTS) {
    let embedding = null;
    if (aiOn) {
      try {
        const vec = await generateEmbedding(prepareContentForEmbedding(title, body));
        embedding = formatEmbeddingForDB(vec);
      } catch (err) {
        console.warn(`  embedding failed for "${title}": ${err.message}`);
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO contents (user_id, category_id, title, slug, body, status, published_at, embedding)
       VALUES ($1,$2,$3,$4,$5,'published',NOW(),$6)
       ON CONFLICT (slug) DO UPDATE
         SET body = EXCLUDED.body, embedding = EXCLUDED.embedding
       RETURNING id, (xmax = 0) AS inserted`,
      [userIds[author], catIds[category] ?? null, title, slugFor(title), body, embedding]
    );
    const contentId = rows[0].id;
    if (rows[0].inserted) created += 1;

    for (const name of tagNames) {
      if (!tagIds[name]) continue;
      await pool.query(
        'INSERT INTO content_tags (content_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [contentId, tagIds[name]]
      );
    }

    // Real events rather than hand-written counters: the triggers derive the
    // view/like/share totals, which also proves the partition fix works.
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM content_events WHERE content_id = $1',
      [contentId]
    );
    if (existing[0].n === 0) {
      const views = 20 + Math.floor(Math.random() * 180);
      const likes = Math.floor(views * (0.05 + Math.random() * 0.2));
      const shares = Math.floor(likes * (0.1 + Math.random() * 0.3));
      const events = [
        ...Array(views).fill('view'),
        ...Array(likes).fill('like'),
        ...Array(shares).fill('share'),
      ];
      for (const type of events) {
        await pool.query(
          'INSERT INTO content_events (content_id, user_id, event_type) VALUES ($1,$2,$3)',
          [contentId, userIds[author], type]
        );
      }
    }
  }
  console.log(`contents: ${created} created, ${CONTENTS.length - created} already present`);

  await pool.query('REFRESH MATERIALIZED VIEW mv_popular_contents');
  await pool.query('REFRESH MATERIALIZED VIEW mv_trending_contents');
  await pool.query('REFRESH MATERIALIZED VIEW mv_top_authors_by_category');
  console.log('materialized views refreshed');

  console.log(`\nSign in with  ${USERS[0].email}  /  ${PASSWORD}`);
  await pool.end();
};

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

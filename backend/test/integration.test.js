const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

/**
 * Runs against a live Postgres + Redis. `docker compose up -d db cache` is
 * enough; CI provides them as service containers. Skipped when DATABASE_URL is
 * absent so the unit suite still runs anywhere.
 */
const LIVE = Boolean(process.env.DATABASE_URL);

let app;
let pool;
let initRedis;
let redisClient;

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

test('integration', { skip: LIVE ? false : 'DATABASE_URL not set' }, async (t) => {
  app = require('../app');
  ({ pool } = require('../src/config/database'));
  ({ initRedis, redisClient } = require('../src/config/redis'));
  await initRedis().catch(() => {});

  const name = 'test_' + uniq();
  const credentials = { username: name, email: name + '@example.com', password: 'testpass123' };
  let token;
  let contentId;

  t.after(async () => {
    await pool.query('DELETE FROM users WHERE username = $1', [name]).catch(() => {});
    await pool.end().catch(() => {});
    await redisClient.quit().catch(() => {});
  });

  await t.test('health responds', async () => {
    const res = await request(app).get('/health').expect(200);
    assert.equal(res.body.success, true);
  });

  await t.test('register then login', async () => {
    await request(app).post('/api/auth/register').send(credentials).expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: credentials.email, password: credentials.password })
      .expect(200);

    // Login accepts the email in the username field; the seed advertises an
    // email address, so this path has to work.
    token = res.body.data.token;
    assert.ok(token);
  });

  await t.test('creating content without an AI key fails cleanly, not with a crash', async () => {
    const res = await request(app)
      .post('/api/contents')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'Test ' + uniq(), body: 'Body text for the test.' });

    // With a key it is created; without one the embedding call is refused.
    // Either way the process must survive and answer.
    assert.ok([201, 500, 503].includes(res.status), 'unexpected status ' + res.status);
    if (res.status === 201) {
      contentId = res.body.data.id;
      assert.equal(res.body.data.embedding, undefined, 'embedding must not be serialised');
    }
  });

  await t.test('regression: an event can be logged with today\'s date', async () => {
    // init.sql shipped partitions covering only 2026-02..2026-04, so every
    // INSERT outside that window failed and all counters stayed at zero.
    const { rows } = await pool.query('SELECT id FROM contents ORDER BY id LIMIT 1');
    if (rows.length === 0) return;

    const before = await pool.query('SELECT view_count FROM contents WHERE id = $1', [rows[0].id]);
    await pool.query(
      "INSERT INTO content_events (content_id, event_type) VALUES ($1, 'view')",
      [rows[0].id]
    );
    const after = await pool.query('SELECT view_count FROM contents WHERE id = $1', [rows[0].id]);

    assert.equal(after.rows[0].view_count, before.rows[0].view_count + 1, 'trigger did not fire');
  });

  await t.test('regression: materialized views refresh concurrently', async () => {
    // mv_top_authors_by_category had no unique index, so CONCURRENTLY always
    // failed and POST /api/analytics/refresh-views returned 500 every time.
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_authors_by_category');
  });

  await t.test('regression: a page past the end reports the real total', async () => {
    const res = await request(app).get('/api/contents?page=99&limit=20').expect(200);
    const { total, totalPages } = res.body.pagination;
    assert.ok(total > 0, 'total collapsed to 0 on an out-of-range page');
    assert.ok(totalPages >= 1);
  });

  await t.test('regression: an update with no known field is rejected as 400', async () => {
    if (!contentId) return;
    const res = await request(app)
      .put('/api/contents/' + contentId)
      .set('Authorization', 'Bearer ' + token)
      .send({});
    assert.equal(res.status, 400);
  });

  await t.test('content is reachable by slug as well as id', async () => {
    const { rows } = await pool.query("SELECT id, slug FROM contents WHERE status='published' LIMIT 1");
    if (rows.length === 0) return;
    const res = await request(app).get('/api/contents/' + rows[0].slug).expect(200);
    assert.equal(res.body.data.id, rows[0].id);
  });

  await t.test('a comment increments comment_count via the trigger', async () => {
    const { rows } = await pool.query("SELECT id FROM contents WHERE status='published' LIMIT 1");
    if (rows.length === 0) return;

    const before = await pool.query('SELECT comment_count FROM contents WHERE id = $1', [rows[0].id]);
    const res = await request(app)
      .post('/api/contents/' + rows[0].id + '/comments')
      .set('Authorization', 'Bearer ' + token)
      .send({ body: 'Integration test comment' })
      .expect(201);

    const after = await pool.query('SELECT comment_count FROM contents WHERE id = $1', [rows[0].id]);
    assert.equal(after.rows[0].comment_count, before.rows[0].comment_count + 1);

    await pool.query('DELETE FROM comments WHERE id = $1', [res.body.data.id]);
  });

  await t.test('unpublished content does not leak through the comment endpoints', async () => {
    // resolveContentId used to skip the status check that getContentById
    // applies, so a draft's comments stayed readable and writable even though
    // the article itself 404s.
    const { rows } = await pool.query("SELECT id, status FROM contents WHERE status='published' LIMIT 1");
    if (rows.length === 0) return;
    const id = rows[0].id;

    await pool.query("UPDATE contents SET status='draft' WHERE id = $1", [id]);
    try {
      await request(app).get('/api/contents/' + id + '/comments').expect(404);
      await request(app)
        .post('/api/contents/' + id + '/comments')
        .set('Authorization', 'Bearer ' + token)
        .send({ body: 'should not be accepted' })
        .expect(404);
    } finally {
      await pool.query("UPDATE contents SET status=$2 WHERE id = $1", [id, rows[0].status]);
    }
  });

  await t.test('refresh-views is admin only', async () => {
    const res = await request(app)
      .post('/api/analytics/refresh-views')
      .set('Authorization', 'Bearer ' + token);
    assert.equal(res.status, 403, 'a normal user must not be able to refresh views');
  });

  await t.test('following yourself is rejected', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', 'Bearer ' + token).expect(200);
    const res = await request(app)
      .post('/api/auth/users/' + me.body.data.id + '/follow')
      .set('Authorization', 'Bearer ' + token);
    assert.equal(res.status, 400);
  });
});

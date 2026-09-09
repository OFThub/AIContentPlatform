#!/usr/bin/env node
/**
 * Minimal forward-only migration runner.
 *
 * database/init.sql is the v1 baseline and only ever runs on an empty volume,
 * so every schema change after it lives here. No new dependency: this uses the
 * `pg` pool the app already ships with.
 *
 *   npm run migrate
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const DIR = path.join(__dirname, '..', '..', 'database', 'migrations');

const run = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.version));

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
  let count = 0;

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      // Each migration is all-or-nothing: a half-applied schema is worse
      // than an unapplied one.
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`applied  ${file}`);
      count += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`FAILED   ${file}: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(count === 0 ? 'up to date, nothing to apply' : `${count} migration(s) applied`);
  await pool.end();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

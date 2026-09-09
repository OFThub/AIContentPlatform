const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool.
 * Pool avantajları: connection reuse, otomatik reconnection, query queue.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * A single idle-client error used to call process.exit(-1) here, so one
 * Postgres restart or network blip killed the whole API with no drain.
 * The pool discards the bad client and reconnects on its own.
 */
pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client:', err.message);
});

/**
 * Awaited at boot. Throws if the database is unreachable, so the process exits
 * instead of listening on a port it cannot serve.
 */
const connectDatabase = async () => {
  await pool.query('SELECT 1');
  console.log('Postgres connected');
  return pool;
};

/**
 * Query wrapper with slow-query logging.
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

/**
 * Transaction wrapper.
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  connectDatabase,
  query,
  transaction
};

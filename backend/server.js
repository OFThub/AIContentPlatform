const app = require('./app');
const { pool, connectDatabase } = require('./src/config/database');
const { redisClient, initRedis } = require('./src/config/redis');

const PORT = process.env.PORT || 3001;

/**
 * Verify both backing services before binding the port. The old boot sequence
 * fired the checks and started listening regardless, so a container with an
 * unreachable database still reported itself as up.
 */
const start = async () => {
  await connectDatabase();
  await initRedis();

  const server = app.listen(PORT, () => {
    console.log(`AI Content Platform API listening on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });

  const shutdown = (signal) => async () => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await pool.end().catch(() => {});
      await redisClient.quit().catch(() => {});
      process.exit(0);
    });
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});

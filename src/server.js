'use strict';
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { sequelize } = require('./models');
const seedRoles = require('./scripts/seedRoles');

const start = async () => {
  // Live-inventory-only mode: the public Zoho catalog needs no database, so we
  // can skip DB connect/sync entirely. Set LIVE_INVENTORY_ONLY=true (or
  // SKIP_DB=true) to run with ZERO database — no SQLite compile, no MySQL.
  // (Login / register / orders are disabled in this mode.)
  const liveOnly = String(process.env.LIVE_INVENTORY_ONLY || process.env.SKIP_DB || '').toLowerCase() === 'true';
  try {
    if (liveOnly) {
      logger.warn('\u26a1 LIVE_INVENTORY_ONLY: running without a database (auth/orders disabled, live inventory only)');
    } else {
      await sequelize.authenticate();
      logger.info('\u2705 Database connection established');

      if (env.NODE_ENV !== 'production') {
        const alter = sequelize.getDialect() !== 'sqlite';
        await sequelize.sync(alter ? { alter: true } : undefined);
        logger.info('\u2705 Models synchronized (dev)');
      }

      await seedRoles();
    }

    const server = app.listen(env.PORT, () =>
      logger.info(`\ud83d\ude80 Server running at ${env.APP_URL} (${env.NODE_ENV}) - docs at ${env.APP_URL}/api/docs`));

    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        if (!liveOnly) { try { await sequelize.close(); } catch (e) { /* ignore */ } }
        process.exit(0);
      });
    };
    ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
  } catch (err) {
    logger.error('\u274c Failed to start server', { stack: err.stack });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection', { reason: String(reason) }));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { stack: err.stack });
  process.exit(1);
});

start();

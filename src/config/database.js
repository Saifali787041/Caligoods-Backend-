'use strict';
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('./logger');

/**
 * Database connection. Three supported modes (auto-detected):
 *
 *  1. Cloud (DATABASE_URL set): Postgres (Supabase session pooler). SSL on by
 *     default. Used on Render.
 *
 *  2. Local SQLite (default when no DATABASE_URL): a zero-setup file database
 *     at DB_STORAGE (default db/caligoods.sqlite). No server, user, password
 *     or grants required - great for local development.
 *
 *  3. Local MySQL (opt-in: DB_DIALECT=mysql): uses the discrete MYSQL_* vars
 *     and the mysql2 driver, as before.
 */

const logging = env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false;
const pool = { max: 10, min: 0, acquire: 30000, idle: 10000 };
const define = { underscored: true, timestamps: true };

let sequelize;

const liveOnly = String(process.env.LIVE_INVENTORY_ONLY || process.env.SKIP_DB || '').toLowerCase() === 'true';

if (liveOnly) {
  // LIVE_INVENTORY_ONLY: the public Zoho catalog needs no database at all, so we
  // use a tiny in-memory stub instead of a real DB. This means NO database
  // driver is loaded (no SQLite compile, no MySQL) and it runs on any Node
  // version. Auth / orders are unavailable in this mode by design.
  const stubModel = () => {
    const M = function StubModel() {};
    Object.assign(M, {
      hasMany() {}, belongsTo() {}, hasOne() {}, belongsToMany() {},
      addHook() {}, beforeCreate() {}, beforeUpdate() {}, afterCreate() {}, beforeSave() {},
      findOne: async () => null, findAll: async () => [], findByPk: async () => null,
      create: async () => ({}), update: async () => [0], destroy: async () => 0,
      count: async () => 0, bulkCreate: async () => [], findOrCreate: async () => [null, false],
      upsert: async () => [{}, true], findAndCountAll: async () => ({ rows: [], count: 0 }),
    });
    return M; // M.prototype exists so model files can attach instance methods
  };
  sequelize = {
    define: () => stubModel(),
    authenticate: async () => {},
    sync: async () => {},
    close: async () => {},
    getDialect: () => 'none',
    literal: (x) => x,
    transaction: async (fn) => (typeof fn === 'function' ? fn({}) : { commit: async () => {}, rollback: async () => {} }),
  };
  logger.warn('DB: LIVE_INVENTORY_ONLY -> no database loaded (auth/orders disabled)');
} else if (env.DATABASE_URL) {
  // SSL on by default for a managed cloud DB; set DB_SSL=false only if you know you don't need it.
  const useSsl = env.DB_SSL !== false;
  sequelize = new Sequelize(env.DATABASE_URL, {
    dialect: 'postgres',
    logging,
    pool,
    define,
    dialectOptions: useSsl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  });
  logger.info('DB: using DATABASE_URL (postgres)');
} else if (env.DB_DIALECT === 'mysql') {
  sequelize = new Sequelize(env.MYSQL_DATABASE, env.MYSQL_USER, env.MYSQL_PASSWORD, {
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    dialect: 'mysql',
    logging,
    pool,
    define,
  });
  logger.info('DB: using discrete MYSQL_* vars (mysql)');
} else {
  // SQLite (default local). Resolve the storage path relative to the backend
  // folder and make sure its directory exists.
  const storage = path.isAbsolute(env.DB_STORAGE)
    ? env.DB_STORAGE
    : path.resolve(process.cwd(), env.DB_STORAGE);
  fs.mkdirSync(path.dirname(storage), { recursive: true });

  try {
    // eslint-disable-next-line global-require
    require.resolve('sqlite3');
  } catch (e) {
    throw new Error(
      'SQLite driver not installed. This project runs the live inventory with '
      + 'LIVE_INVENTORY_ONLY=true (no database needed). To use the full app, either '
      + 'set LIVE_INVENTORY_ONLY=true, or provide a DATABASE_URL (Postgres/MySQL), '
      + 'or run `npm i sqlite3`.',
    );
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging,
    define,
  });
  logger.info(`DB: using SQLite file (${storage})`);
}

module.exports = sequelize;

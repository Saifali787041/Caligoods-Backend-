'use strict';
/* Production database initialization - run ONCE per deploy target (and after
   schema changes). Unlike dev, the server never auto-alters tables in prod.
     npm run db:init
   For an evolving schema, graduate to sequelize-cli migrations. */
require('../config/env');
const { sequelize } = require('../models');
const seedRoles = require('./seedRoles');
const logger = require('../config/logger');

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('DB connection OK');
    await sequelize.sync(); // creates missing tables; does NOT alter existing ones
    logger.info('Tables ensured');
    await seedRoles();
    logger.info('Roles seeded - DB init complete');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    logger.error('DB init failed', { stack: err.stack });
    process.exit(1);
  }
})();

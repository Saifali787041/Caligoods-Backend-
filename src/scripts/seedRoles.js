'use strict';
const { Role } = require('../models');
const { ROLES } = require('../helpers/constants');
const logger = require('../config/logger');

const descriptions = {
  super_admin: 'Full system access, including configuration and user management',
  admin: 'Administrative access to most modules',
  sales_manager: 'Manage sales orders, customers and invoices',
  warehouse_manager: 'Manage inventory, stock, packages and shipments',
  customer_support: 'Read access to orders and customers for support',
  customer: 'Storefront customer account',
};

module.exports = async () => {
  for (const name of Object.values(ROLES)) {
    // eslint-disable-next-line no-await-in-loop
    await Role.findOrCreate({ where: { name }, defaults: { description: descriptions[name] } });
  }
  logger.info('\u2705 Roles seeded');
};

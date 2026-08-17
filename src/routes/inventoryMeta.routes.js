'use strict';
const express = require('express');
const ctrl = require('../controllers/inventory/taxonomy.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate, authorize(...ROLE_GROUPS.ALL_STAFF));

/**
 * @openapi
 * tags:
 *   - name: InventoryMeta
 *     description: Categories, brands and units (derived from items; read-only)
 */

/**
 * @openapi
 * /api/categories:
 *   get:
 *     tags: [InventoryMeta]
 *     summary: Distinct item categories (aggregated from items, cached 5 min)
 *     description: Zoho Inventory has no standalone category resource; values are derived from items. Pass ?refresh=true to bypass the cache.
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Categories with item counts } }
 */
router.get('/categories', ctrl.categories);

/**
 * @openapi
 * /api/brands:
 *   get:
 *     tags: [InventoryMeta]
 *     summary: Distinct item brands (aggregated from items, cached 5 min)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Brands with item counts } }
 */
router.get('/brands', ctrl.brands);

/**
 * @openapi
 * /api/units:
 *   get:
 *     tags: [InventoryMeta]
 *     summary: Distinct units of measure (aggregated from items, cached 5 min)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Units with item counts } }
 */
router.get('/units', ctrl.units);

module.exports = router;

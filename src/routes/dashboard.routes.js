'use strict';
const express = require('express');
const ctrl = require('../controllers/dashboard/dashboard.controller');
const validate = require('../middleware/validate');
const v = require('../validations/dashboard.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate, authorize(...ROLE_GROUPS.ALL_STAFF));

/**
 * @openapi
 * tags:
 *   - name: Dashboard
 *     description: Aggregated metrics (derived from items, orders, invoices, customers; cached). Add ?refresh=true to bypass cache.
 */

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: All metric cards in one call (sales, revenue, counts, low/out-of-stock, customers)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: refresh, schema: { type: string, enum: [true, false] } }]
 *     responses: { 200: { description: Dashboard summary } }
 */
router.get('/summary', validate(v.listQuery), ctrl.summary);

/**
 * @openapi
 * /api/dashboard/sales:
 *   get:
 *     tags: [Dashboard]
 *     summary: Sales totals for today / this week / this month / this year
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Period sales } }
 */
router.get('/sales', validate(v.listQuery), ctrl.sales);

/**
 * @openapi
 * /api/dashboard/top-products:
 *   get:
 *     tags: [Dashboard]
 *     summary: Top-selling products (sampled from recent invoices; includes sampled gross profit)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, maximum: 50 } }
 *       - { in: query, name: sample, schema: { type: integer, maximum: 50, description: number of recent invoices to sample } }
 *     responses: { 200: { description: Top products } }
 */
router.get('/top-products', validate(v.topProductsQuery), ctrl.topProducts);

/**
 * @openapi
 * /api/dashboard/recent-orders:
 *   get: { tags: [Dashboard], summary: Most recent sales orders, security: [{ bearerAuth: [] }], parameters: [{ in: query, name: limit, schema: { type: integer } }], responses: { 200: { description: OK } } }
 * /api/dashboard/pending-orders:
 *   get: { tags: [Dashboard], summary: Pending (open, not closed/void) sales orders, security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/dashboard/cancelled-orders:
 *   get: { tags: [Dashboard], summary: Cancelled/void sales orders, security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/dashboard/low-stock:
 *   get: { tags: [Dashboard], summary: Items at/below reorder level, security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /api/dashboard/out-of-stock:
 *   get: { tags: [Dashboard], summary: Items with no available stock, security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get('/recent-orders', validate(v.listQuery), ctrl.recentOrders);
router.get('/pending-orders', validate(v.listQuery), ctrl.pendingOrders);
router.get('/cancelled-orders', validate(v.listQuery), ctrl.cancelledOrders);
router.get('/low-stock', validate(v.listQuery), ctrl.lowStock);
router.get('/out-of-stock', validate(v.listQuery), ctrl.outOfStock);

module.exports = router;

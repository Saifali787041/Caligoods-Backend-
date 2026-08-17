'use strict';
const express = require('express');
const ctrl = require('../controllers/sales/salesOrder.controller');
const validate = require('../middleware/validate');
const v = require('../validations/salesOrder.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate);

const canRead = authorize(...ROLE_GROUPS.ALL_STAFF);
const canWrite = authorize(...ROLE_GROUPS.SALES_WRITE);

/**
 * @openapi
 * tags:
 *   - name: Orders
 *     description: Sales orders (Zoho /salesorders)
 */

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List sales orders (paginated, filterable)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: per_page, schema: { type: integer, maximum: 200 } }
 *       - { in: query, name: filter_by, schema: { type: string, example: Status.Confirmed } }
 *       - { in: query, name: customer_id, schema: { type: string } }
 *       - { in: query, name: search_text, schema: { type: string } }
 *     responses: { 200: { description: List of sales orders } }
 *   post:
 *     tags: [Orders]
 *     summary: Create a sales order
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, line_items]
 *             properties:
 *               customer_id: { type: string, example: "4815000000044080" }
 *               date: { type: string, example: "2026-01-15" }
 *               line_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [item_id, quantity]
 *                   properties:
 *                     item_id:  { type: string, example: "4815000000044100" }
 *                     quantity: { type: number, example: 2 }
 *                     rate:     { type: number, example: 122 }
 *     responses: { 201: { description: Created } }
 */
router.get('/', canRead, validate(v.listQuery), ctrl.list);
router.post('/', canWrite, validate(v.createBody), ctrl.create);

/**
 * @openapi
 * /api/orders/{id}:
 *   get: { tags: [Orders], summary: Get a sales order, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 404: { description: Not found } } }
 *   put: { tags: [Orders], summary: Update a sales order, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Orders], summary: Delete a sales order, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/:id', canRead, validate(v.idParam), ctrl.get);
router.put('/:id', canWrite, validate(v.updateBody), ctrl.update);
router.delete('/:id', canWrite, validate(v.idParam), ctrl.remove);

/**
 * @openapi
 * /api/orders/{id}/confirm:
 *   post: { tags: [Orders], summary: Mark a sales order as Confirmed, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Confirmed } } }
 * /api/orders/{id}/void:
 *   post: { tags: [Orders], summary: Mark a sales order as Void, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Voided } } }
 * /api/orders/{id}/open:
 *   post: { tags: [Orders], summary: Reopen a sales order (Draft/Open), security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: Reopened } } }
 */
router.post('/:id/confirm', canWrite, validate(v.idParam), ctrl.confirm);
router.post('/:id/void', canWrite, validate(v.idParam), ctrl.voidOrder);
router.post('/:id/open', canWrite, validate(v.idParam), ctrl.open);

module.exports = router;

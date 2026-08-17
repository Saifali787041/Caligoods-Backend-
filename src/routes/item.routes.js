'use strict';
const express = require('express');
const ctrl = require('../controllers/inventory/item.controller');
const validate = require('../middleware/validate');
const v = require('../validations/item.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: Items
 *     description: Zoho Inventory items (products)
 */

/**
 * @openapi
 * /api/items:
 *   get:
 *     tags: [Items]
 *     summary: List items (proxied + filtered from Zoho, paginated)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: per_page, schema: { type: integer, maximum: 200 } }
 *       - { in: query, name: search_text, schema: { type: string } }
 *       - { in: query, name: sku, schema: { type: string } }
 *       - { in: query, name: filter_by, schema: { type: string, example: Status.Active } }
 *     responses:
 *       200: { description: List of items with pagination meta }
 *   post:
 *     tags: [Items]
 *     summary: Create an item in Zoho
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:  { type: string, example: Widget A }
 *               rate:  { type: number, example: 19.99 }
 *               sku:   { type: string, example: WIDG-A }
 *               unit:  { type: string, example: qty }
 *               brand: { type: string, example: Caligoods }
 *     responses:
 *       201: { description: Item created }
 */
router.get('/', authorize(...ROLE_GROUPS.ALL_STAFF), validate(v.listQuery), ctrl.list);
router.post('/', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.createBody), ctrl.create);

/**
 * @openapi
 * /api/items/{id}:
 *   get:
 *     tags: [Items]
 *     summary: Get a single item
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Item }, 404: { description: Not found } }
 *   put:
 *     tags: [Items]
 *     summary: Update an item
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Updated } }
 *   delete:
 *     tags: [Items]
 *     summary: Delete an item
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Deleted } }
 */
router.get('/:id', authorize(...ROLE_GROUPS.ALL_STAFF), validate(v.idParam), ctrl.get);
router.put('/:id', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.updateBody), ctrl.update);
router.delete('/:id', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.idParam), ctrl.remove);

/**
 * @openapi
 * /api/items/{id}/status:
 *   patch:
 *     tags: [Items]
 *     summary: Mark an item active or inactive
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [status], properties: { status: { type: string, enum: [active, inactive] } } }
 *     responses: { 200: { description: Status updated } }
 */
router.patch('/:id/status', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.statusBody), ctrl.setStatus);

module.exports = router;

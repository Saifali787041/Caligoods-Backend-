'use strict';
const express = require('express');
const ctrl = require('../controllers/inventory/compositeItem.controller');
const validate = require('../middleware/validate');
const v = require('../validations/compositeItem.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate);

/**
 * @openapi
 * tags:
 *   - name: CompositeItems
 *     description: Zoho Inventory composite items (kits / assemblies)
 */

/**
 * @openapi
 * /api/composite-items:
 *   get:
 *     tags: [CompositeItems]
 *     summary: List composite items
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: List } }
 *   post:
 *     tags: [CompositeItems]
 *     summary: Create a composite item
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 */
router.get('/', authorize(...ROLE_GROUPS.ALL_STAFF), validate(v.listQuery), ctrl.list);
router.post('/', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.createBody), ctrl.create);

/**
 * @openapi
 * /api/composite-items/{id}:
 *   get: { tags: [CompositeItems], summary: Get composite item, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   put: { tags: [CompositeItems], summary: Update composite item, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [CompositeItems], summary: Delete composite item, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/:id', authorize(...ROLE_GROUPS.ALL_STAFF), validate(v.idParam), ctrl.get);
router.put('/:id', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.updateBody), ctrl.update);
router.delete('/:id', authorize(...ROLE_GROUPS.INVENTORY_WRITE), validate(v.idParam), ctrl.remove);

module.exports = router;

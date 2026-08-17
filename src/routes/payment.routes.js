'use strict';
const express = require('express');
const ctrl = require('../controllers/sales/payment.controller');
const validate = require('../middleware/validate');
const v = require('../validations/payment.validation');
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
 *   - name: Payments
 *     description: Customer payments (Zoho /customerpayments)
 */

/**
 * @openapi
 * /api/payments:
 *   get: { tags: [Payments], summary: List customer payments, security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   post:
 *     tags: [Payments]
 *     summary: Record a customer payment (optionally applied to invoices)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, amount, payment_mode]
 *             properties:
 *               customer_id:  { type: string }
 *               amount:       { type: number }
 *               payment_mode: { type: string, example: banktransfer }
 *               invoices:
 *                 type: array
 *                 items: { type: object, properties: { invoice_id: { type: string }, amount_applied: { type: number } } }
 *     responses: { 201: { description: Created } }
 */
router.get('/', canRead, validate(v.listQuery), ctrl.list);
router.post('/', canWrite, validate(v.createBody), ctrl.create);

/**
 * @openapi
 * /api/payments/{id}:
 *   get: { tags: [Payments], summary: Get a payment, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   put: { tags: [Payments], summary: Update a payment, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Payments], summary: Delete a payment, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/:id', canRead, validate(v.idParam), ctrl.get);
router.put('/:id', canWrite, validate(v.updateBody), ctrl.update);
router.delete('/:id', canWrite, validate(v.idParam), ctrl.remove);

module.exports = router;

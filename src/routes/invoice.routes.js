'use strict';
const express = require('express');
const ctrl = require('../controllers/sales/invoice.controller');
const validate = require('../middleware/validate');
const v = require('../validations/invoice.validation');
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
 *   - name: Invoices
 *     description: Invoices and invoice payments (Zoho /invoices, /customerpayments)
 */

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: List invoices (paginated, filterable)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: filter_by, schema: { type: string, example: Status.Unpaid } }
 *       - { in: query, name: status, schema: { type: string, example: overdue } }
 *       - { in: query, name: customer_id, schema: { type: string } }
 *     responses: { 200: { description: List of invoices } }
 *   post:
 *     tags: [Invoices]
 *     summary: Create an invoice
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, line_items]
 *             properties:
 *               customer_id: { type: string }
 *               line_items:
 *                 type: array
 *                 items: { type: object, required: [item_id, quantity], properties: { item_id: { type: string }, quantity: { type: number }, rate: { type: number } } }
 *     responses: { 201: { description: Created } }
 */
router.get('/', canRead, validate(v.listQuery), ctrl.list);
router.post('/', canWrite, validate(v.createBody), ctrl.create);

/**
 * @openapi
 * /api/invoices/from-sales-order:
 *   post:
 *     tags: [Invoices]
 *     summary: Create an invoice from an existing sales order
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [salesorder_id], properties: { salesorder_id: { type: string } } }
 *     responses: { 201: { description: Created from sales order } }
 */
router.post('/from-sales-order', canWrite, validate(v.fromSalesOrder), ctrl.createFromSalesOrder);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get: { tags: [Invoices], summary: Get an invoice, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 404: { description: Not found } } }
 *   put: { tags: [Invoices], summary: Update an invoice, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Invoices], summary: Delete an invoice, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/:id', canRead, validate(v.idParam), ctrl.get);
router.put('/:id', canWrite, validate(v.updateBody), ctrl.update);
router.delete('/:id', canWrite, validate(v.idParam), ctrl.remove);

/**
 * @openapi
 * /api/invoices/{id}/sent:
 *   post: { tags: [Invoices], summary: Mark invoice as Sent, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 * /api/invoices/{id}/void:
 *   post: { tags: [Invoices], summary: Mark invoice as Void, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 * /api/invoices/{id}/draft:
 *   post: { tags: [Invoices], summary: Move invoice to Draft, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.post('/:id/sent', canWrite, validate(v.idParam), ctrl.markSent);
router.post('/:id/void', canWrite, validate(v.idParam), ctrl.markVoid);
router.post('/:id/draft', canWrite, validate(v.idParam), ctrl.markDraft);

/**
 * @openapi
 * /api/invoices/{id}/payments:
 *   post:
 *     tags: [Invoices]
 *     summary: Record a payment against this invoice
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customer_id, amount, payment_mode]
 *             properties:
 *               customer_id:  { type: string }
 *               amount:       { type: number, example: 450 }
 *               payment_mode: { type: string, example: cash }
 *               account_id:   { type: string }
 *     responses: { 201: { description: Payment recorded } }
 */
router.post('/:id/payments', canWrite, validate(v.recordPayment), ctrl.recordPayment);

module.exports = router;

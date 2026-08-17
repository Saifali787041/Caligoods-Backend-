'use strict';
const express = require('express');
const ctrl = require('../controllers/sales/customer.controller');
const validate = require('../middleware/validate');
const v = require('../validations/customer.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate);

const canRead = authorize(...ROLE_GROUPS.ALL_STAFF);
const canWrite = authorize(...ROLE_GROUPS.CUSTOMER_WRITE);

/**
 * @openapi
 * tags:
 *   - name: Customers
 *     description: Customers, contact persons and addresses (Zoho /contacts)
 */

/**
 * @openapi
 * /api/customers:
 *   get:
 *     tags: [Customers]
 *     summary: List customers (contact_type=customer, paginated)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: per_page, schema: { type: integer, maximum: 200 } }
 *       - { in: query, name: search_text, schema: { type: string } }
 *       - { in: query, name: filter_by, schema: { type: string, example: Status.Active } }
 *     responses: { 200: { description: List of customers } }
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contact_name]
 *             properties:
 *               contact_name: { type: string, example: Bowman and Co }
 *               company_name: { type: string }
 *               email:        { type: string }
 *     responses: { 201: { description: Created } }
 */
router.get('/', canRead, validate(v.listQuery), ctrl.list);
router.post('/', canWrite, validate(v.createCustomer), ctrl.create);

// --- contact persons (literal paths first) ---
/**
 * @openapi
 * /api/customers/contact-persons/{personId}:
 *   get: { tags: [Customers], summary: Get a contact person, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: personId, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   put: { tags: [Customers], summary: Update a contact person, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: personId, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Customers], summary: Delete a contact person, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: personId, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/contact-persons/:personId', canRead, validate(v.personIdParam), ctrl.getPerson);
router.put('/contact-persons/:personId', canWrite, validate(v.updatePerson), ctrl.updatePerson);
router.delete('/contact-persons/:personId', canWrite, validate(v.personIdParam), ctrl.removePerson);
/**
 * @openapi
 * /api/customers/contact-persons/{personId}/primary:
 *   post: { tags: [Customers], summary: Mark contact person as primary, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: personId, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.post('/contact-persons/:personId/primary', canWrite, validate(v.personIdParam), ctrl.markPrimaryPerson);

// --- single customer ---
/**
 * @openapi
 * /api/customers/{id}:
 *   get: { tags: [Customers], summary: Get a customer, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 404: { description: Not found } } }
 *   put: { tags: [Customers], summary: Update a customer, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Customers], summary: Delete a customer, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/:id', canRead, validate(v.idParam), ctrl.get);
router.put('/:id', canWrite, validate(v.updateCustomer), ctrl.update);
router.delete('/:id', canWrite, validate(v.idParam), ctrl.remove);
/**
 * @openapi
 * /api/customers/{id}/status:
 *   patch:
 *     tags: [Customers]
 *     summary: Mark a customer active or inactive
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [status], properties: { status: { type: string, enum: [active, inactive] } } } } } }
 *     responses: { 200: { description: OK } }
 */
router.patch('/:id/status', canWrite, validate(v.statusBody), ctrl.setStatus);

// --- contact persons scoped to a customer ---
/**
 * @openapi
 * /api/customers/{id}/contact-persons:
 *   get: { tags: [Customers], summary: List a customer's contact persons, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   post: { tags: [Customers], summary: Add a contact person to a customer, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 201: { description: Created } } }
 */
router.get('/:id/contact-persons', canRead, validate(v.idParam), ctrl.listPersons);
router.post('/:id/contact-persons', canWrite, validate(v.createPerson), ctrl.createPerson);

// --- addresses scoped to a customer ---
/**
 * @openapi
 * /api/customers/{id}/addresses:
 *   get: { tags: [Customers], summary: List a customer's addresses, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   post: { tags: [Customers], summary: Add an address to a customer, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 201: { description: Created } } }
 */
router.get('/:id/addresses', canRead, validate(v.idParam), ctrl.listAddresses);
router.post('/:id/addresses', canWrite, validate(v.createAddress), ctrl.createAddress);
/**
 * @openapi
 * /api/customers/{id}/addresses/{addressId}:
 *   put: { tags: [Customers], summary: Update a customer address, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }, { in: path, name: addressId, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Customers], summary: Delete a customer address, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }, { in: path, name: addressId, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.put('/:id/addresses/:addressId', canWrite, validate(v.updateAddress), ctrl.updateAddress);
router.delete('/:id/addresses/:addressId', canWrite, validate(v.addressIdParams), ctrl.removeAddress);

module.exports = router;

'use strict';
const express = require('express');
const userCtrl = require('../controllers/admin/user.controller');
const auditCtrl = require('../controllers/admin/auditLog.controller');
const validate = require('../middleware/validate');
const v = require('../validations/adminUser.validation');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLES, ROLE_GROUPS } = require('../helpers/constants');

const router = express.Router();
router.use(authenticate, authorize(...ROLE_GROUPS.ADMIN_MANAGE)); // super_admin, admin only

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Platform user management & audit log (MySQL, not Zoho). Super-admin / admin only.
 */

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List platform users
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: role, schema: { type: string } }
 *       - { in: query, name: isActive, schema: { type: string, enum: [true, false] } }
 *     responses: { 200: { description: Users } }
 *   post:
 *     tags: [Admin]
 *     summary: Create or invite a staff user (omit password to send an invite)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, role]
 *             properties:
 *               firstName: { type: string }
 *               lastName:  { type: string }
 *               email:     { type: string }
 *               role:      { type: string, enum: [super_admin, admin, sales_manager, warehouse_manager, customer_support, customer] }
 *               password:  { type: string, description: optional; if omitted an invite email is sent }
 *     responses: { 201: { description: Created or invited }, 403: { description: Role not permitted } }
 */
router.get('/users', validate(v.listQuery), userCtrl.list);
router.post('/users', validate(v.createBody), userCtrl.create);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get: { tags: [Admin], summary: Get a user, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 404: { description: Not found } } }
 *   put: { tags: [Admin], summary: Update a user's name/role, security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 *   delete: { tags: [Admin], summary: Delete a user (super admin only), security: [{ bearerAuth: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 403: { description: Forbidden } } }
 */
router.get('/users/:id', validate(v.idParam), userCtrl.get);
router.put('/users/:id', validate(v.updateBody), userCtrl.update);
router.delete('/users/:id', authorize(ROLES.SUPER_ADMIN), validate(v.idParam), userCtrl.remove);

/**
 * @openapi
 * /api/admin/users/{id}/status:
 *   patch:
 *     tags: [Admin]
 *     summary: Activate or deactivate a user
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [isActive], properties: { isActive: { type: boolean } } } } } }
 *     responses: { 200: { description: OK }, 400: { description: e.g. last super admin / self-deactivate } }
 * /api/admin/users/{id}/reset-password:
 *   post:
 *     tags: [Admin]
 *     summary: Send a password-reset email to a user
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Reset email sent } }
 */
router.patch('/users/:id/status', validate(v.statusBody), userCtrl.setStatus);
router.post('/users/:id/reset-password', validate(v.idParam), userCtrl.resetPassword);

/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     summary: List admin audit log entries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: action, schema: { type: string, example: user.create } }
 *       - { in: query, name: actorId, schema: { type: string } }
 *     responses: { 200: { description: Audit log entries } }
 */
router.get('/audit-logs', validate(v.auditQuery), auditCtrl.list);

module.exports = router;

'use strict';
const express = require('express');
const zohoController = require('../controllers/zoho.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { ROLES } = require('../helpers/constants');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Zoho
 *     description: Zoho Inventory integration status
 */

/**
 * @openapi
 * /api/zoho/health:
 *   get:
 *     tags: [Zoho]
 *     summary: Report Zoho config + cached-token state (no external call, no secrets)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Integration status }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/health', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), zohoController.health);

/**
 * @openapi
 * /api/zoho/status:
 *   get:
 *     tags: [Zoho]
 *     summary: Verify the live Zoho connection by fetching organizations
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Connection OK; returns organizations }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       502: { description: Zoho auth/connection failed }
 *       503: { description: Zoho not configured }
 */
router.get('/status', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), zohoController.status);

/**
 * @openapi
 * /api/zoho/test:
 *   get:
 *     tags: [Zoho]
 *     summary: Simple dev connectivity probe (always 200; read `zohoConnected`)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: "{ success, zohoConnected, message }" }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/test', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), zohoController.test);

module.exports = router;

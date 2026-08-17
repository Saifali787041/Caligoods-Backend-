'use strict';
const express = require('express');
const ctrl = require('../controllers/catalog.controller');
const validate = require('../middleware/validate');
const v = require('../validations/catalog.validation');
const optionalAuth = require('../middleware/optionalAuth.middleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Catalog
 *     description: Public B2B storefront catalog (live Zoho stock; pricing shown only when authenticated)
 */

/**
 * @openapi
 * /api/catalog:
 *   get:
 *     tags: [Catalog]
 *     summary: Browse live inventory (guest = stock only; authenticated = stock + pricing)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: per_page, schema: { type: integer, maximum: 200 } }
 *       - { in: query, name: search_text, schema: { type: string } }
 *       - { in: query, name: category_name, schema: { type: string } }
 *       - { in: query, name: brand, schema: { type: string } }
 *       - { in: query, name: sort_column, schema: { type: string, example: name } }
 *       - { in: query, name: sort_order, schema: { type: string, enum: [A, D] } }
 *     responses:
 *       200: { description: Products with live stock_status; meta.pricing_visible indicates whether prices are included }
 */
router.get('/', optionalAuth, validate(v.listQuery), ctrl.list);

/**
 * @openapi
 * /api/catalog/filters:
 *   get:
 *     tags: [Catalog]
 *     summary: Category & brand facets for the storefront sidebar
 *     responses: { 200: { description: Filters } }
 */
router.get('/filters', ctrl.filters);
// TEMP stock-field diagnostic (remove once stock mapping is confirmed)
router.get('/_debug/fields', ctrl.debugFields);

/**
 * @openapi
 * /api/catalog/{id}/image:
 *   get:
 *     tags: [Catalog]
 *     summary: Live product image proxied from Zoho (404 when the item has none)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Image bytes }, 404: { description: No image } }
 */
router.get('/:id/image', validate(v.idParam), ctrl.image);

/**
 * @openapi
 * /api/catalog/{id}:
 *   get:
 *     tags: [Catalog]
 *     summary: Product detail (pricing shown only when authenticated)
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: Product }, 404: { description: Not found } }
 */
router.get('/:id', optionalAuth, validate(v.idParam), ctrl.get);

module.exports = router;

'use strict';
const express = require('express');
const authRoutes = require('./auth.routes');
const zohoRoutes = require('./zoho.routes');
const itemRoutes = require('./item.routes');
const compositeItemRoutes = require('./compositeItem.routes');
const inventoryMetaRoutes = require('./inventoryMeta.routes');
const customerRoutes = require('./customer.routes');
const salesOrderRoutes = require('./salesOrder.routes');
const invoiceRoutes = require('./invoice.routes');
const paymentRoutes = require('./payment.routes');
const dashboardRoutes = require('./dashboard.routes');
const adminRoutes = require('./admin.routes');
const catalogRoutes = require('./catalog.routes');

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     responses:
 *       200: { description: Service healthy }
 */
router.get('/health', (req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/zoho', zohoRoutes);
router.use('/items', itemRoutes);
router.use('/composite-items', compositeItemRoutes);
router.use('/customers', customerRoutes);
router.use('/orders', salesOrderRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/catalog', catalogRoutes);
router.use('/', inventoryMetaRoutes);

module.exports = router;

'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const dash = require('../../services/dashboard/dashboard.service');

const maybeRefresh = (req) => { if (req.query.refresh === 'true') dash.refresh(); };

const summary = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Dashboard summary', data: await dash.summary() });
});

const sales = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Sales by period', data: await dash.sales() });
});

const topProducts = catchAsync(async (req, res) => {
  maybeRefresh(req);
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const sample = req.query.sample ? Number(req.query.sample) : 20;
  return success(res, { message: 'Top selling products', data: await dash.topProducts({ limit, sample }) });
});

const recentOrders = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Recent orders', data: await dash.recentOrders(req.query.limit ? Number(req.query.limit) : 10) });
});
const pendingOrders = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Pending orders', data: await dash.pendingOrders(req.query.limit ? Number(req.query.limit) : undefined) });
});
const cancelledOrders = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Cancelled orders', data: await dash.cancelledOrders(req.query.limit ? Number(req.query.limit) : undefined) });
});
const lowStock = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Low stock items', data: await dash.lowStock(req.query.limit ? Number(req.query.limit) : undefined) });
});
const outOfStock = catchAsync(async (req, res) => {
  maybeRefresh(req);
  return success(res, { message: 'Out of stock items', data: await dash.outOfStock(req.query.limit ? Number(req.query.limit) : undefined) });
});

module.exports = {
  summary, sales, topProducts, recentOrders, pendingOrders, cancelledOrders, lowStock, outOfStock,
};

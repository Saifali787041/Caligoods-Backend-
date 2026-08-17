'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const service = require('../../services/sales/invoice.service');
const paymentService = require('../../services/sales/payment.service');

const list = catchAsync(async (req, res) => {
  const { invoices, page_context } = await service.list(req.query);
  return success(res, { message: 'Invoices fetched', data: invoices, meta: page_context || undefined });
});
const get = catchAsync(async (req, res) =>
  success(res, { message: 'Invoice fetched', data: await service.get(req.params.id) }));
const create = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Invoice created', data: await service.create(req.body) }));
const createFromSalesOrder = catchAsync(async (req, res) => {
  const { salesorder_id, ...overrides } = req.body;
  const data = await service.createFromSalesOrder(salesorder_id, overrides);
  return success(res, { statusCode: 201, message: 'Invoice created from sales order', data });
});
const update = catchAsync(async (req, res) =>
  success(res, { message: 'Invoice updated', data: await service.update(req.params.id, req.body) }));
const remove = catchAsync(async (req, res) =>
  success(res, { message: 'Invoice deleted', data: await service.remove(req.params.id) }));

const markSent = catchAsync(async (req, res) =>
  success(res, { message: 'Invoice marked as sent', data: await service.setStatus(req.params.id, 'sent') }));
const markVoid = catchAsync(async (req, res) =>
  success(res, { message: 'Invoice voided', data: await service.setStatus(req.params.id, 'void') }));
const markDraft = catchAsync(async (req, res) =>
  success(res, { message: 'Invoice moved to draft', data: await service.setStatus(req.params.id, 'draft') }));

// Record a payment against this specific invoice
const recordPayment = catchAsync(async (req, res) => {
  const data = await paymentService.createForInvoice(req.params.id, req.body);
  return success(res, { statusCode: 201, message: 'Payment recorded', data });
});

module.exports = {
  list, get, create, createFromSalesOrder, update, remove,
  markSent, markVoid, markDraft, recordPayment,
};

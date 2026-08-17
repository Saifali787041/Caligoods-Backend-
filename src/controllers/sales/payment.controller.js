'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const service = require('../../services/sales/payment.service');

const list = catchAsync(async (req, res) => {
  const { customerpayments, page_context } = await service.list(req.query);
  return success(res, { message: 'Payments fetched', data: customerpayments, meta: page_context || undefined });
});
const get = catchAsync(async (req, res) =>
  success(res, { message: 'Payment fetched', data: await service.get(req.params.id) }));
const create = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Payment created', data: await service.create(req.body) }));
const update = catchAsync(async (req, res) =>
  success(res, { message: 'Payment updated', data: await service.update(req.params.id, req.body) }));
const remove = catchAsync(async (req, res) =>
  success(res, { message: 'Payment deleted', data: await service.remove(req.params.id) }));

module.exports = { list, get, create, update, remove };

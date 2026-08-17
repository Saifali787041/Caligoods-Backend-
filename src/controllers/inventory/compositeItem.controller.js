'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const service = require('../../services/inventory/compositeItem.service');

const list = catchAsync(async (req, res) => {
  const { composite_items, page_context } = await service.list(req.query);
  return success(res, { message: 'Composite items fetched', data: composite_items, meta: page_context || undefined });
});

const get = catchAsync(async (req, res) =>
  success(res, { message: 'Composite item fetched', data: await service.get(req.params.id) }));

const create = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Composite item created', data: await service.create(req.body) }));

const update = catchAsync(async (req, res) =>
  success(res, { message: 'Composite item updated', data: await service.update(req.params.id, req.body) }));

const remove = catchAsync(async (req, res) =>
  success(res, { message: 'Composite item deleted', data: await service.remove(req.params.id) }));

module.exports = { list, get, create, update, remove };

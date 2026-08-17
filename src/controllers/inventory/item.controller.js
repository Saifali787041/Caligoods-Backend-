'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const itemService = require('../../services/inventory/item.service');

const list = catchAsync(async (req, res) => {
  const { items, page_context } = await itemService.list(req.query);
  return success(res, { message: 'Items fetched', data: items, meta: page_context || undefined });
});

const get = catchAsync(async (req, res) =>
  success(res, { message: 'Item fetched', data: await itemService.get(req.params.id) }));

const create = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Item created', data: await itemService.create(req.body) }));

const update = catchAsync(async (req, res) =>
  success(res, { message: 'Item updated', data: await itemService.update(req.params.id, req.body) }));

const remove = catchAsync(async (req, res) =>
  success(res, { message: 'Item deleted', data: await itemService.remove(req.params.id) }));

const setStatus = catchAsync(async (req, res) =>
  success(res, { message: 'Item status updated', data: await itemService.setStatus(req.params.id, req.body.status === 'active') }));

module.exports = { list, get, create, update, remove, setStatus };

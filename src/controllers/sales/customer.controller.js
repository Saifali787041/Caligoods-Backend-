'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const { customers, contactPersons, addresses } = require('../../services/sales/customer.service');

// --- Customers ---
const list = catchAsync(async (req, res) => {
  const { contacts, page_context } = await customers.list(req.query);
  return success(res, { message: 'Customers fetched', data: contacts, meta: page_context || undefined });
});
const get = catchAsync(async (req, res) =>
  success(res, { message: 'Customer fetched', data: await customers.get(req.params.id) }));
const create = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Customer created', data: await customers.create(req.body) }));
const update = catchAsync(async (req, res) =>
  success(res, { message: 'Customer updated', data: await customers.update(req.params.id, req.body) }));
const remove = catchAsync(async (req, res) =>
  success(res, { message: 'Customer deleted', data: await customers.remove(req.params.id) }));
const setStatus = catchAsync(async (req, res) =>
  success(res, { message: 'Customer status updated', data: await customers.setStatus(req.params.id, req.body.status === 'active') }));

// --- Contact persons ---
const listPersons = catchAsync(async (req, res) =>
  success(res, { message: 'Contact persons fetched', data: await contactPersons.list(req.params.id) }));
const getPerson = catchAsync(async (req, res) =>
  success(res, { message: 'Contact person fetched', data: await contactPersons.get(req.params.personId) }));
const createPerson = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Contact person created', data: await contactPersons.create(req.params.id, req.body) }));
const updatePerson = catchAsync(async (req, res) =>
  success(res, { message: 'Contact person updated', data: await contactPersons.update(req.params.personId, req.body) }));
const removePerson = catchAsync(async (req, res) =>
  success(res, { message: 'Contact person deleted', data: await contactPersons.remove(req.params.personId) }));
const markPrimaryPerson = catchAsync(async (req, res) =>
  success(res, { message: 'Contact person marked primary', data: await contactPersons.markPrimary(req.params.personId) }));

// --- Addresses ---
const listAddresses = catchAsync(async (req, res) =>
  success(res, { message: 'Addresses fetched', data: await addresses.list(req.params.id) }));
const createAddress = catchAsync(async (req, res) =>
  success(res, { statusCode: 201, message: 'Address added', data: await addresses.create(req.params.id, req.body) }));
const updateAddress = catchAsync(async (req, res) =>
  success(res, { message: 'Address updated', data: await addresses.update(req.params.id, req.params.addressId, req.body) }));
const removeAddress = catchAsync(async (req, res) =>
  success(res, { message: 'Address deleted', data: await addresses.remove(req.params.id, req.params.addressId) }));

module.exports = {
  list, get, create, update, remove, setStatus,
  listPersons, getPerson, createPerson, updatePerson, removePerson, markPrimaryPerson,
  listAddresses, createAddress, updateAddress, removeAddress,
};

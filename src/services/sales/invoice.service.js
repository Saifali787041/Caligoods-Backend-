'use strict';
const zohoClient = require('../zohoClient.service');
const ApiError = require('../../helpers/apiError');

const LIST_PARAMS = [
  'page', 'per_page', 'sort_column', 'sort_order', 'filter_by', 'status',
  'search_text', 'customer_id', 'invoice_number', 'reference_number', 'date', 'due_date',
];
const pickListParams = (q = {}) =>
  LIST_PARAMS.reduce((acc, k) => {
    if (q[k] !== undefined && q[k] !== '') acc[k] = q[k];
    return acc;
  }, {});

const STATUS_ACTIONS = { sent: 'sent', void: 'void', draft: 'draft' };

const list = async (query) => {
  const data = await zohoClient.get('/invoices', pickListParams(query));
  return { invoices: data.invoices || [], page_context: data.page_context || null };
};

const get = async (id) => (await zohoClient.get(`/invoices/${id}`)).invoice;

const create = async (payload) => {
  const params = payload.invoice_number ? { ignore_auto_number_generation: true } : undefined;
  return (await zohoClient.post('/invoices', payload, params)).invoice;
};

// Convert an existing sales order into an invoice (Zoho pulls the line items).
const createFromSalesOrder = async (salesorderId, overrides = {}) =>
  (await zohoClient.post('/invoices/fromsalesorder', overrides, { salesorder_id: salesorderId })).invoice;

const update = async (id, payload) => (await zohoClient.put(`/invoices/${id}`, payload)).invoice;

const remove = async (id) => {
  await zohoClient.del(`/invoices/${id}`);
  return { invoice_id: id, deleted: true };
};

const setStatus = async (id, action) => {
  const status = STATUS_ACTIONS[action];
  if (!status) throw ApiError.badRequest(`Unsupported invoice status action: ${action}`);
  await zohoClient.post(`/invoices/${id}/status/${status}`);
  return { invoice_id: id, status };
};

module.exports = { list, get, create, createFromSalesOrder, update, remove, setStatus };

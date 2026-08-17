'use strict';
const zohoClient = require('../zohoClient.service');

// Zoho "customer payments" - money received from a customer, optionally applied
// to one or more invoices via the invoices[] array.

const LIST_PARAMS = [
  'page', 'per_page', 'sort_column', 'sort_order', 'filter_by', 'search_text', 'customer_id',
];
const pickListParams = (q = {}) =>
  LIST_PARAMS.reduce((acc, k) => {
    if (q[k] !== undefined && q[k] !== '') acc[k] = q[k];
    return acc;
  }, {});

const list = async (query) => {
  const data = await zohoClient.get('/customerpayments', pickListParams(query));
  return { customerpayments: data.customerpayments || [], page_context: data.page_context || null };
};

const get = async (id) => (await zohoClient.get(`/customerpayments/${id}`)).payment;
const create = async (payload) => (await zohoClient.post('/customerpayments', payload)).payment;
const update = async (id, payload) => (await zohoClient.put(`/customerpayments/${id}`, payload)).payment;

const remove = async (id) => {
  await zohoClient.del(`/customerpayments/${id}`);
  return { payment_id: id, deleted: true };
};

// Build a payment that applies `amount` to a single invoice.
const createForInvoice = async (invoiceId, payload) => {
  const body = {
    ...payload,
    invoices: [{ invoice_id: invoiceId, amount_applied: payload.amount }],
  };
  return create(body);
};

module.exports = { list, get, create, update, remove, createForInvoice };

'use strict';
const zohoClient = require('../zohoClient.service');
const ApiError = require('../../helpers/apiError');

const LIST_PARAMS = [
  'page', 'per_page', 'sort_column', 'sort_order', 'filter_by', 'search_text',
  'customer_id', 'salesorder_number', 'reference_number', 'item_id', 'date',
];
const pickListParams = (q = {}) =>
  LIST_PARAMS.reduce((acc, k) => {
    if (q[k] !== undefined && q[k] !== '') acc[k] = q[k];
    return acc;
  }, {});

// action (from our route) -> Zoho status segment
const STATUS_ACTIONS = { confirm: 'confirmed', void: 'void', open: 'open' };

const list = async (query) => {
  const data = await zohoClient.get('/salesorders', pickListParams(query));
  return { salesorders: data.salesorders || [], page_context: data.page_context || null };
};

const get = async (id) => (await zohoClient.get(`/salesorders/${id}`)).salesorder;

const create = async (payload) => {
  // A custom salesorder_number requires Zoho's auto-numbering to be disabled.
  const params = payload.salesorder_number ? { ignore_auto_number_generation: true } : undefined;
  return (await zohoClient.post('/salesorders', payload, params)).salesorder;
};

const update = async (id, payload) => (await zohoClient.put(`/salesorders/${id}`, payload)).salesorder;

const remove = async (id) => {
  await zohoClient.del(`/salesorders/${id}`);
  return { salesorder_id: id, deleted: true };
};

const setStatus = async (id, action) => {
  const status = STATUS_ACTIONS[action];
  if (!status) throw ApiError.badRequest(`Unsupported status action: ${action}`);
  await zohoClient.post(`/salesorders/${id}/status/${status}`);
  return { salesorder_id: id, status };
};

module.exports = { list, get, create, update, remove, setStatus };

'use strict';
const zohoClient = require('../zohoClient.service');

// Whitelist of query params we forward to Zoho's /items list endpoint.
const LIST_PARAMS = [
  'page', 'per_page', 'search_text', 'filter_by', 'sort_column', 'sort_order',
  'name', 'sku', 'description', 'rate', 'category_name', 'brand', 'manufacturer',
  'item_type', 'product_type', 'status',
];

const pickListParams = (q = {}) =>
  LIST_PARAMS.reduce((acc, k) => {
    if (q[k] !== undefined && q[k] !== '') acc[k] = q[k];
    return acc;
  }, {});

const list = async (query) => {
  const data = await zohoClient.get('/items', pickListParams(query));
  return { items: data.items || [], page_context: data.page_context || null };
};

const get = async (id) => (await zohoClient.get(`/items/${id}`)).item;
const create = async (payload) => (await zohoClient.post('/items', payload)).item;
const update = async (id, payload) => (await zohoClient.put(`/items/${id}`, payload)).item;

const remove = async (id) => {
  await zohoClient.del(`/items/${id}`);
  return { item_id: id, deleted: true };
};

const setStatus = async (id, active) => {
  await zohoClient.post(`/items/${id}/${active ? 'active' : 'inactive'}`);
  return { item_id: id, status: active ? 'active' : 'inactive' };
};

module.exports = { list, get, create, update, remove, setStatus };

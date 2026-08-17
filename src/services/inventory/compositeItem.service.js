'use strict';
const zohoClient = require('../zohoClient.service');

const LIST_PARAMS = ['page', 'per_page', 'search_text', 'filter_by', 'sort_column', 'sort_order', 'name', 'sku'];

const pickListParams = (q = {}) =>
  LIST_PARAMS.reduce((acc, k) => {
    if (q[k] !== undefined && q[k] !== '') acc[k] = q[k];
    return acc;
  }, {});

const list = async (query) => {
  const data = await zohoClient.get('/compositeitems', pickListParams(query));
  return { composite_items: data.composite_items || [], page_context: data.page_context || null };
};

const get = async (id) => (await zohoClient.get(`/compositeitems/${id}`)).composite_item;
const create = async (payload) => (await zohoClient.post('/compositeitems', payload)).composite_item;
const update = async (id, payload) => (await zohoClient.put(`/compositeitems/${id}`, payload)).composite_item;

const remove = async (id) => {
  await zohoClient.del(`/compositeitems/${id}`);
  return { composite_item_id: id, deleted: true };
};

module.exports = { list, get, create, update, remove };

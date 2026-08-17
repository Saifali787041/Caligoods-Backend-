'use strict';
const zohoClient = require('../zohoClient.service');

// Zoho models customers and vendors as "contacts". This service scopes every
// listing to contact_type = customer, and wraps the contact-persons and
// address sub-resources.

const LIST_PARAMS = [
  'page', 'per_page', 'search_text', 'filter_by', 'sort_column', 'sort_order',
  'contact_name', 'company_name', 'email', 'phone',
];
const pickListParams = (q = {}) =>
  LIST_PARAMS.reduce((acc, k) => {
    if (q[k] !== undefined && q[k] !== '') acc[k] = q[k];
    return acc;
  }, {});

const customers = {
  list: async (query) => {
    const params = { ...pickListParams(query), contact_type: 'customer' };
    const data = await zohoClient.get('/contacts', params);
    return { contacts: data.contacts || [], page_context: data.page_context || null };
  },
  get: async (id) => (await zohoClient.get(`/contacts/${id}`)).contact,
  create: async (payload) =>
    (await zohoClient.post('/contacts', { contact_type: 'customer', ...payload })).contact,
  update: async (id, payload) => (await zohoClient.put(`/contacts/${id}`, payload)).contact,
  remove: async (id) => {
    await zohoClient.del(`/contacts/${id}`);
    return { contact_id: id, deleted: true };
  },
  setStatus: async (id, active) => {
    await zohoClient.post(`/contacts/${id}/${active ? 'active' : 'inactive'}`);
    return { contact_id: id, status: active ? 'active' : 'inactive' };
  },
};

const contactPersons = {
  list: async (contactId) =>
    (await zohoClient.get(`/contacts/${contactId}/contactpersons`)).contact_persons || [],
  get: async (personId) =>
    (await zohoClient.get(`/contacts/contactpersons/${personId}`)).contact_person,
  create: async (contactId, payload) =>
    (await zohoClient.post('/contacts/contactpersons', { ...payload, contact_id: contactId })).contact_person,
  update: async (personId, payload) =>
    (await zohoClient.put(`/contacts/contactpersons/${personId}`, payload)).contact_person,
  remove: async (personId) => {
    await zohoClient.del(`/contacts/contactpersons/${personId}`);
    return { contact_person_id: personId, deleted: true };
  },
  markPrimary: async (personId) => {
    await zohoClient.post(`/contacts/contactpersons/${personId}/primary`);
    return { contact_person_id: personId, is_primary_contact: true };
  },
};

const addresses = {
  list: async (contactId) =>
    (await zohoClient.get(`/contacts/${contactId}/address`)).addresses || [],
  create: async (contactId, payload) =>
    zohoClient.post(`/contacts/${contactId}/address`, payload),
  update: async (contactId, addressId, payload) =>
    zohoClient.put(`/contacts/${contactId}/address/${addressId}`, payload),
  remove: async (contactId, addressId) => {
    await zohoClient.del(`/contacts/${contactId}/address/${addressId}`);
    return { address_id: addressId, deleted: true };
  },
};

module.exports = { customers, contactPersons, addresses };

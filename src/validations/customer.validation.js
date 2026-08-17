'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1, 'customer id is required') }) });
const personIdParam = z.object({ params: z.object({ personId: z.string().min(1, 'contact person id is required') }) });
const addressIdParams = z.object({
  params: z.object({ id: z.string().min(1), addressId: z.string().min(1) }),
});

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    search_text: z.string().max(100).optional(),
    filter_by: z.enum(['Status.All', 'Status.Active', 'Status.Inactive', 'Status.Duplicate', 'Status.Crm']).optional(),
    sort_column: z.enum(['contact_name', 'first_name', 'last_name', 'email', 'outstanding_receivable_amount', 'created_time', 'last_modified_time']).optional(),
    sort_order: z.enum(['A', 'D']).optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }).passthrough(),
});

const createCustomer = z.object({
  body: z.object({
    contact_name: z.string().min(1, 'contact_name is required'),
    company_name: z.string().optional(),
    email: z.string().email().optional(),
    payment_terms: z.number().int().optional(),
    contact_type: z.enum(['customer', 'vendor']).optional(),
  }).passthrough(),
});

const updateCustomer = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ contact_name: z.string().min(1).optional() }).passthrough(),
});

const statusBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['active', 'inactive']) }),
});

// Contact persons
const createPerson = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    first_name: z.string().min(1, 'first_name is required'),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).passthrough(),
});
const updatePerson = z.object({
  params: z.object({ personId: z.string().min(1) }),
  body: z.object({}).passthrough(),
});

// Addresses
const createAddress = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    address: z.string().min(1, 'address is required'),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.union([z.string(), z.number()]).optional(),
    country: z.string().optional(),
  }).passthrough(),
});
const updateAddress = z.object({
  params: z.object({ id: z.string().min(1), addressId: z.string().min(1) }),
  body: z.object({}).passthrough(),
});

module.exports = {
  idParam, personIdParam, addressIdParams, listQuery,
  createCustomer, updateCustomer, statusBody,
  createPerson, updatePerson, createAddress, updateAddress,
};

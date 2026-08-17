'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1, 'payment id is required') }) });

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    filter_by: z.string().optional(),
    search_text: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.enum(['A', 'D']).optional(),
    customer_id: z.union([z.string(), z.number()]).optional(),
  }).passthrough(),
});

const appliedInvoice = z.object({
  invoice_id: z.union([z.string(), z.number()]),
  amount_applied: z.number().nonnegative(),
}).passthrough();

const createBody = z.object({
  body: z.object({
    customer_id: z.union([z.string(), z.number()]),
    amount: z.number().positive('amount must be greater than 0'),
    payment_mode: z.string().min(1, 'payment_mode is required'),
    date: z.string().optional(),
    account_id: z.union([z.string(), z.number()]).optional(),
    reference_number: z.string().optional(),
    invoices: z.array(appliedInvoice).optional(),
  }).passthrough(),
});

const updateBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({}).passthrough(),
});

module.exports = { idParam, listQuery, createBody, updateBody };

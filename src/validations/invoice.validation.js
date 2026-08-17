'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1, 'invoice id is required') }) });

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    filter_by: z.string().optional(),
    status: z.enum(['sent', 'draft', 'overdue', 'paid', 'void', 'unpaid', 'partially_paid', 'viewed']).optional(),
    search_text: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.enum(['A', 'D']).optional(),
    customer_id: z.union([z.string(), z.number()]).optional(),
  }).passthrough(),
});

const lineItem = z.object({
  item_id: z.union([z.string(), z.number()]),
  quantity: z.number().positive('quantity must be greater than 0'),
  rate: z.number().nonnegative().optional(),
}).passthrough();

const createBody = z.object({
  body: z.object({
    customer_id: z.union([z.string(), z.number()]),
    line_items: z.array(lineItem).min(1, 'at least one line item is required'),
    date: z.string().optional(),
    invoice_number: z.string().optional(),
  }).passthrough(),
});

const fromSalesOrder = z.object({
  body: z.object({
    salesorder_id: z.union([z.string(), z.number()]),
  }).passthrough(),
});

const updateBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ line_items: z.array(lineItem).min(1).optional() }).passthrough(),
});

// Record a payment against this invoice
const recordPayment = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    customer_id: z.union([z.string(), z.number()]),
    amount: z.number().positive('amount must be greater than 0'),
    payment_mode: z.string().min(1, 'payment_mode is required'),
    account_id: z.union([z.string(), z.number()]).optional(),
    date: z.string().optional(),
    reference_number: z.string().optional(),
  }).passthrough(),
});

module.exports = { idParam, listQuery, createBody, fromSalesOrder, updateBody, recordPayment };

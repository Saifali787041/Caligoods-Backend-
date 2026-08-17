'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1, 'sales order id is required') }) });

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

const lineItem = z.object({
  item_id: z.union([z.string(), z.number()]),
  quantity: z.number().positive('quantity must be greater than 0'),
  rate: z.number().nonnegative().optional(),
  name: z.string().optional(),
}).passthrough();

const createBody = z.object({
  body: z.object({
    customer_id: z.union([z.string(), z.number()]),
    line_items: z.array(lineItem).min(1, 'at least one line item is required'),
    date: z.string().optional(),
    salesorder_number: z.string().optional(),
    reference_number: z.string().optional(),
  }).passthrough(),
});

const updateBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ line_items: z.array(lineItem).min(1).optional() }).passthrough(),
});

module.exports = { idParam, listQuery, createBody, updateBody };

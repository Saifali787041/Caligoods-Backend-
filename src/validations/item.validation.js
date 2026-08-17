'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1, 'item id is required') }) });

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    search_text: z.string().optional(),
    filter_by: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.enum(['A', 'D']).optional(),
    name: z.string().optional(),
    sku: z.string().optional(),
  }).passthrough(),
});

// Zoho items carry many fields; validate the important ones, pass the rest through.
const createBody = z.object({
  body: z.object({
    name: z.string().min(1, 'name is required'),
    rate: z.number().nonnegative().optional(),
    purchase_rate: z.number().nonnegative().optional(),
    sku: z.string().optional(),
    unit: z.string().optional(),
    brand: z.string().optional(),
    category_id: z.union([z.string(), z.number()]).optional(),
    item_type: z.enum(['inventory', 'sales', 'purchases', 'sales_and_purchases']).optional(),
    product_type: z.enum(['goods', 'service']).optional(),
  }).passthrough(),
});

const updateBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ name: z.string().min(1).optional() }).passthrough(),
});

const statusBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ status: z.enum(['active', 'inactive']) }),
});

module.exports = { idParam, listQuery, createBody, updateBody, statusBody };

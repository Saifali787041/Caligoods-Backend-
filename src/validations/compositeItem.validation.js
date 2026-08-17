'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1, 'composite item id is required') }) });

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    search_text: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.enum(['A', 'D']).optional(),
    name: z.string().optional(),
    sku: z.string().optional(),
  }).passthrough(),
});

const createBody = z.object({
  body: z.object({
    name: z.string().min(1, 'name is required'),
    composite_type: z.enum(['assembly', 'kit']).optional(),
    rate: z.number().nonnegative().optional(),
    sku: z.string().optional(),
  }).passthrough(),
});

const updateBody = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ name: z.string().min(1).optional() }).passthrough(),
});

module.exports = { idParam, listQuery, createBody, updateBody };

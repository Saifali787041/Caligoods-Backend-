'use strict';
const { z } = require('zod');

const idParam = z.object({ params: z.object({ id: z.string().min(1) }) });

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(10000).optional(),
    search_text: z.string().max(120).optional(),
    category_name: z.string().optional(),
    group: z.string().optional(),
    brand: z.string().optional(),
    product_type: z.string().optional(),
    availability: z.enum(['in_stock', 'limited', 'out_of_stock', 'coming_soon']).optional(),
    min_price: z.coerce.number().nonnegative().optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    filter_by: z.string().optional(),
    sort_column: z.string().optional(),
    sort_order: z.enum(['A', 'D']).optional(),
  }).passthrough(),
});

module.exports = { idParam, listQuery };

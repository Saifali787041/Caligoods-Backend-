'use strict';
const { z } = require('zod');

const listQuery = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(200).optional(),
    refresh: z.enum(['true', 'false']).optional(),
  }).passthrough(),
});

const topProductsQuery = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(50).optional(),
    sample: z.coerce.number().int().positive().max(50).optional(),
    refresh: z.enum(['true', 'false']).optional(),
  }).passthrough(),
});

module.exports = { listQuery, topProductsQuery };

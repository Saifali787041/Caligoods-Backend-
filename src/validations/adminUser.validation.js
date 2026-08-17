'use strict';
const { z } = require('zod');
const { ROLE_LIST } = require('../helpers/constants');

const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const idParam = z.object({ params: z.object({ id: z.string().uuid('valid user id required') }) });

const listQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    search: z.string().max(100).optional(),
    role: z.enum(ROLE_LIST).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }).passthrough(),
});

const createBody = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    role: z.enum(ROLE_LIST),
    password: strongPassword.optional(), // omit to send an invite instead
    isActive: z.boolean().optional(),
  }),
});

const updateBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    role: z.enum(ROLE_LIST).optional(),
  }),
});

const statusBody = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ isActive: z.boolean() }),
});

const auditQuery = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    per_page: z.coerce.number().int().positive().max(200).optional(),
    action: z.string().optional(),
    actorId: z.string().uuid().optional(),
  }).passthrough(),
});

module.exports = { idParam, listQuery, createBody, updateBody, statusBody, auditQuery };

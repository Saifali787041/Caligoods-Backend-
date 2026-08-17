'use strict';
const { z } = require('zod');

const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const register = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email(),
    password: strongPassword,
  }),
});

const login = z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
});

const refresh = z.object({
  body: z.object({ refreshToken: z.string().min(1, 'refreshToken is required') }),
});

const forgotPassword = z.object({
  body: z.object({ email: z.string().email() }),
});

const resetPassword = z.object({
  body: z.object({ token: z.string().min(1), password: strongPassword }),
});

const verifyEmail = z.object({
  body: z.object({ token: z.string().min(1) }),
});

module.exports = { register, login, refresh, forgotPassword, resetPassword, verifyEmail };

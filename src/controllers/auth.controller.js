'use strict';
const catchAsync = require('../utils/catchAsync');
const { success } = require('../helpers/apiResponse');
const authService = require('../services/auth.service');

const register = catchAsync(async (req, res) => {
  const data = await authService.register(req.body, req.ip);
  return success(res, { statusCode: 201, message: 'Registration successful. Please verify your email.', data });
});

const login = catchAsync(async (req, res) => {
  const data = await authService.login(req.body, req.ip);
  return success(res, { message: 'Login successful', data });
});

const refresh = catchAsync(async (req, res) => {
  const data = await authService.refresh(req.body, req.ip);
  return success(res, { message: 'Token refreshed', data });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body);
  return success(res, { message: 'Logged out successfully' });
});

const forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body);
  return success(res, { message: 'If that email exists, a reset link has been sent.' });
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body);
  return success(res, { message: 'Password reset successful. You can now log in.' });
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.body);
  return success(res, { message: 'Email verified successfully.' });
});

const me = catchAsync(async (req, res) =>
  success(res, { message: 'Current user', data: req.user.toSafeJSON() }));

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, verifyEmail, me };

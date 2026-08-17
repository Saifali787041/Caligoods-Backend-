'use strict';
const catchAsync = require('../../utils/catchAsync');
const { success } = require('../../helpers/apiResponse');
const userService = require('../../services/admin/user.service');

const actorOf = (req) => ({ id: req.user.id, roleName: req.userRole });

const list = catchAsync(async (req, res) => {
  const { users, meta } = await userService.list(req.query);
  return success(res, { message: 'Users fetched', data: users, meta });
});
const get = catchAsync(async (req, res) =>
  success(res, { message: 'User fetched', data: await userService.get(req.params.id) }));
const create = catchAsync(async (req, res) => {
  const data = await userService.create(actorOf(req), req.body, req.ip);
  return success(res, { statusCode: 201, message: data.invited ? 'User invited' : 'User created', data });
});
const update = catchAsync(async (req, res) =>
  success(res, { message: 'User updated', data: await userService.update(actorOf(req), req.params.id, req.body, req.ip) }));
const setStatus = catchAsync(async (req, res) =>
  success(res, { message: 'User status updated', data: await userService.setStatus(actorOf(req), req.params.id, req.body.isActive, req.ip) }));
const resetPassword = catchAsync(async (req, res) =>
  success(res, { message: 'Password reset email sent', data: await userService.resetPassword(actorOf(req), req.params.id, req.ip) }));
const remove = catchAsync(async (req, res) =>
  success(res, { message: 'User deleted', data: await userService.remove(actorOf(req), req.params.id, req.ip) }));

module.exports = { list, get, create, update, setStatus, resetPassword, remove };

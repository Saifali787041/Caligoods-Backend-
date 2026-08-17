'use strict';
const crypto = require('crypto');
const { Op } = require('sequelize');
const env = require('../config/env');
const { User, Role } = require('../models');
const ApiError = require('../helpers/apiError');
const { ROLES } = require('../helpers/constants');
const tokenService = require('./token.service');
const emailService = require('./email.service');

const rawToken = () => crypto.randomBytes(32).toString('hex');
const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

const buildAuthResponse = async (user, ip) => {
  const accessToken = tokenService.generateAccessToken(user);
  const refreshToken = await tokenService.generateRefreshToken(user, ip);
  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

const register = async ({ firstName, lastName, email, password }, ip) => {
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) throw ApiError.conflict('Email is already registered');

  const customerRole = await Role.findOne({ where: { name: ROLES.CUSTOMER } });
  if (!customerRole) throw new ApiError(500, 'Default role missing. Run the role seeder.');

  const verifyToken = rawToken();
  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    roleId: customerRole.id,
    emailVerificationTokenHash: hash(verifyToken),
    emailVerificationExpires: new Date(Date.now() + env.VERIFY_TOKEN_EXPIRES_HOURS * 3600000),
  });
  user.role = customerRole;

  await emailService.sendVerificationEmail(user, verifyToken);
  return buildAuthResponse(user, ip);
};

const login = async ({ email, password }, ip) => {
  const user = await User.findOne({
    where: { email: email.toLowerCase() },
    include: [{ model: Role, as: 'role' }],
  });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await user.comparePassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account is disabled');

  user.lastLoginAt = new Date();
  await user.save();
  return buildAuthResponse(user, ip);
};

const refresh = async ({ refreshToken }, ip) => {
  const record = await tokenService.findActiveRefreshToken(refreshToken);
  if (!record) throw ApiError.unauthorized('Invalid or expired refresh token');

  const user = await User.findByPk(record.userId, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.isActive) throw ApiError.unauthorized('User no longer active');

  const newRefresh = await tokenService.rotateRefreshToken(record, user, ip);
  const accessToken = tokenService.generateAccessToken(user);
  return { accessToken, refreshToken: newRefresh };
};

const logout = async ({ refreshToken }) => {
  await tokenService.revokeRefreshToken(refreshToken);
};

const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) return; // Do not reveal whether the email exists.

  const token = rawToken();
  user.passwordResetTokenHash = hash(token);
  user.passwordResetExpires = new Date(Date.now() + env.RESET_TOKEN_EXPIRES_MIN * 60000);
  await user.save();
  await emailService.sendPasswordResetEmail(user, token);
};

const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({
    where: {
      passwordResetTokenHash: hash(token),
      passwordResetExpires: { [Op.gt]: new Date() },
    },
  });
  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  user.password = password;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
};

const verifyEmail = async ({ token }) => {
  const user = await User.findOne({
    where: {
      emailVerificationTokenHash: hash(token),
      emailVerificationExpires: { [Op.gt]: new Date() },
    },
  });
  if (!user) throw ApiError.badRequest('Invalid or expired verification token');

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, verifyEmail };

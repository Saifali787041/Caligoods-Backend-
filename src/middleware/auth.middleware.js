'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../helpers/apiError');
const catchAsync = require('../utils/catchAsync');
const { User, Role } = require('../models');

const authenticate = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing or malformed Authorization header');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.isActive) throw ApiError.unauthorized('User no longer active');

  req.user = user;
  req.userRole = user.role ? user.role.name : null;
  next();
});

module.exports = { authenticate };

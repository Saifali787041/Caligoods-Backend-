'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User, Role } = require('../models');

// Unlike `authenticate`, this never blocks the request. If a valid access token
// is present we attach req.user / req.userRole (so pricing can be revealed);
// otherwise the caller proceeds as a guest.
module.exports = async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await User.findByPk(payload.sub, { include: [{ model: Role, as: 'role' }] });
      if (user && user.isActive) {
        req.user = user;
        req.userRole = user.role ? user.role.name : null;
      }
    }
  } catch (_err) {
    // invalid/expired token -> treat as guest
  }
  next();
};

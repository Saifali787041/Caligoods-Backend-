'use strict';
const ApiError = require('../helpers/apiError');

// Usage: authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (allowedRoles.length && !allowedRoles.includes(req.userRole)) {
    return next(ApiError.forbidden('You do not have permission to perform this action'));
  }
  return next();
};

module.exports = { authorize };

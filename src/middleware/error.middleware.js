'use strict';
const env = require('../config/env');
const logger = require('../config/logger');
const ApiError = require('../helpers/apiError');

const notFound = (req, res, next) =>
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (error && error.name === 'SequelizeUniqueConstraintError') {
    error = ApiError.conflict('A record with these details already exists');
  } else if (error && error.name === 'SequelizeValidationError') {
    const details = (error.errors || []).map((e) => ({ path: e.path, message: e.message }));
    error = ApiError.unprocessable('Validation failed', details);
  } else if (!(error instanceof ApiError)) {
    error = new ApiError(500, error.message || 'Internal Server Error', null, false);
  }

  if (!error.isOperational || error.statusCode >= 500) {
    logger.error(`${error.statusCode} ${error.message}`, { stack: err.stack });
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };

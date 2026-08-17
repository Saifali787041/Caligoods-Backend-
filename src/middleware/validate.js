'use strict';
const ApiError = require('../helpers/apiError');

// Accepts a zod object schema with optional { body, query, params } keys.
module.exports = (schema) => (req, res, next) => {
  const toValidate = {};
  if (schema.shape?.body) toValidate.body = req.body;
  if (schema.shape?.query) toValidate.query = req.query;
  if (schema.shape?.params) toValidate.params = req.params;

  const result = schema.safeParse(toValidate);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(ApiError.unprocessable('Validation failed', details));
  }
  Object.assign(req, result.data);
  return next();
};

'use strict';
class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest(m, d) { return new ApiError(400, m, d); }
  static unauthorized(m = 'Unauthorized') { return new ApiError(401, m); }
  static forbidden(m = 'Forbidden') { return new ApiError(403, m); }
  static notFound(m = 'Resource not found') { return new ApiError(404, m); }
  static conflict(m) { return new ApiError(409, m); }
  static unprocessable(m, d) { return new ApiError(422, m, d); }
}
module.exports = ApiError;

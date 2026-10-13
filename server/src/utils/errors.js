'use strict';

/** HTTP error carrying a status code and an optional machine-readable code. */
class ApiError extends Error {
  constructor(statusCode, message, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code) { return new ApiError(400, message, code || 'BAD_REQUEST'); }
  static unauthorized(message, code) { return new ApiError(401, message, code || 'UNAUTHORIZED'); }
  static forbidden(message, code) { return new ApiError(403, message, code || 'FORBIDDEN'); }
  static notFound(message, code) { return new ApiError(404, message || 'Resource not found', code || 'NOT_FOUND'); }
  static conflict(message, code) { return new ApiError(409, message, code || 'CONFLICT'); }
}

/** Wrap async route handlers so rejections reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Standard success payload. */
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

module.exports = { ApiError, asyncHandler, ok };

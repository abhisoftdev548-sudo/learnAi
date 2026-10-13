'use strict';
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

/** 404 for unknown API routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Central error handler — consistent JSON, no stack traces in production. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'SERVER_ERROR';
  let errors = err.errors;

  // Mongoose validation
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    code = 'VALIDATION_ERROR';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = 'Validation failed';
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_ID';
    message = `Invalid value for ${err.path}`;
  }

  // Duplicate key
  if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_VALUE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  }

  if (status === 500) {
    console.error('[error]', err);
    if (env.isProd) {
      message = 'Internal server error';
      code = 'SERVER_ERROR';
    }
  }

  const payload = { success: false, message, code };
  if (errors) payload.errors = errors;
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };

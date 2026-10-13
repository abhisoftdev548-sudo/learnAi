import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, { code: 'ROUTE_NOT_FOUND' }));
}

/**
 * Centralised error handler — every failure leaves the API in the same shape:
 * { success: false, error: { message, code, details, stack? } }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, _next) {
  let normalized = error instanceof ApiError ? error : ApiError.fromMongo(error);

  if (!normalized) {
    if (error?.type === 'entity.too.large') normalized = new ApiError(413, 'Request payload is too large', { code: 'PAYLOAD_TOO_LARGE' });
    else if (error?.name === 'SyntaxError' && 'body' in error) normalized = ApiError.badRequest('Malformed JSON body');
    else normalized = ApiError.internal(env.isProduction ? 'Internal server error' : error?.message || 'Internal server error');
  }

  const status = normalized.statusCode ?? 500;
  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${status}`, error?.stack ?? normalized.message);
  } else if (!env.isTest) {
    logger.debug(`${req.method} ${req.originalUrl} -> ${status} ${normalized.message}`);
  }

  const payload = {
    success: false,
    error: {
      message: normalized.message,
      code: normalized.code,
      ...(normalized.details ? { details: normalized.details } : {}),
      ...(env.isProduction || normalized.expose === false ? {} : { path: `${req.method} ${req.originalUrl}` }),
    },
  };
  if (!env.isProduction && !normalized.expose && error?.stack) payload.error.stack = error.stack.split('\n').slice(0, 6);

  return res.status(status).json(payload);
}

export default { notFoundHandler, errorHandler };

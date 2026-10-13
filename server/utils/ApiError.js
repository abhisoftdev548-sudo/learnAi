/** Operational error with an HTTP status code and a machine readable code. */
export class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = options.code ?? defaultCode(statusCode);
    this.details = options.details ?? null;
    this.expose = options.expose ?? statusCode < 500;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', details });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, { code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message, { code: 'FORBIDDEN' });
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, { code: 'NOT_FOUND' });
  }

  static conflict(message, details, code = 'CONFLICT') {
    return new ApiError(409, message, { code, details });
  }

  static tooMany(message = 'Too many requests', details) {
    return new ApiError(429, message, { code: 'RATE_LIMITED', details });
  }

  static unprocessable(message, details) {
    return new ApiError(422, message, { code: 'UNPROCESSABLE_ENTITY', details });
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, { code: 'INTERNAL_ERROR', expose: false });
  }

  static fromMongo(error) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyValue ?? {})[0] ?? 'field';
      return ApiError.conflict(`${field} is already taken`, { field });
    }
    if (error?.name === 'ValidationError') {
      const details = Object.entries(error.errors ?? {}).map(([field, err]) => ({ field, message: err.message }));
      return ApiError.unprocessable('Validation failed', details);
    }
    if (error?.name === 'CastError') {
      return ApiError.badRequest(`Invalid value for ${error.path}`, { path: error.path });
    }
    return null;
  }
}

function defaultCode(statusCode) {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    default:
      return statusCode >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
  }
}

export default ApiError;

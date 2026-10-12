import { env } from '../config/env.js';
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = err.message;
  if (err.code === 11000) { status = 409; message = 'Resource already exists'; }
  if (err.name === 'ValidationError' || err.name === 'CastError') { status = 400; message = 'Invalid request data'; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  if (err.type === 'entity.too.large') { status = 413; message = 'Request body too large'; }
  if (status >= 500) {
    // Do not log request bodies, cookies, database URIs, or arbitrary exception messages.
    console.error(JSON.stringify({ event: 'request_error', requestId: req.id, errorType: err.name, status }));
    message = 'Internal server error';
  }
  res.status(status).json({ success: false, message, ...(env.NODE_ENV !== 'production' ? { requestId: req.id } : {}) });
}

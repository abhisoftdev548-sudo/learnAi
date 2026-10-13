'use strict';
const multer = require('multer');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/** Map multer/other errors into the standard error shape. */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest(`File exceeds ${env.maxUploadMb}MB limit`, 'FILE_TOO_LARGE'));
    }
    return next(ApiError.badRequest(err.message, 'UPLOAD_ERROR'));
  }
  return next(err);
}

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only image files (png, jpg, webp, gif) are allowed', 'INVALID_FILE_TYPE'));
  },
});

module.exports = { imageUpload, handleUploadError };

'use strict';
const multer = require('multer');
const path = require('node:path');
const crypto = require('node:crypto');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', env.uploadDir);

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only image files (png, jpg, webp, gif) are allowed', 'INVALID_FILE_TYPE'));
  },
});

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

/**
 * Work-submission uploads: images plus common document/archive types.
 * Kept stricter than an open file store: whitelist + size cap.
 */
const WORK_MIME = new Set([
  ...ALLOWED_MIME,
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const WORK_MAX_MB = 8;

const workStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.bin';
    cb(null, `work-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const uploadWork = multer({
  storage: workStorage,
  limits: { fileSize: WORK_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (WORK_MIME.has(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Unsupported file type (allowed: images, pdf, zip, docx, txt)', 'INVALID_FILE_TYPE'));
  },
});

module.exports = { upload, handleUploadError, uploadWork, UPLOAD_ROOT, WORK_MAX_MB };

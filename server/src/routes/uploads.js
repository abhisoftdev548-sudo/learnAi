'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved } = require('../middleware/auth');
const { imageUpload, handleUploadError } = require('../middleware/upload');
const { uploadImage } = require('../services/cloudinary.service');
const { asyncHandler, ok, ApiError } = require('../utils/errors');

router.use(requireAuth, requireApproved);

router.post(
  '/images',
  (req, res, next) => {
    return imageUpload.array('images', 6)(req, res, (err) => {
      if (err) return handleUploadError(err, req, res, next);
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest('Select at least one image', 'NO_FILES');
    return ok(res, {
      images: await Promise.all(req.files.map(async (file) => ({
        url: await uploadImage(file.buffer, 'growth-circle/content'),
        fileName: file.originalname,
      }))),
    }, 201);
  })
);

module.exports = router;

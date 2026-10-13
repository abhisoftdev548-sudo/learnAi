'use strict';
const { v2: cloudinary } = require('cloudinary');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

function configure() {
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new ApiError(
      503,
      'Cloudinary image storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      'IMAGE_STORAGE_NOT_CONFIGURED'
    );
  }
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

function uploadImage(buffer, folder = 'growth-circle') {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(new ApiError(503, 'Image storage upload failed. Please try again.', 'IMAGE_UPLOAD_FAILED'));
          return;
        }
        if (!result || typeof result.secure_url !== 'string' || !result.secure_url.startsWith('https://')) {
          reject(new ApiError(503, 'Image storage returned an invalid image URL.', 'IMAGE_URL_INVALID'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadImage };

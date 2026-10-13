'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const { uploadWork, handleUploadError } = require('../middleware/upload');
const { asyncHandler, ok, ApiError } = require('../utils/errors');
const c = require('../controllers/submission.controller');

router.use(requireAuth, requireApproved);

// File upload for submission answers (images/pdf/zip/docx/txt, 8MB).
router.post('/upload', uploadWork.single('file'), handleUploadError, asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file received (field name must be "file")');
  return ok(res, { url: `/uploads/${req.file.filename}`, fileName: req.file.originalname, size: req.file.size }, 201);
}));

// Member flows
router.post('/challenges/:id', c.createSubmission);
router.get('/challenges/:id/mine', c.mySubmissions);

// Admin review flows
router.get('/', requireAdmin, c.listSubmissions);
router.get('/challenges/:id/queue', requireAdmin, c.challengeQueue);
router.get('/:id', c.getSubmission); // owner or admin (checked inside)
router.post('/:id/review', requireAdmin, c.reviewSubmission);

module.exports = router;

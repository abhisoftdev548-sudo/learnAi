'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/submission.controller');

router.use(requireAuth, requireApproved);

// Member flows
router.post('/challenges/:id', c.createSubmission);
router.get('/challenges/:id/mine', c.mySubmissions);

// Admin review flows
router.get('/', requireAdmin, c.listSubmissions);
router.get('/challenges/:id/queue', requireAdmin, c.challengeQueue);
router.get('/:id', c.getSubmission); // owner or admin (checked inside)
router.post('/:id/review', requireAdmin, c.reviewSubmission);

module.exports = router;

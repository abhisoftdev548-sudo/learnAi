'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/challenge.controller');

// All challenge routes require an authenticated, approved account.
router.use(requireAuth, requireApproved);

router.get('/', c.listChallenges);
router.get('/:id', c.getChallenge);

// Admin-only management.
router.post('/', requireAdmin, c.createChallenge);
router.patch('/:id', requireAdmin, c.updateChallenge);
router.post('/:id/status', requireAdmin, c.setChallengeStatus);
router.delete('/:id', requireAdmin, c.deleteChallenge);
router.get('/:id/participation', requireAdmin, c.participationReport);

module.exports = router;

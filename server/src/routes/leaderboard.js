'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved } = require('../middleware/auth');
const { asyncHandler, ok } = require('../utils/errors');
const { leaderboard } = require('../services/leaderboard.service');

router.use(requireAuth, requireApproved);

/**
 * GET /api/leaderboard?period=all|month|week&limit=100
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const period = ['all', 'month', 'week'].includes(req.query.period) ? req.query.period : 'all';
    const limit = Math.min(200, Math.max(5, parseInt(req.query.limit || '100', 10) || 100));
    const data = await leaderboard({ period, limit, forUserId: req.user._id });
    return ok(res, { period, rows: data.rows, me: data.me });
  })
);

module.exports = router;

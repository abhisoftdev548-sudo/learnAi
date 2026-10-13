'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/admin.controller');

// Everything under /api/admin is admin-only — enforced by the server.
router.use(requireAuth, requireApproved, requireAdmin);

router.get('/stats', c.stats);
router.get('/pending', c.pendingUsers);
router.get('/users', c.listUsers);
router.get('/users/:id', c.getUserDetail);
router.patch('/users/:id/status', c.setUserStatus);
router.patch('/users/:id/role', c.setUserRole);

module.exports = router;

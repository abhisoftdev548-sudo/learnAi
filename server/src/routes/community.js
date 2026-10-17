'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/community.controller');

router.use(requireAuth, requireApproved);

router.get('/', c.listPosts);
router.post('/', c.createPost);

// Moderation (admin)
router.get('/reports/all', requireAdmin, c.listReports);
router.get('/reports', requireAdmin, c.listReports);
router.patch('/reports/:id', requireAdmin, c.resolveReport);
router.delete('/:id', c.removePost);

router.get('/:id', c.getPost);
router.post('/:id/like', c.likePost);
router.delete('/:id/like', c.unlikePost);
router.get('/:id/likes', c.listLikes);
router.get('/:id/comments', c.listComments);
router.post('/:id/comments', c.createComment);
router.post('/:id/report', c.reportPost);

module.exports = router;

'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/poll.controller');

router.use(requireAuth, requireApproved);

router.get('/', c.listPolls);
router.get('/:id', c.getPoll);
router.post('/:id/vote', c.vote);

// Admin management
router.post('/', requireAdmin, c.createPoll);
router.patch('/:id', requireAdmin, c.updatePoll);
router.post('/:id/status', requireAdmin, c.setPollStatus);
router.delete('/:id', requireAdmin, c.deletePoll);
router.get('/:id/voters', requireAdmin, c.listVoters);

module.exports = router;

'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved } = require('../middleware/auth');
const c = require('../controllers/chat.controller');

router.use(requireAuth, requireApproved);
router.get('/messages', c.listMessages);
router.post('/messages', c.createMessage);
router.delete('/messages/:id', c.deleteMessage);

module.exports = router;

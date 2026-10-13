'use strict';
const router = require('express').Router();
const { requireAuth, requireApproved, requireAdmin } = require('../middleware/auth');
const c = require('../controllers/event.controller');

router.use(requireAuth, requireApproved);

router.get('/', c.listEvents);
router.get('/:id', c.getEvent);
router.post('/:id/register', c.registerForEvent);
router.delete('/:id/register', c.cancelRegistration);

// Admin management
router.post('/', requireAdmin, c.createEvent);
router.patch('/:id', requireAdmin, c.updateEvent);
router.post('/:id/status', requireAdmin, c.setEventStatus);
router.delete('/:id', requireAdmin, c.deleteEvent);
router.get('/:id/registrations', requireAdmin, c.listRegistrations);
router.post('/:id/attendance', requireAdmin, c.setAttendance);

module.exports = router;

'use strict';
const router = require('express').Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { requireAuth, requireApproved } = require('../middleware/auth');
const { ApiError, asyncHandler, ok } = require('../utils/errors');

router.use(requireAuth, requireApproved);

/** GET /api/notifications?unread=1&page=1 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));
    const filter = { user: req.user._id };
    if (req.query.unread === '1') filter.read = false;

    const [total, items] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    const unread = await Notification.countDocuments({ user: req.user._id, read: false });
    return ok(res, { items, total, unread, page, pages: Math.ceil(total / limit) || 1 });
  })
);

/** GET /api/notifications/unread-count */
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ user: req.user._id, read: false });
    return ok(res, { count });
  })
);

/** POST /api/notifications/:id/read */
router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid notification id');
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );
    if (!n) throw ApiError.notFound('Notification not found');
    return ok(res, { notification: n });
  })
);

/** POST /api/notifications/read-all */
router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
    return ok(res, { message: 'All notifications marked as read' });
  })
);

module.exports = router;

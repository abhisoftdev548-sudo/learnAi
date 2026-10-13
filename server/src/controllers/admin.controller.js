'use strict';
const mongoose = require('mongoose');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const Event = require('../models/Event');
const Poll = require('../models/Poll');
const { SubmissionReview } = require('../models/Submission');
const { Post, Comment, Report } = require('../models/community');
const { notify } = require('../models/notification.helper');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { eventStartAt } = require('./event.controller');

/** GET /api/admin/stats — admin overview cards (all from real DB counts) */
const stats = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    registeredUsers,
    pendingUsers,
    approvedMembers,
    activeChallenges,
    totalSubmissions,
    pendingReviews,
    upcomingEvents,
    activePolls,
    openReports,
    recentReviews,
    topMembers,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: 'pending' }),
    User.countDocuments({ status: 'approved' }),
    Challenge.countDocuments({ status: 'published', deadline: { $gte: now } }),
    Submission.countDocuments({}),
    Submission.countDocuments({ status: { $in: ['submitted', 'under_review'] } }),
    Event.find({ status: 'published', date: { $gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) } })
      .select('date startTime')
      .lean()
      .then((events) => events.filter((event) => eventStartAt(event) >= now).length),
    Poll.countDocuments({ status: 'active', startsAt: { $lte: now }, endsAt: { $gte: now } }),
    Report.countDocuments({ status: 'open' }),
    SubmissionReview.find({ isLatest: true })
      .populate('member', 'name username')
      .populate('reviewer', 'name username')
      .populate('challenge', 'title')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    User.find({ status: 'approved' }).select('name username photoUrl points').sort({ points: -1 }).limit(5).lean(),
  ]);

  const [weeklySubmissions, monthlyPosts] = await Promise.all([
    Submission.countDocuments({ submittedAt: { $gte: monthAgo } }),
    Post.countDocuments({ createdAt: { $gte: monthAgo }, status: 'visible' }),
  ]);

  return ok(res, {
    registeredUsers,
    pendingUsers,
    approvedMembers,
    activeChallenges,
    totalSubmissions,
    pendingReviews,
    upcomingEvents,
    activePolls,
    openReports,
    weeklySubmissions,
    monthlyPosts,
    recentReviews: recentReviews.map((r) => ({
      id: r._id,
      pointsAwarded: r.pointsAwarded,
      status: r.status,
      member: r.member,
      reviewer: r.reviewer,
      challenge: r.challenge,
      createdAt: r.createdAt,
    })),
    topMembers: topMembers.map((m, i) => ({ rank: i + 1, ...(m.toObject ? m.toObject() : m) })),
  });
});

/** GET /api/admin/users?status=&q=&page= — member management */
const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.role) filter.role = String(req.query.role);
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { username: rx }, { email: rx }];
  }
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10) || 20));

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  return ok(res, { users, total, page, pages: Math.ceil(total / limit) || 1 });
});

/** GET /api/admin/users/:id — member detail incl. participation */
const getUserDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid user id');
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('User not found');

  const [submissions, reviews, registrations, posts] = await Promise.all([
    Submission.find({ member: user._id })
      .populate('challenge', 'title deadline category')
      .sort({ submittedAt: -1 })
      .limit(20)
      .lean(),
    SubmissionReview.find({ member: user._id, isLatest: true }).sort({ createdAt: -1 }).limit(10).lean(),
    require('../models/Event').EventRegistration.find({ member: user._id }).populate('event', 'title date status').sort({ registeredAt: -1 }).limit(10).lean(),
    Post.countDocuments({ author: user._id, status: 'visible' }),
  ]);

  const { publicUser } = require('../routes/auth');
  return ok(res, {
    user: { ...publicUser(user), points: user.points, completedChallenges: user.completedChallenges, eventsAttended: user.eventsAttended, status: user.status, role: user.role },
    participation: { submissions, reviews, registrations, posts },
  });
});

async function changeUserStatus(target, newStatus, admin, message) {
  const previous = target.status;
  target.status = newStatus;
  if (newStatus === 'approved') {
    target.approvedAt = new Date();
    target.rejectedAt = null;
  }
  if (newStatus === 'rejected') target.rejectedAt = new Date();
  target.reviewedBy = admin._id;
  await target.save();

  const type = newStatus === 'approved' ? 'account_approved' : newStatus === 'rejected' ? 'account_rejected' : 'account_suspended';
  await notify(target._id, type, message.title, message.body, message.link || '/');
  return previous;
}

/** PATCH /api/admin/users/:id/status  { status: approved|rejected|suspended|pending } */
const setUserStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid user id');
  const { status, reason } = req.body || {};
  if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
    throw ApiError.badRequest('status must be approved, rejected, suspended or pending');
  }
  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');
  if (String(target._id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot change your own account status', 'SELF_ACTION');
  }

  const messages = {
    approved: {
      title: 'Your account has been approved 🎉',
      body: 'Welcome to Growth Circle! Log in to see challenges, events and the leaderboard.',
      link: '/login',
    },
    rejected: {
      title: 'Your registration was not approved',
      body: reason ? `Reason: ${reason}` : 'Contact an administrator for details.',
      link: '/login',
    },
    suspended: {
      title: 'Your account has been suspended',
      body: reason ? `Reason: ${reason}` : 'Contact an administrator for details.',
      link: '/login',
    },
    pending: { title: 'Your account is pending review', body: 'An admin will review your registration soon.', link: '/pending' },
  };
  await changeUserStatus(target, status, req.user, messages[status]);
  return ok(res, { user: { id: target._id, status: target.status, role: target.role } });
});

/** PATCH /api/admin/users/:id/role  { role: member|admin } */
const setUserRole = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid user id');
  const { role } = req.body || {};
  if (!['member', 'admin'].includes(role)) throw ApiError.badRequest('role must be member or admin');

  const target = await User.findById(req.params.id);
  if (!target) throw ApiError.notFound('User not found');

  // Prevent lock-out: the last approved admin cannot demote themselves.
  if (target.role === 'admin' && role === 'member') {
    const otherAdmins = await User.countDocuments({
      role: 'admin', status: 'approved', _id: { $ne: target._id },
    });
    if (otherAdmins === 0) {
      throw ApiError.conflict('At least one approved admin must remain', 'LAST_ADMIN');
    }
  }

  target.role = role;
  await target.save();
  await notify(target._id, 'general',
    role === 'admin' ? 'You are now an administrator' : 'Your role changed to member',
    role === 'admin' ? 'You have admin access to the Growth Circle panel.' : 'You now have standard member permissions.',
    '/admin');
  return ok(res, { user: { id: target._id, status: target.status, role: target.role } });
});

/** GET /api/admin/pending — pending registration requests (alias with extras) */
const pendingUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ status: 'pending' }).sort({ createdAt: 1 }).lean();
  return ok(res, { users });
});

module.exports = {
  stats,
  listUsers,
  getUserDetail,
  setUserStatus,
  setUserRole,
  pendingUsers,
};

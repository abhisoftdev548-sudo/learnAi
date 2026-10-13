'use strict';
const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/community').Post;
const Submission = require('../models/Submission');
const EventRegistration = require('../models/Event').EventRegistration;
const { SubmissionReview } = require('../models/Submission');
const { requireAuth, requireApproved } = require('../middleware/auth');
const env = require('../config/env');
const { imageUpload } = require('../middleware/upload');
const { uploadImage } = require('../services/cloudinary.service');
const { validate, required, minLength, maxLength, email, pattern, isUrl } = require('../utils/validate');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { eventStartAt } = require('../controllers/event.controller');

// Every route here needs an authenticated, approved member.
router.use(requireAuth, requireApproved);

/** GET /api/users — approved member directory with search + filters. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    const skill = String(req.query.skill || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '24', 10) || 24));

    const filter = { status: 'approved' };
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { username: rx }, { bio: rx }];
    }
    if (skill) filter.skills = { $regex: new RegExp(`^${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('name username bio skills photoUrl points completedChallenges createdAt')
        .sort({ points: -1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return ok(res, { users, total, page, pages: Math.ceil(total / limit) || 1 });
  })
);

/** GET /api/users/skills — distinct skill list for filter dropdowns. */
router.get(
  '/skills',
  asyncHandler(async (req, res) => {
    const users = await User.find({ status: 'approved' }).select('skills').lean();
    const set = new Set();
    users.forEach((u) => (u.skills || []).forEach((s) => s && set.add(s)));
    return ok(res, { skills: [...set].sort((a, b) => a.localeCompare(b)).slice(0, 100) });
  })
);

/** GET /api/users/dashboard — overview cards + lists for the logged-in member */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const Challenge = require('../models/Challenge');
    const Event = require('../models/Event');
    const EventRegistration = require('../models/Event').EventRegistration;
    const SubmissionReview = require('../models/SubmissionReview');
    const Post = require('../models/community').Post;
    const Notification = require('../models/Notification');
    const { leaderboard } = require('../services/leaderboard.service');

    const [
      totalApprovedMembers,
      activeChallenges,
      upcomingEvents,
      myCompleted,
      myRank,
      upcomingDeadlines,
      upcomingEventList,
      recentChallenges,
      recentActivity,
      recentReviews,
      unreadNotifications,
      mySubmissionCount,
      myEventCount,
      myPostCount,
    ] = await Promise.all([
      User.countDocuments({ status: 'approved' }),
      Challenge.countDocuments({ status: 'published', startAt: { $lte: now }, deadline: { $gte: now } }),
      Event.find({ status: 'published', date: { $gte: today } })
        .select('date startTime')
        .lean()
        .then((events) => events.filter((event) => eventStartAt(event) > now).length),
      Promise.resolve(req.user.completedChallenges),
      leaderboard({ period: 'all', limit: 5, forUserId: req.user._id }),
      Challenge.find({ status: 'published', deadline: { $gte: now } })
        .select('title deadline maxPoints category difficulty')
        .sort({ deadline: 1 })
        .limit(5)
        .lean(),
      Event.find({ status: 'published', date: { $gte: today } })
        .select('title date startTime endTime platform category isPrivate')
        .sort({ date: 1 })
        .lean(),
      Challenge.find({ status: 'published' })
        .select('title description category difficulty maxPoints deadline coverImage')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean(),
      Post.find({ status: 'visible' })
        .populate('author', 'name username photoUrl')
        .select('title body author likeCount commentCount createdAt kind')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      SubmissionReview.find({ member: req.user._id })
        .populate('challenge', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
      Submission.countDocuments({ member: req.user._id }),
      EventRegistration.countDocuments({ member: req.user._id }),
      Post.countDocuments({ author: req.user._id, status: 'visible' }),
    ]);

    return ok(res, {
      cards: {
        totalApprovedMembers,
        activeChallenges,
        upcomingEvents,
        myCompletedChallenges: myCompleted,
        myPoints: req.user.points,
        myRank: myRank.me ? myRank.me.rank : null,
      },
      upcomingDeadlines,
      upcomingEventsList: upcomingEventList.filter((event) => eventStartAt(event) > now).slice(0, 4),
      recentChallenges,
      recentActivity: recentActivity.map((p) => ({
        id: p._id, title: p.title, body: p.body.slice(0, 160), author: p.author,
        likeCount: p.likeCount, commentCount: p.commentCount, createdAt: p.createdAt, kind: p.kind,
      })),
      recentReviews: recentReviews.map((r) => ({
        id: r._id, challenge: r.challenge, pointsAwarded: r.pointsAwarded,
        status: r.status, feedback: r.feedback, createdAt: r.createdAt,
      })),
      personalActivity: {
        submissions: mySubmissionCount,
        eventsRegistered: myEventCount,
        posts: myPostCount,
        unreadNotifications,
        points: req.user.points,
      },
      leaderboardTop: myRank.rows,
    });
  })
);

/** GET /api/users/leaderboard/me — convenience for the dashboard. */
router.get(
  '/leaderboard/me',
  asyncHandler(async (req, res) => {
    const better = await require('../services/leaderboard.service').leaderboard({
      period: 'all',
      limit: 1,
      forUserId: req.user._id,
    });
    return ok(res, { me: better.me });
  })
);

/** GET /api/users/:username — public team profile (approved members only in payload). */
router.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({
      username: String(req.params.username).toLowerCase(),
      status: 'approved',
    }).lean();
    if (!user) throw ApiError.notFound('Member not found');

    // Never expose sensitive account data on public profile APIs.
    const profile = {
      id: user._id,
      name: user.name,
      username: user.username,
      bio: user.bio,
      skills: user.skills,
      photoUrl: user.photoUrl,
      githubUrl: user.githubUrl,
      linkedinUrl: user.linkedinUrl,
      points: user.points,
      completedChallenges: user.completedChallenges,
      eventsAttended: user.eventsAttended,
      joinedAt: user.createdAt,
      role: user.role,
    };

    const [recentSubmissions, recentPosts, attended] = await Promise.all([
      Submission.find({ member: user._id, status: 'approved' })
        .select('answers status score submittedAt challenge')
        .populate('challenge', 'title category difficulty')
        .sort({ reviewedAt: -1 })
        .limit(5)
        .lean(),
      Post.find({ author: user._id, status: 'visible' })
        .select('title body likeCount commentCount createdAt kind challenge')
        .populate('challenge', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      EventRegistration.countDocuments({ member: user._id, status: 'attended' }),
    ]);

    return ok(res, {
      profile,
      recentSubmissions: recentSubmissions.map((s) => ({
        id: s._id,
        challenge: s.challenge,
        status: s.status,
        score: s.score,
        submittedAt: s.submittedAt,
      })),
      recentPosts: recentPosts.map((p) => ({
        id: p._id,
        title: p.title,
        body: p.body.slice(0, 240),
        challenge: p.challenge,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        createdAt: p.createdAt,
      })),
      eventsAttended: attended,
    });
  })
);

/** PATCH /api/users/me — edit permitted profile fields only. */
router.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    validate(body, {
      name: [minLength(2), maxLength(60)],
      bio: [maxLength(200, 'Bio must be at most 200 characters')],
      githubUrl: [isUrl()],
      linkedinUrl: [isUrl()],
      email: [email()],
    });

    const updates = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.bio !== undefined) updates.bio = String(body.bio).trim();
    if (body.skills !== undefined) {
      if (!Array.isArray(body.skills)) throw ApiError.badRequest('skills must be a list');
      updates.skills = body.skills
        .filter((s) => typeof s === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
    }
    if (body.githubUrl !== undefined) updates.githubUrl = body.githubUrl;
    if (body.linkedinUrl !== undefined) updates.linkedinUrl = body.linkedinUrl;
    if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl;

    // Email changes require re-validation and uniqueness.
    if (body.email !== undefined && body.email.toLowerCase() !== req.user.email) {
      const dup = await User.findOne({ email: String(body.email).toLowerCase() });
      if (dup) throw ApiError.conflict('That email is already in use', 'DUPLICATE_EMAIL');
      updates.email = String(body.email).toLowerCase();
    }

    // Defense in depth: role/status/points can NEVER be edited here.
    const updated = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    const { publicUser } = require('../routes/auth');
    return ok(res, { user: publicUser(updated) });
  })
);

/** POST /api/users/me/photo — upload a profile photo (multipart, field: photo). */
router.post(
  '/me/photo',
  imageUpload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('No image received (field name must be "photo")');
    const photoUrl = await uploadImage(req.file.buffer, 'growth-circle/avatars');
    await User.updateOne({ _id: req.user._id }, { $set: { photoUrl } });
    return ok(res, { photoUrl });
  })
);

/** PATCH /api/users/me/password */
router.patch(
  '/me/password',
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    validate({ currentPassword, newPassword }, {
      currentPassword: [required('Current password is required')],
      newPassword: [required('New password is required'), minLength(8, 'New password must be at least 8 characters'), maxLength(128)],
    });

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!(await user.verifyPassword(currentPassword))) {
      throw ApiError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');
    }
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
    return ok(res, { message: 'Password updated' });
  })
);

module.exports = router;

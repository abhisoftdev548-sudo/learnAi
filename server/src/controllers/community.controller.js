'use strict';
const mongoose = require('mongoose');
const { Post, Comment, Like, Report } = require('../models/community');
const User = require('../models/User');
const { notify } = require('../models/notification.helper');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { validate, required, minLength, maxLength, isUrl, custom } = require('../utils/validate');

// --- spam guards -----------------------------------------------------------
const MIN_SECONDS_BETWEEN_POSTS = 20;
const MIN_SECONDS_BETWEEN_COMMENTS = 5;

async function assertNotSpamming(model, userId, minSeconds) {
  const recent = await model
    .findOne({ author: userId, createdAt: { $gte: new Date(Date.now() - minSeconds * 1000) } })
    .sort({ createdAt: -1 });
  if (recent) {
    throw new ApiError(
      429,
      `You are posting too quickly — wait ${minSeconds} seconds and try again.`,
      'RATE_LIMITED'
    );
  }
}

function serializePost(p, { likedByMe = false, canModerate = false } = {}) {
  return {
    id: p._id,
    title: p.title,
    body: p.body,
    kind: p.kind,
    challenge: p.challenge
      ? (p.challenge._id ? { id: p.challenge._id, title: p.challenge.title, category: p.challenge.category } : p.challenge)
      : null,
    links: p.links,
    images: p.images,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe,
    status: p.status,
    author: p.author && p.author._id
      ? { id: p.author._id, name: p.author.name, username: p.author.username, photoUrl: p.author.photoUrl, role: p.author.role }
      : p.author,
    fromSubmission: p.fromSubmission,
    createdAt: p.createdAt,
    ...(canModerate ? { removedReason: p.removedReason } : {}),
  };
}

function validatePostBody(body, { partial = false } = {}) {
  validate(body, {
    title: partial ? [minLength(3), maxLength(160)] : [required('Title is required'), minLength(3), maxLength(160)],
    body: partial ? [minLength(1), maxLength(4000)] : [required('Body is required'), minLength(1, 'Write something'), maxLength(4000)],
    links: [custom((v) => (v === undefined || Array.isArray(v) ? null : 'links must be a list'))],
    images: [custom((v) => (v === undefined || Array.isArray(v) ? null : 'images must be a list'))],
  });
  if (body.links) {
    if (body.links.length > 6) throw ApiError.badRequest('At most 6 links');
    for (const l of body.links) {
      try {
        const u = new URL(String(l.url));
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
      } catch {
        throw ApiError.badRequest(`Invalid link URL: ${l && l.url}`);
      }
      if (!l.label || String(l.label).length > 60) throw ApiError.badRequest('Each link needs a short label');
    }
  }
  if (body.images) {
    if (body.images.length > 6) throw ApiError.badRequest('At most 6 images');
    for (const img of body.images) {
      if (!String(img).startsWith('/uploads/') && !String(img).startsWith('http')) {
        throw ApiError.badRequest('Images must be uploaded files or URLs');
      }
    }
  }
}

/** GET /api/community?page=&q=&challenge=  — paginated feed */
const listPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(req.query.limit || '10', 10) || 10));
  const isAdmin = req.user.role === 'admin';

  const filter = {};
  if (!isAdmin || req.query.includeRemoved !== '1') filter.status = 'visible';
  if (req.query.author) {
    if (!mongoose.isValidObjectId(req.query.author)) throw ApiError.badRequest('Invalid author');
    filter.author = req.query.author;
  }
  if (req.query.challenge && mongoose.isValidObjectId(req.query.challenge)) filter.challenge = req.query.challenge;
  if (req.query.mine === '1') filter.author = req.user._id;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { body: rx }];
  }

  const [total, posts] = await Promise.all([
    Post.countDocuments(filter),
    Post.find(filter)
      .populate('author', 'name username photoUrl role')
      .populate('challenge', 'title category')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const likes = await Like.find({
    post: { $in: posts.map((p) => p._id) },
    user: req.user._id,
  }).lean();
  const likedSet = new Set(likes.map((l) => String(l.post)));

  return ok(res, {
    items: posts.map((p) => serializePost(p, { likedByMe: likedSet.has(String(p._id)), canModerate: isAdmin })),
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

/** POST /api/community — manual member post */
const createPost = asyncHandler(async (req, res) => {
  validatePostBody(req.body);
  await assertNotSpamming(Post, req.user._id, MIN_SECONDS_BETWEEN_POSTS);

  const b = req.body;
  let challenge = null;
  if (b.challengeId) {
    if (!mongoose.isValidObjectId(b.challengeId)) throw ApiError.badRequest('Invalid challenge id');
    challenge = b.challengeId;
  }

  const post = await Post.create({
    author: req.user._id,
    title: b.title.trim(),
    body: b.body,
    links: (b.links || []).map((l) => ({ label: String(l.label).slice(0, 60), url: String(l.url).slice(0, 500) })),
    images: (b.images || []).slice(0, 6),
    challenge,
    kind: 'manual',
  });

  const populated = await Post.findById(post._id).populate('author', 'name username photoUrl role');
  return ok(res, { post: serializePost(populated, { canModerate: req.user.role === 'admin' }) }, 201);
});

/** GET /api/community/:id */
const getPost = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const isAdmin = req.user.role === 'admin';
  const filter = { _id: req.params.id };
  if (!isAdmin) filter.status = 'visible';
  const post = await Post.findById(filter)
    .populate('author', 'name username photoUrl role')
    .populate('challenge', 'title category')
    .lean();
  if (!post) throw ApiError.notFound('Post not found');

  const like = await Like.findOne({ post: post._id, user: req.user._id }).lean();
  return ok(res, { post: serializePost(post, { likedByMe: !!like, canModerate: isAdmin }) });
});

/** POST /api/community/:id/like — idempotent toggle ON */
const likePost = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
  if (!post) throw ApiError.notFound('Post not found');

  let created = false;
  try {
    await Like.create({ post: post._id, user: req.user._id });
    created = true;
  } catch (e) {
    if (e.code !== 11000) throw e; // already liked -> idempotent no-op
  }
  if (created) {
    await Post.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } });
    if (String(post.author) !== String(req.user._id)) {
      await notify(post.author, 'post_liked', `${req.user.name} liked your post`,
        post.title, `/community/${post._id}`);
    }
  }
  const likeCount = await Post.findById(post._id).select('likeCount').lean();
  return ok(res, { liked: true, likeCount: likeCount.likeCount });
});

/** DELETE /api/community/:id/like — toggle OFF */
const unlikePost = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const result = await Like.deleteOne({ post: req.params.id, user: req.user._id });
  if (result.deletedCount) {
    await Post.updateOne({ _id: req.params.id, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } });
  }
  const likeCount = await Post.findById(req.params.id).select('likeCount').lean();
  return ok(res, { liked: false, likeCount: likeCount ? likeCount.likeCount : 0 });
});

/** GET /api/community/:id/comments */
const listComments = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const isAdmin = req.user.role === 'admin';
  const filter = { post: req.params.id };
  if (!isAdmin) filter.status = 'visible';
  const comments = await Comment.find(filter)
    .populate('author', 'name username photoUrl role')
    .sort({ createdAt: 1 })
    .limit(500)
    .lean();
  return ok(res, {
    items: comments.map((c) => ({
      id: c._id,
      body: c.body,
      status: c.status,
      author: c.author,
      createdAt: c.createdAt,
    })),
  });
});

/** POST /api/community/:id/comments */
const createComment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const body = String((req.body || {}).body || '').trim();
  if (!body) throw ApiError.badRequest('Comment text is required');
  if (body.length > 1000) throw ApiError.badRequest('Comments are limited to 1000 characters');

  const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
  if (!post) throw ApiError.notFound('Post not found');

  await assertNotSpamming(Comment, req.user._id, MIN_SECONDS_BETWEEN_COMMENTS);

  const comment = await Comment.create({ post: post._id, author: req.user._id, body });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

  if (String(post.author) !== String(req.user._id)) {
    await notify(post.author, 'post_commented', `${req.user.name} commented on your post`,
      body.slice(0, 120), `/community/${post._id}`);
  }

  const populated = await Comment.findById(comment._id).populate('author', 'name username photoUrl role');
  return ok(res, {
    comment: {
      id: populated._id,
      body: populated.body,
      author: populated.author,
      createdAt: populated.createdAt,
      status: populated.status,
    },
  }, 201);
});

/** DELETE /api/community/comments/:id — author, post owner, or admin */
const deleteComment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid comment id');
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found');
  const post = await Post.findById(comment.post);
  const isOwner = String(comment.author) === String(req.user._id);
  const isPostOwner = post && String(post.author) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isPostOwner && !isAdmin) {
    throw ApiError.forbidden('You cannot delete this comment', 'FORBIDDEN');
  }

  if (isAdmin && !isOwner) {
    comment.status = 'removed';
    comment.removedBy = req.user._id;
    await comment.save();
    await Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
    return ok(res, { message: 'Comment removed by moderator' });
  }
  await comment.deleteOne();
  await Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
  return ok(res, { message: 'Comment deleted' });
});

/** DELETE /api/community/:id — admin removes a post (soft delete) */
const removePost = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const reason = String((req.body || {}).reason || '').slice(0, 500);
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found');
  post.status = 'removed';
  post.removedBy = req.user._id;
  post.removedReason = reason;
  await post.save();
  return ok(res, { message: 'Post removed' });
});

/** POST /api/community/:id/report — members report content */
const reportPost = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid post id');
  const reason = String((req.body || {}).reason || '').trim();
  if (reason.length < 3 || reason.length > 500) throw ApiError.badRequest('A short reason is required');
  const post = await Post.findOne({ _id: req.params.id, status: 'visible' });
  if (!post) throw ApiError.notFound('Post not found');
  if (String(post.author) === String(req.user._id)) throw ApiError.badRequest('You cannot report your own post');

  let report;
  try {
    report = await Report.create({
      reporter: req.user._id, targetType: 'post', targetId: post._id, reason,
    });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('You have already reported this post', 'ALREADY_REPORTED');
    throw e;
  }
  const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
  await notify(admins.map((a) => a._id), 'general', 'New content report',
    `${req.user.name} reported "${post.title}".`, '/admin/moderation');
  return ok(res, { report }, 201);
});

/** GET /api/community/reports (admin) */
const listReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  else filter.status = 'open';
  const reports = await Report.find(filter)
    .populate('reporter', 'name username')
    .populate('resolvedBy', 'name username')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // Hydrate targets so the admin can act without extra calls.
  const postIds = reports.filter((r) => r.targetType === 'post').map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === 'comment').map((r) => r.targetId);
  const [posts, comments] = await Promise.all([
    Post.find({ _id: { $in: postIds } }).select('title body status author').populate('author', 'name username').lean(),
    Comment.find({ _id: { $in: commentIds } }).select('body status author post').populate('author', 'name username').lean(),
  ]);
  const postMap = new Map(posts.map((p) => [String(p._id), p]));
  const commentMap = new Map(comments.map((c) => [String(c._id), c]));

  return ok(res, {
    items: reports.map((r) => ({
      id: r._id,
      status: r.status,
      reason: r.reason,
      reporter: r.reporter,
      targetType: r.targetType,
      createdAt: r.createdAt,
      resolutionNote: r.resolutionNote,
      target:
        r.targetType === 'post'
          ? (postMap.get(String(r.targetId)) || null)
          : (commentMap.get(String(r.targetId)) || null),
    })),
  });
});

/** PATCH /api/community/reports/:id (admin) — { status: resolved|dismissed, note, action } */
const resolveReport = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid report id');
  const { status, note, action } = req.body || {};
  if (!['resolved', 'dismissed'].includes(status)) throw ApiError.badRequest('status must be resolved or dismissed');

  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');

  // Optional moderation action performed together with resolution.
  if (action === 'remove_content') {
    if (report.targetType === 'post') {
      const post = await Post.findById(report.targetId);
      if (post && post.status !== 'removed') {
        post.status = 'removed';
        post.removedBy = req.user._id;
        post.removedReason = `Moderated: ${note || report.reason}`;
        await post.save();
      }
    } else {
      const comment = await Comment.findById(report.targetId);
      if (comment && comment.status !== 'removed') {
        comment.status = 'removed';
        comment.removedBy = req.user._id;
        await comment.save();
        await Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } });
      }
    }
  }

  report.status = status;
  report.resolvedBy = req.user._id;
  report.resolutionNote = String(note || '').slice(0, 500);
  await report.save();
  await notify(report.reporter, 'report_resolved', 'Your report was reviewed',
    `Status: ${status}`, '/community');
  return ok(res, { report });
});

module.exports = {
  listPosts,
  createPost,
  getPost,
  likePost,
  unlikePost,
  listComments,
  createComment,
  deleteComment,
  removePost,
  reportPost,
  listReports,
  resolveReport,
};

'use strict';
const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventRegistration = require('../models/Event').EventRegistration;
const User = require('../models/User');
const Reward = require('../models/Reward');
const { recalcUserScore } = require('../services/leaderboard.service');
const { notifyAllApproved, notify } = require('../models/notification.helper');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { validate, required, minLength, maxLength, isUrl, oneOf, isDate, custom } = require('../utils/validate');
const { EVENT_CATEGORIES } = require('../models/Event');

const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/;

function eventStartAt(event) {
  const date = new Date(event.date);
  const [hours, minutes] = String(event.startTime || '00:00').split(':').map(Number);
  // The date input is stored at UTC midnight; use its calendar date and the
  // separately stored start time for the event's actual start instant.
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes));
}

function validateEventBody(body, { partial = false } = {}) {
  validate(body, {
    title: partial ? [minLength(3), maxLength(140)] : [required('Title is required'), minLength(3), maxLength(140)],
    description: partial ? [maxLength(5000)] : [required('Description is required'), maxLength(5000)],
    hostName: partial ? [maxLength(80)] : [required('Host name is required'), maxLength(80)],
    category: partial ? [oneOf(EVENT_CATEGORIES)] : [required('Category is required'), oneOf(EVENT_CATEGORIES)],
    date: partial ? [isDate()] : [required('Event date is required'), isDate()],
    startTime: [custom((v) => (v === undefined || TIME_RX.test(String(v)) ? null : 'Start time must be HH:MM'))],
    endTime: [custom((v) => (v === undefined || TIME_RX.test(String(v)) ? null : 'End time must be HH:MM'))],
    registrationDeadline: [isDate()],
    rewardPoints: [custom((v) => (v === undefined || Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 10000 ? null : 'reward points must be an integer from 0 to 10000'))],
    meetingUrl: [isUrl('Meeting URL must be a valid http(s) URL')],
    coverImage: [custom((v) => (
      v === undefined || v === '' || /^https?:\/\//.test(String(v))
        ? null
        : 'Cover image must be a valid URL'
    ))],
    status: [oneOf(['draft', 'published', 'cancelled', 'completed'])],
    isPrivate: [custom((v) => (v === undefined || typeof v === 'boolean' ? null : 'must be true or false'))],
  });
  if (body.startTime && body.endTime && body.startTime >= body.endTime) {
    throw ApiError.badRequest('End time must be after start time', 'INVALID_TIME_RANGE');
  }
}

function serializeEvent(e, { isAdmin = false, registered = false, attending = false } = {}) {
  const now = new Date();
  const eventDate = new Date(e.date);
  const past = e.status === 'completed' || eventStartAt(e) <= now;
  return {
    id: e._id,
    title: e.title,
    description: e.description,
    hostName: e.hostName,
    category: e.category,
    date: eventDate.toISOString(),
    startTime: e.startTime,
    endTime: e.endTime,
    platform: e.platform,
    // Private meeting links are visible to admins and (registered) members only.
    meetingUrl: isAdmin || (!e.isPrivate && e.status === 'published') || (registered && e.status === 'published')
      ? e.meetingUrl
      : '',
    isPrivate: e.isPrivate,
    coverImage: e.coverImage,
    registrationDeadline: e.registrationDeadline ? new Date(e.registrationDeadline).toISOString() : null,
    rewardPoints: e.rewardPoints || 0,
    status: e.status,
    past,
    registered,
    attended: attending,
    registeredCount: e.registeredCount ?? undefined,
    createdBy: e.createdBy && (e.createdBy._id ? { id: e.createdBy._id, name: e.createdBy.name } : e.createdBy),
    createdAt: e.createdAt,
  };
}

/** GET /api/events?upcoming=1|past=1&mine=1 */
const listEvents = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const now = new Date();
  const filter = {};
  if (!isAdmin || req.query.only !== 'all') {
    filter.$or = [{ status: 'published' }];
    if (isAdmin) filter.$or.push({ status: 'draft', createdBy: req.user._id });
  }
  if (req.query.status && isAdmin) filter.status = String(req.query.status);
  if (req.query.category) filter.category = String(req.query.category);
  const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '12', 10) || 12));

  const allEvents = await Event.find(filter)
    .populate('createdBy', 'name username')
    .sort({ date: req.query.past === '1' ? -1 : 1 })
    .lean();
  const filteredEvents = req.query.upcoming === '1'
    ? allEvents.filter((event) => eventStartAt(event) > now)
    : req.query.past === '1'
      ? allEvents.filter((event) => eventStartAt(event) <= now || event.status === 'completed')
      : allEvents;
  const total = filteredEvents.length;
  const events = filteredEvents.slice((page - 1) * limit, page * limit);

  const ids = events.map((e) => e._id);
  const [regs, counts] = await Promise.all([
    EventRegistration.find({ event: { $in: ids }, member: req.user._id }).lean(),
    EventRegistration.aggregate([
      { $match: { event: { $in: ids } } },
      { $group: { _id: '$event', n: { $sum: 1 } } },
    ]),
  ]);
  const regMap = new Map(regs.map((r) => [String(r.event), r]));
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));

  const items = events.map((e) => {
    const r = regMap.get(String(e._id));
    return serializeEvent(e, {
      isAdmin,
      registered: !!r,
      attending: r && r.status === 'attended',
      ...(isAdmin ? {} : {}),
    });
  }).map((it, i) => ({ ...it, registeredCount: countMap.get(String(ids[i])) || 0 }));

  return ok(res, { items, total, page, pages: Math.ceil(total / limit) || 1 });
});

/** GET /api/events/:id */
const getEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const isAdmin = req.user.role === 'admin';
  const e = await Event.findById(req.params.id).populate('createdBy', 'name username').lean();
  if (!e) throw ApiError.notFound('Event not found');
  if (e.status === 'draft' && !(isAdmin && String(e.createdBy?._id) === String(req.user._id))) {
    throw ApiError.notFound('Event not found');
  }

  const [reg, count] = await Promise.all([
    EventRegistration.findOne({ event: e._id, member: req.user._id }).lean(),
    EventRegistration.countDocuments({ event: e._id }),
  ]);

  return ok(res, {
    event: serializeEvent(e, { isAdmin, registered: !!reg, attending: reg && reg.status === 'attended' }),
    registeredCount: count,
    myStatus: reg ? reg.status : null,
  });
});

/** POST /api/events (admin) */
const createEvent = asyncHandler(async (req, res) => {
  validateEventBody(req.body);
  const b = req.body;
  const event = await Event.create({
    title: b.title.trim(),
    description: b.description,
    hostName: b.hostName,
    category: b.category,
    date: new Date(b.date),
    startTime: b.startTime,
    endTime: b.endTime,
    platform: b.platform || '',
    meetingUrl: b.meetingUrl || '',
    coverImage: b.coverImage || '',
    isPrivate: !!b.isPrivate,
    registrationDeadline: b.registrationDeadline ? new Date(b.registrationDeadline) : null,
    rewardPoints: Number(b.rewardPoints || 0),
    status: b.status || 'draft',
    createdBy: req.user._id,
  });

  if (event.status === 'published') {
    await notifyAllApproved('event_published', `New event: ${event.title}`,
      `${event.date.toLocaleDateString()} ${event.startTime}-${event.endTime}${event.platform ? ` · ${event.platform}` : ''}`,
      `/events/${event._id}`);
  }
  return ok(res, { event: serializeEvent(event, { isAdmin: true }) }, 201);
});

/** PATCH /api/events/:id (admin) */
const updateEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const body = { ...req.body };
  delete body.status;
  validateEventBody({ ...event.toObject(), ...body }, { partial: true });
  if ((body.startTime && body.endTime && body.startTime >= body.endTime)) {
    throw ApiError.badRequest('End time must be after start time', 'INVALID_TIME_RANGE');
  }

  const fields = ['title', 'description', 'hostName', 'category', 'platform', 'meetingUrl', 'coverImage', 'isPrivate', 'rewardPoints'];
  for (const f of fields) if (body[f] !== undefined) event[f] = body[f];
  if (body.date !== undefined) event.date = new Date(body.date);
  if (body.startTime !== undefined) event.startTime = body.startTime;
  if (body.endTime !== undefined) event.endTime = body.endTime;
  if (body.registrationDeadline !== undefined) {
    event.registrationDeadline = body.registrationDeadline ? new Date(body.registrationDeadline) : null;
  }
  if (body.rewardPoints !== undefined) event.rewardPoints = Number(body.rewardPoints);
  await event.save();
  return ok(res, { event: serializeEvent(event, { isAdmin: true }) });
});

/** POST /api/events/:id/status (admin) — publish | cancel | complete | draft */
const setEventStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const { status } = req.body || {};
  if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const wasPublished = event.status === 'published';
  event.status = status;
  await event.save();

  if (status === 'published' && !wasPublished) {
    await notifyAllApproved('event_published', `New event: ${event.title}`,
      `${event.date.toLocaleDateString()} ${event.startTime}-${event.endTime}`, `/events/${event._id}`);
  }
  if (status === 'cancelled') {
    const regs = await EventRegistration.find({ event: event._id }).select('member');
    await notify(regs.map((r) => r.member), 'event_cancelled', `Event cancelled: ${event.title}`,
      'The organizer cancelled this event.', `/events/${event._id}`);
  }
  return ok(res, { event: serializeEvent(event, { isAdmin: true }) });
});

/** DELETE /api/events/:id (admin) */
const deleteEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const isOwner = String(event.createdBy) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('Only the event creator or an admin can delete this event', 'DELETE_FORBIDDEN');
  }
  await EventRegistration.deleteMany({ event: event._id });
  await event.deleteOne();
  return ok(res, { message: 'Event deleted' });
});

/** POST /api/events/:id/register — register attendance intent (members) */
const registerForEvent = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const event = await Event.findById(req.params.id);
  if (!event || event.status !== 'published') throw ApiError.notFound('Event not found');

  const now = new Date();
  if (event.registrationDeadline && now > new Date(event.registrationDeadline)) {
    throw ApiError.conflict('Registration for this event has closed', 'REGISTRATION_CLOSED');
  }
  if (now >= eventStartAt(event)) {
    throw ApiError.conflict('This event already took place', 'EVENT_PAST');
  }

  const existing = await EventRegistration.findOne({ event: event._id, member: req.user._id });
  if (existing) throw ApiError.conflict('You are already registered for this event', 'ALREADY_REGISTERED');

  const reg = await EventRegistration.create({ event: event._id, member: req.user._id, status: 'registered' });

  // Let the admins know.
  const admins = await User.find({ role: 'admin', status: 'approved' }).select('_id');
  await notify(admins.map((a) => a._id), 'general', 'New event registration',
    `${req.user.name} registered for "${event.title}".`, `/admin/events`);

  return ok(res, { registered: true, registrationId: reg._id }, 201);
});

/** DELETE /api/events/:id/register — cancel registration */
const cancelRegistration = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const result = await EventRegistration.deleteOne({ event: req.params.id, member: req.user._id });
  if (!result.deletedCount) throw ApiError.notFound('You are not registered for this event');
  return ok(res, { registered: false });
});

/** GET /api/events/:id/registrations (admin) */
const listRegistrations = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found');
  const regs = await EventRegistration.find({ event: event._id })
    .populate('member', 'name username email photoUrl')
    .sort({ registeredAt: -1 })
    .lean();
  const rewards = await Reward.find({ sourceType: 'event', sourceId: event._id }).lean();
  const rewardMap = new Map(rewards.map((r) => [String(r.member), r]));
  return ok(res, {
    items: regs.map((r) => ({ ...r, reward: rewardMap.get(String(r.member?._id || r.member)) || null })),
    total: regs.length,
  });
});

/** POST /api/events/:id/attendance (admin) — { memberId, status: attended|no_show|registered } */
const setAttendance = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const { memberId, status } = req.body || {};
  if (!['attended', 'no_show', 'registered'].includes(status)) {
    throw ApiError.badRequest('status must be attended, no_show or registered');
  }
  if (!mongoose.isValidObjectId(memberId)) throw ApiError.badRequest('Invalid member id');

  const reg = await EventRegistration.findOne({ event: req.params.id, member: memberId });
  if (!reg) throw ApiError.notFound('Registration not found');
  const wasAttended = reg.status === 'attended';
  reg.status = status;
  await reg.save();

  // Keep the member's "events attended" counter in sync.
  const attendedCount = await EventRegistration.countDocuments({ member: memberId, status: 'attended' });
  await User.updateOne({ _id: memberId }, { $set: { eventsAttended: attendedCount } });
  if (status === 'attended' && !wasAttended) {
    await notify(memberId, 'general', 'Attendance recorded',
      'Thanks for participating! Your profile has been updated.', '/events');
  }
  return ok(res, { registration: reg, eventsAttended: attendedCount });
});

/** POST /api/events/:id/rewards (admin) — { memberId, points, feedback } */
const awardEventReward = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid event id');
  const { memberId, points, feedback = '' } = req.body || {};
  if (!mongoose.isValidObjectId(memberId)) throw ApiError.badRequest('Invalid member id');
  if (!Number.isInteger(Number(points)) || Number(points) < 0 || Number(points) > 10000) {
    throw ApiError.badRequest('points must be an integer from 0 to 10000');
  }
  const registration = await EventRegistration.findOne({ event: req.params.id, member: memberId });
  if (!registration) throw ApiError.notFound('Member is not registered for this event');
  if (String(feedback).length > 3000) throw ApiError.badRequest('feedback must be at most 3000 characters');

  const reward = await Reward.findOneAndUpdate(
    { sourceType: 'event', sourceId: req.params.id, member: memberId },
    {
      $set: {
        points: Number(points),
        feedback: String(feedback),
        awardedBy: req.user._id,
      },
      $setOnInsert: { sourceType: 'event', sourceId: req.params.id, member: memberId },
    },
    { upsert: true, new: true, runValidators: true }
  );
  const score = await recalcUserScore(memberId);
  await notify(memberId, 'points_awarded', 'Event points awarded',
    `${Number(points)} points awarded for participating in the event.`, `/events/${req.params.id}`);
  return ok(res, { reward, score });
});

module.exports = {
  eventStartAt,
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  setEventStatus,
  deleteEvent,
  registerForEvent,
  cancelRegistration,
  listRegistrations,
  setAttendance,
  awardEventReward,
};

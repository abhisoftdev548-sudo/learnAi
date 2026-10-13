'use strict';

/** Create in-app notifications for one or many users. */
async function notify(userIds, type, title, body = '', link = '') {
  const Notification = require('./Notification');
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (!ids.length) return null;
  const docs = ids.map((user) => ({ user, type, title, body, link }));
  try {
    return await Notification.insertMany(docs, { ordered: false });
  } catch (e) {
    // Never let notifications break the main flow.
    console.error('[notify] failed:', e.message);
    return null;
  }
}

/** Notify every approved member (and admins). */
async function notifyAllApproved(type, title, body = '', link = '') {
  const User = require('./User');
  const users = await User.find({ status: 'approved' }).select('_id').lean();
  return notify(users.map((u) => u._id), type, title, body, link);
}

module.exports = { notify, notifyAllApproved };

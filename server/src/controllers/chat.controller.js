'use strict';
const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const { ApiError, asyncHandler, ok } = require('../utils/errors');
const { validate, required, maxLength } = require('../utils/validate');

function serializeMessage(message) {
  return {
    id: message._id,
    body: message.body,
    author: message.author && message.author._id
      ? {
          id: message.author._id,
          name: message.author.name,
          username: message.author.username,
          photoUrl: message.author.photoUrl,
        }
      : message.author,
    createdAt: message.createdAt,
  };
}

const listMessages = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
  const messages = await ChatMessage.find({})
    .populate('author', 'name username photoUrl')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return ok(res, { messages: messages.reverse().map(serializeMessage) });
});

const createMessage = asyncHandler(async (req, res) => {
  const body = req.body || {};
  validate(body, {
    body: [required('Message cannot be empty'), maxLength(2000, 'Message must be at most 2000 characters')],
  });

  const message = await ChatMessage.create({
    author: req.user._id,
    body: body.body.trim(),
  });
  await message.populate('author', 'name username photoUrl');

  return ok(res, { message: serializeMessage(message) }, 201);
});

const deleteMessage = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid message id');
  const message = await ChatMessage.findById(req.params.id);
  if (!message) throw ApiError.notFound('Message not found');
  const isOwner = String(message.author) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own messages', 'DELETE_FORBIDDEN');
  }
  await message.deleteOne();
  return ok(res, { message: 'Message deleted' });
});

module.exports = { listMessages, createMessage, deleteMessage };

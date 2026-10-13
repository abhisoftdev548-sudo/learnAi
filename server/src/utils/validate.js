'use strict';
const { ApiError } = require('./errors');

/**
 * Tiny declarative validation layer.
 *
 * Usage:  validate(body, {
 *           email: [required(), email()],
 *           password: [required(), minLength(8)],
 *         })
 *
 * Runs all checks, collects every failure, and throws a 400 ApiError with
 * `{ errors: [{ field, message }] }` when anything is invalid.
 */
const checks = {
  required: (msg = 'is required') => (v) =>
    v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
      ? msg
      : null,
  isString: (msg = 'must be text') => (v) =>
    v === undefined || v === null ? null : typeof v === 'string' ? null : msg,
  minLength: (n, msg) => (v) =>
    typeof v === 'string' && v.trim().length && v.trim().length < n
      ? msg || `must be at least ${n} characters`
      : null,
  maxLength: (n, msg) => (v) =>
    typeof v === 'string' && v.length > n ? msg || `must be at most ${n} characters` : null,
  email: (msg = 'must be a valid email address') => (v) => {
    if (v === undefined || v === null || v === '') return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v)) ? null : msg;
  },
  pattern: (re, msg = 'has an invalid format') => (v) =>
    v === undefined || v === null || v === '' || re.test(String(v)) ? null : msg,
  oneOf: (list, msg) => (v) =>
    v === undefined || v === null || v === ''
      ? null
      : list.includes(v)
        ? null
        : msg || `must be one of: ${list.join(', ')}`,
  isInt: (msg = 'must be a whole number') => (v) => {
    if (v === undefined || v === null || v === '') return null;
    return Number.isInteger(Number(v)) ? null : msg;
  },
  gte: (n, msg) => (v) =>
    v === undefined || v === null || v === '' || (Number(v) >= n ? null : msg || `must be at least ${n}`),
  lte: (n, msg) => (v) =>
    v === undefined || v === null || v === '' || (Number(v) <= n ? null : msg || `must be at most ${n}`),
  isDate: (msg = 'must be a valid date') => (v) => {
    if (v === undefined || v === null || v === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? msg : null;
  },
  isUrl: (msg = 'must be a valid URL') => (v) => {
    if (v === undefined || v === null || v === '') return null;
    try {
      const u = new URL(String(v));
      return ['http:', 'https:'].includes(u.protocol) ? null : msg;
    } catch {
      return msg;
    }
  },
  isArray: (msg = 'must be a list') => (v) =>
    v === undefined || v === null ? null : Array.isArray(v) ? null : msg,
  custom: (fn) => fn,
};

function validate(data, schema) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    for (const rule of rules) {
      const msg = rule(data[field], data);
      if (msg) {
        errors.push({ field, message: msg });
        break; // one message per field is enough
      }
    }
  }
  if (errors.length) {
    const err = ApiError.badRequest('Validation failed', 'VALIDATION_ERROR');
    err.errors = errors;
    throw err;
  }
  return data;
}

// Bind convenience helpers
const v = {};
for (const [name, fn] of Object.entries(checks)) {
  v[name] = fn;
}

module.exports = { validate, ...v };

import ApiError from './ApiError.js';

/**
 * Tiny schema validator. Keeps validating input dependency-free while still
 * being strict (types, ranges, enums, lengths) across every endpoint.
 *
 * Usage:
 *   validateBody(req, {
 *     username: { type: 'string', required: true, min: 3, max: 30, pattern: /^[a-z0-9_]+$/ },
 *     xp: { type: 'number', min: 0, integer: true },
 *     role: { type: 'string', enum: ['user', 'admin'] },
 *   });
 */

export const USERNAME_PATTERN = /^[a-zA-Z0-9_](?!.*__)[a-zA-Z0-9_.]{1,28}[a-zA-Z0-9_]$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isStrongEnoughPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 128) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

function normalizeDefinition(def) {
  if (typeof def === 'string') return { type: def, required: true };
  return { required: false, ...def };
}

function assertValue(field, value, def) {
  const definition = normalizeDefinition(def);
  const { type, required, min, max, enum: allowed, pattern, integer, allowEmpty } = definition;
  const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

  if (isEmpty) {
    if (required) throw ApiError.unprocessable(`"${field}" is required`, [{ field, message: 'required' }]);
    if (allowEmpty) return undefined;
    return undefined;
  }

  const coerced = coerce(type, value, field);

  switch (type) {
    case 'string': {
      if (typeof coerced !== 'string') throw fail(field, 'must be a string', value);
      if (min !== undefined && coerced.length < min) throw fail(field, `must be at least ${min} characters`, value);
      if (max !== undefined && coerced.length > max) throw fail(field, `must be at most ${max} characters`, value);
      if (pattern && !pattern.test(coerced)) throw fail(field, 'has an invalid format', value);
      if (allowed && !allowed.includes(coerced)) throw fail(field, `must be one of: ${allowed.join(', ')}`, value);
      return coerced;
    }
    case 'number': {
      if (typeof coerced !== 'number' || Number.isNaN(coerced)) throw fail(field, 'must be a number', value);
      if (integer && !Number.isInteger(coerced)) throw fail(field, 'must be an integer', value);
      if (min !== undefined && coerced < min) throw fail(field, `must be >= ${min}`, value);
      if (max !== undefined && coerced > max) throw fail(field, `must be <= ${max}`, value);
      return coerced;
    }
    case 'boolean': {
      if (typeof coerced !== 'boolean') throw fail(field, 'must be a boolean', value);
      return coerced;
    }
    case 'array': {
      if (!Array.isArray(coerced)) throw fail(field, 'must be an array', value);
      if (min !== undefined && coerced.length < min) throw fail(field, `must contain at least ${min} items`, value);
      if (max !== undefined && coerced.length > max) throw fail(field, `must contain at most ${max} items`, value);
      if (definition.items) {
        return coerced.map((item, index) => {
          try {
            return assertValue(`${field}[${index}]`, item, definition.items);
          } catch (error) {
            throw error;
          }
        });
      }
      return coerced;
    }
    case 'object': {
      if (typeof coerced !== 'object' || Array.isArray(coerced)) throw fail(field, 'must be an object', value);
      if (definition.properties) return validateFields(coerced, definition.properties, { partial: true });
      return coerced;
    }
    case 'enum': {
      if (!allowed?.includes(coerced)) throw fail(field, `must be one of: ${allowed?.join(', ')}`, value);
      return coerced;
    }
    case 'mixed':
      return coerced;
    default:
      return coerced;
  }
}

function coerce(type, value, field) {
  if (type === 'number') {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
    return value;
  }
  if (type === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }
  if (type === 'string') {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    return value;
  }
  if (type === 'array' && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return value;
}

function fail(field, message, value) {
  return ApiError.unprocessable(`"${field}" ${message}`, [{ field, message, received: typeof value }]);
}

/** Validate an object against a schema, returning the sanitized object. */
export function validateFields(source, schema, { partial = false } = {}) {
  const output = {};
  for (const [field, definition] of Object.entries(schema)) {
    if (partial && !(field in source)) continue;
    const value = assertValue(field, source[field], definition);
    if (value !== undefined) output[field] = value;
  }
  return output;
}

export function validateBody(req, schema, options) {
  req.body = validateFields(req.body ?? {}, schema, options);
  return req.body;
}

export function validateQuery(req, schema, options) {
  req.validatedQuery = validateFields(req.query ?? {}, schema, { partial: true, ...options });
  return req.validatedQuery;
}

export function sanitizeText(value, { maxLength = 2000 } = {}) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, maxLength).trim();
}

export default {
  validateBody,
  validateQuery,
  validateFields,
  isStrongEnoughPassword,
  sanitizeText,
  USERNAME_PATTERN,
  EMAIL_PATTERN,
};

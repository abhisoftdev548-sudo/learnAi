/**
 * BSON helpers used by the in-memory MongoDB wire-protocol server.
 *
 * NOTE: This module is a *development / verification* utility only. It lets the
 * platform be booted and tested in environments where a real `mongod` binary
 * cannot be installed (CI containers, sandboxes). Production and normal local
 * development use a real MongoDB server — see README.
 */
import {
  Binary,
  BSONRegExp,
  BSONSymbol,
  Decimal128,
  Double,
  Int32,
  Long,
  MaxKey,
  MinKey,
  ObjectId,
  Timestamp,
} from 'bson';

// BSON canonical type ordering ranks.
export const TYPE_RANK = {
  MinKey: 1,
  Null: 2,
  Number: 3,
  String: 4,
  Object: 5,
  Array: 6,
  BinData: 7,
  ObjectId: 8,
  Boolean: 9,
  Date: 10,
  Timestamp: 11,
  Regex: 12,
  MaxKey: 13,
};

export function typeName(value) {
  if (value instanceof MinKey) return 'minKey';
  if (value === null || value === undefined) return 'null';
  if (value instanceof Int32) return 'int';
  if (value instanceof Long) return 'long';
  if (value instanceof Double) return 'double';
  if (value instanceof Decimal128) return 'decimal';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
  if (typeof value === 'string' || value instanceof BSONSymbol) return 'string';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Binary) return 'binData';
  if (value instanceof ObjectId) return 'objectId';
  if (typeof value === 'boolean') return 'bool';
  if (value instanceof Date) return 'date';
  if (value instanceof Timestamp) return 'timestamp';
  if (value instanceof BSONRegExp || value instanceof RegExp) return 'regex';
  if (value instanceof MaxKey) return 'maxKey';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'function') return 'javascript';
  return 'unknown';
}

export function typeRank(value) {
  const name = typeName(value);
  switch (name) {
    case 'minKey':
      return TYPE_RANK.MinKey;
    case 'null':
      return TYPE_RANK.Null;
    case 'int':
    case 'long':
    case 'double':
    case 'decimal':
      return TYPE_RANK.Number;
    case 'string':
      return TYPE_RANK.String;
    case 'object':
      return TYPE_RANK.Object;
    case 'array':
      return TYPE_RANK.Array;
    case 'binData':
      return TYPE_RANK.BinData;
    case 'objectId':
      return TYPE_RANK.ObjectId;
    case 'bool':
      return TYPE_RANK.Boolean;
    case 'date':
      return TYPE_RANK.Date;
    case 'timestamp':
      return TYPE_RANK.Timestamp;
    case 'regex':
      return TYPE_RANK.Regex;
    case 'maxKey':
      return TYPE_RANK.MaxKey;
    default:
      return 99;
  }
}

export function toNumber(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Long) return value.toNumber();
  if (value instanceof Int32 || value instanceof Double) return value.valueOf();
  if (value instanceof Decimal128) return parseFloat(value.toString());
  if (typeof value === 'string') return Number(value);
  if (value instanceof Date) return value.getTime();
  return NaN;
}

export function toComparable(value) {
  switch (typeRank(value)) {
    case TYPE_RANK.Number:
      return toNumber(value);
    case TYPE_RANK.String:
      return String(value);
    case TYPE_RANK.Boolean:
      return value ? 1 : 0;
    case TYPE_RANK.Date:
      return value instanceof Date ? value.getTime() : toNumber(value);
    case TYPE_RANK.Timestamp:
      return (value.t ?? 0) * 1000 + (value.i ?? 0) / 1000;
    case TYPE_RANK.ObjectId:
      return value.toHexString();
    case TYPE_RANK.Regex:
      return value instanceof RegExp ? value.source : value.pattern;
    case TYPE_RANK.BinData:
      return Buffer.from(value.buffer ?? value.value?.() ?? []).toString('base64');
    default:
      return null;
  }
}

/** Canonical BSON comparison (-1, 0, 1). */
export function cmp(a, b) {
  const ra = typeRank(a);
  const rb = typeRank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  switch (ra) {
    case TYPE_RANK.Null:
    case TYPE_RANK.MinKey:
    case TYPE_RANK.MaxKey:
      return 0;
    case TYPE_RANK.Number:
    case TYPE_RANK.String:
    case TYPE_RANK.Boolean:
    case TYPE_RANK.Date:
    case TYPE_RANK.Timestamp:
    case TYPE_RANK.ObjectId:
    case TYPE_RANK.Regex:
    case TYPE_RANK.BinData: {
      const ca = toComparable(a);
      const cb = toComparable(b);
      if (ca === cb) return 0;
      return ca < cb ? -1 : 1;
    }
    case TYPE_RANK.Array: {
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i += 1) {
        const r = cmp(a[i], b[i]);
        if (r !== 0) return r;
      }
      if (a.length === b.length) return 0;
      return a.length < b.length ? -1 : 1;
    }
    case TYPE_RANK.Object: {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      const len = Math.min(ka.length, kb.length);
      for (let i = 0; i < len; i += 1) {
        if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
        const r = cmp(a[ka[i]], b[kb[i]]);
        if (r !== 0) return r;
      }
      if (ka.length === kb.length) return 0;
      return ka.length < kb.length ? -1 : 1;
    }
    default:
      return 0;
  }
}

export function equalsBSON(a, b) {
  if (cmp(a, b) !== 0) return false;
  return typeRank(a) === typeRank(b);
}

export function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof ObjectId) &&
    !(value instanceof Binary) &&
    !(value instanceof RegExp) &&
    !(value instanceof BSONRegExp) &&
    !(value instanceof Long) &&
    !(value instanceof Int32) &&
    !(value instanceof Double) &&
    !(value instanceof Decimal128) &&
    !(value instanceof Timestamp) &&
    !(value instanceof MinKey) &&
    !(value instanceof MaxKey) &&
    !(value instanceof BSONSymbol)
  );
}

export function isOperatorObject(value) {
  return isPlainObject(value) && Object.keys(value).some((key) => key.startsWith('$'));
}

/** Split a dotted path into segments. */
export function pathParts(path) {
  return String(path).split('.');
}

/** Read every value reachable at `path` (arrays are traversed, Mongo style). */
export function getFieldValues(source, path) {
  const parts = pathParts(path);
  let current = [source];
  for (const part of parts) {
    const next = [];
    for (const node of current) {
      if (node === null || node === undefined) continue;
      if (Array.isArray(node)) {
        if (/^\d+$/.test(part)) {
          const idx = Number(part);
          if (idx < node.length) next.push(node[idx]);
        } else {
          for (const el of node) {
            if (isPlainObject(el) && part in el) next.push(el[part]);
          }
        }
      } else if (typeof node === 'object' && part in node) {
        next.push(node[part]);
      }
    }
    current = next;
  }
  return current;
}

/** Read a single value at a dotted path (no array fan-out). */
export function getFieldValue(source, path) {
  const parts = pathParts(path);
  let current = source;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[Number(part)];
      continue;
    }
    if (typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function valueExistsAtPath(source, path) {
  const parts = pathParts(path);
  let current = source;
  for (const part of parts) {
    if (current === null || current === undefined) return false;
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      const idx = Number(part);
      if (idx >= current.length) return false;
      current = current[idx];
      continue;
    }
    if (typeof current !== 'object' || !(part in current)) return false;
    current = current[part];
  }
  return true;
}

/** Set a value at a dotted path, creating intermediate containers as needed. */
export function setFieldValue(target, path, value) {
  const parts = pathParts(path);
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    if (Array.isArray(node)) {
      const idx = /^\d+$/.test(part) ? Number(part) : null;
      if (idx === null) {
        for (const el of node) {
          if (isPlainObject(el)) setFieldValue(el, parts.slice(i).join('.'), value);
        }
        return;
      }
      while (node.length <= idx) node.push(null);
      if (node[idx] === null || typeof node[idx] !== 'object') node[idx] = /^\d+$/.test(nextPart) ? [] : {};
      node = node[idx];
      continue;
    }
    if (node[part] === null || node[part] === undefined || typeof node[part] !== 'object') {
      node[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    node = node[part];
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(node)) {
    const idx = /^\d+$/.test(last) ? Number(last) : null;
    if (idx === null) return;
    while (node.length <= idx) node.push(null);
    node[idx] = value;
    return;
  }
  node[last] = value;
}

export function unsetFieldValue(target, path) {
  const parts = pathParts(path);
  const parents = [];
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (node === null || node === undefined) return;
    parents.push([node, parts[i]]);
    node = Array.isArray(node) && /^\d+$/.test(parts[i]) ? node[Number(parts[i])] : node[parts[i]];
  }
  if (node === null || node === undefined) return;
  const last = parts[parts.length - 1];
  if (Array.isArray(node) && /^\d+$/.test(last)) {
    node.splice(Number(last), 1);
    return;
  }
  delete node[last];
}

export function deepClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof ObjectId) return new ObjectId(value.toHexString());
  if (Array.isArray(value)) return value.map((item) => deepClone(item));
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (value instanceof Binary) return new Binary(value.buffer ?? value.value?.(), value.sub_type ?? 0);
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) out[key] = deepClone(val);
    return out;
  }
  return value;
}

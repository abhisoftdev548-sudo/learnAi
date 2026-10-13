/**
 * Query engine for the in-memory MongoDB dev server (matcher, projection,
 * sort, update operators, aggregation subset). Development utility only.
 */
import { BSONRegExp, ObjectId } from 'bson';
import {
  cmp,
  deepClone,
  equalsBSON,
  getFieldValue,
  getFieldValues,
  isOperatorObject,
  isPlainObject,
  setFieldValue,
  toNumber,
  typeName,
  typeRank,
  unsetFieldValue,
  valueExistsAtPath,
} from './bson-utils.js';

const UNSUPPORTED = (what) => {
  const err = new Error(`[dev-mongo] Unsupported query feature: ${what}`);
  err.unsupported = true;
  return err;
};

function regexFrom(value, options) {
  if (value instanceof RegExp) return new RegExp(value.source, options ?? value.flags.replace('g', ''));
  if (value instanceof BSONRegExp) return new RegExp(value.pattern, options ?? value.options ?? '');
  if (typeof value === 'string') return new RegExp(value, options ?? '');
  throw UNSUPPORTED(`$regex with ${typeof value}`);
}

function testRegex(value, regex) {
  if (typeof value !== 'string') return false;
  regex.lastIndex = 0;
  return regex.test(value);
}

/** Does `doc` satisfy the query `filter`? */
export function matches(doc, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and') {
      if (!Array.isArray(condition) || !condition.every((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$or') {
      if (!Array.isArray(condition) || !condition.some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$nor') {
      if (Array.isArray(condition) && condition.some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$expr') {
      if (!evaluateExpression(doc, condition)) return false;
      continue;
    }
    if (key === '$comment' || key === '$where' || key === '$text') continue;
    if (!matchField(doc, key, condition)) return false;
  }
  return true;
}

function matchField(doc, path, condition) {
  const values = getFieldValues(doc, path);
  const exists = valueExistsAtPath(doc, path);

  if (isOperatorObject(condition)) {
    for (const [op, operand] of Object.entries(condition)) {
      if (!applyOperator(doc, path, values, exists, op, operand, condition)) return false;
    }
    return true;
  }

  if (condition === null) {
    // null matches both an explicit null and a missing field.
    return !exists || values.some((v) => v === null);
  }

  if (condition instanceof RegExp || condition instanceof BSONRegExp) {
    const regex = regexFrom(condition);
    return values.some((v) => (Array.isArray(v) ? v.some((el) => testRegex(el, regex)) : testRegex(v, regex)));
  }

  if (isPlainObject(condition) && Object.keys(condition).length === 0) {
    // MongoDB quirk: `{ field: {} }` matches any embedded document.
    return values.some((v) => isPlainObject(v) || (Array.isArray(v) && v.some((el) => isPlainObject(el))));
  }

  return values.some((value) => {
    if (equalsBSON(value, condition)) return true;
    if (Array.isArray(value)) return value.some((el) => equalsBSON(el, condition));
    return false;
  });
}

function applyOperator(doc, path, values, exists, op, operand, allOperators) {
  const anyValue = (predicate) =>
    values.some((value) => (Array.isArray(value) ? value.some((el) => predicate(el)) || predicate(value) : predicate(value)));

  switch (op) {
    case '$eq':
      if (operand === null) return !exists || values.some((v) => v === null);
      return anyValue((v) => equalsBSON(v, operand));
    case '$ne':
      if (operand === null) return exists && values.some((v) => v !== null);
      return !anyValue((v) => equalsBSON(v, operand));
    case '$gt':
      return anyValue((v) => typeRank(v) === typeRank(operand) && cmp(v, operand) > 0);
    case '$gte':
      return anyValue((v) => typeRank(v) === typeRank(operand) && cmp(v, operand) >= 0);
    case '$lt':
      return anyValue((v) => typeRank(v) === typeRank(operand) && cmp(v, operand) < 0);
    case '$lte':
      return anyValue((v) => typeRank(v) === typeRank(operand) && cmp(v, operand) <= 0);
    case '$in': {
      const list = Array.isArray(operand) ? operand : [];
      return list.some((candidate) => {
        if (candidate instanceof RegExp || candidate instanceof BSONRegExp) {
          const regex = regexFrom(candidate);
          return anyValue((v) => testRegex(v, regex));
        }
        if (candidate === null) return !exists || values.some((v) => v === null);
        return anyValue((v) => equalsBSON(v, candidate));
      });
    }
    case '$nin': {
      const list = Array.isArray(operand) ? operand : [];
      const included = list.some((candidate) => {
        if (candidate instanceof RegExp || candidate instanceof BSONRegExp) {
          const regex = regexFrom(candidate);
          return anyValue((v) => testRegex(v, regex));
        }
        if (candidate === null) return !exists || values.some((v) => v === null);
        return anyValue((v) => equalsBSON(v, candidate));
      });
      return !included;
    }
    case '$exists':
      return operand ? exists : !exists;
    case '$type': {
      const wanted = Array.isArray(operand) ? operand.map(String) : [String(operand)];
      const codeToName = {
        1: 'double',
        2: 'string',
        3: 'object',
        4: 'array',
        5: 'binData',
        7: 'objectId',
        8: 'bool',
        9: 'date',
        10: 'null',
        11: 'regex',
        16: 'int',
        18: 'long',
        19: 'decimal',
        32: 'timestamp',
        255: 'minKey',
        127: 'maxKey',
      };
      const names = wanted.map((w) => codeToName[w] ?? w);
      return anyValue((v) => {
        const name = typeName(v);
        if (names.includes(name)) return true;
        if (names.includes('number') && ['int', 'long', 'double', 'decimal'].includes(name)) return true;
        return false;
      });
    }
    case '$regex': {
      const regex = regexFrom(operand, allOperators.$options);
      return anyValue((v) => testRegex(v, regex));
    }
    case '$options':
      return true;
    case '$size':
      return values.some((v) => Array.isArray(v) && v.length === operand);
    case '$all':
      return values.some((value) => {
        if (!Array.isArray(value)) return false;
        return (Array.isArray(operand) ? operand : []).every((candidate) => {
          if (isOperatorObject(candidate) && candidate.$elemMatch) {
            return value.some((el) => matchElem(el, candidate.$elemMatch));
          }
          if (isOperatorObject(candidate)) {
            // e.g. { field: { $all: [ { $regex: 'a' } ] } }
            return value.some((el) =>
              Object.entries(candidate).every(([subOp, subOperand]) =>
                applyOperator(doc, path, [el], true, subOp, subOperand, candidate),
              ),
            );
          }
          return value.some((el) => equalsBSON(el, candidate));
        });
      });
    case '$elemMatch':
      return values.some((value) => {
        if (!Array.isArray(value)) return false;
        return value.some((el) => matchElem(el, operand));
      });
    case '$not': {
      if (isOperatorObject(operand)) {
        const inner = Object.entries(operand).every(([subOp, subOperand]) =>
          applyOperator(doc, path, values, exists, subOp, subOperand, operand),
        );
        return !inner;
      }
      if (operand instanceof RegExp || operand instanceof BSONRegExp) {
        const regex = regexFrom(operand);
        return !values.some((v) => testRegex(v, regex));
      }
      return !values.some((v) => equalsBSON(v, operand));
    }
    case '$mod': {
      const [divisor, remainder] = Array.isArray(operand) ? operand : [];
      return anyValue((v) => {
        const num = toNumber(v);
        return Number.isFinite(num) && divisor && num % divisor === remainder;
      });
    }
    case '$near':
    case '$nearSphere':
    case '$geoWithin':
    case '$geoIntersects':
    case '$bitsAllSet':
    case '$bitsAnySet':
    case '$bitsAllClear':
    case '$bitsAnyClear':
    case '$text':
    case '$where':
    case '$jsonSchema':
      throw UNSUPPORTED(`operator ${op}`);
    default:
      throw UNSUPPORTED(`operator ${op}`);
  }
}

function matchElem(el, condition) {
  if (isOperatorObject(condition)) {
    return Object.entries(condition).every(([op, operand]) =>
      applyOperator({ __el: el }, '__el', [el], true, op, operand, condition),
    );
  }
  if (isPlainObject(condition)) return matches(el, condition);
  return equalsBSON(el, condition);
}

/* ------------------------------------------------------------------ *
 * Sort & projection
 * ------------------------------------------------------------------ */

export function normalizeSortSpec(sort) {
  if (!sort) return [];
  if (Array.isArray(sort)) return sort.map(([field, dir]) => [field, typeof dir === 'object' ? dir.$meta === 'textScore' ? 1 : 1 : Number(dir) < 0 ? -1 : 1]);
  return Object.entries(sort).map(([field, dir]) => {
    if (isPlainObject(dir)) return [field, Number(dir.$meta ? 1 : dir) < 0 ? -1 : 1];
    return [field, Number(dir) < 0 ? -1 : 1];
  });
}

export function applySort(docs, sort) {
  const spec = normalizeSortSpec(sort);
  if (!spec.length) return docs;
  const decorated = docs.map((doc, index) => ({ doc, index }));
  decorated.sort((a, b) => {
    for (const [field, dir] of spec) {
      const av = getFieldValue(a.doc, field);
      const bv = getFieldValue(b.doc, field);
      const missingA = av === undefined;
      const missingB = bv === undefined;
      if (missingA && missingB) continue;
      if (missingA) return 1;
      if (missingB) return -1;
      const result = cmp(av, bv);
      if (result !== 0) return dir < 0 ? -result : result;
    }
    return a.index - b.index;
  });
  return decorated.map((d) => d.doc);
}

/** MongoDB-style projection: { a: 1, "b.c": 0, _id: 0 } */
export function applyProjection(doc, projection) {
  if (!projection || Object.keys(projection).length === 0) return doc;
  const entries = Object.entries(projection).filter(([, v]) => ![0, false].includes(v) || true);
  const includeKeys = [];
  const excludeKeys = [];
  let mode = null;
  for (const [key, value] of entries) {
    const isExpr = isPlainObject(value) && !('$slice' in value) && !('$elemMatch' in value) && Object.keys(value).length > 0;
    const included = !isExpr && (value === 1 || value === true || (isPlainObject(value) && ('$slice' in value || '$elemMatch' in value)));
    if (isExpr || included) {
      if (key === '_id') continue;
      mode = mode ?? 'include';
      includeKeys.push([key, isExpr ? value : 1]);
    } else if (value === 0 || value === false) {
      if (key === '_id') {
        excludeKeys.push('_id');
        continue;
      }
      mode = mode ?? 'exclude';
      excludeKeys.push(key);
    }
  }
  if (mode === 'include') {
    const out = {};
    if (!excludeKeys.includes('_id') && doc._id !== undefined) out._id = doc._id;
    for (const [key, value] of includeKeys) {
      if (value === 1) {
        const val = getFieldValue(doc, key);
        if (val !== undefined) setFieldValue(out, key, deepClone(val));
      } else {
        const computed = evaluateExpression(doc, value);
        if (computed !== undefined) setFieldValue(out, key, computed);
      }
    }
    return out;
  }
  const out = deepClone(doc);
  for (const key of excludeKeys) unsetFieldValue(out, key);
  return out;
}

/* ------------------------------------------------------------------ *
 * Update operators
 * ------------------------------------------------------------------ */

export function wrapMongoError(code, errmsg, extra = {}) {
  const err = new Error(errmsg);
  err.code = code;
  err.ok = 0;
  Object.assign(err, extra);
  return err;
}

const PATH_OPERATOR = /\[\]|\$\[|^\$/;

function assertSimplePath(path) {
  if (PATH_OPERATOR.test(path) && !path.includes('.')) throw UNSUPPORTED(`positional path ${path}`);
  if (path.startsWith('$')) throw UNSUPPORTED(`positional path ${path}`);
}

function applyPipelineUpdate(doc, pipeline) {
  let current = doc;
  for (const stage of pipeline) {
    if (!isPlainObject(stage)) throw UNSUPPORTED('update pipeline stage');
    const [op, spec] = Object.entries(stage)[0] ?? [];
    if (op === '$set' || op === '$addFields') {
      for (const [path, expr] of Object.entries(spec)) setFieldValue(current, path, evaluateExpression(current, expr));
    } else if (op === '$unset') {
      for (const path of Array.isArray(spec) ? spec : [spec]) unsetFieldValue(current, path);
    } else if (op === '$replaceWith' || op === '$replaceRoot') {
      const expr = op === '$replaceRoot' ? spec.newRoot : spec;
      const next = evaluateExpression(current, expr);
      if (!isPlainObject(next)) throw UNSUPPORTED('$replaceRoot with non document');
      if (current._id !== undefined) next._id = current._id;
      current = next;
    } else {
      throw UNSUPPORTED(`update pipeline stage ${op}`);
    }
  }
  Object.keys(doc).forEach((key) => {
    if (!(key in current)) delete doc[key];
  });
  Object.assign(doc, current);
  return doc;
}

/**
 * Applies a MongoDB update document to `doc` in place.
 * Returns true when the document was modified.
 */
export function applyUpdate(doc, update, { upserting = false } = {}) {
  if (Array.isArray(update)) return applyPipelineUpdate(doc, update);

  const before = JSON.stringify(doc, replacer);
  for (const [op, spec] of Object.entries(update)) {
    if (!op.startsWith('$')) {
      // Replacement document (allowed only without operators).
      const keepId = doc._id;
      for (const key of Object.keys(doc)) delete doc[key];
      Object.assign(doc, deepClone(spec));
      if (keepId !== undefined) doc._id = keepId;
      continue;
    }
    switch (op) {
      case '$set':
        for (const [path, value] of Object.entries(spec)) {
          assertSimplePath(path);
          if (path === '_id' && doc._id !== undefined && !equalsBSON(doc._id, value)) {
            throw wrapMongoError(66, 'Performing an update on the path "_id" would modify the immutable field "_id"');
          }
          setFieldValue(doc, path, deepClone(value));
        }
        break;
      case '$setOnInsert':
        if (upserting) {
          for (const [path, value] of Object.entries(spec)) setFieldValue(doc, path, deepClone(value));
        }
        break;
      case '$unset':
        for (const path of Object.keys(spec)) {
          assertSimplePath(path);
          if (path === '_id') throw wrapMongoError(66, 'immutable field "_id"');
          unsetFieldValue(doc, path);
        }
        break;
      case '$inc':
        for (const [path, value] of Object.entries(spec)) {
          assertSimplePath(path);
          const current = getFieldValue(doc, path);
          const base = current === undefined || current === null ? 0 : toNumber(current);
          setFieldValue(doc, path, base + toNumber(value));
        }
        break;
      case '$mul':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          const base = current === undefined || current === null ? 0 : toNumber(current);
          setFieldValue(doc, path, base * toNumber(value));
        }
        break;
      case '$min':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          if (current === undefined || cmp(value, current) < 0) setFieldValue(doc, path, deepClone(value));
        }
        break;
      case '$max':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          if (current === undefined || cmp(value, current) > 0) setFieldValue(doc, path, deepClone(value));
        }
        break;
      case '$rename':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          if (current !== undefined) {
            unsetFieldValue(doc, path);
            setFieldValue(doc, value, current);
          }
        }
        break;
      case '$push':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          const arr = Array.isArray(current) ? current : [];
          if (isPlainObject(value) && '$each' in value) {
            const items = Array.isArray(value.$each) ? value.$each : [];
            const position = typeof value.$position === 'number' ? value.$position : arr.length;
            arr.splice(position, 0, ...items.map((item) => deepClone(item)));
          } else {
            arr.push(deepClone(value));
          }
          setFieldValue(doc, path, arr);
        }
        break;
      case '$addToSet':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          const arr = Array.isArray(current) ? current : [];
          const items = isPlainObject(value) && '$each' in value ? value.$each : [value];
          for (const item of items) {
            const exists = arr.some((el) => equalsBSON(el, item) || (isPlainObject(el) && isPlainObject(item) && cmp(el, item) === 0));
            if (!exists) arr.push(deepClone(item));
          }
          setFieldValue(doc, path, arr);
        }
        break;
      case '$pop':
        for (const [path, value] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          if (Array.isArray(current) && current.length) {
            if (toNumber(value) === -1) current.shift();
            else current.pop();
          }
        }
        break;
      case '$pull':
        for (const [path, condition] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          if (Array.isArray(current)) {
            setFieldValue(
              doc,
              path,
              current.filter((el) => !matchElem(el, condition)),
            );
          }
        }
        break;
      case '$pullAll':
        for (const [path, values] of Object.entries(spec)) {
          const current = getFieldValue(doc, path);
          if (Array.isArray(current)) {
            setFieldValue(
              doc,
              path,
              current.filter((el) => !(Array.isArray(values) ? values : []).some((v) => equalsBSON(v, el))),
            );
          }
        }
        break;
      case '$currentDate':
        for (const [path, value] of Object.entries(spec)) {
          setFieldValue(doc, path, deepClone(new Date()));
        }
        break;
      case '$bit':
        throw UNSUPPORTED('$bit');
      default:
        throw UNSUPPORTED(`update operator ${op}`);
    }
  }
  return before !== JSON.stringify(doc, replacer);
}

function replacer(_key, value) {
  if (value instanceof ObjectId) return `ObjectId(${value.toHexString()})`;
  if (value instanceof Date) return `Date(${value.getTime()})`;
  return value;
}

/* ------------------------------------------------------------------ *
 * Expression evaluation (aggregation subset)
 * ------------------------------------------------------------------ */

export function evaluateExpression(doc, expr) {
  if (typeof expr === 'string') {
    if (expr.startsWith('$$')) return undefined; // variables unsupported
    if (expr.startsWith('$')) return getFieldValue(doc, expr.slice(1));
    return expr;
  }
  if (expr === null || expr === undefined) return expr;
  if (Array.isArray(expr)) return expr.map((item) => evaluateExpression(doc, item));
  if (expr instanceof Date || expr instanceof ObjectId || !isPlainObject(expr)) return expr;
  if (!Object.keys(expr).some((key) => key.startsWith('$'))) {
    const out = {};
    for (const [key, value] of Object.entries(expr)) out[key] = evaluateExpression(doc, value);
    return out;
  }

  const [op, operand] = Object.entries(expr)[0];
  const args = Array.isArray(operand) ? operand : [operand];
  switch (op) {
    case '$literal':
      return operand;
    case '$add':
      return args.reduce((sum, arg) => sum + toNumber(evaluateExpression(doc, arg)), 0);
    case '$subtract':
      return toNumber(evaluateExpression(doc, args[0])) - toNumber(evaluateExpression(doc, args[1]));
    case '$multiply':
      return args.reduce((acc, arg) => acc * toNumber(evaluateExpression(doc, arg)), 1);
    case '$divide': {
      const divisor = toNumber(evaluateExpression(doc, args[1]));
      return divisor === 0 ? null : toNumber(evaluateExpression(doc, args[0])) / divisor;
    }
    case '$mod': {
      const divisor = toNumber(evaluateExpression(doc, args[1]));
      return divisor === 0 ? null : toNumber(evaluateExpression(doc, args[0])) % divisor;
    }
    case '$round': {
      const value = toNumber(evaluateExpression(doc, args[0]));
      const place = args[1] === undefined ? 0 : toNumber(evaluateExpression(doc, args[1]));
      const factor = 10 ** place;
      return Math.round(value * factor) / factor;
    }
    case '$ceil':
      return Math.ceil(toNumber(evaluateExpression(doc, args[0])));
    case '$floor':
      return Math.floor(toNumber(evaluateExpression(doc, args[0])));
    case '$abs':
      return Math.abs(toNumber(evaluateExpression(doc, args[0])));
    case '$size': {
      const value = evaluateExpression(doc, args[0]);
      return Array.isArray(value) ? value.length : null;
    }
    case '$arrayElemAt': {
      const value = evaluateExpression(doc, args[0]);
      const idx = toNumber(evaluateExpression(doc, args[1]));
      if (!Array.isArray(value)) return null;
      return idx < 0 ? value[value.length + idx] ?? null : value[idx] ?? null;
    }
    case '$concatArrays':
      return args.reduce((acc, arg) => {
        const value = evaluateExpression(doc, arg);
        if (Array.isArray(value)) return acc.concat(value);
        return value === null || value === undefined ? acc : acc.concat([value]);
      }, []);
    case '$in': {
      const needle = evaluateExpression(doc, args[0]);
      const haystack = evaluateExpression(doc, args[1]);
      return Array.isArray(haystack) ? haystack.some((el) => equalsBSON(el, needle)) : false;
    }
    case '$cond': {
      if (Array.isArray(operand) && operand.length === 3) {
        return evaluateExpression(doc, evaluateExpression(doc, operand[0]) ? operand[1] : operand[2]);
      }
      const cond = evaluateExpression(doc, operand.if);
      return evaluateExpression(doc, cond ? operand.then : operand.else);
    }
    case '$ifNull': {
      for (const arg of args) {
        const value = evaluateExpression(doc, arg);
        if (value !== null && value !== undefined) return value;
      }
      return null;
    }
    case '$eq':
      return equalsBSON(evaluateExpression(doc, args[0]), evaluateExpression(doc, args[1]));
    case '$ne':
      return !equalsBSON(evaluateExpression(doc, args[0]), evaluateExpression(doc, args[1]));
    case '$gt':
      return cmp(evaluateExpression(doc, args[0]), evaluateExpression(doc, args[1])) > 0;
    case '$gte':
      return cmp(evaluateExpression(doc, args[0]), evaluateExpression(doc, args[1])) >= 0;
    case '$lt':
      return cmp(evaluateExpression(doc, args[0]), evaluateExpression(doc, args[1])) < 0;
    case '$lte':
      return cmp(evaluateExpression(doc, args[0]), evaluateExpression(doc, args[1])) <= 0;
    case '$and':
      return args.every((arg) => Boolean(evaluateExpression(doc, arg)));
    case '$or':
      return args.some((arg) => Boolean(evaluateExpression(doc, arg)));
    case '$not':
      return !evaluateExpression(doc, args[0]);
    case '$toLower':
      return String(evaluateExpression(doc, args[0]) ?? '').toLowerCase();
    case '$toUpper':
      return String(evaluateExpression(doc, args[0]) ?? '').toUpperCase();
    case '$toString':
      return String(evaluateExpression(doc, args[0]) ?? '');
    case '$concat': {
      return args
        .map((arg) => {
          const value = evaluateExpression(doc, arg);
          return value === null || value === undefined ? '' : String(value);
        })
        .join('');
    }
    case '$substr':
    case '$substrBytes': {
      const value = String(evaluateExpression(doc, args[0]) ?? '');
      const start = toNumber(evaluateExpression(doc, args[1]));
      const length = args[2] === undefined ? undefined : toNumber(evaluateExpression(doc, args[2]));
      return length === undefined ? value.slice(start) : value.slice(start, start + length);
    }
    case '$split': {
      const value = String(evaluateExpression(doc, args[0]) ?? '');
      const delimiter = String(evaluateExpression(doc, args[1]) ?? '');
      return value.split(delimiter);
    }
    case '$sum':
    case '$avg':
    case '$min':
    case '$max': {
      const values = args.flatMap((arg) => {
        const value = evaluateExpression(doc, arg);
        if (Array.isArray(value)) return value;
        return [value];
      });
      const numbers = values.filter((v) => v !== null && v !== undefined && Number.isFinite(toNumber(v))).map(toNumber);
      if (op === '$sum') return numbers.reduce((a, b) => a + b, 0);
      if (op === '$avg') return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
      if (op === '$min') return values.length ? values.reduce((a, b) => (cmp(a, b) <= 0 ? a : b)) : null;
      return values.length ? values.reduce((a, b) => (cmp(a, b) >= 0 ? a : b)) : null;
    }
    case '$dateToString': {
      const value = evaluateExpression(doc, operand.date ?? operand);
      const format = operand.format ?? '%Y-%m-%d';
      if (!(value instanceof Date)) return null;
      const pad = (n) => String(n).padStart(2, '0');
      return format
        .replace('%Y', String(value.getUTCFullYear()))
        .replace('%m', pad(value.getUTCMonth() + 1))
        .replace('%d', pad(value.getUTCDate()))
        .replace('%H', pad(value.getUTCHours()))
        .replace('%M', pad(value.getUTCMinutes()))
        .replace('%S', pad(value.getUTCSeconds()));
    }
    case '$year':
      return evaluateExpression(doc, args[0]) instanceof Date ? evaluateExpression(doc, args[0]).getUTCFullYear() : null;
    default:
      throw UNSUPPORTED(`expression ${op}`);
  }
}

/* ------------------------------------------------------------------ *
 * Aggregation pipeline (subset)
 * ------------------------------------------------------------------ */

export function runPipeline(docs, pipeline) {
  let results = docs;
  for (const stage of pipeline) {
    const [op, spec] = Object.entries(stage)[0] ?? [];
    switch (op) {
      case '$match':
        results = results.filter((doc) => matches(doc, spec));
        break;
      case '$sort':
        results = applySort(results, spec);
        break;
      case '$skip':
        results = results.slice(spec);
        break;
      case '$limit':
        results = results.slice(0, spec);
        break;
      case '$project':
        results = results.map((doc) => applyProjection(doc, spec));
        break;
      case '$unset':
        results = results.map((doc) => {
          const out = deepClone(doc);
          for (const path of Array.isArray(spec) ? spec : [spec]) unsetFieldValue(out, path);
          return out;
        });
        break;
      case '$addFields':
      case '$set':
        results = results.map((doc) => {
          const out = deepClone(doc);
          for (const [path, expr] of Object.entries(spec)) setFieldValue(out, path, evaluateExpression(out, expr));
          return out;
        });
        break;
      case '$group':
        results = groupStage(results, spec);
        break;
      case '$count':
        results = [{ [spec]: results.length }];
        break;
      case '$replaceRoot':
        results = results.map((doc) => evaluateExpression(doc, spec.newRoot));
        break;
      case '$replaceWith':
        results = results.map((doc) => evaluateExpression(doc, spec));
        break;
      case '$unwind': {
        const path = typeof spec === 'string' ? spec : spec.path;
        const preserve = typeof spec === 'object' && spec.preserveNullAndEmptyArrays;
        const field = path.startsWith('$') ? path.slice(1) : path;
        const out = [];
        for (const doc of results) {
          const value = getFieldValue(doc, field);
          if (Array.isArray(value) && value.length) {
            for (const item of value) {
              const clone = deepClone(doc);
              setFieldValue(clone, field, deepClone(item));
              out.push(clone);
            }
          } else if (value === undefined || value === null || (Array.isArray(value) && !value.length)) {
            if (preserve) out.push(deepClone(doc));
          } else {
            out.push(deepClone(doc));
          }
        }
        results = out;
        break;
      }
      case '$lookup':
      case '$facet':
      case '$graphLookup':
      case '$unionWith':
      case '$bucket':
      case '$setWindowFields':
        throw UNSUPPORTED(`aggregation stage ${op}`);
      default:
        throw UNSUPPORTED(`aggregation stage ${op}`);
    }
  }
  return results;
}

function groupStage(docs, spec) {
  const idExpr = spec._id ?? null;
  const groups = new Map();
  const accumulatorEntries = Object.entries(spec).filter(([key]) => key !== '_id');

  for (const doc of docs) {
    const keyValue = idExpr === null ? null : evaluateExpression(doc, idExpr);
    const key = JSON.stringify(keyValue, replacer);
    if (!groups.has(key)) {
      groups.set(key, { key: deepClone(keyValue), docs: [] });
    }
    groups.get(key).docs.push(doc);
  }

  const results = [];
  for (const group of groups.values()) {
    const out = { _id: group.key };
    for (const [field, accumulator] of accumulatorEntries) {
      const [accOp, accExpr] = Object.entries(accumulator)[0] ?? [];
      out[field] = computeAccumulator(accOp, accExpr, group.docs);
    }
    results.push(out);
  }
  return results;
}

function computeAccumulator(op, expr, docs) {
  const values = docs.map((doc) => evaluateExpression(doc, expr));
  switch (op) {
    case '$sum': {
      if (expr === 1 || expr === true) return docs.length;
      return values.reduce((sum, value) => (value === null || value === undefined ? sum : sum + toNumber(value)), 0);
    }
    case '$avg': {
      const numbers = values.filter((value) => value !== null && value !== undefined && Number.isFinite(toNumber(value))).map(toNumber);
      return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
    }
    case '$min':
      return values.length ? values.reduce((a, b) => (a === null || cmp(b, a) < 0 ? b : a)) : null;
    case '$max':
      return values.length ? values.reduce((a, b) => (a === null || cmp(b, a) > 0 ? b : a)) : null;
    case '$first':
      return values.length ? values[0] : null;
    case '$last':
      return values.length ? values[values.length - 1] : null;
    case '$push':
      return values;
    case '$addToSet':
      return values.filter((value, index) => values.findIndex((other) => equalsBSON(other, value)) === index);
    case '$count':
      return docs.length;
    default:
      throw UNSUPPORTED(`accumulator ${op}`);
  }
}

export { UNSUPPORTED };

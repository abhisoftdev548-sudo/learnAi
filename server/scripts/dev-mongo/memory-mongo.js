/**
 * A small, single-node, in-memory MongoDB server that speaks the MongoDB wire
 * protocol well enough for the official Node.js driver + Mongoose to connect.
 *
 * WHY THIS EXISTS
 * ---------------
 * It is a *development / verification* helper. It allows the platform to be
 * booted and end-to-end tested in environments where a real `mongod` binary
 * cannot be installed (CI sandboxes, restricted containers). Normal local
 * development and production should use a real MongoDB deployment through
 * `MONGO_URI` — see `.env.example` and the README.
 *
 * Supported: CRUD, cursors, unique indexes, count/distinct, findAndModify,
 * listCollections/listIndexes/createIndexes, and a subset of the aggregation
 * framework ($match/$group/$sort/$project/$addFields/$unwind/$limit/$skip).
 */
import { EventEmitter } from 'node:events';
import net from 'node:net';
import { Binary, Long, ObjectId, deserialize, serialize } from 'bson';
import { applyProjection, applySort, applyUpdate, matches, runPipeline, wrapMongoError } from './query.js';
import { deepClone, equalsBSON, getFieldValue, isPlainObject } from './bson-utils.js';

const OP_REPLY = 1;
const OP_QUERY = 2004;
const OP_MSG = 2013;
const OP_COMPRESSED = 2012;

const SERVER_VERSION = '7.0.5';
const MAX_BSON_OBJECT_SIZE = 16 * 1024 * 1024;
const MAX_MESSAGE_SIZE_BYTES = 48 * 1000 * 1000;
const MAX_WRITE_BATCH_SIZE = 100000;

let requestIdCounter = 1000;
const nextRequestId = () => (requestIdCounter += 1);

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

class Database {
  constructor(name) {
    this.name = name;
    this.collections = new Map();
  }

  collection(name, create = false) {
    if (!this.collections.has(name)) {
      if (!create) return null;
      this.collections.set(name, { name, docs: [], indexes: [{ v: 2, key: { _id: 1 }, name: '_id_' }] });
    }
    return this.collections.get(name);
  }

  ensureCollection(name) {
    return this.collection(name, true);
  }
}

class MemoryMongo extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger ?? (() => {});
    this.dbs = new Map();
    this.server = null;
    this.port = options.port ?? 27017;
    this.host = options.host ?? '127.0.0.1';
    this.connections = new Set();
    this.startTime = new Date();
  }

  getDb(name, create = false) {
    if (!this.dbs.has(name)) {
      if (!create) return null;
      this.dbs.set(name, new Database(name));
    }
    return this.dbs.get(name);
  }

  listen() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));
      this.server.on('error', reject);
      this.server.listen(this.port, this.host, () => {
        this.logger(`[dev-mongo] in-memory MongoDB listening on mongodb://${this.host}:${this.port}`);
        resolve(this);
      });
    });
  }

  async close() {
    for (const socket of this.connections) socket.destroy();
    this.connections.clear();
    if (!this.server) return;
    await new Promise((resolve) => this.server.close(resolve));
    this.server = null;
  }

  handleConnection(socket) {
    this.connections.add(socket);
    let buffer = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      // Frame messages: 4-byte little endian length prefix.
      while (buffer.length >= 4) {
        const size = buffer.readInt32LE(0);
        if (buffer.length < size) break;
        const message = buffer.subarray(0, size);
        buffer = buffer.subarray(size);
        try {
          this.handleMessage(socket, message);
        } catch (error) {
          this.logger(`[dev-mongo] failed to handle message: ${error.stack ?? error.message}`);
        }
      }
    });
    socket.on('error', () => {});
    socket.on('close', () => this.connections.delete(socket));
  }

  handleMessage(socket, message) {
    const requestId = message.readInt32LE(4);
    const opCode = message.readInt32LE(12);

    if (opCode === OP_COMPRESSED) {
      socket.write(buildErrorReply(requestId, 1, 'compression is not supported by dev-mongo', 9, 'FailedToParse'));
      return;
    }

    if (opCode === OP_QUERY) {
      // Legacy handshake path (very old drivers / `db.version()` shell calls).
      const { doc, ns } = parseOpQuery(message);
      const dbName = ns.split('.')[0];
      const reply = this.runCommand(dbName, doc ?? {});
      socket.write(buildOpReply(requestId, Array.isArray(reply) ? reply : [reply]));
      return;
    }

    if (opCode !== OP_MSG) {
      socket.write(buildErrorReply(requestId, 1, `unsupported op code ${opCode}`, 9, 'FailedToParse'));
      return;
    }

    const { flagBits, body, sequences } = parseOpMsg(message);
    if (flagBits & 2) return; // EXHAUST_ALLOWED - ignored
    const moreToCome = Boolean(flagBits & 1);

    const merged = { ...body };
    for (const [identifier, docs] of Object.entries(sequences ?? {})) {
      merged[identifier] = docs;
    }

    const dbName = merged.$db ?? 'test';
    const reply = this.runCommand(dbName, merged);
    if (moreToCome) return; // fire-and-forget write, no reply expected
    socket.write(buildReply(requestId, reply));
  }

  /* -------------------------------------------------------------- *
   * Command dispatch
   * -------------------------------------------------------------- */
  runCommand(dbName, command) {
    const name = Object.keys(command)[0];
    // MongoDB command names are matched case-insensitively (drivers send
    // e.g. `buildinfo` and `ismaster` in lowercase).
    const canonical =
      this.handlers[name] !== undefined
        ? name
        : this.commandIndex.get(String(name).toLowerCase()) ?? this.commandIndex.get(String(name).replace(/^\$/, '').toLowerCase());
    const handler = canonical ? this.handlers[canonical] : undefined;
    if (!handler) {
      this.logger(`[dev-mongo] !! unsupported command "${name}" (db=${dbName})`);
      return {
        ok: 0,
        errmsg: `dev-mongo: command "${name}" is not implemented by the in-memory development server`,
        code: 59,
        codeName: 'CommandNotFound',
      };
    }
    try {
      const result = handler.call(this, dbName, command);
      if (result && result.ok === undefined) result.ok = 1;
      return result;
    } catch (error) {
      const code = error.code ?? 59;
      this.logger(`[dev-mongo] command "${name}" failed: ${error.message} (code ${code})`);
      return {
        ok: 0,
        errmsg: error.message,
        code,
        codeName: error.codeName ?? (code === 11000 ? 'DuplicateKey' : 'Location00000'),
      };
    }
  }
}

/* The command table is attached below to keep the wire parsing code on top. */

/* ------------------------------------------------------------------ *
 * Wire protocol helpers
 * ------------------------------------------------------------------ */

function parseOpQuery(message) {
  // header (16) + flags (4) + cstring namespace + numberToSkip + numberToReturn + query
  let offset = 20;
  const zero = message.indexOf(0, offset);
  const ns = message.toString('utf8', offset, zero);
  offset = zero + 1;
  offset += 8; // numberToSkip + numberToReturn
  const doc = deserialize(message.subarray(offset));
  return { ns, doc };
}

function parseOpMsg(message) {
  const flagBits = message.readUInt32LE(16);
  let offset = 20;
  let body = null;
  const sequences = {};
  const messageLength = message.length;
  while (offset < messageLength) {
    const kind = message.readUInt8(offset);
    offset += 1;
    if (kind === 0) {
      const len = message.readInt32LE(offset);
      body = deserialize(message.subarray(offset, offset + len));
      offset += len;
    } else if (kind === 1) {
      const start = offset;
      const sectionSize = message.readInt32LE(offset);
      offset += 4;
      const identifierEnd = message.indexOf(0, offset);
      const identifier = message.toString('utf8', offset, identifierEnd);
      offset = identifierEnd + 1;
      const docs = [];
      while (offset < start + sectionSize) {
        const len = message.readInt32LE(offset);
        docs.push(deserialize(message.subarray(offset, offset + len)));
        offset += len;
      }
      sequences[identifier] = docs;
    } else {
      throw new Error(`unknown message section kind ${kind}`);
    }
  }
  return { flagBits, body, sequences };
}

function buildReply(responseTo, body) {
  const doc = serialize(body);
  const total = 16 + 4 + 1 + doc.length;
  const buffer = Buffer.allocUnsafe(total);
  buffer.writeInt32LE(total, 0);
  buffer.writeInt32LE(nextRequestId(), 4);
  buffer.writeInt32LE(responseTo, 8);
  buffer.writeInt32LE(OP_MSG, 12);
  buffer.writeUInt32LE(0, 16);
  buffer.writeUInt8(0, 20);
  doc.copy(buffer, 21);
  return buffer;
}

function buildErrorReply(responseTo, requestId, errmsg, code = 59, codeName = 'UnknownError') {
  return buildReply(responseTo, { ok: 0, errmsg, code, codeName });
}

function buildOpReply(responseTo, docs) {
  const docBufs = docs.map((doc) => serialize({ ...doc, ok: doc.ok ?? 1 }));
  const total = 36 + docBufs.reduce((sum, buf) => sum + buf.length, 0);
  const buffer = Buffer.allocUnsafe(total);
  buffer.writeInt32LE(total, 0);
  buffer.writeInt32LE(nextRequestId(), 4);
  buffer.writeInt32LE(responseTo, 8);
  buffer.writeInt32LE(OP_REPLY, 12);
  buffer.writeInt32LE(0, 16); // responseFlags
  buffer.writeBigInt64LE(0n, 20); // cursorID (int64)
  buffer.writeInt32LE(0, 28); // startingFrom
  buffer.writeInt32LE(docBufs.length, 32); // numberReturned
  let offset = 36;
  for (const docBuf of docBufs) {
    docBuf.copy(buffer, offset);
    offset += docBuf.length;
  }
  return buffer;
}

/* ------------------------------------------------------------------ *
 * Index helpers (unique index enforcement)
 * ------------------------------------------------------------------ */

function indexKeyValues(index, doc) {
  const values = {};
  for (const [field, direction] of Object.entries(index.key)) {
    const value = getFieldValue(doc, field);
    if (Number(direction) === -1) values[field] = deepClone(value); // direction irrelevant for uniqueness
    values[field] = deepClone(value);
  }
  return values;
}

function sameIndexKey(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => equalsBSON(a[key], b[key]));
}

function assertUniqueIndexes(collection, candidate, excludeId) {
  for (const index of collection.indexes) {
    if (!index.unique) continue;
    const key = indexKeyValues(index, candidate);
    const missing = Object.entries(key).filter(([, value]) => value === undefined || value === null);
    if (index.sparse && missing.length) continue;
    if (!index.sparse && missing.length) continue; // MongoDB only enforces unique on non-null values
    for (const doc of collection.docs) {
      if (excludeId !== undefined && doc._id !== undefined && equalsBSON(doc._id, excludeId)) continue;
      if (sameIndexKey(indexKeyValues(index, doc), key)) {
        throw wrapMongoError(
          11000,
          `E11000 duplicate key error collection: ${collection.name} index: ${index.name} dup key: ${JSON.stringify(key)}`,
          { codeName: 'DuplicateKey' },
        );
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Command handlers
 * ------------------------------------------------------------------ */

const handlers = {
  hello() {
    return helloDocument();
  },
  isMaster() {
    return helloDocument();
  },
  ismaster() {
    return helloDocument();
  },
  ping() {
    return { ok: 1 };
  },
  buildInfo() {
    return {
      version: SERVER_VERSION,
      versionArray: [7, 0, 5, 0],
      gitVersion: 'in-memory-dev-server',
      bits: 64,
      debug: false,
      maxBsonObjectSize: MAX_BSON_OBJECT_SIZE,
      maxMessageSizeBytes: MAX_MESSAGE_SIZE_BYTES,
      maxWriteBatchSize: MAX_WRITE_BATCH_SIZE,
      ok: 1,
    };
  },
  getParameter() {
    return { featureCompatibilityVersion: { version: '7.0' }, ok: 1 };
  },
  getCmdLineOpts() {
    return { argv: [], parsed: {}, ok: 1 };
  },
  whatsmysni() {
    return { ok: 1 };
  },
  hostInfo() {
    return { system: { hostname: 'dev-mongo' }, os: { type: 'Linux' }, ok: 1 };
  },
  connectionStatus() {
    return { authInfo: { authenticatedUsers: [], authenticatedUserRoles: [] }, ok: 1 };
  },
  endSessions() {
    return { ok: 1 };
  },
  refreshSessions() {
    return { ok: 1 };
  },
  killSessions() {
    return { ok: 1 };
  },
  killAllSessions() {
    return { ok: 1 };
  },
  killAllSessionsByPattern() {
    return { ok: 1 };
  },
  killCursors(dbName, command) {
    return {
      cursorsKilled: command.cursors ?? [],
      cursorsNotFound: [],
      cursorsAlive: [],
      cursorsUnknown: [],
      ok: 1,
    };
  },
  getMore() {
    return { cursor: { id: new Long(0, 0), ns: 'dev-mongo', nextBatch: [] }, ok: 1 };
  },
  listDatabases() {
    return {
      databases: [...this.dbs.values()].map((db) => ({ name: db.name, sizeOnDisk: 1, empty: false })),
      totalSize: this.dbs.size,
      ok: 1,
    };
  },
  dropDatabase(dbName) {
    this.dbs.delete(dbName);
    return { dropped: dbName, ok: 1 };
  },
  create(dbName, command) {
    this.getDb(dbName, true).ensureCollection(command.create);
    return { ok: 1 };
  },
  drop(dbName, command) {
    const db = this.getDb(dbName, true);
    const existed = db.collections.delete(command.drop);
    return { ns: `${dbName}.${command.drop}`, nIndexesWas: existed ? 1 : 0, ok: 1 };
  },
  createIndexes(dbName, command) {
    const db = this.getDb(dbName, true);
    const collection = db.ensureCollection(command.createIndexes);
    const before = collection.indexes.length;
    for (const index of command.indexes ?? []) {
      const name = index.name ?? Object.entries(index.key).map(([k, v]) => `${k}_${v}`).join('_');
      if (collection.indexes.some((existing) => existing.name === name)) continue;
      collection.indexes.push({ ...index, name });
      if (index.unique) {
        // Validate existing documents, like a real server would.
        const seen = [];
        for (const doc of collection.docs) {
          const key = indexKeyValues(index, doc);
          const missing = Object.values(key).some((value) => value === undefined || value === null);
          if (missing) continue;
          if (seen.some((other) => sameIndexKey(other, key))) {
            throw wrapMongoError(11000, `E11000 duplicate key error collection: ${collection.name} index: ${name}`, {
              codeName: 'DuplicateKey',
            });
          }
          seen.push(key);
        }
      }
    }
    return {
      createdCollectionAutomatically: false,
      numIndexesBefore: before,
      numIndexesAfter: collection.indexes.length,
      ok: 1,
    };
  },
  listIndexes(dbName, command) {
    const db = this.getDb(dbName, false);
    const collection = db?.collection(command.listIndexes, false);
    if (!collection) {
      throw wrapMongoError(26, `ns does not exist: ${dbName}.${command.listIndexes}`, { codeName: 'NamespaceNotFound' });
    }
    return {
      cursor: { id: new Long(0, 0), ns: `${dbName}.${command.listIndexes}`, firstBatch: collection.indexes.map((index) => ({ ...index, v: 2 })) },
      ok: 1,
    };
  },
  dropIndexes(dbName, command) {
    const db = this.getDb(dbName, true);
    const collection = db.collection(command.dropIndexes, false);
    if (!collection) {
      throw wrapMongoError(26, `ns not found: ${dbName}.${command.dropIndexes}`, { codeName: 'NamespaceNotFound' });
    }
    const before = collection.indexes.length;
    if (command.index === '*') {
      collection.indexes = collection.indexes.filter((index) => index.name === '_id_');
    } else {
      collection.indexes = collection.indexes.filter((index) => index.name !== command.index);
    }
    return { nIndexesWas: before, ok: 1 };
  },
  listCollections(dbName, command) {
    const db = this.getDb(dbName, true);
    const filter = command.filter ?? {};
    const nameOnly = Boolean(command.nameOnly);
    const batch = [...db.collections.values()]
      .map((collection) => ({
        name: collection.name,
        type: 'collection',
        options: {},
        info: { readOnly: false, uuid: new Binary(Buffer.alloc(16), 4) },
        idIndex: { v: 2, key: { _id: 1 }, name: '_id_' },
      }))
      .filter((entry) => matches(entry, filter))
      .map((entry) => (nameOnly ? { name: entry.name, type: entry.type } : entry));
    return { cursor: { id: new Long(0, 0), ns: `${dbName}.$cmd.listCollections`, firstBatch: batch }, ok: 1 };
  },
  collStats(dbName, command) {
    const db = this.getDb(dbName, true);
    const collection = db.collection(command.collStats, false);
    return { ns: `${dbName}.${command.collStats}`, count: collection?.docs.length ?? 0, size: 1, storageSize: 1, ok: 1 };
  },
  dbStats(dbName) {
    const db = this.getDb(dbName, true);
    return { db: dbName, collections: db.collections.size, objects: 1, ok: 1 };
  },
  usersInfo() {
    return { users: [], ok: 1 };
  },
  saslStart() {
    throw wrapMongoError(18, 'Authentication is not supported by the in-memory development server', {
      codeName: 'AuthenticationFailed',
    });
  },
  saslContinue() {
    throw wrapMongoError(18, 'Authentication is not supported by the in-memory development server', {
      codeName: 'AuthenticationFailed',
    });
  },
  startTransaction() {
    return { ok: 1 };
  },
  commitTransaction() {
    return { ok: 1 };
  },
  abortTransaction() {
    return { ok: 1 };
  },
  explain(dbName, command) {
    const inner = command.explain;
    return { queryPlanner: { namespace: dbName, indexFilterSet: false, parsedQuery: inner?.filter ?? {} }, ok: 1 };
  },
  insert(dbName, command) {
    const db = this.getDb(dbName, true);
    const collection = db.ensureCollection(command.insert);
    const docs = command.documents ?? [];
    const ordered = command.ordered !== false;
    let inserted = 0;
    const writeErrors = [];
    docs.forEach((doc, index) => {
      try {
        const candidate = deepClone(doc);
        if (candidate._id === undefined) candidate._id = new ObjectId();
        assertUniqueIndexes(collection, candidate);
        if (collection.docs.some((existing) => equalsBSON(existing._id, candidate._id))) {
          throw wrapMongoError(11000, `E11000 duplicate key error collection: ${collection.name} index: _id_`, {
            codeName: 'DuplicateKey',
          });
        }
        collection.docs.push(candidate);
        inserted += 1;
      } catch (error) {
        writeErrors.push({ index, code: error.code ?? 59, errmsg: error.message });
        if (ordered) throw error;
      }
    });
    if (writeErrors.length) {
      const error = wrapMongoError(writeErrors[0].code, writeErrors[0].errmsg, { writeErrors });
      error.writeErrors = writeErrors;
      if (!ordered) {
        return { n: inserted, ok: 1, writeErrors };
      }
      throw error;
    }
    return { n: inserted, ok: 1 };
  },
  find(dbName, command) {
    const collection = this.getDb(dbName, true).collection(command.find, false);
    const docs = collection ? collection.docs.filter((doc) => matches(doc, command.filter ?? {})) : [];
    const sorted = applySort(docs, command.sort);
    const skipped = command.skip ? sorted.slice(command.skip) : sorted;
    const limited = command.limit ? skipped.slice(0, Math.abs(command.limit)) : skipped;
    const batch = limited.map((doc) => (command.projection ? applyProjection(doc, command.projection) : doc));
    return {
      cursor: { id: new Long(0, 0), ns: `${dbName}.${command.find}`, firstBatch: batch },
      ok: 1,
    };
  },
  aggregate(dbName, command) {
    const target = command.aggregate;
    let docs;
    if (target === 1) {
      docs = [{}];
    } else {
      const collection = this.getDb(dbName, true).collection(target, false);
      docs = collection ? collection.docs : [];
    }
    const results = runPipeline(docs, command.pipeline ?? []);
    const batch = command.cursor?.batchSize ? results.slice(0, command.cursor.batchSize) : results;
    const finish = command.cursor?.batchSize && results.length > batch.length ? new Long(1, 0) : new Long(0, 0);
    const out = { cursor: { id: finish, ns: `${dbName}.${target}`, firstBatch: batch.map((doc) => deepClone(doc)) }, ok: 1 };
    return out;
  },
  count(dbName, command) {
    const collection = this.getDb(dbName, true).collection(command.count, false);
    let docs = collection ? collection.docs.filter((doc) => matches(doc, command.query ?? {})) : [];
    if (command.skip) docs = docs.slice(command.skip);
    if (command.limit) docs = docs.slice(0, Math.abs(command.limit));
    return { n: docs.length, ok: 1 };
  },
  distinct(dbName, command) {
    const collection = this.getDb(dbName, true).collection(command.distinct, false);
    const docs = collection ? collection.docs.filter((doc) => matches(doc, command.query ?? {})) : [];
    const values = [];
    for (const doc of docs) {
      const value = getFieldValue(doc, command.key);
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) {
        if (item === undefined) continue;
        if (!values.some((existing) => equalsBSON(existing, item))) values.push(item);
      }
    }
    return { values, ok: 1 };
  },
  update(dbName, command) {
    const collection = this.getDb(dbName, true).ensureCollection(command.update);
    let matched = 0;
    let modified = 0;
    const upserted = [];
    (command.updates ?? []).forEach((entry, index) => {
      const { q = {}, u, upsert = false, multi = false } = entry;
      const targets = collection.docs.filter((doc) => matches(doc, q));
      const limited = multi ? targets : targets.slice(0, 1);
      if (!limited.length && upsert) {
        const seed = {};
        for (const [field, value] of Object.entries(q)) {
          if (field.startsWith('$')) continue;
          if (isPlainObject(value) && Object.keys(value).some((key) => key.startsWith('$'))) {
            if (value.$eq !== undefined) seed[field] = deepClone(value.$eq);
            continue;
          }
          seed[field] = deepClone(value);
        }
        const candidate = deepClone(seed);
        applyUpdate(candidate, u, { upserting: true });
        if (candidate._id === undefined) candidate._id = new ObjectId();
        assertUniqueIndexes(collection, candidate);
        collection.docs.push(candidate);
        upserted.push({ index, _id: candidate._id });
        matched += 1;
        modified += 1;
        return;
      }
      for (const doc of limited) {
        matched += 1;
        const changed = applyUpdate(doc, u, { upserting: false });
        if (changed) {
          assertUniqueIndexes(collection, doc, doc._id);
          modified += 1;
        }
      }
    });
    const result = { n: matched, nModified: modified, ok: 1 };
    if (upserted.length) result.upserted = upserted;
    return result;
  },
  delete(dbName, command) {
    const collection = this.getDb(dbName, true).collection(command.delete, false);
    if (!collection) return { n: 0, ok: 1 };
    let deleted = 0;
    for (const entry of command.deletes ?? []) {
      const limit = entry.limit ?? 0;
      const matchesIndexes = collection.docs.map((doc, index) => (matches(doc, entry.q ?? {}) ? index : -1)).filter((index) => index >= 0);
      const targets = limit === 1 ? matchesIndexes.slice(0, 1) : matchesIndexes;
      for (const index of targets.sort((a, b) => b - a)) {
        collection.docs.splice(index, 1);
        deleted += 1;
      }
    }
    return { n: deleted, ok: 1 };
  },
  findAndModify(dbName, command) {
    const collection = this.getDb(dbName, true).ensureCollection(command.findAndModify);
    const { query = {}, sort, remove = false, update, upsert = false, new: returnNew = false, fields } = command;
    const candidates = applySort(
      collection.docs.filter((doc) => matches(doc, query)),
      sort,
    );
    const target = candidates[0];
    const project = (doc) => (doc && fields ? applyProjection(doc, fields) : doc);

    if (remove) {
      if (!target) return { lastErrorObject: { n: 0 }, value: null, ok: 1 };
      collection.docs.splice(collection.docs.indexOf(target), 1);
      return { lastErrorObject: { n: 1 }, value: project(target), ok: 1 };
    }

    if (!target) {
      if (!upsert) return { lastErrorObject: { n: 0, updatedExisting: false }, value: null, ok: 1 };
      const seed = {};
      for (const [field, value] of Object.entries(query)) {
        if (field.startsWith('$')) continue;
        if (isPlainObject(value) && Object.keys(value).some((key) => key.startsWith('$'))) {
          if (value.$eq !== undefined) seed[field] = deepClone(value.$eq);
          continue;
        }
        seed[field] = deepClone(value);
      }
      const candidate = deepClone(seed);
      applyUpdate(candidate, update, { upserting: true });
      if (candidate._id === undefined) candidate._id = new ObjectId();
      assertUniqueIndexes(collection, candidate);
      collection.docs.push(candidate);
      return {
        lastErrorObject: { n: 1, updatedExisting: false, upserted: candidate._id },
        value: returnNew ? project(candidate) : null,
        ok: 1,
      };
    }

    const before = deepClone(target);
    const changed = applyUpdate(target, update, { upserting: false });
    if (changed) assertUniqueIndexes(collection, target, target._id);
    return {
      lastErrorObject: { n: 1, updatedExisting: true },
      value: project(returnNew ? target : before),
      ok: 1,
    };
  },
};

MemoryMongo.prototype.handlers = handlers;
MemoryMongo.prototype.commandIndex = new Map(Object.keys(handlers).map((key) => [key.toLowerCase(), key]));

function helloDocument() {
  return {
    isWritablePrimary: true,
    ismaster: true,
    maxBsonObjectSize: MAX_BSON_OBJECT_SIZE,
    maxMessageSizeBytes: MAX_MESSAGE_SIZE_BYTES,
    maxWriteBatchSize: MAX_WRITE_BATCH_SIZE,
    localTime: new Date(),
    logicalSessionTimeoutMinutes: 30,
    connectionId: nextRequestId(),
    minWireVersion: 0,
    maxWireVersion: 17,
    readOnly: false,
    ok: 1,
  };
}

export { MemoryMongo };
export default MemoryMongo;

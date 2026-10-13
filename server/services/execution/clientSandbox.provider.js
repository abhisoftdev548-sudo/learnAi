/**
 * Client sandbox execution provider.
 *
 * The user's code is executed in a sandboxed, cross-origin-less iframe in the
 * browser (`sandbox="allow-scripts"`). The runner there only *measures* the live
 * DOM — it never decides pass/fail. It returns raw values (text contents,
 * computed styles, counter deltas, ...) which the server judges against the
 * challenge's declarative checks. That keeps the judge authoritative and makes
 * it possible to swap in a server-side isolated runner later without touching
 * the scoring rules.
 */
import env from '../../config/env.js';

export const NAME = 'client-sandbox';

const MAX_MEASUREMENT_BYTES = 64 * 1024;
const MAX_MEASUREMENT_KEYS = 200;

/** Validate the raw measurement payload sent by the browser. */
export function validateMeasurementPayload(payload, { expectedIds = [] } = {}) {
  if (payload === undefined || payload === null) return { measurements: new Map(), missing: expectedIds };
  if (typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('measurements must be an object keyed by test id');
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_MEASUREMENT_BYTES) {
    throw new Error('measurement payload is too large');
  }
  const keys = Object.keys(payload);
  if (keys.length > MAX_MEASUREMENT_KEYS) {
    throw new Error('too many measurements reported');
  }

  const measurements = new Map();
  const missing = [];
  for (const id of expectedIds) {
    const entry = payload[id];
    if (!entry || typeof entry !== 'object') {
      missing.push(id);
      continue;
    }
    if (entry.error) {
      measurements.set(id, { error: String(entry.error).slice(0, 500) });
      continue;
    }
    const values = entry.values && typeof entry.values === 'object' ? entry.values : entry;
    measurements.set(id, { values: sanitizeValues(values) });
  }
  return { measurements, missing, unexpected: keys.filter((key) => !expectedIds.includes(key)) };
}

/** Only primitives and flat arrays survive — no prototypes, no functions. */
function sanitizeValues(values, depth = 0) {
  if (values === null || values === undefined) return null;
  if (typeof values === 'string') return values.slice(0, 2000);
  if (typeof values === 'number' || typeof values === 'boolean') return values;
  if (Array.isArray(values)) return depth > 2 ? [] : values.slice(0, 100).map((entry) => sanitizeValues(entry, depth + 1));
  if (typeof values === 'object') {
    if (depth > 2) return null;
    const out = {};
    for (const [key, value] of Object.entries(values).slice(0, 100)) {
      out[String(key).slice(0, 80)] = sanitizeValues(value, depth + 1);
    }
    return out;
  }
  return null;
}

export const provider = {
  name: NAME,
  kind: 'client-sandbox',
  /**
   * The client sandbox already produced the measurements; resolving them here
   * simply validates and normalizes the payload.
   */
  async resolveMeasurements({ challenge, observations }) {
    const expectedIds = (challenge.testCases ?? []).filter((test) => test.kind === 'measure').map((test) => test.id);
    const { measurements, missing, unexpected } = validateMeasurementPayload(observations?.measurements ?? observations, { expectedIds });
    return { measurements, missing, unexpected, provider: NAME, note: 'Measurements reported by the sandboxed client preview' };
  },
  /** Payload the client needs in order to run measurements in the iframe. */
  buildRuntimeSpec(challenge) {
    return {
      provider: NAME,
      sandbox: 'iframe:sandbox="allow-scripts"',
      timeoutMs: env.execution.timeoutMs,
      measurementCount: (challenge.testCases ?? []).filter((test) => test.kind === 'measure').length,
    };
  },
};

export default provider;

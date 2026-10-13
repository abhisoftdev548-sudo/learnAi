/**
 * Remote isolated runner provider — extension point.
 *
 * Production platforms should execute untrusted code in a dedicated service
 * (container per submission, gVisor/Firecracker microVM, or a managed code
 * execution API) instead of the web process. This provider speaks a tiny HTTP
 * contract so such a service can be wired in without touching the scoring rules:
 *
 *   POST {EXECUTION_SERVICE_URL}/run
 *   Authorization: Bearer {EXECUTION_SERVICE_TOKEN}
 *   {
 *     "challengeId": "...",
 *     "html": "...", "css": "...", "js": "...",
 *     "measurements": [{ "id": "...", "script": "...", "timeoutMs": 3000, "viewport": {...} }]
 *   }
 *   -> 200 { "measurements": { "<id>": { "values": { ...raw measured values... } } } }
 *
 * Enable with EXECUTION_PROVIDER=remote (+ EXECUTION_SERVICE_URL / _TOKEN).
 */
import env from '../../config/env.js';

export const NAME = 'remote-runner';

export const provider = {
  name: NAME,
  kind: 'remote-runner',

  async resolveMeasurements({ challenge, code }) {
    if (!env.execution.serviceUrl) {
      throw new Error('EXECUTION_SERVICE_URL is not configured');
    }
    const measurements = (challenge.testCases ?? [])
      .filter((test) => test.kind === 'measure')
      .map((test) => ({
        id: test.id,
        script: test.script,
        timeoutMs: test.timeoutMs,
        viewport: { width: test.viewport?.width ?? null, height: test.viewport?.height ?? null },
      }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.execution.timeoutMs);
    try {
      const response = await fetch(`${env.execution.serviceUrl.replace(/\/$/, '')}/run`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(env.execution.serviceToken ? { authorization: `Bearer ${env.execution.serviceToken}` } : {}),
        },
        body: JSON.stringify({
          challengeId: String(challenge._id ?? challenge.id),
          html: code.html,
          css: code.css,
          js: code.js,
          measurements,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`execution service responded with ${response.status}`);
      }
      const payload = await response.json();
      const raw = payload.measurements ?? {};
      const map = new Map();
      for (const [id, entry] of Object.entries(raw)) {
        map.set(id, entry?.error ? { error: String(entry.error) } : { values: entry?.values ?? entry });
      }
      return { measurements: map, provider: NAME, note: 'Measurements reported by the isolated execution service' };
    } finally {
      clearTimeout(timer);
    }
  },

  buildRuntimeSpec(challenge) {
    return {
      provider: NAME,
      sandbox: 'remote-isolated',
      timeoutMs: env.execution.timeoutMs,
      measurementCount: (challenge.testCases ?? []).filter((test) => test.kind === 'measure').length,
    };
  },
};

export default provider;

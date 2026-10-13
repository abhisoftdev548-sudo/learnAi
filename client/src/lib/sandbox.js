/**
 * Sandboxed preview + measurement runner.
 *
 * The API never executes user code. Instead the challenge ships *measurement
 * scripts* (plain functions returning raw values) that run inside a sandboxed
 * iframe on the client; the server then judges those values against the test
 * checks. This module is that executor:
 *
 *   - `buildSandboxDocument()` composes the user's HTML/CSS/JS into a document
 *   - `SandboxRunner.measure()` runs each script in a fresh iframe of the test's
 *     viewport and resolves with the raw values (or an error)
 *
 * Security notes: the iframes are created with `sandbox="allow-scripts"`, so they
 * have an opaque origin and cannot touch the parent document, cookies or storage.
 * All traffic is `postMessage` with a per-run token.
 */

const RUN_MESSAGE = 'learnai:run';
const RESULT_MESSAGE = 'learnai:result';
const READY_MESSAGE = 'learnai:ready';
const CONSOLE_MESSAGE = 'learnai:console';
const DEFAULT_TIMEOUT = 4000;

/** Script injected into every sandbox document to bridge console/errors. */
function bridgeScript(token) {
  return `
(function () {
  var TOKEN = ${JSON.stringify(token)};
  function send(type, payload) {
    try { parent.postMessage(Object.assign({ source: 'learnai-sandbox', token: TOKEN, type: type }, payload), '*'); } catch (error) { /* ignore */ }
  }
  var originalError = console.error;
  console.error = function () {
    var args = Array.prototype.slice.call(arguments);
    originalError.apply(console, args);
    send('${CONSOLE_MESSAGE}', { level: 'error', message: args.map(String).join(' ') });
  };
  var originalWarn = console.warn;
  console.warn = function () {
    var args = Array.prototype.slice.call(arguments);
    originalWarn.apply(console, args);
    send('${CONSOLE_MESSAGE}', { level: 'warn', message: args.map(String).join(' ') });
  };
  window.addEventListener('error', function (event) {
    send('${CONSOLE_MESSAGE}', { level: 'error', message: event.message + ' (line ' + event.lineno + ')' });
  });
  window.addEventListener('unhandledrejection', function (event) {
    send('${CONSOLE_MESSAGE}', { level: 'error', message: 'Unhandled rejection: ' + String(event.reason) });
  });
  send('${READY_MESSAGE}', {});
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.token !== TOKEN || data.type !== '${RUN_MESSAGE}') return;
    var runToken = data.runToken;
    var tests = data.tests || [];
    (async function () {
      for (var index = 0; index < tests.length; index += 1) {
        var test = tests[index];
        var started = Date.now();
        try {
          var factory = new Function(
            'document',
            'window',
            'getComputedStyle',
            'sleep',
            '"use strict"; return (async function () {\\n' + test.script + '\\n})();',
          );
          // eslint-disable-next-line no-await-in-loop
          var values = await factory(document, window, window.getComputedStyle.bind(window), function (ms) {
            return new Promise(function (resolve) { setTimeout(resolve, ms); });
          });
          send('${RESULT_MESSAGE}', { runToken: runToken, id: test.id, ok: true, values: values === undefined ? null : values, durationMs: Date.now() - started });
        } catch (error) {
          send('${RESULT_MESSAGE}', { runToken: runToken, id: test.id, ok: false, error: String((error && error.message) || error), durationMs: Date.now() - started });
        }
      }
    })();
  });
})();
`;
}

/** Compose the full HTML document for the sandboxed iframe. */
export function buildSandboxDocument({ html = '', css = '', js = '', token = 'preview', includeBridge = true } = {}) {
  const safeToken = String(token).replace(/[^a-zA-Z0-9-]/g, '');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; }
      img { max-width: 100%; }
${css}
    </style>
  </head>
  <body>
${html}
    <script type="module">
${js}
    </script>
${includeBridge ? `<script>${bridgeScript(safeToken)}</script>` : ''}
  </body>
</html>`;
}

let tokenCounter = 0;
function createToken(prefix) {
  tokenCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${tokenCounter}`;
}

function waitForMessage(window_, type, token, { timeout = DEFAULT_TIMEOUT } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window_.removeEventListener('message', handler);
      reject(new Error('The sandbox did not respond in time.'));
    }, timeout);

    function handler(event) {
      const data = event.data;
      if (!data || data.source !== 'learnai-sandbox' || data.token !== token) return;
      if (data.type !== type) return;
      clearTimeout(timer);
      window_.removeEventListener('message', handler);
      resolve(data);
    }

    window_.addEventListener('message', handler);
  });
}

/**
 * Runs measurement scripts inside throw-away sandboxed iframes.
 * One iframe per test keeps every measurement isolated from the previous one.
 */
export class SandboxRunner {
  constructor({ timeout = DEFAULT_TIMEOUT, onConsole = null } = {}) {
    this.timeout = timeout;
    this.onConsole = onConsole;
    this.container = null;
    this.consoleHandler = null;
  }

  ensureContainer() {
    if (typeof document === 'undefined') throw new Error('The sandbox runner needs a browser environment.');
    if (this.container) return this.container;
    const container = document.createElement('div');
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;';
    document.body.appendChild(container);
    this.container = container;
    return container;
  }

  /** Collect console output from preview frames as well. */
  attachConsoleListener() {
    if (this.consoleHandler || !this.onConsole) return;
    this.consoleHandler = (event) => {
      const data = event.data;
      if (!data || data.source !== 'learnai-sandbox') return;
      if (data.type === CONSOLE_MESSAGE) this.onConsole({ level: data.level, message: data.message });
    };
    window.addEventListener('message', this.consoleHandler);
  }

  createFrame({ width, height, token }) {
    const container = this.ensureContainer();
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('title', 'LearnAI sandbox');
    frame.style.cssText = `position:absolute;left:-10000px;top:0;border:0;width:${width}px;height:${height}px;`;
    container.appendChild(frame);
    frame.dataset.token = token;
    return frame;
  }

  /**
   * Run a list of measurement tests against the given code.
   * Returns an object keyed by test id: `{ ok, values, error, durationMs }`.
   */
  async measure({ html, css, js, tests = [] }) {
    const results = {};
    if (!tests.length) return results;

    for (const test of tests) {
      const token = createToken('measure');
      const viewport = test.viewport ?? { width: 1024, height: 800 };
      const frame = this.createFrame({ width: viewport.width, height: viewport.height, token });
      const runToken = createToken('run');

      try {
        // eslint-disable-next-line no-await-in-loop
        await this.loadFrame(frame, { html, css, js, token });
        const started = Date.now();
        frame.contentWindow?.postMessage(
          { type: RUN_MESSAGE, token, runToken, tests: [{ id: test.id, script: test.script }] },
          '*',
        );
        // eslint-disable-next-line no-await-in-loop
        const message = await this.waitForResult(frame, token, runToken, test.timeoutMs ?? this.timeout);
        results[test.id] = message.ok
          ? { ok: true, values: message.values ?? null, durationMs: message.durationMs ?? Date.now() - started }
          : { ok: false, error: message.error || 'Measurement failed', durationMs: message.durationMs ?? 0 };
      } catch (error) {
        results[test.id] = { ok: false, error: error.message || 'Measurement failed', durationMs: 0 };
      } finally {
        frame.remove();
      }
    }

    return results;
  }

  loadFrame(frame, { html, css, js, token }) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Sandbox load timed out')), this.timeout + 2000);
      const onMessage = (event) => {
        const data = event.data;
        if (event.source !== frame.contentWindow) return;
        if (!data || data.source !== 'learnai-sandbox' || data.token !== token) return;
        if (data.type === CONSOLE_MESSAGE) {
          this.onConsole?.({ level: data.level, message: data.message });
          return;
        }
        if (data.type !== READY_MESSAGE) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve();
      };
      window.addEventListener('message', onMessage);
      this.attachConsoleListener();
      frame.srcdoc = buildSandboxDocument({ html, css, js, token });
    });
  }

  waitForResult(frame, token, runToken, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('The measurement script did not finish in time.'));
      }, timeout);

      function onMessage(event) {
        const data = event.data;
        if (event.source !== frame.contentWindow) return;
        if (!data || data.source !== 'learnai-sandbox' || data.token !== token) return;
        if (data.type !== RESULT_MESSAGE || data.runToken !== runToken) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        resolve(data);
      }

      window.addEventListener('message', onMessage);
    });
  }

  destroy() {
    this.container?.remove();
    this.container = null;
    if (this.consoleHandler) {
      window.removeEventListener('message', this.consoleHandler);
      this.consoleHandler = null;
    }
  }
}

/** Split challenge test cases into server-verified and sandbox-measured groups. */
export function splitTestCases(testCases = []) {
  return testCases.reduce(
    (acc, test) => {
      if (test.kind === 'measure') acc.measured.push(test);
      else acc.static.push(test);
      return acc;
    },
    { static: [], measured: [] },
  );
}

'use strict';
/**
 * Prepare the embedded MongoDB engine for this machine.
 *
 * On modern systems (glibc >= 2.38, or no embedded engine installed) this is
 * a no-op. On older glibc it:
 *   1. relabels the GLIBC_2.38 verneed entries in the engine binaries
 *      (idempotent — see patch-engine-glibc.js), and
 *   2. makes sure the glibc238shim shared library exists, building it from the
 *      bundled source when a C compiler is available (a prebuilt x86-64 copy
 *      ships next to it as a fallback).
 *
 * The launcher (with-engine.js) LD_PRELOADs the shim at runtime when needed.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { patchEngineBinary } = require('./patch-engine-glibc');

const EMBEDDED_DIR = path.join(__dirname, 'embedded');
const SHIM_C = path.join(EMBEDDED_DIR, 'glibc238shim.c');
const SHIM_MAP = path.join(EMBEDDED_DIR, 'glibc238shim.map');
const SHIM_SO = path.join(EMBEDDED_DIR, 'glibc238shim.so');

function glibcVersion() {
  try {
    if (process.report && typeof process.report.getReport === 'function') {
      const r = process.report.getReport();
      return r.header && r.header.glibcVersionRuntime;
    }
  } catch { /* ignore */ }
  return null;
}

function isOldGlibc() {
  if (process.platform !== 'linux') return false;
  const v = glibcVersion();
  if (!v) return false; // unknown — assume fine; engine load will tell us
  const [maj, min] = v.split('.').map(Number);
  return maj < 2 || (maj === 2 && (min || 0) < 38);
}

function engineFiles() {
  try {
    const pkgDir = path.dirname(require.resolve('@0q/embedded-mongodb/package.json'));
    const scopeDir = path.dirname(pkgDir); // .../node_modules/@0q
    const dir = path.join(scopeDir, 'embedded-mongodb-linux-x64-gnu');
    if (!fs.existsSync(dir)) return null;
    return [
      path.join(dir, 'embedded-mongodb.linux-x64-gnu.node'),
      path.join(dir, 'libembedded_mongodb_native.so'),
    ];
  } catch {
    return null;
  }
}

function ensureShim() {
  if (fs.existsSync(SHIM_SO)) return SHIM_SO;
  try {
    execFileSync('gcc', [
      '-shared', '-fPIC', '-O2',
      '-o', SHIM_SO, SHIM_C,
      `-Wl,--version-script=${SHIM_MAP}`,
    ], { stdio: 'ignore' });
    if (fs.existsSync(SHIM_SO)) return SHIM_SO;
  } catch { /* fall through */ }
  throw new Error(
    'glibc238shim.so is missing and gcc could not build it. ' +
    'Build it manually: gcc -shared -fPIC -O2 -o scripts/embedded/glibc238shim.so ' +
    'scripts/embedded/glibc238shim.c -Wl,--version-script=scripts/embedded/glibc238shim.map'
  );
}

/** Returns { shimPath } when the shim + patch are required, else null. */
function prepare() {
  if (!isOldGlibc()) return null;
  const files = engineFiles();
  if (!files) return null;
  for (const f of files) {
    const n = patchEngineBinary(f);
    if (n) console.log(`[engine] patched ${path.basename(f)} (${n} verneed entr${n === 1 ? 'y' : 'ies'})`);
  }
  const shimPath = ensureShim();
  console.log(`[engine] old glibc detected — shim ready: ${shimPath}`);
  return { shimPath };
}

module.exports = { prepare, isOldGlibc, engineFiles, glibcVersion };

if (require.main === module) {
  const r = prepare();
  console.log(r ? `[engine] prepared (shim: ${r.shimPath})` : '[engine] nothing to prepare');
}

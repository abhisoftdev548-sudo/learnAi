'use strict';
/**
 * Launcher: `node scripts/with-engine.js <entry.js> [args...]`
 *
 * Starts a Node entry point, preloading the glibc compatibility shim when the
 * embedded MongoDB engine needs it (old glibc + no MONGODB_URI configured).
 * Normal deployments (real MongoDB / modern glibc) start the target directly
 * with an untouched environment.
 */
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const args = process.argv.slice(2);
if (!args.length) {
  console.error('usage: node scripts/with-engine.js <entry.js> [args...]');
  process.exit(1);
}

const target = args[0];
const targetArgs = args.slice(1);

const env = { ...process.env };
let prepared = null;

try {
  const skip = process.env.TF_SKIP_ENGINE_SHIM === '1';
  const embeddedConfigured = !process.env.MONGODB_URI;
  if (!skip && embeddedConfigured) {
    prepared = require('./prepare-engine').prepare();
    if (prepared) {
      env.LD_PRELOAD = prepared.shimPath + (env.LD_PRELOAD ? `:${env.LD_PRELOAD}` : '');
    }
  }
} catch (e) {
  console.warn(`[launcher] engine preparation skipped: ${e.message}`);
}

const entry = path.resolve(process.cwd(), target);
if (!fs.existsSync(entry)) {
  console.error(`[launcher] entry not found: ${entry}`);
  process.exit(1);
}

const child = spawn(process.execPath, [entry, ...targetArgs], {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
});

const forward = (sig) => () => { try { child.kill(sig); } catch { /* ignore */ } };
process.on('SIGINT', forward('SIGINT'));
process.on('SIGTERM', forward('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code == null ? 1 : code);
  }
});

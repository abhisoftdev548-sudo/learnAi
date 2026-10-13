'use strict';
/**
 * Secure initial-admin creation.
 *
 * Usage:  ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_USERNAME=... ADMIN_NAME=... \
 *         npm run seed:admin --prefix server
 *
 * - Idempotent: if the admin email already exists it updates the password
 *   ONLY when ALLOW_ADMIN_RESET=1, otherwise it leaves the account untouched.
 * - Public registration can never create an admin: this script is the only
 *   supported bootstrap path (plus an existing admin promoting members).
 */
require('../config/env');
const User = require('../models/User');
const { connectDB, closeDB } = require('../config/db');

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Team Admin';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();

  const existingByEmail = await User.findOne({ email });
  if (existingByEmail) {
    if (existingByEmail.role === 'admin' && existingByEmail.status === 'approved') {
      if (process.env.ALLOW_ADMIN_RESET === '1') {
        existingByEmail.passwordHash = await User.hashPassword(password);
        await existingByEmail.save();
        console.log(`Admin password reset for ${email}.`);
      } else {
        console.log(`Admin ${email} already exists — nothing to do (set ALLOW_ADMIN_RESET=1 to reset the password).`);
      }
      await closeDB();
      return;
    }
    existingByEmail.role = 'admin';
    existingByEmail.status = 'approved';
    existingByEmail.approvedAt = new Date();
    existingByEmail.passwordHash = await User.hashPassword(password);
    await existingByEmail.save();
    console.log(`Promoted existing account ${email} to admin.`);
    await closeDB();
    return;
  }

  const usernameTaken = await User.findOne({ username });
  const finalUsername = usernameTaken ? `${username}_${Date.now().toString(36)}` : username;

  await User.create({
    name,
    username: finalUsername,
    email,
    passwordHash: await User.hashPassword(password),
    role: 'admin',
    status: 'approved',
    approvedAt: new Date(),
    bio: 'Platform administrator',
  });
  console.log(`Created admin account: ${email} (username: ${finalUsername})`);
  await closeDB();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

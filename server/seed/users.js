import env from '../config/env.js';

/**
 * Seed accounts.
 *  - the admin account owns challenge authoring and the admin dashboards
 *  - the demo team members give the leaderboard, streaks and activity calendar
 *    realistic data (their submissions are generated in demoActivity.js)
 */
export const adminSeed = {
  name: 'Platform Admin',
  username: env.seed.adminUsername,
  email: env.seed.adminEmail,
  password: env.seed.adminPassword,
  role: 'admin',
  bio: 'Maintains the challenge catalogue and watches the team dashboards.',
  avatarSeed: 'admin',
};

export const demoUserSeed = [
  {
    name: 'Maya Chen',
    username: 'maya',
    email: 'maya@learnai.dev',
    bio: 'Frontend lead. Flexbox apologist, CSS grid convert.',
    avatarSeed: 'maya',
    activity: { level: 'high' },
  },
  {
    name: 'Daniel Okafor',
    username: 'daniel',
    email: 'daniel@learnai.dev',
    bio: 'Loves accessible markup and keyboard shortcuts.',
    avatarSeed: 'daniel',
    activity: { level: 'high' },
  },
  {
    name: 'Priya Nair',
    username: 'priya',
    email: 'priya@learnai.dev',
    bio: 'Vanilla JS enthusiast — no frameworks, no problems.',
    avatarSeed: 'priya',
    activity: { level: 'medium' },
  },
  {
    name: 'Lukas Weber',
    username: 'lukas',
    email: 'lukas@learnai.dev',
    bio: 'Designer learning to code. Obsessed with micro-interactions.',
    avatarSeed: 'lukas',
    activity: { level: 'medium' },
  },
  {
    name: 'Sofia Rossi',
    username: 'sofia',
    email: 'sofia@learnai.dev',
    bio: 'Backend developer sharpening frontend skills.',
    avatarSeed: 'sofia',
    activity: { level: 'low' },
  },
  {
    name: 'Tom Becker',
    username: 'tom',
    email: 'tom@learnai.dev',
    bio: 'Junior developer, practising every single day.',
    avatarSeed: 'tom',
    activity: { level: 'low' },
  },
];

export default { adminSeed, demoUserSeed };

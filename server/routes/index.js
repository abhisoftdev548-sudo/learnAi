import { Router } from 'express';
import authRoutes from './auth.routes.js';
import challengeRoutes from './challenge.routes.js';
import submissionRoutes from './submission.routes.js';
import userRoutes from './user.routes.js';
import leaderboardRoutes from './leaderboard.routes.js';
import achievementRoutes from './achievement.routes.js';
import adminRoutes from './admin.routes.js';
import { databaseState } from '../config/db.js';
import { listExecutionProviders } from '../services/execution/index.js';
import { sendSuccess } from '../utils/cookies.js';

const router = Router();

router.get('/health', (_req, res) =>
  sendSuccess(res, {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    database: databaseState(),
    execution: listExecutionProviders(),
    timestamp: new Date(),
  }),
);

router.use('/auth', authRoutes);
router.use('/challenges', challengeRoutes);
router.use('/submissions', submissionRoutes);
router.use('/users', userRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/achievements', achievementRoutes);
router.use('/admin', adminRoutes);

export default router;

import { Router } from 'express';
import { getConfig, getLeaderboardController, getPreview } from '../controllers/leaderboard.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getLeaderboardController);
router.get('/preview', getPreview);
router.get('/config', getConfig);

export default router;

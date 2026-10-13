import { Router } from 'express';
import {
  getMe,
  getMyAchievements,
  getMyActivity,
  getMyHistory,
  getMyProgress,
  getMyStats,
  getMySubmissions,
  getUserProfile,
  putMe,
} from '../controllers/user.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

// Signed-in user's own resources.
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, putMe);
router.get('/me/stats', requireAuth, getMyStats);
router.get('/me/achievements', requireAuth, getMyAchievements);
router.get('/me/submissions', requireAuth, getMySubmissions);
router.get('/me/history', requireAuth, getMyHistory);
router.get('/me/progress', requireAuth, getMyProgress);
router.get('/me/activity', requireAuth, getMyActivity);

// Public profile (authentication optional).
router.get('/:username', optionalAuth, getUserProfile);

export default router;

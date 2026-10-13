import { Router } from 'express';
import { getAchievements } from '../controllers/achievement.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getAchievements);

export default router;

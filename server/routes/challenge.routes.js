import { Router } from 'express';
import { getChallenge, getChallenges, postChallenge, putChallenge, removeChallenge } from '../controllers/challenge.controller.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, getChallenges);
router.get('/:id', optionalAuth, getChallenge);
router.post('/', requireAuth, requireAdmin, postChallenge);
router.put('/:id', requireAuth, requireAdmin, putChallenge);
router.delete('/:id', requireAuth, requireAdmin, removeChallenge);

export default router;

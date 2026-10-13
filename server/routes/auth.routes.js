import { Router } from 'express';
import { login, logout, me, register, updatePassword } from '../controllers/auth.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/password', requireAuth, authLimiter, updatePassword);
router.get('/session', optionalAuth, (req, res) => {
  res.json({ success: true, data: { authenticated: Boolean(req.user), user: req.user ? req.user.toPrivateJSON() : null } });
});

export default router;

import { Router } from 'express';
import { getStats, getStatistics, getSubmissions, getSystem, getUsers, patchUser } from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

// Every admin route requires an authenticated admin.
router.use(requireAuth, requireAdmin);

router.get('/stats', getStats);
router.get('/statistics', getStatistics);
router.get('/users', getUsers);
router.patch('/users/:id', patchUser);
router.get('/submissions', getSubmissions);
router.get('/system', getSystem);

export default router;

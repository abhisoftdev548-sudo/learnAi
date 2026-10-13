import { Router } from 'express';
import { createSubmission, getMySubmissions, getSubmissionById } from '../controllers/submission.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { submissionLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/', requireAuth, submissionLimiter, createSubmission);
router.get('/me', requireAuth, getMySubmissions);
router.get('/:id', requireAuth, getSubmissionById);

export default router;

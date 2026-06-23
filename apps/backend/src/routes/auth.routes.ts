import { Router } from 'express';
import { telegramAuth, refreshToken } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/telegram', telegramAuth);
router.post('/refresh', refreshToken);

export default router;

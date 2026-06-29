import { Router } from 'express';
import { adminMiddleware } from '../middleware/admin.js';
import { fetchVideosHandler, seedStatusHandler } from '../controllers/admin.controller.js';

const router = Router();

router.post('/fetch-videos', adminMiddleware, fetchVideosHandler);
router.get('/seed-status', adminMiddleware, seedStatusHandler);

export default router;
